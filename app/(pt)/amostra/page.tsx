import type { Metadata } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import { FormAmostraPassos } from "@/components/amostra/FormAmostraPassos";
import { SemAncoraDoAnuncio } from "@/components/vitrine/SemAncoraDoAnuncio";

/* ---------- a /amostra (09/11/2026, pedido do Rafael) ----------
   O destino do conjunto novo do criativo estático: o anúncio leva direto ao
   formulário em passos, sem página de vendas no meio (o funil da Arcus).
   Ver components/amostra/FormAmostraPassos.tsx. Fora do Google: é a porta
   de um anúncio, não uma página para ser achada. */
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const titulo = Instrument_Sans({ subsets: ["latin"], variable: "--font-titulo" });

export const metadata: Metadata = {
  /* absolute: o modelo do layout poria travessão na aba */
  title: { absolute: "Veja a sua loja pronta | Rafael Razeira" },
  description: "Responde seis perguntas rápidas e eu monto a amostra da sua loja com as suas peças, sem custo. Em até 24h ela chega no seu WhatsApp.",
  robots: { index: false, follow: false },
};

export default function AmostraPage() {
  return <div className={`${titulo.variable} ${body.variable}`}>
    <SemAncoraDoAnuncio />
    <FormAmostraPassos />
  </div>;
}
