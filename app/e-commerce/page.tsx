import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import s from "./ecommerce.module.css";
import {
  Analytics, Ancoras, BrandBand, Cabecalho, Hero, Faixa, Operacao, Painel, Prova, Processo, Duvidas, ChamadaFinal, QuemFaz,
} from "@/components/ecommerce/sections";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const TITULO = "Desenvolvimento de E-commerce Sob Medida | Rafael Razeira Estúdio";
const DESCRICAO =
  "E-commerces personalizados para marcas que desejam vender online, organizar produtos, receber pagamentos e administrar pedidos com uma estrutura profissional.";

export const metadata: Metadata = {
  title: { absolute: TITULO },
  description: DESCRICAO,
  alternates: { canonical: "/e-commerce" },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: "/e-commerce",
    siteName: "Rafael Razeira Estúdio",
    locale: "pt_BR",
    type: "website",
  },
};

/* Schema de serviço — descreve a oferta sem inventar métricas ou preço. */
const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Desenvolvimento de e-commerce sob medida",
  provider: { "@type": "Organization", name: "Rafael Razeira Estúdio" },
  areaServed: "BR",
  description: DESCRICAO,
};

export default function ECommerce() {
  return (
    <div className={`${s.page} ${display.variable} ${body.variable} ${mono.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Analytics />
      <Ancoras />
      <Cabecalho />
      {/* ---------- a prova subiu (06/08) ----------
          Ela era a 5ª seção, no terço final: com 78% dos visitantes não
          passando do hero e sessão mediana de 13s, quase ninguém chegava nas
          duas lojas de cliente no ar, que são o argumento mais forte da página
          inteira. Agora ela é a primeira coisa depois do hero, e o inventário
          de funcionalidades (Operacao, Painel), que só interessa a quem já
          acreditou, desceu uma posição. Nada foi removido.

          AO LER O FUNIL: `ecommerce_case_view` ("Viu a prova") passa a disparar
          para muito mais gente a partir daqui, porque a seção mudou de lugar e
          não porque o interesse mudou. Comparar com o período anterior não faz
          sentido; a série recomeça no deploy. */}
      <main>
        <Hero />
        <Faixa />
        <QuemFaz />
        <BrandBand />
        <Prova />
        <Operacao />
        <Painel />
        <Processo />
        <Duvidas />
      </main>
      <ChamadaFinal />
    </div>
  );
}
