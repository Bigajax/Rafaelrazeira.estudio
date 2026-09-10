// Fotografa os criativos estáticos da /landing-page em 1080x1350, um PNG por
// peça, em criativos/. A prancheta é scripts/criativos/landing-page.html.
//
//   node scripts/capture-criativos.mjs
//
// Sem argumento captura as três. Com argumento, só as pedidas:
//   node scripts/capture-criativos.mjs a c
//
// Por que element.screenshot e não uma viewport de 1080x1350: as três peças
// vivem na mesma prancheta, e fotografar por elemento garante o corte exato
// de cada uma sem depender de rolagem.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const PRANCHETA = path.join(__dir, "criativos", "landing-page.html");
const OUT = path.join(__dir, "..", "criativos");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PECAS = {
  // molde padrão (1080x1350), muda só o gancho da manchete
  a: "peca-a",   // a oferta
  b: "peca-b",   // o risco
  c: "peca-c",   // o diagnóstico
  d: "peca-d",   // o destino do clique
  e: "peca-e",   // quem faz
  f: "peca-f",   // risco zero
  // outra estrutura e outra cor
  g: "peca-g",   // a folha de orçamento
  h: "peca-h",   // a A invertida em grafite
  // outro formato
  "story-a": "peca-story-a",   // 1080x1920
  // lote 2 (10/09): as três diretas do conjunto da landing
  i: "peca-i",   // o preço
  j: "peca-j",   // o hábito
  k: "peca-k",   // os três números
};

const pedidas = process.argv.slice(2).filter((x) => PECAS[x]);
const lista = pedidas.length ? pedidas : Object.keys(PECAS);

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
  // deviceScaleFactor 1: a peça já nasce em 1080 de largura, que é o tamanho
  // que a Meta pede. Dobrar aqui só entregaria um arquivo de 4MB.
  defaultViewport: { width: 1280, height: 1500, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
await page.goto("file:///" + PRANCHETA.replace(/\\/g, "/"), { waitUntil: "networkidle2", timeout: 60000 });

// A prancheta ajusta o lockup depois que as fontes carregam e levanta a
// bandeira. Sem esperar por ela, a foto sai com a manchete no corpo base.
await page.waitForFunction("window.__pronto === true", { timeout: 30000 });
await wait(400);

// Conferência: se a Archivo não tiver carregado, o lockup sai em Arial e
// ninguém percebe olhando o log. Melhor quebrar aqui.
const fonteOk = await page.evaluate(() => document.fonts.check("800 150px Archivo"));
if (!fonteOk) {
  await browser.close();
  throw new Error("A Archivo não carregou. Sem ela o criativo sai com a letra errada.");
}

for (const chave of lista) {
  const el = await page.$("#" + PECAS[chave]);
  const destino = path.join(OUT, `criativo-${chave}.png`);
  await el.screenshot({ path: destino });
  const kb = Math.round(fs.statSync(destino).size / 1024);
  console.log(`✓ criativo-${chave}.png  (${kb} KB)`);
}

await browser.close();
console.log(`\nPNGs em ${OUT}`);
