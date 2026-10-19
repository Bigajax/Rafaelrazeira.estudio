/* ============================================================
   AS PLACAS DO PERFORMANCE

   Renderiza docs/placas/placa.html em PNG 1080 x 1920 (o formato do
   Status e do Stories), uma por família, para mandar no WhatsApp.

   Uso:
     node scripts/render-placas.mjs                 -> as duas placas padrão (Loja Modelo)
     node scripts/render-placas.mjs --loja "Japa Store"   -> com o nome da loja
     node scripts/render-placas.mjs --so medida     -> só uma família

   Sai em docs/placas/placa-<familia>[-<loja>].png e .webp.
   Lembrete da casa: nunca mandar para uma loja uma placa com número que ela
   não atingiu como se fosse dela. Para a validação (etapa 0) a placa é a
   da Loja Modelo, e a pergunta é "postaria isso?".
   ============================================================ */

import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const args = process.argv.slice(2);
const opcao = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const loja = opcao("--loja");
const so = opcao("--so");
const familias = so ? [so] : ["medida", "registrada"];

const slug = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const base = pathToFileURL(resolve("docs/placas/placa.html")).href;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
try {
  const p = await browser.newPage();
  await p.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  for (const familia of familias) {
    const q = new URLSearchParams({ familia });
    if (loja) q.set("loja", loja);
    await p.goto(`${base}?${q}`, { waitUntil: "networkidle0" });
    await p.waitForSelector("body[data-pronto]");
    const nome = `docs/placas/placa-${familia}${loja ? "-" + slug(loja) : ""}`;
    const png = await p.screenshot({ type: "png" });
    await sharp(png).toFile(`${nome}.png`);
    await sharp(png).webp({ quality: 82 }).toFile(`${nome}.webp`);
    console.log(`  ${nome}.png  1080x1920`);
  }
} finally {
  await browser.close();
}
