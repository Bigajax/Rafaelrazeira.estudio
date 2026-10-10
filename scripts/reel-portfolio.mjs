// Gera o reel de portfólio de um projeto, no formato do @guigrigoletto_ (02/10/2026):
// a tela do site flutua no centro de um vídeo vertical 1080×1920, e o FUNDO É O PRÓPRIO
// VÍDEO DO SITE, ampliado e desfocado, mudando junto com ele. Atrás do cartão, a
// a faixa rosa torta entra e fica rodando o reel inteiro, como o letreiro da vitrine
// (PORTFÓLIO • tipo • nome da loja); embaixo, a assinatura do estúdio.
//
//   node scripts/reel-portfolio.mjs xaviers-sports
//   node scripts/reel-portfolio.mjs xaviers-sports verit-lab pr-gold
//   node scripts/reel-portfolio.mjs fulltime=https://fulltime-nu.vercel.app "--nome=Full Time Skateboards"
//   ... --abertura    o reel começa com a tela de carregamento da loja (a roda da Full Time)
//   ... --slide=2     o hero abre e fica parado nesse slide do carrossel
//   ... --so-home     só a home rolando (sem o passeio: categoria, peça, tamanho, pedir)
//   node scripts/reel-portfolio.mjs xaviers-sports --fundo=arte.png   (arte parada no lugar do fundo vivo)
//
// O endereço vem de data/portfolio.ts. Sai em ~/Desktop/reels-portfolio/<slug>.mp4,
// mudo: o áudio entra no próprio Instagram, na hora de postar.
//
// O cartão e a faixa ficam dentro do corte 3:4 do meio (y 240 a 1680), que é o que a
// grade do perfil mostra. Mexeu na posição, confira a capa na grade antes de postar.

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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// a tela gravada (16:10) e onde ela pousa no quadro. O cartão quase encosta nas
// bordas (40px), como no Guilherme: com 60px de margem ele lia como miniatura.
const VW = 1440, VH = 900;
const W = 1080, H = 1920;
const CW = 1000, CH = 625, CX = (W - CW) / 2, CY = 760;
// a faixa: mais larga que o quadro (SOBRA de cada lado), para a ponta cortada nunca
// aparecer quando ela desliza na entrada; torta a -4°, com o centro 140px acima do cartão
const SOBRA = 200;
const FAIXA_ALT = 300, FAIXA_Y = CY - 140, FAIXA_GRAUS = -4;
const LETREIRO_VEL = 150; // px por segundo, devagar o bastante para ler o nome da loja
const RAIO = 12;

// ---------- quem gravar ----------
const fonte = fs.readFileSync(path.join(__dir, "..", "data", "portfolio.ts"), "utf8");
function doPortfolio(slug) {
  const linha = fonte.split("\n").find((l) => l.includes(`slug: "${slug}"`));
  if (!linha) return {};
  const campo = (k) => linha.match(new RegExp(`${k}: "([^"]*)"`))?.[1];
  return { nome: campo("nome"), url: campo("url"), tipo: campo("tipo") };
}

// loja fora do data/portfolio.ts (uma prévia, por exemplo) passa o nome do letreiro à mão
let fundoArte = null, nome = null, tipo = null, abertura = false, slide = null, soHome = false;
const alvos = [];
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--fundo=")) { fundoArte = path.resolve(arg.slice(8)); continue; }
  if (arg.startsWith("--nome=")) { nome = arg.slice(7); continue; }
  if (arg.startsWith("--tipo=")) { tipo = arg.slice(7); continue; }
  if (arg === "--abertura") { abertura = true; continue; }
  if (arg === "--so-home") { soHome = true; continue; }
  if (arg.startsWith("--slide=")) { slide = Number(arg.slice(8)); continue; }
  const [slug, ...resto] = arg.split("=");
  alvos.push({ slug, ...doPortfolio(slug), ...(resto.length ? { url: resto.join("=") } : {}) });
}
if (!alvos.length) {
  console.error("uso: node scripts/reel-portfolio.mjs <slug> [slug=url] [--nome=...] [--tipo=...] [--fundo=arte.png]");
  process.exit(1);
}
if (alvos.length === 1) {
  if (fundoArte) alvos[0].fundo = fundoArte;
  if (nome) alvos[0].nome = nome;
  if (tipo) alvos[0].tipo = tipo;
  alvos[0].abertura = abertura;
  alvos[0].soHome = soHome;
  if (slide) alvos[0].slide = slide;
}

// ---------- helpers ----------
function ffmpeg(args, cwd) {
  const r = spawnSync(ffmpegPath, args, { cwd, encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) { console.error(r.stderr?.slice(-2000)); throw new Error("ffmpeg falhou"); }
}

async function fecharAvisos(page) {
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find((x) => /^(aceitar|accept|concordo|ok|entendi)$/i.test(x.textContent.trim()));
    b?.click();
  });
}

// o botão flutuante do WhatsApp é da loja, não do design: no reel ele vira ruído num
// canto do cartão (qualquer coisa fixa e pequena que leve ao WhatsApp, em vez de um
// seletor por loja)
async function esconderFlutuantes(page) {
  await page.evaluate(() => {
    for (const a of document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]')) {
      let el = a;
      while (el && el !== document.body) {
        const r = el.getBoundingClientRect();
        if (getComputedStyle(el).position === "fixed" && r.width < 200 && r.height < 200) { el.style.display = "none"; break; }
        el = el.parentElement;
      }
    }
  });
}

