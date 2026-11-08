/* Monta o L16-01b (07/11/2026): a compra gravada no ritmo real (gravar.mjs
   vertical), uma legenda por passo (legendas-b.html) e um "plim" gerado no
   pagamento aprovado. Sem pessoa e sem voz, a pedido do Rafael ("sem eu
   aparecer neste primeiro momento").
   Uso: node montar-b.mjs <pasta com compra-vertical.mp4> */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
const req = createRequire("C:/Users/Rafael/rafael-razeira-estudio/package.json");
const puppeteer = req("puppeteer-core");
const FFMPEG = req("ffmpeg-static");
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DIR = process.argv[2] || ".";

/* os trechos da gravação vertical, no ritmo real; os tempos são os da folha
   desta gravação (regravou, confira de novo) e casam com o LEG do legendas-b */
const TRECHOS = [[0.0, 3.0], [7.0, 8.6], [11.4, 12.8], [13.2, 14.6], [15.4, 18.4], [19.0, 21.2], [22.2, 23.4], [23.6, 26.6]];
const ALTO = 1920, DUR = 20, FPS = 30, PLIM = 14.0;

/* 1. a legenda, quadro a quadro, transparente */
const html = fs.readFileSync(path.join(AQUI, "legendas-b.html"), "utf8")
  .replace("MONOGRAMA", pathToFileURL("C:/Users/Rafael/rafael-razeira-estudio/public/assets/marca/rr-monograma.webp").href)
  .replace("<style>", `<style>:root{--alto:${ALTO}px;--legY:1300px;--tagTopo:270px;--fimY:900px}`);
const pronto = path.join(DIR, "legendas-b-pronto.html");
fs.writeFileSync(pronto, html);
const quadros = path.join(DIR, "legenda-b");
fs.rmSync(quadros, { recursive: true, force: true }); fs.mkdirSync(quadros, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--allow-file-access-from-files"] });
const p = await browser.newPage();
await p.setViewport({ width: 1080, height: ALTO, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(pronto).href, { waitUntil: "networkidle0" });
await p.evaluateHandle("document.fonts.ready");
for (let i = 0; i < DUR * FPS; i++) {
  await p.evaluate(t => render(t), i / FPS);
  await p.screenshot({ path: path.join(quadros, String(i).padStart(4, "0") + ".png"), omitBackground: true });
}
await browser.close();

/* 2. o plim: duas notas curtas (Mi e Lá agudos) com queda rápida, gerado aqui */
const plim = path.join(DIR, "plim.wav");
execFileSync(FFMPEG, ["-y", "-f", "lavfi", "-i", "sine=frequency=1318:duration=0.9", "-f", "lavfi", "-i", "sine=frequency=1760:duration=0.9",
  "-filter_complex", "[0]afade=t=out:st=0.02:d=0.85,volume=0.5[a];[1]adelay=90|90,afade=t=out:st=0.1:d=0.8,volume=0.4[b];[a][b]amix=inputs=2:normalize=0,aecho=0.6:0.4:60:0.25", plim], { stdio: "ignore" });

/* 3. a montagem: os trechos, a última tela parada até o fim, a legenda e o som */
const usado = TRECHOS.reduce((s, [a, b]) => s + (b - a), 0);
/* a tela parada do fecho é o último quadro repetido (loop): o tpad só estendia 8
   quadros aqui e o vídeo acabava em 17 s (07/11) */
const [, ultimo] = TRECHOS[TRECHOS.length - 1];
const nFim = Math.round((DUR - usado) * FPS);
const cortes = TRECHOS.map(([a, b], k) => `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS,fps=${FPS}[t${k}]`).join(";")
  + `;[0:v]trim=${(ultimo - 0.05).toFixed(2)}:${ultimo},setpts=PTS-STARTPTS,fps=${FPS},trim=end_frame=1,loop=loop=${nFim - 1}:size=1:start=0,setpts=N/${FPS}/TB[tf]`;
const junta = TRECHOS.map((_, k) => `[t${k}]`).join("") + `[tf]concat=n=${TRECHOS.length + 1}:v=1:a=0[base]`;
/* em três passos (07/11): no mesmo comando, os nove recortes da gravação mais a
   legenda por cima davam 512 quadros em vez de 600 (o vídeo acabava em 17 s), embora
   cada parte sozinha saísse certa. A base vai para um arquivo intermediário quase sem
   perda, a legenda entra num comando à parte, e o som num terceiro. */
const base = path.join(DIR, "L16-01b-base.mp4");
for (const f of [base, path.join(DIR, "L16-01b-so-video.mp4")]) fs.rmSync(f, { force: true });
execFileSync(FFMPEG, ["-y", "-i", path.join(DIR, "compra-vertical.mp4"), "-filter_complex", `${cortes};${junta}`, "-map", "[base]",
  "-c:v", "libx264", "-preset", "fast", "-crf", "10", "-r", String(FPS), "-an", base], { stdio: ["ignore", "ignore", "inherit"] });
const soVideo = path.join(DIR, "L16-01b-so-video.mp4");
execFileSync(FFMPEG, ["-y", "-i", base, "-framerate", String(FPS), "-i", path.join(quadros, "%04d.png"),
  "-filter_complex", `[0:v][1:v]overlay=0:0:format=auto,trim=0:${DUR},format=yuv420p[out]`, "-map", "[out]",
  "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-r", String(FPS), "-an", soVideo], { stdio: ["ignore", "ignore", "inherit"] });
/* o som: o plim no aprovado, silêncio até o fim. Sem loudnorm (num áudio quase todo
   silêncio ele deixava o plim em −30 dB); o seno do lavfi nasce em −18 dB, +20 dB */
const saida = path.join(DIR, "L16-01b-tela-9x16.mp4");
const atraso = Math.round(PLIM * 1000);
execFileSync(FFMPEG, ["-y", "-i", soVideo, "-i", plim, "-filter_complex", `[1:a]adelay=${atraso}|${atraso},volume=20dB,apad[som]`,
  "-map", "0:v", "-map", "[som]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-t", String(DUR), "-movflags", "+faststart", saida], { stdio: "ignore" });
console.log(path.basename(saida), Math.round(fs.statSync(saida).size / 1024) + "KB", `(${usado.toFixed(1)}s de compra + ${(DUR - usado).toFixed(1)}s de fecho)`);
