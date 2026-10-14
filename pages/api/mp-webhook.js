/* ============================================================
   O AVISO DO MERCADO PAGO — a rota que fecha o circuito do dinheiro.

   Até 20/08 um pagamento aprovado existia em UM lugar só: o painel do
   Mercado Pago. O checkout desenhava um "✓", abria o WhatsApp e não gravava
   nada; não havia sequer um log no caminho de sucesso. O CRM sabia que a
   ArraZou tinha fechado por R$ 999 e não sabia se ela havia pagado.

   Esta rota é o caminho de volta. O cliente paga o Pix na página da
   proposta, e o CRM sabe sozinho: a parcela é dada como recebida, o lead
   entra em Ganho, e o pagamento aparece na linha do tempo dele.

   ------------------------------------------------------------
   O QUE PRECISA ESTAR CONFIGURADO

   • MP_WEBHOOK_SECRET — Mercado Pago → Suas integrações → sua aplicação →
     Webhooks. Ao cadastrar a URL, o painel mostra uma "chave secreta": é
     ela. SEM ELA ESTA ROTA RECUSA TUDO, e a baixa volta a ser manual em
     silêncio. Teste com o simulador do painel antes de contar com ela.
   • A URL cadastrada no painel: https://<dominio>/api/mp-webhook, evento
     "Pagamentos". O `notification_url` que a rota de criação manda não
     substitui o cadastro: é do cadastro que sai o segredo.
   • MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRM_OWNER_ID.

   ------------------------------------------------------------
   AS QUATRO REGRAS DESTE ARQUIVO

   1. NUNCA CONFIAR NO CORPO. A notificação é um aviso, não um extrato: ela
      traz um id e mais nada. Valor, status e referência vêm de uma consulta
      à API do Mercado Pago, com o nosso token.

   2. NUNCA DESCARTAR DINHEIRO. Se o pagamento não bate com parcela nenhuma,
      ele é gravado ÓRFÃO (`parcela_id` nulo) e aparece na bandeja "Entrou
      sem contrato" do Caixa. Um webhook que responde 200 sem gravar está
      jogando dinheiro fora em silêncio, e basta acontecer uma vez para o
      caixa nunca mais fechar.

   3. QUEM DECIDE IDEMPOTÊNCIA É O BANCO. O Mercado Pago manda várias
      notificações do mesmo pagamento na transição de `pending` para
      `approved` e reenvia com backoff por horas. Um "consulta e depois
      insere" aqui perde a corrida contra duas notificações simultâneas. A
      trava é o índice único `crm_receb_mp_uniq`.

   4. SÓ 2xx ENCERRA. Resposta fora de 2xx faz o Mercado Pago reenviar, e é
      isso que se quer quando o banco falha. O contrário também vale: um 500
      por pagamento pendente vira uma tempestade de retentativas. Pendente
      responde 200 e vai embora.
   ============================================================ */

import crypto from "crypto";
import { donoDoCRM, supabaseREST, supabaseSelect } from "@/lib/supabase-rest";
import {
  lerPerf,
  registrarPerf,
  processarPagamento,
} from "@/lib/mercadopago/processar";

const MP_API = "https://api.mercadopago.com/v1/payments";
/* Notificação com mais de dez minutos é replay: o Mercado Pago entrega em
   segundos, e uma retentativa legítima traz `ts` novo. */
const JANELA_S = 600;

const responder = (res, status, corpo) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(corpo));
};

/* ---------- O DIA EM MARINGÁ ----------
   `date_approved` chega como "2026-08-20T21:34:02.000-03:00", e
   `new Date(x).toISOString().slice(0,10)` devolveria 21/08. Todo pagamento
   depois das 21h cairia no dia seguinte, e na virada do mês, no mês
   seguinte: o caixa fecharia errado todo mês.

   Escrito aqui e não importado de lib/crm/regras.ts porque aquele arquivo é
   TypeScript com dependências do CRM, e esta rota é o caminho do dinheiro:
   quanto menos ela puxa, menos ela quebra. As duas usam o mesmo `en-CA`
   pela mesma razão (é o único locale que o Intl formata como YYYY-MM-DD). */
const ISO_SP = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const diaEmSP = (quando) =>
  ISO_SP.format(quando ? new Date(quando) : new Date());

