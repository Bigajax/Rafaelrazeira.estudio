import type { Metadata } from "next";
import { CentralAtendimento } from "@/components/crm/CentralAtendimento";
import { listarTemplates, painelHoje } from "@/lib/crm/dados";
import { Inicio } from "@/components/sistema/Inicio";

export const metadata: Metadata = { title: "Hoje" };

/* A rota padrão do CRM, e a tela que abre no celular: a fila de hoje.
   Até 10/11/2026 ela abria num painel de quatro números (entradas do mês,
   saldo vencido, entregas, meta) cujo botão principal mandava para a fila,
   que morava em `?modo=fila` e de novo em /crm/atendimento. Agora a fila é
   a tela, e o painel fica em `?modo=visao`, um clique atrás.

   Os templates viajam junto porque o "Mandar mensagem" precisa deles na
   hora do clique: buscá-los ao abrir o modal daria meio segundo de tela
   vazia no gesto mais repetido do dia. */
export default async function PaginaHoje({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  const { modo } = await searchParams;
  if (modo === "visao") return <Inicio />;
  const [painel, templates] = await Promise.all([painelHoje(), listarTemplates()]);
  return <CentralAtendimento painel={painel} templates={templates} />;
}
