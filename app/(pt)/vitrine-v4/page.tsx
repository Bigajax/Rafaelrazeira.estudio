import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { LandingV4, type OfertaV4Publica } from "@/components/vitrine-v4/LandingV4";
import { MontagemV4 } from "@/components/vitrine-v4/MontagemV4";
import { SITE } from "@/lib/idiomas";
import { OFERTA } from "@/lib/oferta";
import { PRODUTOS, v2 } from "@/messages/vitrine-v2.pt";
import { PLANOS_PERFORMANCE } from "@/lib/oferta-performance";
import styles from "@/components/vitrine/landing.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const { total, entrada, saldo } = OFERTA.pt.vitrine;
/* Os dias do Performance que a compra direta dá de presente (19/10/2026).
   Liberados à mão no CRM na publicação: liberarPerformance(loja, { dias }). */
const DIAS_PERFORMANCE = 30;

export const metadata: Metadata = {
  // absoluto: o template do layout põe um travessão e repete o nome
  title: { absolute: `Vitrine digital com painel: R$ ${entrada} para começar | Rafael Razeira Estúdio` },
  description: `Sua cliente chega no WhatsApp com a peça escolhida. Vitrine com a cara da sua loja, até ${PRODUTOS} produtos cadastrados e painel incluído. R$ ${entrada} para começar, R$ ${saldo} na entrega, sem mensalidade.`,
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE}/vitrine-v4` },
};

export default function VitrineV4Page() {
  // Apenas dados públicos da oferta descem ao cliente; o checkout cobra no servidor (lib/propostas.ts).
  const oferta: OfertaV4Publica = {
    total, entrada, saldo, parcelasSaldo: 4, produtos: PRODUTOS,
    performance: PLANOS_PERFORMANCE.pix_mensal.valor,
    diasPerformance: DIAS_PERFORMANCE,
    lojas: v2.prova.lojas.map(({ nome, tag, img, url, w, h }) => ({ nome, tag, img, url, w, h })),
    video: { src: v2.video.src, poster: v2.video.poster },
  };
  // sem o siteV2 (o tema verde-escuro): desde 19/10 o topo é o papel da régua do estúdio (docs/design-estudio.md)
  return <div className={`${styles.site} ${display.variable} ${body.variable} ${mono.variable}`}>
    <LandingV4 oferta={oferta} />
    <MontagemV4 valor={total} />
  </div>;
}
