import type { SupabaseClient } from "@supabase/supabase-js";
export async function conferir<T extends { error: { message: string } | null }>(
  consulta: PromiseLike<T>,
): Promise<T> {
  const resultado = await consulta;
  if (resultado.error)
    throw new Error(
      "Não foi possível carregar os dados desta área. Tente novamente.",
    );
  return resultado;
}

export function tabelaAusente(erro: { code?: string } | null) {
  return erro?.code === "42P01" || erro?.code === "PGRST205";
}
/** Pagina até o fim; erro não é conjunto vazio. Ordem por chave única é obrigatória. */
export async function lerTodos<T>(
  banco: SupabaseClient,
  tabela: string,
  campos = "*",
  periodo?: { coluna: string; inicio: string; fim: string },
  filtros?: Record<string, string | string[]>,
): Promise<T[]> {
  const linhas: T[] = [];
  for (let inicio = 0; ; inicio += 500) {
    let consulta = banco
      .from(tabela)
      .select(campos)
      .order("id")
      .range(inicio, inicio + 499);
    if (periodo)
      consulta = consulta
        .gte(periodo.coluna, periodo.inicio)
        .lt(periodo.coluna, periodo.fim);
    for (const [coluna, valor] of Object.entries(filtros ?? {})) {
      if (Array.isArray(valor) && !valor.length) return [];
      consulta = Array.isArray(valor)
        ? consulta.in(coluna, valor)
        : consulta.eq(coluna, valor);
    }
    const { data, error } = await consulta;
    if (error)
      throw Object.assign(
        new Error(`Não foi possível carregar ${tabela}. Tente novamente.`),
        {
          code: error.code,
        },
      );
    const lote = (data ?? []) as T[];
    linhas.push(...lote);
    if (lote.length < 500) return linhas;
  }
}
