/* ============================================================
   CONVERSIONS API (Meta) — função serverless da Vercel.
   Recebe o Lead do browser e reenvia à Graph API com hashes SHA-256.
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
import crypto from "crypto";

const PIXEL_ID = "2445872572575348"; // ⬅ mesmo ID de js/lib/tracking.js
const GRAPH_URL = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`;

const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");

/* Normalizações exigidas pela Meta antes do hash */
const normEmail = (e) => String(e || "").trim().toLowerCase();
function normPhone(p){
  let d = String(p || "").replace(/\D/g, "").replace(/^0+/, "");
  if (d && !d.startsWith("55")) d = "55" + d;   // E.164 com DDI Brasil
  return d;
}

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

  const user_data = {
    client_user_agent: req.headers["user-agent"] || "",
    client_ip_address: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim(),
  };
  const em = normEmail(b.email);
  if (em) user_data.em = [sha256(em)];
  const ph = normPhone(b.phone);
  if (ph) user_data.ph = [sha256(ph)];
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

  const payload = {
    data: [{
      event_name: "Lead",
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
