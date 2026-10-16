import type { Metadata } from "next";
import { CentralAtendimento } from "@/components/crm/CentralAtendimento";
import { listarTemplates, painelHoje } from "@/lib/crm/dados";
import { hojeSP } from "@/lib/crm/regras";
import { postsDoDia } from "@/lib/marketing/dados";

export const metadata: Metadata = { title: "Atendimento" };
export default async function PaginaAtendimento() {
  const [painel, templates, posts] = await Promise.all([painelHoje(), listarTemplates(), postsDoDia(hojeSP())]);
  return <CentralAtendimento painel={painel} templates={templates} posts={posts} />;
}
