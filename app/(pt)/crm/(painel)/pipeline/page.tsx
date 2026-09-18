import type { Metadata } from "next";
import { Quadro } from "@/components/crm/Quadro";
import { quadro } from "@/lib/crm/dados";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PaginaPipeline() {
  const { leads, nichos, anuncios, hoje } = await quadro();
  return <Quadro leads={leads} nichos={nichos} anuncios={anuncios} hoje={hoje} />;
}
