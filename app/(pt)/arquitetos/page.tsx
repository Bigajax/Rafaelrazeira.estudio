import type { Metadata } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import { SiteArquiteto } from "@/components/arquiteto/SiteArquiteto";
import { SemAncoraDoAnuncio } from "@/components/vitrine/SemAncoraDoAnuncio";
import { ARQUITETO } from "@/lib/oferta";
import { SITE } from "@/lib/idiomas";

/* ---------- a /arquitetos (12/11/2026) ----------
   A página que vende o site de escritório de arquitetura, na linha do site
   que o estúdio fez para a NEAM (o núcleo dos arquitetos de Maringá). A NEAM
   NÃO aparece aqui: o núcleo ainda não aprovou o site e a ACIM pede
   aprovação de toda arte com a logo dela (decisão do Rafael em 12/11). O
   trabalho mostrado é um escritório de exemplo, com o rótulo o tempo todo.
   O preço vem de ARQUITETO em lib/oferta.ts. */
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const titulo = Instrument_Sans({ subsets: ["latin"], variable: "--font-titulo" });

const reais = (n: number) => n.toLocaleString("pt-BR");
const title = "Site para arquiteto e escritório de arquitetura | Rafael Razeira";
const description = `Um site com os seus projetos em tela cheia, o seu jeito de trabalhar e um contato que já chega com o tipo de obra e a metragem. R$ ${reais(ARQUITETO.total)}, sem mensalidade. Amostra com os seus projetos em até ${ARQUITETO.amostraHoras}h.`;

export const metadata: Metadata = {
  /* absolute: o modelo do layout acrescentaria o nome do estúdio com travessão */
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE}/arquitetos` },
  openGraph: { title, description, url: `${SITE}/arquitetos`, locale: "pt_BR", type: "website", images: [{ url: "/assets/og-rr.png?v=2", width: 1200, height: 630, alt: "Monograma RR do Rafael Razeira Estúdio" }] },
};

export default function ArquitetosPage() {
  const schema = {
    "@context": "https://schema.org", "@type": "Service", name: "Site para arquiteto",
    description, url: `${SITE}/arquitetos`, serviceType: "Criação de site para escritório de arquitetura",
    provider: { "@type": "ProfessionalService", name: "Rafael Razeira Estúdio", url: SITE },
    offers: { "@type": "Offer", price: ARQUITETO.total, priceCurrency: "BRL", url: `${SITE}/arquitetos` },
  };
  return <div className={`${titulo.variable} ${body.variable}`}>
    <SemAncoraDoAnuncio />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <SiteArquiteto />
  </div>;
}
