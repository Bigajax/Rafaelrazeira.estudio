/* AI STUDIO · um projeto aberto: o cabeçalho, a sequência cinematográfica,
   os vídeos e as imagens dele (que também são o histórico, mais novas
   primeiro). */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { contexto, galeria, listarVideos, sequencia } from "@/lib/ai-studio/dados";
import type { Projeto } from "@/lib/ai-studio/tipos";
import { Cabecalho } from "@/components/ai-studio/Cabecalho";
import { CabecalhoProjeto } from "@/components/ai-studio/Projetos";
import { Sequencia } from "@/components/ai-studio/Sequencia";
import { Galeria } from "@/components/ai-studio/Galeria";
import { ListaVideos } from "@/components/ai-studio/Video";
import a from "@/app/(pt)/crm/ai-studio.module.css";

export const metadata: Metadata = { title: "Projeto · AI Studio" };

export default async function PaginaProjeto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, ctx } = await contexto();
  if (ctx.semTabela) notFound();

  const { data: projeto } = await supabase.from("ai_projetos").select("*").eq("id", id).maybeSingle<Projeto>();
  if (!projeto) notFound();
  const [quadros, imagens, videos] = await Promise.all([
    sequencia(supabase, id),
    galeria(supabase, { projeto: id, limite: 240 }),
    listarVideos(supabase, { projeto: id }),
  ]);

  return (
    <div className={a.estudio}>
      <Cabecalho ctx={ctx} />
      <CabecalhoProjeto projeto={projeto} uid={ctx.uid} total={imagens.length} />
      <Sequencia projeto={{ id: projeto.id, nome: projeto.nome }} quadros={quadros} imagensProjeto={imagens} ctx={ctx} />
      <ListaVideos videos={videos} titulo="Vídeos do projeto" />
      <Galeria
        imagens={imagens}
        projetos={ctx.projetos}
        projetoAtual={projeto.id}
        filtros={false}
        titulo="Imagens e histórico do projeto"
        vazio="Gere neste projeto, suba imagens ou mova imagens da galeria para cá."
      />
    </div>
  );
}
