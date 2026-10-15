import Link from "next/link";
import { clienteServidor } from "@/lib/crm/supabase";
import { lerTodos, tabelaAusente } from "@/lib/sistema/consultas";
import { Cabecalho, Aviso } from "@/components/sistema/Painel";
import { AtualizarPagamento } from "@/components/financeiro/Conciliacao";
import s from "@/components/sistema/sistema.module.css";
import { NavegacaoFinanceiro } from "@/components/financeiro/Navegacao";
import { hojeSP } from "@/lib/crm/regras";
export const metadata = { title: "Conciliação" };
export default async function Conciliacao({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes: pedido } = await searchParams;
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido ?? "") ? pedido! : hojeSP().slice(0, 7);
  const b = await clienteServidor();
  const [jobs, rs] = await Promise.all([
    lerTodos<{
      id: string;
      payment_id: string;
      estado: string;
      motivo: string | null;
      ultima_tentativa: string;
      tentativas: number;
    }>(b, "crm_integracoes").catch((e) => {
      if (tabelaAusente(e)) return null;
      throw e;
    }),
    lerTodos<{
      id: string;
      mp_payment_id: string | null;
      mp_external_reference: string | null;
      lead_id: string | null;
      parcela_id: string | null;
      valor: number;
    }>(
      b,
      "crm_recebimentos",
      "id,mp_payment_id,mp_external_reference,lead_id,parcela_id,valor",
    ),
  ]);
  const pendentes = (jobs ?? []).filter((j) => j.estado === "pendente");
  const pagamentos = [
    ...new Set(rs.filter((r) => r.mp_payment_id).map((r) => r.mp_payment_id!)),
  ];
  return (
    <div className={s.tela}>
      <Cabecalho
        titulo="Conferências financeiras"
        descricao="Confira pagamentos automáticos e resolva registros pendentes. Atualizar consulta o Mercado Pago; não faz uma cobrança nem devolve dinheiro."
      >
        <Link className={s.botao} href={"/crm/financeiro?mes=" + mes}>
          Financeiro
        </Link>
        <Link className={s.botao} href="/crm/caixa">
          A receber
        </Link>
      </Cabecalho>
      <NavegacaoFinanceiro mes={mes} ativa="conferencia" />
      {jobs === null ? (
        <Aviso>
          O acompanhamento de tentativas aguarda a atualização do módulo. Os
          pagamentos já registrados continuam disponíveis para conferência.
        </Aviso>
      ) : null}
      <section className={s.painel}>
        <h2>Pagamentos que precisam de conferência · {pendentes.length}</h2>
        {pendentes.length ? (
          <ul className={s.fila}>
            {pendentes.map((j) => (
              <li key={j.id}>
                <div>
                  <b>Pagamento {j.payment_id}</b>
                  <small>{j.motivo}</small>
                  <small>
                    {j.tentativas} tentativa(s) ·{" "}
                    {new Date(j.ultima_tentativa).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </small>
                  <AtualizarPagamento payment={j.payment_id} pendencia />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.vazio}>Nenhum pagamento aguardando conferência registrado.</p>
        )}
      </section>
      <section className={s.painel}>
        <h2>Pagamentos identificados do Mercado Pago</h2>
        <p className={s.descricao}>
          Uma mensalidade de Performance pode ter identificação válida sem
          parcela. Atualizar consulta o provedor; não realiza uma cobrança ou
          devolução.
        </p>
        <ul className={s.fila}>
          {pagamentos.map((id) => {
            const r = rs.find((r) => r.mp_payment_id === id)!;
            return (
              <li key={id}>
                <div>
                  <b>Pagamento {id}</b>
                  <small>
                    {r.mp_external_reference?.startsWith("perf:")
                      ? "Performance"
                      : r.parcela_id
                        ? "Vinculado à parcela"
                        : r.lead_id
                          ? "Identificado pelo negócio"
                          : "Identificação pendente"}
                  </small>
                  {r.lead_id ? (
                    <Link href={"/crm/lead/" + r.lead_id}>Abrir negócio</Link>
                  ) : null}
                </div>
                <AtualizarPagamento payment={id} />
              </li>
            );
          })}
        </ul>
        {!pagamentos.length ? (
          <p className={s.vazio}>Nenhum pagamento do provedor registrado.</p>
        ) : null}
      </section>
    </div>
  );
}
