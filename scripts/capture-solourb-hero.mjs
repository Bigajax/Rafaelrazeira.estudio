/* Captura a Sölo Urb (s-lo-urb.vercel.app) inteira em largura de celular para
 * o mockup do hero da /vitrine-digital: a página rola em loop dentro do
 * aparelho, então a captura precisa ser a VITRINE COMPLETA, do topo ao rodapé.
 *
 * Costurada dobra a dobra em vez de fullPage: o fullPage do puppeteer
 * corrompe o fim de páginas muito altas (mesmo motivo do antigo stitch.js das
 * capturas desktop). Elementos fixed/sticky são escondidos depois da primeira
 * dobra, senão o header e o botão de WhatsApp se repetem em cada emenda.
 *
 * dSF 2: o aparelho exibe ~280px de largura, e numa tela retina isso pede
 * ~560px reais; os 780px capturados cobrem com folga sem inflar o arquivo.
 *
 *   node scripts/capture-solourb-hero.mjs
 *
 * Depois de rodar, conferir o --dur do .phoneCover no hero: a régua da página
 * é ~250px de rolagem por segundo na altura EXIBIDA (o script imprime a conta).
 */
import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = "https://s-lo-urb.vercel.app/";
const LARGURA = 390;
const DOBRA = 844;
const DSF = 2;
const DESTINO = "public/assets/demo/solourb-vitrine.jpg";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: LARGURA, height: DOBRA, deviceScaleFactor: DSF });
await page.goto(URL, { waitUntil: "networkidle0", timeout: 90000 });
/* rolagem completa antes de capturar: carrega lazy e dispara reveals */
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await wait(1500);

const alturaTotal = await page.evaluate(() => document.body.scrollHeight);
const fatias = [];
for (let y = 0; y < alturaTotal; y += DOBRA) {
  await page.evaluate((topo) => {
    window.scrollTo(0, topo);
    /* da segunda dobra em diante, nada fixo entra na foto */
    if (topo > 0) {
      document.querySelectorAll("*").forEach((el) => {
        const p = getComputedStyle(el).position;
        if (p === "fixed" || p === "sticky") el.style.visibility = "hidden";
      });
    }
  }, y);
  await wait(350);
  /* a última dobra sobrepõe a anterior: recorta só o que falta */
  const sobra = Math.min(DOBRA, alturaTotal - y);
  const shot = await page.screenshot({ type: "png" });
  const recorte = await sharp(shot)
    .extract({ left: 0, top: (DOBRA - sobra) * DSF, width: LARGURA * DSF, height: sobra * DSF })
    .toBuffer();
  fatias.push({ buf: recorte, h: sobra * DSF });
}
await browser.close();

const larguraPx = LARGURA * DSF;
const alturaPx = fatias.reduce((s, f) => s + f.h, 0);
let topo = 0;
const composicao = fatias.map((f) => { const c = { input: f.buf, left: 0, top: topo }; topo += f.h; return c; });
const costurado = await sharp({ create: { width: larguraPx, height: alturaPx, channels: 3, background: "#fff" } })
  .composite(composicao)
  .png()
  .toBuffer();

/* 500px de largura final: AVIF e WebP têm teto de ~16383px por dimensão, e a
   captura crua de 780px passa de 25 mil de altura. Em 500 a Sölo Urb inteira
   fica logo abaixo do teto, e o aparelho exibe ~280px, então sobra nitidez
   até em tela retina. */
const final = await sharp(costurado).resize({ width: 500 }).jpeg({ quality: 80 }).toBuffer();
await writeFile(DESTINO, final);

/* derivados no padrão da página (AVIF ganha nas fotos, WebP empata em UI) */
for (const [ext, buffer] of [
  [".avif", await sharp(final).avif({ quality: 50, effort: 4 }).toBuffer()],
  [".webp", await sharp(final).webp({ quality: 80, effort: 6 }).toBuffer()],
]) {
  await writeFile(DESTINO.replace(/\.jpg$/, ext), buffer);
}

/* o quadro do topo entra na primeira carga (padrão do antigo vídeo do hero:
   pôster leve primeiro, o rolo completo só depois do evento `load`) */
const still = await sharp(final).extract({ left: 0, top: 0, width: 500, height: 1082 }).jpeg({ quality: 82 }).toBuffer();
await writeFile(DESTINO.replace(/vitrine\.jpg$/, "hero-still.jpg"), still);

const kb = (n) => Math.round(n / 1024);
const meta = await sharp(final).metadata();
/* altura exibida no aparelho ≈ 280px de largura; --dur pela régua de ~250px/s */
const durSugerido = Math.round((meta.height * (280 / 500)) / 250);
console.log(`${DESTINO}  ${meta.width}x${meta.height}  ${kb(final.length)}KB  still ${kb(still.length)}KB`);
console.log(`--dur sugerido: ${durSugerido}s`);
