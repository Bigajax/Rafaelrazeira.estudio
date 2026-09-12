import type { Metadata } from "next";
import { Lojas } from "@/components/producao/Lojas";
import { leadsParaVincular, listarLojas } from "@/lib/producao/dados";

export const metadata: Metadata = { title: "Produção" };

/* A lista da oficina. Fina de propósito, como as outras telas do painel:
   toda leitura mora em lib/producao/dados.ts. */
export default async function PaginaProducao() {
  const [lojas, leads] = await Promise.all([listarLojas(), leadsParaVincular()]);
  return <Lojas lojas={lojas} leads={leads} />;
}
