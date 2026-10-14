import { supabaseREST } from "@/lib/supabase-rest";
import {
  DEGRAUS,
  PLANOS_PERFORMANCE,
  UPGRADES,
} from "@/lib/oferta-performance";
import { estadoIntegracao, sincronizarDevolucoes } from "./conciliacao";
const ISO_SP = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const diaEmSP = (quando) => {
  if (!quando || !Number.isFinite(new Date(quando).getTime()))
    throw Error("Data de aprovação indisponível");
  return ISO_SP.format(new Date(quando));
};
async function selecionar(caminho) {
  const r = await supabaseREST(caminho);
  if (!r.ok) throw Error("Não foi possível conferir o vínculo do pagamento");
  const j = await r.json();
  if (!Array.isArray(j)) throw Error("Resposta inválida do banco");
  return j;
}
export async function processarPagamento(owner, pg, diaConfirmado) {
  const devolucao =
    ["refunded", "charged_back"].includes(pg.status) ||
    Number(pg.transaction_amount_refunded) > 0;
  if (pg.status !== "approved" && !devolucao)
    return { ignorado: pg.status || "sem status" };
  // Até a instalação complementar, a ausência da fila não impede um recebimento aprovado.
  await estadoIntegracao(
    owner,
    pg.id,
    "pendente",
    "Conferindo os efeitos do pagamento",
  );
  try {
    const ref = lerPerf(pg.external_reference);
    const anterior = await selecionar(
      `crm_recebimentos?owner_id=eq.${owner}&mp_payment_id=eq.${encodeURIComponent(String(pg.id))}&select=id,parcela_id,lead_id,estornado_em,valor_estornado`,
    );
    if (
      !devolucao &&
      (anterior[0]?.estornado_em || Number(anterior[0]?.valor_estornado) > 0)
    ) {
      await estadoIntegracao(owner, pg.id, "concluido");
      return {
        ignorado:
          "Pagamento já possui devolução registrada; aprovação antiga não altera acesso",
      };
    }
    if (ref && !devolucao) {
      const resultado = await registrarPerf(owner, ref, pg);
      await estadoIntegracao(owner, pg.id, "concluido");
      return { performance: true, ...resultado };
    }
    let parcela = null;
    if (!devolucao && anterior[0]?.parcela_id) {
      const existentes = await selecionar(
        `crm_parcelas?owner_id=eq.${owner}&id=eq.${encodeURIComponent(anterior[0].parcela_id)}&select=id,lead_id,valor,vence_em,contrato_id,numero`,
      );
      parcela = existentes[0] || null;
    }
    if (!anterior.length && !ref && !devolucao) {
      const r = lerReferencia(pg.external_reference);
      if (r) parcela = await acharParcela(owner, r.slug, r.item);
    }
    let lead = anterior[0]?.lead_id || parcela?.lead_id || null;
    if (ref && !lead) {
      const lojas = await selecionar(
        `perf_lojas?owner_id=eq.${owner}&id=eq.${encodeURIComponent(ref.loja)}&select=lead_id`,
      );
      if (!lojas.length) throw Error("Loja não encontrada");
      lead = lojas[0].lead_id;
    }
    if (!anterior.length) {
      const inserir = await supabaseREST("crm_recebimentos", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({
          owner_id: owner,
          parcela_id: parcela?.id || null,
          lead_id: lead,
          valor: Number(pg.transaction_amount),
          valor_liquido: pg.transaction_details?.net_received_amount ?? null,
          recebido_em: diaEmSP(pg.date_approved),
          metodo: pg.payment_method_id === "pix" ? "pix" : "cartao",
          origem: "mercadopago",
          mp_payment_id: String(pg.id),
          mp_status: pg.status,
          mp_external_reference: pg.external_reference || null,
          bruto: pg,
        }),
      });
      if (!inserir.ok) throw Error("Recebimento pendente de registro");
    }
    if (devolucao) await sincronizarDevolucoes(owner, pg, diaConfirmado);
    if (!devolucao && parcela)
      await ganharSozinho(owner, parcela, Number(pg.transaction_amount));
    await estadoIntegracao(owner, pg.id, "concluido");
    return { devolucao, amarrado: !!(parcela || anterior[0]?.parcela_id) };
  } catch (e) {
    await estadoIntegracao(owner, pg.id, "pendente", e.message).catch(() => {});
    throw e;
  }
}
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
  const contratos = await selecionar(
    `crm_contratos?owner_id=eq.${dono}&proposta_slug=eq.${encodeURIComponent(slug)}&status=eq.ativo&select=id`,
  );
  if (!contratos.length) return null;

  const ids = contratos.map((c) => c.id).join(",");
  const parcelas = await selecionar(
    `crm_parcelas?owner_id=eq.${dono}&contrato_id=in.(${ids})&item_slug=eq.${encodeURIComponent(item)}` +
      `&cancelada_em=is.null&select=id,lead_id,valor,vence_em,contrato_id,numero&order=vence_em.asc`,
  );
  if (!parcelas.length) return null;

  /* Já quitada não recebe de novo: a segunda parcela paga com o mesmo item
     tem que cair na próxima em aberto, não em cima da que já fechou. */
  const recebidos = await selecionar(
    `crm_recebimentos?owner_id=eq.${dono}&parcela_id=in.(${parcelas.map((p) => p.id).join(",")})` +
      `&estornado_em=is.null&select=*`,
  );
  const pago = new Map();
  for (const r of recebidos) {
    pago.set(
      r.parcela_id,
      (pago.get(r.parcela_id) || 0) +
        Math.max(0, Number(r.valor) - Number(r.valor_estornado || 0)),
    );
  }

  return (
    parcelas.find((p) => Number(p.valor) - (pago.get(p.id) || 0) > 0.005) ||
    null
  );
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

  const leads = await selecionar(
    `crm_leads?owner_id=eq.${dono}&id=eq.${parcela.lead_id}&select=id,estagio`,
  );
  const lead = leads[0];
  if (!lead || lead.estagio === "ganho" || lead.estagio === "perdido") return;

  const contratos = await selecionar(
    `crm_contratos?owner_id=eq.${dono}&id=eq.${parcela.contrato_id}&select=valor_total`,
  );
  const total = contratos[0] ? Number(contratos[0].valor_total) : null;

  const ganho = await supabaseREST(
    `crm_leads?owner_id=eq.${dono}&id=eq.${parcela.lead_id}`,
    {
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
    },
  );
  if (!ganho.ok)
    throw Error("Recebimento registrado; atualização comercial pendente");

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
   O PERFORMANCE (07/10/2026)

   O pagamento do plano pelo próprio painel tem referência
   `perf:<loja>:<plano>:<uuid>` e NÃO tem parcela: quem soma os dias é a
   função perf_registrar_pagamento, que trava a repetição pelo id do
   pagamento (o mesmo aviso cinco vezes soma uma). O dinheiro também entra
   no Caixa, como recebimento com o lead da loja e sem parcela, porque a
   regra 2 vale aqui: nunca descartar dinheiro.

   A assinatura do cartão mensal chega por dois avisos além do payment:
   `subscription_authorized_payment` (uma cobrança do mês) e
   `subscription_preapproval` (a assinatura mudou: pausada, cancelada).
   ============================================================ */
