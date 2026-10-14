import Link from "next/link";
import type { ReactNode } from "react";
import s from "./sistema.module.css";

export function Cabecalho({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children?: ReactNode;
}) {
  return (
    <header className={s.cabeca}>
      <div>
        <h1>{titulo}</h1>
        <p className={s.descricao}>{descricao}</p>
      </div>
      <div className={s.acoes}>{children}</div>
    </header>
  );
}
export function Indicador({
  nome,
  valor,
  nota,
  href,
}: {
  nome: string;
  valor: string;
  nota: string;
  href: string;
}) {
  return (
    <Link href={href} className={s.kpi}>
      <small>{nome}</small>
      <b>{valor}</b>
      <span>{nota}</span>
    </Link>
  );
}
export function Aviso({
  children,
  erro = false,
}: {
  children: ReactNode;
  erro?: boolean;
}) {
  return (
    <div role={erro ? "alert" : "status"} className={erro ? s.erro : s.aviso}>
      {children}
    </div>
  );
}
export function SerieMensal({
  dados,
  series,
  rotulo,
  href,
}: {
  dados: { mes: string; valores: (number | null)[] }[];
  series: string[];
  rotulo: string;
  href: (mes: string) => string;
}) {
  const teto = Math.max(
    1,
    ...dados.flatMap((d) => d.valores.map((v) => Math.max(0, v ?? 0))),
  );
  const formatar = (v: number | null) =>
    v == null
      ? "Não disponível"
      : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <>
      <p className={s.descricao}>{rotulo}</p>
      <div className={s.grafico} data-meses={dados.length} aria-label={rotulo}>
        {dados.map((d) => (
          <Link
            key={d.mes}
            className={s.coluna}
            href={href(d.mes)}
            aria-label={`${d.mes}: ${series.map((nome, i) => `${nome} ${formatar(d.valores[i])}`).join("; ")}`}
          >
            <span className={s.barras}>
              {d.valores.map((v, i) => (
                <i
                  key={i}
                  className={`${s.barra} ${i === 2 ? s.barra3 : i ? s.barra2 : ""}`}
                  style={{ height: `${(Math.max(0, v ?? 0) / teto) * 100}%` }}
                />
              ))}
            </span>
            <span>
              {d.mes.slice(5, 7)}/{d.mes.slice(2, 4)}
            </span>
          </Link>
        ))}
      </div>
      <div className={s.legenda}>
        {series.map((nome, i) => (
          <span key={nome}>
            <i
              className={`${s.barra} ${i === 2 ? s.barra3 : i ? s.barra2 : ""}`}
            />
            {nome}
          </span>
        ))}
      </div>
      <details className={s.detalhes}>
        <summary>Ver valores e abrir o mês</summary>
        <div className={s.rolagem}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Mês</th>
                {series.map((nome) => (
                  <th key={nome} className={s.numero}>
                    {nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.map((d) => (
                <tr key={d.mes}>
                  <td>
                    <Link href={href(d.mes)}>{d.mes}</Link>
                  </td>
                  {d.valores.map((v, i) => (
                    <td key={i} className={s.numero}>
                      {formatar(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
