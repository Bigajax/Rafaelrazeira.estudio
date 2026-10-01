/* ============================================================
   CRIAR: a porta de entrada de uma peça

   Duas portas desde 01/10: a Paula propõe (o pedido de pautas, o estado
   dele e as pautas que esperam dia, que antes espremiam o calendário numa
   bandeja de 300px), ou você começa do zero, embaixo.

   Duas perguntas, nesta ordem. Primeiro "do que este post fala" (a
   CATEGORIA, 01/10), depois "o que ele entrega" (o PILAR, que decide o
   roteiro dos slides). O conteúdo do estúdio é geração de valor (30/09):
   quatro de cada cinco posts ensinam, mostram bastidor ou opinam, e um fala
   da oferta. A tela mostra as duas contas do mês na cara de quem vai criar.
   ============================================================ */
import type { Metadata } from "next";
import { clienteServidor } from "@/lib/crm/supabase";
import { hojeSP } from "@/lib/crm/regras";
import { CATEGORIAS, PILARES, type Categoria, type Peca } from "@/lib/marketing/tipos";
import { NovaPeca } from "@/components/marketing/NovaPeca";
import { PedirPautas } from "@/components/marketing/PedirPautas";
import { PautasEsperando } from "@/components/marketing/PautasEsperando";
import { criacao } from "@/lib/marketing/dados";
import { AbasMarketing } from "@/components/marketing/AbasMarketing";
import s from "@/app/(pt)/crm/crm.module.css";
import m from "@/app/(pt)/crm/marketing.module.css";

export const metadata: Metadata = { title: "Criar post" };

type DoMes = Pick<Peca, "pilar" | "categoria">;

export default async function PaginaCriar({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data } = await searchParams;
  const hoje = hojeSP();
  const inicio = `${hoje.slice(0, 7)}-01`;
  const supabase = await clienteServidor();
  const { semData, ultimoPautas, fila, vistoEm } = await criacao();
  /* sem a coluna da categoria (supabase/marketing-categorias.sql), a conta
     do mês segue só com o pilar */
  let { data: doMes, error } = await supabase
    .from("mkt_pecas")
    .select("pilar, categoria")
    .gte("criado_em", inicio)
    .returns<DoMes[]>();
  if (error) {
    ({ data: doMes } = await supabase.from("mkt_pecas").select("pilar").gte("criado_em", inicio).returns<DoMes[]>());
  }

  const lista = doMes ?? [];
  const venda = lista.filter((p) => p.pilar === "oferta").length;
  const valor = lista.filter((p) => p.pilar && PILARES[p.pilar]?.valor).length;
  const total = valor + venda;
  const pctValor = total ? Math.round((valor / total) * 100) : null;
  const porCategoria = Object.fromEntries(
    (Object.keys(CATEGORIAS) as Categoria[]).map((c) => [c, lista.filter((p) => p.categoria === c).length]),
  ) as Record<Categoria, number>;

  const dia = /^d{4}-d{2}-d{2}$/.test(data ?? "") ? data! : "";

  const paula = (
    <section className={m.portaPaula} aria-labelledby="porta-paula">
      <header className={m.portaCab}>
        <h2 id="porta-paula">
          A Paula propõe<i className={s.ponto}>.</i>
        </h2>
        <p>Ela lê tudo o que o feed já falou e traz pautas que ainda não saíram.</p>
      </header>
      <PedirPautas ultimo={ultimoPautas} fila={fila} vistoEm={vistoEm} />
      <h3 className={m.esperandoTitulo}>
        Esperando dia <span>{semData.length}</span>
      </h3>
      <PautasEsperando pecas={semData} />
    </section>
  );

  const doZero = (
    <section className={m.portaZero} aria-labelledby="porta-zero">
      <header className={m.portaCab}>
        <h2 id="porta-zero">
          {dia ? "Um post para este dia" : "Ou do zero"}
          <i className={s.ponto}>.</i>
        </h2>
        <p className={m.placar}>
          {total === 0
            ? "Nenhuma peça com pilar neste mês ainda. A régua é 80% valor, 20% venda."
            : `Neste mês: ${valor} de valor, ${venda} de venda (${pctValor}% valor). A régua é 80%.`}
        </p>
      </header>
      <NovaPeca data={dia} vendaAlta={pctValor !== null && pctValor < 80} porCategoria={porCategoria} />
    </section>
  );

  /* vindo do + de um dia do calendário, a pessoa já decidiu escrever: o
     formulário vem primeiro. Pela aba, a Paula abre a tela. */
  return (
    <div className={m.tela}>
      <AbasMarketing ativa="criar" />
      {dia ? doZero : paula}
      {dia ? paula : doZero}
    </div>
  );
}
