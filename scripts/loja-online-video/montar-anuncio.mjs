/* Monta o L16-01 (07/11/2026): os trechos da compra gravada (gravar.mjs
   vertical|retrato) com a camada de texto do anuncio.html por cima.
   Uso: node montar-anuncio.mjs <vertical|retrato> <pasta com compra-<formato>.mp4> */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
const req = createRequire("C:/Users/Rafael/rafael-razeira-estudio/package.json");
const puppeteer = req("puppeteer-core");
const FFMPEG = req("ffmpeg-static");
const AQUI = path.dirname(fileURLToPath(import.meta.url));

const [formato = "vertical", DIR = "."] = process.argv.slice(2);
/* os trechos de cada gravação [início, fim], na ordem do anúncio: a peça e o
   41 (texto 1), o frete e o Pix (texto 2), o aprovado (texto 3). Os tempos
   são os da folha de cada gravação; regravou, confira de novo. */
const FORMATOS = {
  /* o texto na metade de baixo (o check de aprovado mora no meio da tela), e acima
     dos ~380px que a interface do Reels cobre embaixo */
  vertical: { alto: 1920, meio: 1230, tagTopo: 270, trechos: [[7.2, 8.2], [11.9, 12.7], [19.6, 21.0], [22.3, 22.7], [23.6, 25.4]] },
  retrato: { alto: 1350, meio: 690, tagTopo: 60, trechos: null },
};
const F = FORMATOS[formato];
if (!F) throw new Error("formato: vertical ou retrato");
if (process.argv[4]) F.trechos = JSON.parse(process.argv[4]);
if (!F.trechos) throw new Error("passe os trechos do retrato como JSON no 3º argumento");
const DUR = 8, FPS = 30;

/* 1. a camada de texto, quadro a quadro, transparente */
const html = fs.readFileSync(path.join(AQUI, "anuncio.html"), "utf8")
  .replace("MONOGRAMA", pathToFileURL("C:/Users/Rafael/rafael-razeira-estudio/public/assets/marca/rr-monograma.webp").href)
  .replace("<style>", `<style>:root{--alto:${F.alto}px;--meio:${F.meio}px;--tagTopo:${F.tagTopo}px}`);
const pronto = path.join(DIR, `anuncio-${formato}.html`);
fs.writeFileSync(pronto, html);
const quadros = path.join(DIR, `texto-${formato}`);
fs.rmSync(quadros, { recursive: true, force: true }); fs.mkdirSync(quadros, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--allow-file-access-from-files"] });
const p = await browser.newPage();
await p.setViewport({ width: 1080, height: F.alto, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(pronto).href, { waitUntil: "networkidle0" });
await p.evaluateHandle("document.fonts.ready");
for (let i = 0; i < DUR * FPS; i++) {
  await p.evaluate(t => render(t), i / FPS);
  await p.screenshot({ path: path.join(quadros, String(i).padStart(4, "0") + ".png"), omitBackground: true });
}
await browser.close();

/* 2. os trechos da compra, emendados, e a última tela parada até o fim */
const usado = F.trechos.reduce((s, [a, b]) => s + (b - a), 0);
const cortes = F.trechos.map(([a, b], k) => `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[t${k}]`).join(";");
const junta = F.trechos.map((_, k) => `[t${k}]`).join("") + `concat=n=${F.trechos.length}:v=1:a=0,fps=${FPS},tpad=stop_mode=clone:stop_duration=${(DUR - usado).toFixed(2)}[base]`;
const filtro = `${cortes};${junta};[base][1:v]overlay=0:0:format=auto,trim=0:${DUR},format=yuv420p[out]`;
const saida = path.join(DIR, `L16-01-tela-${formato === "vertical" ? "9x16" : "4x5"}.mp4`);
execFileSync(FFMPEG, ["-y", "-i", path.join(DIR, `compra-${formato}.mp4`), "-framerate", String(FPS), "-i", path.join(quadros, "%04d.png"),
  "-filter_complex", filtro, "-map", "[out]", "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-r", String(FPS), "-movflags", "+faststart", "-an", saida], { stdio: "inherit" });
console.log(path.basename(saida), Math.round(fs.statSync(saida).size / 1024) + "KB", `(${usado.toFixed(1)}s de compra + ${(DUR - usado).toFixed(1)}s parado)`);
