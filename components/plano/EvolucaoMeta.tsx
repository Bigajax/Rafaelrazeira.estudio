"use client";
import { formatar, type Meta } from "@/lib/plano/tipos";
import { valoresDaMeta } from "@/lib/sistema/metas";
import s from "@/components/sistema/sistema.module.css";
export function EvolucaoMeta({
  meta: m,
  valores,
  ate,
}: {
  meta: Meta;
  valores: Partial<Record<number, number>>;
  ate: number;
}) {
  const vigentes = valoresDaMeta(
    m,
    Object.fromEntries(Array.from({ length: ate }, (_, i) => [i + 1, 0])),
    ate,
  );
  let soma = 0,
    completo = true;
  const linhas = Object.keys(vigentes).map((n) => {
    const mes = Number(n),
      v = valores[mes];
    if (v === undefined) completo = false;
    else soma += v;
    return {
      mes,
      real: m.periodo === "ano" ? (completo ? soma : null) : (v ?? null),
      alvo: m.periodo === "ano" ? (m.alvo * mes) / 12 : m.alvo,
    };
  });
  const max = Math.max(
    1,
    ...linhas.flatMap((l) => [Math.abs(l.real ?? 0), l.alvo]),
  );
  return (
    <details className={s.detalhes}>
      <summary>Ver evolução e alvo</summary>
      <p className={s.descricao}>
        {m.periodo === "ano"
          ? "Alvo anual do ano civil; ritmo proporcional aos meses do ano. Medição automática começa na vigência da meta."
          : "Realizado e alvo de cada mês da vigência."}{" "}
        {m.direcao === "reduzir"
          ? "Quanto menor, melhor; o alvo representa o limite."
          : "Quanto maior, melhor."}
      </p>
      <div className={s.rolagem}>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th>Mês</th>
              <th>
                {m.periodo === "ano" ? "Realizado acumulado" : "Realizado"}
              </th>
              <th>Alvo / ritmo</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.mes}>
                <td>
                  {String(l.mes).padStart(2, "0")}/{m.ano}
                </td>
                <td>
                  {l.real === null ? "A apurar" : formatar(l.real, m.unidade)}
                  <span className={s.trilhoBarra} aria-hidden="true">
                    <i
                      style={{
                        width: (Math.abs(l.real ?? 0) / max) * 100 + "%",
                      }}
                    />
                  </span>
                </td>
                <td>
                  {formatar(l.alvo, m.unidade)}
                  <span className={s.trilhoBarra} aria-hidden="true">
                    <i
                      style={{
                        width: (l.alvo / max) * 100 + "%",
                        background: "#8f9d88",
                      }}
                    />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
