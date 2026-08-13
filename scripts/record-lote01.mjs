// Produz as peças "sem rosto" do lote 1 de anúncios da vitrine
// (docs/lotes/lote-01.md) e monta os 5 anúncios finais que não dependem
// de gravação do Rafael: H01-C2-CTA1, H03-C2-CTA2, H08-C1-CTA1,
// H10-C1-CTA2 e H16-C2-CTA3. Anúncios mudos, todo o roteiro vira texto
// na tela, na identidade papel e tinta (Archivo condensada + JetBrains
// Mono + esmeralda).
//
// Cada peça (hook, corpo, CTA) sai como um MP4 1080x1920 próprio em
// anuncios/pecas/, e a montagem é concatenação: mesma régua do método,
// trocar uma peça no lote 2 não regrava as outras.
//
// Mesma técnica do record-xavier-hero.mjs: CDP screencast (quadros no
// paint com timestamp real) remontado com ffmpeg a 30fps. Deps sob
// demanda, a partir da raiz: npm i --no-save puppeteer-core ffmpeg-static

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import ffmpegPath from "ffmpeg-static";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const XAVIER = "https://xavier-s-sports.vercel.app";
const GRIFE = "https://pr-grife.vercel.app";
const ROOT = path.join(__dir, "..");
const PECAS = path.join(ROOT, "anuncios", "pecas");
const LOTE = path.join(ROOT, "anuncios", "lote-01");
const TMP = path.join(__dir, "out-lote01");

const PAPEL = "#f7f3ea";
const TINTA = "#161616";
const VERDE = "#047857";
const VERDE_CLARO = "#34d399";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- estilo e helpers injetados ----------

