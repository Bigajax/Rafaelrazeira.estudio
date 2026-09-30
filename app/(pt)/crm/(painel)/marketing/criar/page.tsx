/* ============================================================
   CRIAR: a porta de entrada de uma peça

   A primeira pergunta não é "qual formato", é "o que este post ENTREGA".
   O conteúdo do estúdio é geração de valor (30/09): quatro de cada cinco
   posts ensinam, mostram bastidor ou opinam, e um fala da oferta. A tela
   mostra essa conta do mês na cara de quem vai criar, antes da escolha.
   ============================================================ */
import type { Metadata } from "next";
import { clienteServidor } from "@/lib/crm/supabase";
import { hojeSP } from "@/lib/crm/regras";
import { PILARES, type Peca } from "@/lib/marketing/tipos";
import { NovaPeca } from "@/components/marketing/NovaPeca";
import { AbasMarketing } from "@/components/marketing/AbasMarketing";
import s from "@/app/(pt)/crm/crm.module.css";
import m from "@/app/(pt)/crm/marketing.module.css";

export const metadata: Metadata = { title: "Criar post" };

export default async function PaginaCriar({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data } = await searchParams;
  const hoje = hojeSP();
  const inicio = `${hoje.slice(0, 7)}-01`;
  const supabase = await clienteServidor();
  const { data: doMes } = await supabase
    .from("mkt_pecas")
    .select("pilar")
    .gte("criado_em", inicio)
    .returns<Pick<Peca, "pilar">[]>();

  const lista = doMes ?? [];
  const venda = lista.filter((p) => p.pilar === "oferta").length;
  const valor = lista.filter((p) => p.pilar && PILARES[p.pilar]?.valor).length;
  const total = valor + venda;
  const pctValor = total ? Math.round((valor / total) * 100) : null;

  return (
    <div className={m.tela}>
      <AbasMarketing ativa="criar" />
      <header className={m.cabeca}>
        <div>
          <h1>
            O que este post entrega<i className={s.ponto}>?</i>
          </h1>
          <p className={m.placar}>
            {total === 0
              ? "Nenhuma peça com pilar neste mês ainda. A régua é 80% valor, 20% venda."
              : `Neste mês: ${valor} de valor, ${venda} de venda (${pctValor}% valor). A régua é 80%.`}
          </p>
        </div>
      </header>
      <NovaPeca data={/^\d{4}-\d{2}-\d{2}$/.test(data ?? "") ? data! : ""} vendaAlta={pctValor !== null && pctValor < 80} />
    </div>
  );
}
