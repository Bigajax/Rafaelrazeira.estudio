/* Monta o L16-04 (08/11/2026): o roteiro 2 (sem o Rafael) na linguagem da G4 e da V4,
   em três ganchos (A, B, C) e dois formatos (9:16 e 4:5). Camadas em legendas-c.html,
   compra na Iconic de compra-vertical.mp4 (gravar.mjs vertical), plim gerado aqui.
   Roteiro: docs/lotes/lote-16-roteiros-v4-g4.md.
   Uso: node montar-c.mjs <pasta com compra-vertical.mp4> [--previa] */
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
const PREVIA = process.argv.includes("--previa");
const FPS = 30, DUR = 30, TINTA = "0x14181a";
const VERSOES = ["A", "B", "C"];
const FORMATOS = {
  "9x16": { alto: 1920, vars: "--centro:760px;--legY:1010px;--pilhaTopo:300px;--tagTopo:270px;--tarjaY:1160px;--seloY:1262px" },
  "4x5": { alto: 1350, vars: "--centro:590px;--legY:990px;--pilhaTopo:110px;--tagTopo:40px;--tarjaY:1140px;--seloY:1236px" },
};
/* os trechos da gravação vertical (medidos em 08/11 quadro a quadro): o 41 é tocado aos
   11,6 s, o CEP digitado de 16,5 a 17,5, o PAC aos 20, o Pix aos 22 e o aprovado aos 24,5.
   Somam 11 s e ocupam 6 a 17 s do vídeo; o aprovado cai em 14,9 s, que é o plim. */
const TRECHOS = [[10.1, 12.0], [13.6, 15.6], [16.3, 18.6], [19.4, 20.6], [22.0, 23.2], [24.2, 26.6]];
const PLIM = 14.9;
const GANCHO_B = [24.3, 26.6]; /* a versão B abre no aprovado, que aparece 0,2 s depois */

const COMPRA = path.join(DIR, "compra-vertical.mp4");
const ff = (args) => execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "inherit"] });
const enc = ["-c:v", "libx264", "-preset", "fast", "-crf", "12", "-r", String(FPS), "-pix_fmt", "yuv420p", "-an"];
const caber = (f) => f === "9x16" ? "scale=1080:1920" : `scale=-2:1350,pad=1080:1350:(ow-iw)/2:0:color=${TINTA}`;

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--allow-file-access-from-files"] });
const pagina = async (f) => {
  const html = fs.readFileSync(path.join(AQUI, "legendas-c.html"), "utf8")
    .replace("MONOGRAMA", pathToFileURL("C:/Users/Rafael/rafael-razeira-estudio/public/assets/marca/rr-monograma.webp").href)
    .replace("<style>", `<style>:root{--alto:${FORMATOS[f].alto}px;${FORMATOS[f].vars}}`);
  const arq = path.join(DIR, `camadas-${f}.html`);
  fs.writeFileSync(arq, html);
  const p = await browser.newPage();
  await p.setViewport({ width: 1080, height: FORMATOS[f].alto, deviceScaleFactor: 1 });
  await p.goto(pathToFileURL(arq).href, { waitUntil: "networkidle0" });
  await p.evaluateHandle("document.fonts.ready");
  return p;
};

if (PREVIA) {
  /* quadros soltos por cima de um quadro da compra, para conferir o desenho */
  for (const f of Object.keys(FORMATOS)) {
    const fundo = path.join(DIR, `previa-fundo-${f}.png`);
    ff(["-ss", "11.8", "-i", COMPRA, "-frames:v", "1", "-vf", caber(f), fundo]);
    const p = await pagina(f);
    await p.evaluate(u => { document.body.style.background = `url(${u})`; }, pathToFileURL(fundo).href);
    for (const [v, t] of [["A", 2.6], ["C", 2.9], ["B", 2.5], ["A", 5.8], ["A", 8.5], ["A", 23.5], ["A", 29.5]]) {
      await p.evaluate((t, v) => render(t, v), t, v);
      await p.screenshot({ path: path.join(DIR, `previa-${f}-${v}-${t}.png`) });
    }
  }
  await browser.close();
  process.exit(0);
}

/* 1. as camadas: 3 a 30 s é igual nas três versões; só o gancho (0 a 3 s) muda */
for (const f of Object.keys(FORMATOS)) {
  const p = await pagina(f);
  const quadro = async (i, v, pasta) => {
    await p.evaluate((t, v) => render(t, v), i / FPS, v);
    await p.screenshot({ path: path.join(pasta, String(i).padStart(4, "0") + ".png"), omitBackground: true });
  };
  const comum = path.join(DIR, `camadas-${f}-comum`);
  fs.rmSync(comum, { recursive: true, force: true }); fs.mkdirSync(comum, { recursive: true });
  for (let i = 3 * FPS; i < DUR * FPS; i++) await quadro(i, "A", comum);
  for (const v of VERSOES) {
    const pasta = path.join(DIR, `camadas-${f}-${v}`);
    fs.rmSync(pasta, { recursive: true, force: true }); fs.mkdirSync(pasta, { recursive: true });
    for (let i = 0; i < 3 * FPS; i++) await quadro(i, v, pasta);
    for (let i = 3 * FPS; i < DUR * FPS; i++) {
      const n = String(i).padStart(4, "0") + ".png";
      fs.copyFileSync(path.join(comum, n), path.join(pasta, n));
    }
  }
  await p.close();
  console.log("camadas", f);
}
await browser.close();

