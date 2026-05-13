import { DEFAULT_BRIEFING, prepareData, slugify } from "./briefing-data.mjs";

export function parseMarkdownToBriefing(markdown = "") {
  const data = createDraftBriefing();
  const lines = String(markdown).replace(/\r/g, "").split("\n");

  let section = "cover";
  let subsection = "";
  let currentModule = null;
  let pendingText = "";
  let headingCount = 0;

  const pushPendingText = () => {
    const text = pendingText.trim();
    if (!text) return;

    if (section === "about" || section === "target") {
      if (matchesAny(subsection, ["objetivo", "meta", "solucao", "solução", "precisa"])) {
        data.about.objective = appendText(data.about.objective, text);
      } else if (matchesAny(subsection, ["dor", "problema", "desafio", "lead"])) {
        data.about.pains.push(text);
      } else {
        data.target.context = appendText(data.target.context, text);
      }
    } else if (section === "modules" && currentModule) {
      currentModule.description = appendText(currentModule.description, text);
    } else if (section === "proposal") {
      data.proposal.closingQuote = appendText(data.proposal.closingQuote, text);
    } else if (section === "cover") {
      applyTargetText(data, text);
    }

    pendingText = "";
  };

  const addModule = (title, description = "") => {
    const cleanTitle = simplifyModuleTitle(stripNumberPrefix(title));
    if (!cleanTitle) return null;
    currentModule = { title: cleanTitle, description, icon: suggestIcon(cleanTitle) };
    data.modules.push(currentModule);
    return currentModule;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      pushPendingText();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s*(.+)$/);
    if (headingMatch) {
      pushPendingText();
      const level = headingMatch[1].length;
      const heading = cleanMarkdownInline(headingMatch[2]);
      const mappedSection = mapHeadingSection(heading);
      headingCount += 1;

      if (level === 1) {
        if (headingCount === 1) applyTargetText(data, heading);
        section = mappedSection || (headingCount === 1 ? "cover" : section);
        subsection = section === "about" && matchesAny(heading, ["oportunidade", "objetivo", "cenario", "cenÃ¡rio"]) ? "objetivo" : "";
        if (section === "about" && matchesAny(heading, ["entendimento", "cenario", "cenário", "problemas", "dores"])) subsection = "dores";
        currentModule = null;
        continue;
      }

      if (level === 2) {
        if (section === "modules" && looksLikeModuleHeading(heading)) {
          addModule(heading);
          subsection = "";
          continue;
        }

        if (!data.cover.subtitle && matchesAny(heading, ["solucoes digitais", "soluÃ§Ãµes digitais"])) {
          data.cover.subtitle = cleanMarkdownInline(heading);
        }

        section = mappedSection || section;
        subsection = "";
        currentModule = null;
        continue;
      }

      if (level >= 3) {
        subsection = normalize(heading);
        if (section === "modules") addModule(heading);
        continue;
      }
    }

    const kvMatch = line.match(/^([\p{L}\p{N}_ .()/-]+):\s*(.+)$/u);
    if (kvMatch) {
      pushPendingText();
      currentModule = applyKeyValue(data, section, currentModule, kvMatch[1], kvMatch[2]) || currentModule;
      continue;
    }

    const listMatch = line.match(/^(?:[-*+]|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      pushPendingText();
      applyListItem(data, section, subsection, currentModule, cleanMarkdownInline(listMatch[1]), addModule);
      continue;
    }

    pendingText = appendText(pendingText, cleanMarkdownInline(line));
  }

  pushPendingText();
  return autoCompleteBriefing(data, markdown);
}

export async function interpretWithGroq(markdown = "") {
  const localDraft = parseMarkdownToBriefing(markdown);
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return localDraft;

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const baseUrl = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1";

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você cria briefings comerciais da Me Vê Um Site para vender serviços de tecnologia a empresas. A marca do briefing é sempre Me Vê Um Site. Responda somente JSON válido, em português do Brasil.",
          },
          { role: "user", content: buildAiPrompt(markdown, localDraft) },
        ],
      }),
    });

    if (!response.ok) return localDraft;

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    const jsonString = extractJsonString(content);
    if (!jsonString) return localDraft;

    return prepareData(JSON.parse(jsonString));
  } catch {
    return localDraft;
  }
}

export function suggestBriefingFilename(data, fallback = "briefing") {
  const normalized = prepareData(data);
  return `${slugify(normalized.target.name || normalized.cover.subtitle, fallback)}.json`;
}