/* ============================================================
   A ASSINATURA

   O endpoint é público e não tem login. Sem conferir a assinatura, qualquer
   pessoa que descubra a URL manda `{"type":"payment","data":{"id":"..."}}` e
   faz o CRM dar baixa em parcela. A consulta à API do MP limita o estrago
   (só devolve pagamento da nossa conta), mas ainda sobra replay de ids
   reais.

   O manifesto é montado de CABEÇALHOS e QUERY, nunca do corpo — por isso
   esta rota não precisa de raw body e o bodyParser padrão do Next continua
   servindo, ao contrário do que um webhook de Stripe exigiria.
   ============================================================ */
function assinaturaConfere(req, dataId) {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) return false;

  const cabecalho = String(req.headers["x-signature"] || "");
  const ts = (/ts=([^,]+)/.exec(cabecalho) || [])[1];
  const v1 = (/v1=([^,\s]+)/.exec(cabecalho) || [])[1];
  const requestId = String(req.headers["x-request-id"] || "");
  if (!ts || !v1) return false;

  if (Math.abs(Date.now() / 1000 - Number(ts)) > JANELA_S) return false;

  /* Id numérico vai como veio; id alfanumérico vai em minúsculas. É a regra
     do Mercado Pago, e errar nela faz toda assinatura falhar sem explicação. */
  const id = /^[0-9]+$/.test(String(dataId))
    ? String(dataId)
    : String(dataId).toLowerCase();
  const manifesto = `id:${id};request-id:${requestId};ts:${ts};`;
  const esperado = crypto
    .createHmac("sha256", segredo)
    .update(manifesto)
    .digest("hex");

  /* Tempo constante: com `===` dá para descobrir a assinatura medindo quanto
     a resposta demora. Mesma disciplina do `segredoConfere` de
     pages/api/venda-fechada.js. */
  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* ============================================================
   A REFERÊNCIA

   Formato atual: `crm:<slug>:<item>:<uuid>`, com dois-pontos porque nem
   slug nem item podem conter esse caractere.

   Formato antigo: `proposta_<slug>_<item>_<ts>_<hex>`, impossível de
   desmontar por `split("_")` porque os slugs usam hífen ("pr-grife") e os
   itens usam underscore ("entrada_pix"). Ele ainda existe no histórico do
   Mercado Pago, então é lido pelo fim: os itens são um conjunto fechado e
   conhecido, e o que sobra na frente é o slug.
   ============================================================ */
async function mpGet(caminho) {
  const r = await fetch(`https://api.mercadopago.com${caminho}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  return {
    ok: r.ok,
    status: r.status,
    corpo: await r.json().catch(() => ({})),
  };
}

/* uma cobrança da assinatura: o aviso traz o id da cobrança; a referência
   mora na assinatura, e o pagamento de verdade, dentro da cobrança */
async function cobrancaDaAssinatura(dono, id) {
  const cob = await mpGet(`/authorized_payments/${encodeURIComponent(id)}`);
  if (!cob.ok) return { ignorado: "cobrança não encontrada" };
  const pid = cob.corpo.payment && cob.corpo.payment.id;
  if (!pid) return { ignorado: cob.corpo.status || "sem pagamento" };
  const pg = await mpGet(`/v1/payments/${pid}`);
  if (!pg.ok || pg.corpo.status !== "approved")
    return {
      ignorado: (pg.corpo && pg.corpo.status) || "pagamento não aprovado",
    };
  let ref = lerPerf(pg.corpo.external_reference);
  if (!ref && cob.corpo.preapproval_id) {
    const ass = await mpGet(
      `/preapproval/${encodeURIComponent(cob.corpo.preapproval_id)}`,
    );
    ref = ass.ok ? lerPerf(ass.corpo.external_reference) : null;
  }
  if (!ref) return { ignorado: "não é do Performance" };
  if (!lerPerf(pg.corpo.external_reference) && ref)
    pg.corpo.external_reference = `perf:${ref.loja}:${ref.plano}:assinatura`;
  return processarPagamento(dono, pg.corpo);
}

/* a assinatura mudou de estado: o painel deixa de dizer "renova sozinho"
   quando ela é pausada ou cancelada, e passa a contar os dias */
async function estadoDaAssinatura(id) {
  const ass = await mpGet(`/preapproval/${encodeURIComponent(id)}`);
  if (!ass.ok) return { ignorado: "assinatura não encontrada" };
  const ref = lerPerf(ass.corpo.external_reference);
  if (!ref) return { ignorado: "não é do Performance" };
  const gravado = await supabaseREST(
    `perf_lojas?id=eq.${encodeURIComponent(ref.loja)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        mp_assinatura_id: String(ass.corpo.id),
        assinatura_status: ass.corpo.status || null,
      }),
    },
  );
  if (!gravado.ok)
    throw Error("Não foi possível atualizar o estado da assinatura");
  return { assinatura: ass.corpo.status };
}

