import { notFound } from "next/navigation";
import { RaspadinhaLegada } from "@/components/arquiteto/RaspadinhaLegada";
import { tokenValido } from "@/lib/raspadinha";
export const dynamic = "force-dynamic";
export default async function RaspadinhaEvento({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!tokenValido(token)) notFound();
  return <RaspadinhaLegada token={token} />;
}
