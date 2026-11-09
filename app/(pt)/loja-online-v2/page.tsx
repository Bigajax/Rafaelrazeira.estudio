import type { Metadata } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import { LojaOnlineV2 } from "@/components/loja-online/LojaOnlineV2";
import { SemAncoraDoAnuncio } from "@/components/vitrine/SemAncoraDoAnuncio";

/* ---------- a /loja-online-v2 (08/11/2026) ----------
   A segunda versão da página da Loja online, pedida pelo Rafael "neste
   estilo" (a página de cadastro do TikTok for Business): simples, direta,
   mostrando resultado, com o formulário na própria página.

   ATENÇÃO: os resultados e as histórias são ILUSTRATIVOS ("neste primeiro
   momento pode ser fake", Rafael, 08/11), marcados como tal na tela. Por isso
   a página fica fora do Google (noindex) e sem link em lugar nenhum: antes de
   um anúncio apontar para cá, os números viram medidos (casos reais) ou a
   seção sai. */
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const titulo = Instrument_Sans({ subsets: ["latin"], variable: "--font-titulo" });

export const metadata: Metadata = {
  title: { absolute: "E-commerce para a sua loja vender mais | Rafael Razeira" },
  description: "E-commerce em que o cliente escolhe o tamanho, calcula o frete e paga no Pix ou no cartão, sem esperar você responder. Amostra com as suas peças em até 24h.",
  robots: { index: false, follow: false },
};

export default function LojaOnlineV2Page() {
  return <div className={`${titulo.variable} ${body.variable}`}>
    <SemAncoraDoAnuncio />
    <LojaOnlineV2 />
  </div>;
}
