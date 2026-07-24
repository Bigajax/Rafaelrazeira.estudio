// Grava a jornada de compra da vitrine da Xavier's (site no ar) em um MP4
// vertical para o hero da Vitrine Digital. Mudo e em loop, então cada passo
// é explicado por uma legenda na tela, no estilo do estúdio (mono + verde).
//
// Fluxo: catálogo -> coleção retrô -> produto -> escolhe o tamanho ->
// pedido pronto no WhatsApp (renderizado como um balão, sem sair do site).
//
// Captura via CDP screencast (quadros no paint, com timestamp real) e
// remonta com ffmpeg a 30fps constantes.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import ffmpegPath from "ffmpeg-static";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "https://xavier-s-sports.vercel.app";
const OUT = path.join(__dir, "out");
const FRAMES = path.join(OUT, "frames");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });

const green = "#10b981";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- helpers injetados na página ----------
async function setupOverlay(page) {
  await page.evaluate((green) => {
    // fontes do estúdio (com fallback para mono do sistema)
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap";
    document.head.appendChild(link);

    const cap = document.createElement("div");
    cap.id = "__cap";
    Object.assign(cap.style, {
      position: "fixed", left: "16px", right: "16px", top: "80px",
      zIndex: "2147483647", display: "flex", justifyContent: "center",
      pointerEvents: "none", opacity: "0", transition: "opacity .45s ease, transform .45s ease",
      transform: "translateY(-8px)",
    });
    const pill = document.createElement("div");
    pill.id = "__cappill";
    Object.assign(pill.style, {
      background: "rgba(11,20,17,.94)", color: "#fff", borderRadius: "14px",
      padding: "13px 18px", font: "700 15px/1.2 'Space Mono', ui-monospace, monospace",
      letterSpacing: ".01em", boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      border: "1px solid rgba(255,255,255,.08)", maxWidth: "94%", textAlign: "center",
      display: "flex", alignItems: "center", gap: "10px",
    });
    cap.appendChild(pill);
    document.body.appendChild(cap);

    const cur = document.createElement("div");
    cur.id = "__cur";
    Object.assign(cur.style, {
      position: "fixed", top: "0", left: "0", width: "26px", height: "26px",
      borderRadius: "50%", zIndex: "2147483646", pointerEvents: "none",
      background: "rgba(255,255,255,.25)", border: "2px solid rgba(255,255,255,.9)",
      boxShadow: "0 2px 10px rgba(0,0,0,.4)", transform: "translate(-100px,-100px)",
      transition: "transform .6s cubic-bezier(.22,.61,.36,1)", opacity: "0",
    });
    document.body.appendChild(cur);
  }, green);
}

async function caption(page, index, text) {
  await page.evaluate((index, text, green) => {
    const cap = document.getElementById("__cap");
    const pill = document.getElementById("__cappill");
    if (!cap || !pill) return;
    pill.innerHTML = `<b style="color:${green};font-size:13px">${index}</b><span>${text}</span>`;
    cap.style.opacity = "0";
    cap.style.transform = "translateY(-8px)";
    requestAnimationFrame(() => {
      cap.style.opacity = "1";
      cap.style.transform = "translateY(0)";
    });
  }, index, text, green);
}

async function hideCaption(page) {
  await page.evaluate(() => {
    const cap = document.getElementById("__cap");
    if (cap) { cap.style.opacity = "0"; cap.style.transform = "translateY(-8px)"; }
  });
}

async function moveCursorToEl(page, selector, { tap = false } = {}) {
  await page.evaluate((selector, tap) => {
    const el = document.querySelector(selector);
    const cur = document.getElementById("__cur");
    if (!el || !cur) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    cur.style.opacity = "1";
    cur.style.transform = `translate(${x - 13}px, ${y - 13}px)`;
    if (tap) {
      setTimeout(() => {
        cur.animate(
          [{ transform: `translate(${x - 13}px, ${y - 13}px) scale(1)` },
           { transform: `translate(${x - 13}px, ${y - 13}px) scale(.6)` },
           { transform: `translate(${x - 13}px, ${y - 13}px) scale(1)` }],
          { duration: 320, easing: "ease-out" }
        );
      }, 600);
    }
  }, selector, tap);
}

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
    // esconde overlays fixos que cobrem a tela inteira (cookie, newsletter),
    // preservando os nossos (__cap/__cur)
    for (const el of document.querySelectorAll("body *")) {
      if (el.id === "__cap" || el.id === "__cur" || el.id === "__cappill") continue;
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed") continue;
      const r = el.getBoundingClientRect();
      const big = r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.6;
      const z = parseInt(cs.zIndex || "0", 10);
      if (big && z > 20 && cs.display !== "none") el.style.setProperty("display", "none", "important");
    }
    // esconde o botão flutuante de WhatsApp do próprio site, que colidiria
    // com a legenda e com o cursor
    for (const a of document.querySelectorAll('a[href*="wa.me"]')) {
      if (getComputedStyle(a).position === "fixed") a.style.setProperty("display", "none", "important");
    }
  });
}

