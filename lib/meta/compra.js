/* ============================================================
   O PURCHASE DA COMPRA DIRETA (20/10/2026)

   A campanha da /vitrine-v4 otimizava "toque em pagar", e quem toca não é
   quem paga. Este é o evento de quem pagou: o webhook do Mercado Pago chama
   esta função quando o Pix da entrada é aprovado, e a Meta passa a procurar
   gente parecida com quem pagou de verdade.

   • Sai do servidor e só daqui: o valor e o status vêm da consulta à API do
     Mercado Pago, nunca do browser. É a mesma razão de o Purchase não estar
     no /api/meta-capi, que é público.
   • event_id `mp-<id do pagamento>`: o Mercado Pago repete o aviso, e a Meta
     descarta o repetido pelo id. Um pagamento, uma compra.
   • As chaves de casamento são as que o checkout guardou no `metadata`
     (pages/api/proposta-pagamento.js): fbp, fbc, IP, navegador e o código da
     visita (o mesmo external_id do pixel), mais o e-mail do pagador.
   • Nunca derruba o caminho do dinheiro: erro vira log, e a baixa no Caixa
     já aconteceu antes desta função ser chamada.
   ============================================================ */
import { sha256, normEmail, normNome } from "@/lib/meta-hash";

const PIXEL_ID = "2445872572575348";
const GRAPH_URL = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`;
const SITE = (process.env.SITE_URL || "https://rafaelrazeira.com.br").replace(/\/$/, "");
/* a Meta só aceita evento de até 7 dias; um aviso atrasado além disso é só log */
const SETE_DIAS_S = 7 * 24 * 3600;

export const ehCompraDireta = (pg) =>
  String((pg && pg.external_reference) || "").startsWith("crm:vitrine-direta:");

export async function avisarCompra(pg) {
  if (!ehCompraDireta(pg) || pg.status !== "approved") return { compra: false };
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!token) {
    console.error("meta_compra_sem_token: META_CAPI_ACCESS_TOKEN ausente");
    return { compra: false };
  }

  const agora = Math.floor(Date.now() / 1000);
  const aprovado = Math.floor(new Date(pg.date_approved).getTime() / 1000);
  const event_time = Number.isFinite(aprovado) ? Math.min(aprovado, agora) : agora;
  if (agora - event_time > SETE_DIAS_S) return { compra: false, motivo: "mais de 7 dias" };

  const m = pg.metadata || {};
  const payer = pg.payer || {};
  const user_data = {};
  const em = normEmail(payer.email);
  if (em) user_data.em = [sha256(em)];
  const fn = normNome(payer.first_name);
  if (fn) user_data.fn = [sha256(fn)];
  /* minúsculo como o browser manda, senão o hash não bate com o do pixel */
  if (m.visita_ref) user_data.external_id = [sha256(String(m.visita_ref).trim().toLowerCase())];
  if (m.fbp) user_data.fbp = String(m.fbp);
  if (m.fbc) user_data.fbc = String(m.fbc);
  if (m.client_ip) user_data.client_ip_address = String(m.client_ip);
  if (m.client_ua) user_data.client_user_agent = String(m.client_ua);

  const payload = {
    data: [{
      event_name: "Purchase",
      event_time,
      event_id: `mp-${pg.id}`,
      action_source: "website",
      event_source_url: `${SITE}/vitrine-v4`,
      user_data,
      custom_data: {
        value: Number(pg.transaction_amount),
        currency: "BRL",
        content_name: "vitrine-direta",
        ...(m.utm_content ? { utm_content: String(m.utm_content) } : {}),
      },
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

  try {
    const r = await fetch(`${GRAPH_URL}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      console.error("meta_compra_recusada", String(pg.id), r.status, JSON.stringify(await r.json().catch(() => ({}))));
      return { compra: false };
    }
    console.log("meta_compra_enviada", { id: String(pg.id), chaves: Object.keys(user_data) });
    return { compra: true };
  } catch (e) {
    console.error("meta_compra_falhou", String(pg.id), e && e.message);
    return { compra: false };
  }
}
