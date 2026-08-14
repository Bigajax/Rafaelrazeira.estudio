// Captura a PÁGINA INTEIRA de um site em largura de celular, para os
// mockups de iPhone da /estudio e da /landing-page (a imagem rola sozinha
// dentro do aparelho, ver .phone__feed em css/sections/cases.css).
//
// É diferente do scripts/capture-portfolio.mjs: aquele tira a primeira
// dobra em 1280x800 para a grade do /portfolio; este tira a página toda
// em 390px de largura com deviceScaleFactor 2, que é o formato dos
// assets/case-*.jpg (780 de largura).
//
//   node scripts/capture-case-mobile.mjs case-baixudos https://baixudos.vercel.app
//
// O terceiro argumento é a ALTURA em px de CSS (padrão 4500, que vira
// 9000 no arquivo por causa do deviceScaleFactor 2). Ele existe porque
// página inteira não serve: a Baixudos tem 13.400px de altura e sairia
// com 2,3MB. Numa página de tráfego pago isso é o pior arquivo possível,
// ainda mais numa que argumenta que o celular é onde tudo quebra. Os
// três assets que já existiam têm todos 780x9000, então esse é o recorte
// da casa: dá rolagem de sobra dentro do mockup e pesa ~700KB.
//
// puppeteer-core sob demanda: npm i --no-save puppeteer-core
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dir = path.dirname(fileURLToPath(import.meta.url));
// public/assets e não public/estudio/assets: a segunda é uma cópia
// antiga, e quem o navegador serve é a primeira (o /estudio e a
// /landing-page são servidos sem barra no fim, então o "assets/…"
// relativo do config resolve na raiz nas duas).
const OUT = path.join(__dir, "..", "public", "assets");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const [nome, url, alturaArg] = process.argv.slice(2);
const ALTURA = Number(alturaArg) || 4500;   // px de CSS; x2 no arquivo
if (!nome || !url) {
  console.error("uso: node scripts/capture-case-mobile.mjs <nome-do-arquivo> <url>");
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
await wait(3500);

// banner de cookies fecha antes da foto (o do Baixudos desfoca a página inteira)
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll("button")).find((x) => /^(aceitar|accept|concordo|ok)$/i.test(x.textContent.trim()));
  b?.click();
});
await wait(1000);

// rola devagar até o fim para acordar lazy-load e animações de entrada,
// depois volta ao topo: sem isso a captura de página inteira sai com
// buracos pretos onde as imagens ainda não tinham entrado
await page.evaluate(async () => {
  const passo = window.innerHeight * 0.8;
  for (let v = 0; v < document.body.scrollHeight; v += passo) {
    window.scrollTo(0, v);
    await new Promise((r) => setTimeout(r, 260));
  }
  window.scrollTo(0, 0);
});
await wait(1200);

const destino = path.join(OUT, `${nome}.jpg`);
const alturaReal = await page.evaluate(() => document.body.scrollHeight);
await page.screenshot({
  path: destino, type: "jpeg", quality: 80,
  clip: { x: 0, y: 0, width: 390, height: Math.min(ALTURA, alturaReal) },
});
const kb = (fs.statSync(destino).size / 1024).toFixed(0);
console.log(`ok  ${nome}.jpg  ${kb}KB  ←  ${url}`);
await browser.close();