// balão final estilo WhatsApp com a mensagem real do pedido
async function whatsappScene(page, message) {
  await page.evaluate((message, green) => {
    const cur = document.getElementById("__cur");
    if (cur) cur.style.opacity = "0"; // some com o cursor antes do balão
    document.querySelectorAll("#__wa").forEach((n) => n.remove());
    const wrap = document.createElement("div");
    wrap.id = "__wa";
    Object.assign(wrap.style, {
      position: "fixed", inset: "0", zIndex: "2147483645",
      background: "#0b141a", display: "flex", flexDirection: "column",
      opacity: "0", transition: "opacity .4s ease",
      font: "400 15px/1.5 'Space Mono', ui-monospace, monospace",
    });
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex", alignItems: "center", gap: "12px", padding: "16px 16px",
      background: "#1f2c34", color: "#fff", paddingTop: "calc(16px + env(safe-area-inset-top))",
    });
    header.innerHTML = `
      <div style="width:38px;height:38px;border-radius:50%;background:${green};display:flex;align-items:center;justify-content:center;font-weight:700;color:#04120c">XS</div>
      <div><div style="font-weight:700;font-size:15px">Xavier's Sports</div><div style="font-size:11px;color:#8fa3ad">online agora</div></div>`;
    const body = document.createElement("div");
    Object.assign(body.style, {
      flex: "1", padding: "22px 16px", display: "flex", flexDirection: "column",
      justifyContent: "flex-end", gap: "10px",
      background: "#0b141a",
    });
    const bubble = document.createElement("div");
    Object.assign(bubble.style, {
      alignSelf: "flex-end", maxWidth: "82%", background: "#005c4b", color: "#e9edef",
      borderRadius: "12px 12px 4px 12px", padding: "12px 14px",
      whiteSpace: "pre-wrap", boxShadow: "0 1px 1px rgba(0,0,0,.3)",
      opacity: "0", transform: "translateY(10px)", transition: "opacity .4s ease, transform .4s ease",
      fontSize: "14px", lineHeight: "1.5",
    });
    // negrito estilo WhatsApp (*texto*) e horário
    const html = message
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/\*(.+?)\*/g, "<b>$1</b>");
    bubble.innerHTML = `${html}<span style="display:block;text-align:right;font-size:10px;color:#8fd0c0;margin-top:6px">19:12 ✓✓</span>`;
    body.appendChild(bubble);
    wrap.appendChild(header);
    wrap.appendChild(body);
    document.body.appendChild(wrap);
    requestAnimationFrame(() => {
      wrap.style.opacity = "1";
      setTimeout(() => { bubble.style.opacity = "1"; bubble.style.transform = "translateY(0)"; }, 450);
    });
  }, message, green);
}

