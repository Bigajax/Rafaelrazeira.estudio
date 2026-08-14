/* Gera AVIF e WebP das capturas pesadas, mantendo o JPEG como fallback.
 *
 * Por que não next/image: as capturas de página inteira têm 5.500 e 8.965px de
 * altura, e o otimizador do Next não lida bem com elas (é o motivo de o
 * <img> cru estar comentado em components/ecommerce/sections.tsx). Então a
 * otimização acontece aqui, uma vez, e o resultado entra versionado.
 *
 * As dimensões NÃO mudam, e isso é medido, não chute: `.lapTela` tem 88% de
 * uma coluna de ~656px no desktop, ou seja ~563px de exibição, que numa tela
 * retina pede ~1126px reais; no celular a coluna cheia de ~350px num aparelho
 * de DPR 3 pede ~1050. Os 1440 de largura cobrem os dois com folga pequena.
 * Encolher aqui economizaria banda entregando captura borrada. Só o formato
 * muda. A altura também fica: o `--dur` da animação é calibrado por ela.
 *
 * Os dois formatos porque eles ganham em conteúdos diferentes: nas capturas
 * fotográficas o AVIF abre vantagem grande sobre o WebP, e nas telas de
 * interface (o painel, com texto e áreas chapadas) os dois empatam. O
 * <picture> oferece os dois e o navegador pega o primeiro que entende.
 *
 *   node scripts/webp-assets.mjs
 *
 * Rodar de novo depois de regerar qualquer captura com scripts/stitch.js.
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import sharp from "sharp";

/* `mob` = também gerar uma redução para o breakpoint de 720px. Só as duas
   capturas de página inteira precisam: elas nascem com 1440 de largura para o
   MacBook do desktop e são exibidas em ~319px num celular de 390. Mesmo a 2,6x
   de densidade isso é quase o dobro de pixel do que a tela usa, e são os dois
   arquivos mais pesados da página. O painel já tem recorte próprio de celular,
   feito à mão, que é outra coisa: lá muda o ENQUADRAMENTO, não só o tamanho. */
const ARQUIVOS = [
  { origem: "public/assets/case-xavier-desk.jpg", mob: 900 },
  { origem: "public/assets/case-prgrife-desk.jpg", mob: 900 },
  { origem: "public/assets/demo/xavier-painel.jpg" },
  { origem: "public/assets/demo/xavier-painel-mob.jpg" },
  /* As capturas de celular dos cases da /estudio e da /landing-page
     (780x9000 cada, ~760KB em JPEG). Entraram aqui em 14/08 depois de uma
     medição: a /landing-page fechava em 1,68MB, e 1,5MB disso eram duas
     dessas. Numa página de tráfego pago, que argumenta justamente que o
     celular é onde tudo quebra, esse era o pior lugar para gastar banda.
     Sem `mob`: elas já nascem na largura de celular, então não existe
     versão menor para gerar. */
  { origem: "public/assets/case-lancellotti.jpg" },
  { origem: "public/assets/case-baixudos.jpg" },
  { origem: "public/assets/case-solourb.jpg" },
  { origem: "public/assets/case-xavier.jpg" },
];

const kb = (n) => Math.round(n / 1024);

/* effort alto custa segundos aqui e poupa banda em todo carregamento.
   As qualidades não são iguais porque as escalas não são: 80 no WebP e 50
   no AVIF ficam no mesmo lugar percebido, e é onde a tabela do painel
   continua legível sem halo nas bordas do texto. */
async function gerar(entrada, destinoBase, antes, largura) {
  const base = largura ? sharp(entrada).resize({ width: largura }) : sharp(entrada);
  for (const [ext, buffer] of [
    [".avif", await base.clone().avif({ quality: 50, effort: 4 }).toBuffer()],
    [".webp", await base.clone().webp({ quality: 80, effort: 6 }).toBuffer()],
  ]) {
    await writeFile(destinoBase + ext, buffer);
    console.log(`${destinoBase}${ext}  ${kb(antes)}KB -> ${kb(buffer.length)}KB  (-${Math.round((1 - buffer.length / antes) * 100)}%)`);
  }
}

for (const { origem, mob } of ARQUIVOS) {
  const entrada = await readFile(origem);
  const antes = (await stat(origem)).size;
  const semExtensao = origem.replace(/\.jpe?g$/i, "");
  await gerar(entrada, semExtensao, antes);
  /* o sufixo -720 diz a largura do BREAKPOINT, não a do arquivo: é o número
     que aparece na media query do <picture>, e é por ele que se procura */
  if (mob) await gerar(entrada, `${semExtensao}-720`, antes, mob);
}
