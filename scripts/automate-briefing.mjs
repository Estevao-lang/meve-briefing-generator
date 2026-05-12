import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getArg, hasFlag, slugify } from "./briefing-data.mjs";
import { saveJson, generateBriefing } from "./briefing-generator.mjs";
import { interpretWithGroq, suggestBriefingFilename } from "./briefing-ai.mjs";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const distDir = path.join(root, "dist");

async function main() {
  const inputPath = getArg("input", "");
  const inlineText = getArg("text", "");
  const fileArg = getArg("file", "");
  const dataPathArg = getArg("data", "");
  const outputArg = getArg("out", "");
  const skipGenerate = hasFlag("no-generate");

  const sourceText = inputPath ? await fs.readFile(path.resolve(root, inputPath), "utf8") : inlineText;
  if (!sourceText.trim()) {
    throw new Error("Informe um texto com --text ou um arquivo markdown/texto com --input.");
  }

  const interpreted = await interpretWithGroq(sourceText);
  const filename = sanitizeFilename(fileArg || suggestBriefingFilename(interpreted));
  const dataPath = dataPathArg ? path.resolve(root, dataPathArg) : path.join(dataDir, filename);
  const outputDir = outputArg ? path.resolve(root, outputArg) : path.join(distDir, slugify(path.basename(filename, ".json")));

  await ensureInside(root, dataPath, "data");
  await ensureInside(root, outputDir, "out");

  const data = await saveJson(dataPath, interpreted);

  let result = null;
  if (!skipGenerate) {
    result = await generateBriefing({ dataPath, outputDir });
  }

  console.log("Briefing automatizado com sucesso!");
  console.log(`JSON: ${dataPath}`);
  console.log(`Marca: ${data.brand.name}`);
  console.log(`Negócio alvo: ${data.target.name}`);
  if (result) {
    console.log(`HTML: ${result.htmlPath}`);
    console.log(`PDF: ${result.pdfPath}`);
    console.log(`Páginas: ${result.pageCount}`);
  }
}

function sanitizeFilename(file) {
  const filename = String(file || "briefing.json").trim().endsWith(".json")
    ? String(file).trim()
    : `${String(file || "briefing").trim()}.json`;
  const clean = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "-");
  return clean || "briefing.json";
}

async function ensureInside(rootDir, targetPath, label) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Caminho de ${label} fora do projeto: ${resolvedTarget}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
