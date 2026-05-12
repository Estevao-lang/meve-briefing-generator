import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createBlankBriefing } from "./briefing-data.mjs";
import { loadJson, saveJson, generateBriefing } from "./briefing-generator.mjs";
import { interpretWithGroq, suggestBriefingFilename } from "./briefing-ai.mjs";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const storageRoot = process.env.BRIEFING_STORAGE_DIR ? path.resolve(process.env.BRIEFING_STORAGE_DIR) : root;
const seedDataDir = path.join(root, "data");
const dataDir = process.env.BRIEFING_DATA_DIR ? path.resolve(process.env.BRIEFING_DATA_DIR) : path.join(storageRoot, "data");
const defaultDataFile = "briefing.json";
const distDir = process.env.BRIEFING_DIST_DIR ? path.resolve(process.env.BRIEFING_DIST_DIR) : path.join(storageRoot, "dist");
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";
const maxBodyBytes = 1_500_000;

function getDataFilePath(file = defaultDataFile) {
  const filename = sanitizeDataFilename(file);
  const resolved = path.resolve(dataDir, filename);
  const relative = path.relative(dataDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Nome de arquivo inválido");
  }
  return resolved;
}

function sanitizeDataFilename(file = defaultDataFile) {
  const filename = path.basename(String(file || defaultDataFile).trim());
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/.test(filename)) {
    throw new Error("Nome de arquivo inválido. Use apenas letras, números, hífen, ponto e underline.");
  }
  return filename;
}

function getOutputDirForFile(file = defaultDataFile) {
  const filename = path.basename(sanitizeDataFilename(file), ".json");
  return path.join(distDir, filename);
}

function outputPayload(outputDir) {
  const base = `/dist/${path.basename(outputDir)}`;
  return {
    url: `${base}/briefing.html`,
    outputDir: base,
    pdf: `${base}/briefing-comercial.pdf`,
  };
}

