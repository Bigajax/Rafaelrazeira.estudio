/* ============================================================
   LER A META: O GASTO DE CADA ANÚNCIO DO ESTÚDIO (19/10/2026)

   A fase 1 do docs/plano-performance-criativos.md. Lê pela Marketing API, só
   leitura (usuário do sistema leitor-crm, ads_read, conta Eco):
   - a conta: status, gasto na vida e o último dia que gastou;
   - os anúncios: nome, conjunto, campanha, status e o utm_content do link;
   - os números por anúncio e por dia: gasto, impressões, plays de 3 s,
     ThruPlay, cliques, LPV, formulário, checkout e compra.
   Com --gravar, vai para ads_conta, ads_anuncios e ads_meta_dia, e a subaba
   Criativos do Performance mostra.

   USO:
     npx tsx scripts/ler-meta.ts                      (últimos 30 dias, só mostra)
     npx tsx scripts/ler-meta.ts --gravar
     npx tsx scripts/ler-meta.ts --desde 2026-08-01 --gravar

   Uma vez por semana, junto do conferir-vitrines.ts e do analisar-vitrines.ts
   (ou todo dia, quando houver anúncio no ar). Regravar o mesmo dia não duplica:
   a chave é anúncio + dia.
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

const GRAPH = "https://graph.facebook.com/v21.0";
type Acao = { action_type: string; value: string };

async function graph<T>(caminho: string, parametros: Record<string, string>, token: string): Promise<T> {
  const u = new URL(caminho.startsWith("http") ? caminho : `${GRAPH}/${caminho}`);
  for (const [k, v] of Object.entries(parametros)) u.searchParams.set(k, v);
  u.searchParams.set("access_token", token);
  const r = await fetch(u);
  const j = await r.json();
  if (j.error) throw new Error(`Meta: ${j.error.message}`);
  return j as T;
}

/* a Meta pagina tudo: segue o `next` até acabar */
async function todas<T>(caminho: string, parametros: Record<string, string>, token: string): Promise<T[]> {
  let pagina = await graph<{ data: T[]; paging?: { next?: string } }>(caminho, parametros, token);
  const linhas = [...pagina.data];
  while (pagina.paging?.next) {
    pagina = await graph(pagina.paging.next, {}, token);
    linhas.push(...pagina.data);
  }
  return linhas;
}

/* O link do anúncio mora em lugares diferentes conforme o criativo (vídeo, link,
   catálogo), e às vezes a UTM vem só nas url_tags. Quando é dinâmica
   ({{ad.id}}, como em agosto), vale o próprio ad_id. */
