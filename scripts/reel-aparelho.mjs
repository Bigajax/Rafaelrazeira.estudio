// O reel de portfólio NO IPHONE (22/10/2026, M&M): a vitrine rodando dentro de um iPhone
// Pro Max, sobre uma arte de fundo gerada pelo Rafael, com a faixa fina de letreiro de
// painel na frente do pé do aparelho. Pedido dele: "algo tecnológico, disruptivo e com
// personalidade", o site rolando e um toque num tênis.
//
//   node scripts/reel-aparelho.mjs mm-calcados --peca=adidas-adizero-pro-verde-limao --fundo="C:/.../arte.png"
//
// O endereço e o nome vêm de data/portfolio.ts. Sai em ~/Desktop/reels-portfolio/
// <slug>-iphone.mp4 (mudo) e <slug>-iphone.jpg (a capa).
//
// O roteiro: o topo parado 3 s, a home desce em fôlegos até a fileira da peça, o dedo
// arrasta o trilho se ela estiver fora da tela, toca nela, corte para a página da peça, toca
// num número e para em cima do botão de pedir, sem tocar (abriria o WhatsApp).
//
// Tudo é FOTOGRAFADO passo a passo, como no reel-portfolio.mjs e no mockup-aparelho.mjs (ver
// a nota 4 Máquina/reel-portfolio): cada foto vale 1/30 s, e o vídeo e as animações da
// página desaceleram na proporção da captura, senão saem três vezes mais rápidos.
// A faixa é a rosa do reel-portfolio: a fina de letreiro de painel foi gravada e recusada
// no mesmo dia (22/10).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import ffmpegPath from "ffmpeg-static";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SAIDA = path.join(os.homedir(), "Desktop", "reels-portfolio");
const FPS = 30;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// O quadro e o aparelho. O Pro Max tem 440 x 956 pontos; a 1,5x a tela tem 660 x 1434 no
// vídeo. A barra de status (54 pt) fica fora do site, como num iPhone de verdade (a ilha
// caía em cima da faixa de aviso da loja no mockup, 19/10).
const W = 1080, H = 1920;
const VW = 440, DPR = 1.5, BARRA_PT = 54;
const SW = VW * DPR, SH = 956 * DPR, BARRA = BARRA_PT * DPR;
const VH = 956 - BARRA_PT;
const SX = (W - SW) / 2, SY = 150;
const RAIO = 84, BORDA = 16;
// a faixa: a ROSA do reel-portfolio (a fina de letreiro de painel foi testada e recusada,
// 22/10: "volta a faixa rotativa que era antes"), torta a -4°, na frente do pé do aparelho.
// Mais baixa que a do reel (240 contra 300) para caber embaixo do iPhone
const FAIXA_ALT = 240, FAIXA_LARG = 1500, FAIXA_GRAUS = -4, FAIXA_CY = 1730, FAIXA_VEL = 150;
// a entrada: o aparelho sobe de fora do quadro e a faixa entra da esquerda
const SOBE_S = 0.8, SOBE_PX = 700;

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const PECA = opt("peca");
const FUNDO = opt("fundo");
if (!slug || !FUNDO) {
  console.error('uso: node scripts/reel-aparelho.mjs <slug> --fundo="arte.png" [--peca=<slug da peça>]');
  process.exit(1);
}
if (!fs.existsSync(FUNDO)) { console.error(`fundo não encontrado: ${FUNDO}`); process.exit(1); }

const fonte = fs.readFileSync(path.join(__dir, "..", "data", "portfolio.ts"), "utf8");
const linha = fonte.split("\n").find((l) => l.includes(`slug: "${slug}"`));
const alvo = { slug, nome: linha?.match(/nome: "([^"]*)"/)?.[1], tipo: linha?.match(/tipo: "([^"]*)"/)?.[1], url: linha?.match(/url: "([^"]*)"/)?.[1] };
if (!alvo.url) { console.error(`${slug}: sem url no data/portfolio.ts`); process.exit(1); }
fs.mkdirSync(SAIDA, { recursive: true });

function ffmpeg(a) {
  const r = spawnSync(ffmpegPath, a, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) { console.error(r.stderr?.slice(-2000)); throw new Error("ffmpeg falhou"); }
}

