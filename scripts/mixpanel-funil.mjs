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
     node scripts/mixpanel-funil.mjs 2026-11-09 2026-11-10 --pagina loja-online

   AS PÁGINAS (10/11/2026): até aqui o script só lia a "vitrine-digital", e
   para a /loja-online, a v2 e a /vitrine/iphone devolvia "0 eventos". Agora
   lê todas as páginas de anúncio (PAGINAS abaixo), com uma linha por página
   e dia, e `--pagina` restringe a uma só. As datas são dias de BRASÍLIA: o
   export da Mixpanel é em UTC, e pedir 13/08 trazia a noite do dia 12 (14/08).

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
const args = process.argv.slice(2);
const iPag = args.indexOf("--pagina");
const SO_PAGINA = iPag >= 0 ? args[iPag + 1] : null;
const datas = args.filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const de = datas[0] || ontem;
const ate = datas[1] || hoje;
/* as páginas que recebem anúncio; o /estudio e o resto ficam fora */
const PAGINAS = ["vitrine-digital", "vitrine-digital-en", "vitrine-digital-iphone", "loja-online", "loja-online-v2", "amostra"];
const diaUtc = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
/* o dia de Brasília de um evento: o time menos 3 horas */
const diaBrt = (t) => new Date(t * 1000 - 3 * 3600e3).toISOString().slice(0, 10);

/* Datacenters da Meta e saídas de proxy. Nada disso é gente, e contar como
   se fosse já inflou a leitura em quase três vezes uma vez. */
const DATACENTER = ["Prineville", "Luleå", "Lulea", "San Jose", "Ashburn", "Boardman", "Des Moines", "Council Bluffs", "Dublin", "Clonee", "Forest City", "Altoona", "Fort Worth", "Gallatin", "Springfield"];
/* o Rafael conferindo as próprias páginas */
const CASA = ["Maringá", "Sarandi"];

console.log(`Puxando ${de} até ${ate}…`);
const r = await fetch(`https://data.mixpanel.com/api/2.0/export?from_date=${diaUtc(de, -1)}&to_date=${[diaUtc(ate, 1), hoje].sort()[0]}`, {
  headers: { Authorization: "Basic " + Buffer.from(SEGREDO + ":").toString("base64") },
});
if (!r.ok) {
  console.error(`A Mixpanel recusou (${r.status}):`, (await r.text()).slice(0, 300));
  process.exit(1);
}

/* Em 03/08 os eventos ganharam nome em português (o mapa NOME_MP em
   components/vitrine/tracking.ts). Quem já estava gravado continua com o nome
   antigo para sempre, então qualquer período que atravesse essa data viria
   partido em dois: "PageView" até dia 3 e "Abriu a página" daí em diante, cada
   um com metade das pessoas. Traduzir na leitura junta as duas eras numa série
   só. Pode sair daqui quando não houver mais interesse em ler agosto de 2026. */
const NOME_NOVO = {
  PageView: "Abriu a página",
  Scroll: "Rolou",
  ViewContent: "Viu a oferta",
  ClickCTA: "Clicou em CTA",
  InitiateCheckout: "Tocou no formulário",
  Lead: "Enviou o formulário",
  Saida: "Saiu da página",
};

/* O `time` passou de segundos para milissegundos na mesma data, e a exportação
   devolve o que foi gravado. Sem normalizar, o "tempo na página" calculado por
   diferença de timestamps daria valores mil vezes maiores para os eventos
   novos. O corte em 1e12 é seguro: em segundos isso seria o ano 33.658. */
const emSegundos = (t) => (t > 1e12 ? Math.round(t / 1000) : t);

/* A API devolve JSON por linha, não um array: um evento por linha */
const linhas = (await r.text()).trim().split("\n").filter(Boolean);
/* O export devolve o MESMO evento mais de uma vez (534 linhas e 373
   $insert_id de 08 a 10/11). A tela da Mixpanel tira a repetição; aqui é à
   mão, senão quem abriu uma vez aparece abrindo três. */