// fontes + classes das cenas; reinjetado a cada navegação
async function setupStage(page) {
  await page.evaluate(({ PAPEL, TINTA, VERDE, VERDE_CLARO }) => {
    if (document.getElementById("__stage-style")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=JetBrains+Mono:wght@400;700&display=swap";
    document.head.appendChild(link);
    const st = document.createElement("style");
    st.id = "__stage-style";
    st.textContent = `
      #__card { position: fixed; inset: 0; z-index: 2147483000; display: flex;
        flex-direction: column; justify-content: center; padding: 34px 26px;
        gap: 2px; opacity: 1; transition: opacity .5s ease; }
      #__card.papel { background: ${PAPEL}; }
      #__card.grad { background: linear-gradient(180deg, rgba(10,14,12,.20) 0%,
        rgba(10,14,12,.55) 55%, rgba(10,14,12,.92) 100%); justify-content: flex-end;
        padding-bottom: 120px; }
      #__card .ln { font-family: Archivo, sans-serif; font-stretch: 68%;
        font-weight: 860; text-transform: uppercase; font-size: 53px;
        line-height: 1.03; letter-spacing: .002em; color: ${TINTA};
        opacity: 0; transform: translateY(16px);
        transition: opacity .42s ease, transform .42s ease; }
      #__card.grad .ln { color: #fff; text-shadow: 0 2px 18px rgba(0,0,0,.45); }
      #__card .ln em { font-style: normal; color: ${VERDE}; }
      #__card.grad .ln em { color: ${VERDE_CLARO}; }
      #__card .ln.on { opacity: 1; transform: translateY(0); }
      #__card .sub { margin-top: 18px; font-family: 'JetBrains Mono', monospace;
        font-size: 14.5px; line-height: 1.55; color: ${TINTA}; max-width: 34ch;
        opacity: 0; transform: translateY(10px); transition: opacity .4s ease .1s,
        transform .4s ease .1s; }
      #__card.grad .sub { color: #e6efe9; }
      #__card .sub.on { opacity: 1; transform: translateY(0); }
      #__card .foot { position: absolute; left: 26px; right: 26px; bottom: 40px;
        font-family: 'JetBrains Mono', monospace; font-weight: 700;
        font-size: 13px; letter-spacing: .06em; color: ${VERDE};
        display: flex; align-items: center; gap: 10px; opacity: 0;
        transition: opacity .4s ease; }
      #__card .foot.on { opacity: 1; }
      #__card .foot .seta { display: inline-block;
        animation: __desce 1.1s ease-in-out infinite; }
      @keyframes __desce { 0%,100% { transform: translateY(0) }
        50% { transform: translateY(5px) } }
      #__card .marca { position: absolute; top: 34px; left: 26px;
        font-family: 'JetBrains Mono', monospace; font-size: 11px;
        font-weight: 700; letter-spacing: .14em; color: ${TINTA}; opacity: .55; }
      #__card.grad .marca { color: #fff; }

      #__zap { position: fixed; inset: 0; z-index: 2147482900; background: #0b141a;
        display: flex; flex-direction: column; justify-content: flex-end;
        padding: 20px 16px 90px; gap: 9px; opacity: 0; transition: opacity .45s ease; }
      #__zap.on { opacity: 1; }
      #__zap .bolha { align-self: flex-start; max-width: 76%; background: #1f2c34;
        color: #e9edef; border-radius: 12px 12px 12px 4px; padding: 10px 13px;
        font-family: 'JetBrains Mono', monospace; font-size: 13.5px; line-height: 1.45;
        box-shadow: 0 1px 1px rgba(0,0,0,.3); opacity: 0; transform: translateY(12px);
        transition: opacity .35s ease, transform .35s ease; }
      #__zap .bolha .h { display: block; text-align: right; font-size: 9.5px;
        color: #8696a0; margin-top: 4px; }
      #__zap .bolha.on { opacity: 1; transform: translateY(0); }

      #__pill { position: fixed; left: 16px; right: 16px; top: 64px;
        z-index: 2147483100; display: flex; justify-content: center;
        pointer-events: none; opacity: 0; transform: translateY(-8px);
        transition: opacity .45s ease, transform .45s ease; }
      #__pill > div { background: rgba(11,20,17,.94); color: #fff;
        border-radius: 14px; padding: 12px 17px; font-family: 'JetBrains Mono',
        monospace; font-weight: 700; font-size: 14px; line-height: 1.35;
        text-align: center; max-width: 94%;
        border: 1px solid rgba(255,255,255,.08);
        box-shadow: 0 10px 30px rgba(0,0,0,.35); }
      #__pill em { font-style: normal; color: ${VERDE_CLARO}; }
      #__pill.on { opacity: 1; transform: translateY(0); }
    `;
    document.head.appendChild(st);
  }, { PAPEL, TINTA, VERDE, VERDE_CLARO });
  // espera as fontes chegarem antes de qualquer cena
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]));
}

// cartão de texto (hook/CTA). theme: "papel" (fundo cheio) | "grad" (sobre o site)
async function card(page, { theme = "papel", lines, sub, foot, stagger = 430, hold = 2200 }) {
  await page.evaluate(({ theme, lines, sub, foot }) => {
    document.getElementById("__card")?.remove();
    const c = document.createElement("div");
    c.id = "__card";
    c.className = theme;
    let html = `<div class="marca">RAFAEL RAZEIRA · ESTÚDIO</div>`;
    for (const ln of lines) html += `<div class="ln">${ln}</div>`;
    if (sub) html += `<div class="sub">${sub}</div>`;
    if (foot) html += `<div class="foot"><span class="seta">↓</span><span>${foot}</span></div>`;
    c.innerHTML = html;
    document.body.appendChild(c);
  }, { theme, lines, sub, foot });
  const n = lines.length;
  for (let i = 0; i < n; i++) {
    await page.evaluate((i) => document.querySelectorAll("#__card .ln")[i]?.classList.add("on"), i);
    await wait(stagger);
  }
  if (sub) { await page.evaluate(() => document.querySelector("#__card .sub")?.classList.add("on")); await wait(500); }
  if (foot) { await page.evaluate(() => document.querySelector("#__card .foot")?.classList.add("on")); await wait(400); }
  await wait(hold);
}