function createDraftBriefing() {
  return {
    brand: { ...DEFAULT_BRIEFING.brand },
    target: { name: "", segment: "", context: "" },
    cover: {
      titleLine1: DEFAULT_BRIEFING.cover.titleLine1,
      titleLine2: DEFAULT_BRIEFING.cover.titleLine2,
      subtitle: "",
      features: [],
    },
    about: {
      company: DEFAULT_BRIEFING.about.company,
      objective: "",
      pains: [],
    },
    modules: [],
    benefits: [],
    mvp: [],
    proposal: {},
  };
}

function autoCompleteBriefing(data, sourceText = "") {
  const inferredTarget = inferTargetFromText(sourceText);
  if (!data.target.name && inferredTarget.name) data.target.name = inferredTarget.name;
  if (!data.target.segment && inferredTarget.segment) data.target.segment = inferredTarget.segment;

  const targetName = data.target.name || "sua empresa";
  const segment = data.target.segment || "empresas que precisam organizar processos com tecnologia";

  if (!data.cover.subtitle) data.cover.subtitle = `Soluções Digitais para ${targetName}`;
  if (!data.cover.features.length) data.cover.features.push(...suggestCoverFeaturesFromDraft(data));

  if (!data.about.objective) {
    data.about.objective = `Criar uma solução digital sob medida para ${segment}, com foco em organização, automação, integração de ferramentas e controle da operação.`;
  }

  if (!data.about.pains.length) {
    data.about.pains.push(
      "Uso excessivo de planilhas",
      "Processos manuais e repetitivos",
      "Falta de organização interna",
      "Dificuldade para acompanhar dados e indicadores",
      "Necessidade de automatizar tarefas",
      "Ferramentas separadas sem integração",
    );
  }

  if (!data.modules.length) {
    data.modules.push(...DEFAULT_BRIEFING.modules);
  }

  if (!data.benefits.length) {
    data.benefits.push(...DEFAULT_BRIEFING.benefits);
  }

  if (!data.mvp.length) {
    data.mvp.push(...DEFAULT_BRIEFING.mvp);
  }

  if (!data.proposal.modulesSubtitle) data.proposal.modulesSubtitle = `Solução sob medida para ${segment}`;
  if (!data.proposal.closingQuote) data.proposal.closingQuote = DEFAULT_BRIEFING.proposal.closingQuote;
  if (!data.proposal.ctaLead) data.proposal.ctaLead = DEFAULT_BRIEFING.proposal.ctaLead;
  if (!data.proposal.ctaHighlight) data.proposal.ctaHighlight = DEFAULT_BRIEFING.proposal.ctaHighlight;

  return prepareData(data);
}

function normalizeSection(text) {
  const value = normalize(text);
  if (matchesAny(value, ["cliente", "negocio", "negócio", "empresa alvo", "segmento", "contexto"])) return "target";
  if (matchesAny(value, ["brand", "marca", "me ve um site", "me vê um site"])) return "brand";
  if (matchesAny(value, ["capa", "cover", "resumo", "briefing"])) return "cover";
  if (matchesAny(value, ["sobre", "quem somos", "objetivo", "dores", "problemas", "lead ideal"])) return "about";
  if (matchesAny(value, ["modulos", "módulos", "funcionalidades", "escopo", "plataforma", "o que fazemos"])) return "modules";
  if (matchesAny(value, ["beneficios", "benefícios", "beneficio", "ganhos", "resultados"])) return "benefits";
  if (matchesAny(value, ["mvp", "primeira versao", "primeira versão", "fase 1", "proximos passos"])) return "mvp";
  if (matchesAny(value, ["proposta", "fechamento", "cta", "mensagem"])) return "proposal";
  return value;
}

function mapHeadingSection(text) {
  const value = normalize(text);
  if (matchesAny(value, ["cliente", "negocio", "empresa alvo", "segmento", "contexto"])) return "target";
  if (matchesAny(value, ["marca", "me ve um site", "quem somos", "sobre a me ve"])) return "about";
  if (matchesAny(value, ["capa", "cover", "resumo"])) return "cover";
  if (matchesAny(value, ["entendimento", "cenario", "principal oportunidade", "objetivo", "dores", "problemas"])) return "about";
  if (matchesAny(value, ["solucoes digitais recomendadas", "solucao ideal", "recomendadas", "modulos", "funcionalidades", "escopo", "plataforma digital"])) return "modules";
  if (matchesAny(value, ["beneficios", "ganhos", "resultados", "diferencial estrategico"])) return "benefits";
  if (matchesAny(value, ["mvp", "fase", "proximos passos", "fluxo sugerido"])) return "mvp";
  if (matchesAny(value, ["proposta", "fechamento", "cta", "mensagem", "conclusao"])) return "proposal";
  if (matchesAny(value, ["briefing comercial"])) return "cover";
  return "";
}

