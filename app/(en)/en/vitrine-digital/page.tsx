import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { Analytics, BrandBand, FAQ, FinalCTA, Header, Hero, HowItWorks, Included, MobileBar, Offer, PainSolution, Panel, Process, Projects, QuemFaz } from "@/components/vitrine/sections";
import { LangProvider } from "@/components/i18n";
import { alternatesPara, SITE } from "@/lib/idiomas";
import { OFERTA } from "@/lib/oferta";
import { en } from "@/messages/vitrine.en";
import styles from "@/app/(pt)/vitrine-digital/vitrine.module.css";

/* ============================================================
   /en/vitrine-digital: a MESMA página da /vitrine-digital com o dicionário
   em inglês (messages/vitrine.en.tsx). Os componentes, o CSS, as fontes e
   a ordem das seções são os de app/(pt)/vitrine-digital/page.tsx, onde
   estão as notas de decisão (a ordem das seções, a ausência do loader). O
   <html lang="en"> vem do layout raiz de app/(en).

   O que muda de comportamento com o idioma está nos formulários
   (components/vitrine/sections.tsx): e-mail no lugar do WhatsApp, mailto:
   no lugar do wa.me, e o `pagina` "vitrine-digital-en" na rota. O
   tracking recebe a página, o valor em US$ e a moeda pelo <Analytics />.
   ============================================================ */
const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
  alternates: alternatesPara("/en/vitrine-digital"),
  openGraph: {
    title: en.meta.title,
    description: en.meta.description,
    url: `${SITE}/en/vitrine-digital`,
    locale: "en_US",
    alternateLocale: ["pt_BR"],
    type: "website",
  },
};

/* JSON-LD do serviço, em inglês: o Google lê o preço e a área de
   atendimento daqui. O preço é o de lib/oferta.ts (placeholder a
   confirmar), e `areaServed` diz que a versão em inglês vende para fora. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Digital Storefront",
  description: en.meta.description,
  provider: { "@type": "Person", name: "Rafael Razeira" },
  areaServed: "Worldwide",
  url: `${SITE}/en/vitrine-digital`,
  offers: { "@type": "Offer", price: String(OFERTA.en.vitrine.total), priceCurrency: OFERTA.en.moeda, availability: "https://schema.org/InStock" },
};

export default function VitrineDigitalEnPage() {
  return <LangProvider lang="en" messages={en}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className={`${styles.site} ${display.variable} ${body.variable} ${mono.variable}`}>
      <Header />
      <main>
        <Hero />
        <QuemFaz />
        <BrandBand />
        <PainSolution />
        <HowItWorks />
        <Projects />
        <Included />
        <Process />
        <Offer />
        <Panel />
        <FAQ />
        <FinalCTA />
      </main>
      <MobileBar />
      <Analytics />
    </div>
  </LangProvider>;
}
