// A tela da Iconic dentro do mockup "Front View iPhone 16 Pro" do Unblast (09/11/2026, uso comercial livre).
// Uso: copiar para uma pasta o mock.jpg (o JPG do Unblast), o tela.webp (captura 390x844) e o iphone-compor.html,
// e rodar  NODE_PATH=<repo>/node_modules node iphone-compor.cjs <pasta>. Os CANTOS são os da tela no JPG de 2500x2857,
// medidos pela borda preta; a máscara tira o fundo branco e a sombra. Sai iphone-final.png (recorte 1060x1660).
const puppeteer = require("puppeteer-core"); const sharp = require("sharp"); const path = require("path");
(async () => {
  const S = process.argv[2];
  const cantos = [[1043.5, 695.8], [1706, 616.3], [1422.6, 2128.8], [735.7, 2175.6]];
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--allow-file-access-from-files"] });
  const p = await b.newPage(); await p.setViewport({ width: 2500, height: 2857 });
  await p.evaluateOnNewDocument(c => { window.CANTOS = c; }, cantos);
  await p.goto("file:///" + path.join(S, "iphone-compor.html").split(path.sep).join("/"), { waitUntil: "networkidle0" });
  await p.screenshot({ path: path.join(S, "composto.png") });
  await b.close();
  // a máscara: o aparelho é o que é escuro no mockup original; a sombra de baixo fica de fora
  const mk = await sharp(path.join(S, "mock.jpg")).raw().toBuffer({ resolveWithObject: true });
  const cp = await sharp(path.join(S, "composto.png")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = mk.info.width, H = mk.info.height; const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, o = (y * W + x) * 4;
    const L = (mk.data[i] + mk.data[i + 1] + mk.data[i + 2]) / 3;
    let a = y > 2245 ? 0 : Math.max(0, Math.min(1, (245 - L) / 45));
    out[o] = cp.data[i]; out[o + 1] = cp.data[i + 1]; out[o + 2] = cp.data[i + 2]; out[o + 3] = Math.round(a * 255);
  }
  // o miolo é opaco: os arcos claros do papel de parede original deixavam a tela furada.
  // O aparelho é convexo por linha: entre o primeiro e o último pixel firme, tudo opaco.
  for (let y = 0; y < H; y++) { let a0 = -1, a1 = -1;
    for (let x = 0; x < W; x++) if (out[(y * W + x) * 4 + 3] > 200) { if (a0 < 0) a0 = x; a1 = x; }
    for (let x = a0 + 1; a0 >= 0 && x < a1; x++) out[(y * W + x) * 4 + 3] = 255; }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).extract({ left: 700, top: 590, width: 1060, height: 1660 }).png().toFile(path.join(S, "iphone-final.png"));
  console.log("ok");
})();
