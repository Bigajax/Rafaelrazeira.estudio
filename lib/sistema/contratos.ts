import { dataValida } from "./calendario";
export function validarContrato(dados: {
  titulo: string;
  valor_total: number;
  tipo?: string;
  valor_ciclo?: number | null;
  assinado_em?: string | null;
  parcelas: { numero: number; valor: number; vence_em: string }[];
  request_id?: string;
}): string | null {
  if (!String(dados.titulo ?? "").trim()) return "O contrato precisa de um título.";
  const valor = Number(dados.tipo === "recorrencia" ? dados.valor_ciclo : dados.valor_total);
  if (!Number.isFinite(valor) || valor <= 0) return "O valor do contrato precisa ser maior que zero.";
  if (dados.assinado_em && !dataValida(dados.assinado_em)) return "Data da contratação inválida.";
  if (!Array.isArray(dados.parcelas) || !dados.parcelas.length || dados.parcelas.length > 120)
    return "Confira o plano de parcelas.";
  const ns = new Set<number>();
  for (const p of dados.parcelas) {
    if (
      !Number.isInteger(p.numero) ||
      p.numero < 1 ||
      ns.has(p.numero) ||
      !Number.isFinite(Number(p.valor)) ||
      Number(p.valor) <= 0 ||
      !dataValida(p.vence_em)
    )
      return "Confira os valores, números e vencimentos das parcelas.";
    ns.add(p.numero);
  }
  if (
    dados.request_id &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dados.request_id)
  )
    return "Identificador da operação inválido.";
  return null;
}
