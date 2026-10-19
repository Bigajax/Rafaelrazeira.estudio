// Empacota o editor, a placa aprovada, fontes e exportador em um único HTML offline.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const ler = nome => readFile(resolve(nome), "utf8");
const json = valor => JSON.stringify(valor).replace(/</g, "\\u003c");
let fontes = await ler("docs/placas/fontes/fontes.css");
for (const nome of new Set([...fontes.matchAll(/url\(([^)]+)\)/g)].map(m => m[1]))) {
  const bytes = await readFile(resolve("docs/placas/fontes", nome));
  fontes = fontes.replaceAll(nome, `data:font/woff2;base64,${bytes.toString("base64")}`);
}
let placa = await ler("docs/placas/placa.html");
const marca = placa.match(/id="seta-performance" d="([^"]+)"/)[1];
placa = placa.replace(/<link[^>]*>/g, "").replace("<style>", `<style>\n${fontes}\n`);
let editor = await ler("docs/placas/editor-base.html");
const biblioteca = (await ler("node_modules/html-to-image/dist/html-to-image.js")).replace(/\/\/# sourceMappingURL=.*$/gm, "");
const logica = await ler("docs/placas/editor.js");
const licencas = (await Promise.all([
  "docs/placas/fontes/cormorantgaramond-OFL.txt",
  "docs/placas/fontes/inter-OFL.txt",
  "docs/placas/fontes/html-to-image-LICENSE"
].map(ler))).join("\n\n").replaceAll("--", "—");
editor = editor.replace("<head>", () => `<head>\n<!-- Fontes e exportador: licenças das bibliotecas incluídas neste arquivo.\n${licencas}\n-->`);
editor = editor.replace("/* FONTES_EMBUTIDAS */", () => fontes)
  .replace("MARCA_PERFORMANCE", () => marca)
  .replace("MODELO_PLACA", () => json(placa))
  .replace("FONTES_PLACA", () => json(fontes))
  .replace("/* BIBLIOTECA_EXPORTACAO */", () => biblioteca)
  .replace("/* LOGICA_EDITOR */", () => logica)
  .replace("PLANO_LINK", "../PLANO-MESTRE-MOLDE-PERFORMANCE-GAMIFICACAO-PLACAS.html");
await writeFile(resolve("docs/placas/molde.html"), editor);
console.log(`Molde offline: docs/placas/molde.html (${Math.round(Buffer.byteLength(editor) / 1024)} KB)`);
