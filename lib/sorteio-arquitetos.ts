export const SORTEIO_ARQUITETOS = "bloco-arquitetura-site-2026";
export const VALOR_SITE_CENTAVOS = 149900;
export const COOKIE_SORTEIO = "rr-sorteio-arquitetos";
export const ROTA_SORTEIO = "/arquitetos/raspadinha/participar";

// Oferta congelada para esta campanha. Mudanças futuras de preço pedem outra campanha.
export const BENEFICIOS_SORTEIO = {
  site: { rotulo: "Site de presente", destaque: "Um site", legenda: "de presente para o seu escritório", descontoCentavos: 149900, finalCentavos: 0 },
  cupom50: { rotulo: "50% de desconto", destaque: "50%", legenda: "de desconto no site do seu escritório", descontoCentavos: 74950, finalCentavos: 74950 },
  cupom300: { rotulo: "R$ 300 de desconto", destaque: "R$ 300", legenda: "de desconto no site do seu escritório", descontoCentavos: 30000, finalCentavos: 119900 },
} as const;
export type ResultadoBilhete = keyof typeof BENEFICIOS_SORTEIO;
export type EstadoSorteio =
  | { estado: "nao-aberto" | "inscricoes-abertas" | "encerrado" }
  | { estado: "aguardando"; nome: string }
  | { estado: "resultado"; nome: string; ganhou: boolean; beneficio: ResultadoBilhete; codigo: string; entregue: boolean; utilizado: boolean };

export type CampanhaSorteio = {
  campanha: string; owner_id: string; criado_em: string;
  sorteado_em: string | null; ganhador_id: string | null;
};
export type ParticipanteSorteio = {
  id: string; campanha: string; nome: string; whatsapp: string; criado_em: string;
  codigo: string; entregue_em: string | null;
  beneficio: ResultadoBilhete | null; faixa50: number | null;
  utilizado_em: string | null; final_centavos: number | null; desconto_centavos: number | null;
};
