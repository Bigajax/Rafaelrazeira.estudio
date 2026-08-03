/* ============================================================
   CONVERSIONS API (Meta) — função serverless da Vercel.
   Recebe um evento do browser e reenvia à Graph API com hashes SHA-256.
   ------------------------------------------------------------
   TRÊS CONSUMIDORES: js/lib/tracking.js (site estático),
   components/ecommerce/tracking.ts e components/vitrine/tracking.ts.
   Os dois primeiros não mandam `event_name`, então o padrão é "Lead":
   não mudar esse default sem mexer neles.
   ------------------------------------------------------------
   Variáveis de ambiente (Vercel → Settings → Environment Variables):
   • META_CAPI_ACCESS_TOKEN  (obrigatória) — gere no Events Manager:
     dataset 2445872572575348 → Settings → Conversions API → Generate access token.
   • META_TEST_EVENT_CODE    (opcional) — código do Test Events para validação;
     remova depois de testar, senão os eventos ficam marcados como teste.
   O token NUNCA vai para o código do client — só existe aqui, no servidor.
   Local: esta rota só roda na Vercel (ou `vercel dev`); com `npm run dev`
   (serve estático) a chamada falha em silêncio, por design fire-and-forget.
   ============================================================ */
/* Normalização e hash em lib/meta-hash.js: a rota da venda fechada usa as
   MESMAS funções, senão o telefone daqui e o de lá viram hashes diferentes e
   a Meta não amarra a venda na visita. */
import { sha256, normEmail, normPhone, normNome } from "@/lib/meta-hash";

const PIXEL_ID = "2445872572575348"; // ⬅ mesmo ID de js/lib/tracking.js
const GRAPH_URL = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`;

/* Só estes eventos passam. Sem a lista, um erro de digitação no client
   cria um evento novo no dataset em vez de falhar, e o estrago só
   aparece semanas depois no Events Manager.
   Purchase NÃO entra aqui de propósito: esta rota é pública, e faturamento
   falso injetado por qualquer um destruiria a otimização da campanha. Ele
   vive em /api/venda-fechada, atrás de um segredo. */
const EVENTOS = new Set(["Lead", "Contact", "ViewContent", "InitiateCheckout", "PageView"]);

export default async function handler(req, res) {
  if (req.method !== "POST"){
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: "method not allowed" }));
  }
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token){
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: "META_CAPI_ACCESS_TOKEN ausente" }));
  }

  const b = req.body || {};
  if (!b.event_id){
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: "event_id obrigatório" }));
  }
  /* padrão "Lead" pelos consumidores antigos, que não mandam o campo */
  const event_name = String(b.event_name || "Lead");
  if (!EVENTOS.has(event_name)){
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: `event_name inválido: ${event_name}` }));
  }

  const user_data = {
    client_user_agent: req.headers["user-agent"] || "",
    client_ip_address: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim(),
  };
  const em = normEmail(b.email);
  if (em) user_data.em = [sha256(em)];
  const ph = normPhone(b.phone);
  if (ph) user_data.ph = [sha256(ph)];
  const fn = normNome(b.first_name);
  if (fn) user_data.fn = [sha256(fn)];
  /* external_id é a chave de casamento mais forte que sobra num formulário
     sem e-mail e sem telefone. O pixel hasheia sozinho no browser, então o
     servidor precisa hashear o MESMO valor cru para os dois baterem. */
  /* toLowerCase obrigatório: o browser manda o código da visita já em
     minúsculas justamente porque não está claro se o pixel normaliza antes de
     hashear. Os dois lados precisam aplicar a MESMA regra, senão os hashes
     divergem e a amarração não acontece, sem erro nenhum aparecer. */
  if (b.external_id) user_data.external_id = [sha256(String(b.external_id).trim().toLowerCase())];
  if (b.fbp) user_data.fbp = String(b.fbp);
  if (b.fbc) user_data.fbc = String(b.fbc);

  /* custom_data opcional (a vitrine manda valor da oferta e plano;
     a landing principal segue mandando só o essencial) */
  const custom_data = {};
  if (b.value != null && !Number.isNaN(Number(b.value))){
    custom_data.value = Number(b.value);
    custom_data.currency = String(b.currency || "BRL");
  }
  if (b.plano) custom_data.plano = String(b.plano);
  if (b.content_name) custom_data.content_name = String(b.content_name);
  if (b.content_category) custom_data.content_category = String(b.content_category);
  /* de qual botão veio o Lead: hero, steps, pricing_card, form, final,
     sticky, duvidas, final_falar, flutuante */
  if (b.cta_position) custom_data.cta_position = String(b.cta_position);

  const payload = {
    data: [{
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(b.event_id),
      action_source: "website",
      event_source_url: String(b.event_source_url || ""),
      user_data,
      ...(Object.keys(custom_data).length ? { custom_data } : {}),
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

  try{
    const r = await fetch(`${GRAPH_URL}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const corpo = await r.json().catch(() => ({}));
    res.statusCode = r.ok ? 200 : 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(r.ok ? { success: true } : { error: corpo }));
  }catch(err){
    res.statusCode = 502;
    res.end(JSON.stringify({ error: "falha ao contatar a Graph API" }));
  }
};
