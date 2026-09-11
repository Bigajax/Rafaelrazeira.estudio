import type { Metadata } from "next";
import { Templates } from "@/components/crm/Templates";
import { listarTemplates } from "@/lib/crm/dados";

export const metadata: Metadata = { title: "Templates" };

export default async function PaginaTemplates() {
  const templates = await listarTemplates();
  return <Templates templates={templates} />;
}
