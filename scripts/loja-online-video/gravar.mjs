/* Grava a compra simulada na Iconic: o site real até a sacola, o pagamento
   simulado (sim.js) por cima, só neste navegador. A medição da loja fica
   bloqueada: nenhuma visita, evento ou pixel sai daqui.
   Uso: node gravar.mjs <desktop|celular|vertical|retrato> <pasta de saída>
   desktop 1280x800 e celular 800x1000 são os da moldura da página; vertical
   (1080x1920, 9:16) e retrato (1080x1350, 4:5) são os do anúncio (lote 16). */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
const req = createRequire("C:/Users/Rafael/rafael-razeira-estudio/package.json");
const puppeteer = req("puppeteer-core");
const FFMPEG = req("ffmpeg-static");

const [modo = "desktop", OUT = "."] = process.argv.slice(2);
/* iphone (09/11): a tela do iPhone da /loja-online-v2 sem a barra de status (390x844 - 50) */
const MEDIDAS = { desktop: [1280, 800, 1], celular: [400, 500, 2], vertical: [360, 640, 3], retrato: [360, 450, 3], iphone: [390, 794, 2] };
if (!MEDIDAS[modo]) throw new Error("modo: desktop, celular, vertical, retrato ou iphone");
const CEL = modo !== "desktop";
const [W, H, DPR] = MEDIDAS[modo];
const PRODUTO = "/produto/new-balance-9060-azul-bebe";
const quadros = path.join(OUT, `quadros-${modo}`);
fs.rmSync(quadros, { recursive: true, force: true }); fs.mkdirSync(quadros, { recursive: true });
const espera = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new",
  args: ["--hide-scrollbars", "--disable-blink-features=AutomationControlled"],
});
const p = await browser.newPage();
await p.setViewport({ width: W, height: H, deviceScaleFactor: DPR, isMobile: CEL, hasTouch: CEL });
if (CEL) await p.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1");
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }, { name: "prefers-color-scheme", value: "light" }]);
await p.setRequestInterception(true);
p.on("request", r => {
  const u = r.url();
  if (/\/api\/|facebook|fbevents|connect\.facebook|mixpanel|googletagmanager|google-analytics|clarity|hotjar|vercel-insights|_vercel\/insights|speed-insights/.test(u)) return r.abort();
  r.continue();
});
await p.evaluateOnNewDocument(fs.readFileSync(new URL("./sim.js", import.meta.url), "utf8"));

await p.goto("https://iconicsneakers.com.br/", { waitUntil: "load", timeout: 120000 });
await p.waitForSelector(`a[href="${PRODUTO}"]`, { timeout: 60000 });
await espera(2000);
/* o convite/aviso de cookies, se houver, fecha antes de gravar */
await p.evaluate(() => { for (const b of document.querySelectorAll("button")) if (/aceitar|entendi|fechar|ok$/i.test(b.textContent || "")) b.click(); });
await espera(1500);

/* ---------- a gravação: os quadros com o horário de cada um ---------- */
const cdp = await p.createCDPSession();
const lista = [];
cdp.on("Page.screencastFrame", async f => {
  const n = String(lista.length).padStart(5, "0");
  fs.writeFileSync(path.join(quadros, `${n}.jpg`), Buffer.from(f.data, "base64"));
  lista.push({ arq: `${n}.jpg`, t: f.metadata.timestamp });
  try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {}
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: W * DPR, maxHeight: H * DPR, everyNthFrame: 1 });

const mover = async (x, y, passos = 28) => { if (!CEL) await p.mouse.move(x, y, { steps: passos }); };
const clicar = async (x, y) => {
  if (CEL) { await p.evaluate((x, y) => window.__toque(x, y), x, y); await espera(180); await p.touchscreen.tap(x, y); }
  else { await mover(x, y); await espera(160); await p.mouse.down(); await espera(70); await p.mouse.up(); }
};
const centroDe = async sel => p.evaluate(s => { const e = typeof s === "string" ? document.querySelector(s) : null; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top + scrollY }; }, sel);

