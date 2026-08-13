/* Captura o catálogo da vérít.lab (verit-lab.vercel.app/pecas) para o
 * aparelho da seção COMO FUNCIONA da /vitrine-digital.
 *
 *   node scripts/capture-veritlab-catalogo.mjs
 *
 * ---------- por que este recorte, e não a página do topo ----------
 * O `.phoneSmall` tem 290x540 com `object-fit: cover` e `object-position:
 * top`, então de uma imagem de 500px de largura ele mostra só os ~930px do
 * topo, que são ~727px de site. Cabe UMA coisa, e a coisa certa aqui são as
 * categorias mais produto com preço: é exatamente o que os passos 02 e 03 da
 * seção prometem em texto.
 *
 * A captura começa rolada na GRADE, e a rolagem é calculada, não chutada: o
 * header é sticky, então ela para no ponto em que a primeira fileira nasce
 * exatamente embaixo dele. Duas tentativas descartadas antes desta:
 *   - do topo da página: enche o aparelho com a manchete "TODAS AS PEÇAS",
 *     que é bonita e não prova nada;
 *   - dos chips de categoria: a peça em destaque logo abaixo é a única
 *     RESERVADA do acervo e aparece sem preço, ou seja, a maior coisa da
 *     tela seria justamente a que não se pode comprar, numa seção cujo
 *     argumento é ver preço e pedir.
 * A grade resolve as duas: fileiras inteiras, cada peça com nome, medida e
 * preço, que é o que os passos 02 e 03 prometem em texto.
 *
 * O header sticky fica pregado no alto do recorte, e é o que se quer: dentro
 * de um aparelho, uma barra no topo com a marca lê como navegador de
 * verdade. O `.grain` (overlay fixed) fica: é a textura da marca, não
 * sujeira.
 *
 * dSF 2 e depois resize para 500: o aparelho exibe 290px, então 500 cobre
 * retina com folga sem inflar o arquivo. Mesma régua da capture-solourb.
 */
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = "https://verit-lab.vercel.app/pecas";
const SAIDA = "public/assets/demo/veritlab-catalogo.jpg";
const ALTURA = 1000;   // px de site capturados (o aparelho mostra ~727)

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: ALTURA, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(URL, { waitUntil: "networkidle0" });

/* a rolagem é medida, não chutada: primeira fileira da grade menos a altura
   do header sticky. A grade são os cards de duas colunas, então o alvo é o
   primeiro card com menos da largura inteira (o de cima é o destaque). */
const ROLAGEM = await page.evaluate(() => {
  const header = document.querySelector("header");
  const alturaHeader = header ? Math.round(header.getBoundingClientRect().height) : 0;
  const cards = [...document.querySelectorAll("a[href^='/pecas/']")];
  const larguraMax = Math.max(...cards.map(c => c.getBoundingClientRect().width));
  const grade = cards.find(c => c.getBoundingClientRect().width < larguraMax * .9);
  /* 22px de folga: os selos "02 ÚNICA" e "-13%" ficam no alto do card e
     sangram para fora da caixa dele, então parar no `top` exato do card
     ainda os corta pela metade. */
  return Math.round(grade.getBoundingClientRect().top + scrollY - alturaHeader - 22);
});
await page.evaluate((y) => scrollTo(0, y), ROLAGEM);
/* as imagens do acervo entram por lazy load: sem esta espera a grade sai
   com retângulos vazios onde deviam estar as peças */
await new Promise(r => setTimeout(r, 2500));

const png = await page.screenshot({ type: "png" });
await browser.close();

const img = sharp(png).resize({ width: 500 });
const { height } = await img.metadata();
await img.jpeg({ quality: 82, mozjpeg: true }).toFile(SAIDA);
const meta = await sharp(SAIDA).metadata();
console.log(`${SAIDA}: ${meta.width}x${meta.height}`);
console.log(`o aparelho mostra os ${Math.round(meta.width * 540 / 290)}px do topo, ou seja, o site de ${ROLAGEM}px a ${Math.round(ROLAGEM + (meta.width * 540 / 290) / (meta.width / 390 * 1))}px`);
