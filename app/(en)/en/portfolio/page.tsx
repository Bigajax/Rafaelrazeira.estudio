import type { Metadata } from "next";
import { PortfolioPage } from "@/components/portfolio/PortfolioPage";
import { en } from "@/messages/portfolio.en";
import { alternatesPara } from "@/lib/idiomas";

/* /en/portfolio: a mesma página do /portfolio com o dicionário em inglês.
   O <html lang="en"> vem do layout raiz de app/(en). */
export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
  alternates: alternatesPara("/en/portfolio"),
};

export default function Page() {
  return <PortfolioPage lang="en" t={en} />;
}