async function removeCard(page, fade = true) {
  if (fade) {
    await page.evaluate(() => { const c = document.getElementById("__card"); if (c) c.style.opacity = "0"; });
    await wait(550);
  }
  await page.evaluate(() => document.getElementById("__card")?.remove());
}

// legenda tipo pílula sobre o site (mesma gramática do vídeo do hero)
async function pill(page, html) {
  await page.evaluate((html) => {
    let p = document.getElementById("__pill");
    if (!p) {
      p = document.createElement("div");
      p.id = "__pill";
      p.innerHTML = "<div></div>";
      document.body.appendChild(p);
    }
    p.firstElementChild.innerHTML = html;
    p.classList.remove("on");
    requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add("on")));
  }, html);
}
const hidePill = (page) => page.evaluate(() => document.getElementById("__pill")?.classList.remove("on"));

async function smoothScroll(page, toY, ms) {
  await page.evaluate((toY, ms) => new Promise((res) => {
    const startY = window.scrollY, dist = toY - startY, t0 = performance.now();
    const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    function step(now) {
      const p = Math.min(1, (now - t0) / ms);
      window.scrollTo(0, startY + dist * ease(p));
      if (p < 1) requestAnimationFrame(step); else res();
    }
    requestAnimationFrame(step);
  }), toY, ms);
}

async function killModals(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("body *")) {
      if (el.id?.startsWith("__")) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed") continue;
      const r = el.getBoundingClientRect();
      const big = r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.6;
      const z = parseInt(cs.zIndex || "0", 10);
      if (big && z > 20 && cs.display !== "none") el.style.setProperty("display", "none", "important");
    }
    for (const a of document.querySelectorAll('a[href*="wa.me"]')) {
      if (getComputedStyle(a).position === "fixed") a.style.setProperty("display", "none", "important");
    }
  });
}

