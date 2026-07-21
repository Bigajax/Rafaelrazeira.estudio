import type { Metadata } from "next";
import { Archivo, Inter, Space_Mono } from "next/font/google";
import { Analytics, FAQ, FinalCTA, Header, Hero, HowItWorks, Included, MobileBar, Offer, PainSolution, Process, Projects } from "@/components/vitrine/sections";
import styles from "./vitrine.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Vitrine Digital para lojas",
  description: "Transforme seu Instagram em uma loja organizada. Catálogo profissional com WhatsApp integrado, projeto completo por R$999.",
};

export default function VitrineDigitalPage() {
  return <div className={`${styles.site} ${display.variable} ${body.variable} ${mono.variable}`}>
    <Header />
    <main>
      <Hero />
      <PainSolution />
      <HowItWorks />
      <Projects />
      <Included />
      <Offer />
      <Process />
      <FAQ />
      <FinalCTA />
    </main>
    <MobileBar />
    <Analytics />
  </div>;
}
