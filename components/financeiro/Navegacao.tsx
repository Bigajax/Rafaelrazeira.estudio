import Link from "next/link";
import { AREAS_FINANCEIRO, urlFinanceiro, type AreaFinanceiro } from "@/lib/financeiro/operacao";
import s from "@/components/sistema/sistema.module.css";

export function NavegacaoFinanceiro({ mes, ativa }: { mes: string; ativa?: AreaFinanceiro | "conferencia" }) {
  return <nav className={s.abas} aria-label="Áreas do Financeiro">
    {AREAS_FINANCEIRO.map(([id, nome]) => <Link key={id} href={urlFinanceiro(mes, id)} aria-current={ativa === id ? "page" : undefined}>{nome}</Link>)}
    <Link href={"/crm/conciliacao?mes=" + mes} aria-current={ativa === "conferencia" ? "page" : undefined}>Conferências</Link>
  </nav>;
}
