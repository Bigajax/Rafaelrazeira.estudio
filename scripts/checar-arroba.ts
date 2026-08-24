/* ============================================================
   CHECAR ARROBA — a colheita de UM perfil, na mão

   Para quando um candidato a arroba aparece fora do fluxo (uma busca na
   web, um palpite, um lead que o Rafael anotou de ouvido) e precisa ser
   CONFERIDO antes de entrar em cadastro ou dossiê. É a mesma colheita da
   pesquisa (oficial primeiro, endpoint público de reserva), então a
   resposta distingue "não existe" de "não respondeu": a diferença que já
   descartou 18 leads errado quando foi ignorada.

   USO:
     npx tsx scripts/checar-arroba.ts cia.solagasta veradominguesbordados
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { perfilInstagram } from "@/lib/crm/pesquisa";

function carregarEnv() {
  const arquivo = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    if (!linha.includes("=") || linha.trim().startsWith("#")) continue;
    const i = linha.indexOf("=");
    const chave = linha.slice(0, i).trim();
    if (process.env[chave]) continue;
    process.env[chave] = linha.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
carregarEnv();

const arrobas = process.argv.slice(2).map((a) => a.replace(/^@/, ""));
if (!arrobas.length) {
  console.error("Passe um ou mais arrobas: npx tsx scripts/checar-arroba.ts <arroba> ...");
  process.exit(1);
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function principal() {
  for (const a of arrobas) {
    const c = await perfilInstagram(a);
    console.log(`\n@${a} · ${c.tipo}`);
    if (c.tipo === "ok") console.log(c.texto + (c.fraco ? "\n(PERFIL FRACO: não construir gancho)" : ""));
    await dormir(2200);
  }
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
