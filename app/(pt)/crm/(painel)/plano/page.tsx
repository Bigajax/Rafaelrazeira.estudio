/* ============================================================
   PLANO: o rumo do estúdio (30/09/2026)

   "Já não é mais só um CRM, é um sistema completo." Esta aba é a bússola
   dele: a missão, os projetos a que o Rafael se dedica e as metas de cada
   um, medidas todo mês. O método é o sistema de gestão da G4 (estratégico,
   tático, RMR e incentivo), no tamanho de um estúdio de uma pessoa; a
   explicação inteira está no topo de supabase/plano.sql.

   O ano vem da URL (?ano=2027) porque o tático é anual: planejar o ano que
   vem em dezembro não pode mexer no painel do ano corrente.
   ============================================================ */

import type { Metadata } from "next";
import { plano } from "@/lib/plano/dados";
import { hojeSP } from "@/lib/crm/regras";
import { Plano } from "@/components/plano/Plano";
import p from "@/app/(pt)/crm/plano.module.css";

export const metadata: Metadata = { title: "Plano" };

export default async function PaginaPlano({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const hoje = hojeSP();
  const anoHoje = Number(hoje.slice(0, 4));
  const mesHoje = Number(hoje.slice(5, 7));
  const { ano: pedido } = await searchParams;
  const ano = /^\d{4}$/.test(pedido ?? "") ? Number(pedido) : anoHoje;
  /* até que mês o ano já conta: o mês corrente, o ano inteiro se já passou,
     nenhum se ainda não começou */
  const ate = ano < anoHoje ? 12 : ano > anoHoje ? 0 : mesHoje;

  const dados = await plano(ano, ate);

  if (dados.semTabela) {
    return (
      <div className={p.tela}>
        <header className={p.cabeca}>
          <h1>Plano.</h1>
        </header>
        <div className={p.aviso}>
          <b>Falta criar as tabelas do plano.</b>
          <p>
            Cole o arquivo <code>supabase/plano.sql</code> inteiro no SQL Editor do Supabase e clique em Run. Depois é só
            recarregar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <Plano ano={ano} ate={ate} {...dados} />;
}