// balão de pedido pronto no WhatsApp (fecho do corpo demo)
async function zapPedido(page, message) {
  await page.evaluate((message) => {
    document.getElementById("__zap")?.remove();
    const wrap = document.createElement("div");
    wrap.id = "__zap";
    const html = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*(.+?)\*/g, "<b>$1</b>");
    wrap.innerHTML = `<div class="bolha" style="align-self:flex-end;background:#005c4b;border-radius:12px 12px 4px 12px">${html}<span class="h">19:12 ✓✓</span></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => {
      wrap.classList.add("on");
      setTimeout(() => wrap.querySelector(".bolha")?.classList.add("on"), 420);
    });
  }, message);
}

// pilha de perguntas no escuro (abertura do corpo educacional)
async function zapPerguntas(page, perguntas, cadaMs) {
  await page.evaluate((perguntas) => {
    document.getElementById("__zap")?.remove();
    const wrap = document.createElement("div");
    wrap.id = "__zap";
    wrap.innerHTML = perguntas.map((q, i) =>
      `<div class="bolha" style="margin-left:${(i % 3) * 8}px">${q}<span class="h">${String(9 + i).padStart(2, "0")}:1${i % 6}</span></div>`
    ).join("");
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("on"));
  }, perguntas);
  await wait(500);
  for (let i = 0; i < perguntas.length; i++) {
    await page.evaluate((i) => document.querySelectorAll("#__zap .bolha")[i]?.classList.add("on"), i);
    await wait(cadaMs);
  }
}

async function limparCena(page) {
  await page.evaluate(() => {
    document.getElementById("__zap")?.remove();
    document.getElementById("__card")?.remove();
    document.getElementById("__pill")?.remove();
  });
}

// ---------- captura e encode ----------

async function main() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  for (const d of [path.join(PECAS, "hooks"), path.join(PECAS, "corpos"), path.join(PECAS, "ctas"), LOTE])
    fs.mkdirSync(d, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-infobars", "--hide-scrollbars", "--force-color-profile=srgb", "--mute-audio"],
    // 390x693 é 9:16 exato; a 2x sai 780x1386 e o ffmpeg sobe para 1080x1920
    defaultViewport: { width: 390, height: 693, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");

  const client = await page.createCDPSession();
  let frames = [];
  let capturing = false;
  client.on("Page.screencastFrame", async (f) => {
    if (capturing) frames.push({ data: f.data, ts: f.metadata.timestamp ?? null });
    try { await client.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {}
  });

  const goto = async (url) => {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await setupStage(page);
    await killModals(page);
  };

  // grava uma cena e encoda direto para `dest`
  async function gravar(nome, dest, cena) {
    console.log(`\n→ gravando ${nome}`);
    frames = [];
    capturing = true;
    await client.send("Page.startScreencast", { format: "jpeg", quality: 88, everyNthFrame: 1, maxWidth: 780, maxHeight: 1386 });
    await wait(250);
    await cena();
    await wait(250);
    await client.send("Page.stopScreencast");
    capturing = false;
    await wait(150);

    if (frames.length < 8) throw new Error(`${nome}: só ${frames.length} quadros, algo falhou`);
    const dir = path.join(TMP, nome);
    fs.mkdirSync(dir, { recursive: true });
    const t0 = frames.find((f) => f.ts != null)?.ts ?? 0;
    let lines = "";
    frames.forEach((f, i) => {
      const fname = `f${String(i).padStart(5, "0")}.jpg`;
      fs.writeFileSync(path.join(dir, fname), Buffer.from(f.data, "base64"));
      const cur = f.ts != null ? f.ts - t0 : i / 30;
      const next = i + 1 < frames.length && frames[i + 1].ts != null ? frames[i + 1].ts - t0 : cur + 1 / 30;
      // clamp de 2.8s: os cartões seguram parados por mais tempo que o hero
      const dur = Math.max(0.016, Math.min(2.8, next - cur));
      lines += `file '${fname}'\nduration ${dur.toFixed(3)}\n`;
    });
    lines += `file 'f${String(frames.length - 1).padStart(5, "0")}.jpg'\n`;
    fs.writeFileSync(path.join(dir, "list.txt"), lines);
    const r = spawnSync(ffmpegPath, [
      "-y", "-f", "concat", "-safe", "0", "-i", "list.txt",
      "-vf", "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-movflags", "+faststart",
      dest,
    ], { cwd: dir, encoding: "utf8" });
    if (r.status !== 0) { console.error(r.stderr?.slice(-1200)); throw new Error(`ffmpeg falhou em ${nome}`); }
    console.log(`   ok: ${path.relative(ROOT, dest)} (${(fs.statSync(dest).size / 1024 / 1024).toFixed(2)} MB, ${frames.length} quadros)`);
  }

  const hookDest = (n) => path.join(PECAS, "hooks", `${n}.mp4`);
  const corpoDest = (n) => path.join(PECAS, "corpos", `${n}.mp4`);
  const ctaDest = (n) => path.join(PECAS, "ctas", `${n}.mp4`);

  // ---------- HOOKS em cartão papel (H01, H03, H16) ----------
  await goto("about:blank");
  await page.evaluate((PAPEL) => { document.body.style.background = PAPEL; }, PAPEL);

  await gravar("H01", hookDest("H01"), async () => {
    await card(page, { lines: ["QUANTAS VENDAS", "VOCÊ PERDEU", "ESSA SEMANA", "NO <em>DIRECT?</em>"], hold: 2100 });
    await removeCard(page);
  });

  await gravar("H03", hookDest("H03"), async () => {
    await card(page, { lines: ["SUA LOJA RESPONDE", "AS MESMAS", "<em>20 PERGUNTAS.</em>", "TODO DIA."], hold: 2100 });
    await removeCard(page);
  });

  await gravar("H16", hookDest("H16"), async () => {
    await card(page, { lines: ["JOIA SE VENDE", "PELO <em>DETALHE.</em>", "E DETALHE NÃO", "CABE NUM STORY."], hold: 2200 });
    await removeCard(page);
  });

  // ---------- HOOKS sobre o site (H08, H10) ----------
  // a página de fundo carrega ANTES da captura: sem isso o anúncio abre
  // com o site em branco/mosaico de lazy-load
  await goto(`${XAVIER}/`);
  await gravar("H08", hookDest("H08"), async () => {
    await card(page, { theme: "grad", lines: ["UMA LOJA <em>INTEIRA</em>", "DENTRO DO", "INSTAGRAM."], hold: 400 });
    await smoothScroll(page, 750, 2600); // a loja rola atrás do texto
    await wait(700);
    await removeCard(page);
  });

  await goto(`${XAVIER}/produto/camisa-brasil-home-2026-torcedor`);
  await gravar("H10", hookDest("H10"), async () => {
    await card(page, { theme: "grad", lines: ["FOTO. PREÇO.", "TAMANHO.", "<em>SEM PERGUNTAR.</em>"], hold: 600 });
    await smoothScroll(page, 300, 2300);
    await wait(600);
    await removeCard(page);
  });

  // ---------- CORPO C1: demo (jornada na Xavier's) ----------
  await goto(`${XAVIER}/`);
  await gravar("C1", corpoDest("C1"), async () => {
    await pill(page, "Ele toca no link da bio <em>e cai na sua loja.</em>");
    await wait(1500);
    await smoothScroll(page, 850, 2500);
    await wait(500);

    await goto(`${XAVIER}/produto/camisa-brasil-home-2026-torcedor`);
    await pill(page, "Foto grande, preço na frente, <em>tamanho disponível.</em>");
    await wait(900);
    await smoothScroll(page, 480, 2200);
    await wait(600);

    await page.evaluate(() => document.getElementById("tamanhos")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    await wait(900);
    await pill(page, "Ele escolhe <em>e monta o pedido.</em>");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("#tamanhos button"));
      const m = btns.find((b) => /^M$/.test(b.textContent.trim()) || /Tamanho M\b/.test(b.getAttribute("aria-label") || ""));
      m?.click();
    });
    await wait(1600);

    await hidePill(page);
    const message = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="wa.me"]'));
      const msgs = links.map((a) => decodeURIComponent((a.href.split("text=")[1] || "").replace(/\+/g, " ")));
      const withSize = msgs.filter((m) => /TAMANHO/i.test(m)).sort((a, b) => b.length - a.length)[0];
      const withProduct = msgs.filter((m) => /Brasil|Camisa|PRODUTO/i.test(m)).sort((a, b) => b.length - a.length)[0];
      return withSize || withProduct || null;
    });
    await zapPedido(page, message || "Olá! Vi este produto na Xavier's Sports.\n\n*PRODUTO*\nCamisa Brasil Home 2026\n\n*TAMANHO*\nM\n\n*VALOR*\nR$ 189,00\n\nPoderia confirmar o prazo de envio?");
    await wait(600);
    await pill(page, "E chega no seu WhatsApp <em>com tudo decidido.</em>");
    await wait(3200);
    await hidePill(page);
    await wait(400);
    await limparCena(page);
  });

  // ---------- CORPO C2: educacional (perguntas -> vitrine -> antes/depois) ----------
  await goto(`${GRIFE}/`);
  await smoothScroll(page, 1800, 400); // força o lazy-load das fotos da reveal
  await smoothScroll(page, 0, 400);
  await wait(1200);
  await gravar("C2", corpoDest("C2"), async () => {
    await zapPerguntas(page, [
      "oi, qual o preço?", "tem no 38?", "tem outra cor?",
      "faz entrega?", "quanto fica com frete?", "ainda tem esse?",
    ], 520);
    await pill(page, "Cada atendimento <em>começa do zero.</em>");
    await wait(2100);

    await page.evaluate(() => { const z = document.getElementById("__zap"); if (z) z.classList.remove("on"); });
    await wait(550);
    await page.evaluate(() => document.getElementById("__zap")?.remove());
    await pill(page, "Com a vitrine: <em>tudo num lugar só.</em>");
    await smoothScroll(page, 900, 2800);
    await wait(400);
    await pill(page, "Quem chega no seu WhatsApp <em>já decidiu.</em>");
    await smoothScroll(page, 1700, 2400);
    await wait(800);
    await hidePill(page);

    await card(page, { lines: ["ANTES:", "20 PERGUNTAS.", "DEPOIS:", "<em>PEDIDO PRONTO.</em>"], stagger: 380, hold: 1500 });
    await removeCard(page);
  });

  // ---------- CTAs (cartão papel) ----------
  await goto("about:blank");
  await page.evaluate((PAPEL) => { document.body.style.background = PAPEL; }, PAPEL);

  await gravar("CTA1", ctaDest("CTA1"), async () => {
    await card(page, {
      lines: ["DEIXA SEU NOME", "E WHATSAPP QUE", "<em>EU TE CHAMO.</em>"],
      sub: "Dois campos, dez segundos, e você recebe a proposta sem compromisso.",
      foot: "TOQUE EM SAIBA MAIS", hold: 2600,
    });
    await removeCard(page, false);
  });

  await gravar("CTA2", ctaDest("CTA2"), async () => {
    await card(page, {
      lines: ["PROJETO COMPLETO", "POR <em>R$ 999.</em>"],
      sub: "Você começa com R$ 500 e o saldo só depois de aprovar. Me deixa te mostrar como ficaria a sua.",
      foot: "TOQUE EM SAIBA MAIS", hold: 2600,
    });
    await removeCard(page, false);
  });

  await gravar("CTA3", ctaDest("CTA3"), async () => {
    await card(page, {
      lines: ["UMA PESSOA.", "NÃO UMA", "<em>AGÊNCIA.</em>"],
      sub: "Pego poucos projetos por mês. Preencha hoje e garanta a próxima vaga da agenda.",
      foot: "TOQUE EM SAIBA MAIS", hold: 2600,
    });
    await removeCard(page, false);
  });

  await browser.close();

  // ---------- montagem: hook + corpo + CTA ----------
  const COMBOS = [
    ["H01", "C2", "CTA1"],
    ["H03", "C2", "CTA2"],
    ["H08", "C1", "CTA1"],
    ["H10", "C1", "CTA2"],
    ["H16", "C2", "CTA3"],
  ];
  for (const [h, c, cta] of COMBOS) {
    const nome = `${h}-${c}-${cta}`;
    const list = path.join(TMP, `${nome}.txt`);
    fs.writeFileSync(list, [hookDest(h), corpoDest(c), ctaDest(cta)]
      .map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n") + "\n");
    const dest = path.join(LOTE, `${nome}.mp4`);
    // reencode na emenda: garante timestamps limpos entre as três peças
    const r = spawnSync(ffmpegPath, [
      "-y", "-f", "concat", "-safe", "0", "-i", list,
      "-vf", "fps=30,format=yuv420p",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-movflags", "+faststart",
      dest,
    ], { encoding: "utf8" });
    if (r.status !== 0) { console.error(r.stderr?.slice(-1200)); throw new Error(`concat falhou em ${nome}`); }
    console.log(`✓ ${path.relative(ROOT, dest)} (${(fs.statSync(dest).size / 1024 / 1024).toFixed(2)} MB)`);
  }
  console.log("\nLote 1 (peças sem rosto) pronto em anuncios/.");
}

main().catch((e) => { console.error(e); process.exit(1); });
