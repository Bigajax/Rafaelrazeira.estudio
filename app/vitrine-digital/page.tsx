import type { Metadata } from "next";
import { Archivo, Inter, Space_Mono } from "next/font/google";
import { Analytics, FAQ, FinalCTA, Header, Hero, HowItWorks, Included, MobileBar, Offer, PainSolution, Panel, Process, Projects } from "@/components/vitrine/sections";
import styles from "./vitrine.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Vitrine Digital para lojas",
  description: "Transforme seu Instagram em uma loja organizada. Catálogo profissional com WhatsApp integrado, projeto completo por R$999.",
};

/* ---------- esta página não tem tela de carregamento ----------
   E não é esquecimento: o <Loader /> que /estudio, /servicos e /e-commerce
   usam foi retirado daqui de propósito, em 05/08.

   O rito custava caro no lugar errado. Ele cobria a tela até o evento
   `load` (que espera todas as imagens não-lazy e as fontes) e só então
   começava a se desfazer numa grade de quadrados: num Android de 360x780
   são 18 fileiras a 55ms cada, ou seja, mais 1,3s DEPOIS de a espera
   acabar. Piso de ~2s em conexão boa, ~3,5s no 4G. A sessão mediana desta
   landing tem 8,6 segundos e a maioria do tráfego chega de 4G pelo
   navegador interno do Instagram: era perto de 40% da visita gasto olhando
   uma logo, com o argumento já pintado embaixo do overlay.

   Junto saiu o preload de 36KB da logo, que o React emite para toda imagem
   do render inicial e que disputava a frente da fila com a imagem do hero,
   justamente o elemento que precisa chegar primeiro.

   As outras páginas continuam com o loader: lá o visitante já conhece a
   marca ou chegou por vontade própria. Aqui é tráfego pago frio, e ninguém
   clicou no anúncio para ver uma abertura. */
export default function VitrineDigitalPage() {
  return <div className={`${styles.site} ${display.variable} ${body.variable} ${mono.variable}`}>
    <Header />
    <main>
      <Hero />
      <PainSolution />
      <HowItWorks />
      <Projects />
      <Included />
      <Panel />
      <Offer />
      <Process />
      <FAQ />
      <FinalCTA />
    </main>
    <MobileBar />
    <Analytics />
  </div>;
}
