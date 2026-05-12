# Me Vê Um Site - Automatizador de Briefing

Automatizador para criar briefings comerciais da **Me Vê Um Site** para diferentes empresas, segmentos e oportunidades de negócio.

A marca do briefing é sempre a Me Vê Um Site. O que muda em cada geração é o **negócio alvo**: o cliente, segmento, dores, contexto e proposta de solução para aquela empresa.

O sistema transforma texto, anotações ou markdown em um briefing estruturado, com saída em:

- JSON editável em `data/`
- HTML em `dist/`
- PDF comercial
- PNG de cada página

O fluxo principal é: colar informações sobre o negócio alvo, interpretar automaticamente, revisar no formulário e gerar os arquivos finais.

## Posicionamento

Mensagem principal usada pelo projeto:

> Criamos sistemas personalizados para empresas que querem sair das planilhas, automatizar processos e crescer com mais controle.

O briefing apresenta a Me Vê Um Site como uma software house que cria sistemas web, dashboards, painéis administrativos, áreas do cliente, automações, integrações, plataformas web, sites profissionais, e-commerce e soluções digitais sob medida.

## Instalação

```bash
npm install
npx playwright install chromium
```

No Windows PowerShell, se `npm` estiver bloqueado por política de execução, use `npm.cmd`:

```bash
npm.cmd install
npm.cmd run generate
```

## Usar Pelo Editor

```bash
npm.cmd start
```

Abra:

```bash
http://localhost:3001
```

Neste projeto o `.env` define `PORT=3001`. Sem essa variável, o servidor usa `3000` por padrão.

No editor você pode:

- colar um texto ou markdown sobre uma empresa alvo;
- clicar em `Interpretar` para preencher o formulário;
- clicar em `Automatizar` para interpretar, salvar e gerar PDF/PNG;
- revisar negócio alvo, capa, dores, soluções, benefícios, MVP e fechamento;
- criar vários arquivos em `data/`;
- abrir o HTML ou PDF gerado no preview.

## Usar Pela CLI

Gerar o briefing padrão da Me Vê Um Site:

```bash
npm.cmd run generate
```

Automatizar a partir de um markdown:

```bash
npm.cmd run automate -- --input teste/exemplo-markdown.md --file exemplo-auto.json
```

Automatizar a partir de texto direto:

```bash
npm.cmd run automate -- --text "Clínica precisa controlar agenda, pacientes, pagamentos, relatórios e atendimento por WhatsApp." --file clinica.json
```

Gerar usando um JSON específico:

```bash
node scripts/generate-briefing.mjs --data data/eletro-house.json --out dist/eletro-house
```

## Formato Recomendado Do Texto

Use um texto simples, com o máximo de contexto possível sobre a empresa alvo:

```markdown
# Clínica Alfa

## Negócio alvo
Nome: Clínica Alfa
Segmento: clínica médica
Contexto: usa WhatsApp, planilhas e agenda manual para organizar atendimentos.

## Dores
- Agenda descentralizada
- Controle manual de pacientes
- Falta de indicadores
- Dificuldade para acompanhar pagamentos

## Objetivo
Criar uma proposta da Me Vê Um Site para organizar a operação em um sistema web com painel administrativo, automações e relatórios.
```

Mesmo quando o texto fala de outra empresa, a marca do briefing continua sendo **Me Vê Um Site**.

## IA E Fallback Local

O projeto funciona sem chave de IA usando um parser local. Se quiser usar Groq, configure `.env`:

```env
GROQ_API_KEY=sua_chave
GROQ_MODEL=llama-3.1-8b-instant
```

Se a API falhar, o projeto volta automaticamente para o parser local.

## Estrutura

```text
meve-briefing-generator/
  assets/
    logo.png
  data/
    briefing.json
    eletro-house.json
  public/
    editor.html
  scripts/
    automate-briefing.mjs
    briefing-ai.mjs
    briefing-data.mjs
    briefing-generator.mjs
    editor-server.mjs
    generate-briefing.mjs
    test-interpret.mjs
  teste/
    exemplo-markdown.md
```

## Testes Rápidos

```bash
npm.cmd test
npm.cmd run generate
```

Arquivos finais do briefing padrão:

- `dist/briefing.html`
- `dist/briefing-comercial.pdf`
- `dist/briefing-page-1.png` até `dist/briefing-page-4.png`

Quando gerado pelo editor, o output fica em uma subpasta de `dist/` com o mesmo nome do JSON, por exemplo `dist/briefing/`.

## Deploy No Render

O projeto já tem `render.yaml`, então você pode subir por Blueprint ou criar um Web Service manualmente.

### Opção 1: Blueprint

1. Suba este projeto para um repositório no GitHub.
2. No Render, clique em `New` > `Blueprint`.
3. Conecte o repositório.
4. Confirme o arquivo `render.yaml`.
5. Em `Environment`, preencha `GROQ_API_KEY` se quiser usar IA. Sem essa chave, o parser local continua funcionando.

### Opção 2: Web Service Manual

Use estes campos no Render:

```text
Service Type: Web Service
Runtime: Node
Build Command: npm run render-build
Start Command: npm start
Health Check Path: /healthz
```

Variáveis de ambiente recomendadas:

```env
NODE_ENV=production
PLAYWRIGHT_BROWSERS_PATH=0
GROQ_API_KEY=sua_chave_opcional
GROQ_MODEL=llama-3.1-8b-instant
```

Não defina `PORT` manualmente no Render. O próprio Render fornece essa variável, e o servidor já usa `process.env.PORT`.

### Persistência Dos Briefings

Por padrão, o filesystem do Render é temporário. O app funciona, gera PDF/PNG e salva JSON, mas esses arquivos podem ser perdidos quando o serviço reiniciar ou fizer redeploy.

Para preservar os briefings, use um plano com Persistent Disk e configure:

```env
BRIEFING_STORAGE_DIR=/opt/render/project/src/storage
```

Monte o disco nesse mesmo caminho. O servidor copia os JSONs iniciais para esse diretório na primeira inicialização.
