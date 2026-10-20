/* ============================================================
   LER A PÁGINA: O QUE FAZ QUEM VEIO DE CADA CRIATIVO (19/10/2026)

   A fase 2 do docs/plano-performance-criativos.md. Puxa os eventos do
   Mixpanel (API de exportação, MIXPANEL_API_SECRET) das páginas de campanha,
   junta por pessoa e conta, por utm_content e por dia: visitantes reais,
   quem interagiu, rolou, viu a oferta, começou e enviou.

   A régua de "visitante real" é a mesma do scripts/mixpanel-funil.mjs, que
   continua sendo o diagnóstico detalhado. Este só grava a soma.

   USO:
     npx tsx scripts/ler-pagina.ts                      (últimos 30 dias, só mostra)
     npx tsx scripts/ler-pagina.ts --gravar
     npx tsx scripts/ler-pagina.ts --desde 2026-08-01 --gravar

   Junto do ler-meta.ts, toda semana.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";

function carregarEnv() {
  const arquivo = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    if (!linha.includes("=") || linha.trim().startsWith("#")) continue;
    const i = linha.indexOf("=");
    const chave = linha.slice(0, i).trim();
    if (!process.env[chave]) process.env[chave] = linha.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const PAGINAS = ["vitrine-digital", "vitrine-v4"];

/* Datacenters da Meta e saídas de proxy: o mesmo filtro do mixpanel-funil.mjs */
const DATACENTER = ["Prineville", "Luleå", "Lulea", "San Jose", "Ashburn", "Boardman", "Des Moines", "Council Bluffs", "Dublin", "Clonee"];

/* os nomes de antes de 03/08 lidos como os de agora (o NOME_NOVO do mixpanel-funil) */
const NOME_NOVO: Record<string, string> = {
  PageView: "Abriu a página",
  Scroll: "Rolou",
  ViewContent: "Viu a oferta",
  ClickCTA: "Clicou em CTA",
  InitiateCheckout: "Tocou no formulário",
  Lead: "Enviou o formulário",
  Saida: "Saiu da página",
};

type Evento = { event: string; properties: Record<string, unknown> & { time: number; distinct_id: string } };

/* o dia em BRT: o export vem em UTC, e em 14/08 isso inverteu uma conclusão */
const diaBRT = (seg: number) => new Date((seg - 3 * 3600) * 1000).toISOString().slice(0, 10);

