// Mockup em vídeo de uma vitrine dentro de um aparelho (19/10/2026): a home da loja
// rolando dentro de um iPhone (vídeo vertical 1080×1920) ou de um MacBook (1920×1080),
// sobre o papel do estúdio. Pedido do Rafael para o perfil do Google e o Instagram.
//
//   node scripts/mockup-aparelho.mjs iphone verit-lab fulltime japa-modas
//   node scripts/mockup-aparelho.mjs mac xaviers-sports fardo-esportes
//
// O endereço vem de data/portfolio.ts. Sai em ~/Desktop/mockups/<slug>-<aparelho>.mp4
// (mudo) e <slug>-<aparelho>.jpg (o primeiro quadro, para capa).
//
// A rolagem é fotografada passo a passo, como no reel-portfolio.mjs (ver a nota
// 4 Máquina/reel-portfolio): rolar por relógio no Chrome sem janela sai aos trancos.
// O aparelho é uma moldura PNG com a tela vazada: o fundo, a tela e a moldura são
// três camadas somadas no ffmpeg, e o canto arredondado da tela é a própria moldura.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import ffmpegPath from "ffmpeg-static";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SAIDA = path.join(os.homedir(), "Desktop", "mockups");
const FPS = 30;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// a tela do aparelho dentro do quadro: x, y, largura e altura da área vazada, e o
// viewport que o site enxerga. O iPhone é um 390 de largura (iPhone 14/15) a 2x, e a
// `barra` é a de status (hora, sinal, bateria): o site começa abaixo dela, como num
// iPhone de verdade. Sem ela a ilha dinâmica caía em cima da faixa de aviso da loja.
const APARELHOS = {
  iphone: { W: 1080, H: 1920, vw: 390, dpr: 2, mobile: true, sx: 199, sy: 140, sw: 682, sh: 1476, raio: 74, borda: 26, barra: 92 },
  mac: { W: 1920, H: 1080, vw: 1440, dpr: 1, mobile: false, sx: 300, sy: 92, sw: 1320, sh: 825, raio: 18, borda: 22, barra: 0 },
};
// a área do site dentro da tela, e o viewport com a mesma proporção
for (const a of Object.values(APARELHOS)) { a.ty = a.sy + a.barra; a.th = a.sh - a.barra; a.vh = Math.round((a.th * a.vw) / a.sw); }

const fonte = fs.readFileSync(path.join(__dir, "..", "data", "portfolio.ts"), "utf8");
function doPortfolio(slug) {
  const linha = fonte.split("\n").find((l) => l.includes(`slug: "${slug}"`));
  return { nome: linha?.match(/nome: "([^"]*)"/)?.[1], url: linha?.match(/url: "([^"]*)"/)?.[1] };
}

const [tipo, ...slugs] = process.argv.slice(2);
const A = APARELHOS[tipo];
if (!A || !slugs.length) {
  console.error("uso: node scripts/mockup-aparelho.mjs <iphone|mac> <slug> [slug...]");
  process.exit(1);
}
fs.mkdirSync(SAIDA, { recursive: true });

