export type EventoCliente = {
  id: string;
  tipo: "etapas" | "contratos" | "financeiro" | "entregas";
  quando: string;
  titulo: string;
  nota: string;
  href: string;
};
export function paginarHistorico(
  eventos: EventoCliente[],
  tipo: string | undefined,
  pagina: number,
  tamanho = 30,
) {
  const filtrados = eventos
    .filter((e) => !tipo || e.tipo === tipo)
    .sort(
      (a, b) => b.quando.localeCompare(a.quando) || a.id.localeCompare(b.id),
    );
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / tamanho));
  const atual = Number.isFinite(pagina)
    ? Math.max(1, Math.min(totalPaginas, Math.floor(pagina)))
    : 1;
  return {
    eventos: filtrados.slice((atual - 1) * tamanho, atual * tamanho),
    atual,
    totalPaginas,
    total: filtrados.length,
  };
}
