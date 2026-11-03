/* ============================================================
   A OFERTA POR IDIOMA: moeda, símbolo e os números

   Os preços em português: vitrine R$999 com entrada de R$500 (50%, desde
   28/10/2026; era R$199 desde 20/08) e landing R$497 com entrada de R$97. Os de inglês são a conversão
   arredondada para número de prateleira, mantendo a proporção da entrada
   (~20%). São PLACEHOLDER A CONFIRMAR com o Rafael antes de a versão em
   inglês receber anúncio: ele decidiu converter os de hoje, não fixou o
   número. A landing estática não importa TS, então os mesmos valores
   aparecem como string em CONFIG_LP_EN (public/estudio/js/config.js) com
   o mesmo aviso: ao mudar aqui, mudar lá.
   ============================================================ */
import type { Lang } from "./idiomas";

export type Moeda = "BRL" | "USD";

export interface OfertaIdioma {
  moeda: Moeda;
  simbolo: string;
  /* formata um inteiro como preço da casa: "R$999" / "US$199" (sem centavos) */
  preco: (n: number) => string;
  vitrine: { total: number; entrada: number; saldo: number; avista?: number };
  landing: { total: number; entrada: number; saldo: number };
}

/* O SITE IMERSIVO PARA MARCAS (/site-imersivo, 15/10/2026): só em português.
   R$ 4.997 é o preço dos três primeiros projetos (preço de case, decidido pelo
   Rafael em 15/10); depois deles a ideia é subir. Metade na entrada porque o
   crédito de IA sai antes da entrega. 4.997 não divide por 2: a entrada leva o
   real a mais. */
export const IMERSIVO = { total: 4997, entrada: 2499, saldo: 2498 } as const;

/* O TURBINAR (/turbinar, 03/11/2026): o estúdio roda os anúncios da Meta
   da loja que já tem a vitrine, por mês. A verba vai direto da loja para a
   Meta, no cartão dela; o estúdio cobra só a gestão. Números SUGERIDOS em
   03/11 a partir da pesquisa de mercado da sessão (freelancer iniciante
   cobra R$ 500 a R$ 1.200 por conta pequena; agência, cerca de R$ 1.500;
   verba mais citada para negócio local, R$ 30 a R$ 50 por dia, piso de
   R$ 20): o Rafael confirma depois do piloto com as 2 primeiras lojas. */
export const TURBINAR = {
  gestao: 497,
  /* o preço de piloto, nos primeiros meses, em troca de usar os números como caso */
  piloto: 397,
  mesesPiloto: 3,
  /* a verba mínima e a recomendada, por dia, pagas à Meta */
  verbaDia: 20,
  verbaRecomendadaDia: 30,
  /* o prazo de começo, o tempo de o anúncio aprender e dar para medir */
  prazoMeses: 3,
} as const;

const fmt = (simbolo: string, locale: string) => (n: number) => `${simbolo}${n.toLocaleString(locale, { maximumFractionDigits: 0 })}`;

export const OFERTA: Record<Lang, OfertaIdioma> = {
  pt: {
    moeda: "BRL",
    simbolo: "R$",
    preco: fmt("R$", "pt-BR"),
    /* 50% de entrada desde 28/10/2026, decisão do Rafael. 999 não divide
       por 2 sem centavo: a entrada leva o real a mais, como no IMERSIVO.
       As propostas já enviadas seguem com os R$ 199 delas (lib/propostas.ts). */
    vitrine: { total: 999, entrada: 500, saldo: 499, avista: 899 },
    landing: { total: 497, entrada: 97, saldo: 400 },
  },
  en: {
    moeda: "USD",
    simbolo: "US$",
    preco: fmt("US$", "en-US"),
    /* PLACEHOLDER A CONFIRMAR: 999/5,4 ≈ 185 -> 199; entrada ~20% -> 39 */
    vitrine: { total: 199, entrada: 39, saldo: 160 },
    /* PLACEHOLDER A CONFIRMAR: 497/5,4 ≈ 92 -> 99; entrada ~20% -> 19 */
    landing: { total: 99, entrada: 19, saldo: 80 },
  },
};
