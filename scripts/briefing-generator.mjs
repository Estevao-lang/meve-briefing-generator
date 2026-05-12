import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { getArg, prepareData } from "./briefing-data.mjs";

export { getArg, prepareData } from "./briefing-data.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const pageWidth = 794;
const pageHeight = 1123;

export async function loadJson(dataPath) {
  const content = await fs.readFile(dataPath, "utf8");
  return prepareData(JSON.parse(content));
}

export async function saveJson(dataPath, data) {
  const normalized = prepareData(data);
  await fs.writeFile(dataPath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

export async function assetUrl(relativePath) {
  if (typeof relativePath !== "string") return "";
  const normalized = relativePath.trim();
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const fullPath = path.isAbsolute(normalized) ? normalized : path.join(root, normalized);
  if (!isInsideRoot(fullPath)) return "";

  try {
    const buffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).slice(1).toLowerCase();
    const mime = ext === "svg" ? "image/svg+xml" : ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch (error) {
    return pathToFileURL(fullPath).href;
  }
}

function isInsideRoot(targetPath) {
  const relative = path.relative(root, path.resolve(targetPath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(type) {
  const icons = {
    users: `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    building: `<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1M9 13h1M9 17h1M14 13h1M14 17h1"/></svg>`,
    file: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>`,
    chart: `<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/><path d="m7 10 5-5 5 3 4-5"/></svg>`,
    target: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    gear: `<svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 20.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 3.6a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 3.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.31.54 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.97 0-1.37.69-1.51 1Z"/></svg>`,
    hardhat: `<svg viewBox="0 0 24 24"><path d="M2 18h20"/><path d="M4 18a8 8 0 0 1 16 0"/><path d="M9 10v8M15 10v8"/><path d="M12 6v12"/></svg>`,
    rocket: `<svg viewBox="0 0 24 24"><path d="M4.5 16.5c-1 1.3-1.5 2.8-1.5 4.5 1.7 0 3.2-.5 4.5-1.5"/><path d="M9 15 4 20"/><path d="M15 9l-6 6"/><path d="M14 4c2.5-1.2 5-1 7-1-.1 2-.2 4.5-1.5 7L14 4Z"/><path d="M14 4 9 9l6 6 4.5-5"/></svg>`,
  };
  return icons[type] || icons.target;
}

function listItem(text, iconType = "target") {
  return `<li><span class="mini-icon">${icon(iconType)}</span><span>${escapeHtml(text)}</span></li>`;
}

function moduleCard(module) {
  return `
    <div class="module-card">
      <div class="icon-circle">${icon(module.icon)}</div>
      <div>
        <h3>${escapeHtml(module.title)}</h3>
        <p>${escapeHtml(module.description)}</p>
      </div>
    </div>`;
}

export async function createHtml(rawData) {
  const data = prepareData(rawData);
  const logo = await assetUrl(data.brand.logoPath || "assets/logo.png");
  const featureItems = data.cover.features.map((item) => `<span><b>•</b> ${escapeHtml(item)}</span>`).join("");
  const pains = data.about.pains.map((pain, index) => listItem(pain, ["file", "gear", "building", "users", "target", "chart"][index] || "target")).join("");
  const modules = data.modules.map(moduleCard).join("");
  const benefits = data.benefits.map((benefit, index) => listItem(benefit, ["target", "gear", "users", "file", "chart", "building"][index] || "target")).join("");
  const mvpItems = data.mvp.map((item, index) => listItem(item, ["users", "building", "file", "chart", "users"][index] || "target")).join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(data.cover.titleLine1)} ${escapeHtml(data.cover.titleLine2)}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #020814;
      font-family: Inter, Segoe UI, Arial, sans-serif;
      color: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: ${pageWidth}px;
      height: ${pageHeight}px;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      padding: 56px;
      background:
        linear-gradient(145deg, #020817 0%, #041638 55%, #020814 100%),
        linear-gradient(90deg, rgba(0, 202, 255, .12), transparent 44%, rgba(72, 255, 179, .08));
    }
    .page::before {
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(0, 195, 255, .045) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 195, 255, .045) 1px, transparent 1px);
      background-size: 42px 42px;
      opacity: .75;
      pointer-events: none;
    }
    .page::after {
      content: "";
      position: absolute;
      left: -10%;
      bottom: -12%;
      width: 120%;
      height: 250px;
      background:
        linear-gradient(90deg, transparent, rgba(0, 211, 255, .22), transparent),
        repeating-linear-gradient(165deg, transparent 0 13px, rgba(0, 191, 255, .22) 14px, transparent 16px);
      border-top: 1px solid rgba(0, 221, 255, .35);
      opacity: .95;
      pointer-events: none;
    }
    .content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; }
    .page-main { flex: 0 1 auto; min-height: 0; padding-bottom: 12px; }
    h1, h2, h3, p { margin: 0; }
    svg { width: 54px; height: 54px; stroke: #00caff; stroke-width: 1.8; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .logo { width: 150px; height: auto; object-fit: contain; }
    .small-logo { width: 92px; filter: none; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 28px; margin-bottom: 34px; }
    .page-badge { border: 1px solid rgba(0, 211, 255, .75); color: #dff8ff; border-radius: 8px; padding: 9px 15px; font-size: 13px; letter-spacing: 0; background: rgba(0, 22, 50, .65); box-shadow: 0 0 18px rgba(0, 194, 255, .15); }
    .blueprint { display: none; }
    .building { display: none; }
    .b1 { display: none; }
    .b2 { display: none; }
    .b3 { display: none; }
    .crane { display: none; }
    .crane::after { display: none; }
    .dashboard-bg { display: none; }
    .dashboard-bg::before { display: none; }
    .dashboard-bg::after { display: none; }
    .hero-logo-wrap { display: flex; justify-content: center; margin-top: 34px; margin-bottom: 64px; }
    .hero-logo { width: 355px; filter: none; }
    .hero-logo-ring { position: relative; display: grid; place-items: center; width: 470px; height: 315px; }
    .hero-logo-ring::before { content: ""; position: absolute; width: 390px; height: 390px; border-radius: 50%; border: 1px solid rgba(0, 213, 255, .18); box-shadow: none; }
    .cover-title { text-align: center; margin-top: 18px; }
    .cover-title h1 { font-size: 78px; line-height: .92; letter-spacing: 0; font-weight: 900; }
    .cover-title h1 span { display: block; font-size: 92px; color: #00c8ff; text-shadow: 0 0 22px rgba(0, 198, 255, .5); }
    .cover-subtitle { margin-top: 20px; font-size: 24px; color: #effbff; letter-spacing: 0; }
    .feature-bar { margin: 36px auto 34px; max-width: 690px; border: 1px solid #00d2ff; border-radius: 8px; padding: 16px 20px; background: rgba(0, 18, 44, .76); display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 12px 14px; box-shadow: 0 0 30px rgba(0, 191, 255, .16); font-size: 14px; }
    .feature-bar span { color: #eefcff; }
    .feature-bar b { color: #00cdfa; }
    .cover-message { max-width: 650px; text-align: center; margin: 0 auto; color: #e7f7ff; font-size: 22px; line-height: 1.42; }
    .cover-message strong { color: #00caff; }
    .footer { position: relative; z-index: 3; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px 14px; color: #f3fbff; font-size: 14px; background: rgba(1, 16, 38, .74); border: 1px solid rgba(0, 200, 255, .3); border-radius: 8px; padding: 10px 16px; margin-top: auto; min-height: 44px; flex: 0 0 auto; }
    .footer b { font-weight: 800; }
    .footer .divider { width: 1px; height: 18px; background: #00caff; flex: 0 0 1px; }
    .footer .muted { color: #cbd9e8; }
    .section-title { margin-top: 8px; margin-bottom: 34px; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 26px; }
    .section-title .line { width: 2px; height: 86px; background: linear-gradient(#00d5ff, transparent); }
    .section-title h2 { font-size: 56px; font-weight: 900; letter-spacing: 0; line-height: .98; }
    .section-title p { margin-top: 8px; font-size: 28px; color: #00bfff; }
    .panel { position: relative; border: 1px solid rgba(0, 204, 255, .72); border-radius: 8px; background: rgba(1, 15, 37, .76); box-shadow: 0 0 26px rgba(0, 186, 255, .12), inset 0 0 50px rgba(0, 151, 255, .06); padding: 28px 30px; margin-bottom: 16px; }
    .panel-row { display: grid; grid-template-columns: 128px 1fr; gap: 24px; align-items: center; }
    .big-icon { width: 105px; height: 105px; border-radius: 50%; display: grid; place-items: center; background: rgba(0, 84, 180, .16); border: 1px solid rgba(0, 208, 255, .32); }
    .panel h3 { font-size: 28px; margin-bottom: 12px; font-weight: 850; letter-spacing: 0; }
    .panel h3 .num { color: #00caff; }
    .panel p { color: #edf8ff; font-size: 20px; line-height: 1.35; }
    .pain-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; margin-top: 18px; list-style: none; padding: 0; }
    .pain-grid li, .benefit-list li, .mvp-list li { display: flex; align-items: center; gap: 16px; color: #eefaff; font-size: 18px; line-height: 1.25; min-height: 54px; border-bottom: 1px solid rgba(0, 187, 255, .15); }
    .mini-icon { width: 50px; height: 50px; flex: 0 0 50px; display: grid; place-items: center; border-radius: 8px; border: 1px solid rgba(0, 203, 255, .35); background: rgba(0, 91, 190, .12); }
    .mini-icon svg { width: 28px; height: 28px; }
    .quote-box { margin-top: 18px; display: grid; grid-template-columns: 85px 1fr; gap: 16px; align-items: center; border: 1px solid rgba(0, 211, 255, .8); border-radius: 8px; padding: 24px; background: rgba(0, 24, 58, .78); box-shadow: 0 0 32px rgba(0, 191, 255, .2); }
    .quote-mark { width: 70px; height: 70px; border: 1px solid #00caff; border-radius: 50%; display: grid; place-items: center; color: #00caff; font-size: 54px; font-weight: 900; }
    .quote-box p { font-size: 23px; line-height: 1.35; }
    .quote-box strong { color: #00caff; }
    .modules-title { margin-top: 92px; margin-bottom: 28px; }
    .modules-title h2 { font-size: 62px; line-height: .95; font-weight: 900; letter-spacing: 0; }
    .modules-title h2 span { color: #00caff; display: block; }
    .modules-title p { margin-top: 14px; font-size: 22px; color: #effbff; }
    .modules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .module-card { min-height: 136px; display: grid; grid-template-columns: 86px 1fr; gap: 20px; align-items: center; border: 1px solid rgba(0, 204, 255, .68); border-radius: 8px; background: rgba(1, 15, 37, .76); padding: 22px; box-shadow: inset 0 0 45px rgba(0, 191, 255, .05); }
    .icon-circle { width: 76px; height: 76px; border-radius: 50%; display: grid; place-items: center; border: 1px solid rgba(0, 204, 255, .6); background: rgba(0, 84, 180, .13); }
    .icon-circle svg { width: 42px; height: 42px; }
    .module-card h3 { font-size: 22px; line-height: 1.08; margin-bottom: 8px; }
    .module-card p { color: #d9ebf7; font-size: 15.5px; line-height: 1.28; }
    .bottom-highlight { margin-top: 22px; border: 1px solid #00caff; border-radius: 8px; background: rgba(0, 24, 58, .78); padding: 20px 26px; display: grid; grid-template-columns: 70px 1fr; gap: 20px; align-items: center; color: #00d5ff; font-size: 22px; line-height: 1.28; }
    .benefits-layout { display: grid; grid-template-columns: 1.22fr .92fr; gap: 22px; margin-top: 50px; }
    .label { display: inline-flex; align-items: center; gap: 12px; background: rgba(0, 43, 95, .88); border: 1px solid rgba(0, 202, 255, .6); border-radius: 8px; padding: 9px 15px; font-weight: 800; margin-bottom: 8px; }
    .label span { background: linear-gradient(135deg, #00d7ff, #006dff); padding: 5px 10px; border-radius: 7px; }
    .benefit-list, .mvp-list { list-style: none; padding: 18px 22px; margin: 0; border: 1px solid rgba(0, 204, 255, .62); border-radius: 8px; background: rgba(1, 15, 37, .78); min-height: 388px; }
    .mvp-list li { font-size: 17px; }
    .closing-quote { margin-top: 24px; text-align: center; border: 1px solid rgba(0, 210, 255, .7); border-radius: 8px; background: rgba(1, 18, 45, .78); padding: 30px 50px; font-size: 27px; line-height: 1.28; }
    .closing-quote strong { color: #00caff; }
    .cta { margin-top: 24px; display: grid; grid-template-columns: 84px 1fr; align-items: center; gap: 24px; border: 1px solid #00caff; border-radius: 8px; padding: 24px 42px; background: rgba(0, 25, 61, .82); }
    .cta p { font-size: 32px; font-weight: 850; letter-spacing: 0; }
    .cta strong { color: #00caff; display: block; }
    #page-2 .topbar { margin-bottom: 24px; }
    #page-2 .section-title { margin-top: 0; margin-bottom: 18px; gap: 18px; }
    #page-2 .section-title .line { height: 64px; }
    #page-2 .section-title h2 { font-size: 46px; }
    #page-2 .section-title p { font-size: 22px; }
    #page-2 .panel { padding: 16px 22px; margin-bottom: 10px; }
    #page-2 .panel-row { grid-template-columns: 78px 1fr; gap: 16px; }
    #page-2 .big-icon { width: 68px; height: 68px; }
    #page-2 .big-icon svg { width: 36px; height: 36px; }
    #page-2 .panel h3 { font-size: 22px; margin-bottom: 6px; }
    #page-2 .panel p { font-size: 15.5px; line-height: 1.25; }
    #page-2 .pain-grid { gap: 8px 22px; margin-top: 12px; }
    #page-2 .pain-grid li { min-height: 42px; font-size: 15px; gap: 12px; }
    #page-2 .mini-icon { width: 38px; height: 38px; flex-basis: 38px; }
    #page-2 .mini-icon svg { width: 22px; height: 22px; }
    #page-2 .quote-box { margin-top: 8px; padding: 14px 20px; grid-template-columns: 52px 1fr; }
    #page-2 .quote-mark { width: 46px; height: 46px; font-size: 36px; }
    #page-2 .quote-box p { font-size: 17px; line-height: 1.24; }
    #page-3 .modules-title { margin-top: 52px; margin-bottom: 22px; }
    #page-3 .modules-grid { gap: 14px; }
    #page-3 .module-card { min-height: 124px; padding: 18px; grid-template-columns: 72px 1fr; gap: 16px; }
    #page-3 .icon-circle { width: 64px; height: 64px; }
    #page-3 .icon-circle svg { width: 34px; height: 34px; }
    #page-3 .module-card h3 { font-size: 20px; }
    #page-3 .module-card p { font-size: 14px; line-height: 1.25; }
    #page-3 .bottom-highlight { margin-top: 16px; padding: 16px 22px; grid-template-columns: 62px 1fr; font-size: 19px; }
    #page-4 .modules-title { margin-top: 24px; margin-bottom: 14px; }
    #page-4 .modules-title h2 { font-size: 48px; }
    #page-4 .benefits-layout { margin-top: 22px; gap: 16px; }
    #page-4 .benefit-list, #page-4 .mvp-list { min-height: 284px; padding: 12px 16px; }
    #page-4 .benefit-list li, #page-4 .mvp-list li { min-height: 40px; font-size: 14.5px; gap: 10px; }
    #page-4 .mini-icon { width: 36px; height: 36px; flex-basis: 36px; }
    #page-4 .mini-icon svg { width: 21px; height: 21px; }
    #page-4 .closing-quote { margin-top: 14px; padding: 16px 28px; font-size: 19px; line-height: 1.22; }
    #page-4 .cta { margin-top: 14px; padding: 14px 28px; grid-template-columns: 58px 1fr; gap: 18px; }
    #page-4 .cta .icon-circle { width: 54px; height: 54px; }
    #page-4 .cta .icon-circle svg { width: 30px; height: 30px; }
    #page-4 .cta p { font-size: 23px; }
  </style>
</head>
<body>
  <section class="page" id="page-1">
    <div class="content">
      <main class="page-main">
      <div class="hero-logo-wrap"><div class="hero-logo-ring"><img class="hero-logo" src="${logo}" alt="${escapeHtml(data.brand.name)}" /></div></div>
      <div class="cover-title"><h1>${escapeHtml(data.cover.titleLine1)}<span>${escapeHtml(data.cover.titleLine2)}</span></h1><p class="cover-subtitle">${escapeHtml(data.cover.subtitle)}</p></div>
      <div class="feature-bar">${featureItems}</div>
      <p class="cover-message">${escapeHtml(data.brand.mainMessagePrefix)} <strong>${escapeHtml(data.brand.mainMessageHighlight)}</strong></p>
      </main>
      <div class="footer"><b>${escapeHtml(data.brand.name)}</b><span class="divider"></span><span class="muted">Software House</span></div>
    </div>
  </section>

  <section class="page" id="page-2">
    <div class="content">
      <main class="page-main">
      <div class="topbar"><img class="small-logo" src="${logo}" alt="${escapeHtml(data.brand.name)}" /><div class="page-badge">PÁGINA 02</div></div>
      <div class="section-title"><span class="line"></span><div><h2>Quem Somos</h2><p>Como ajudamos sua empresa</p></div></div>
      <div class="panel panel-row"><div class="big-icon">${icon("users")}</div><div><h3><span class="num">1.</span> Quem Somos</h3><p>${escapeHtml(data.about.company)}</p></div></div>
      <div class="panel panel-row"><div class="big-icon">${icon("target")}</div><div><h3><span class="num">2.</span> Objetivo da Solução</h3><p>${escapeHtml(data.about.objective)}</p></div></div>
      <div class="panel"><h3><span class="num">3.</span> Problemas que resolvemos</h3><ul class="pain-grid">${pains}</ul></div>
      <div class="quote-box"><div class="quote-mark">“</div><p><strong>Não criamos apenas sites.</strong> Criamos soluções digitais para empresas <strong>venderem mais, organizarem processos e crescerem com tecnologia.</strong></p></div>
      </main>
      <div class="footer"><span>${escapeHtml(data.brand.website)}</span><span class="divider"></span><b>${escapeHtml(data.brand.name)}</b></div>
    </div>
  </section>

  <section class="page" id="page-3">
    <div class="blueprint"><div class="building b1"></div><div class="building b2"></div><div class="building b3"></div><div class="crane"></div></div>
    <div class="dashboard-bg"></div>
    <div class="content">
      <main class="page-main">
      <div class="topbar"><img class="small-logo" src="${logo}" alt="${escapeHtml(data.brand.name)}" /><div class="page-badge">03</div></div>
      <div class="modules-title"><h2>Soluções da<span>Proposta</span></h2><p>${escapeHtml(data.proposal.modulesSubtitle)}</p></div>
      <div class="modules-grid">${modules}</div>
      <div class="bottom-highlight"><div class="icon-circle">${icon("target")}</div><p>Cada projeto pode começar por um MVP e evoluir por fases, de acordo com a necessidade, prioridade e operação da empresa.</p></div>
      </main>
      <div class="footer"><span>${escapeHtml(data.brand.website)}</span><span class="divider"></span><b>${escapeHtml(data.brand.name)}</b></div>
    </div>
  </section>

  <section class="page" id="page-4">
    <div class="content">
      <main class="page-main">
      <div class="topbar"><img class="small-logo" src="${logo}" alt="${escapeHtml(data.brand.name)}" /><div class="page-badge">4 / 4</div></div>
      <div class="modules-title"><h2>Benefícios e<span>Próximos Passos</span></h2></div>
      <div class="benefits-layout">
        <div><div class="label"><span>1</span> Benefícios para a empresa:</div><ul class="benefit-list">${benefits}</ul></div>
        <div><div class="label"><span>2</span> MVP Recomendado:</div><ul class="mvp-list">${mvpItems}</ul></div>
      </div>
      <div class="closing-quote">${escapeHtml(data.proposal.closingQuote)}</div>
      <div class="cta"><div class="icon-circle">${icon("rocket")}</div><p>${escapeHtml(data.proposal.ctaLead)} <strong>${escapeHtml(data.proposal.ctaHighlight)}</strong></p></div>
      </main>
      <div class="footer"><b>${escapeHtml(data.brand.name)}</b><span class="divider"></span><span class="muted">Sistemas personalizados • Automações • Sites profissionais</span><span class="divider"></span><span>${escapeHtml(data.brand.website)}</span></div>
    </div>
  </section>
</body>
</html>`;
}

export async function generateBriefing({ dataPath, outputDir }) {
  const htmlPath = path.join(outputDir, "briefing.html");
  const pdfPath = path.join(outputDir, "briefing-comercial.pdf");

  await fs.mkdir(outputDir, { recursive: true });
  const data = await loadJson(dataPath);
  const htmlContent = await createHtml(data);
  await fs.writeFile(htmlPath, htmlContent, "utf8");

  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: pageWidth, height: pageHeight }, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });

    await page.pdf({
      path: pdfPath,
      width: `${pageWidth}px`,
      height: `${pageHeight}px`,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    const pageCount = await page.locator(".page").count();
    for (let index = 1; index <= pageCount; index++) {
      const locator = page.locator(`#page-${index}`);
      await locator.screenshot({
        path: path.join(outputDir, `briefing-page-${index}.png`),
        animations: "disabled",
      });
    }

    return { htmlPath, pdfPath, outputDir, pageCount };
  } finally {
    if (browser) await browser.close();
  }
}
