// o MacBook Pro 16 do Unblast (Creatoom) com a tela VAZADA, para o vídeo do painel rodar por baixo
// Uso: NODE_PATH=<repo>/node_modules node macbook-moldura.cjs <pasta com mock.jpg>  (o JPG do "MacBook Pro 16 Front View", 1260x1440, 09/11/2026)
const sharp = require("sharp");
(async () => {
  const D = process.argv[2];
  const { data, info } = await sharp(D + "/mock.jpg").raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels; const out = Buffer.alloc(W * H * 4);
  const TELA = { x0: 281, y0: 475, x1: 976, y1: 923 }, NOTCH = { x0: 593, x1: 667, y1: 488 };
  for (let y = 0; y < H; y++) {
    let a0 = -1, a1 = -1;
    for (let x = 0; x < W; x++) { const i = (y * W + x) * C; const L = (data[i] + data[i + 1] + data[i + 2]) / 3;
      out[(y * W + x) * 4] = data[i]; out[(y * W + x) * 4 + 1] = data[i + 1]; out[(y * W + x) * 4 + 2] = data[i + 2];
      const a = y > 981 ? 0 : Math.max(0, Math.min(1, (253 - L) / 12)); out[(y * W + x) * 4 + 3] = Math.round(a * 255);
      if (a > .8 && y <= 981) { if (a0 < 0) a0 = x; a1 = x; } }
    for (let x = a0 + 1; a0 >= 0 && x < a1; x++) out[(y * W + x) * 4 + 3] = 255;
  }
  // o vão da tela, com os cantos de cima arredondados (raio 9) e o notch mantido
  const r = 9;
  for (let y = TELA.y0; y < TELA.y1; y++) for (let x = TELA.x0; x < TELA.x1; x++) {
    if (y < NOTCH.y1 && x >= NOTCH.x0 && x < NOTCH.x1) continue;
    const cx = x < TELA.x0 + r ? TELA.x0 + r : x >= TELA.x1 - r ? TELA.x1 - r - 1 : x, cy = y < TELA.y0 + r ? TELA.y0 + r : y;
    if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
    out[(y * W + x) * 4 + 3] = 0;
  }
  const crop = { left: 200, top: 460, width: 860, height: 525 };
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).extract(crop).png().toFile(D + "/macbook-moldura.png");
  console.log("tela no recorte (% da largura e altura):", JSON.stringify({ left: (TELA.x0 - crop.left) / crop.width * 100, top: (TELA.y0 - crop.top) / crop.height * 100, width: (TELA.x1 - TELA.x0) / crop.width * 100, height: (TELA.y1 - TELA.y0) / crop.height * 100 }));
})();
