/* ============================================================
   AS PRANCHAS DA PROPOSTA

   O molde de proposta de 25/09/2026 troca a lista de "o que está
   incluso" por pranchas: capturas da vitrine do cliente com marcações
   numeradas por cima. Este script tira as capturas.

   Uso:
     node scripts/capturar-pranchas.mjs <cliente> <url-da-vitrine>
         -> mostra o mapa das seções da home e captura só o topo

     node scripts/capturar-pranchas.mjs <cliente> <url> --secoes fitness,camisas [--peca /produto/slug]
         -> captura o topo, cada seção pelo id (até 940px da tela de altura, cortada
            de cima) e a página de uma peça (a primeira da home, se --peca
            não vier)

   Sai em public/assets/proposta/<cliente>/*.webp, 1600px de largura, e
   imprime a largura e a altura de cada uma para o width/height do <img>.

   As posições das marcações (left/top em %) NÃO saem daqui: abrir a
   captura, achar a parte e medir. Depois conferir no navegador, porque
   marcação em cima de texto (o código da peça, o botão) esconde
   justamente o que ela aponta: aconteceu duas vezes no piloto da Fardo.
   ============================================================ */

import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const LARGURA = 1280;
const ALTURA_MAX = 940; // px da tela; sai com ~1175 na imagem de 1600

const [cliente, url, ...resto] = process.argv.slice(2);
if (!cliente || !url) {
  console.error("uso: node scripts/capturar-pranchas.mjs <cliente> <url> [--secoes a,b] [--peca /produto/slug]");
  process.exit(1);
}
const opcao = (nome) => {
  const i = resto.indexOf(nome);
  return i >= 0 ? resto[i + 1] : undefined;
};
const secoes = (opcao("--secoes") || "").split(",").filter(Boolean);
const saida = `public/assets/proposta/${cliente}/`;
mkdirSync(saida, { recursive: true });

const gravar = async (png, nome, corte) => {
  let img = sharp(png);
  if (corte) img = sharp(await img.extract(corte).toBuffer());
  const info = await img.resize(1600).webp({ quality: 80 }).toFile(saida + nome + ".webp");
  console.log(`  ${saida}${nome}.webp  ${info.width}x${info.height}`);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
try {
  const p = await browser.newPage();
  await p.setViewport({ width: LARGURA, height: 800, deviceScaleFactor: 2 });
  await p.goto(url, { waitUntil: "networkidle0" });

  /* Rolar a página inteira antes: imagem com lazy e IntersectionObserver
     só aparecem depois de passar por elas. */
  const altura = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < altura; y += 500) {
    await p.evaluate((y) => scrollTo(0, y), y);
    await new Promise((r) => setTimeout(r, 150));
  }
  await p.evaluate(() => scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 800));

  const mapa = await p.evaluate(() =>
    [...document.querySelectorAll("main > section, main > div")].map((e) => {
      const r = e.getBoundingClientRect();
      return {
        id: e.id,
        classe: String(e.className).split(" ")[0],
        topo: Math.round(r.top + scrollY),
        altura: Math.round(r.height),
        titulo: (e.querySelector("h1,h2,h3")?.textContent || "").trim().slice(0, 40),
      };
    }),
  );
  console.log("\nAs seções da home:");
  for (const s of mapa) console.log(`  #${s.id || "(sem id)"}  .${s.classe}  y=${s.topo}  h=${s.altura}  ${s.titulo}`);

  const inteira = await p.screenshot({ fullPage: true });
  const dpr = 2;

  /* O topo vai até o fim da primeira seção, e leva junto uma faixa
     curta logo abaixo (a de marcas, por exemplo). */
  let fimTopo = mapa[0] ? mapa[0].topo + mapa[0].altura : 800;
  if (mapa[1] && mapa[1].altura < 140) fimTopo = mapa[1].topo + mapa[1].altura;
  console.log("\nCapturas:");
  await gravar(inteira, "topo", { left: 0, top: 0, width: LARGURA * dpr, height: Math.min(fimTopo, ALTURA_MAX) * dpr });

  for (const id of secoes) {
    const s = mapa.find((m) => m.id === id);
    if (!s) {
      console.log(`  (não achei a seção #${id})`);
      continue;
    }
    await gravar(inteira, id, { left: 0, top: s.topo * dpr, width: LARGURA * dpr, height: Math.min(s.altura, ALTURA_MAX) * dpr });
  }

  if (secoes.length) {
    /* O Git Bash reescreve "/produto/x" como "C:/Program Files/Git/produto/x":
       fica só a parte a partir de /produto/. */
    const pedida = opcao("--peca")?.replace(/^.*?\/?produto\//i, "/produto/");
    const peca = pedida || (await p.evaluate(() => document.querySelector('a[href*="/produto/"]')?.getAttribute("href")));
    if (peca) {
      await p.goto(new URL(peca, url).href, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 800));
      await gravar(await p.screenshot(), "peca");
    } else {
      console.log("  (nenhuma página de peça achada: passar --peca)");
    }
  }
} finally {
  await browser.close();
}
