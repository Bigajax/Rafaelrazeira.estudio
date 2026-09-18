/* ============================================================
   ACERTO: O ANÚNCIO DE CADA LEAD DO SITE, E OS CARDS QUE NUNCA NASCERAM

   Rode DEPOIS da migração de 18/09/2026 em supabase/crm.sql (as colunas
   `campanha` e `anuncio` em crm_leads). Ele confere isso antes de tudo.

     node scripts/acertar-anuncios-crm.mjs --dry     só mostra o plano
     node scripts/acertar-anuncios-crm.mjs           escreve

   O que ele faz, lendo a tabela `leads` (a captura do site, que nunca
   muda) do envio mais antigo para o mais novo:

   1. Para cada envio, procura o card em `crm_leads` pelo WhatsApp (sem o
      55, como a /api/lead grava) ou pelo e-mail.
   2. Achou e o card está sem atribuição: escreve `campanha` e `anuncio`
      do envio. Como a ordem é do mais antigo para o mais novo, vale o
      PRIMEIRO toque, a mesma regra da rota.
   3. Não achou: cria o card, do mesmo jeito que a /api/lead cria, com uma
      interação de entrada datada do envio original. É o caso dos leads de
      antes de 01/09, quando o CRM_OWNER_ID não existia em produção e o
      formulário só gravava em `leads`.

   Ele NÃO mexe em estágio, passo, notas ou qualquer coisa que o Rafael já
   tenha escrito no card: só preenche o que está vazio e cria o que falta.
   ============================================================ */

import { readFileSync } from "node:fs";

const DRY = process.argv.includes("--dry");

/* .env.local sem dotenv: o projeto não tem a dependência, e são três
   variáveis. */
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);
const URL_ = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE = env.SUPABASE_SERVICE_ROLE_KEY;
const DONO = env.CRM_OWNER_ID;
if (!URL_ || !CHAVE || !DONO) {
  console.error("Faltam SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou CRM_OWNER_ID no .env.local");
  process.exit(1);
}

const rest = async (caminho, opcoes = {}) => {
  const r = await fetch(`${URL_.replace(/\/$/, "")}/rest/v1/${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      apikey: CHAVE,
      Authorization: `Bearer ${CHAVE}`,
      ...(opcoes.headers || {}),
    },
  });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${opcoes.method || "GET"} ${caminho.split("?")[0]} → ${r.status} ${JSON.stringify(corpo).slice(0, 200)}`);
  return corpo;
};

/* ---------- as mesmas regras da /api/lead ----------
   Copiadas, e não importadas, porque pages/api/lead.js é um handler com
   efeitos no topo do módulo. Se uma mudar lá, mudar aqui. */
const TIPO_POR_PAGINA = {
  "e-commerce": "ecommerce",
  "vitrine-digital": "vitrine",
  "landing-page": "landing",
  "vitrine-digital-en": "vitrine",
  "landing-page-en": "landing",
};
const origemDaUtm = (l) => {
  const fonte = String(l.utm_source || "").toLowerCase();
  const meio = String(l.utm_medium || "").toLowerCase();
  if (!fonte && !meio) return "inbound";
  if (/paid|cpc|ppc|ads?$/.test(meio)) return "trafego_pago";
  if (/facebook|meta|instagram|^ig$|^fb$/.test(fonte)) return "trafego_pago";
  return "inbound";
};
const soDigitos = (v) => {
  const d = String(v ?? "").replace(/\D/g, "");
  if (!d) return null;
  return d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
};
const texto = (v, max = 120) => {
  const s = String(v == null ? "" : v).trim();
  return s ? s.slice(0, max) : null;
};

/* ---------- 0. o banco já tem as colunas? ---------- */
try {
  await rest("crm_leads?select=campanha,anuncio&limit=1");
} catch (e) {
  console.error("As colunas campanha/anuncio não existem ainda. Rode a migração de 18/09 em supabase/crm.sql e volte.\n", e.message);
  process.exit(1);
}

/* ---------- 1. ler tudo ---------- */
const envios = await rest(
  "leads?select=id,created_at,pagina,nome,empresa,whatsapp,email,canal,utm_source,utm_medium,utm_campaign,utm_content,investimento,plano,vende,produtos,site,necessidade&order=created_at.asc&limit=5000",
);
const cards = await rest(`crm_leads?owner_id=eq.${DONO}&select=id,nome,whatsapp,email,campanha,anuncio,created_at&limit=5000`);