async function principal() {
  carregarEnv();
  const segredo = process.env.MIXPANEL_API_SECRET ?? "";
  const dono = process.env.CRM_OWNER_ID ?? "";
  const banco = { url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, ""), chave: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "" };
  if (!segredo) throw new Error("Falta MIXPANEL_API_SECRET no .env.local.");
  const gravar = process.argv.includes("--gravar");
  if (gravar && (!banco.url || !banco.chave || !dono)) throw new Error("Para gravar: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e CRM_OWNER_ID no .env.local.");

  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const iDesde = process.argv.indexOf("--desde");
  const desde = iDesde > 0 ? process.argv[iDesde + 1] : new Date(Date.parse(hoje) - 29 * 864e5).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) throw new Error("--desde no formato 2026-08-01");

  /* um dia a mais em UTC para cada lado: o dia BRT atravessa a meia-noite UTC */
  const deUtc = new Date(Date.parse(desde) - 864e5).toISOString().slice(0, 10);
  const ateUtc = new Date(Date.parse(hoje) + 864e5).toISOString().slice(0, 10);
  const ontemUtc = new Date().toISOString().slice(0, 10);
  const where = `properties["page"] in ${JSON.stringify(PAGINAS)}`;
  const u = new URL("https://data.mixpanel.com/api/2.0/export");
  u.searchParams.set("from_date", deUtc);
  u.searchParams.set("to_date", ateUtc > ontemUtc ? ontemUtc : ateUtc);
  u.searchParams.set("where", where);
  // o to_date não pode passar de hoje em UTC; o que falta de hoje vem na próxima leitura
  const r = await fetch(u, { headers: { Authorization: "Basic " + Buffer.from(segredo + ":").toString("base64") } });
  if (!r.ok) throw new Error(`O Mixpanel recusou (${r.status}): ${(await r.text()).slice(0, 300)}`);
  const eventos: Evento[] = (await r.text())
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  for (const e of eventos) {
    e.event = NOME_NOVO[e.event] || e.event;
    if (e.properties.time > 1e12) e.properties.time = Math.round(e.properties.time / 1000);
  }

  /* por pessoa, numa página */
  type Pessoa = { pagina: string; eventos: Evento[] };
  const pessoas = new Map<string, Pessoa>();
  for (const e of eventos) {
    const pagina = String(e.properties.page);
    const k = `${pagina}|${e.properties.distinct_id}`;
    if (!pessoas.has(k)) pessoas.set(k, { pagina, eventos: [] });
    pessoas.get(k)!.eventos.push(e);
  }

  type Soma = { visitantes: number; interagiram: number; rolaram: number; viram_oferta: number; comecaram: number; enviaram: number };
  const somas = new Map<string, Soma & { utm_content: string; pagina: string; dia: string }>();
  let reais = 0;
  let semUtm = 0;
  for (const p of pessoas.values()) {
    p.eventos.sort((a, b) => a.properties.time - b.properties.time);
    const primeiro = p.eventos[0].properties;
    const url = String(primeiro.$current_url ?? "");
    if (/localhost|127\.0\.0\.1|vercel\.app\/.*preview/.test(url)) continue;
    if (primeiro.mp_country_code && primeiro.mp_country_code !== "BR") continue;
    if (DATACENTER.includes(String(primeiro.$city ?? ""))) continue;
    if (primeiro.$city === "Maringá") continue; // o próprio Rafael
    const dia = diaBRT(primeiro.time);
    if (dia < desde || dia > hoje) continue;
    reais += 1;

    // o primeiro toque vence: a utm_content do primeiro evento que tiver uma
    const utm = p.eventos.map((e) => e.properties.utm_content).find((v) => typeof v === "string" && v) as string | undefined;
    if (!utm) {
      semUtm += 1;
      continue;
    }
    const tem = (nome: string) => p.eventos.some((e) => e.event === nome);
    const fundo = Math.max(
      0,
      ...p.eventos.filter((e) => e.event === "Rolou").map((e) => Number(e.properties.profundidade) || 0),
      ...p.eventos.filter((e) => e.event === "Saiu da página").map((e) => Number(e.properties.profundidade_max) || 0),
    );
    const k = `${utm}|${p.pagina}|${dia}`;
    const s = somas.get(k) ?? { utm_content: utm, pagina: p.pagina, dia, visitantes: 0, interagiram: 0, rolaram: 0, viram_oferta: 0, comecaram: 0, enviaram: 0 };
    s.visitantes += 1;
    if (tem("Interagiu") || p.eventos.some((e) => e.event !== "Abriu a página" && e.event !== "Saiu da página")) s.interagiram += 1;
    if (fundo >= 50) s.rolaram += 1;
    if (tem("Viu a oferta")) s.viram_oferta += 1;
    if (tem("Tocou no formulário")) s.comecaram += 1;
    if (tem("Enviou o formulário")) s.enviaram += 1;
    somas.set(k, s);
  }

  console.log(`${eventos.length} eventos das páginas de campanha, ${reais} visitantes reais de ${desde} a ${hoje}, ${semUtm} sem utm_content.`);
  const porUtm = new Map<string, Soma>();
  for (const s of somas.values()) {
    const t = porUtm.get(s.utm_content) ?? { visitantes: 0, interagiram: 0, rolaram: 0, viram_oferta: 0, comecaram: 0, enviaram: 0 };
    for (const c of ["visitantes", "interagiram", "rolaram", "viram_oferta", "comecaram", "enviaram"] as const) t[c] += s[c];
    porUtm.set(s.utm_content, t);
  }
  for (const [utm, t] of [...porUtm].sort((a, b) => b[1].visitantes - a[1].visitantes).slice(0, 12))
    console.log(`  ${utm.slice(0, 34).padEnd(34)} ${String(t.visitantes).padStart(4)} visitantes  ${String(t.interagiram).padStart(4)} interagiram  ${String(t.comecaram).padStart(3)} começaram  ${String(t.enviaram).padStart(3)} enviaram`);

  if (!gravar) {
    console.log("\n(só mostrou; com --gravar vai para o CRM)");
    return;
  }
  const linhas = [...somas.values()].map((s) => ({ owner_id: dono, ...s, lido_em: new Date().toISOString() }));
  for (let i = 0; i < linhas.length; i += 500) {
    const g = await fetch(`${banco.url}/rest/v1/ads_pagina_dia?on_conflict=owner_id,utm_content,pagina,dia`, {
      method: "POST",
      headers: { apikey: banco.chave, Authorization: `Bearer ${banco.chave}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(linhas.slice(i, i + 500)),
    });
    if (!g.ok) throw new Error(`Não gravou (${g.status}): ${await g.text()}. Rodou a parte da fase 2 do supabase/ads-criativos.sql?`);
  }
  console.log(`\nGravado: ${linhas.length} linhas em ads_pagina_dia.`);
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
