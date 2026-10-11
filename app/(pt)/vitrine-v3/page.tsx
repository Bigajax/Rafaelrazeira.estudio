import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { LandingVitrine, type OfertaLanding } from "@/components/vitrine/LandingVitrine";
import { SemAncoraDoAnuncio } from "@/components/vitrine/SemAncoraDoAnuncio";
import { OFERTA } from "@/lib/oferta";
import { DEGRAUS, MENSALIDADE_ECOMMERCE, PLANOS_PERFORMANCE } from "@/lib/oferta-performance";
import { SITE } from "@/lib/idiomas";
import styles from "@/components/vitrine/landing.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const vitrine = OFERTA.pt.vitrine;
const title = `Vitrine digital com painel por R$ ${vitrine.total} | Rafael Razeira`;
const description = `Sua cliente chega no WhatsApp com a peça escolhida. Vitrine com a cara da sua loja, 20 produtos cadastrados e painel incluído. R$ ${vitrine.total}, sem mensalidade; entrada de R$ ${vitrine.entrada} e saldo após aprovação.`;

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: `${SITE}/vitrine-v3` },
  robots: { index: false, follow: false },
  openGraph: { title, description, url: `${SITE}/vitrine-v3`, locale: "pt_BR", type: "website" },
};

export default function VitrineV3Page() {
  const oferta: OfertaLanding = {
    ...vitrine, avista: vitrine.avista ?? null,
    performance: PLANOS_PERFORMANCE.pix_mensal.valor,
    pagamento: DEGRAUS.vender.cheio,
    ecommerce: DEGRAUS.loja.cheio,
    ecommerceMensal: MENSALIDADE_ECOMMERCE,
  };
  const schema = {
    "@context": "https://schema.org", "@type": "Service", name: "Vitrine digital com painel",
    description, url: `${SITE}/vitrine-v3`, serviceType: "Criação de vitrine digital",
    provider: { "@type": "ProfessionalService", name: "Rafael Razeira Estúdio", url: SITE },
    offers: { "@type": "Offer", price: vitrine.total, priceCurrency: "BRL", url: `${SITE}/vitrine-v3` },
  };
  return <div className={`${styles.site} ${display.variable} ${body.variable} ${mono.variable}`}>
    <SemAncoraDoAnuncio />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <LandingVitrine oferta={oferta} />
  </div>;
}