// ---------- captura ----------
async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-infobars", "--hide-scrollbars", "--force-color-profile=srgb"],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");

  const client = await page.createCDPSession();
  const frames = [];
  let capturing = false;
  client.on("Page.screencastFrame", async (f) => {
    if (capturing) frames.push({ data: f.data, ts: f.metadata.timestamp ?? null });
    try { await client.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {}
  });

  // cada navegação recarrega o DOM e destrói o overlay: reinjeta sempre
  const goto = async (url) => {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await setupOverlay(page);
    await killModals(page);
  };

  console.log("→ catálogo");
  await goto(`${BASE}/`);
  await wait(400);

  capturing = true;
  await client.send("Page.startScreencast", { format: "jpeg", quality: 88, everyNthFrame: 1, maxWidth: 800, maxHeight: 1734 });
  await wait(300);

  await caption(page, "01", "A vitrine, tudo em um link");
  await wait(1600);
  await smoothScroll(page, 900, 2600);
  await wait(700);
  await smoothScroll(page, 1500, 2200);
  await wait(600);

  console.log("→ pronta entrega");
  await goto(`${BASE}/pronta-entrega`);
  await killModals(page);
  await caption(page, "02", "Filtra por pronta entrega");
  await wait(600);
  await smoothScroll(page, 700, 2400);
  await wait(900);

  console.log("→ produto");
  await goto(`${BASE}/produto/camisa-brasil-home-2026-torcedor`);
  await killModals(page);
  await caption(page, "03", "Fotos, preço e detalhes");
  await wait(700);
  await smoothScroll(page, 520, 2200);
  await wait(900);

  console.log("→ tamanho");
  // rola até a área de tamanhos e escolhe o M
  await page.evaluate(() => document.getElementById("tamanhos")?.scrollIntoView({ behavior: "instant", block: "center" }));
  await wait(500);
  await caption(page, "04", "Escolhe o tamanho");
  const sizeSel = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("#tamanhos button"));
    const m = btns.find((b) => /^M$/.test(b.textContent.trim()) || /Tamanho M\b/.test(b.getAttribute("aria-label") || ""));
    if (!m) return null;
    m.setAttribute("data-rec", "sizeM");
    return "#tamanhos [data-rec='sizeM']";
  });
  if (sizeSel) {
    await moveCursorToEl(page, sizeSel, { tap: true });
    await wait(1000);
    await page.click(sizeSel).catch(() => {});
  }
  await wait(1300);

  console.log("→ pedido no WhatsApp");
  await caption(page, "05", "Pedido pronto no WhatsApp");
  await wait(400);
  // pega a mensagem real do link wa.me do produto (não navega para fora)
  const message = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="wa.me"]'));
    const msgs = links.map((a) => decodeURIComponent((a.href.split("text=")[1] || "").replace(/\+/g, " ")));
    // prefere a mensagem do pedido (com TAMANHO); senão, a mais completa do produto
    const withSize = msgs.filter((m) => /TAMANHO/i.test(m)).sort((a, b) => b.length - a.length)[0];
    const withProduct = msgs.filter((m) => /Brasil|Camisa|PRODUTO/i.test(m)).sort((a, b) => b.length - a.length)[0];
    return withSize || withProduct || null;
  });
  const fallback = "Olá! Vi este produto no site da Xavier's Sports.\n\n*PRODUTO*\nCamisa Brasil Home 2026\n\n*VERSÃO*\nTorcedor\n\n*TAMANHO*\nM\n\n*DISPONIBILIDADE*\nPronta entrega\n\n*VALOR*\nR$ 189,00\n\nPoderia confirmar o prazo de envio?";
  await whatsappScene(page, message || fallback);
  await wait(3600);
  await hideCaption(page);
  await wait(500);

  await client.send("Page.stopScreencast");
  capturing = false;
  await wait(200);
  await browser.close();

  // ---------- remonta com ffmpeg ----------
  console.log(`→ ${frames.length} quadros capturados`);
  if (frames.length < 10) throw new Error("poucos quadros — algo falhou na captura");
  const t0 = frames.find((f) => f.ts != null)?.ts ?? 0;
  let lines = "";
  frames.forEach((f, i) => {
    const name = `f${String(i).padStart(5, "0")}.jpg`;
    fs.writeFileSync(path.join(FRAMES, name), Buffer.from(f.data, "base64"));
    const cur = f.ts != null ? f.ts - t0 : i / 30;
    const next = i + 1 < frames.length && frames[i + 1].ts != null ? frames[i + 1].ts - t0 : cur + 1 / 30;
    const dur = Math.max(0.016, Math.min(1.5, next - cur));
    lines += `file '${name}'\nduration ${dur.toFixed(3)}\n`;
  });
  // repete o último quadro (exigência do demuxer concat)
  lines += `file 'f${String(frames.length - 1).padStart(5, "0")}.jpg'\n`;
  fs.writeFileSync(path.join(FRAMES, "list.txt"), lines);

  const mp4 = path.join(OUT, "xavier-hero.mp4");
  const args = [
    "-y", "-f", "concat", "-safe", "0", "-i", "list.txt",
    "-vf", "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart",
    path.join("..", "xavier-hero.mp4"),
  ];
  console.log("→ ffmpeg encode");
  const r = spawnSync(ffmpegPath, args, { cwd: FRAMES, encoding: "utf8" });
  if (r.status !== 0) { console.error(r.stderr?.slice(-1500)); throw new Error("ffmpeg falhou"); }

  // poster: um quadro do meio (produto na tela)
  const posterFrame = path.join(FRAMES, `f${String(Math.floor(frames.length * 0.62)).padStart(5, "0")}.jpg`);
  const rp = spawnSync(ffmpegPath, ["-y", "-i", posterFrame, "-q:v", "3", path.join(OUT, "xavier-hero-poster.jpg")], { encoding: "utf8" });
  if (rp.status !== 0) console.error("poster falhou (segue sem):", rp.stderr?.slice(-400));

  const sz = fs.statSync(mp4).size;
  console.log(`OK: ${mp4} (${(sz / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