const vistos = new Set();
const eventos = [];
for (const l of linhas) {
  const e = JSON.parse(l);
  const p = e.properties;
  if (p.$insert_id) {
    if (vistos.has(p.$insert_id)) continue;
    vistos.add(p.$insert_id);
  }
  p.time = emSegundos(p.time);
  const d = diaBrt(p.time);
  if (d < de || d > ate) continue;
  if (!(SO_PAGINA ? p.page === SO_PAGINA : PAGINAS.includes(p.page))) continue;
  e.event = NOME_NOVO[e.event] || e.event;
  eventos.push(e);
}
console.log(`${linhas.length} linhas no export, ${eventos.length} eventos de ${SO_PAGINA || "páginas de anúncio"} de ${de} a ${ate} (BRT)\n`);
if (!eventos.length) process.exit(0);

const bruto = path.join(RAIZ, `mixpanel-${de}_${ate}.json`);
fs.writeFileSync(bruto, JSON.stringify(eventos, null, 1));

/* pessoa = id + página: quem abre duas páginas conta em cada uma */
const pessoas = new Map();
eventos.sort((a, b) => a.properties.time - b.properties.time);
for (const e of eventos) {
  const id = e.properties.distinct_id + "|" + e.properties.page;
  if (!pessoas.has(id)) pessoas.set(id, { eventos: [], p: e.properties });
  pessoas.get(id).eventos.push({ ev: e.event, t: e.properties.time, props: e.properties });
}

/* ---------- a visita partida no iOS (10/11/2026) ----------
   Até o conserto em components/vitrine/tracking.ts, o navegador interno do
   Instagram e do Facebook no iPhone mandava o "Abriu a página" com um id e
   o resto da visita com outro. Para ler o que já foi gravado: o id sem
   "Abriu a página" junta no que abriu a mesma página, na mesma cidade e no
   mesmo sistema, até 3 minutos antes. */
const lista = [...pessoas.entries()];
for (const [k, v] of lista) {
  if (v.eventos.some((x) => x.ev === "Abriu a página")) continue;
  const t0 = v.eventos[0].t;
  const par = lista.find(([k2, w]) => k2 !== k && pessoas.has(k2)
    && w.p.page === v.p.page && w.p.$city === v.p.$city && w.p.$os === v.p.$os
    && w.eventos.some((x) => x.ev === "Abriu a página" && x.t <= t0 && t0 - x.t <= 180));
  if (!par) continue;
  par[1].eventos.push(...v.eventos);
  par[1].eventos.sort((a, b) => a.t - b.t);
  pessoas.delete(k);
}

