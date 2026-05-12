export const ICON_NAMES = ["users", "building", "file", "chart", "target", "gear", "hardhat", "rocket"];

export const DEFAULT_BRIEFING = {
  brand: {
    name: "Me Vê Um Site",
    website: "meveumsite.com.br",
    logoPath: "assets/logo.png",
    mainMessagePrefix: "Criamos sistemas personalizados para empresas que querem",
    mainMessageHighlight: "sair das planilhas, automatizar processos e crescer com mais controle.",
  },
  target: {
    name: "Empresas em crescimento",
    segment: "empresas que querem organizar processos com tecnologia",
    context: "Negócios que já usam planilhas, WhatsApp e ferramentas separadas, mas precisam centralizar tudo em uma solução digital própria.",
  },
  cover: {
    titleLine1: "Briefing",
    titleLine2: "Comercial",
    subtitle: "Soluções Digitais Sob Medida para Empresas",
    features: ["Sistemas personalizados", "Automações", "Dashboards", "Integrações"],
  },
  about: {
    company:
      "Somos a Me Vê Um Site, uma software house especializada no desenvolvimento de soluções digitais para empresas. Criamos sistemas personalizados, dashboards, painéis administrativos, áreas do cliente, automações, integrações com APIs, plataformas web e sites profissionais.",
    objective:
      "Ajudar empresas a substituir planilhas, organizar processos, automatizar tarefas repetitivas, integrar ferramentas e ter mais controle sobre a operação com tecnologia sob medida.",
    pains: [
      "Uso excessivo de planilhas",
      "Processos manuais e repetitivos",
      "Falta de organização interna",
      "Dificuldade para acompanhar dados e indicadores",
      "Ferramentas separadas que não conversam entre si",
      "Necessidade de sistema com login para clientes, funcionários ou parceiros",
    ],
  },
  modules: [
    {
      title: "Sistema Web Personalizado",
      description: "Desenvolvimento de uma plataforma sob medida para centralizar processos, dados, usuários e regras do negócio.",
      icon: "users",
    },
    {
      title: "Dashboard e Painel Administrativo",
      description: "Indicadores, filtros, relatórios e visão gerencial para acompanhar a operação com mais clareza.",
      icon: "chart",
    },
    {
      title: "Área do Cliente",
      description: "Ambiente com login para clientes, funcionários ou parceiros consultarem informações, solicitações e status.",
      icon: "target",
    },
    {
      title: "Automações de Processos",
      description: "Automação de tarefas repetitivas para reduzir retrabalho, erros manuais e tempo gasto pela equipe.",
      icon: "gear",
    },
    {
      title: "Integrações com APIs",
      description: "Conexão com planilhas, bancos de dados, formulários, ferramentas externas e sistemas já usados pela empresa.",
      icon: "file",
    },
    {
      title: "Sites, Landing Pages e Catálogos",
      description: "Presença digital profissional para atrair leads, apresentar serviços, vender melhor e fortalecer a marca.",
      icon: "rocket",
    },
  ],
  benefits: [
    "Organizar processos em uma solução centralizada",
    "Reduzir retrabalho e tarefas manuais",
    "Dar mais clareza para decisões com dashboards e indicadores",
    "Melhorar atendimento, produtividade e controle da operação",
    "Integrar ferramentas que hoje funcionam separadas",
    "Criar uma base tecnológica escalável para crescimento",
  ],
  mvp: [
    "Diagnóstico do processo atual",
    "Definição dos módulos essenciais",
    "Protótipo do fluxo principal",
    "Primeira versão funcional do sistema",
    "Dashboard administrativo básico",
    "Plano de evolução por fases",
  ],
  proposal: {
    modulesSubtitle: "Tecnologia sob medida para negócios que precisam de mais organização, automação e controle",
    closingQuote: "Não criamos apenas sites. Criamos soluções digitais para empresas venderem mais, organizarem processos e crescerem com tecnologia.",
    ctaLead: "Vamos transformar processos manuais",
    ctaHighlight: "em uma solução digital moderna e personalizada?",
  },
};

export function getArg(name, fallback) {
  const exactIndex = process.argv.indexOf(`--${name}`);
  if (exactIndex >= 0 && process.argv[exactIndex + 1]) return process.argv[exactIndex + 1];

  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  return fallback;
}

export function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

export function slugify(value, fallback = "briefing") {
  const slug = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return slug || fallback;
}

export function createBlankBriefing(overrides = {}) {
  return prepareData(deepMerge(DEFAULT_BRIEFING, overrides));
}

