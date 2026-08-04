// Captura as capas da página /portfolio: a primeira dobra de cada projeto
// em 1280×800, direto em WebP, para public/portfolio/{slug}.webp.
// Os sites sem deploy público (Star Point, Bella Black) são capturados de um
// dev server local: node scripts/capture-portfolio.mjs star-point=http://localhost:4001
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dir, "..", "public", "portfolio");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SITES = {
  "xaviers-sports": "https://xavier-s-sports.vercel.app",
  "pr-grife": "https://pr-grife.vercel.app",
  "pr-gold": "https://prgold.vercel.app",
  "filato-bene": "https://filato-bene.vercel.app",
  "solo-urb": "https://s-lo-urb.vercel.app",
  "lancellotti": "https://lancellotti-tattoo-clinic.vercel.app",
  "baixudos": "https://baixudos.vercel.app",
  "star-point": "https://star-point-wheat.vercel.app",
  "bella-black": "https://bella-black-three.vercel.app",
};

// slug=url na linha de comando entra na lista (ou substitui a URL padrão)
const alvos = { ...SITES };
for (const arg of process.argv.slice(2)) {
  const [slug, ...resto] = arg.split("=");
  alvos[slug] = resto.join("=");
}
// com argumentos, captura só o que foi pedido; sem, captura a lista inteira
const soPedidos = process.argv.length > 2;
const lista = soPedidos ? process.argv.slice(2).map((a) => a.split("=")[0]) : Object.keys(alvos);

fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
});

for (const slug of lista) {
  const url = alvos[slug];
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    // tempo para loaders e animações de entrada terminarem
    await wait(4000);
    // banner de cookies fecha antes da foto (o do Baixudos desfoca a página inteira)
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button")).find((x) => /^(aceitar|accept|concordo|ok)$/i.test(x.textContent.trim()));
      b?.click();
    });
    await wait(1200);
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(500);
    await page.screenshot({ path: path.join(OUT, `${slug}.webp`), type: "webp", quality: 85 });
    console.log(`ok  ${slug}  ←  ${url}`);
  } catch (e) {
    console.error(`ERRO ${slug}: ${e.message}`);
  }
  await page.close();
}
await browser.close();
