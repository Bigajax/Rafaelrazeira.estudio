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
const diaEmSP = (quando) => ISO_SP.format(quando ? new Date(quando) : new Date());

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
  const id = /^[0-9]+$/.test(String(dataId)) ? String(dataId) : String(dataId).toLowerCase();
  const manifesto = `id:${id};request-id:${requestId};ts:${ts};`;
  const esperado = crypto.createHmac("sha256", segredo).update(manifesto).digest("hex");

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
const ITENS_CONHECIDOS = [
  "avista_pix",
  "avista_card",
  "entrada_pix",
  "saldo_pix",
  "saldo_card",
  "painel_pix",
];

function lerReferencia(ref) {
  const texto = String(ref || "");
  if (texto.startsWith("crm:")) {
    const [, slug, item] = texto.split(":");
    return slug && item ? { slug, item } : null;
  }
  const antigo = /^proposta_(.+)_(\d+)_[0-9a-f]+$/.exec(texto);
  if (!antigo) return null;
  const miolo = antigo[1];
  for (const item of ITENS_CONHECIDOS) {
    if (miolo.endsWith(`_${item}`)) {
      return { slug: miolo.slice(0, -(item.length + 1)), item };
    }
  }
  return null;
}

/* ============================================================
   ACHAR A PARCELA

   Slug acha o contrato, item acha a parcela. Entre várias candidatas, a de
   vencimento mais antigo: se o cliente pagou uma entrada e há duas entradas
   abertas, a que ele deve há mais tempo é a que ele quitou.
   ============================================================ */
async function acharParcela(dono, slug, item) {
  const contratos = await supabaseSelect(
    `crm_contratos?owner_id=eq.${dono}&proposta_slug=eq.${encodeURIComponent(slug)}&status=eq.ativo&select=id`,
  );
  if (!contratos.length) return null;

  const ids = contratos.map((c) => c.id).join(",");
  const parcelas = await supabaseSelect(
    `crm_parcelas?owner_id=eq.${dono}&contrato_id=in.(${ids})&item_slug=eq.${encodeURIComponent(item)}` +
      `&cancelada_em=is.null&select=id,lead_id,valor,vence_em,contrato_id,numero&order=vence_em.asc`,
  );
  if (!parcelas.length) return null;

  /* Já quitada não recebe de novo: a segunda parcela paga com o mesmo item
     tem que cair na próxima em aberto, não em cima da que já fechou. */
  const recebidos = await supabaseSelect(
    `crm_recebimentos?owner_id=eq.${dono}&parcela_id=in.(${parcelas.map((p) => p.id).join(",")})` +
      `&estornado_em=is.null&select=parcela_id,valor`,
  );
  const pago = new Map();
  for (const r of recebidos) {
    pago.set(r.parcela_id, (pago.get(r.parcela_id) || 0) + Number(r.valor));
  }

  return parcelas.find((p) => Number(p.valor) - (pago.get(p.id) || 0) > 0.005) || null;
}

/* ============================================================
   O GANHO AUTOMÁTICO

   Pagar é a prova mais forte que existe de que o negócio fechou, e é a
   mesma filosofia do trilho do funil que já roda no CRM: o fato se registra
   sozinho quando a prova basta.

   Só na PRIMEIRA parcela, e só de estágio ativo: um lead já ganho não é
   movido de novo, e um lead perdido que reaparece pagando é notícia demais
   para uma decisão automática (ele aparece na fila e o Rafael decide).
   ============================================================ */
