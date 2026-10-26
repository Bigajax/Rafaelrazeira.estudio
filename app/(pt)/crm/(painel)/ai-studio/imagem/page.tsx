/* ============================================================
   AI STUDIO · 02 IMAGEM (13/10/2026)

   A mesa de criação de imagens pelo OpenRouter (GPT Image 2.5, Nano
   Banana Pro em 4K). O desenho do todo está no supabase/ai-studio.sql e
   em lib/ai-studio/; a geração passa sempre pela rota
   /api/ai-studio/gerar, no servidor, onde mora a chave. A imagem serve
   sozinha e serve de primeiro/último quadro do vídeo (a aba 01).

   Entradas por URL, que a galeria e o visualizador usam:
     ?ref=<id>        a imagem entra como referência
     ?variacao=<id>   o pedido nasce como variação daquela imagem
     ?projeto=<id>    a imagem nova já cai no projeto
   ============================================================ */
import type { Metadata } from "next";
import { contexto, galeria, imagemPorId } from "@/lib/ai-studio/dados";
import { Cabecalho } from "@/components/ai-studio/Cabecalho";
import { Criar } from "@/components/ai-studio/Criar";
import a from "@/app/(pt)/crm/ai-studio.module.css";

export const metadata: Metadata = { title: "Imagem · AI Studio" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function PaginaCriar({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; variacao?: string; projeto?: string }>;
}) {
  const { ref, variacao, projeto } = await searchParams;
  const { supabase, ctx } = await contexto();

  const [recentes, referencia, base] = ctx.semTabela
    ? [[], null, null]
    : await Promise.all([
        galeria(supabase, { limite: 40 }),
        ref && UUID.test(ref) ? imagemPorId(supabase, ref) : null,
        variacao && UUID.test(variacao) ? imagemPorId(supabase, variacao) : null,
      ]);

  return (
    <div className={a.estudio}>
      <Cabecalho ctx={ctx} />
      <Criar
        /* a chave remonta a mesa quando a URL traz outra imagem */
        key={`${ref ?? ""}-${variacao ?? ""}`}
        ctx={ctx}
        recentes={recentes}
        inicial={{
          referencia,
          variacao: base,
          projeto: projeto && ctx.projetos.some((p) => p.id === projeto) ? projeto : null,
        }}
      />
    </div>
  );
}
