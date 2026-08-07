/* Prepara a foto da seção Quem Faz da /vitrine-digital.
 *
 * O PNG original (retrato gerado em 28/07, ~2,7MB) não entra no repo: este
 * script recebe o caminho dele por argumento e versiona só o resultado. A
 * imagem sai em P&B puro porque o duotone grafite/papel é feito em CSS
 * (mix-blend-mode em .quemPhoto): assim a cor da foto segue os tokens da
 * página sem regerar o arquivo a cada ajuste de paleta.
 *
 * 1100px de largura bastam: a coluna da foto exibe no máximo ~600px, que numa
 * tela retina pede ~1200px reais, e o next/image ainda gera as reduções.
 *
 *   node scripts/foto-quemfaz.mjs "C:\caminho\para\retrato.png"
 */
import { stat, writeFile } from "node:fs/promises";
import sharp from "sharp";

const origem = process.argv[2];
if (!origem) {
  console.error("uso: node scripts/foto-quemfaz.mjs <caminho-do-png>");
  process.exit(1);
}

const destino = "public/assets/rafael-quemfaz.jpg";
const antes = (await stat(origem)).size;
const buffer = await sharp(origem)
  .resize({ width: 1100 })
  .grayscale()
  .jpeg({ quality: 82 })
  .toBuffer();
await writeFile(destino, buffer);

const kb = (n) => Math.round(n / 1024);
console.log(`${destino}  ${kb(antes)}KB -> ${kb(buffer.length)}KB`);
