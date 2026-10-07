/* ============================================================
   O PAGAMENTO DO PERFORMANCE (07/10/2026), irmão de proposta-pagamento.js.
   A página /assinar/<loja> chama esta rota; o valor sai de
   lib/oferta-performance.ts, NUNCA do browser.

   • GET  ?loja=<uuid>      → a loja (nome, situação) e a public key
   • GET  ?status=<id>      → status do Pix (polling)
   • POST { loja, plano, payer?, card? }
       pix_mensal    → Pix de 30 minutos, com QR
       cartao_anual  → pagamento único em até 12x
       cartao_mensal → assinatura (preapproval) que cobra sozinha todo mês

   A referência é `perf:<loja>:<plano>:<uuid>`. O webhook (mp-webhook.js) lê
   o prefixo `perf:` e soma os dias pela função perf_registrar_pagamento,
   uma vez por pagamento. Na assinatura, a referência fica na preapproval e
   cada cobrança chega como `subscription_authorized_payment`.
   ============================================================ */
import crypto from "crypto";
import { DEGRAUS, PLANOS_PERFORMANCE, UPGRADES, ehPlano, ehUpgrade } from "@/lib/oferta-performance";
import { supabaseREST, supabaseSelect } from "@/lib/supabase-rest";

const MP = "https://api.mercadopago.com";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const soDigitos = (v) => String(v || "").replace(/\D/g, "");

function json(res, status, corpo) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(corpo));
}

async function mp(caminho, opcoes) {
  const r = await fetch(`${MP}${caminho}`, opcoes);
  const corpo = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, corpo };
}

/* a loja existe e está ligada: nunca cobrar de uma loja apagada ou desligada */
async function acharLoja(id) {
  if (!UUID_RE.test(String(id || ""))) return null;
  const linhas = await supabaseSelect(
    `perf_lojas?id=eq.${id}&ativa=eq.true&select=*`,
  );
  return linhas[0] || null;
}