// ---------- as camadas paradas: o fundo e a moldura ----------
// O fundo é o papel do estúdio com a sombra do aparelho e a assinatura embaixo. A
// moldura é transparente fora do aparelho e na tela; a borda grossa com raio faz o
// canto arredondado da tela (o lado de dentro da curva é borda, então cobre o site).
function htmlCamada(camada) {
  const { W, H, sx, sy, sw, sh, raio, borda } = A;
  const corpo = `left:${sx - borda}px;top:${sy - borda}px;width:${sw}px;height:${sh}px;border:${borda}px solid #0d0f10;border-radius:${raio + borda}px`;
  const fundo = camada === "fundo";
  let extra = "";
  if (tipo === "iphone") {
    // o aro de metal em volta do vidro preto, a barra de status e a ilha dinâmica
    const barras = [10, 14, 18, 22].map((h, i) => `<i style="display:inline-block;width:6px;height:${h}px;margin-left:${i ? 3 : 0}px;border-radius:2px;background:#fff;vertical-align:bottom"></i>`).join("");
    extra = `<div style="position:absolute;left:${sx}px;top:${sy}px;width:${sw}px;height:${A.barra}px;background:#000;font:600 31px Inter,system-ui,sans-serif;color:#fff">
        <span style="position:absolute;left:78px;top:37px">9:41</span>
        <span style="position:absolute;right:66px;top:42px;display:flex;align-items:flex-end;gap:10px"><span style="line-height:0">${barras}</span>
          <span style="width:44px;height:22px;border:2.5px solid #ffffffaa;border-radius:7px;box-sizing:border-box;padding:2px"><span style="display:block;width:80%;height:100%;border-radius:3px;background:#fff"></span></span></span>
      </div>
      <div style="position:absolute;left:${sx - borda - 4}px;top:${sy - borda - 4}px;width:${sw + 2 * borda + 8}px;height:${sh + 2 * borda + 8}px;border-radius:${raio + borda + 4}px;box-shadow:inset 0 0 0 4px #3a3d40, inset 0 0 0 5px #1c1e20"></div>
      <div style="position:absolute;left:${sx + sw / 2 - 64}px;top:${sy + 18}px;width:128px;height:38px;border-radius:19px;background:#000"></div>`;
  } else {
    // a base do MacBook: a lâmina de alumínio mais larga que a tampa, com o rebaixo do dedo
    const by = sy + sh + borda, bw = sw + 2 * borda + 200, bx = (W - bw) / 2;
    extra = `<div style="position:absolute;left:${bx}px;top:${by}px;width:${bw}px;height:22px;border-radius:2px 2px 14px 14px;background:linear-gradient(#e4e6e8,#b9bcc0 70%,#8d9094)"></div>
      <div style="position:absolute;left:${W / 2 - 90}px;top:${by}px;width:180px;height:9px;border-radius:0 0 10px 10px;background:#a3a6aa"></div>
      <div style="position:absolute;left:${sx + sw / 2 - 70}px;top:${sy - borda}px;width:140px;height:${borda + 8}px;border-radius:0 0 10px 10px;background:#0d0f10"></div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:${fundo ? "#F2EFE6" : "transparent"}}
.sinal{position:absolute;left:0;right:0;bottom:${tipo === "iphone" ? 110 : 26}px;text-align:center;font:500 ${tipo === "iphone" ? 26 : 20}px 'JetBrains Mono',monospace;letter-spacing:.14em;color:#14181A}
.sinal i{display:inline-block;width:46px;height:2px;background:#1FA463;vertical-align:middle;margin:0 18px}</style></head><body>
${fundo
  ? `<div style="position:absolute;${corpo};box-sizing:content-box;background:#0d0f10;box-shadow:0 50px 90px -20px #14181a66, 0 18px 40px -10px #14181a40"></div>
     <div class="sinal"><i></i>rafaelrazeira.estúdio<i></i></div>`
  : `<div style="position:absolute;${corpo};box-sizing:content-box"></div>${extra}`}
</body></html>`;
}

async function camadas(browser, dir) {
  const page = await browser.newPage();
  await page.setViewport({ width: A.W, height: A.H });
  for (const c of ["fundo", "moldura"]) {
    await page.setContent(htmlCamada(c), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(dir, `${c}.png`), omitBackground: c === "moldura" });
  }
  await page.close();
}

// ---------- a gravação ----------
// O roteiro: segura o hero, desce em três fôlegos com pausa, volta ao topo e segura.
// Cada item é [até onde (em telas), quantos ms de descida, quantos ms de pausa depois].
const ROTEIRO = [[0, 0, 2200], [1, 1700, 1300], [2.1, 1800, 1300], [3.2, 1900, 1500], [0, 2000, 1200]];
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

