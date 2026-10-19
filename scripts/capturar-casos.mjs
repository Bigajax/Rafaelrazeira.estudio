/* ============================================================
   AS CAPTURAS DOS CASOS (/casos/<slug>, 19/10/2026)

   A capa do notebook já existe: é a do /portfolio
   (public/portfolio/<slug>.webp, 1280x800). Este script tira a outra,
   a do CELULAR, que é onde a cliente da loja abre a vitrine: a primeira
   tela num aparelho de 390x844, em densidade 2, direto em WebP.

   Uso:
     node scripts/capturar-casos.mjs japa-modas arena-imports fulltime
     node scripts/capturar-casos.mjs japa-modas=https://outro-endereco

   O endereço vem de data/portfolio.ts (o mesmo do card), lido por regex
   como no capture-portfolio.mjs.

   Por que puppeteer com setViewport e não o chrome --headless: o headless
   pela linha de comando não desce de ~500px (ver a armadilha
   licao-headless-screenshots no cofre); a emulação de aparelho do
   puppeteer desce.
   ============================================================ */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dir, "..", "public", "casos");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const DADOS = fs.readFileSync(path.join(__dir, "..", "data", "portfolio.ts"), "utf8");
const SITES = Object.fromEntries(
  [...DADOS.matchAll(/slug: "([^"]+)"[^\n]*?url: "([^"]+)"/g)].map((m) => [m[1], m[2]]),
);

const pedidos = process.argv.slice(2).map((a) => {
  const [slug, ...resto] = a.split("=");
  return [slug, resto.length ? resto.join("=") : SITES[slug]];
});
if (!pedidos.length) {
  console.error("uso: node scripts/capturar-casos.mjs <slug> [<slug>=<url>] ...");
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
});

let falhou = 0;
for (const [slug, url] of pedidos) {
  if (!url) { console.error(`sem endereço para ${slug} em data/portfolio.ts`); falhou++; continue; }
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    await wait(4000);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) => /^(aceitar|accept|concordo|ok)$/i.test(x.textContent.trim()));
      b?.click();
    });
    await wait(1200);
    /* rola a primeira dobra e um pouco mais antes da foto: o que vem logo
       abaixo do topo é carregado preguiçoso e saía como faixa branca na
       base da captura (Full Time, 19/10) */
    for (let y = 0; y <= 2400; y += 400) { await page.evaluate((v) => window.scrollTo(0, v), y); await wait(250); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(1500);
    await page.screenshot({ path: path.join(OUT, `${slug}-celular.webp`), type: "webp", quality: 82 });
    console.log(`ok  ${slug}  ←  ${url}`);
  } catch (e) {
    console.error(`ERRO ${slug}: ${e.message}`);
    falhou++;
  } finally {
    await page.close();
  }
}
await browser.close();
process.exit(falhou ? 1 : 0);
