import type { Metadata } from "next";
import { Archivo, Inter, Space_Mono } from "next/font/google";
import s from "./servicos.module.css";
import { Cabecalho, Hero, Corpo, Diferenciais, Processo, Duvidas, ChamadaFinal } from "@/components/servicos/sections";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { absolute: "Serviços de design e desenvolvimento digital | Rafael Razeira Estúdio" },
  description:
    "Landing pages, websites, vitrines digitais, e-commerces, painéis e integrações desenvolvidos de acordo com os objetivos e a operação de cada negócio.",
};

export default function Servicos() {
  return (
    <div className={`${s.page} ${display.variable} ${body.variable} ${mono.variable}`}>
      <Cabecalho />
      <main>
        <Hero />
        <Corpo />
        <Diferenciais />
        <Processo />
        <Duvidas />
      </main>
      <ChamadaFinal />
    </div>
  );
}
