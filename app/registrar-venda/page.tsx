import type { Metadata } from "next";
import { Archivo, Inter, Space_Mono } from "next/font/google";
import RegistrarVenda from "./RegistrarVenda";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

/* Ferramenta interna: fora do Google e fora de qualquer prévia de link.
   O noindex não protege nada por si só, quem protege é a senha da rota; ele
   só evita que a página apareça em busca. */
export const metadata: Metadata = {
  title: "Registrar venda",
  robots: { index: false, follow: false, nocache: true },
};

export default function RegistrarVendaPage() {
  return <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
    <RegistrarVenda />
  </div>;
}
