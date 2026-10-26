// PROVISÓRIO: fotografa as pranchas da página /pranchas-tmp/<id> em PNG.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const [id, pasta, prefixo] = process.argv.slice(2);
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-first-run"] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1200, height: 2100, deviceScaleFactor: 1 });
  await pg.goto(`http://localhost:3002/pranchas-tmp/${id}`, { waitUntil: "networkidle0", timeout: 240000 });
  await pg.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))); });
  await new Promise((r) => setTimeout(r, 1500));
  const els = await pg.$$("[data-prancha] > *");
  fs.mkdirSync(pasta, { recursive: true });
  let n = 0;
  for (const el of els) {
    n++;
    const arq = `${pasta}/${prefixo}-${String(n).padStart(2, "0")}.png`;
    await el.screenshot({ path: arq });
    const box = await el.boundingBox();
    console.log(arq, Math.round(box.width) + "x" + Math.round(box.height));
  }
  await b.close();
})().catch((e) => { console.error("ERRO", e.message); process.exit(1); });
