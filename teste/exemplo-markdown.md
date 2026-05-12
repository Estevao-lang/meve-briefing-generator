# Meus Relatórios

## Brand
Nome: Meus Relatórios
Website: report.local
Logo: assets/logo.png
Mensagem prefixo: Gera relatórios e PDFs profissionais a partir de texto simples
Mensagem destaque: com suporte a markdown, tabelas e conteúdo completo do projeto

## Sobre
### Quem somos
Somos uma ferramenta para transformar conteúdo escrito em relatórios PDF profissionais, baseada no projeto report do workspace.

### Objetivo
Permitir criação de relatórios técnicos e executivos com texto simples, markdown e dados estruturados.

### Dores
- Texto em múltiplos documentos dispersos
- Relatórios demorados para formatar
- Falta de geração rápida de PDF a partir do browser

## Módulos
### Cover sidebar
Campos de capa para tipo de documento, título, subtítulo, projeto, organização, autor e data.

### Content area
Editor principal com suporte a títulos, listas, tabelas, caixas de destaque e blocos de código.

### API de geração
Rota /api/generate que converte o conteúdo em PDF.

### Parser de markdown
Lógica em src/lib/pdf-parser.js para interpretar tabelas, listas e sintaxe simples.

### Template do relatório
Renderização em src/lib/report-template.js com layout limpo.

## Benefícios
- Gera PDF direto do navegador
- Suporta markdown completo do projeto report
- Mantém texto nítido e layout confiável
- Usa o projeto report como base real

## Arquivos do projeto
- src/app/page.js
- src/app/api/generate/route.js
- src/lib/pdf-parser.js
- src/lib/report-template.js
- src/lib/pdf-template.js
- TUTORIAL.md
- README.md
- tailwind.config.js

## MVP
- Editor de texto markdown com guia
- Campos de capa e metadados
- Geração de PDF via backend
- Download automático do arquivo