/* ============================================================
   A ROTA
   ============================================================ */
export default async function handler(req, res) {
  /* O Mercado Pago manda GET de teste ao cadastrar a URL no painel. */
  if (req.method === "GET")
    return responder(res, 200, { ok: true, rota: "mp-webhook" });
  if (req.method !== "POST") return responder(res, 405, { erro: "use POST" });

  const q = req.query || {};
  const b = req.body || {};

  /* Três formatos convivem: o novo (tipo no corpo), a query e o IPN antigo
     (?topic=payment&id=). Ler os três custa uma linha e evita a falha mais
     chata de diagnosticar, que é o webhook "funcionando" e ignorando tudo. */
  const tipo = b.type || q.type || q.topic;
  const dataId = (b.data && b.data.id) || q["data.id"] || q.id;

  /* a assinatura do Performance (07/10): cobrança do mês e mudança de estado */
  if (
    (tipo === "subscription_authorized_payment" ||
      tipo === "subscription_preapproval") &&
    dataId
  ) {
    if (!assinaturaConfere(req, dataId)) {
      console.error("mp_webhook_assinatura_invalida", {
        id: String(dataId),
        tipo,
      });
      return responder(res, 401, { erro: "assinatura inválida" });
    }
    const donoA = donoDoCRM();
    if (!donoA) return responder(res, 500, { erro: "CRM_OWNER_ID ausente" });
    try {
      const r =
        tipo === "subscription_authorized_payment"
          ? await cobrancaDaAssinatura(donoA, String(dataId))
          : await estadoDaAssinatura(String(dataId));
      console.log("mp_webhook_perf_assinatura", {
        tipo,
        id: String(dataId),
        ...r,
      });
      return responder(res, 200, { ok: true, ...r });
    } catch (e) {
      console.error("mp_webhook_perf_assinatura_falhou", e && e.message);
      return responder(res, 500, { erro: "não foi possível gravar" });
    }
  }

  /* Tudo que não é pagamento sai com 200: 4xx faria o MP reenviar para
     sempre um aviso que a gente nunca vai querer. */
  if (tipo !== "payment" || !dataId)
    return responder(res, 200, { ok: true, ignorado: tipo || null });

  if (!assinaturaConfere(req, dataId)) {
    /* Log gritado porque o modo de falha aqui é silencioso e demorado de
       perceber: sem o segredo configurado, o dinheiro simplesmente para de
       dar baixa e ninguém é avisado. */
    console.error("mp_webhook_assinatura_invalida", {
      id: String(dataId),
      temSegredo: Boolean(process.env.MP_WEBHOOK_SECRET),
    });
    return responder(res, 401, { erro: "assinatura inválida" });
  }

  const dono = donoDoCRM();
  if (!dono) {
    console.error("mp_webhook_sem_owner: CRM_OWNER_ID ausente");
    /* 500 e não 200: isto é configuração faltando, e o reenvio do MP é
       justamente a segunda chance depois de alguém consertar. */
    return responder(res, 500, { erro: "CRM_OWNER_ID ausente" });
  }

  /* ---------- o extrato de verdade ---------- */
  const token = process.env.MP_ACCESS_TOKEN;
  const rp = await fetch(`${MP_API}/${encodeURIComponent(String(dataId))}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (rp.status === 404)
    return responder(res, 200, { ok: true, ignorado: "não é nosso" });
  if (!rp.ok) {
    console.error("mp_webhook_consulta_falhou", rp.status);
    return responder(res, 502, {
      erro: "não foi possível consultar o pagamento",
    });
  }
  const pg = await rp.json().catch(() => ({}));

  try {
    const resultado = await processarPagamento(dono, pg);
    return responder(res, 200, { ok: true, ...resultado });
  } catch (e) {
    console.error("mp_webhook_processamento", String(pg.id), e.message);
    return responder(res, 500, {
      erro: "Processamento pendente; o aviso pode ser repetido com segurança",
    });
  }
}
