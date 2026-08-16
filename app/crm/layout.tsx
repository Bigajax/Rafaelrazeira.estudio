import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import s from "./crm.module.css";

/* As mesmas três vozes da /vitrine-digital e do /portfolio, e é essa a razão
   de estarem aqui: o CRM é área interna do MESMO produto. Um painel em
   Helvetica ao lado de um site em Archivo condensada seriam duas empresas. */
const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "CRM", template: "%s — CRM" },
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
    <div className={`${s.app} ${display.variable} ${body.variable} ${mono.variable}`}>
      {children}
    </div>
  );
}
