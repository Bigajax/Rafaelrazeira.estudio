import type { Metadata } from "next";
import {
  Anton,
  Archivo,
  Bebas_Neue,
  Big_Shoulders,
  Bodoni_Moda,
  DM_Serif_Display,
  Fraunces,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Oswald,
  Playfair_Display,
} from "next/font/google";
import s from "./crm.module.css";

/* As mesmas três vozes da /vitrine-digital e do /portfolio, e é essa a razão
   de estarem aqui: o CRM é área interna do MESMO produto. Um painel em
   Helvetica ao lado de um site em Archivo condensada seriam duas empresas. */
const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
/* A serifa leve é a primeira voz do título dos posts do Marketing (a
   segunda é a Archivo condensada). Só os posts usam; a ferramenta não. */
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });
/* As outras combinações do título dos posts (01/10: "a tipografia, eu poderia
   trocar quando quisesse, para testar"). Os pares estão em TIPOGRAFIAS
   (lib/marketing/tipos.ts). Sem preload: o navegador só baixa a fonte que
   um post na tela usa, e o resto do CRM não paga por elas. */
const anton = Anton({ subsets: ["latin"], preload: false, weight: "400", variable: "--font-anton" });
const dmserif = DM_Serif_Display({ subsets: ["latin"], preload: false, weight: "400", style: ["normal", "italic"], variable: "--font-dmserif" });
const oswald = Oswald({ subsets: ["latin"], preload: false, variable: "--font-oswald" });
const playfair = Playfair_Display({ subsets: ["latin"], preload: false, style: ["normal", "italic"], variable: "--font-playfair" });
const bebas = Bebas_Neue({ subsets: ["latin"], preload: false, weight: "400", variable: "--font-bebas" });
const fraunces = Fraunces({ subsets: ["latin"], preload: false, style: ["normal", "italic"], variable: "--font-fraunces" });
const shoulders = Big_Shoulders({ subsets: ["latin"], preload: false, variable: "--font-shoulders" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], preload: false, style: ["normal", "italic"], variable: "--font-bodoni" });
const titulos = [anton, dmserif, oswald, playfair, bebas, fraunces, shoulders, bodoni].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: { default: "Estúdio", template: "%s · Estúdio" },
  /* Ferramenta interna: fora do índice, e sem seguir link nenhum daqui. O
     middleware já barra quem não tem sessão, mas um robô que descobre a URL
     e a publica no resultado de busca é constrangimento sem invasão. */
  robots: { index: false, follow: false, nocache: true },
};

/* A tela do CRM não rola atrás de conteúdo carregado: ela é uma ferramenta
   aberta o dia inteiro, e o valor de cada abertura é o dado do momento. */
export const dynamic = "force-dynamic";

export default function LayoutCRM({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${s.app} ${display.variable} ${body.variable} ${mono.variable} ${serif.variable} ${titulos}`}>
      {children}
    </div>
  );
}
