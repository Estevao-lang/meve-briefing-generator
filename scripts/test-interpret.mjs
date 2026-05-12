import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseMarkdownToBriefing } from "./briefing-ai.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const markdownPath = path.join(root, "teste", "exemplo-markdown.md");

const markdown = await fs.readFile(markdownPath, "utf8");
const briefing = parseMarkdownToBriefing(markdown);

const requiredChecks = [
  ["brand.name", briefing.brand.name === "Me Vê Um Site"],
  ["target.name", briefing.target.name],
  ["cover.subtitle", briefing.cover.subtitle],
  ["about.company", briefing.about.company],
  ["modules", briefing.modules.length >= 4],
  ["benefits", briefing.benefits.length >= 3],
  ["mvp", briefing.mvp.length >= 3],
];

const missing = requiredChecks.filter(([, value]) => !value).map(([name]) => name);
if (missing.length) {
  throw new Error(`Parser incompleto. Campos ausentes: ${missing.join(", ")}`);
}

console.log("Parser local OK");
console.log(`Marca: ${briefing.brand.name}`);
console.log(`Negócio alvo: ${briefing.target.name}`);
console.log(`Módulos: ${briefing.modules.length}`);
console.log(`Benefícios: ${briefing.benefits.length}`);
