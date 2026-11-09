import type { Metadata } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import { VitrineIphone } from "@/components/vitrine-iphone/VitrineIphone";
import { SemAncoraDoAnuncio } from "@/components/vitrine/SemAncoraDoAnuncio";
import { SITE } from "@/lib/idiomas";
import { ptIphone } from "@/messages/vitrine.iphone.pt";

/* ---------- a /vitrine/iphone (09/11/2026, pedido do Rafael) ----------
   O destino do lote 17 (docs/lotes/lote-17-iphone.md), no desenho da
   /loja-online e em preto (ver components/vitrine-iphone/VitrineIphone.tsx).
   Sem tela de carregamento: tráfego pago frio. */
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const titulo = Instrument_Sans({ subsets: ["latin"], variable: "--font-titulo" });

const title = "Vitrine digital para quem vende iPhone | Rafael Razeira";

export const metadata: Metadata = {
  /* absolute: o modelo do layout poria travessão na aba */
  title: { absolute: title },
  description: ptIphone.meta.description,
  alternates: { canonical: `${SITE}/vitrine/iphone` },
  openGraph: { title, description: ptIphone.meta.description, url: `${SITE}/vitrine/iphone`, locale: "pt_BR", type: "website" },
};

export default function VitrineIphonePage() {
  return <div className={`${titulo.variable} ${body.variable}`}>
    <SemAncoraDoAnuncio />
    <VitrineIphone />
  </div>;
}
