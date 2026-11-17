/* A oferta do evento fica congelada, mesmo se o preço de catálogo mudar. */
export const CAMPANHA_RASPADINHA = "bloco-arquitetura-2026";
export const RASPADINHA = { originalCentavos: 149900, descontoPercentual: 50, finalCentavos: 74950 } as const;
export const reaisCentavos = (valor: number) => (valor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const tokenValido = (valor: string) => /^[a-f0-9]{64}$/.test(valor);

export type EstadoRaspadinha =
  | { estado: "disponivel" }
  | { estado: "indisponivel" }
  | { estado: "resgatado" | "utilizado"; nome: string; codigo: string };

export type CupomEvento = {
  campanha: string;
  owner_id: string;
  token: string;
  codigo: string;
  original_centavos: number;
  final_centavos: number;
  criado_em: string;
  resgatado_em: string | null;
  utilizado_em: string | null;
  nome: string | null;
  whatsapp: string | null;
  recibo_hash: string | null;
};
