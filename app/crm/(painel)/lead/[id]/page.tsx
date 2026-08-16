import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Ficha } from "@/components/crm/Ficha";
import { leadCompleto } from "@/lib/crm/dados";
import s from "../../../crm.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const dados = await leadCompleto(id);
  return { title: dados?.lead.nome ?? "Lead" };
}

/* A PÁGINA cheia. Ela só aparece quando alguém chega pela URL direta, dá F5
   ou abre o link em outra aba: a navegação de dentro do CRM é interceptada
   por app/crm/(painel)/@modal/(.)lead/[id]/page.tsx e vira modal por cima do
   quadro. As duas renderizam o MESMO <Ficha />. */
export default async function PaginaLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dados = await leadCompleto(id);

  /* `notFound()` cobre os dois casos de uma vez, e é de propósito que ele
     não distinga: id que não existe e id de outro dono devolvem a mesma
     tela. O RLS já faz o segundo caso sumir da consulta; responder "existe,
     mas não é seu" seria devolver a única informação que a trava esconde. */
  if (!dados) notFound();

  return (
    <div className={s.wrapFicha}>
      <Ficha
        lead={dados.lead}
        interacoes={dados.interacoes}
        indicados={dados.indicados}
        quemIndicou={dados.quemIndicou}
        templates={dados.templates}
        hoje={dados.hoje}
      />
    </div>
  );
}
