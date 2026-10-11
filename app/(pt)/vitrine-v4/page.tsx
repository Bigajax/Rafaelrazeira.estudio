import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { LandingV4, type OfertaV4Publica } from "@/components/vitrine-v4/LandingV4";
import { MontagemV4 } from "@/components/vitrine-v4/MontagemV4";
import { SITE } from "@/lib/idiomas";
import { MAX_PARCELAS, PRECO_CARTAO, PRECO_PIX, PRODUTOS, v2 } from "@/messages/vitrine-v2.pt";
import { DEGRAUS, MENSALIDADE_ECOMMERCE, PLANOS_PERFORMANCE } from "@/lib/oferta-performance";
import styles from "@/components/vitrine/landing.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: `Vitrine digital com painel por R$ ${PRECO_PIX} | Rafael Razeira`,
  description: `Sua cliente chega no WhatsApp com a peça escolhida. Vitrine com a cara da sua loja, cadastro de até ${PRODUTOS} produtos e painel incluído. R$ ${PRECO_PIX} no Pix, sem mensalidade.`,
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE}/vitrine-v4` },
};

export default function VitrineV4Page() {
  // Apenas dados públicos da oferta descem ao cliente; o checkout cobra no servidor.
  const oferta: OfertaV4Publica = {
    pix: PRECO_PIX, cartao: PRECO_CARTAO, parcelas: MAX_PARCELAS, produtos: PRODUTOS,
    performance: PLANOS_PERFORMANCE.pix_mensal.valor,
    pagamento: DEGRAUS.vender.cheio,
    ecommerce: DEGRAUS.loja.cheio,
    ecommerceMensal: MENSALIDADE_ECOMMERCE,
    lojas: v2.prova.lojas.map(({ nome, tag, img, url, w, h }) => ({ nome, tag, img, url, w, h })),
    video: { src: v2.video.src, poster: v2.video.poster },
  };
  return <div className={`${styles.site} ${styles.siteV2} ${display.variable} ${body.variable} ${mono.variable}`}>
    <LandingV4 oferta={oferta} />
    <MontagemV4 valor={PRECO_PIX} />
  </div>;
}
