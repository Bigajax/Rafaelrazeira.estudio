/* AI STUDIO · 03 PROJETOS: a lista de projetos e a galeria inteira, com
   os filtros (todas, recentes, por projeto, por modelo). */
import type { Metadata } from "next";
import { contexto, galeria } from "@/lib/ai-studio/dados";
import { Cabecalho } from "@/components/ai-studio/Cabecalho";
import { ListaProjetos } from "@/components/ai-studio/Projetos";
import { Galeria } from "@/components/ai-studio/Galeria";
import a from "@/app/(pt)/crm/ai-studio.module.css";

export const metadata: Metadata = { title: "Projetos · AI Studio" };

export default async function PaginaProjetos() {
  const { supabase, ctx } = await contexto();
  const imagens = ctx.semTabela ? [] : await galeria(supabase, { limite: 240 });

  return (
    <div className={a.estudio}>
      <Cabecalho ctx={ctx} />
      <ListaProjetos projetos={ctx.projetos} semTabela={ctx.semTabela} />
      <Galeria imagens={imagens} projetos={ctx.projetos} titulo="Todas as imagens" vazio="Gere a primeira na aba Criar." />
    </div>
  );
}
