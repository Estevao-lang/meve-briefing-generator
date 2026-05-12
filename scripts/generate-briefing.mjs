import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBriefing, getArg } from "./briefing-generator.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const dataPath = path.resolve(root, getArg("data", "data/briefing.json"));
const outputDir = path.resolve(root, getArg("out", "dist"));

async function main() {
  const result = await generateBriefing({ dataPath, outputDir });
  console.log("Briefing gerado com sucesso!");
  console.log(`PDF: ${path.join(outputDir, "briefing-comercial.pdf")}`);
  console.log(`HTML: ${path.join(outputDir, "briefing.html")}`);
  console.log(`Imagens: ${path.join(outputDir, "briefing-page-1.png")} até briefing-page-${result.pageCount}.png`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
