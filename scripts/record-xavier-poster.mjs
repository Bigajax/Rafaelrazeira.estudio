// Captura uma imagem estática limpa do produto (sem overlays), usada como
// poster do vídeo e como fallback do modo "reduzir movimento".
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "https://xavier-s-sports.vercel.app";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});
const page = await browser.newPage();
await page.goto(`${BASE}/produto/camisa-brasil-home-2026-torcedor`, { waitUntil: "networkidle2", timeout: 60000 });
await page.keyboard.press("Escape").catch(() => {});
// esconde barras fixas (WhatsApp flutuante, CTA sticky, tab bar) para uma foto limpa
await page.evaluate(() => {
  for (const el of document.querySelectorAll("body *")) {
    if (getComputedStyle(el).position === "fixed") el.style.setProperty("display", "none", "important");
  }
});
// seleciona o M para o selo de pronta entrega aparecer
await page.evaluate(() => {
  const m = Array.from(document.querySelectorAll("#tamanhos button")).find((b) => /Tamanho M\b/.test(b.getAttribute("aria-label") || ""));
  m?.click();
});
await wait(600);
await page.evaluate(() => window.scrollTo(0, 0));
await wait(300);
await page.screenshot({ path: path.join(__dir, "out", "xavier-produto.jpg"), quality: 90, type: "jpeg" });
await browser.close();
console.log("poster limpo salvo em out/xavier-produto.jpg");
