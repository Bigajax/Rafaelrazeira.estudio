import { caixa } from "@/lib/crm/dados";
import { clienteServidor } from "@/lib/crm/supabase";
import { lerTodos, tabelaAusente } from "@/lib/sistema/consultas";
import { PREFIXO_COBRANCA } from "./operacao";
import type { Interacao } from "@/lib/crm/tipos";

export async function carregarCaixa(ano: number) {
  const b = await clienteServidor();
  const [contas, contatos, jobs] = await Promise.all([
    caixa(ano),
    lerTodos<Interacao>(b, "crm_interacoes"),
    lerTodos<{ id: string; estado: string }>(
      b,
      "crm_integracoes",
      "id,estado",
    ).catch((e) => {
      if (tabelaAusente(e)) return null;
      throw e;
    }),
  ]);
  return {
    contas,
    contatos: contatos.filter((i) => i.resumo?.startsWith(PREFIXO_COBRANCA)),
    processamentos: jobs?.filter((j) => j.estado === "pendente").length ?? null,
  };
}
export type DadosCaixa = Awaited<ReturnType<typeof carregarCaixa>>;
