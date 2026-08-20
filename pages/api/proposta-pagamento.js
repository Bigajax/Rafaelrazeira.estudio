/* ============================================================
   CHECKOUT DAS PROPOSTAS — função serverless da Vercel.
   Cria pagamentos únicos no Mercado Pago (Pix e cartão) sem sair
   da página da proposta. Uma única rota, três operações:

   • GET  /api/proposta-pagamento?proposta=baixudos
       → config pública da proposta (itens, valores, public key)
   • POST /api/proposta-pagamento
       → cria o pagamento { proposta, item, payer, card? }
   • GET  /api/proposta-pagamento?status=<paymentId>
       → status do pagamento (polling do Pix)

   Variáveis de ambiente (Vercel → Settings → Environment Variables):
   • MP_ACCESS_TOKEN (obrigatória) — Mercado Pago → Suas integrações
     → credenciais de PRODUÇÃO. Use as de TESTE para homologar.
   • MP_PUBLIC_KEY  (obrigatória) — par da mesma credencial; é pública
     por natureza, mas sai daqui para o client junto com a config.
   • SITE_URL (opcional) — a origem pública, para montar o
     `notification_url` do webhook. Sem ela, cai no domínio da Vercel.

   REGRA DE OURO: o valor NUNCA vem do browser. Cada proposta tem os
   preços definidos em lib/propostas.ts — o client só manda o id do
   item. Para criar uma proposta nova com checkout, adicione a entrada
   lá e os botões no HTML (ver proposta/CHECKOUT.md).
   ============================================================ */
import crypto from "crypto";
/* A tabela de preços saiu deste arquivo em 20/08 e virou lib/propostas.ts,
   para o CRM poder montar o contrato a partir do MESMO plano que cobra o
   cliente. A regra de ouro não mudou: o valor continua vindo daqui e nunca
   do browser. */
import { PROPOSTAS } from "@/lib/propostas";