export default async function handler(req, res) {
  const token = process.env.MP_ACCESS_TOKEN;
  const publicKey = process.env.MP_PUBLIC_KEY;
  if (!token || !publicKey) return json(res, 500, { error: "MP_ACCESS_TOKEN/MP_PUBLIC_KEY ausentes na Vercel" });

  if (req.method === "GET") {
    const { loja, status } = req.query || {};
    if (status) {
      if (!/^\d+$/.test(String(status))) return json(res, 400, { error: "id inválido" });
      const r = await mp(`/v1/payments/${status}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return json(res, 502, { error: "não foi possível consultar o pagamento" });
      return json(res, 200, { id: r.corpo.id, status: r.corpo.status, status_detail: r.corpo.status_detail });
    }
    const l = await acharLoja(loja);
    if (!l) return json(res, 404, { error: "loja não encontrada" });
    return json(res, 200, { publicKey, loja: { nome: l.nome, liberado_ate: l.liberado_ate, para_sempre: l.para_sempre, plano: l.plano } });
  }

  if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });

  const b = req.body || {};
  /* (07/10) os upgrades da vitrine passam pela mesma rota: Pix ou cartão
     único, o valor de lib/oferta-performance.ts, sem somar dias */
  const upgrade = ehUpgrade(b.plano);
  if (!ehPlano(b.plano) && !upgrade) return json(res, 400, { error: "plano inválido" });
  const plano = upgrade ? UPGRADES[b.plano] : PLANOS_PERFORMANCE[b.plano];
  const l = await acharLoja(b.loja);
  if (!l) return json(res, 404, { error: "loja não encontrada" });
  if (!upgrade && l.para_sempre) return json(res, 400, { error: "Esta loja já tem o Performance para sempre." });
  if (upgrade && (l.upgrade === "loja" || l.upgrade === plano.degrau)) {
    return json(res, 400, { error: `${DEGRAUS[plano.degrau].nome}: esta loja já pagou. O estúdio está fazendo.` });
  }

  const external_reference = `perf:${l.id}:${b.plano}:${crypto.randomUUID()}`;
  const notification_url = `${(process.env.SITE_URL || "https://rafaelrazeira.com.br").replace(/\/$/, "")}/api/mp-webhook`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() };
  const description = `${plano.descricao}: ${l.nome}`;

  try {
    /* —— Pix: nome, e-mail e CPF do pagador —— */
    if (plano.metodo === "pix") {
      const { nome, email, cpf } = b.payer || {};
      if (!nome || !EMAIL_RE.test(String(email || ""))) return json(res, 400, { error: "nome e e-mail válidos são obrigatórios" });
      const cpfDigitos = soDigitos(cpf);
      if (cpfDigitos.length !== 11) return json(res, 400, { error: "CPF deve ter 11 dígitos" });
      const partes = String(nome).trim().split(/\s+/);
      const expira = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const r = await mp("/v1/payments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          transaction_amount: plano.valor,
          description,
          payment_method_id: "pix",
          date_of_expiration: expira,
          external_reference,
          notification_url,
          metadata: { origem: upgrade ? "upgrade" : "performance", loja: l.id, plano: b.plano },
          payer: {
            email,
            first_name: partes[0],
            last_name: partes.slice(1).join(" ") || partes[0],
            identification: { type: "CPF", number: cpfDigitos },
          },
        }),
      });
      if (!r.ok) {
        console.error("perf_pix_falhou", JSON.stringify(r.corpo));
        return json(res, 502, { error: "Não foi possível gerar o Pix. Tente novamente." });
      }
      const tx = (r.corpo.point_of_interaction || {}).transaction_data || {};
      return json(res, 200, { id: r.corpo.id, qr_code: tx.qr_code, qr_code_base64: tx.qr_code_base64, expiration_date: r.corpo.date_of_expiration || expira });
    }

    const c = b.card || {};
    const payer = c.payer || {};
    if (!c.token || !EMAIL_RE.test(String(payer.email || ""))) return json(res, 400, { error: "dados do cartão incompletos" });

    /* —— Cartão mensal: a assinatura do Mercado Pago ——
       A preapproval com card_token_id e status authorized já nasce cobrando:
       a primeira cobrança sai em seguida, e as próximas no mesmo dia dos
       meses seguintes. Cada uma vira um aviso subscription_authorized_payment. */
    if (plano.metodo === "assinatura") {
      const r = await mp("/preapproval", {
        method: "POST",
        headers,
        body: JSON.stringify({
          reason: description,
          external_reference,
          payer_email: payer.email,
          card_token_id: c.token,
          status: "authorized",
          back_url: `${(process.env.SITE_URL || "https://rafaelrazeira.com.br").replace(/\/$/, "")}/assinar/${l.id}`,
          auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: plano.valor, currency_id: "BRL" },
        }),
      });
      if (!r.ok) {
        console.error("perf_assinatura_falhou", JSON.stringify(r.corpo));
        return json(res, 502, { error: "Não foi possível ativar a assinatura. Confira os dados do cartão." });
      }
      /* guarda a assinatura na loja já: o webhook confirma o estado depois */
      await supabaseREST(`perf_lojas?id=eq.${l.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ mp_assinatura_id: String(r.corpo.id), assinatura_status: r.corpo.status || "authorized", plano: "cartao_mensal" }),
      }).catch((e) => console.error("perf_assinatura_gravar", e && e.message));
      return json(res, 200, { assinatura: r.corpo.id, status: r.corpo.status === "authorized" ? "approved" : r.corpo.status });
    }

    /* —— Cartão anual: pagamento único, até 12x —— */
    const parcelas = Number(c.installments);
    const max = plano.maxParcelas || 1;
    if (!c.payment_method_id || !Number.isInteger(parcelas) || parcelas < 1 || parcelas > max) {
      return json(res, 400, { error: `parcelas deve ser entre 1 e ${max}` });
    }
    const doc = soDigitos(payer.identification && payer.identification.number);
    if (!doc) return json(res, 400, { error: "documento do pagador inválido" });
    const r = await mp("/v1/payments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        transaction_amount: plano.valor,
        description,
        token: c.token,
        payment_method_id: c.payment_method_id,
        issuer_id: c.issuer_id || undefined,
        installments: parcelas,
        external_reference,
        notification_url,
        statement_descriptor: "RAZEIRA ESTUDIO",
        metadata: { origem: upgrade ? "upgrade" : "performance", loja: l.id, plano: b.plano },
        payer: { email: payer.email, identification: { type: (payer.identification && payer.identification.type) || "CPF", number: doc } },
      }),
    });
    if (!r.ok) {
      console.error("perf_cartao_falhou", JSON.stringify(r.corpo));
      return json(res, 502, { error: "Não foi possível processar o cartão. Confira os dados." });
    }
    return json(res, 200, { id: r.corpo.id, status: r.corpo.status, status_detail: r.corpo.status_detail });
  } catch (e) {
    console.error("perf_pagamento_excecao", e && e.message);
    return json(res, 502, { error: "Falha ao contatar o Mercado Pago." });
  }
}