export function prepareData(data = {}) {
  const brand = {
    name: asString(data.brand?.name, DEFAULT_BRIEFING.brand.name),
    website: asString(data.brand?.website, DEFAULT_BRIEFING.brand.website),
    logoPath: asString(data.brand?.logoPath, DEFAULT_BRIEFING.brand.logoPath),
    mainMessagePrefix: asString(data.brand?.mainMessagePrefix, DEFAULT_BRIEFING.brand.mainMessagePrefix),
    mainMessageHighlight: asString(data.brand?.mainMessageHighlight, DEFAULT_BRIEFING.brand.mainMessageHighlight),
  };

  const cover = {
    titleLine1: asString(data.cover?.titleLine1, DEFAULT_BRIEFING.cover.titleLine1),
    titleLine2: asString(data.cover?.titleLine2, DEFAULT_BRIEFING.cover.titleLine2),
    subtitle: asString(data.cover?.subtitle, DEFAULT_BRIEFING.cover.subtitle),
    features: asTextArray(data.cover?.features, DEFAULT_BRIEFING.cover.features),
  };

  const target = {
    name: asString(data.target?.name, inferTargetName(cover.subtitle)),
    segment: asString(data.target?.segment, inferSegment(cover.subtitle)),
    context: asString(data.target?.context, DEFAULT_BRIEFING.target.context),
  };

  const about = {
    company: asString(data.about?.company, DEFAULT_BRIEFING.about.company),
    objective: asString(data.about?.objective, DEFAULT_BRIEFING.about.objective),
    pains: asTextArray(data.about?.pains, DEFAULT_BRIEFING.about.pains),
  };

  const modules = normalizeModules(data.modules);
  const benefits = asTextArray(data.benefits, DEFAULT_BRIEFING.benefits);
  const mvp = asTextArray(data.mvp, DEFAULT_BRIEFING.mvp);

  const proposalDefaults = {
    modulesSubtitle: `Solução sob medida para ${target.segment}`,
    closingQuote: DEFAULT_BRIEFING.proposal.closingQuote,
    ctaLead: DEFAULT_BRIEFING.proposal.ctaLead,
    ctaHighlight: DEFAULT_BRIEFING.proposal.ctaHighlight,
  };

  const proposal = {
    modulesSubtitle: asString(data.proposal?.modulesSubtitle, proposalDefaults.modulesSubtitle),
    closingQuote: asString(data.proposal?.closingQuote, proposalDefaults.closingQuote),
    ctaLead: asString(data.proposal?.ctaLead, proposalDefaults.ctaLead),
    ctaHighlight: asString(data.proposal?.ctaHighlight, proposalDefaults.ctaHighlight),
  };

  return { brand, target, cover, about, modules, benefits, mvp, proposal };
}

export function inferSegment(value = "") {
  const cleaned = cleanTargetText(value, DEFAULT_BRIEFING.target.segment);
  if (!cleaned) return DEFAULT_BRIEFING.target.segment;
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function inferTargetName(value = "") {
  const cleaned = cleanTargetText(value, DEFAULT_BRIEFING.target.name);
  if (!cleaned) return DEFAULT_BRIEFING.target.name;
  return cleaned;
}

function cleanTargetText(value = "", fallback = "") {
  return asString(value, fallback)
    .replace(/^sistema\s+personalizado\s+para\s+/i, "")
    .replace(/^solu[cç](?:[aã]o|ões|oes)\s+digitais?\s+(?:sob\s+medida\s+)?para\s+/i, "")
    .replace(/^plataforma\s+para\s+/i, "")
    .replace(/^briefing\s+comercial\s+para\s+/i, "")
    .trim();
}

function normalizeModules(value) {
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_BRIEFING.modules;

  const modules = value
    .map((module, index) => ({
      title: asString(module?.title, `Módulo ${index + 1}`),
      description: asString(module?.description, "Funcionalidade sob medida para a operação."),
      icon: normalizeIcon(module?.icon, ICON_NAMES[index % ICON_NAMES.length]),
    }))
    .filter((module) => module.title || module.description);

  return modules.length ? modules : DEFAULT_BRIEFING.modules;
}

function normalizeIcon(value, fallback = "target") {
  const icon = String(value || "").trim().toLowerCase();
  return ICON_NAMES.includes(icon) ? icon : fallback;
}

function asString(value, fallback = "") {
  const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  return text || fallback;
}

function asTextArray(value, fallback = []) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\n|;|•/g) : [];
  const items = source.map((item) => String(item).replace(/^[-*+]\s*/, "").trim()).filter(Boolean);
  return items.length ? items : fallback;
}

function deepMerge(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override : [...base];
  if (!isPlainObject(base)) return override ?? base;

  const output = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    output[key] = isPlainObject(value) && isPlainObject(base[key]) ? deepMerge(base[key], value) : value;
  }
  return output;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
