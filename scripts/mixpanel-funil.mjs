/* ============================================================
   Puxa os eventos crus da Mixpanel e imprime o funil da vitrine.

   POR QUE EXISTE: a exportação pela interface da Mixpanel vem só com as
   colunas que estiverem marcadas na tela, e nas primeiras análises vieram sem
   `page` e sem `$current_url`, o que impede separar quem entrou pela vitrine
   de quem entrou por outra página. A API de exportação devolve TODAS as
   propriedades, sempre, sem depender de ninguém lembrar de marcar caixa.

   COMO USAR:
     node scripts/mixpanel-funil.mjs                    (ontem e hoje)
     node scripts/mixpanel-funil.mjs 2026-08-01 2026-08-05

   PRECISA DE: MIXPANEL_API_SECRET no .env.local.
   Onde achar: mixpanel.com → engrenagem → Project Settings → Access Keys.
   Use um Service Account ou o API Secret do projeto 4043044.
   ============================================================ */
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");

/* .env.local sem dependência: o script roda solto, fora do Next */
function carregarEnv() {
  try {
    for (const linha of fs.readFileSync(path.join(RAIZ, ".env.local"), "utf8").split("\n")) {
      const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
carregarEnv();

const SEGREDO = process.env.MIXPANEL_API_SECRET;
if (!SEGREDO) {
  console.error("Falta MIXPANEL_API_SECRET no .env.local.");
  console.error("mixpanel.com → engrenagem → Project Settings → Access Keys.");
  process.exit(1);
}

const ontem = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const hoje = new Date().toISOString().slice(0, 10);
const de = process.argv[2] || ontem;
const ate = process.argv[3] || hoje;

/* Datacenters da Meta e saídas de proxy. Nada disso é gente, e contar como
   se fosse já inflou a leitura em quase três vezes uma vez. */
const DATACENTER = ["Prineville", "Luleå", "Lulea", "San Jose", "Ashburn", "Boardman", "Des Moines", "Council Bluffs", "Dublin", "Clonee"];

console.log(`Puxando ${de} até ${ate}…`);
const r = await fetch(`https://data.mixpanel.com/api/2.0/export?from_date=${de}&to_date=${ate}`, {
  headers: { Authorization: "Basic " + Buffer.from(SEGREDO + ":").toString("base64") },
});
if (!r.ok) {
  console.error(`A Mixpanel recusou (${r.status}):`, (await r.text()).slice(0, 300));
  process.exit(1);
}

/* A API devolve JSON por linha, não um array: um evento por linha */
const linhas = (await r.text()).trim().split("\n").filter(Boolean);
const eventos = linhas.map((l) => JSON.parse(l)).filter((e) => e.properties.page === "vitrine-digital");
console.log(`${linhas.length} eventos no projeto, ${eventos.length} da vitrine-digital\n`);
if (!eventos.length) process.exit(0);

const bruto = path.join(RAIZ, `mixpanel-${de}_${ate}.json`);
fs.writeFileSync(bruto, JSON.stringify(eventos, null, 1));

const pessoas = new Map();
for (const e of eventos) {
  const id = e.properties.distinct_id;
  if (!pessoas.has(id)) pessoas.set(id, { eventos: [], p: e.properties });
  pessoas.get(id).eventos.push({ ev: e.event, t: e.properties.time, props: e.properties });
}

function classificar(v) {
  const { $city: cidade, mp_country_code: pais } = v.p;
  const url = String(v.p.$current_url || "");
  if (/localhost|127\.0\.0\.1|vercel\.app\/.*preview/.test(url)) return "teste (localhost)";
  if (pais && pais !== "BR") return "bot / datacenter";
  if (DATACENTER.includes(cidade)) return "bot / datacenter";
  if (cidade === "Maringá") return "você (Maringá)";
  return "visitante real";
}
for (const v of pessoas.values()) v.tipo = classificar(v);

const grupos = {};
for (const v of pessoas.values()) grupos[v.tipo] = (grupos[v.tipo] || 0) + 1;
console.log("=== quem apareceu ===");
Object.entries(grupos).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${k.padEnd(20)} ${n}`));

const reais = [...pessoas.values()].filter((v) => v.tipo === "visitante real");
if (!reais.length) { console.log("\nNenhum visitante real no período."); process.exit(0); }

const tem = (v, ev) => v.eventos.some((x) => x.ev === ev);
console.log(`\n=== funil dos ${reais.length} visitantes reais ===`);
for (const ev of ["PageView", "Scroll", "ViewContent", "ClickCTA", "InitiateCheckout", "Lead"]) {
  const n = reais.filter((v) => tem(v, ev)).length;
  const pct = ((n / reais.length) * 100).toFixed(0);
  console.log(`  ${ev.padEnd(18)} ${String(n).padStart(3)}  ${pct.padStart(3)}%  ${"█".repeat(Math.round(n / reais.length * 34))}`);
}

/* O que a instrumentação de leitura passou a responder: onde a pessoa parou */
console.log("\n=== até onde rolaram ===");
const faixas = { "não rolou": 0, "25%": 0, "50%": 0, "75%": 0, "100%": 0 };
for (const v of reais) {
  const saida = v.eventos.filter((x) => x.ev === "Saida").pop();
  const porScroll = Math.max(0, ...v.eventos.filter((x) => x.ev === "Scroll").map((x) => Number(x.props.profundidade) || 0));
  const max = saida ? Number(saida.props.profundidade_max) || porScroll : porScroll;
  faixas[max >= 100 ? "100%" : max >= 75 ? "75%" : max >= 50 ? "50%" : max >= 25 ? "25%" : "não rolou"]++;
}
for (const [k, n] of Object.entries(faixas)) {
  console.log(`  ${k.padEnd(10)} ${String(n).padStart(3)}  ${"█".repeat(Math.round(n / reais.length * 34))}`);
}

/* De onde vieram. `utm_source` usa o código da Meta: `ig` é Instagram, `fb` é
   Facebook, `msg` é Messenger e **`an` é Audience Network**, que é anúncio
   dentro de app e jogo de terceiros, onde muito clique é toque sem querer.
   Esta quebra existe porque na primeira campanha 84% dos visitantes vieram de
   `an` sem ninguém ter escolhido isso. */
const NOME_FONTE = { an: "Audience Network", ig: "Instagram", fb: "Facebook", msg: "Messenger" };
console.log("\n=== de onde vieram ===");
const porFonte = {};
for (const v of reais) {
  const f = v.p.utm_source || "(sem utm)";
  porFonte[f] = porFonte[f] || { n: 0, interagiu: 0 };
  porFonte[f].n++;
  if (v.eventos.some((x) => x.ev !== "PageView")) porFonte[f].interagiu++;
}
for (const [f, d] of Object.entries(porFonte).sort((a, b) => b[1].n - a[1].n)) {
  const rotulo = NOME_FONTE[f] || f;
  console.log(`  ${rotulo.padEnd(18)} ${String(d.n).padStart(3)} pessoas  ${String(d.interagiu).padStart(3)} passaram do PageView  ${Math.round(d.interagiu / d.n * 100)}%`);
}

const tempos = reais.map((v) => {
  const s = v.eventos.filter((x) => x.ev === "Saida").pop();
  if (s) return Number(s.props.segundos) || 0;
  const t = v.eventos.map((x) => x.t);
  return Math.max(...t) - Math.min(...t);
}).sort((a, b) => a - b);
const mediana = tempos[Math.floor(tempos.length / 2)];
console.log(`\n  tempo na página: mediana ${mediana}s | mais longo ${tempos[tempos.length - 1]}s`);
console.log(`  chegaram ao formulário: ${reais.filter((v) => tem(v, "InitiateCheckout")).length}`);
console.log(`  precisaram reabrir o WhatsApp: ${reais.filter((v) => v.eventos.some((x) => x.props.location === "reabrir_whats")).length}`);
console.log(`\n  eventos crus salvos em ${path.basename(bruto)}`);