/* 2. o plim (o mesmo do L16-01b) */
const plim = path.join(DIR, "plim.wav");
ff(["-f", "lavfi", "-i", "sine=frequency=1318:duration=0.9", "-f", "lavfi", "-i", "sine=frequency=1760:duration=0.9",
  "-filter_complex", "[0]afade=t=out:st=0.02:d=0.85,volume=0.5[a];[1]adelay=90|90,afade=t=out:st=0.1:d=0.8,volume=0.4[b];[a][b]amix=inputs=2:normalize=0,aecho=0.6:0.4:60:0.25", plim]);

/* 3. a base, em arquivos separados (o ffmpeg perdia quadros com muitos recortes e a
   sobreposição no mesmo comando, 07/11): a compra de 11 s, o gancho B de 3 s, e o fundo */
for (const f of Object.keys(FORMATOS)) {
  const alto = FORMATOS[f].alto;
  const compra = path.join(DIR, `c-compra-${f}.mp4`);
  const cortes = TRECHOS.map(([a, b], k) => `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS,fps=${FPS}[t${k}]`).join(";");
  ff(["-i", COMPRA, "-filter_complex", `${cortes};${TRECHOS.map((_, k) => `[t${k}]`).join("")}concat=n=${TRECHOS.length}:v=1:a=0,${caber(f)},setsar=1[o]`, "-map", "[o]", ...enc, compra]);
  const ganchoB = path.join(DIR, `c-ganchoB-${f}.mp4`);
  const resto = Math.round((3 - (GANCHO_B[1] - GANCHO_B[0])) * FPS);
  ff(["-i", COMPRA, "-filter_complex", `[0:v]trim=${GANCHO_B[0]}:${GANCHO_B[1]},setpts=PTS-STARTPTS,fps=${FPS},${caber(f)},setsar=1,tpad=stop_mode=clone:stop=${resto}[o]`, "-map", "[o]", "-frames:v", String(3 * FPS), ...enc, ganchoB]);
  const fundo = (seg, nome) => { const a = path.join(DIR, `c-fundo-${nome}-${f}.mp4`); ff(["-f", "lavfi", "-i", `color=c=${TINTA}:s=1080x${alto}:r=${FPS}:d=${seg}`, ...enc, a]); return a; };
  const f3 = fundo(3, "3"), f6 = fundo(6, "6"), f13 = fundo(13, "13");
  for (const v of VERSOES) {
    const partes = v === "B" ? [ganchoB, f3, compra, f13] : [f6, compra, f13];
    const lista = path.join(DIR, `c-lista-${f}-${v}.txt`);
    fs.writeFileSync(lista, partes.map(x => `file '${path.resolve(x).replace(/\\/g, "/")}'`).join("\n"));
    const base = path.join(DIR, `c-base-${f}-${v}.mp4`);
    ff(["-f", "concat", "-safe", "0", "-i", lista, ...enc, base]);
    /* 4. as camadas por cima */
    const so = path.join(DIR, `c-so-${f}-${v}.mp4`);
    fs.rmSync(so, { force: true });
    ff(["-i", base, "-framerate", String(FPS), "-i", path.join(DIR, `camadas-${f}-${v}`, "%04d.png"),
      "-filter_complex", `[0:v][1:v]overlay=0:0:format=auto,trim=0:${DUR},format=yuv420p[o]`, "-map", "[o]",
      "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-r", String(FPS), "-an", so]);
    /* 5. o som: o plim no aprovado (na B também no gancho) */
    const saida = path.join(DIR, `L16-04${v.toLowerCase()}-${f}.mp4`);
    const toques = v === "B" ? [0.2, PLIM] : [PLIM];
    const fc = `[1:a]asplit=${toques.length}${toques.map((_, k) => `[s${k}]`).join("")};`
      + toques.map((s, k) => `[s${k}]adelay=${Math.round(s * 1000)}|${Math.round(s * 1000)}[p${k}]`).join(";")
      + `;${toques.map((_, k) => `[p${k}]`).join("")}amix=inputs=${toques.length}:normalize=0,volume=20dB,apad[som]`;
    ff(["-i", so, "-i", plim, "-filter_complex", fc, "-map", "0:v", "-map", "[som]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-t", String(DUR), "-movflags", "+faststart", saida]);
    console.log(path.basename(saida), Math.round(fs.statSync(saida).size / 1024) + "KB");
  }
}