// O carrossel do molde troca de slide sozinho com um setTimeout de 6,5s. Durante a
// gravação ele não pode trocar: as fotos da descida levam ~100ms cada, a volta ao topo
// passa de 6,5s em tempo real, e o reel terminava em outro slide (Full Time, 02/10).
// Mouse em cima e foco não seguraram (o mouse sai quando a página desce; a aba sem
// janela não recebe foco). Então os temporizadores de 4 a 10s da página são ignorados a
// partir daqui; chamar ANTES de levar ao slide, para o próximo agendamento já cair nisso
async function travarCarrossel(page) {
  await page.evaluate(() => {
    if (window.__carrosselTravado) return;
    window.__carrosselTravado = true;
    const orig = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms, ...resto) => (ms >= 4000 && ms <= 10000 ? 0 : orig(fn, ms, ...resto));
    // e o carrossel que troca pelo FIM DE UMA ANIMAÇÃO CSS (a Japa: a barrinha que enche
    // em 6s) fica com as animações de dentro pausadas
    const st = document.createElement("style");
    st.textContent = '[aria-roledescription="carrossel"] * { animation-play-state: paused !important; }';
    document.head.appendChild(st);
  });
}

// leva o carrossel do hero ao slide n pelos botões "Ir para o slide n" (o padrão das
// vitrines do molde; na Japa eles se chamam "Ir para o banner n"). O clique é pelo DOM, não pelo mouse: durante a abertura a tela
// de carregamento está por cima, e um clique de mouse nela pula o carregamento. Repete
// até o React hidratar e o slide virar o ativo, por até 10s
async function irAoSlide(page, n) {
  const ok = await page.evaluate((n) => new Promise((res) => {
    const t0 = performance.now();
    (function tenta() {
      const ativo = document.querySelector('[aria-roledescription="slide"][data-ativo="true"]');
      if (ativo?.getAttribute("aria-label")?.startsWith(n + " de")) return res(true);
      [...document.querySelectorAll("button[aria-label]")].find((b) => new RegExp("^Ir para o (slide|banner) " + n + "$").test(b.getAttribute("aria-label")))?.click();
      if (performance.now() - t0 > 10000) return res(false);
      setTimeout(tenta, 200);
    })();
  }), n);
  if (!ok) console.warn(`  aviso: não achei o slide ${n} do carrossel; segue no que estiver`);
}

// o mouse em cima do carrossel faz ele parar (onMouseEnter do molde): sem isso ele
// troca de slide sozinho a cada 6,5s e sai dos skates no meio do hero
// O mouse tem que ENTRAR no carrossel depois que nada mais o cobre: na abertura o hover
// caía na tela de carregamento, o mouseenter nunca disparava e o carrossel trocava de
// slide no meio do hero (Full Time, 02/10). Por isso sai para o canto e volta
// E o carrossel certo é o dos botões "Ir para o slide": a Full Time tem dois, e o
// primeiro da página é a barra de avisos do topo, de 42px
async function pararCarrossel(page) {
  const h = await page.evaluateHandle(() =>
    document.querySelector('button[aria-label^="Ir para o slide"], button[aria-label^="Ir para o banner"]')?.closest('[aria-roledescription="carrossel"]') ?? null);
  const c = h.asElement();
  if (!c) return;
  await page.mouse.move(2, 2);
  await wait(150);
  await c.hover().catch(() => {});
}