function suggestCoverFeaturesFromDraft(data) {
  const source = [
    ...(data.modules || []).map((module) => module.title),
    ...(data.mvp || []),
    data.target?.segment || "",
  ].join(" ");
  const features = [];
  const add = (condition, label) => {
    if (condition && !features.includes(label)) features.push(label);
  };

  add(matchesAny(source, ["site", "landing"]), "Site profissional");
  add(matchesAny(source, ["agenda", "agendamento", "consulta"]), "Agendamento");
  add(matchesAny(source, ["crm", "lead", "paciente", "cliente"]), "CRM de clientes");
  add(matchesAny(source, ["whatsapp", "automacao", "automação", "mensagem"]), "Automações");
  add(matchesAny(source, ["dashboard", "painel", "relatorio", "relatório"]), "Dashboard");
  add(matchesAny(source, ["integracao", "integração", "api", "formulario", "formulário"]), "Integrações");

  return features.length ? features.slice(0, 4) : ["Sistema sob medida", "Automação", "Dashboard", "Integrações"];
}

function applyKeyValue(data, section, currentModule, rawKey, rawValue) {
  const key = normalize(rawKey);
  const value = cleanMarkdownInline(rawValue);
  if (!value) return currentModule;

  if (section === "brand") {
    if (matchesAny(key, ["site", "url", "website"])) data.brand.website = value;
    else if (matchesAny(key, ["logo"])) data.brand.logoPath = value;
    else if (matchesAny(key, ["prefixo", "mensagem prefixo"])) data.brand.mainMessagePrefix = value;
    else if (matchesAny(key, ["destaque", "highlight", "mensagem destaque"])) data.brand.mainMessageHighlight = value;
    return currentModule;
  }

  if (section === "target" || matchesAny(key, ["cliente", "negocio", "negócio", "empresa", "segmento"])) {
    if (matchesAny(key, ["nome", "cliente", "empresa"])) data.target.name = value;
    else if (matchesAny(key, ["segmento", "tipo", "mercado"])) data.target.segment = value;
    else if (matchesAny(key, ["contexto", "sobre", "descricao", "descrição"])) data.target.context = value;
    applyTargetText(data, data.target.name || value);
    return currentModule;
  }

  if (section === "cover") {
    if (matchesAny(key, ["titulo linha 1", "titulo 1"])) data.cover.titleLine1 = value;
    else if (matchesAny(key, ["titulo linha 2", "titulo 2"])) data.cover.titleLine2 = value;
    else if (matchesAny(key, ["subtitulo", "projeto"])) data.cover.subtitle = value;
    else if (matchesAny(key, ["feature", "recurso", "item"])) data.cover.features.push(value);
    return currentModule;
  }

  if (section === "about") {
    if (matchesAny(key, ["objetivo", "meta", "solucao", "solução"])) data.about.objective = value;
    else if (matchesAny(key, ["dor", "problema", "desafio"])) data.about.pains.push(value);
    else if (matchesAny(key, ["quem", "contexto", "sobre"])) data.target.context = value;
    return currentModule;
  }

  if (section === "modules") {
    if (matchesAny(key, ["modulo", "módulo", "funcionalidade"])) {
      currentModule = data.modules[data.modules.length - 1] || null;
      if (!currentModule || currentModule.description) {
        currentModule = { title: value, description: "", icon: suggestIcon(value) };
        data.modules.push(currentModule);
      } else {
        currentModule.title = value;
      }
    } else if (currentModule && matchesAny(key, ["descricao", "descrição", "detalhe"])) {
      currentModule.description = value;
    } else if (currentModule && matchesAny(key, ["icone", "ícone", "icon"])) {
      currentModule.icon = value;
    }
    return currentModule;
  }

  if (section === "proposal") {
    if (matchesAny(key, ["subtitulo", "módulos", "modulos"])) data.proposal.modulesSubtitle = value;
    else if (matchesAny(key, ["fechamento", "quote", "frase"])) data.proposal.closingQuote = value;
    else if (matchesAny(key, ["cta lead", "chamada"])) data.proposal.ctaLead = value;
    else if (matchesAny(key, ["cta destaque", "destaque"])) data.proposal.ctaHighlight = value;
  }

  return currentModule;
}

