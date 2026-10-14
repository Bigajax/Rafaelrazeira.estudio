import { supabaseREST } from "@/lib/supabase-rest";

// Somente servidor. A lista vem do GET autenticado /v1/payments/{id}/refunds.
export function movimentosAprovados(refunds) {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return refunds
    .filter((r) => r.status === "approved")
    .map((r) => {
      const dt = new Date(r.date_created);
      if (
        !r.id ||
        !r.date_created ||
        !Number.isFinite(dt.getTime()) ||
        !(Number(r.amount) > 0)
      )
        throw Error("Devolução sem identificação, data ou valor comprovados");
      return { id: String(r.id), dia: iso.format(dt), valor: Number(r.amount) };
    });
}
export async function estadoIntegracao(owner, payment, estado, motivo = null) {
  const r = await supabaseREST("rpc/crm_integracao_estado", {
    method: "POST",
    body: JSON.stringify({
      p_owner: owner,
      p_payment: String(payment),
      p_estado: estado,
      p_motivo: motivo,
    }),
  });
  if (!r.ok) {
    const erro = await r.json().catch(() => ({}));
    if (erro.code === "PGRST202") return; // Compatibilidade de publicação antes do SQL complementar.
    throw Error("Não foi possível registrar o acompanhamento da integração");
  }
}
export async function sincronizarDevolucoes(owner, pagamento, diaConfirmado) {
  const id = String(pagamento.id);
  const r = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}/refunds`,
    {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!r.ok)
    throw Error("Não foi possível consultar as devoluções no provedor");
  const refunds = await r.json();
  if (!Array.isArray(refunds)) throw Error("Resposta de devoluções inválida");
  const movimentos = movimentosAprovados(refunds);
  if (
    pagamento.status === "charged_back" &&
    !movimentos.length &&
    diaConfirmado
  )
    movimentos.push({
      id: `chargeback:${id}`,
      dia: diaConfirmado,
      valor: Number(pagamento.transaction_amount),
      nota: "Data do chargeback confirmada na conciliação",
    });
  const total = movimentos.reduce((s, m) => s + m.valor, 0);
  const esperado =
    pagamento.status === "refunded" || pagamento.status === "charged_back"
      ? Number(pagamento.transaction_amount)
      : Number(pagamento.transaction_amount_refunded || 0);
  if (!movimentos.length || total + 0.005 < esperado)
    throw Error(
      "Aguardando data e movimentos completos da devolução; confira o extrato do provedor",
    );
  const gravar = await supabaseREST("rpc/crm_sincronizar_devolucoes", {
    method: "POST",
    body: JSON.stringify({
      p_owner: owner,
      p_payment: id,
      p_movimentos: movimentos,
      p_status: pagamento.status,
    }),
  });
  if (!gravar.ok)
    throw Error(
      "Devolução pendente: confira movimentos manuais, dados da origem e atualização do módulo",
    );
}