type Criativo = {
  url_tags?: string;
  object_story_spec?: { link_data?: { link?: string }; video_data?: { call_to_action?: { value?: { link?: string } } } };
  asset_feed_spec?: { link_urls?: { website_url?: string }[] };
};
function linkEUtm(c: Criativo | undefined, adId: string) {
  const link =
    c?.object_story_spec?.link_data?.link ??
    c?.object_story_spec?.video_data?.call_to_action?.value?.link ??
    c?.asset_feed_spec?.link_urls?.[0]?.website_url ??
    "";
  const achado = `${link}&${c?.url_tags ?? ""}`.match(/utm_content=([^&#]+)/);
  let utm = achado ? decodeURIComponent(achado[1]).trim() : null;
  if (utm && /\{\{.*\}\}/.test(utm)) utm = /ad\.id/.test(utm) ? adId : null;
  let destino: string | null = null;
  try {
    destino = link ? new URL(link).pathname : null;
  } catch {}
  return { utm, destino };
}

const soma = (acoes: Acao[] | undefined, tipos: string[]) => {
  for (const t of tipos) {
    const a = acoes?.find((x) => x.action_type === t);
    if (a) return Math.round(Number(a.value));
  }
  return 0;
};

async function principal() {
  carregarEnv();
  const token = process.env.META_ADS_TOKEN ?? "";
  const conta = process.env.META_AD_ACCOUNT_ID ?? "";
  const dono = process.env.CRM_OWNER_ID ?? "";
  const banco = { url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, ""), chave: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "" };
  if (!token || !conta) throw new Error("Falta META_ADS_TOKEN ou META_AD_ACCOUNT_ID no .env.local (o token do leitor-crm).");

  const gravar = process.argv.includes("--gravar");
  if (gravar && (!banco.url || !banco.chave || !dono)) throw new Error("Para gravar: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e CRM_OWNER_ID no .env.local.");

  // o período, no dia da conta (BRT)
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const iDesde = process.argv.indexOf("--desde");
  const desde = iDesde > 0 ? process.argv[iDesde + 1] : new Date(Date.parse(hoje) - 29 * 864e5).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) throw new Error("--desde no formato 2026-08-01");

  /* 1. a conta */
  const c = await graph<{ name: string; account_status: number; disable_reason: number; currency: string; amount_spent: string }>(
    conta,
    { fields: "name,account_status,disable_reason,currency,amount_spent" },
    token,
  );
  // o último dia com gasto, olhando 90 dias para trás (a conta pode estar parada há semanas)
  const dias90 = await todas<{ date_start: string; spend: string }>(`${conta}/insights`, { date_preset: "last_90d", time_increment: "1", fields: "spend" }, token);
  const ultimoGasto = dias90.filter((d) => Number(d.spend) > 0).map((d) => d.date_start).sort().at(-1) ?? null;
  console.log(`Conta ${c.name}: ${c.account_status === 1 ? "ativa" : `status ${c.account_status} (motivo ${c.disable_reason})`}, gasto na vida R$ ${(Number(c.amount_spent) / 100).toFixed(2)}, último dia com gasto: ${ultimoGasto ?? "nenhum em 90 dias"}.`);

  /* 2. os anúncios */
  type Anuncio = { id: string; name: string; effective_status: string; created_time: string; adset?: { id: string; name: string }; campaign?: { id: string; name: string }; creative?: Criativo };
  const anuncios = await todas<Anuncio>(
    `${conta}/ads`,
    {
      fields:
        "id,name,effective_status,created_time,adset{id,name},campaign{id,name},creative{url_tags,object_story_spec{link_data{link},video_data{call_to_action{value{link}}}},asset_feed_spec{link_urls{website_url}}}",
      limit: "100",
    },
    token,
  );
  const linhasAnuncio = anuncios.map((a) => {
    const { utm, destino } = linkEUtm(a.creative, a.id);
    return {
      owner_id: dono,
      ad_id: a.id,
      nome: a.name,
      status: a.effective_status,
      conjunto_id: a.adset?.id ?? null,
      conjunto: a.adset?.name ?? null,
      campanha_id: a.campaign?.id ?? null,
      campanha: a.campaign?.name ?? null,
      utm_content: utm,
      destino,
      criado_na_meta: a.created_time,
      lido_em: new Date().toISOString(),
    };
  });
  const semUtm = linhasAnuncio.filter((a) => !a.utm_content);
  console.log(`${anuncios.length} anúncios na conta, ${semUtm.length} sem utm_content no link (entram pelo nome).`);

  /* 3. os números por anúncio e por dia */
  type Dia = {
    ad_id: string;
    date_start: string;
    spend: string;
    impressions: string;
    reach?: string;
    inline_link_clicks?: string;
    actions?: Acao[];
    conversions?: Acao[];
    video_thruplay_watched_actions?: Acao[];
    video_p25_watched_actions?: Acao[];
    video_p50_watched_actions?: Acao[];
    video_p75_watched_actions?: Acao[];
    video_p100_watched_actions?: Acao[];
  };
  const dias = await todas<Dia>(
    `${conta}/insights`,
    {
      level: "ad",
      time_increment: "1",
      time_range: JSON.stringify({ since: desde, until: hoje }),
      fields:
        "ad_id,spend,impressions,reach,inline_link_clicks,actions,conversions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions",
      limit: "500",
    },
    token,
  );
  const video = (l?: Acao[]) => soma(l, ["video_view"]);
  const linhasDia = dias.map((d) => ({
    owner_id: dono,
    ad_id: d.ad_id,
    dia: d.date_start,
    gasto: Number(d.spend) || 0,
    impressoes: Number(d.impressions) || 0,
    alcance: Number(d.reach) || 0,
    plays_3s: soma(d.actions, ["video_view"]),
    thruplay: video(d.video_thruplay_watched_actions),
    p25: video(d.video_p25_watched_actions),
    p50: video(d.video_p50_watched_actions),
    p75: video(d.video_p75_watched_actions),
    p100: video(d.video_p100_watched_actions),
    cliques_link: Number(d.inline_link_clicks) || soma(d.actions, ["link_click"]),
    lpv: soma(d.actions, ["landing_page_view", "omni_landing_page_view"]),
    /* O formulário enviado é o Contact da vitrine, e a Meta não devolve ele como
       "contact" nas actions: vem em `conversions` (contact_website) e como a
       conversão personalizada "Vitrine: formulário enviado" (1540256587095933).
       No h27u: 94 nos dois, igual ao diário de 01/10. */
    formularios:
      soma(d.conversions, ["contact_website"]) ||
      soma(d.actions, ["offsite_conversion.custom.1540256587095933", "offsite_conversion.fb_pixel_contact"]),
    checkouts: soma(d.actions, ["offsite_conversion.fb_pixel_initiate_checkout", "initiate_checkout", "omni_initiated_checkout"]),
    compras: soma(d.actions, ["offsite_conversion.fb_pixel_purchase", "purchase", "omni_purchase"]),
    acoes: d.actions || d.conversions ? { actions: d.actions ?? [], conversions: d.conversions ?? [] } : null,
    lido_em: new Date().toISOString(),
  }));

  /* o resumo, por anúncio, do maior gasto para o menor */
  const nomeDe = new Map(linhasAnuncio.map((a) => [a.ad_id, a.utm_content ?? a.nome]));
  const porAnuncio = new Map<string, { gasto: number; imp: number; p3: number; form: number }>();
  for (const d of linhasDia) {
    const t = porAnuncio.get(d.ad_id) ?? { gasto: 0, imp: 0, p3: 0, form: 0 };
    t.gasto += d.gasto;
    t.imp += d.impressoes;
    t.p3 += d.plays_3s;
    t.form += d.formularios;
    porAnuncio.set(d.ad_id, t);
  }
  const total = [...porAnuncio.values()].reduce((s, t) => s + t.gasto, 0);
  console.log(`\nDe ${desde} a ${hoje}: R$ ${total.toFixed(2)} em ${porAnuncio.size} anúncios, ${linhasDia.length} linhas de dia.`);
  for (const [id, t] of [...porAnuncio].sort((a, b) => b[1].gasto - a[1].gasto).slice(0, 12))
    console.log(`  ${(nomeDe.get(id) ?? id).slice(0, 34).padEnd(34)} R$ ${t.gasto.toFixed(2).padStart(8)}  ${String(t.imp).padStart(6)} imp  hook ${t.imp ? ((100 * t.p3) / t.imp).toFixed(1) : "-"}%  ${t.form} form.`);

  // a leitura crua fica no PC também (tmp/ está no .gitignore), para conferir sem o banco
  fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "tmp", "ler-meta.json"), JSON.stringify({ desde, hoje, conta: c, ultimoGasto, anuncios: linhasAnuncio, dias: linhasDia }, null, 2));

  if (!gravar) {
    console.log("\n(só mostrou; com --gravar vai para o CRM)");
    return;
  }

  /* gravar: upsert pela chave, então regravar o mesmo dia só atualiza */
  const upsert = async (tabela: string, chave: string, linhas: object[]) => {
    for (let i = 0; i < linhas.length; i += 500) {
      const r = await fetch(`${banco.url}/rest/v1/${tabela}?on_conflict=${chave}`, {
        method: "POST",
        headers: { apikey: banco.chave, Authorization: `Bearer ${banco.chave}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(linhas.slice(i, i + 500)),
      });
      if (!r.ok) throw new Error(`Não gravou em ${tabela} (${r.status}): ${await r.text()}. Rodou o supabase/ads-criativos.sql?`);
    }
  };
  await upsert(
    "ads_conta",
    "owner_id,conta_id",
    [
      {
        owner_id: dono,
        conta_id: conta,
        nome: c.name,
        status: c.account_status,
        motivo: c.disable_reason,
        moeda: c.currency,
        gasto_vida: Number(c.amount_spent) / 100,
        ultimo_gasto_em: ultimoGasto,
        lido_em: new Date().toISOString(),
      },
    ],
  );
  await upsert("ads_anuncios", "owner_id,ad_id", linhasAnuncio);
  await upsert("ads_meta_dia", "owner_id,ad_id,dia", linhasDia);
  console.log("\nGravado: a subaba Criativos do Performance já mostra.");
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
