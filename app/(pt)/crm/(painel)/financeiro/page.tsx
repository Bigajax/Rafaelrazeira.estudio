/* ============================================================
   FINANCEIRO: quanto entra, quanto sai e o que sobra (30/09/2026)

   O Caixa responde "quem me deve"; esta aba responde "o estúdio dá lucro?".
   A receita vem do Caixa (crm_recebimentos) e os custos de fin_custos; a
   conta mora em lib/financeiro/tipos.ts. O mês vem da URL (?mes=2026-09).
   ============================================================ */

import type { Metadata } from "next";
import { financeiro } from "@/lib/financeiro/dados";
import { caixa } from "@/lib/crm/dados";
import { hojeSP } from "@/lib/crm/regras";
import { proximoMes } from "@/lib/sistema/calendario";
import { lerTodos, tabelaAusente } from "@/lib/sistema/consultas";
import { clienteServidor } from "@/lib/crm/supabase";
import { Financeiro } from "@/components/financeiro/Financeiro";
import f from "@/app/(pt)/crm/financeiro.module.css";

export const metadata: Metadata = { title: "Financeiro" };

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; aba?: string; previsao?: string; filtro?: string }>;
}) {
  const hoje = hojeSP().slice(0, 7);
  const { mes: pedido, aba, previsao, filtro } = await searchParams;
  const mes =
    /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido ?? "") && pedido! <= proximoMes(hoje, 12)
      ? pedido!
      : hoje;
  const banco = await clienteServidor();
  const [dados, contas, conferencias] = await Promise.all([
    financeiro(Number(mes.slice(0, 4))),
    caixa(Number(mes.slice(0, 4))),
    lerTodos<{ id: string }>(banco, "crm_integracoes", "id", undefined, { estado: "pendente" }).catch((e) => {
      if (tabelaAusente(e)) return null;
      throw e;
    }),
  ]);

  if (dados.semTabela) {
    return (
      <div className={f.tela}>
        <h1>Financeiro.</h1>
        <div className={f.aviso}>
          <b>Falta criar a tabela de custos.</b>
          <p>
            Cole o arquivo <code>supabase/financeiro.sql</code> inteiro no SQL
            Editor do Supabase e clique em Run. Depois é só recarregar esta
            página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Financeiro
      mes={mes}
      hoje={hoje}
      custos={dados.custos}
      recebimentos={dados.recebimentos}
      dolar={dados.dolar}
      vendas={dados.vendas}
      escolha={dados.escolha}
      despesas={dados.despesas}
      devolucoes={dados.devolucoes}
      movimentosDisponiveis={dados.movimentosDisponiveis}
      aba={aba}
      previsao={contas.previsao}
      vencido={contas.vencidoContratual}
      ocorrencias={dados.ocorrencias}
      revisaoDisponivel={dados.revisaoDisponivel}
      historicoDespesas={dados.historicoDespesas}
      clientes={dados.clientes}
      previsaoSelecionada={previsao}
      contas={contas}
      filtro={filtro}
      conferenciasPendentes={conferencias?.length}
    />
  );
}
