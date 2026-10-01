import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { peca as lerPeca } from "@/lib/marketing/dados";
import { EditorPeca } from "@/components/marketing/EditorPeca";
import { hojeSP } from "@/lib/crm/regras";

export const metadata: Metadata = { title: "Peça" };

export default async function PaginaPeca({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { peca, pedidos, vistoEm } = await lerPeca(id);
  if (!peca) notFound();
  return <EditorPeca peca={peca} pedidos={pedidos} vistoEm={vistoEm} hoje={hojeSP()} />;
}
