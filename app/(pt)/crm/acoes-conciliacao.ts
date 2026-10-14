"use server";
import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { dataValida } from "@/lib/sistema/calendario";
import { hojeSP } from "@/lib/crm/regras";
import { processarPagamento } from "@/lib/mercadopago/processar";

export async function atualizarPagamento(payment: string, dia?: string) {
  const user = await usuarioAtual();
  if (!user || user.id !== process.env.CRM_OWNER_ID)
    return { ok: false, erro: "Sessão sem acesso à integração." };
  if (
    !/^\d{1,30}$/.test(payment) ||
    (dia && (!dataValida(dia) || dia > hojeSP()))
  )
    return { ok: false, erro: "Pagamento ou data inválidos." };
  const b = await clienteServidor();
  const [recebimento, pendencia] = await Promise.all([
    b
      .from("crm_recebimentos")
      .select("id")
      .eq("mp_payment_id", payment)
      .limit(1),
    b.from("crm_integracoes").select("id").eq("payment_id", payment).limit(1),
  ]);
  if (!recebimento.data?.length && !pendencia.data?.length)
    return { ok: false, erro: "Pagamento não encontrado neste CRM." };
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment}`,
      {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      throw Error("Não foi possível consultar o pagamento na origem.");
    await processarPagamento(user.id, await response.json(), dia);
    revalidatePath("/crm", "layout");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Não foi possível atualizar.",
    };
  }
}
