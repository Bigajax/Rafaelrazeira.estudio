/* ============================================================
   PERFORMANCE: as lojas que contam (06/10/2026)

   Cada vitrine do estúdio manda a contagem para cá (quem entrou, que
   peça abriu, quem chamou no WhatsApp) com uma chave própria, e esta
   tela é onde a chave nasce e a trava se mexe. "Último evento há 3 min"
   é a prova de que a Vercel da loja está com a chave certa: se parou,
   alguma coisa quebrou lá.

   Quem estende a trava no dia a dia é o recebimento da mensalidade no
   Caixa (trigger perf_ao_receber). Os botões aqui são a mão do Rafael.
   ============================================================ */

import type { Metadata } from "next";
import { lojasPerformance } from "@/lib/performance/dados";
import { clienteServidor } from "@/lib/crm/supabase";
import { ListaLojas } from "@/components/performance/ListaLojas";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/performance.module.css";

export const metadata: Metadata = { title: "Performance" };

export default async function PaginaPerformance() {
  const supabase = await clienteServidor();
  const [{ lojas, semTabela }, { data: leads }] = await Promise.all([
    lojasPerformance(),
    supabase
      .from("crm_leads")
      .select("id, nome, empresa, estagio")
      .neq("estagio", "perdido")
      .order("empresa", { ascending: true, nullsFirst: false })
      .returns<{ id: string; nome: string; empresa: string | null; estagio: string }[]>(),
  ]);

  const contando = lojas.filter((l) => l.resumo?.ultimo_evento_em).length;
  const pagando = lojas.filter((l) => l.situacao === "liberada" || l.situacao === "para_sempre").length;

  return (
    <div className={p.tela}>
      <header className={p.cabeca}>
        <div>
          <h1>
            Performance<i className={s.ponto}>.</i>
          </h1>
          <p className={p.placar}>
            {lojas.length === 0
              ? "Nenhuma loja contando ainda."
              : `${lojas.length} ${lojas.length === 1 ? "loja" : "lojas"}, ${contando} com contagem chegando, ${pagando} com a aba liberada.`}
          </p>
        </div>
      </header>

      {semTabela ? (
        <p className={p.aviso}>
          A tabela do Performance ainda não existe no banco. Rode o <code>supabase/performance.sql</code> no SQL Editor do
          Supabase do estúdio: até lá esta tela não tem o que mostrar.
        </p>
      ) : null}

      <ListaLojas
        lojas={lojas}
        leads={(leads ?? []).map((l) => ({ id: l.id, nome: l.empresa || l.nome }))}
        semTabela={semTabela}
      />
    </div>
  );
}