// As camadas, desenhadas pelo próprio Chrome para usar as fontes do estúdio:
//   tira.png     o letreiro rosa reto, com a frase repetida; o ffmpeg faz ele andar e
//                gira. Fica ATRÁS do cartão (o site cobre a borda de baixo). Escolhido
//                pelo Rafael em 02/10, entre três escritas e depois entre quatro
//                direções: é o mesmo gesto da faixa rotativa da vitrine
//   resto.png    a sombra do cartão e a assinatura rafaelrazeira.estúdio
//   mascara.png  os cantos arredondados do cartão
// Sem nome nem endereço da loja (pedido do Rafael, 02/10): o reel é do estúdio, e a
// loja vai na legenda do post.
async function desenharCamadas(browser, alvo, dir) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,900&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;background:transparent;width:${W}px;height:${H}px;overflow:hidden}
  .sombra{position:absolute;left:${CX}px;top:${CY}px;width:${CW}px;height:${CH}px;border-radius:${RAIO}px;
    box-shadow:0 50px 120px rgba(0,0,0,.6),0 12px 30px rgba(0,0,0,.4);background:#000}
  .assina{position:absolute;left:0;right:0;top:${CY + CH + 70}px;display:flex;justify-content:center;
    align-items:center;gap:14px;color:#F2EFE6;font:500 24px/1 'JetBrains Mono',monospace;letter-spacing:.04em;
    text-shadow:0 2px 14px rgba(0,0,0,.45)}
  .assina i{width:28px;height:3px;background:#1FBF7A}
</style></head><body>
  <div class="sombra"></div>
  <div class="assina"><i></i>rafaelrazeira.estúdio<i></i></div>
</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(dir, "resto.png"), omitBackground: true });

  // O letreiro: uma tira reta, rosa, com a frase repetida. O ffmpeg anda por ela
  // (crop com x = tempo × velocidade, em volta do período P), e só depois gira a -4°.
  // Escolhido pelo Rafael em 02/10: a faixa parada lia como template.
  // Aba própria: um segundo setContent com networkidle0 na mesma aba trava em 30s.
  const faixa = await browser.newPage();
  const larguraVisivel = W + 2 * SOBRA;
  await faixa.setViewport({ width: 400, height: FAIXA_ALT, deviceScaleFactor: 1 });
  await faixa.setContent(`<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,900&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;background:#E31B62;height:${FAIXA_ALT}px;overflow:hidden}
  .tira{display:flex;white-space:nowrap;height:${FAIXA_ALT}px;align-items:center;width:max-content}
  .item{display:flex;align-items:center;font:900 190px/1 Archivo;font-stretch:62%;letter-spacing:-.015em;
    color:#F2EFE6;padding-top:14px}
  /* separador grafite, a mesma tinta do site: no rosa, papel some e verde briga */
  .item::after{content:"";width:30px;height:30px;border-radius:50%;background:#14181A;margin:0 46px 12px}
</style></head><body><div class="tira"></div></body></html>`, { waitUntil: "networkidle0" });
  await faixa.evaluate(() => document.fonts.ready);
  // a frase entra por textContent: nome de loja com aspas ou & não quebra o HTML.
  // PORTFÓLIO e o tipo em caixa alta; o nome da loja na grafia dela (vérít.lab é minúsculo)
  // a fonte só baixa quando algum texto a usa: sem o load explícito, a tira sai em
  // Times (02/10), porque as palavras entram depois do fonts.ready
  const periodo = await faixa.evaluate(async (frases, precisa) => {
    await document.fonts.load('900 190px "Archivo"', frases.join(" "));
    const tira = document.querySelector(".tira");
    const grupo = () => frases.forEach((f) => { const e = document.createElement("span"); e.className = "item"; e.textContent = f; tira.appendChild(e); });
    grupo();
    const P = tira.getBoundingClientRect().width;
    while (tira.getBoundingClientRect().width < P + precisa) grupo();
    await document.fonts.ready;
    // a largura da palavra PORTFÓLIO, sem o separador, para centralizar a capa
    const r = document.createRange(); r.selectNodeContents(tira.firstChild);
    return { P: Math.ceil(P), palavra: r.getBoundingClientRect().width };
  }, ["PORTFÓLIO", (alvo.tipo || "Vitrine digital").toUpperCase(), alvo.nome || alvo.slug], larguraVisivel);
  const larguraTira = await faixa.evaluate(() => Math.ceil(document.querySelector(".tira").getBoundingClientRect().width));
  await faixa.setViewport({ width: larguraTira, height: FAIXA_ALT, deviceScaleFactor: 1 });
  await faixa.screenshot({ path: path.join(dir, "tira.png") });
  await faixa.close();

  await page.setViewport({ width: CW, height: CH, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:#000"><div style="width:${CW}px;height:${CH}px;border-radius:${RAIO}px;background:#fff"></div></body></html>`);
  await page.screenshot({ path: path.join(dir, "mascara.png") });
  await page.close();
  return periodo;
}

// o segundo da capa: a faixa já assentou e, pelo início calculado do letreiro, o
// PORTFÓLIO está inteiro no meio da tela (sem isso a capa saía com "ÓLIO • VITRINE DI")
const CAPA_S = 2;

// ---------- um reel ----------
async function gravar(browser, alvo) {
  if (!alvo.url) throw new Error(`${alvo.slug}: sem endereço (nem em data/portfolio.ts, nem slug=url)`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `reel-${alvo.slug}-`));
  const quadros = path.join(dir, "q");
  fs.mkdirSync(quadros);
  console.log(`→ ${alvo.nome || alvo.slug}: ${alvo.url}`);

  const periodo = await desenharCamadas(browser, alvo, dir);

  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await page.goto(alvo.url, { waitUntil: "networkidle2", timeout: 90000 });
  await wait(3500);
  await fecharAvisos(page);

  // passa pela página inteira antes de gravar: imagem lazy que entra durante a
  // gravação aparece como bloco vazio no vídeo
  const altura = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < altura; y += VH * 0.8) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await wait(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(1800);
  // vídeo de hero que ainda não carregou sai como painel preto no começo do reel
  // (Xavier's, 02/10): espera cada vídeo visível ter quadro para mostrar, até 12s
  await page.evaluate(() => new Promise((res) => {
    const t0 = performance.now();
    (function confere() {
      const vids = [...document.querySelectorAll("video")].filter((v) => v.getBoundingClientRect().top < innerHeight);
      vids.forEach((v) => { if (v.paused) v.play?.().catch(() => {}); });
      if (vids.every((v) => v.readyState >= 3) || performance.now() - t0 > 12000) res();
      else setTimeout(confere, 250);
    })();
  }));
  await esconderFlutuantes(page);
  // carrossel no hero: trava no slide pedido (ou no 1), senão ele troca fora da tela
  // durante a gravação e o reel termina noutro slide. Vai a outro e volta, para o
  // agendamento que já estava de pé cair na trava (aqui, antes de gravar, não aparece)
  const temCarrossel = await page.$('button[aria-label^="Ir para o slide"], button[aria-label^="Ir para o banner"]');
  if (temCarrossel && !alvo.abertura) {
    const alvoSlide = alvo.slide || 1;
    await travarCarrossel(page);
    await irAoSlide(page, alvoSlide === 1 ? 2 : 1);
    await irAoSlide(page, alvoSlide);
    await wait(900);
  }
  await wait(1200);

  const client = await page.createCDPSession();
  const lista = [];
  let gravando = false;
  // A rolagem é FOTOGRAFADA PASSO A PASSO (02/10, "o scroll não está deslizando
  // limpo"): o Chrome sem janela entrega quadros em ritmo irregular, e nem rolar por
  // relógio nem travar a rolagem no recebimento do quadro deu uniforme (o quadro às
  // vezes chegava antes de pintar o passo, e a descida parava e pulava). Agora, em cada
  // passo: rola, espera dois quadros de tela pintarem e tira a foto. Cada foto é um
  // passo e vale 1/30s no vídeo. Durante a descida o screencast é ignorado
  let rolando = false, relogio = null;
  client.on("Page.screencastFrame", async (f) => {
    // relógio do screencast contra o do Node, para as fotos da descida entrarem na
    // mesma linha do tempo dos quadros gravados
    if (f.metadata.timestamp != null) relogio = Date.now() / 1000 - f.metadata.timestamp;
    if (gravando && !rolando) lista.push({ data: f.data, ts: f.metadata.timestamp ?? null });
    try { await client.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {}
  });
  // espera a página ficar pronta para a foto: marca a entrada ao rolar, espera as
  // imagens visíveis (até 0,5s) e dois quadros de tela pintarem
  const prontaParaFoto = () => page.evaluate(() => new Promise((r) => {
    // a entrada ao rolar do molde (data-revelar) depende de um IntersectionObserver
    // que, fotografando passo a passo, não dispara a tempo: seções inteiras saíam em
    // branco (Full Time, 02/10). Faz o que ele faria: marca o que entrou na tela
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
  // n passos fotografados: em cada um, aplica o passo, espera a página e tira a foto
  const fotografar = async (n, aplicar) => {
    rolando = true;
    // cada foto leva ~100ms de verdade e vale 33ms no vídeo: as animações da página
    // (a entrada ao rolar, os letreiros) desaceleram na mesma proporção, senão saem
    // três vezes mais rápidas que no site
    await client.send("Animation.enable").catch(() => {});
    let ritmo = 1, tPasso = Date.now();
    try {
      for (let k = 1; k <= n; k++) {
        await aplicar(k / n);
        await prontaParaFoto();
        const { data } = await client.send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
        lista.push({ data, ts: relogio != null ? Date.now() / 1000 - relogio : null, travado: true });
        const real = Date.now() - tPasso; tPasso = Date.now();
        const alvoRitmo = Math.min(1, Math.max(0.1, (1000 / 30) / Math.max(1, real)));
        if (Math.abs(alvoRitmo - ritmo) > 0.05) { ritmo = alvoRitmo; await client.send("Animation.setPlaybackRate", { playbackRate: ritmo }).catch(() => {}); }
      }
    } finally {
      await client.send("Animation.setPlaybackRate", { playbackRate: 1 }).catch(() => {});
      rolando = false;
    }
  };
  const suave = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rolarTravado = async (ate, ms) => {
    const de = await page.evaluate(() => window.scrollY);
    const n = Math.max(2, Math.round((ms / 1000) * 30));
    await fotografar(n, (t) => page.evaluate((y) => window.scrollTo(0, y), Math.round((de + (ate - de) * suave(t)) * 2) / 2));
  };

  // O CURSOR do passeio (02/10, "daria para clicar, dar uma vasculhada, mostrar o
  // catálogo"): uma bolinha branca desenhada na página, movida passo a passo e
  // fotografada como a rolagem (não treme). O mouse de verdade vai junto, então o
  // efeito de passar o mouse do próprio site aparece nos cartões e botões
  const cursor = { x: VW * 0.72, y: VH * 0.58 };
  const desenharCursor = (escala = 1) => page.evaluate((x, y, e) => {
    let c = document.getElementById("__cursor");
    if (!c) {
      c = document.createElement("div");
      c.id = "__cursor";
      Object.assign(c.style, {
        position: "fixed", left: "0", top: "0", width: "50px", height: "50px", borderRadius: "50%",
        // 50px com anel escuro: com 34px ele sumia no botão vermelho da Japa (02/10)
        background: "rgba(255,255,255,.35)", border: "3px solid #fff", boxShadow: "0 0 0 2px rgba(0,0,0,.55), 0 6px 22px rgba(0,0,0,.45)",
        zIndex: "2147483647", pointerEvents: "none", transition: "none",
      });
      document.body.appendChild(c);
    }
    c.style.transform = "translate(" + (x - 25) + "px, " + (y - 25) + "px) scale(" + e + ")";
  }, cursor.x, cursor.y, escala);
  const moverCursor = async (x, y, ms = 900) => {
    const de = { ...cursor };
    const n = Math.max(6, Math.round((ms / 1000) * 30));
    await fotografar(n, async (t) => {
      cursor.x = de.x + (x - de.x) * suave(t);
      cursor.y = de.y + (y - de.y) * suave(t);
      await page.mouse.move(cursor.x, cursor.y);
      await desenharCursor();
    });
  };
  // o toque: a bolinha aperta e volta (fotografado), e o clique de verdade vai no fim
  const clicar = async () => {
    await fotografar(8, (t) => desenharCursor(1 - 0.32 * Math.sin(Math.PI * t)));
    await page.mouse.click(cursor.x, cursor.y);
  };
  // depois de um clique que troca de página: espera a página nova, devolve o cursor,
  // tira os flutuantes e pede as imagens (o screencast grava a espera, como ela é)
  // A troca de página é um CORTE: a gravação pausa enquanto a página nova carrega e
  // volta com ela pronta (fotos visíveis carregadas e já sem o borrado do next/image).
  // Gravar a espera mostrava a foto da peça borrada por meio segundo (Japa, 02/10)
  const esperarPagina = async (antes) => {
    if (lista.length) lista[lista.length - 1].corte = true;
    rolando = true;
    try {
      await page.waitForFunction((a) => location.pathname !== a, { timeout: 10000 }, antes).catch(() => {});
      await page.waitForNetworkIdle({ idleTime: 400, timeout: 8000 }).catch(() => {});
      // a página nova abre no topo: a Arena guardava a rolagem do catálogo, e a peça
      // aparecia já rolada, com o título cortado (02/10)
      await page.evaluate(() => window.scrollTo(0, 0));
      await esconderFlutuantes(page);
      await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = "eager"; }));
      await page.waitForFunction(() => [...document.images].every((i) => { const b = i.getBoundingClientRect(); return !(b.bottom > 0 && b.top < innerHeight && b.width > 0) || i.complete; }), { timeout: 6000 }).catch(() => {});
      await wait(700); // o borrado do next/image some numa transição
      await desenharCursor();
    } finally {
      rolando = false;
    }
    await wait(150);
  };
  // acha o alvo do passo (categoria, peça, tamanho, pedir) e, se ele não estiver bem na
  // tela, rola até ele (fotografado). Devolve o centro dele na tela, ou null
  const acharAlvo = async (tipo) => {
    const medir = () => page.evaluate((tipo) => {
      const visivel = (el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 30 && b.height > 14 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0"; };
      const interno = (a) => { try { const u = new URL(a.href, location.href); return u.origin === location.origin ? u.pathname : null; } catch { return null; } };
      const meio = (el) => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, top: b.top + scrollY }; };
      const perto = (els) => els.sort((a, b) => Math.abs(a.getBoundingClientRect().top - innerHeight * 0.4) - Math.abs(b.getBoundingClientRect().top - innerHeight * 0.4))[0];
      let el = null;
      if (tipo === "categoria") {
        const links = [...document.querySelectorAll("a[href]")].filter(visivel).filter((a) => !a.closest("header, footer, nav"));
        const cat = links.filter((a) => /^\/catalogo\/[^/]+/.test(interno(a) || ""));
        // sem /catalogo (a Xavier's): um link interno de seção, que não seja peça nem âncora
        const secao = links.filter((a) => { const p = interno(a); return p && p !== "/" && !p.startsWith("/produto") && !a.getAttribute("href").startsWith("#") && /ver|tod|catálogo|catalogo/i.test(a.textContent); });
        el = perto(cat.length ? cat : secao);
      } else if (tipo === "peca") {
        // o cartão inteiro, quando ele é link (cara de cartão, 120px ou mais: a Japa não põe
        // <img> dentro do link, e a faixa de ofertas do topo tem links de peça de 40px);
        // senão o nome da peça (na Xavier's a foto não é link: só o nome e o "Escolher
        // tamanho", que leva a #tamanhos), sempre dentro da área útil da tela
        const pecas = [...document.querySelectorAll('a[href*="/produto/"]')].filter(visivel)
          .filter((a) => !a.getAttribute("href").includes("#") && !a.closest("header, footer"));
        const cartoes = pecas.filter((a) => a.getBoundingClientRect().height >= 120);
        el = perto(cartoes.length ? cartoes : pecas.filter((a) => a.getBoundingClientRect().height >= 24));
      } else if (tipo === "tamanho") {
        const bs = [...document.querySelectorAll("button")].filter(visivel).filter((b) => !b.disabled && b.getAttribute("aria-disabled") !== "true" && /^(PP|P|M|G|GG|XG|XGG|\d{2}(,5)?)$/.test(b.textContent.trim()));
        // peça de um tamanho só já vem com ele marcado, e clicar DESMARCA (na Full Time o
        // "Separar pra mim" sumia junto, 02/10): só escolhe com dois ou mais, e um que
        // ainda não esteja marcado
        const marcado = (b) => b.getAttribute("aria-pressed") === "true" || b.getAttribute("aria-checked") === "true" || b.getAttribute("aria-current") === "true" || b.dataset.ativo === "true";
        const livres = bs.length >= 2 ? bs.filter((b) => !marcado(b)) : [];
        el = livres[Math.floor(livres.length / 2)] || null;
      } else if (tipo === "pedir") {
        // pelo texto OU pelo link: na Japa, depois do tamanho, o botão vira "Garantir o meu
        // 41" e só o endereço (wa.me) ainda diz que é o pedido (02/10)
        // e o MAIOR deles (36px de altura ou mais): o mais perto do meio da tela pegava o
        // link miúdo da barra de avisos da Full Time em vez do "Separar pra mim" (02/10)
        const area = (b) => { const r = b.getBoundingClientRect(); return r.width * r.height; };
        // (com cara de botão, 36 a 90px de altura, e nunca um link para outra peça: na
        // Japa o cartão inteiro de "Mais peças" é link e contém "Garantir o meu", e pela
        // área ele ganhava do botão da peça)
        el = [...document.querySelectorAll("a, button")].filter(visivel).filter((b) => !b.closest("header, footer") &&
          b.getBoundingClientRect().height >= 36 && b.getBoundingClientRect().height <= 90 &&
          !(b.getAttribute("href") || "").includes("/produto/") &&
          (/whats|pedir|separar|reservar|comprar|garantir/i.test(b.textContent) || /wa\.me|whatsapp/i.test(b.getAttribute("href") || "")))
          .sort((a, b) => area(b) - area(a))[0] || null;
      }
      return el ? meio(el) : null;
    }, tipo);
    let m = await medir();
    if (!m) return null;
    if (m.y < 150 || m.y > VH - 90) {
      await rolarTravado(Math.max(0, m.top - VH * 0.45), 1600);
      await wait(250);
      m = await medir();
    }
    return m;
  };
  // na abertura, a aba passa pelo branco antes de recarregar: sem isso o reel começava
  // com 1s da página antiga e só então a roda (02/10). O branco emenda com o fundo
  // branco do carregamento
  if (alvo.abertura) { await page.goto("about:blank"); await wait(300); }
  gravando = true;
  const inicioGravacao = Date.now();
  let capaS = CAPA_S, fimRoda = null, quadroSaida = null, inicioCarga = null;
  await client.send("Page.startScreencast", { format: "jpeg", quality: 90, everyNthFrame: 1, maxWidth: VW, maxHeight: VH });

  // A abertura: a página carrega de novo com a gravação já rodando, e o reel começa na
  // tela de carregamento da loja (a roda da Full Time girando e virando o FT, pedido do
  // Rafael em 02/10). Os arquivos já estão no cache da primeira visita, então a roda
  // gira o mínimo dela (0,9s) e não um carregamento de verdade. Por trás dela o
  // carrossel já vai para o slide pedido, e quando a roda some os skates estão lá
  if (alvo.abertura) {
    // com tudo no cache a roda girava só os 0,9s mínimos dela; as imagens da loja
    // seguram 2s nesta recarga (as da própria roda não), como num celular comum, e a
    // roda gira o tempo de verdade
    await page.setRequestInterception(true);
    const segura = (req) => {
      if (req.isInterceptResolutionHandled()) return;
      const u = req.url();
      if (req.resourceType() === "image" && !/carreg/i.test(u)) setTimeout(() => req.continue().catch(() => {}), 2000);
      else req.continue().catch(() => {});
    };
    page.on("request", segura);
    // a vigia da saída mora DENTRO da página, desde antes de ela carregar: anota o
    // instante em que a tela de carregamento começa a sair. Vigiar de fora perdia o
    // momento quando levar o carrossel ao slide demorava (02/10)
    // (vigia o DOCUMENTO, não o <html>: nesse instante o <html> ainda é o provisório, e o
    // navegador cria outro ao ler a página; a primeira vigia olhava o errado)
    const vigia = await page.evaluateOnNewDocument(() => {
      // __carga: a tela de carregamento apareceu (é dali que o reel começa);
      // __saida: ela começou a sair ("saindo", o sinal da própria loja). Só esses dois:
      // o <html> fica sem a classe por um instante quando o React assume a página, e
      // aceitar isso como saída fazia a câmera recuar com a roda ainda girando (02/10)
      new MutationObserver(() => {
        const c = document.documentElement?.className ?? "";
        if (!window.__carga && /carreg/.test(c)) window.__carga = Date.now();
        if (!window.__saida && /saindo/.test(c)) window.__saida = Date.now();
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    });
    await page.goto(alvo.url, { waitUntil: "domcontentloaded", timeout: 90000 });
    if (alvo.slide) { await travarCarrossel(page); await irAoSlide(page, alvo.slide); }
    await page.waitForFunction(() => document.readyState === "complete", { timeout: 30000 }).catch(() => {});
    await esconderFlutuantes(page);
    await page.waitForFunction(() => !document.documentElement.className.match(/carreg/), { timeout: 8000 }).catch(() => {});
    fimRoda = (Date.now() - inicioGravacao) / 1000;
    // o instante da saída vira quadro: o primeiro gravado depois dele (loja sem tela de
    // carregamento não marca nada, e então não há zoom)
    const { carga, saida } = await page.evaluate(() => ({ carga: window.__carga ?? null, saida: window.__saida ?? null }));
    if (carga != null && relogio != null) inicioCarga = carga / 1000 - relogio;
    console.log(`  carregamento: ${carga && saida ? ((saida - carga) / 1000).toFixed(2) + "s de roda" : "não visto"}`);
    // às vezes a tela de carregamento some no meio, sem virar FT: quando o React assume a
    // página, a classe dela é apagada do <html> (é do site, depende da ordem em que as
    // coisas carregam; anotado para o Rafael em 02/10). Essa gravação não serve: de novo
    if (carga != null && saida == null) {
      await client.send("Page.stopScreencast").catch(() => {});
      await page.close().catch(() => {});
      fs.rmSync(dir, { recursive: true, force: true });
      throw new Error("ABERTURA_CORTADA");
    }
    await page.removeScriptToEvaluateOnNewDocument(vigia.identifier);
    if (saida != null && relogio != null) {
      const tsSaida = saida / 1000 - relogio;
      const k = lista.findIndex((f) => f.ts != null && f.ts >= tsSaida);
      if (k > 0) quadroSaida = k;
    }
    page.off("request", segura);
    await page.setRequestInterception(false);
    // a recarga com as imagens seguradas roda sem cache, e as imagens de baixo (lazy)
    // chegavam atrasadas para as fotos da descida: seções em branco (02/10). Pede todas
    // agora, enquanto o hero está parado
    await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = "eager"; }));
    if (alvo.slide) { await wait(400); await irAoSlide(page, alvo.slide); }
    // a capa vem 1,2s depois da roda sumir: com a abertura, o segundo 2 ainda é a roda
    capaS = Math.max(CAPA_S, (Date.now() - inicioGravacao) / 1000 + 1.2);
  }

  const fim = Math.max(0, altura - VH);
  // com abertura, parte da pausa do hero vai no recuo da câmera: segura mais
  await wait(alvo.abertura ? 4500 : 3200);
  if (alvo.soHome) {
    // o roteiro antigo: a home desce em três fôlegos e volta ao topo (dá a volta sem emenda)
    for (const [ate, ms, pausa] of [[1, 3200, 1400], [2, 3000, 1400], [3.2, 3400, 1200]]) {
      await rolarTravado(Math.min(fim, VH * ate), ms);
      await wait(pausa);
    }
    await rolarTravado(0, 2600);
    await wait(1400);
  } else {
    // O PASSEIO (02/10): como um cliente faria. A home desce um pouco, o cursor clica numa
    // categoria, o catálogo desce, o cursor abre uma peça, escolhe o tamanho (se a peça
    // tem) e para em cima do botão de pedir, sem clicar (o clique abriria o WhatsApp).
    // Cada passo que não acha o alvo é pulado, e o reel segue com o que tiver
    await rolarTravado(Math.min(fim, VH * 0.85), 2600);
    await wait(700);
    await desenharCursor();
    const passos = [];
    const alvoCat = await acharAlvo("categoria");
    if (alvoCat) {
      await moverCursor(alvoCat.x, alvoCat.y, 1000);
      await wait(250);
      const antes = await page.evaluate(() => location.pathname);
      await clicar();
      await esperarPagina(antes);
      passos.push("catálogo " + (await page.evaluate(() => location.pathname)));
      await wait(900);
      await rolarTravado(Math.min(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), VH * 0.9), 2600);
      await wait(600);
    }
    const alvoPeca = await acharAlvo("peca");
    if (alvoPeca) {
      await moverCursor(alvoPeca.x, alvoPeca.y, 1000);
      await wait(350);
      const antes = await page.evaluate(() => location.pathname);
      await clicar();
      await esperarPagina(antes);
      passos.push("peça " + (await page.evaluate(() => location.pathname)));
      await wait(1300);
      const tam = await acharAlvo("tamanho");
      if (tam) {
        await moverCursor(tam.x, tam.y, 800);
        await wait(200);
        await clicar();
        passos.push("tamanho");
        await wait(800);
      }
      const pedir = await acharAlvo("pedir");
      if (pedir) {
        await moverCursor(pedir.x, pedir.y, 900);
        passos.push("botão de pedir");
        await wait(1800);
      }
    }
    console.log("  passeio: " + (passos.join(" → ") || "nenhum alvo achado, ficou na home"));
  }
  // um repaint forçado garante o último quadro parado no topo
  await page.evaluate(() => { document.body.style.outline = "0 solid transparent"; });
  await wait(200);

  gravando = false;
  await client.send("Page.stopScreencast");
  await page.close();
  if (lista.length < 20) throw new Error(`${alvo.slug}: só ${lista.length} quadros, a gravação falhou`);

  // quadros com o tempo real de cada um (o screencast só manda quadro quando pinta)
  // na abertura, corta o branco do começo (a aba recarregando, antes da roda pintar):
  // quadro em branco é um jpeg pequeno; o primeiro bem maior que o primeiro de todos é
  // a roda. Os tempos medidos (fim da roda, capa) andam junto
  if (alvo.abertura && inicioCarga != null) {
    // o corte é pelo instante em que a tela de carregamento apareceu (a vigia de dentro
    // da página), não pelo tamanho do jpeg: a roda é quase toda branca e o corte por
    // tamanho comia metade dela (02/10)
    const i = lista.findIndex((f) => f.ts != null && f.ts >= inicioCarga);
    if (i > 0) {
      const corte = lista[i].ts - lista[0].ts;
      lista.splice(0, i);
      if (quadroSaida != null) quadroSaida -= i;
      if (fimRoda != null) fimRoda -= corte;
      capaS = Math.max(CAPA_S, capaS - corte);
      console.log(`  corte do branco inicial: ${corte.toFixed(2)}s`);
    }
  }
  const t0 = lista.find((f) => f.ts != null)?.ts ?? 0;

  // A câmera da abertura, QUADRO A QUADRO: perto (3,2x) na roda e no FT, recuando em
  // 1,1s a partir do quadro em que a tela de carregamento começa a sair. A roda é pequena
  // no meio da tela branca e, no cartão, virava um pontinho; o tamanho dela no site é
  // design da loja, então quem chega perto é a câmera. O zoom pelo ffmpeg (escala por
  // quadro + recorte) fazia a roda e o FT pularem para o canto no recuo (02/10); aqui
  // cada quadro é ampliado a 3x e recortado no centro, sem tremer
  if (quadroSaida != null && quadroSaida > 0 && lista[quadroSaida]?.ts != null) {
    const PERTO = 3.2, RECUO = 1.1, ALTA = 3;
    const tSaida = lista[quadroSaida].ts;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tmpIn = path.join(dir, "z-in.jpg"), tmpOut = path.join(dir, "z-out.jpg");
    const ampliar = (data, z) => {
      const w = Math.round((VW * ALTA) / z), h = Math.round((VH * ALTA) / z);
      fs.writeFileSync(tmpIn, Buffer.from(data, "base64"));
      ffmpeg(["-y", "-loglevel", "error", "-i", tmpIn, "-vf",
        `scale=${VW * ALTA}:${VH * ALTA}:flags=bicubic,crop=${w}:${h}:${Math.round((VW * ALTA - w) / 2)}:${Math.round((VH * ALTA - h) / 2)},scale=${VW}:${VH}:flags=lanczos`,
        "-q:v", "2", tmpOut], dir);
      return fs.readFileSync(tmpOut).toString("base64");
    };
    // antes da saída: tudo perto
    const antes = lista.slice(0, quadroSaida).map((f) => ({ ...f, data: ampliar(f.data, PERTO) }));
    // o recuo é FABRICADO a 30 quadros por segundo: com a página parada o Chrome não manda
    // quadro novo, e o recuo pulava do meio para o fim (02/10). Para cada 1/30s, o último
    // quadro da página até aquele instante, com o zoom daquele instante
    const recuo = [];
    for (let k = 0; k < Math.round(RECUO * 30); k++) {
      const t = tSaida + k / 30;
      let j = quadroSaida;
      while (j + 1 < lista.length && lista[j + 1].ts != null && lista[j + 1].ts <= t) j++;
      const z = 1 + (PERTO - 1) * (1 - ease(k / (RECUO * 30)));
      recuo.push({ data: ampliar(lista[j].data, z), ts: t, travado: true });
    }
    const depois = lista.slice(quadroSaida).filter((f) => f.ts == null || f.ts >= tSaida + RECUO);
    lista.length = 0;
    lista.push(...antes, ...recuo, ...depois);
    console.log(`  câmera da abertura: ${antes.length} quadros perto, ${recuo.length} no recuo`);
  }
  let concat = "", duracao = 0;
  lista.forEach((f, i) => {
    const nome = `f${String(i).padStart(5, "0")}.jpg`;
    fs.writeFileSync(path.join(quadros, nome), Buffer.from(f.data, "base64"));
    const agora = f.ts != null ? f.ts - t0 : i / 30;
    const prox = i + 1 < lista.length && lista[i + 1].ts != null ? lista[i + 1].ts - t0 : agora + 1 / 30;
    // a foto da descida vale 1/30s; a última de cada descida segura até o próximo quadro
    // gravado (é a pausa parada depois da descida)
    const ultimaDaDescida = f.travado && !lista[i + 1]?.travado;
    // o quadro antes de um corte (troca de página) vale 1/30s: a espera não aparece
    const d = f.corte || (f.travado && !ultimaDaDescida) ? 1 / 30 : Math.max(0.016, Math.min(2, prox - agora));
    duracao += d;
    concat += `file '${nome}'\nduration ${d.toFixed(3)}\n`;
  });
  concat += `file 'f${String(lista.length - 1).padStart(5, "0")}.jpg'\n`;
  fs.writeFileSync(path.join(quadros, "lista.txt"), concat);

  fs.mkdirSync(SAIDA, { recursive: true });
  // monta na pasta temporária e só copia para a Área de Trabalho no fim: uma falha do
  // ffmpeg no meio deixava um mp4 quebrado no lugar do último que prestava (02/10)
  const mp4 = path.join(dir, `${alvo.slug}.mp4`);
  const final = path.join(SAIDA, `${alvo.slug}.mp4`);

  // O fundo vivo: o próprio vídeo, ampliado até cobrir 9:16 e desfocado. É o que faz o
  // quadro inteiro mudar de cor junto com o site (no Guilherme, quando a tela chega no
  // navio, o fundo vira tempestade). O desfoque roda em 1/4 da resolução e sobe depois:
  // em tamanho cheio, ele levava minutos e o resultado é igual.
  // Com --fundo, a arte parada entra no lugar, com desfoque leve (ela já nasce fundo).
  const fundo = alvo.fundo
    ? `[4:v]scale=${Math.round(W * 1.08)}:${Math.round(H * 1.08)}:force_original_aspect_ratio=increase,crop=${W}:${H},gblur=sigma=14,eq=brightness=-0.03[fundo]`
    : `[viva]scale=-2:${H / 4},crop=${W / 4}:${H / 4},gblur=sigma=9,scale=${W}:${H}:flags=bicubic,curves=all='0/0 0.5/0.3 1/0.48',eq=saturation=1.35[fundo]`;
  // o curves põe teto no claro: seção branca do site (o catálogo da Xavier's) deixava o
  // fundo cinza-claro e o PORTFÓLIO cor papel sumia. O fundo muda de cor, nunca chega ao branco
  // O letreiro: anda pela tira (em volta do período, então não acaba nunca), gira a -4° e
  // entra deslizando 200px da esquerda e acendendo em 0,9s, com freio no fim (cúbica).
  // A faixa girada é mais larga que o quadro: o overlay corta as pontas fora da tela.
  const meio = (W + 2 * SOBRA) / 2;
  const bruto = Math.round(periodo.P - (meio - periodo.palavra / 2) - LETREIRO_VEL * capaS);
  const inicio = ((bruto % periodo.P) + periodo.P) % periodo.P; // o mod do ffmpeg não gosta de negativo
  const anda = `mod(t*${LETREIRO_VEL}+${inicio}\\,${periodo.P})`;
  const desliza = `(W-w)/2-${SOBRA}*pow(max(0\\,1-max(0\\,t-0.2)/0.9)\\,3)`;
  const filtro = [
    `[0:v]fps=30,split=2[viva][tela0]`,
    fundo,
    `[1:v]crop=w=${W + 2 * SOBRA}:h=${FAIXA_ALT}:x='${anda}':y=0,format=rgba,rotate=a=${FAIXA_GRAUS}*PI/180:c=none:ow=rotw(${FAIXA_GRAUS}*PI/180):oh=roth(${FAIXA_GRAUS}*PI/180),fade=t=in:st=0.2:d=0.7:alpha=1[faixa]`,
    `[fundo][faixa]overlay=x='${desliza}':y=${FAIXA_Y}-h/2:eval=frame[f1]`,
    `[f1][2:v]overlay=0:0[f2]`,
    `[tela0]scale=${CW}:${CH}:flags=lanczos,format=rgba[tela]`,
    `[3:v]format=gray[masc]`,
    `[tela][masc]alphamerge[cartao]`,
    `[f2][cartao]overlay=${CX}:${CY},format=yuv420p[v]`,
  ].join(";");

  console.log(`  ${lista.length} quadros, ${duracao.toFixed(1)}s → ffmpeg`);
  ffmpeg([
    "-y",
    "-f", "concat", "-safe", "0", "-i", path.join(quadros, "lista.txt"),
    "-loop", "1", "-framerate", "30", "-i", path.join(dir, "tira.png"),
    "-loop", "1", "-framerate", "30", "-i", path.join(dir, "resto.png"),
    "-loop", "1", "-framerate", "30", "-i", path.join(dir, "mascara.png"),
    ...(alvo.fundo ? ["-loop", "1", "-framerate", "30", "-i", alvo.fundo] : []),
    "-filter_complex", filtro, "-map", "[v]",
    // as imagens em loop não acabam nunca e o shortest do overlay não segura o fim
    // (02/10: o mp4 crescia sem parar); o corte é pelo tempo somado da gravação
    "-t", duracao.toFixed(2),
    "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-profile:v", "high",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    mp4,
  ], dir);

  fs.copyFileSync(mp4, final);

  // a capa: com a faixa já assentada e o hero parado, para escolher no Instagram
  ffmpeg(["-y", "-ss", capaS.toFixed(2), "-i", mp4, "-frames:v", "1", "-q:v", "2", path.join(SAIDA, `${alvo.slug}-capa.jpg`)], dir);

  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`  OK: ${final} (${(fs.statSync(final).size / 1024 / 1024).toFixed(1)} MB)`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
});
let falhas = 0;
for (const alvo of alvos) {
  try {
    for (let tentativa = 1; ; tentativa++) {
      try { await gravar(browser, alvo); break; }
      catch (e) {
        if (e.message !== "ABERTURA_CORTADA" || tentativa >= 3) throw e;
        console.log(`  a tela de carregamento saiu cortada; gravando de novo (${tentativa + 1}ª tentativa)`);
      }
    }
  }
  catch (e) { falhas++; console.error(`  FALHOU ${alvo.slug}: ${e.message}`); }
}
await browser.close();
process.exit(falhas ? 1 : 0);