async function ganharSozinho(dono, parcela, valorPago) {
  if (Number(parcela.numero) !== 1) return;

  const leads = await supabaseSelect(
    `crm_leads?owner_id=eq.${dono}&id=eq.${parcela.lead_id}&select=id,estagio`,
  );
  const lead = leads[0];
  if (!lead || lead.estagio === "ganho" || lead.estagio === "perdido") return;

  const contratos = await supabaseSelect(
    `crm_contratos?owner_id=eq.${dono}&id=eq.${parcela.contrato_id}&select=valor_total`,
  );
  const total = contratos[0] ? Number(contratos[0].valor_total) : null;

  await supabaseREST(`crm_leads?id=eq.${parcela.lead_id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      estagio: "ganho",
      valor_fechado: total ?? valorPago,
      fechado_em: diaEmSP(),
      /* Ganho sai da agenda, exatamente como o `moverLead` faz: deixar a
         data marcada faria o negócio fechado reaparecer na fila do dia
         seguinte como pendência. */
      proxima_acao_em: null,
      proximo_passo: null,
      motivo_perda: null,
    }),
  });

  /* E o pagamento vira linha do tempo. Sem isso, o lead aparece em Ganho de
     um dia para o outro sem nada explicando por quê. */
  await supabaseREST("crm_interacoes", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      owner_id: dono,
      lead_id: parcela.lead_id,
      canal: "proposta",
      direcao: "entrada",
      resumo: `Pagou pelo checkout: R$ ${Number(valorPago).toLocaleString("pt-BR")}`,
    }),
  });
}

/* ============================================================
   A ROTA
   ============================================================ */
export default async function handler(req, res) {
  /* O Mercado Pago manda GET de teste ao cadastrar a URL no painel. */
  if (req.method === "GET") return responder(res, 200, { ok: true, rota: "mp-webhook" });
  if (req.method !== "POST") return responder(res, 405, { erro: "use POST" });

  const q = req.query || {};
  const b = req.body || {};

  /* Três formatos convivem: o novo (tipo no corpo), a query e o IPN antigo
     (?topic=payment&id=). Ler os três custa uma linha e evita a falha mais
     chata de diagnosticar, que é o webhook "funcionando" e ignorando tudo. */
  const tipo = b.type || q.type || q.topic;
  const dataId = (b.data && b.data.id) || q["data.id"] || q.id;

  /* Tudo que não é pagamento sai com 200: 4xx faria o MP reenviar para
     sempre um aviso que a gente nunca vai querer. */
  if (tipo !== "payment" || !dataId) return responder(res, 200, { ok: true, ignorado: tipo || null });

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
  if (rp.status === 404) return responder(res, 200, { ok: true, ignorado: "não é nosso" });
  if (!rp.ok) {
    console.error("mp_webhook_consulta_falhou", rp.status);
    return responder(res, 502, { erro: "não foi possível consultar o pagamento" });
  }
  const pg = await rp.json().catch(() => ({}));

  /* ---------- estorno e chargeback ----------
     A linha fica, com a data: ela aconteceu, e um mês já fechado precisa
     poder ser reconstruído. O que muda é que ela para de contar. */
  if (["refunded", "charged_back", "cancelled"].includes(pg.status)) {
    await supabaseREST(
      `crm_recebimentos?owner_id=eq.${dono}&mp_payment_id=eq.${encodeURIComponent(String(pg.id))}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ mp_status: pg.status, estornado_em: diaEmSP() }),
      },
    );
    return responder(res, 200, { ok: true, estornado: true });
  }

  if (pg.status !== "approved") {
    return responder(res, 200, { ok: true, ignorado: pg.status || "sem status" });
  }

  /* ---------- amarrar, se der ----------
     A amarração é o SEGUNDO passo e nunca pode derrubar o primeiro: sem
     parcela, o dinheiro entra órfão e espera na bandeja. */
  const ref = lerReferencia(pg.external_reference);
  let parcela = null;
  if (ref) {
    try {
      parcela = await acharParcela(dono, ref.slug, ref.item);
    } catch (e) {
      console.error("mp_webhook_busca_parcela", e && e.message);
    }
  }

  const valor = Number(pg.transaction_amount) || 0;
  const liquido =
    pg.transaction_details && pg.transaction_details.net_received_amount != null
      ? Number(pg.transaction_details.net_received_amount)
      : null;

  const linha = {
    owner_id: dono,
    parcela_id: parcela ? parcela.id : null,
    lead_id: parcela ? parcela.lead_id : null,
    valor,
    valor_liquido: liquido,
    recebido_em: diaEmSP(pg.date_approved),
    metodo: pg.payment_method_id === "pix" ? "pix" : "cartao",
    origem: "mercadopago",
    mp_payment_id: String(pg.id),
    mp_status: pg.status,
    mp_external_reference: pg.external_reference || null,
    bruto: pg,
  };

  /* `ignore-duplicates` é a idempotência inteira: o índice único
     `crm_receb_mp_uniq` recusa a segunda inserção do mesmo pagamento, e o
     PostgREST devolve 201 com zero linhas em vez de erro. */
  const ins = await supabaseREST("crm_recebimentos", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify(linha),
  });

  if (!ins.ok) {
    const detalhe = await ins.text().catch(() => "");
    console.error("mp_webhook_insert_falhou", ins.status, detalhe.slice(0, 300));
    /* 500 para o Mercado Pago reenviar: dinheiro que não gravou tem que
       voltar a bater na porta. */
    return responder(res, 500, { erro: "não foi possível gravar" });
  }

  const gravadas = await ins.json().catch(() => []);
  const novo = Array.isArray(gravadas) && gravadas.length > 0;

  /* Só na primeira vez: reenvio não move o lead de novo nem escreve uma
     segunda linha na timeline. */
  if (novo && parcela) {
    try {
      await ganharSozinho(dono, parcela, valor);
    } catch (e) {
      /* O ganho automático é bônus, como o trilho do funil: se falhar, o
         dinheiro JÁ está gravado, e é isso que não pode se perder. */
      console.error("mp_webhook_ganho_automatico", e && e.message);
    }
  }

  console.log("mp_webhook_ok", {
    id: String(pg.id),
    valor,
    parcela: parcela ? parcela.id : "sem dono",
    novo,
  });

  return responder(res, 200, { ok: true, novo, amarrado: Boolean(parcela) });
}
