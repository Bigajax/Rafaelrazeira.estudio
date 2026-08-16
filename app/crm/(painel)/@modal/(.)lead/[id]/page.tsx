import { notFound } from "next/navigation";
import { FichaModal } from "@/components/crm/FichaModal";
import { leadCompleto } from "@/lib/crm/dados";

/* A ROTA INTERCEPTADA. O `(.)` quer dizer "mesmo nível": quando a navegação
   sai de dentro do (painel) e vai para /crm/lead/[id], o Next renderiza
   ISTO no slot @modal e mantém a tela de baixo montada. O quadro continua
   atrás, com a rolagem e os filtros intactos.

   Quem chega pela URL direta não passa por aqui: cai na página cheia em
   app/crm/(painel)/lead/[id]/page.tsx, que usa o mesmo <Ficha />. */
export default async function ModalDoLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dados = await leadCompleto(id);
  if (!dados) notFound();

  return (
    <FichaModal
      lead={dados.lead}
      interacoes={dados.interacoes}
      indicados={dados.indicados}
      quemIndicou={dados.quemIndicou}
      templates={dados.templates}
      hoje={dados.hoje}
    />
  );
}