// ---------- as camadas paradas, desenhadas pelo Chrome com as fontes do estúdio ----------
//   corpo.png     a sombra e o corpo preto do aparelho, atrás da tela
//   moldura.png   a borda com o aro de titânio, a barra de status e a ilha (o lado de
//                 dentro da curva da borda cobre os cantos do site)
//   luz.png       a faixa de luz que varre o fundo de tempos em tempos
//   assina.png    rafaelrazeira.estúdio embaixo, entre dois filetes verdes
//   tira.png      o letreiro rosa reto, com a frase repetida; o ffmpeg anda e gira
async function camadas(browser, dir) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });
  const corpo = `left:${SX - BORDA}px;top:${SY - BORDA}px;width:${SW}px;height:${SH}px;border:${BORDA}px solid #0b0c0d;border-radius:${RAIO + BORDA}px`;
  const barras = [11, 15, 19, 23].map((h, i) => `<i style="display:inline-block;width:6px;height:${h}px;margin-left:${i ? 3 : 0}px;border-radius:2px;background:#fff;vertical-align:bottom"></i>`).join("");
  const botao = (lado, top, alt) => `<div style="position:absolute;${lado}:${lado === "left" ? SX - BORDA - 9 : W - SX - SW - BORDA - 9}px;top:${top}px;width:9px;height:${alt}px;border-radius:3px;background:linear-gradient(90deg,#2a2c2f,#55595e,#2a2c2f)"></div>`;
  const html = (corpoHtml) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:transparent}</style></head><body>${corpoHtml}</body></html>`;
  const pecas = {
    corpo: `<div style="position:absolute;${corpo};box-sizing:content-box;background:#0b0c0d;box-shadow:0 70px 140px -10px #000, 0 0 160px #d4af6126"></div>`,
    moldura: `<div style="position:absolute;${corpo};box-sizing:content-box;box-shadow:0 0 0 3px #4d5156, 0 0 0 5px #1a1c1e"></div>
      ${botao("left", SY + 230, 70)}${botao("left", SY + 340, 120)}${botao("left", SY + 480, 120)}${botao("right", SY + 380, 190)}
      <div style="position:absolute;left:${SX}px;top:${SY}px;width:${SW}px;height:${BARRA}px;background:#000;font:600 26px Inter,system-ui,sans-serif;color:#fff">
        <span style="position:absolute;left:70px;top:29px">9:41</span>
        <span style="position:absolute;right:58px;top:33px;display:flex;align-items:flex-end;gap:10px"><span style="line-height:0">${barras}</span>
          <span style="width:42px;height:21px;border:2.5px solid #ffffffaa;border-radius:7px;box-sizing:border-box;padding:2px"><span style="display:block;width:80%;height:100%;border-radius:3px;background:#fff"></span></span></span>
      </div>
      <div style="position:absolute;left:${SX + SW / 2 - 94}px;top:${SY + 16}px;width:188px;height:54px;border-radius:27px;background:#000"></div>`,
    luz: `<div style="position:absolute;left:0;top:-200px;width:520px;height:${H + 400}px;transform:rotate(14deg);background:linear-gradient(90deg,transparent,#f3d99a22 35%,#fff3d044 50%,#f3d99a22 65%,transparent);filter:blur(30px)"></div>`,
    // no alto do quadro: embaixo mora a faixa rosa
    assina: `<div style="position:absolute;left:0;right:0;top:${Math.round(SY - BORDA - 76)}px;display:flex;justify-content:center;align-items:center;gap:16px;color:#F2EFE6;font:500 24px/1 'JetBrains Mono',monospace;letter-spacing:.04em;text-shadow:0 2px 14px #000">
      <i style="width:60px;height:2px;background:#1FBF7A"></i>rafaelrazeira.estúdio<i style="width:60px;height:2px;background:#1FBF7A"></i></div>`,
  };
  for (const [nome, h] of Object.entries(pecas)) {
    await page.setContent(html(h), { waitUntil: "load" });
    await page.evaluate(async () => { await document.fonts.load("600 26px Inter", "9:41"); await document.fonts.load('500 24px "JetBrains Mono"', "rafaelrazeira.estúdio"); await document.fonts.ready; });
    if (nome === "luz") await page.setViewport({ width: 700, height: H });
    await page.screenshot({ path: path.join(dir, `${nome}.png`), omitBackground: true });
    if (nome === "luz") await page.setViewport({ width: W, height: H });
  }
  await page.close();

  // O letreiro rosa, o mesmo do reel-portfolio: Archivo 900 condensada cor papel, separador
  // em bolinha grafite, `PORTFÓLIO • <TIPO> • <nome>` com o nome na grafia da loja. A frase
  // entra por textContent (nome com & não quebra o HTML), e a fonte é carregada ANTES de
  // medir: senão a tira sai em Times (02/10). Aba própria: um segundo setContent na mesma
  // aba já travou em 30 s (nota do reel).
  const f = await browser.newPage();
  const letra = Math.round(FAIXA_ALT * 0.633);
  await f.setViewport({ width: 400, height: FAIXA_ALT });
  await f.setContent(`<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,900&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;background:#E31B62;height:${FAIXA_ALT}px;overflow:hidden}
  .tira{display:flex;white-space:nowrap;height:${FAIXA_ALT}px;align-items:center;width:max-content}
  .item{display:flex;align-items:center;font:900 ${letra}px/1 Archivo;font-stretch:62%;letter-spacing:-.015em;color:#F2EFE6;padding-top:${Math.round(letra * 0.074)}px}
  .item::after{content:"";width:${Math.round(letra * 0.158)}px;height:${Math.round(letra * 0.158)}px;border-radius:50%;background:#14181A;margin:0 ${Math.round(letra * 0.24)}px ${Math.round(letra * 0.063)}px}
</style></head><body><div class="tira"></div></body></html>`, { waitUntil: "load" });
  const p = await f.evaluate(async (frases, precisa, letra) => {
    await document.fonts.load(`900 ${letra}px "Archivo"`, frases.join(" "));
    const tira = document.querySelector(".tira");
    const grupo = () => frases.forEach((t) => { const e = document.createElement("span"); e.className = "item"; e.textContent = t; tira.appendChild(e); });
    grupo();
    const P = tira.getBoundingClientRect().width;
    while (tira.getBoundingClientRect().width < P + precisa) grupo();
    await document.fonts.ready;
    // a largura da palavra PORTFÓLIO, sem a bolinha, para a capa sair com ela inteira
    const r = document.createRange(); r.selectNodeContents(tira.firstChild);
    return { P: Math.round(P), L: Math.ceil(tira.getBoundingClientRect().width), palavra: r.getBoundingClientRect().width };
  }, ["PORTFÓLIO", (alvo.tipo || "Vitrine digital").toUpperCase(), alvo.nome || slug], FAIXA_LARG + 40, letra);
  await f.setViewport({ width: p.L, height: FAIXA_ALT });
  await f.screenshot({ path: path.join(dir, "tira.png") });
  await f.close();
  return p;
}

// ---------- a gravação ----------
async function gravar(browser, dir) {
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
  // o carrossel e o convite não disparam durante a gravação: os temporizadores de 4 a 10 s
  // da página são ignorados desde o primeiro script (ver travarCarrossel no reel)
  await page.evaluateOnNewDocument(() => {
    const orig = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms, ...resto) => (ms >= 4000 && ms <= 10000 ? 0 : orig(fn, ms, ...resto));
  });
  const client = await page.createCDPSession();
  await client.send("Animation.enable").catch(() => {});

  // o que é da loja e vira ruído no reel: o WhatsApp flutuante e o convite (o reel é peça
  // do estúdio, e o convite cobriria a tela no meio da descida)
  const limpar = () => page.addStyleTag({ content: '.convite{display:none!important} [aria-roledescription="carrossel"] *{animation-play-state:paused!important} html{scroll-behavior:auto!important} .faixa-scroll{scroll-snap-type:none!important}' })
    .then(() => page.evaluate(() => {
      for (const a of document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]')) {
        let el = a;
        while (el && el !== document.body) {
          const r = el.getBoundingClientRect();
          if (getComputedStyle(el).position === "fixed" && r.width < 200 && r.height < 200) { el.style.display = "none"; break; }
          el = el.parentElement;
        }
      }
    }));
  // passa a página inteira uma vez, para as imagens preguiçosas já estarem lá, e espera os
  // vídeos do topo terem quadro (vídeo sem quadro sai painel preto, Xavier's 02/10)
  const preparar = async () => {
    await limpar();
    await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = "eager"; }));
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
      scrollTo(0, 0);
    });
    await page.evaluate(() => new Promise((res) => {
      const t0 = performance.now();
      (function confere() {
        const vids = [...document.querySelectorAll("video")].filter((v) => v.getBoundingClientRect().top < innerHeight);
        vids.forEach((v) => { if (v.paused) v.play?.().catch(() => {}); });
        if (vids.every((v) => v.readyState >= 3) || performance.now() - t0 > 12000) res();
        else setTimeout(confere, 250);
      })();
    }));
    await wait(1500);
  };
  await page.goto(alvo.url, { waitUntil: "networkidle2", timeout: 90000 });
  await preparar();

  const pronta = () => page.evaluate(() => new Promise((r) => {
    // a entrada ao rolar do molde (data-revelar): o IntersectionObserver não dispara a
    // tempo fotografando, e seções saíam em branco (Full Time, 02/10)
    document.querySelectorAll("[data-revelar]:not([data-visivel])").forEach((el) => {
      const b = el.getBoundingClientRect();
      if (b.top < innerHeight * 0.92 && b.bottom > 0) el.dataset.visivel = "true";
    });
    const t0 = performance.now();
    (function confere() {
      const faltam = [...document.images].some((i) => { const b = i.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth && b.width > 0 && !i.complete; });
      if (faltam && performance.now() - t0 < 600) return setTimeout(confere, 30);
      requestAnimationFrame(() => requestAnimationFrame(r));
    })();
  }));

  let n = 0, ritmo = 1, tPasso = Date.now();
  const marcas = {};
  // uma foto = 1/30 s. O ritmo real da captura desacelera vídeo e animações da página
  const foto = async () => {
    await pronta();
    await page.screenshot({ path: path.join(dir, `q${String(n++).padStart(5, "0")}.jpg`), type: "jpeg", quality: 90 });
    const real = Date.now() - tPasso; tPasso = Date.now();
    const alvoRitmo = Math.min(1, Math.max(0.1, (1000 / FPS) / Math.max(1, real)));
    if (Math.abs(alvoRitmo - ritmo) > 0.05) {
      ritmo = alvoRitmo;
      await client.send("Animation.setPlaybackRate", { playbackRate: ritmo }).catch(() => {});
      await page.evaluate((r) => document.querySelectorAll("video").forEach((v) => { v.playbackRate = r; }), ritmo);
    }
  };
  const segurar = async (ms) => { for (let i = 0; i < Math.round((ms / 1000) * FPS); i++) await foto(); };
  const rolar = async (ate, ms) => {
    const de = await page.evaluate(() => scrollY);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const para = Math.max(0, Math.min(max, ate));
    const passos = Math.max(2, Math.round((ms / 1000) * FPS));
    for (let i = 1; i <= passos; i++) {
      await page.evaluate((y) => scrollTo(0, y), Math.round(de + (para - de) * suave(i / passos)));
      await foto();
    }
  };

  // O DEDO: um círculo claro desenhado na página e fotografado. No celular o dedo não
  // passeia pela tela como o mouse: ele aparece no ponto, aperta e some com uma onda
  const dedo = (x, y, op, esc, onda) => page.evaluate((x, y, op, esc, onda) => {
    let d = document.getElementById("__dedo"), o = document.getElementById("__onda");
    if (!d) {
      d = document.createElement("div"); d.id = "__dedo";
      o = document.createElement("div"); o.id = "__onda";
      const base = { position: "fixed", left: "0", top: "0", borderRadius: "50%", pointerEvents: "none", zIndex: "2147483647", transition: "none" };
      Object.assign(d.style, base, { width: "54px", height: "54px", background: "rgba(255,255,255,.38)", border: "2px solid #fff", boxShadow: "0 0 0 1.5px rgba(0,0,0,.5), 0 6px 20px rgba(0,0,0,.45)" });
      Object.assign(o.style, base, { width: "54px", height: "54px", border: "2px solid #fff", boxSizing: "border-box" });
      document.body.append(o, d);
    }
    d.style.opacity = op; d.style.transform = `translate(${x - 27}px, ${y - 27}px) scale(${esc})`;
    o.style.opacity = onda == null ? 0 : (1 - onda) * 0.8; o.style.transform = `translate(${x - 27}px, ${y - 27}px) scale(${onda == null ? 1 : 1 + onda * 1.6})`;
  }, x, y, op, esc, onda);
  // aparece, aperta e toca; sem `real`, o dedo só fica no ponto (o botão de pedir).
  // O toque é um clique no DOM no link ou botão daquele ponto, não um toque de tela: a foto
  // do cartão é uma galeria com setas, e o toque de tela nela não abria a peça (M&M, 22/10)
  const tocar = async (x, y, { real = true, link = null } = {}) => {
    for (let i = 1; i <= 6; i++) { await dedo(x, y, i / 6, 1.25 - 0.25 * (i / 6), null); await foto(); }
    await segurar(150);
    if (!real) return;
    for (let i = 1; i <= 5; i++) { await dedo(x, y, 1, 1 - 0.18 * Math.sin((Math.PI / 2) * (i / 5)), i / 10); await foto(); }
    await page.evaluate((x, y, link) => {
      const el = link ? document.querySelector(`a[href="${link}"]`) : document.elementFromPoint(x, y)?.closest("a, button");
      el?.click();
    }, x, y, link);
  };
  const soltar = async (x, y) => {
    for (let i = 1; i <= 8; i++) { await dedo(x, y, 1 - i / 8, 0.82 + 0.18 * (i / 8), 0.5 + i / 16); await foto(); }
    await dedo(x, y, 0, 1, null);
  };
  // a troca de página é um CORTE: a gravação pausa até a página nova estar pronta (sem a
  // foto borrada do next/image, Japa 02/10), e a página nova abre no topo
  const trocarPagina = async (antes) => {
    await page.waitForFunction((a) => location.pathname !== a, { timeout: 10000 }, antes).catch(() => {});
    await page.waitForNetworkIdle({ idleTime: 400, timeout: 8000 }).catch(() => {});
    await page.evaluate(() => scrollTo(0, 0));
    // a troca do Next é sem recarregar: o dedo do toque na peça ficava parado em cima da
    // página nova, sobre a galeria (22/10)
    await dedo(0, 0, 0, 1, null);
    await limpar();
    await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = "eager"; }));
    await page.waitForFunction(() => [...document.images].every((i) => { const b = i.getBoundingClientRect(); return !(b.bottom > 0 && b.top < innerHeight && b.width > 0) || i.complete; }), { timeout: 6000 }).catch(() => {});
    await wait(800);
    marcas.corte = n;
  };

  // 1. o topo parado: é o melhor quadro da loja (os vídeos do Marcelo andando)
  await segurar(3200);
  marcas.capa = Math.round(2 * FPS);

  // 2. a home desce em fôlegos até a fileira da peça
  const ondeEsta = () => page.evaluate((s) => {
    const links = [...document.querySelectorAll(`a[href="/produto/${s}"]`)].filter((a) => !a.closest("header, footer"));
    if (!links.length) return null;
    // o cartão: o ancestral do nome que tem a foto
    let card = links[0];
    while (card.parentElement && !(card.querySelector("img") && card.getBoundingClientRect().height > 250)) card = card.parentElement;
    const img = card.querySelector("img");
    const r = (img || card).getBoundingClientRect();
    let sc = card.parentElement;
    while (sc && !(sc.scrollWidth > sc.clientWidth + 5 && /auto|scroll/.test(getComputedStyle(sc).overflowX))) sc = sc.parentElement;
    if (sc) sc.dataset.reelTrilho = "1";
    const t = sc?.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top + scrollY, h: r.height, trilho: sc ? { y: t.top + t.height * 0.35, left: sc.scrollLeft } : null };
  }, PECA);
  let peca = PECA ? await ondeEsta() : null;
  if (PECA && !peca) console.warn(`  aviso: ${PECA} não está na home; o reel fica só na descida`);
  const destino = peca ? peca.top - VH * 0.22 : VH * 3;
  // fôlegos com pausa curta: um cliente olhando, não um elevador. Peça perto do topo (até
  // duas telas) desce em dois; longe, em três. O Rafael preferiu a peça perto: a do fim da
  // home, num trilho arrastado de lado, ficou "muito longe" (22/10)
  const folegos = destino < VH * 2 ? [[0.55, 1500, 600], [1, 1500, 500]] : [[0.24, 1700, 700], [0.6, 2000, 600], [1, 2200, 600]];
  for (const [fracao, ms, pausa] of folegos) {
    await rolar(destino * fracao, ms);
    await segurar(pausa);
  }

  if (peca) {
    peca = await ondeEsta();
    // 3. fora da tela pelo lado: o dedo arrasta o trilho até a peça ficar no meio
    if (peca.trilho && (peca.x < 40 || peca.x > VW - 40)) {
      const delta = peca.x - VW / 2;
      const y = peca.trilho.y;
      const x0 = VW * 0.82, x1 = VW * 0.82 - Math.min(Math.abs(delta) * 0.5, VW * 0.6);
      for (let i = 1; i <= 5; i++) { await dedo(x0, y, i / 5, 1.2 - 0.2 * (i / 5), null); await foto(); }
      const passos = Math.round(1.3 * FPS);
      for (let i = 1; i <= passos; i++) {
        const t = suave(i / passos);
        await page.evaluate((l) => { document.querySelector('[data-reel-trilho="1"]').scrollLeft = l; }, peca.trilho.left + delta * t);
        await dedo(x0 + (x1 - x0) * t, y, 1, 1, null);
        await foto();
      }
      for (let i = 1; i <= 6; i++) { await dedo(x1, y, 1 - i / 6, 1, null); await foto(); }
      await segurar(500);
      peca = await ondeEsta();
    }
    // 4. o toque na peça e o corte para a página dela
    const antes = await page.evaluate(() => location.pathname);
    await tocar(peca.x, peca.y, { link: `/produto/${PECA}` });
    await trocarPagina(antes);
    console.log(`  peça: ${await page.evaluate(() => location.pathname)}`);
    await segurar(1500);

    // 5. a página da peça: desce até os números, toca num do meio, e o dedo para no pedir
    const medir = () => page.evaluate(() => {
      const visivel = (b) => { const r = b.getBoundingClientRect(); return r.width > 20 && r.height > 20; };
      const marcado = (b) => b.getAttribute("aria-pressed") === "true" || b.getAttribute("aria-checked") === "true";
      const nums = [...document.querySelectorAll("button")].filter(visivel).filter((b) => !b.disabled && /^\d{2}(,5)?$/.test(b.textContent.trim()));
      const livres = nums.length >= 2 ? nums.filter((b) => !marcado(b)) : [];
      const num = livres[Math.floor(livres.length / 2)];
      // o MAIOR botão de pedido, de 36 a 90 px, que não leve a outra peça (nota do reel)
      const area = (b) => { const r = b.getBoundingClientRect(); return r.width * r.height; };
      const pedir = [...document.querySelectorAll("a, button")].filter(visivel).filter((b) => !b.closest("header, footer") &&
        b.getBoundingClientRect().height >= 36 && b.getBoundingClientRect().height <= 90 && getComputedStyle(b).position !== "fixed" &&
        !(b.getAttribute("href") || "").includes("/produto/") &&
        (/whats|pedir|separar|garantir/i.test(b.textContent) || /wa\.me/i.test(b.getAttribute("href") || ""))).sort((a, b) => area(b) - area(a))[0];
      const c = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top + scrollY, w: r.width }; };
      return { num: c(num), pedir: c(pedir), txt: num?.textContent.trim() };
    });
    let m = await medir();
    if (m.num || m.pedir) {
      // a descida para os números E o botão de pedir caberem juntos na tela
      const fundoAlvo = (m.pedir || m.num).top;
      await rolar(Math.min((m.num || m.pedir).top - VH * 0.3, fundoAlvo - VH * 0.72), 1800);
      await segurar(500);
      m = await medir();
    }
    if (m.num) {
      await tocar(m.num.x, m.num.y);
      await soltar(m.num.x, m.num.y);
      console.log(`  número: ${m.txt}`);
      await segurar(700);
      m = await medir();
    }
    if (m.pedir) {
      // à direita do texto: no meio, o dedo cobria o "Pedir no 41" (22/10)
      await tocar(m.pedir.x + Math.min(110, m.pedir.w * 0.32), m.pedir.y, { real: false });
      console.log("  parou no botão de pedir");
      await segurar(1800);
    }
  }
  await segurar(400);
  await page.close();
  return { quadros: n, ...marcas };
}

function montar(dir, periodo, { quadros, capa }, destino) {
  const T = quadros / FPS;
  const tmp = path.join(dir, "saida.mp4");
  // o fundo vivo: a arte gerada pelo Rafael com um zoom bem lento (escala por quadro, sem o
  // tremor do zoompan) e uma faixa de luz varrendo a cada ~6 s
  const fundo = `[0:v]scale=w='trunc(${W}*(1.02+0.08*t/${T.toFixed(2)})/2)*2':h=-2:eval=frame:flags=lanczos,crop=${W}:${H},setsar=1,format=rgba[f0]`;
  const luz = `[f0][1:v]overlay=x='mod(t*420\\,2600)-900':y=0[bg]`;
  // o aparelho sobe de fora do quadro, freando no fim (ease out)
  const dy = `if(lt(t\\,${SOBE_S})\\,${SOBE_PX}*pow(1-t/${SOBE_S}\\,3)\\,0)`;
  const tela = `[3:v]scale=${SW}:${SH - BARRA}:flags=lanczos[s]`;
  const aparelho = `[bg][2:v]overlay=x=0:y='${dy}'[a];[a][s]overlay=x=${SX}:y='${SY + BARRA}+${dy}'[b];[b][4:v]overlay=x=0:y='${dy}'[c]`;
  // a faixa: anda pela tira (crop no período) e só depois gira; o "rotate" não aceita
  // rotw(a), só o ângulo por extenso (nota do reel). Entra da esquerda entre 0,2 e 1,1 s
  const ang = `${FAIXA_GRAUS}*PI/180`;
  const rad = (FAIXA_GRAUS * Math.PI) / 180;
  const oh = Math.ceil(FAIXA_LARG * Math.abs(Math.sin(rad)) + FAIXA_ALT * Math.cos(rad));
  const fy = Math.round(FAIXA_CY - oh / 2);
  const FX = -210;
  const fx = `${FX}-1800*pow(1-clip((t-0.2)/0.9\\,0\\,1)\\,3)`;
  // o início do letreiro: no segundo da capa o PORTFÓLIO está inteiro no meio da tela (sem
  // isso a capa saiu com "LIO • VITRINE DIGIT", 22/10, a mesma cilada do reel em 02/10).
  // O meio da tela cai no ponto (W/2 - FX) da janela da tira
  const P = periodo.P;
  const x0 = (((periodo.palavra / 2 - (W / 2 - FX) - (capa / FPS) * FAIXA_VEL) % P) + P) % P;
  const tira = (i, nome) => `[${i}:v]crop=${FAIXA_LARG}:${FAIXA_ALT}:x='mod(${x0.toFixed(1)}+t*${FAIXA_VEL}\\,${P})':y=0,format=rgba,rotate=${ang}:ow='rotw(${ang})':oh='roth(${ang})':c=none[${nome}]`;
  const faixa = `[c][fx]overlay=x='${fx}':y=${fy}[e];[e][6:v]overlay=0:0,format=yuv420p[v]`;
  ffmpeg([
    "-y", "-loglevel", "error",
    "-loop", "1", "-framerate", String(FPS), "-i", FUNDO,
    "-loop", "1", "-framerate", String(FPS), "-i", path.join(dir, "luz.png"),
    "-loop", "1", "-framerate", String(FPS), "-i", path.join(dir, "corpo.png"),
    "-framerate", String(FPS), "-i", path.join(dir, "q%05d.jpg"),
    "-loop", "1", "-framerate", String(FPS), "-i", path.join(dir, "moldura.png"),
    "-loop", "1", "-framerate", String(FPS), "-i", path.join(dir, "tira.png"),
    "-loop", "1", "-framerate", String(FPS), "-i", path.join(dir, "assina.png"),
    "-filter_complex", [fundo, luz, tela, aparelho, tira(5, "fx"), faixa].join(";"),
    // o corte é pelo -t com a duração dos quadros, nunca pelo shortest com -loop 1 (o mp4
    // cresceu sem parar até 19 MB, 02/10)
    "-map", "[v]", "-t", T.toFixed(3), "-r", String(FPS),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-movflags", "+faststart", tmp,
  ]);
  // o mp4 é montado na pasta temporária e só copiado no fim (nota do reel)
  if (fs.existsSync(destino + ".mp4")) fs.copyFileSync(destino + ".mp4", `${destino}-anterior.mp4`);
  fs.copyFileSync(tmp, destino + ".mp4");
  ffmpeg(["-y", "-loglevel", "error", "-ss", (capa / FPS).toFixed(2), "-i", destino + ".mp4", "-frames:v", "1", "-q:v", "2", destino + ".jpg"]);
  return T;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
try {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `reel-aparelho-${slug}-`));
  console.log(`${alvo.nome} (${alvo.url}) no iPhone${PECA ? `, tocando em ${PECA}` : ""}`);
  const periodo = await camadas(browser, dir);
  const g = await gravar(browser, dir);
  const destino = path.join(SAIDA, `${slug}-iphone`);
  const T = montar(dir, periodo, g, destino);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`  ${g.quadros} quadros, ${T.toFixed(1)} s -> ${destino}.mp4`);
} finally {
  await browser.close();
}