function applyListItem(data, section, subsection, currentModule, value, addModule) {
  if (!value) return;

  if (section === "cover") data.cover.features.push(value);
  else if (section === "target") data.target.context = appendText(data.target.context, value);
  else if (section === "about") {
    if (matchesAny(subsection, ["objetivo", "meta"])) data.about.objective = appendText(data.about.objective, value);
    else data.about.pains.push(value);
  } else if (section === "modules") {
    if (currentModule) currentModule.description = appendText(currentModule.description, value);
    else addModule(value);
  } else if (section === "benefits") data.benefits.push(value);
  else if (section === "mvp") data.mvp.push(value);
}

function looksLikeModuleHeading(value = "") {
  const text = normalize(value);
  if (/^\d+[.)-]?\s+/.test(String(value).trim())) return true;
  return matchesAny(text, [
    "site",
    "landing",
    "agenda",
    "agendamento",
    "crm",
    "whatsapp",
    "area do paciente",
    "painel",
    "dashboard",
    "acompanhamento",
    "integracao",
    "formulario",
  ]);
}

function applyTargetText(data, text) {
  const clean = extractTargetName(text) || stripNumberPrefix(text);
  if (!clean || isMeVeText(clean)) return;
  data.target.name ||= clean;
  data.cover.subtitle ||= `Soluções Digitais para ${clean}`;
}

