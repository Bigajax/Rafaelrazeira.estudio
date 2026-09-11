/* ============================================================
   A OFERTA POR IDIOMA: moeda, símbolo e os números

   Os preços em português são os de sempre (vitrine R$999 com entrada de
   R$199, landing R$497 com entrada de R$97). Os de inglês são a conversão
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

const fmt = (simbolo: string, locale: string) => (n: number) => `${simbolo}${n.toLocaleString(locale, { maximumFractionDigits: 0 })}`;

export const OFERTA: Record<Lang, OfertaIdioma> = {
  pt: {
    moeda: "BRL",
    simbolo: "R$",
    preco: fmt("R$", "pt-BR"),
    vitrine: { total: 999, entrada: 199, saldo: 800, avista: 899 },
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
