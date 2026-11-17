import type { Metadata } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const titulo = Instrument_Sans({ subsets: ["latin"], variable: "--font-titulo" });
export const metadata: Metadata = {
  title: "Um presente para o seu escritório",
  description: "Participe do sorteio de um site para o seu escritório, um presente do Rafael Razeira Estúdio na palestra da Bloco Arquitetura.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${body.variable} ${titulo.variable}`}>{children}</div>;
}