if (!CEL) await p.mouse.move(W * .62, H * .55);
await espera(1300);

/* 1. a home: rola até a peça e entra nela */
/* o alvo é o botão "Mais detalhes" do card: no celular, tocar na foto só a vira */
await p.evaluate(h => { const ls = [...document.querySelectorAll(`a[href="${h}"]`)]; (ls.find(a => /Mais detalhes/i.test(a.textContent || "")) || ls[0]).id = "sim-card"; }, PRODUTO);
const card = await centroDe("#sim-card");
if (!card) throw new Error("a peça não está na home");
await p.evaluate((y, ms) => window.__rolar(y, ms), Math.max(0, card.top - H * .42), 2200);
await espera(2400);
/* no celular a fileira é um carrossel que anda sozinho: vale o card que estiver
   inteiro na tela neste instante, e o checkout lê o nome e o preço da peça aberta */
let ALVO = PRODUTO;
if (CEL) {
  ALVO = await p.evaluate(W => {
    document.getElementById("sim-card")?.removeAttribute("id");
    const ls = [...document.querySelectorAll("a[href^='/produto/']")].filter(a => /Mais detalhes/i.test(a.textContent || ""));
    const vis = ls.find(a => { const r = a.getBoundingClientRect(); return r.left >= 6 && r.right <= W - 6 && r.top > 60 && r.bottom < innerHeight - 10; });
    if (!vis) return null;
    vis.id = "sim-card"; return vis.getAttribute("href");
  }, W);
  if (!ALVO) throw new Error("nenhum card inteiro na tela");
}
if (CEL) {
  /* no celular o toque é medido e dado no mesmo instante, dentro da página: o
     carrossel anda entre medir e tocar, e o toque caía no card vizinho ou no vão */
  await espera(400);
  await p.evaluate(() => { const a = document.getElementById("sim-card"); const r = a.getBoundingClientRect(); window.__toque(r.left + r.width / 2, r.top + r.height / 2); setTimeout(() => a.click(), 180); });
} else {
  const noCard = await centroDe("#sim-card");
  await mover(noCard.x, noCard.y, 32);
  await espera(500);
  await clicar(noCard.x, noCard.y);
}
await p.waitForFunction(p => location.pathname === p, { timeout: 30000 }, ALVO);
await espera(1800);

/* 2. a peça: o tamanho 41 e o "Comprar agora" (o botão que a loja online acrescenta) */
const dados = await p.evaluate(() => {
  const b41 = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "41");
  const add = [...document.querySelectorAll("button, a")].find(b => /Adicionar à sacola/i.test(b.textContent || ""));
  if (add) { add.id = "sim-comprar"; add.innerHTML = add.innerHTML.replace(/Adicionar à sacola/i, "Comprar agora"); }
  if (b41) b41.id = "sim-41";
  const img = [...document.querySelectorAll("main img")].find(i => i.naturalWidth > 300);
  /* o nome e o preço no Pix, lidos da página: o maior "R$ ..." da coluna da peça */
  const nome = (document.querySelector("main h1")?.textContent || "").replace(/\s+/g, " ").trim();
  let preco = 0, maior = 0;
  for (const el of document.querySelectorAll("main *")) {
    if (el.children.length > 2) continue;
    const m = (el.textContent || "").match(/^\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/);
    if (!m) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs > maior) { maior = fs; preco = parseFloat(m[1].replace(/\./g, "").replace(",", ".")); }
  }
  return { tem41: !!b41, temAdd: !!add, foto: img?.currentSrc || img?.src || "", nome, preco };
});
console.log("peça:", dados.nome, dados.preco);
if (!dados.tem41 || !dados.temAdd || !dados.preco) throw new Error("faltou o 41, o botão ou o preço: " + JSON.stringify(dados));
let t41 = await centroDe("#sim-41");
if (t41.y > H - 80 || t41.y < 120) { await p.evaluate((y, ms) => window.__rolar(y, ms), Math.max(0, t41.top - H * .45), 1200); await espera(1300); t41 = await centroDe("#sim-41"); }
await mover(t41.x, t41.y, 30); await espera(350);
await clicar(t41.x, t41.y);
await espera(1100);
let comprar = await centroDe("#sim-comprar");
if (comprar.y > H - 60) { await p.evaluate((y, ms) => window.__rolar(y, ms), Math.max(0, comprar.top - H * .55), 1100); await espera(1200); comprar = await centroDe("#sim-comprar"); }
await mover(comprar.x, comprar.y, 26); await espera(450);
/* o clique de verdade iria para a sacola: aqui ele abre o checkout simulado */
if (!CEL) { await p.mouse.down(); await espera(70); await p.mouse.up(); } else { await p.evaluate((x, y) => window.__toque(x, y), comprar.x, comprar.y); }
await p.evaluate(() => scrollTo(0, 0));
await p.evaluate(d => { window.__co = window.__checkout(d); }, { foto: dados.foto, nome: dados.nome, tam: "41", preco: dados.preco });
await espera(1100);

