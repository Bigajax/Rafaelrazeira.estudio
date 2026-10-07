/* ============================================================
   OS RELATÓRIOS DE UMA LOJA (06/10/2026): /crm/performance/<loja>

   Um relatório por mês. Aqui o Rafael cria o do mês, escreve a leitura e
   o que foi feito, e copia o link para mandar no WhatsApp. Os números do
   relatório saem sozinhos do banco central (perf_relatorio).
   ============================================================ */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clienteServidor } from "@/lib/crm/supabase";
import { Relatorios, type RelatorioLinha } from "@/components/performance/Relatorios";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/performance.module.css";

export const metadata: Metadata = { title: "Relatórios do Performance" };
export const dynamic = "force-dynamic";

export default async function PaginaRelatorios({ params }: { params: Promise<{ loja: string }> }) {
  const { loja: lojaId } = await params;
  const supabase = await clienteServidor();
  const [{ data: loja }, { data: relatorios, error }] = await Promise.all([
    supabase.from("perf_lojas").select("id, nome, slug").eq("id", lojaId).maybeSingle(),
    supabase.from("perf_relatorios").select("id, mes, token, leitura, feito, updated_at").eq("loja_id", lojaId).order("mes", { ascending: false }),
  ]);
  if (!loja) notFound();

  return (
    <div className={p.tela}>
      <header className={p.cabeca}>
        <div>
          <p className={p.placar}>
            <Link href="/crm/performance">Performance</Link> › {loja.nome}
          </p>
          <h1>
            Relatórios do mês<i className={s.ponto}>.</i>
          </h1>
          <p className={p.placar}>Um por mês. Os números saem sozinhos; a leitura e o que foi feito são seus.</p>
        </div>
      </header>

      {error?.code === "42P01" ? (
        <p className={p.aviso}>
          A tabela dos relatórios ainda não existe. Rode a seção 10 do <code>supabase/performance.sql</code> no SQL Editor.
        </p>
      ) : null}

      <Relatorios lojaId={loja.id as string} relatorios={(relatorios ?? []) as RelatorioLinha[]} />
    </div>
  );
}