function extractTargetName(text = "") {
  const clean = stripNumberPrefix(text);
  const directParaMatch = clean.match(/\bpara\s+(.+)$/i);
  if (directParaMatch && matchesAny(clean, ["briefing comercial", "me v", "me ve", "me vê"])) {
    const directValue = cleanMarkdownInline(directParaMatch[1]).replace(/[.:;,-]+$/g, "").trim();
    if (directValue && !isGenericTargetText(directValue) && !isMeVeText(directValue)) return directValue;
  }

  const patterns = [
    /me\s+v[eê]\s+um\s+site\s+para\s+(.+)$/i,
    /briefing\s+comercial\s*[-–—]\s*(?:me\s+v[eê]\s+um\s+site\s+para\s+)?(.+)$/i,
    /\bpara\s+([A-ZÀ-Ú][\p{L}\p{N}&' .-]{2,})$/u,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    const value = match?.[1] ? cleanMarkdownInline(match[1]).replace(/[.:;,-]+$/g, "").trim() : "";
    if (value && !isGenericTargetText(value) && !isMeVeText(value)) return value;
  }

  if (isGenericTargetText(clean) || clean.length > 70) return "";
  return clean;
}

function inferTargetFromText(sourceText = "") {
  const text = toPlainText(sourceText);
  const firstHeading = String(sourceText).match(/^#\s+(.+)$/m)?.[1]?.trim();
  const name = firstHeading && !isMeVeText(firstHeading) ? extractTargetName(firstHeading) : "";

  const lower = normalize(text);
  let segment = "";
  if (matchesAny(lower, ["odontologia", "odontologica", "odontologico", "dentista", "invisalign"])) segment = "clínicas odontológicas";
  if (matchesAny(lower, ["assistencia tecnica", "assistência técnica", "ordem de servico", "ordem de serviço"])) segment = "assistências técnicas";
  else if (matchesAny(lower, ["clinica", "clínica", "paciente", "consulta"])) segment = "clínicas e consultórios";
  else if (matchesAny(lower, ["restaurante", "delivery", "cardapio", "cardápio"])) segment = "restaurantes e operações de delivery";
  else if (matchesAny(lower, ["imobiliaria", "imobiliária", "imovel", "imóvel"])) segment = "imobiliárias";
  else if (matchesAny(lower, ["loja", "estoque", "pedido", "e-commerce", "catalogo", "catálogo"])) segment = "comércios e lojas em crescimento";

  if (matchesAny(lower, ["odontologia", "odontologica", "odontologico", "dentista", "invisalign"])) segment = "clínicas odontológicas";

  return { name, segment };
}

function buildAiPrompt(markdown, localDraft) {
  return `Converta o conteúdo abaixo em um briefing comercial da Me Vê Um Site para vender serviços digitais a outro negócio.

Regras importantes:
- A marca/empresa prestadora é sempre Me Vê Um Site.
- Não transforme o cliente alvo na marca do briefing.
- O campo about.company deve falar sobre a Me Vê Um Site.
- O negócio alvo deve entrar em target, cover.subtitle, dores, módulos, benefícios e MVP.
- Use linguagem profissional, clara e acessível, sem excesso de termos técnicos.
- Mantenha de 4 a 8 módulos.
- Não invente preços, prazos ou dados sensíveis.
- Retorne somente JSON válido neste formato:

{
  "brand": ${JSON.stringify(DEFAULT_BRIEFING.brand)},
  "target": { "name": "Nome do negócio alvo", "segment": "Segmento", "context": "Contexto do negócio alvo" },
  "cover": { "titleLine1": "Briefing", "titleLine2": "Comercial", "subtitle": "Soluções Digitais para ...", "features": ["string"] },
  "about": { "company": "${DEFAULT_BRIEFING.about.company}", "objective": "string", "pains": ["string"] },
  "modules": [{ "title": "string", "description": "string", "icon": "users|building|file|chart|target|gear|hardhat|rocket" }],
  "benefits": ["string"],
  "mvp": ["string"],
  "proposal": { "modulesSubtitle": "string", "closingQuote": "string", "ctaLead": "string", "ctaHighlight": "string" }
}

Rascunho local:
${JSON.stringify(localDraft, null, 2)}

Conteúdo original:
${markdown}`;
}

function extractJsonString(text = "") {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "";
  return text.slice(start, end + 1);
}

function cleanMarkdownInline(value = "") {
  return String(value)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function toPlainText(markdown = "") {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^(?:[-*+]|\d+[.)])\s+/gm, "")
    .replace(/\r/g, "")
    .trim();
}

function appendText(current, next) {
  const left = String(current || "").trim();
  const right = String(next || "").trim();
  if (!left) return right;
  if (!right) return left;
  return `${left} ${right}`;
}

function stripNumberPrefix(value = "") {
  return cleanMarkdownInline(value).replace(/^\d+[.)-]?\s*/, "").trim();
}

function simplifyModuleTitle(value = "") {
  const text = normalize(value);
  if (matchesAny(text, ["site profissional", "site institucional"])) return "Site Profissional";
  if (matchesAny(text, ["landing page", "pagina de campanha", "página de campanha"])) return "Landing Page";
  if (matchesAny(text, ["agendamento", "agenda"])) return "Agendamento Inteligente";
  if (matchesAny(text, ["crm", "leads"])) return "CRM de Leads";
  if (matchesAny(text, ["whatsapp", "automacao", "automação", "mensagens"])) return "Automação de WhatsApp";
  if (matchesAny(text, ["area do paciente", "área do paciente", "portal do paciente"])) return "Área do Paciente";
  if (matchesAny(text, ["painel", "dashboard", "administrativo"])) return "Painel Administrativo";
  if (matchesAny(text, ["acompanhamento", "tratamento"])) return "Acompanhamento de Tratamentos";
  if (matchesAny(text, ["integracao", "integração", "api", "formulario", "formulário"])) return "Integrações";
  return value;
}

function suggestIcon(value = "") {
  const text = normalize(value);
  if (matchesAny(text, ["cliente", "usuario", "usuário", "atendimento", "area"])) return "users";
  if (matchesAny(text, ["financeiro", "relatorio", "relatório", "dashboard", "indicador", "painel"])) return "chart";
  if (matchesAny(text, ["documento", "orcamento", "orçamento", "ordem", "pdf", "api", "integracao", "integração"])) return "file";
  if (matchesAny(text, ["config", "automacao", "automação", "workflow", "status", "processo"])) return "gear";
  if (matchesAny(text, ["obra", "imovel", "imóvel", "empresa", "unidade", "site", "landing"])) return "building";
  if (matchesAny(text, ["crescimento", "venda", "produto", "plataforma"])) return "rocket";
  return "target";
}

function isGenericTargetText(value = "") {
  return matchesAny(value, [
    "briefing comercial",
    "solucoes digitais",
    "soluções digitais",
    "clinicas que querem",
    "clínicas que querem",
    "empresas que querem",
    "principal oportunidade",
    "entendimento do cenario",
    "entendimento do cenário",
  ]);
}

function isMeVeText(value = "") {
  return matchesAny(value, ["me ve um site", "me vê um site"]);
}

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesAny(value, needles) {
  const text = normalize(value);
  return needles.some((needle) => text.includes(normalize(needle)));
}