/* 3. a entrega: o CEP, o frete, o PAC */
const cep = await p.evaluate(() => window.__co.centro("#sim-cep"));
await mover(cep.x, cep.y, 24); await espera(200);
if (CEL) await p.evaluate((x, y) => window.__toque(x, y), cep.x, cep.y);
await p.evaluate(() => window.__co.focoCep());
await p.evaluate(() => window.__co.digita("80010-000", 105));
await espera(450);
await p.evaluate(() => window.__co.opcoes());
await espera(700);
if (CEL) { await p.evaluate(() => window.__co.mostra('.sim-op[data-i="1"]')); await espera(600); }
const pac = await p.evaluate(() => window.__co.centro('.sim-op[data-i="0"]'));
await clicar(pac.x, pac.y);
await p.evaluate(() => window.__co.marca(0));
await espera(900);
if (CEL) { await p.evaluate(() => window.__co.mostra("#sim-ir")); await espera(600); }
const ir = await p.evaluate(() => window.__co.centro("#sim-ir"));
await clicar(ir.x, ir.y);
await p.evaluate(() => window.__co.pagamento());
if (CEL) await p.evaluate(() => document.getElementById("sim-co").scrollTo(0, 0));

/* 4. o Pix: espera, aprova */
if (!CEL) await p.mouse.move(W * .82, H * .8, { steps: 30 });
await espera(2600);
await p.evaluate(() => window.__co.aprovado());
await espera(3000);

await cdp.send("Page.stopScreencast");
await espera(300);
await browser.close();

/* ---------- a montagem: cada quadro dura até o próximo ---------- */
const linhas = [];
for (let i = 0; i < lista.length; i++) {
  const dur = i < lista.length - 1 ? Math.max(0.001, lista[i + 1].t - lista[i].t) : 0.5;
  linhas.push(`file '${lista[i].arq}'`, `duration ${dur.toFixed(4)}`);
}
linhas.push(`file '${lista[lista.length - 1].arq}'`);
fs.writeFileSync(path.join(quadros, "lista.txt"), linhas.join("\n"));
const total = lista[lista.length - 1].t - lista[0].t;
console.log(`${modo}: ${lista.length} quadros, ${total.toFixed(1)}s`);
const base = path.join(OUT, `compra-${modo}`);
const filtro = `scale=${W * DPR}:${H * DPR}:flags=lanczos,fps=30,format=yuv420p`;
execFileSync(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", path.join(quadros, "lista.txt"), "-vf", filtro, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-movflags", "+faststart", "-an", `${base}.mp4`], { stdio: "ignore" });
execFileSync(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", path.join(quadros, "lista.txt"), "-vf", filtro, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", "-row-mt", "1", "-an", `${base}.webm`], { stdio: "ignore" });
/* a capa: o primeiro quadro */
execFileSync(FFMPEG, ["-y", "-i", `${base}.mp4`, "-frames:v", "1", "-q:v", "3", `${base}-capa.jpg`], { stdio: "ignore" });
for (const ext of [".mp4", ".webm", "-capa.jpg"]) console.log(path.basename(base + ext), Math.round(fs.statSync(base + ext).size / 1024) + "KB");
