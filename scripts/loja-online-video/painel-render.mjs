/* Desenha o painel simulado quadro a quadro (render(t)) e monta o vídeo.
   Uso: node painel-render.mjs medir | gravar */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
const req = createRequire("C:/Users/Rafael/rafael-razeira-estudio/package.json");
const puppeteer = req("puppeteer-core");
const FFMPEG = req("ffmpeg-static");
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const modo = process.argv[2] || "medir";
const PROD = "C:/Users/Rafael/Desktop/vitrines/iconic-sneakers/public/produtos/";
const url = f => pathToFileURL(f).href;

/* a página com as fotos reais da Iconic no lugar dos marcadores */
let html = fs.readFileSync(path.join(AQUI, "painel.html"), "utf8")
  .replaceAll("ICONE", url("C:/Users/Rafael/rafael-razeira-estudio/public/assets/lojas/iconic-icone.webp"))
  .replaceAll("FOTO1", url(PROD + "new-balance-9060-azul-bebe-1.webp"))
  .replaceAll("FOTO2", url(PROD + "adidas-samba-og-rosa-renda-1.webp"))
  .replaceAll("FOTO3", url(PROD + "nike-dunk-low-panda-1.webp"))
  .replaceAll("FOTO4", url(PROD + "adidas-adizero-adios-pro-azul-1.webp"));
const pronto = path.join(AQUI, "painel-pronto.html");
fs.writeFileSync(pronto, html);

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--allow-file-access-from-files"] });
const p = await browser.newPage();
await p.setViewport({ width: 960, height: 600, deviceScaleFactor: 1.5 });
await p.goto(url(pronto), { waitUntil: "networkidle0" });
await p.evaluateHandle("document.fonts.ready");

if (modo === "medir") {
  const centro = async (t, sel) => p.evaluate((t, s) => { render(t); const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; }, t, sel);
  console.log("nova", await centro(3, "#nova"));
  console.log("btnEnv", await centro(7, "#btnEnv"));
  console.log("btnEnv depois", await centro(10.5, "#btnEnv"));
  console.log("nav-est", await centro(12.5, "#nav-est"));
  for (const t of [2.5, 7, 10.8, 15.5]) { await p.evaluate(t => render(t), t); await p.screenshot({ path: path.join(AQUI, `painel-t${t}.png`) }); }
} else {
  const FPS = 30, DUR = 16.5;
  const dir = path.join(AQUI, "quadros-painel");
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const n = Math.round(FPS * DUR);
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => render(t), i / FPS);
    await p.screenshot({ path: path.join(dir, String(i).padStart(5, "0") + ".jpg"), type: "jpeg", quality: 92 });
  }
  const base = path.join(AQUI, "painel-pedido");
  const ent = ["-y", "-framerate", String(FPS), "-i", path.join(dir, "%05d.jpg"), "-vf", "scale=1440:900:flags=lanczos,format=yuv420p"];
  execFileSync(FFMPEG, [...ent, "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-movflags", "+faststart", `${base}.mp4`], { stdio: "ignore" });
  execFileSync(FFMPEG, [...ent, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", `${base}.webm`], { stdio: "ignore" });
  execFileSync(FFMPEG, ["-y", "-i", path.join(dir, "00090.jpg"), "-vf", "scale=960:600", "-q:v", "3", `${base}-capa.jpg`], { stdio: "ignore" });
  for (const ext of [".mp4", ".webm", "-capa.jpg"]) console.log(path.basename(base + ext), Math.round(fs.statSync(base + ext).size / 1024) + "KB");
}
await browser.close();
