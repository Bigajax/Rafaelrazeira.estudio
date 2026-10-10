import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { AdminV2, BarraV2, CroV2, DemoV2, DorV2, FaqV2, FimV2, HeaderV2, HeroV2, MontagemV2, OfertaV2, ProvaV2, RiscoV2, VideoV2 } from "@/components/vitrine-v2/secoes";
import { LangProvider } from "@/components/i18n";
import { PRECO_PIX, ptV2, v2 } from "@/messages/vitrine-v2.pt";
import styles from "../vitrine-digital/vitrine.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

/* noindex enquanto for teste: a /vitrine-digital continua sendo a página
   da vitrine para o Google, e duas páginas parecidas disputariam a mesma
   busca. Se a V2 vencer, ela assume o endereço de lá. */
export const metadata: Metadata = {
  title: ptV2.meta.title,
  description: ptV2.meta.description,
  robots: { index: false, follow: false },
};

/* ============================================================
   A VITRINE V2 (05/10/2026): a compra direta, em 9 partes

   Chegou a ter 16 seções, uma por parte do roteiro do Rafael, e várias
   repetiam a mesma ideia (o problema do direct três vezes, o caminho até
   o WhatsApp quatro, o CRO duas). Num anúncio cuja leitura mediana é de
   13 s, cada seção a mais empurra o preço para longe. Em 05/10 ficou:

    1 hero com a compra gravada (papel)    VSL (grafite)
    2 a dor: o WhatsApp lotado (papel)
    3 como funciona: as quatro telas (grafite)
    4 o diferencial: a prancha do CRO (papel)
    5 prova: vérít.lab, Japa e Full Time (grafite)
    6 o painel da loja, testável, com a faixa do bônus (papel)
    7 a oferta: o cupom (menta)
    8 depois da compra: a conversa (grafite)
    9 FAQ (papel) e fecho (grafite)

   Saíram (o código continua em secoes.tsx, marcado FORA DA PÁGINA): a
   equação, os dois caminhos, a escala, o "não é template" (a prova
   absorveu) e o painel de desempenho grande (virou a faixa do bônus).

   Papel e grafite se alternam e nunca encostam duas escuras.

   O dicionário é montado AQUI, no servidor, e desce pelo provider: é o
   que impede o lib/propostas.ts de ir para o JavaScript do navegador.
   ============================================================ */
export default function VitrineV2Page() {
  return <LangProvider lang="pt" messages={{ ...ptV2, v2 }}><div className={`${styles.site} ${display.variable} ${body.variable} ${mono.variable}`}>
    <HeaderV2 />
    <main>
      <HeroV2 />
      <VideoV2 />
      <DorV2 />
      <DemoV2 />
      <CroV2 />
      <ProvaV2 />
      <AdminV2 />
      <OfertaV2 />
      <RiscoV2 />
      <FaqV2 />
      <FimV2 />
    </main>
    <BarraV2 />
    <MontagemV2 valor={PRECO_PIX} />
  </div></LangProvider>;
}
