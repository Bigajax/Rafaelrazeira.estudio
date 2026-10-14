import { diaLocal } from "./calendario";

/** Vigência comum às fontes automáticas de Hoje e Plano. Alvo anual mantém o ano civil. */
export function valoresDaMeta(
  meta: { ano: number; created_at?: string },
  fonte: Partial<Record<number, number>>,
  ate: number,
) {
  const criada = meta.created_at ? diaLocal(meta.created_at) : null;
  const anoCriacao = criada ? Number(criada.slice(0, 4)) : meta.ano;
  const de =
    anoCriacao > meta.ano
      ? 13
      : anoCriacao === meta.ano && criada
        ? Number(criada.slice(5, 7))
        : 1;
  return Object.fromEntries(
    Object.entries(fonte).filter(
      ([mes, v]) => Number(mes) >= de && Number(mes) <= ate && v !== undefined,
    ),
  );
}
