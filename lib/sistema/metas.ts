import { diaLocal } from "./calendario";

export function inicioDaMeta(meta: { ano?: number; created_at?: string }): number {
  if (!meta.created_at || !meta.ano) return 1;
  const criada = diaLocal(meta.created_at);
  const anoCriacao = Number(criada.slice(0, 4));
  return anoCriacao > meta.ano ? 13 : anoCriacao === meta.ano ? Number(criada.slice(5, 7)) : 1;
}

/** Vigência comum às fontes automáticas de Hoje e Plano. Alvo anual mantém o ano civil. */
export function valoresDaMeta(
  meta: { ano: number; created_at?: string },
  fonte: Partial<Record<number, number>>,
  ate: number,
) {
  const de = inicioDaMeta(meta);
  return Object.fromEntries(
    Object.entries(fonte).filter(
      ([mes, v]) => Number(mes) >= de && Number(mes) <= ate && v !== undefined,
    ),
  );
}