const porZap = new Map();
const porEmail = new Map();
for (const c of cards) {
  if (c.whatsapp) porZap.set(c.whatsapp, c);
  if (c.email) porEmail.set(c.email.toLowerCase(), c);
}

const plano = { completar: [], criar: [], jaTinham: 0, semAtribuicao: 0, semChave: 0 };

for (const e of envios) {
  const zap = soDigitos(e.whatsapp);
  const email = e.email ? String(e.email).trim().toLowerCase() : null;
  const atrib = { campanha: texto(e.utm_campaign), anuncio: texto(e.utm_content) };
  const card = (zap && porZap.get(zap)) || (email && porEmail.get(email)) || null;

  if (card) {
    if (card.campanha || card.anuncio) {
      plano.jaTinham++;
    } else if (atrib.campanha || atrib.anuncio) {
      /* primeiro toque: marca em memória para o próximo envio da mesma
         pessoa não sobrescrever */
      Object.assign(card, atrib);
      plano.completar.push({ card, atrib, envio: e });
    } else {
      plano.semAtribuicao++;
    }
    continue;
  }

  if (!zap && !email) {
    plano.semChave++;
    continue;
  }

  const nome = texto(e.nome, 200) || (e.canal ? (/^https?:\/\/|\./.test(e.canal) ? e.canal : `@${String(e.canal).replace(/^@/, "")}`) : "(sem nome)");
  const novo = {
    owner_id: DONO,
    nome,
    empresa: texto(e.empresa, 200),
    whatsapp: zap,
    email,
    instagram: texto(e.canal, 200),
    cidade: null,
    tipo_projeto: TIPO_POR_PAGINA[e.pagina] || null,
    origem: origemDaUtm(e),
    estagio: "lista",
    ...atrib,
    notas:
      [e.vende, e.produtos, e.site, e.necessidade]
        .map((v) => texto(v, 500))
        .filter(Boolean)
        .join("\n")
        .slice(0, 2000) || null,
  };
  const resumo = [
    `Preencheu o formulário da /${e.pagina} em ${e.created_at.slice(0, 10)} (card criado pelo acerto de 18/09)`,
    e.investimento ? `investimento: ${e.investimento}` : "",
    e.plano ? `plano: ${e.plano}` : "",
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 400);

  plano.criar.push({ novo, resumo, envio: e });
  /* entra no índice para o segundo envio da mesma pessoa cair em "completar"
     ou "já tinha", nunca em "criar" de novo */
  const fantasma = { ...novo, id: null };
  if (zap) porZap.set(zap, fantasma);
  if (email) porEmail.set(email, fantasma);
}

/* ---------- 2. o plano, na tela ---------- */
console.log(`\n${envios.length} envios em leads · ${cards.length} cards no CRM\n`);
console.log(`completar atribuição em cards existentes: ${plano.completar.length}`);
for (const { card, atrib } of plano.completar) console.log(`  ${(card.nome || "").padEnd(28).slice(0, 28)} ← ${atrib.campanha || "-"} · ${atrib.anuncio || "-"}`);
console.log(`\ncriar cards que nunca nasceram: ${plano.criar.length}`);
for (const { novo, envio } of plano.criar) console.log(`  ${envio.created_at.slice(0, 10)}  ${novo.nome.padEnd(28).slice(0, 28)} ${novo.origem.padEnd(13)} ${novo.anuncio || "-"}`);
console.log(`\njá tinham atribuição: ${plano.jaTinham} · envios sem UTM: ${plano.semAtribuicao} · sem WhatsApp nem e-mail: ${plano.semChave}`);

if (DRY) {
  console.log("\n--dry: nada foi escrito.");
  process.exit(0);
}

/* ---------- 3. escrever ---------- */
let ok = 0;
for (const { card, atrib } of plano.completar) {
  if (!card.id) continue;
  await rest(`crm_leads?id=eq.${card.id}&campanha=is.null&anuncio=is.null`, { method: "PATCH", body: JSON.stringify(atrib) });
  ok++;
}
console.log(`\n${ok} cards completados`);

let criados = 0;
for (const { novo, resumo, envio } of plano.criar) {
  const r = await rest("crm_leads", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(novo) });
  const id = Array.isArray(r) ? r[0]?.id : r?.id;
  if (!id) continue;
  await rest("crm_interacoes", {
    method: "POST",
    body: JSON.stringify({ owner_id: DONO, lead_id: id, canal: "whatsapp", direcao: "entrada", resumo, created_at: envio.created_at }),
  });
  criados++;
}
console.log(`${criados} cards criados`);
