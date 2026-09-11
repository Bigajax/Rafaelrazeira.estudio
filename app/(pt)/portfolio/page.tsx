import type { Metadata } from "next";
import { PortfolioPage } from "@/components/portfolio/PortfolioPage";
import { pt } from "@/messages/portfolio.pt";
import { alternatesPara } from "@/lib/idiomas";

/* Página do link da bio: quase todo mundo chega do Instagram, pelo celular.
   Nada aqui precisa de JavaScript no cliente: são capas, links e o WhatsApp.
   O corpo vive em components/portfolio/PortfolioPage.tsx desde 11/09/2026,
   compartilhado com /en/portfolio; aqui só o metadata e o dicionário. */
export const metadata: Metadata = {
  title: pt.meta.title,
  description: pt.meta.description,
  alternates: alternatesPara("/portfolio"),
};

export default function Page() {
  return <PortfolioPage lang="pt" t={pt} />;
}