export function lerPerf(ref) {
  const texto = String(ref || "");
  if (!texto.startsWith("perf:")) return null;
  const [, loja, plano] = texto.split(":");
  return loja && plano && (PLANOS_PERFORMANCE[plano] || UPGRADES[plano])
    ? { loja, plano }
    : null;
}

export async function registrarPerf(dono, ref, pagamento) {
  const lojas = await selecionar(
    `perf_lojas?owner_id=eq.${dono}&id=eq.${encodeURIComponent(ref.loja)}&select=lead_id`,
  );
  if (!lojas.length) throw Error("Loja do pagamento não pertence ao CRM");
  const upgrade = UPGRADES[ref.plano] || null;
  const plano = upgrade || PLANOS_PERFORMANCE[ref.plano];
  const valor = Number(pagamento.transaction_amount) || 0;
  /* pagamento menor que o plano não libera: só entra no Caixa */
  const vale = valor + 0.005 >= plano.valor;

  let resultado = { novo: false };
  if (vale && upgrade) {
    /* (07/10) o upgrade não soma dias: marca o degrau na loja, uma vez */
    const r = await supabaseREST("rpc/perf_registrar_upgrade", {
      method: "POST",
      body: JSON.stringify({
        p_loja: ref.loja,
        p_degrau: upgrade.degrau,
        p_payment: String(pagamento.id),
        p_valor: valor,
      }),
    });
    if (!r.ok) throw new Error(`perf_registrar_upgrade ${r.status}`);
    resultado = await r.json().catch(() => ({ novo: false }));
  } else if (vale) {
    const r = await supabaseREST("rpc/perf_registrar_pagamento", {
      method: "POST",
      body: JSON.stringify({
        p_loja: ref.loja,
        p_plano: ref.plano,
        p_payment: String(pagamento.id),
        p_valor: valor,
        p_dias: plano.dias,
      }),
    });
    if (!r.ok) throw new Error(`perf_registrar_pagamento ${r.status}`);
    resultado = await r.json().catch(() => ({ novo: false }));
  } else {
    console.error("mp_webhook_perf_valor_menor", {
      id: String(pagamento.id),
      valor,
      plano: ref.plano,
    });
  }

  const liquido =
    pagamento.transaction_details &&
    pagamento.transaction_details.net_received_amount != null
      ? Number(pagamento.transaction_details.net_received_amount)
      : null;
  const ins = await supabaseREST("crm_recebimentos", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      owner_id: dono,
      parcela_id: null,
      lead_id: (lojas[0] && lojas[0].lead_id) || null,
      valor,
      valor_liquido: liquido,
      recebido_em: diaEmSP(pagamento.date_approved),
      metodo: pagamento.payment_method_id === "pix" ? "pix" : "cartao",
      origem: "mercadopago",
      mp_payment_id: String(pagamento.id),
      mp_status: pagamento.status,
      mp_external_reference: pagamento.external_reference || null,
      bruto: pagamento,
    }),
  });
  if (!ins.ok) throw new Error(`mp_webhook_perf_caixa ${ins.status}`);

  /* o upgrade pago vira linha do tempo no lead: é o sinal para começar */
  if (upgrade && resultado.novo && lojas[0] && lojas[0].lead_id) {
    await supabaseREST("crm_interacoes", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        owner_id: dono,
        lead_id: lojas[0].lead_id,
        canal: "proposta",
        direcao: "entrada",
        resumo: `Pagou o upgrade ${DEGRAUS[upgrade.degrau].nome}: R$ ${valor.toLocaleString("pt-BR")}. Começar o projeto.`,
      }),
    }).catch((e) =>
      console.error("mp_webhook_upgrade_timeline", e && e.message),
    );
  }
  return resultado;
}