async function gravar(browser, alvo, dir) {
  const page = await browser.newPage();
  await page.setViewport({ width: A.vw, height: A.vh, deviceScaleFactor: A.dpr, isMobile: A.mobile, hasTouch: A.mobile });
  if (A.mobile) await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1");
  // o carrossel do hero não troca durante a gravação (ver travarCarrossel no reel):
  // os temporizadores de 4 a 10s da página são ignorados desde o primeiro script
  await page.evaluateOnNewDocument(() => {
    const orig = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms, ...resto) => (ms >= 4000 && ms <= 10000 ? 0 : orig(fn, ms, ...resto));
  });
  await page.goto(alvo.url, { waitUntil: "networkidle2", timeout: 60000 });
  await page.addStyleTag({ content: '[aria-roledescription="carrossel"] * { animation-play-state: paused !important; } html { scroll-behavior: auto !important; }' });
  // passa a página inteira uma vez antes, para as imagens preguiçosas já estarem lá
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)); }
    scrollTo(0, 0);
  });
  await wait(2500);

  const maxY = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const pronta = () => page.evaluate(() => new Promise((r) => {
    document.querySelectorAll("[data-revelar]:not([data-visivel])").forEach((el) => {
      const b = el.getBoundingClientRect();
      if (b.top < innerHeight * 0.92 && b.bottom > 0) el.dataset.visivel = "true";
    });
    const t0 = performance.now();
    (function confere() {
      const faltam = [...document.images].some((i) => { const b = i.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight && b.width > 0 && !i.complete; });
      if (faltam && performance.now() - t0 < 500) return setTimeout(confere, 30);
      requestAnimationFrame(() => requestAnimationFrame(r));
    })();
  }));

  let n = 0, y = 0;
  const foto = async () => {
    await page.screenshot({ path: path.join(dir, `q${String(n++).padStart(5, "0")}.jpg`), type: "jpeg", quality: 88 });
  };
  for (const [ate, desce, pausa] of ROTEIRO) {
    const de = y, para = Math.min(Math.round(ate * A.vh), maxY);
    const passos = Math.round((desce / 1000) * FPS);
    for (let i = 1; i <= passos; i++) {
      y = Math.round(de + (para - de) * suave(i / passos));
      await page.evaluate((y) => scrollTo(0, y), y);
      await pronta();
      await foto();
    }
    y = para;
    // a pausa é fotografada também: o que anda na página (letreiro, vídeo) segue andando
    await page.evaluate((y) => scrollTo(0, y), y);
    await pronta();
    await wait(300);
    for (let i = 0; i < Math.round((pausa / 1000) * FPS); i++) {
      if (i % 6 === 0) await pronta();
      await foto();
    }
  }
  await page.close();
  return n;
}

function montar(dir, quadros, destino) {
  const tmp = path.join(dir, "saida.mp4");
  const r = spawnSync(ffmpegPath, [
    "-y", "-loglevel", "error",
    "-loop", "1", "-framerate", String(FPS), "-i", path.join(dir, "fundo.png"),
    "-framerate", String(FPS), "-i", path.join(dir, "q%05d.jpg"),
    "-loop", "1", "-framerate", String(FPS), "-i", path.join(dir, "moldura.png"),
    "-filter_complex", `[1:v]scale=${A.sw}:${A.th}:flags=lanczos[t];[0:v][t]overlay=${A.sx}:${A.ty}[a];[a][2:v]overlay=0:0,format=yuv420p[v]`,
    "-map", "[v]", "-t", (quadros / FPS).toFixed(3), "-r", String(FPS),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", tmp,
  ], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("ffmpeg: " + r.stderr);
  // o mp4 é montado na pasta temporária e só copiado no fim (ver a nota do reel)
  fs.copyFileSync(tmp, destino + ".mp4");
  const c = spawnSync(ffmpegPath, ["-y", "-loglevel", "error", "-i", destino + ".mp4", "-frames:v", "1", "-q:v", "2", destino + ".jpg"], { encoding: "utf8" });
  if (c.status !== 0) throw new Error("ffmpeg capa: " + c.stderr);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
try {
  for (const slug of slugs) {
    const alvo = { slug, ...doPortfolio(slug) };
    if (!alvo.url) { console.error(`  ${slug}: sem url no data/portfolio.ts, pulei`); continue; }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `mockup-${slug}-`));
    console.log(`${alvo.nome} (${alvo.url}) no ${tipo}`);
    await camadas(browser, dir);
    const quadros = await gravar(browser, alvo, dir);
    const destino = path.join(SAIDA, `${slug}-${tipo}`);
    montar(dir, quadros, destino);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`  ${quadros} quadros, ${(quadros / FPS).toFixed(1)}s -> ${destino}.mp4`);
  }
} finally {
  await browser.close();
}
