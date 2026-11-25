// O vídeo do painel da /vitrine-digital (public/assets/demo/painel-cadastro.*), regravado em 25/11/2026.
// Como rodar: o _molde-oficial em modo local (sem .env.local) no 127.0.0.1:3390, com `unset ANTHROPIC_API_KEY`;
// `node scripts/gravar-video-painel.cjs <pasta de saída>` grava os quadros em <pasta>/quadros. Depois, na pasta:
//   ffmpeg -framerate 30 -i quadros/q%05d.jpg -vf "scale=960:600:flags=lanczos:in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p" -color_range tv -colorspace bt709 -c:v libvpx-vp9 -b:v 0 -crf 42 -row-mt 1 -an painel-cadastro.webm
//   ffmpeg -framerate 30 -i quadros/q%05d.jpg -vf "scale=960:600:flags=lanczos:in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p" -color_range tv -colorspace bt709 -c:v libx264 -preset slow -crf 30 -movflags +faststart -an painel-cadastro.mp4
//   ffmpeg -i quadros/q00000.jpg -vf scale=960:600 -c:v libwebp -quality 80 painel-cadastro-capa.webp
// O out_range=tv é obrigatório: os quadros são JPEG em faixa cheia e, sem ele, o Chrome recusa o webm (erro 3, decode).
// (o ffmpeg desta máquina mora em C:\ffmpeg\bin). O cadastro GRAVA no molde: depois, no _molde-oficial,
// `git checkout -- data/catalogo.json` e apagar data/crescimento.json, data/gestao.json e a foto nova em public/produtos.
// Regravou: subir o ?v= do VideoPainel em components/vitrine/mobbin.tsx.
// Grava o cadastro de uma peça no painel novo (v2.3.4), quadro a quadro: 1 foto = 1/30 s.
// Mesmo roteiro do vídeo de 28/10 da /vitrine-digital: Peças, Cadastrar peça, a foto do
// New Balance 9060 da Iconic, nome, categoria, preço, tamanhos, Cadastrar, a peça na lista.
const puppeteer = require("C:/Users/Rafael/rafael-razeira-estudio/node_modules/puppeteer-core");
const fs = require("fs");
const path = require("path");
const S = require("path").resolve(process.argv[2] || "saida-video-painel");
const BASE = "http://127.0.0.1:3390";
const Q = path.join(S, "quadros");
fs.rmSync(Q, { recursive: true, force: true });
fs.mkdirSync(Q, { recursive: true });
const FPS = 30, VW = 1280, VH = 800, DPR = 1.5;
const FOTO = "C:/Users/Rafael/Desktop/vitrines/iconic-sneakers/public/produtos/new-balance-9060-branco-e-cinza-1.webp";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", userDataDir: path.join(S, "perfil-" + Date.now()), protocolTimeout: 180000 });
  const p = await b.newPage();
  p.on("dialog", (d) => d.accept().catch(() => {}));
  await p.setViewport({ width: VW, height: VH, deviceScaleFactor: DPR });
  /* o selo do Next e o anel de foco do teclado não entram no vídeo */
  const CSS = "nextjs-portal{display:none!important} html{scroll-behavior:auto!important} *:focus-visible{outline:none!important}";
  await p.evaluateOnNewDocument((css) => {
    document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); });
  }, CSS);

  await p.goto(BASE + "/painel/login", { waitUntil: "networkidle2", timeout: 180000 });
  await p.type('input[name="senha"]', "molde");
  await p.click('button[type="submit"]');
  await p.waitForSelector(".pn-quadro", { timeout: 180000 });
  /* aquece (o dev compila na primeira visita) e deixa a página na lista */
  await p.goto(BASE + "/painel/pecas?nova=1", { waitUntil: "networkidle2", timeout: 180000 });
  await p.goto(BASE + "/painel/pecas", { waitUntil: "networkidle2", timeout: 180000 });
  await wait(1500);

  let n = 0;
  const foto = () => p.screenshot({ path: path.join(Q, `q${String(n++).padStart(5, "0")}.jpg`), type: "jpeg", quality: 90 });
  const segurar = async (ms) => { for (let i = 0; i < Math.round((ms / 1000) * FPS); i++) await foto(); };

  /* o cursor: a seta preta de contorno branco, desenhada por cima de tudo */
  let cx = VW * 0.55, cy = VH * 0.62;
  const cursor = (x, y, aperto = 0) => p.evaluate((x, y, aperto) => {
    let c = document.getElementById("__cursor");
    if (!c) {
      c = document.createElement("div");
      c.id = "__cursor";
      c.innerHTML = '<svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2 L2 22 L7.5 17 L11 25.5 L14.5 24 L11 15.8 L18.5 15.8 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))", transformOrigin: "2px 2px" });
      const o = document.createElement("div");
      o.id = "__onda";
      Object.assign(o.style, { position: "fixed", left: "0", top: "0", width: "34px", height: "34px", borderRadius: "50%", border: "2px solid rgba(20,24,26,.55)", zIndex: "2147483646", pointerEvents: "none", opacity: "0" });
      document.body.append(o, c);
    }
    c.style.transform = `translate(${x - 2}px, ${y - 2}px) scale(${1 - 0.12 * aperto})`;
    const o = document.getElementById("__onda");
    o.style.opacity = aperto > 0 ? String(0.7 * (1 - aperto)) : "0";
    o.style.transform = `translate(${x - 17}px, ${y - 17}px) scale(${0.6 + aperto * 1.2})`;
  }, x, y, aperto);
  const mover = async (x, y, ms) => {
    const de = { x: cx, y: cy };
    const passos = Math.max(2, Math.round((ms / 1000) * FPS));
    for (let i = 1; i <= passos; i++) {
      const t = suave(i / passos);
      cx = de.x + (x - de.x) * t;
      cy = de.y + (y - de.y) * t;
      await cursor(cx, cy);
      await foto();
    }
  };
  const apertar = async (acao) => {
    for (let i = 1; i <= 4; i++) { await cursor(cx, cy, i / 8); await foto(); }
    if (acao) await acao();
    for (let i = 5; i <= 9; i++) { await cursor(cx, cy, i / 9); await foto(); }
    await cursor(cx, cy, 0);
  };
  const ponto = (sel, texto) => p.evaluate((sel, texto) => {
    const el = [...document.querySelectorAll(sel)].find((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (!texto || e.textContent.trim() === texto);
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 60), y: r.top + r.height / 2 };
  }, sel, texto);
  const clicarEm = async (sel, texto, ms = 650) => {
    const c = await ponto(sel, texto);
    if (!c) throw new Error("não achei " + sel + " " + (texto || ""));
    await mover(c.x, c.y, ms);
    await apertar(() => p.evaluate((sel, texto) => {
      const el = [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (!texto || e.textContent.trim() === texto); });
      el.click();
    }, sel, texto));
  };
  const digitar = async (sel, texto, porLetra = 2) => {
    await p.focus(sel);
    for (const ch of texto) { await p.keyboard.type(ch); for (let k = 0; k < porLetra; k++) await foto(); }
  };

  // 1. a lista de peças
  await cursor(cx, cy);
  await segurar(1100);
  const marcas = { inicio: 0 };

  // 2. Cadastrar peça
  await clicarEm("button, a", "Cadastrar peça", 900);
  await p.waitForSelector('[role="dialog"] #campo-nome', { timeout: 20000 });
  marcas.janela = n;
  await segurar(700);

  // 3. a foto
  const add = await ponto('[role="dialog"] button', null).then(() => p.evaluate(() => {
    const el = [...document.querySelectorAll('[role="dialog"] button')].find((e) => /Adicionar fotos/.test(e.textContent));
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }));
  await mover(add.x, add.y, 700);
  await apertar();
  const inp = await p.$('[role="dialog"] input[type="file"]');
  await inp.uploadFile(FOTO);
  await p.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] img')].some((i) => i.complete && i.naturalWidth > 0), { timeout: 30000 });
  await segurar(700);

  // 4. o nome
  await clicarEm("#campo-nome", null, 600);
  await digitar("#campo-nome", "New Balance 9060 Branco e Cinza", 2);
  await segurar(350);

  // 5. a categoria
  await clicarEm("#campo-categoria", null, 500);
  await p.select("#campo-categoria", await p.evaluate(() => [...document.querySelector("#campo-categoria").options].find((o) => o.text === "Calçados").value));
  await segurar(450);

  // 6. o preço
  await clicarEm("#campo-preco", null, 550);
  await digitar("#campo-preco", "57000", 4);
  await segurar(700);

  // 7. os tamanhos: rola a janela por dentro até a grade
  const corpo = ".pn-peca__corpo";
  const de = await p.evaluate((s) => document.querySelector(s).scrollTop, corpo);
  const ate = await p.evaluate((s) => {
    const c = document.querySelector(s);
    const b = [...c.querySelectorAll("button")].find((x) => x.textContent.trim() === "33");
    return c.scrollTop + b.getBoundingClientRect().top - c.getBoundingClientRect().top - 210;
  }, corpo);
  const passos = Math.round(0.8 * FPS);
  for (let i = 1; i <= passos; i++) {
    await p.evaluate((s, y) => { document.querySelector(s).scrollTop = y; }, corpo, Math.round(de + (ate - de) * suave(i / passos)));
    await foto();
  }
  await segurar(300);
  for (const t of ["38", "39", "40", "41", "42"]) await clicarEm('[role="dialog"] button', t, 300);
  await segurar(900);

  // 8. Cadastrar
  await clicarEm('[role="dialog"] button', "Cadastrar peça", 800);
  await p.waitForFunction(() => !document.querySelector('[role="dialog"] #campo-nome'), { timeout: 30000 }).catch(() => {});
  marcas.salvou = n;
  await segurar(500);

  // 9. a peça na lista: rola até ela, o cursor descansa ao lado
  const alvo = await p.evaluate(() => {
    const t = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === "New Balance 9060 Branco e Cinza");
    return t ? t.getBoundingClientRect().top + scrollY : null;
  });
  if (alvo != null) {
    const y0 = await p.evaluate(() => scrollY);
    const y1 = Math.max(0, alvo - 330);
    const k = Math.round(1.1 * FPS);
    for (let i = 1; i <= k; i++) { await p.evaluate((y) => scrollTo(0, y), Math.round(y0 + (y1 - y0) * suave(i / k))); await foto(); }
    const c = await p.evaluate(() => {
      const t = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === "New Balance 9060 Branco e Cinza");
      const r = t.getBoundingClientRect();
      return { x: r.right + 30, y: r.top + r.height / 2 + 10 };
    });
    await mover(c.x, c.y, 700);
  }
  await segurar(2600);

  fs.writeFileSync(path.join(S, "marcas.json"), JSON.stringify({ ...marcas, total: n }, null, 1));
  console.log("quadros:", n, "segundos:", (n / FPS).toFixed(1), JSON.stringify(marcas));
  await b.close();
})().catch((e) => { console.error("FALHOU", e); process.exit(1); });