async function listBriefingFiles() {
  await fs.mkdir(dataDir, { recursive: true });
  const entries = await fs.readdir(dataDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function isInsideDirectory(baseDir, targetPath) {
  const relative = path.relative(baseDir, path.resolve(targetPath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function copySeedDataIfNeeded() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(distDir, { recursive: true });

  if (path.resolve(dataDir) === path.resolve(seedDataDir)) return;

  const existingFiles = await fs.readdir(dataDir);
  if (existingFiles.some((file) => file.endsWith(".json"))) return;

  const seedFiles = await fs.readdir(seedDataDir, { withFileTypes: true });
  await Promise.all(
    seedFiles
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => fs.copyFile(path.join(seedDataDir, entry.name), path.join(dataDir, entry.name)))
  );
}

const contentTypes = {
  html: "text/html; charset=UTF-8",
  js: "application/javascript; charset=UTF-8",
  css: "text/css; charset=UTF-8",
  json: "application/json; charset=UTF-8",
  png: "image/png",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  txt: "text/plain; charset=UTF-8",
};

function getContentType(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return contentTypes[ext] || "application/octet-stream";
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=UTF-8" });
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBodyBytes) throw new Error("Conteúdo muito grande para processar.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJsonBody(req) {
  const body = await readRequestBody(req);
  if (!body.trim()) return {};
  return JSON.parse(body);
}

async function serveFile(res, filePath) {
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Arquivo não encontrado");
  }
}

async function handleApi(req, res) {
  const requestUrl = new URL(req.url, `http://localhost:${port}`);
  const fileFromQuery = requestUrl.searchParams.get("file") || defaultDataFile;

  if (req.method === "GET" && requestUrl.pathname === "/api/briefings") {
    const files = await listBriefingFiles();
    sendJson(res, 200, { files, selected: defaultDataFile });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/briefing") {
    try {
      const file = sanitizeDataFilename(fileFromQuery);
      const data = await loadJson(getDataFilePath(file));
      sendJson(res, 200, { file, data });
    } catch (error) {
      sendJson(res, 400, { success: false, error: error.message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/briefing") {
    try {
      const file = sanitizeDataFilename(fileFromQuery);
      const data = await readJsonBody(req);
      const saved = await saveJson(getDataFilePath(file), data);
      sendJson(res, 200, { success: true, file, data: saved });
    } catch (error) {
      sendJson(res, 400, { success: false, error: error.message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/create") {
    try {
      const body = await readJsonBody(req);
      const file = sanitizeDataFilename(body.file || fileFromQuery);
      const data = createBlankBriefing(body.data || {});
      const saved = await saveJson(getDataFilePath(file), data);
      sendJson(res, 200, { success: true, file, data: saved });
    } catch (error) {
      sendJson(res, 400, { success: false, error: error.message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/generate") {
    try {
      const file = sanitizeDataFilename(fileFromQuery);
      const outputDir = getOutputDirForFile(file);
      const result = await generateBriefing({ dataPath: getDataFilePath(file), outputDir });
      sendJson(res, 200, { success: true, file, ...outputPayload(outputDir), pageCount: result.pageCount });
    } catch (error) {
      sendJson(res, 500, { success: false, error: error.message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/interpret") {
    try {
      const body = await readJsonBody(req);
      if (!body.markdown || typeof body.markdown !== "string") throw new Error("Markdown inválido.");
      const data = await interpretWithGroq(body.markdown);
      const file = body.file ? sanitizeDataFilename(body.file) : sanitizeDataFilename(fileFromQuery);
      sendJson(res, 200, { success: true, file, suggestedFile: suggestBriefingFilename(data), data });
    } catch (error) {
      sendJson(res, 400, { success: false, error: error.message || "Erro ao interpretar markdown." });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/automate") {
    try {
      const body = await readJsonBody(req);
      if (!body.markdown || typeof body.markdown !== "string") throw new Error("Markdown inválido.");

      const interpreted = await interpretWithGroq(body.markdown);
      const file = sanitizeDataFilename(body.file || suggestBriefingFilename(interpreted));
      const data = await saveJson(getDataFilePath(file), interpreted);
      const outputDir = getOutputDirForFile(file);
      const result = await generateBriefing({ dataPath: getDataFilePath(file), outputDir });

      sendJson(res, 200, {
        success: true,
        file,
        data,
        ...outputPayload(outputDir),
        pageCount: result.pageCount,
      });
    } catch (error) {
      sendJson(res, 400, { success: false, error: error.message || "Erro ao automatizar briefing." });
    }
    return;
  }

  sendJson(res, 404, { success: false, error: "Rota não encontrada" });
}

async function requestListener(req, res) {
  const requestUrl = new URL(req.url, `http://localhost:${port}`);

  if (req.method === "GET" && requestUrl.pathname === "/healthz") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    await handleApi(req, res);
    return;
  }

  if (requestUrl.pathname.startsWith("/dist/")) {
    const relativeDistPath = decodeURIComponent(requestUrl.pathname.slice("/dist/".length));
    const distFilePath = path.resolve(distDir, relativeDistPath);
    if (!isInsideDirectory(distDir, distFilePath)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" });
      res.end("Acesso proibido");
      return;
    }

    await serveFile(res, distFilePath);
    return;
  }

  const filePath =
    requestUrl.pathname === "/"
      ? path.join(publicDir, "editor.html")
      : path.join(root, decodeURIComponent(requestUrl.pathname.slice(1)));

  const normalizedPath = path.resolve(filePath);
  if (!isInsideDirectory(root, normalizedPath)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Acesso proibido");
    return;
  }

  await serveFile(res, normalizedPath);
}

function createServer() {
  return http.createServer((req, res) => {
    requestListener(req, res).catch((error) => {
      console.error("Erro inesperado:", error);
      sendJson(res, 500, { success: false, error: "Erro interno do servidor." });
    });
  });
}

function startServer(listenPort, attemptsLeft = 5) {
  const server = createServer();

  server.listen(listenPort, host, () => {
    console.log(`Editor de briefing disponível em http://${host}:${listenPort}`);
    console.log("Use o editor para colar texto, automatizar o briefing e gerar PDF/PNG.");
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      console.warn(`Porta ${listenPort} ocupada. Tentando porta ${listenPort + 1}...`);
      startServer(listenPort + 1, attemptsLeft - 1);
      return;
    }
    console.error("Erro ao iniciar o servidor:", error);
    process.exit(1);
  });
}

await copySeedDataIfNeeded();
startServer(port);
