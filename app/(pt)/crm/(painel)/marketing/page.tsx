/* ============================================================
   MARKETING: o calendário do time

   O time é a Paula (pauta), o Caetano (copy), a Dora (arte) e a Vera
   (revisão), os mesmos do squad `rafaelrazeira-estudio`. Eles rodam no PC,
   pelo worker; esta tela é onde se pede, se agenda e se vê o feed do mês
   montado antes de existir.
   ============================================================ */

import type { Metadata } from "next";
import Link from "next/link";
import { calendario } from "@/lib/marketing/dados";
import { hojeSP } from "@/lib/crm/regras";
import { Calendario } from "@/components/marketing/Calendario";
import { SinalTime } from "@/components/marketing/SinalTime";
import { AbasMarketing } from "@/components/marketing/AbasMarketing";
import s from "@/app/(pt)/crm/crm.module.css";
import m from "@/app/(pt)/crm/marketing.module.css";

export const metadata: Metadata = { title: "Marketing" };

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function chaveMes(ano: number, mes: number) {
  const d = new Date(ano, mes - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PaginaMarketing({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const hoje = hojeSP();
  const { mes: pedido } = await searchParams;
  const [ano, mes] = /^\d{4}-\d{2}$/.test(pedido ?? "")
    ? pedido!.split("-").map(Number)
    : hoje.split("-").slice(0, 2).map(Number);

  const inicio = `${chaveMes(ano, mes)}-01`;
  const fim = `${chaveMes(ano, mes)}-${String(new Date(ano, mes, 0).getDate()).padStart(2, "0")}`;
  const { noMes, semData, vistoEm, fila } = await calendario(inicio, fim);

  const prontas = noMes.filter((p) => p.status !== "rascunho").length;

  return (
    <div className={m.tela}>
      <AbasMarketing ativa="calendario" />
      <header className={m.cabeca}>
        <div>
          <h1>
            {MESES[mes - 1]}
            <i className={s.ponto}>.</i>
          </h1>
          <p className={m.placar}>
            {noMes.length === 0
              ? "Nenhuma peça no mês ainda."
              : `${noMes.length} ${noMes.length === 1 ? "peça" : "peças"} no mês, ${prontas} ${prontas === 1 ? "pronta" : "prontas"}.`}
          </p>
        </div>
        <nav className={m.meses} aria-label="Trocar de mês">
          <Link href={`/crm/marketing?mes=${chaveMes(ano, mes - 1)}`} className={s.btnMini}>
            {MESES[(mes + 10) % 12]}
          </Link>
          <Link href="/crm/marketing" className={s.btnMini}>
            Hoje
          </Link>
          <Link href={`/crm/marketing?mes=${chaveMes(ano, mes + 1)}`} className={s.btnMini}>
            {MESES[mes % 12]}
          </Link>
        </nav>
        <SinalTime vistoEm={vistoEm} abertos={fila} />
      </header>

      <Calendario ano={ano} mes={mes} hoje={hoje} noMes={noMes} semData={semData} />
    </div>
  );
}