function classificar(v) {
  const { $city: cidade, mp_country_code: pais } = v.p;
  const url = String(v.p.$current_url || "");
  if (/localhost|127\.0\.0\.1|vercel\.app\/.*preview/.test(url)) return "teste (localhost)";
  if (pais && pais !== "BR") return "bot / datacenter";
  if (DATACENTER.includes(cidade)) return "bot / datacenter";
  if (CASA.includes(cidade)) return "você (Maringá/Sarandi)";
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

/* ---------- gente x fantasma, por sistema (22/09/2026) ----------
   O "Interagiu" (primeiro toque, rolagem ou tecla) e o `visivel` do
   PageView separam a visita de gente da página pré-carregada pelo
   navegador interno do Instagram. Só aparece quando o período tem esses
   eventos; antes de 22/09 não existiam. */
const temInteragiu = reais.some((v) => tem(v, "Interagiu"));
if (temInteragiu) {
  console.log("\n=== gente x fantasma (por sistema) ===");
  const porOs = {};
  for (const v of reais) {
    const os = v.p.$os || "?";
    const g = (porOs[os] ??= { abriu: 0, escondida: 0, interagiu: 0, enviou: 0 });
    g.abriu++;
    const pv = v.eventos.find((x) => x.ev === "Abriu a página");
    if (pv && pv.props.visivel === false) g.escondida++;
    if (tem(v, "Interagiu")) g.interagiu++;
    if (tem(v, "Enviou o formulário")) g.enviou++;
  }
  for (const [os, g] of Object.entries(porOs).sort((a, b) => b[1].abriu - a[1].abriu)) {
    const pctI = ((g.interagiu / g.abriu) * 100).toFixed(0);
    const pctE = g.interagiu ? ((g.enviou / g.interagiu) * 100).toFixed(0) : "0";
    console.log(`  ${os.padEnd(10)} abriu ${String(g.abriu).padStart(3)} | nasceu escondida ${String(g.escondida).padStart(3)} | interagiu ${String(g.interagiu).padStart(3)} (${pctI}%) | enviou ${String(g.enviou).padStart(3)} (${pctE}% de quem interagiu)`);
  }
}

console.log(`\n=== funil dos ${reais.length} visitantes reais ===`);
for (const ev of ["Abriu a página", "Rolou", "Viu a oferta", "Clicou em CTA", "Tocou no formulário", "Enviou o formulário"]) {
  const n = reais.filter((v) => tem(v, ev)).length;
  const pct = ((n / reais.length) * 100).toFixed(0);
  console.log(`  ${ev.padEnd(21)} ${String(n).padStart(3)}  ${pct.padStart(3)}%  ${"█".repeat(Math.round(n / reais.length * 34))}`);
}

/* uma linha por dia de Brasília e página, para cruzar com a Meta */
console.log("\n=== por dia (BRT) e página ===");
const porPag = {};
for (const v of reais) {
  const k = `${diaBrt(v.eventos[0].t)}  ${String(v.p.page).padEnd(22)}`;
  const g = (porPag[k] ??= { n: 0, rolou: 0, form: 0, enviou: 0, anuncios: {} });
  g.n++;
  if (tem(v, "Rolou")) g.rolou++;
  if (tem(v, "Tocou no formulário")) g.form++;
  if (tem(v, "Enviou o formulário")) g.enviou++;
  const a = v.eventos.map((x) => x.props.utm_content).find(Boolean) || "sem utm";
  g.anuncios[a] = (g.anuncios[a] || 0) + 1;
}
for (const [k, g] of Object.entries(porPag).sort()) {
  const an = Object.entries(g.anuncios).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} ${n}`).join(", ");
  console.log(`  ${k} ${String(g.n).padStart(3)} pessoas | rolou ${g.rolou} | tocou no form. ${g.form} | enviou ${g.enviou} | ${an}`);
}

/* O que a instrumentação de leitura passou a responder: onde a pessoa parou */
console.log("\n=== até onde rolaram ===");
const faixas = { "não rolou": 0, "25%": 0, "50%": 0, "75%": 0, "100%": 0 };
for (const v of reais) {
  /* O MAIOR dos dois, e não o `Saida` mandando sozinho. O `Saida` dispara em
     `visibilitychange`, ou seja, também quando a pessoa troca de app e VOLTA:
     ele carimba a profundidade daquele instante e a leitura continua depois
     dele. Quem fazia isso era contado pelo que tinha lido até a interrupção.
     Na amostra de 03/08 eram 2 de 32, e um deles tinha lido a página inteira e
     entrava na faixa de 25%. */
  const porSaida = Math.max(0, ...v.eventos.filter((x) => x.ev === "Saiu da página").map((x) => Number(x.props.profundidade_max) || 0));
  const porScroll = Math.max(0, ...v.eventos.filter((x) => x.ev === "Rolou").map((x) => Number(x.props.profundidade) || 0));
  const max = Math.max(porSaida, porScroll);
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
  if (v.eventos.some((x) => x.ev !== "Abriu a página")) porFonte[f].interagiu++;
}
for (const [f, d] of Object.entries(porFonte).sort((a, b) => b[1].n - a[1].n)) {
  const rotulo = NOME_FONTE[f] || f;
  console.log(`  ${rotulo.padEnd(18)} ${String(d.n).padStart(3)} pessoas  ${String(d.interagiu).padStart(3)} passaram do PageView  ${Math.round(d.interagiu / d.n * 100)}%`);
}

const tempos = reais.map((v) => {
  /* Mesmo motivo do bloco acima: quem sai, volta e continua lendo tem vários
     `Saida`, e o que interessa é o mais longo, não o último a ser gravado. */
  const porSaida = Math.max(0, ...v.eventos.filter((x) => x.ev === "Saiu da página").map((x) => Number(x.props.segundos) || 0));
  if (porSaida) return porSaida;
  const t = v.eventos.map((x) => x.t);
  return Math.max(...t) - Math.min(...t);
}).sort((a, b) => a - b);
const mediana = tempos[Math.floor(tempos.length / 2)];
console.log(`\n  tempo na página: mediana ${mediana}s | mais longo ${tempos[tempos.length - 1]}s`);
console.log(`  chegaram ao formulário: ${reais.filter((v) => tem(v, "Tocou no formulário")).length}`);
console.log(`  precisaram reabrir o WhatsApp: ${reais.filter((v) => v.eventos.some((x) => x.props.location === "reabrir_whats")).length}`);
console.log(`\n  eventos crus salvos em ${path.basename(bruto)}`);
