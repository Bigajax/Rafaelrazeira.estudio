import type { Metadata } from "next";
import { Hoje } from "@/components/crm/Hoje";
import { listarTemplates, painelHoje } from "@/lib/crm/dados";

export const metadata: Metadata = { title: "Hoje" };

/* A rota padrão do CRM, e a tela que abre no celular. Os templates viajam
   junto porque o botão de WhatsApp de cada linha precisa deles na hora do
   clique: buscá-los ao abrir o modal daria meio segundo de tela vazia no
   gesto mais repetido do dia. */
export default async function PaginaHoje() {
  const [painel, templates] = await Promise.all([painelHoje(), listarTemplates()]);
  return <Hoje painel={painel} templates={templates} />;
}
