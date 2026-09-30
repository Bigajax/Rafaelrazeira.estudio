/* ============================================================
   BAIXAR O MATERIAL QUE O CLIENTE MANDOU PELO CHECKLIST (30/09/2026)

   O cliente preenche peça por peça em /entrega/<loja>-checklist.html, e
   tudo cai no bucket privado `material` (ver pages/api/material.js). Este
   script traz para o PC, pronto para cadastrar no painel da vitrine:

     <destino>/RESUMO.md              uma linha por peça: tem ou saiu,
                                      preço, tamanhos, cores, observação
     <destino>/fotos/<peça>/...       as fotos, com o nome da peça na pasta
     <destino>/respostas.json         o que veio, cru

   USO
     node scripts/material-cliente.mjs fulltime
     node scripts/material-cliente.mjs fulltime --destino "C:/outra/pasta"

   Sem --destino, vai para ~/Desktop/<loja>/_material (a pasta da vitrine),
   ou ~/Desktop/vitrines/<loja>/_material se for lá que ela mora. Foto que
   já foi baixada não baixa de novo: dá para rodar quantas vezes quiser.
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const loja = process.argv[2];
if (!loja || loja.startsWith("--")) {
  console.error("Uso: node scripts/material-cliente.mjs <loja> [--destino <pasta>]");
  process.exit(1);
}
const iDest = process.argv.indexOf("--destino");

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);
const URL_ = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const CHAVE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !CHAVE) {
  console.error("Faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}
const cab = { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` };

function destinoPadrao() {
  const desk = join(homedir(), "Desktop");
  for (const p of [join(desk, loja), join(desk, "vitrines", loja)]) if (existsSync(p)) return join(p, "_material");
  return join(desk, `material-${loja}`);
}
const destino = iDest > -1 ? process.argv[iDest + 1] : destinoPadrao();

/* os nomes das peças moram no próprio checklist (a lista PECAS) */
function pecasDoChecklist() {
  try {
    const html = readFileSync(new URL(`../public/entrega/${loja}-checklist.html`, import.meta.url), "utf8");
    const m = html.match(/var PECAS = (\[.*?\]);\n/s);
    return m ? JSON.parse(m[1]) : [];
  } catch {
    return [];
  }
}

const pasta = (s) =>
  String(s || "sem-nome")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "sem-nome";

const r = await fetch(`${URL_}/storage/v1/object/material/${loja}/respostas.json`, { headers: cab });
if (!r.ok) {
  console.error(`Nada ainda: o cliente não preencheu nada em /entrega/${loja}-checklist.html (${r.status}).`);
  process.exit(0);
}
const d = await r.json();
mkdirSync(destino, { recursive: true });
writeFileSync(join(destino, "respostas.json"), JSON.stringify(d, null, 2));

const pecas = pecasDoChecklist();
const nomeDe = {};
for (const p of pecas) nomeDe[p.id] = p.nome;
for (const n of d.novas || []) nomeDe[n.id] = `NOVA ${n.nome || "sem nome"}`;
nomeDe.logos = "logos das marcas";

/* ---------- as fotos ---------- */
let baixadas = 0, jaTinha = 0;
const pastaDe = {};
for (const [id, caminhos] of Object.entries(d.fotos || {})) {
  if (!caminhos.length) continue;
  const dir = join(destino, "fotos", pasta(nomeDe[id] || id));
  pastaDe[id] = dir;
  mkdirSync(dir, { recursive: true });
  for (const c of caminhos) {
    const arquivo = join(dir, c.split("/").pop());
    if (existsSync(arquivo)) { jaTinha++; continue; }
    const f = await fetch(`${URL_}/storage/v1/object/material/${c}`, { headers: cab });
    if (!f.ok) { console.warn(`  não baixou ${c} (${f.status})`); continue; }
    writeFileSync(arquivo, Buffer.from(await f.arrayBuffer()));
    baixadas++;
  }
}

/* ---------- o resumo ---------- */
/* os tamanhos na ordem da grade (PP antes de G), como o painel mostra */
const ORDEM = ["PP", "P", "M", "G", "GG", "XG", "Único", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "48", "7.75", "7.875", "8.0", "8.125", "8.25", "8.38", "8.5", "8.75"];
const naOrdem = (arr) => [...(arr || [])].sort((a, b) => (ORDEM.indexOf(a) + 1 || 99) - (ORDEM.indexOf(b) + 1 || 99));
const lista = (arr, outro) => [...naOrdem(arr), ...(outro ? [outro] : [])].join(", ") || "";
const cel = (s) => String(s || "").replace(/\|/g, "/").replace(/\r?\n/g, " ");
const nFotos = (id) => (d.fotos?.[id] || []).length || "";
const linhas = [];
linhas.push(`# Material de ${loja}`, "");
linhas.push(`Atualizado pelo cliente em ${d.atualizado ? new Date(d.atualizado).toLocaleString("pt-BR") : "?"}.`, "");
linhas.push(`- **Preço no site:** ${d.precoNoSite === "sim" ? "mostrar" : d.precoNoSite === "nao" ? 'deixar "Valor no WhatsApp"' : "não respondeu"}`);
linhas.push(`- **Banners:** ${d.banners === "aprovo" ? "aprovados" : d.banners === "trocar" ? `trocar: ${cel(d.bannersObs)}` : "não respondeu"}`);
linhas.push(`- **HostGator:** ${cel(d.hostgator) || "não respondeu"}`);
linhas.push(`- **Usa e-mail no domínio:** ${d.emailDominio === "sim" ? "SIM, não mexer nos nameservers" : d.emailDominio === "nao" ? "não" : "não respondeu"}`);
linhas.push(`- **WhatsApp dos pedidos:** ${cel(d.whatsapp) || "não respondeu"}`);
linhas.push(`- **E-mail do painel:** ${cel(d.email) || "não respondeu"}`);
if ((d.recado || "").trim()) linhas.push(`- **Recado:** ${cel(d.recado)}`);
linhas.push("", "## Marcas", "", (d.marcas || "(não mandou)").trim(), "");

const tabela = (titulo, itens) => {
  linhas.push(`## ${titulo}`, "");
  linhas.push("| Peça | Tem? | Preço | Promo | Tamanhos | Cores | Fotos | Obs |");
  linhas.push("|---|---|---|---|---|---|---|---|");
  for (const [id, nome, x] of itens) {
    const status = x.status === "tem" ? "tem" : x.status === "saiu" ? "**saiu**" : x.nova ? "nova" : "";
    linhas.push(`| ${cel(nome)} | ${status} | ${cel(x.preco)} | ${cel(x.promocao)} | ${cel(lista(x.tamanhos, x.outrosTamanhos))} | ${cel(lista(x.cores, x.outrasCores))} | ${nFotos(id)} | ${cel(x.obs)} |`);
  }
  linhas.push("");
};
tabela("As peças do site", pecas.map((p) => [p.id, p.nome, d.pecas?.[p.id] || {}]));
if ((d.novas || []).length) tabela("Peças novas", d.novas.map((n) => [n.id, n.nome || "sem nome", { ...n, nova: true }]));
writeFileSync(join(destino, "RESUMO.md"), linhas.join("\n"));

const respondidas = pecas.filter((p) => d.pecas?.[p.id]?.status).length;
console.log(`Material de ${loja} em ${destino}`);
console.log(`  peças respondidas: ${respondidas}/${pecas.length}, novas: ${(d.novas || []).length}`);
console.log(`  fotos: ${baixadas} novas, ${jaTinha} já estavam aqui`);
console.log(`  leia o RESUMO.md`);
