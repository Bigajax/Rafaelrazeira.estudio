import type { Metadata } from "next";
import { Archivo, Inter, Space_Mono } from "next/font/google";
import s from "./ecommerce.module.css";
import {
  Analytics, Cabecalho, Hero, Faixa, Problema, Jornada, Incluso, Painel, Integracoes,
  VitrineOuEcommerce, DesignMarca, Demonstracao, Processo, PorQue, Duvidas, ChamadaFinal,
} from "@/components/ecommerce/sections";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

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
      <Cabecalho />
      <main>
        <Hero />
        <Faixa />
        <Problema />
        <Jornada />
        <Incluso />
        <Painel />
        <Integracoes />
        <VitrineOuEcommerce />
        <DesignMarca />
        <Demonstracao />
        <Processo />
        <PorQue />
        <Duvidas />
      </main>
      <ChamadaFinal />
    </div>
  );
}
