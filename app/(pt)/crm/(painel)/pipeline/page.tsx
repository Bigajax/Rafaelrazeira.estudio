import type { Metadata } from "next";
import { Quadro } from "@/components/crm/Quadro";
import { quadro } from "@/lib/crm/dados";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PaginaPipeline() {
  const { leads, nichos, hoje } = await quadro();
  return <Quadro leads={leads} nichos={nichos} hoje={hoje} />;
}
