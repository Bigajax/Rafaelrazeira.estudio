import type { Metadata } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import { Analytics, FAQ, Header, Hero, MobileBar } from "@/components/vitrine/sections";
import { Depoimentos, Etapas, FimNovo, LojasNoAr, Placar, Preco, QuemFazCurto, Rodape } from "@/components/vitrine/mobbin";
import { SemAncoraDoAnuncio } from "@/components/vitrine/SemAncoraDoAnuncio";
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
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
/* a Archivo (88KB) e a JetBrains Mono saíram em 28/10: medido na página,
   a primeira não desenhava nenhuma letra e a mono só cinco rótulos, que
   passaram para a mono do sistema (ver `.semFontesExtras` no CSS) */
/* as manchetes na Instrument Sans desde 28/10, ver `.tipoTitulo` no CSS */
const titulo = Instrument_Sans({ subsets: ["latin"], variable: "--font-titulo" });

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
    <div className={`${styles.site} ${styles.botoesApple} ${styles.tipoTitulo} ${styles.estruturaCentro} ${styles.semFontesExtras} ${titulo.variable} ${body.variable}`}>
      <SemAncoraDoAnuncio />
      <Header />
      <main>
        {/* a ordem de 28/10 (pedido do Rafael, "reestruture"): a ordem das perguntas
            de quem chega frio do anúncio. Existe? (números, lojas, o Luciano logo
            depois da Iconic aparecer na fila) Como funciona? Quem faz? Quanto custa?
            O convite final, e o FAQ por último, para quem procura uma resposta
            pontual; o botão do topo segue à vista durante ele. */}
        <Hero />
        <Placar />
        <LojasNoAr />
        <Depoimentos />
        <Etapas />
        <QuemFazCurto />
        <Preco />
        <FimNovo />
        <FAQ />
      </main>
      <Rodape />
      <MobileBar />
      <Analytics />
    </div>
  </LangProvider>;
}