const MP_API = "https://api.mercadopago.com/v1/payments";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const onlyDigits = (v) => String(v || "").replace(/\D/g, "");
function splitName(nome) {
  const parts = String(nome || "").trim().split(/\s+/);
  return { first_name: parts[0] || "", last_name: parts.slice(1).join(" ") || parts[0] || "" };
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function mpFetch(url, options) {
  const r = await fetch(url, options);
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

export default async function handler(req, res) {
  const token = process.env.MP_ACCESS_TOKEN;
  const publicKey = process.env.MP_PUBLIC_KEY;
  if (!token || !publicKey) {
    return json(res, 500, { error: "MP_ACCESS_TOKEN/MP_PUBLIC_KEY ausentes na Vercel" });
  }

  /* ——— GET: config da proposta ou status de pagamento ——— */
  if (req.method === "GET") {
    const { proposta, status } = req.query || {};

    if (status) {
      if (!/^\d+$/.test(String(status))) return json(res, 400, { error: "id inválido" });
      const r = await mpFetch(`${MP_API}/${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return json(res, 502, { error: "não foi possível consultar o pagamento" });
      return json(res, 200, {
        id: r.body.id,
        status: r.body.status,
        status_detail: r.body.status_detail,
      });
    }

    const p = PROPOSTAS[String(proposta || "")];
    if (!p) return json(res, 404, { error: "proposta não encontrada" });
    return json(res, 200, {
      publicKey,
      titulo: p.titulo,
      whatsapp: p.whatsapp || null,
      itens: Object.entries(p.itens).map(([id, i]) => ({
        id,
        label: i.label,
        valor: i.valor,
        metodo: i.metodo,
        maxParcelas: i.maxParcelas || null,
      })),
    });
  }

  if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });

  /* ——— POST: criar pagamento ——— */
  const b = req.body || {};
  const p = PROPOSTAS[String(b.proposta || "")];
  const item = p && p.itens[String(b.item || "")];
  if (!p || !item) return json(res, 400, { error: "proposta/item inválidos" });

  /* ---------- A REFERÊNCIA, CONSERTADA EM 20/08 ----------
     Ela era `proposta_${slug}_${item}_${ts}_${hex}`, e isso é impossível de
     desmontar: os slugs usam hífen ("pr-grife", "ws-style-mens") mas os
     itens usam UNDERSCORE ("entrada_pix", "saldo_card"), então um
     `split("_")` não separa um do outro. Enquanto ninguém lia a referência
     de volta, não fazia diferença; agora o webhook lê, e é por ela que o
     pagamento acha a parcela.

     Dois-pontos porque nem slug nem item podem conter esse caractere. O
     prefixo `crm:` distingue das referências antigas que já estão no
     histórico do Mercado Pago, e o webhook tem um caminho de leitura para
     cada formato. */
  const external_reference = `crm:${b.proposta}:${b.item}:${crypto.randomUUID()}`;
  const idempotencyKey = crypto.randomUUID();
  const description = `${p.titulo} — ${item.label}`;

  /* ---------- para onde o Mercado Pago avisa ----------
     Sem isto ele nunca tentou avisar ninguém, e um pagamento aprovado
     existia num lugar só: o painel dele. Absoluta e sem query string (o MP
     anexa a dele). Ela precisa estar cadastrada TAMBÉM no painel do MP →
     Suas integrações → Webhooks, porque é de lá que sai o segredo que
     assina a notificação: sem o cadastro não há o que conferir. */
  const notification_url = `${(process.env.SITE_URL || "https://rafaelrazeira-estudio.vercel.app").replace(/\/$/, "")}/api/mp-webhook`;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Idempotency-Key": idempotencyKey,
  };

  try {
    /* —— Pix: exige nome, e-mail e CPF do pagador —— */
    if (item.metodo === "pix") {
      const { nome, email, cpf } = b.payer || {};
      if (!nome || !EMAIL_RE.test(String(email || ""))) {
        return json(res, 400, { error: "nome e e-mail válidos são obrigatórios" });
      }
      const cpfDigits = onlyDigits(cpf);
      if (cpfDigits.length !== 11) return json(res, 400, { error: "CPF deve ter 11 dígitos" });

      const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const { first_name, last_name } = splitName(nome);

      const r = await mpFetch(MP_API, {
        method: "POST",
        headers,
        body: JSON.stringify({
          transaction_amount: item.valor,
          description,
          payment_method_id: "pix",
          date_of_expiration: expiration,
          external_reference,
          notification_url,
          metadata: { origem: "proposta", proposta: b.proposta, item: b.item },
          payer: {
            email,
            first_name,
            last_name,
            identification: { type: "CPF", number: cpfDigits },
          },
        }),
      });
      if (!r.ok) {
        console.error("proposta_pix_failed", JSON.stringify(r.body));
        return json(res, 502, { error: "Não foi possível gerar o Pix. Tente novamente." });
      }
      const tx = (r.body.point_of_interaction || {}).transaction_data || {};
      return json(res, 200, {
        id: r.body.id,
        qr_code: tx.qr_code,
        qr_code_base64: tx.qr_code_base64,
        expiration_date: r.body.date_of_expiration || expiration,
      });
    }

    /* —— Cartão: token vem do Brick do MP; aprovação é síncrona —— */
    const c = b.card || {};
    const payer = c.payer || {};
    const installments = Number(c.installments);
    if (!c.token || !c.payment_method_id || !EMAIL_RE.test(String(payer.email || ""))) {
      return json(res, 400, { error: "dados do cartão incompletos" });
    }
    const max = item.maxParcelas || 1;
    if (!Number.isInteger(installments) || installments < 1 || installments > max) {
      return json(res, 400, { error: `parcelas deve ser entre 1 e ${max}` });
    }
    const idNumber = onlyDigits(payer.identification && payer.identification.number);
    if (!idNumber) return json(res, 400, { error: "documento do pagador inválido" });

    const r = await mpFetch(MP_API, {
      method: "POST",
      headers,
      body: JSON.stringify({
        transaction_amount: item.valor,
        description,
        token: c.token,
        payment_method_id: c.payment_method_id,
        issuer_id: c.issuer_id || undefined,
        installments,
        external_reference,
        notification_url,
        statement_descriptor: "RAZEIRA ESTUDIO",
        metadata: { origem: "proposta", proposta: b.proposta, item: b.item },
        payer: {
          email: payer.email,
          identification: {
            type: (payer.identification && payer.identification.type) || "CPF",
            number: idNumber,
          },
        },
      }),
    });
    if (!r.ok) {
      console.error("proposta_card_failed", JSON.stringify(r.body));
      return json(res, 502, { error: "Não foi possível processar o cartão. Confira os dados." });
    }
    return json(res, 200, {
      id: r.body.id,
      status: r.body.status,
      status_detail: r.body.status_detail,
    });
  } catch (err) {
    console.error("proposta_pagamento_exception", err && err.message);
    return json(res, 502, { error: "Falha ao contatar o Mercado Pago." });
  }
};
