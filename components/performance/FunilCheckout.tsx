/* O funil da loja online no Performance (05/11/2026): os degraus da compra em
   pessoas, cada um com a parte que seguiu do anterior, e as quatro taxas com a
   base embaixo. Uma série só, uma cor (magnitude): a barra mede o degrau contra
   quem entrou na loja. É lista, então o leitor de tela lê como tabela. */

import Link from "next/link";
import { BASE_MINIMA, PERIODOS, degrausDoFunil, taxasDoFunil, type FunilCheckout as Funil } from "@/lib/performance/funil-checkout";
import f from "./funil.module.css";

const pct = (v: number | null) => (v === null ? "sem base" : (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: v < 0.1 ? 1 : 0 }) + "%");
const gente = (n: number) => (n === 1 ? "1 pessoa" : `${n.toLocaleString("pt-BR")} pessoas`);

export function FunilCheckout({ funil, dias, lojaId }: { funil: Funil | null; dias: number; lojaId: string }) {
  return (
    <section className={f.funil} aria-labelledby="funil-titulo">
      <header className={f.topo}>
        <div>
          <h2 id="funil-titulo">Funil da loja online</h2>
          <p>Pessoas em cada passo da compra paga no site. O pago conta quando o banco confirma.</p>
        </div>
        <nav className={f.periodos} aria-label="Período do funil">
          {PERIODOS.map((d) => (
            <Link key={d} href={`/crm/performance/${lojaId}?dias=${d}`} aria-current={d === dias ? "true" : undefined} scroll={false}>
              {d} dias
            </Link>
          ))}
        </nav>
      </header>

      {!funil ? (
        <p className={f.aviso}>
          O funil ainda não lê esta loja. Confira se o <code>supabase/performance-checkout.sql</code> rodou no banco do estúdio e se a <code>SUPABASE_SERVICE_ROLE_KEY</code> está no ambiente.
        </p>
      ) : funil.iniciado === 0 ? (
        <p className={f.aviso}>
          Ninguém começou a pagar pelo site nos últimos {funil.dias} dias{funil.visitantes ? ` (${gente(funil.visitantes)} entraram na loja)` : ""}. O funil aparece quando a loja vende pelo site, com o checkout ligado.
        </p>
      ) : (
        <>
          <ul className={f.taxas}>
            {taxasDoFunil(funil).map((t) => (
              <li key={t.nome} data-poucos={t.poucos || undefined}>
                <span className={f.taxaNome}>{t.nome}</span>
                <b>{pct(t.valor)}</b>
                <span className={f.taxaBase}>
                  {t.explica}: {gente(t.base)}
                  {t.poucos ? `. Poucos dados (menos de ${BASE_MINIMA}): ainda não é tendência.` : "."}
                </span>
              </li>
            ))}
          </ul>

          <ol className={f.degraus}>
            {degrausDoFunil(funil).map((d) => {
              const largura = funil.visitantes ? Math.max(d.n ? 1.5 : 0, (d.n / funil.visitantes) * 100) : 0;
              return (
                <li key={d.nome} title={`${d.nome}: ${gente(d.n)}${d.doAnterior === null ? "" : `, ${pct(d.doAnterior)} do passo anterior`}`}>
                  <span className={f.degrauNome}>{d.nome}</span>
                  <span className={f.trilho} aria-hidden="true">
                    <span className={f.barra} style={{ width: `${largura}%` }} />
                  </span>
                  <span className={f.degrauNumero}>
                    <b>{d.n.toLocaleString("pt-BR")}</b>
                    {d.doAnterior !== null ? <span>{pct(d.doAnterior)} do anterior</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
