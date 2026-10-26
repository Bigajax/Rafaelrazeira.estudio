/* ============================================================
   AI STUDIO · 01 VÍDEO (13/10/2026)

   O vídeo pelo OpenRouter: Veo 3.1 (padrão, 4K), Veo 3.1 Fast, Seedance
   2.0 e Veo 3.1 Lite. O pedido vai pela rota /api/ai-studio/video e o
   andamento por /api/ai-studio/video/<id>; a chave fica no servidor.

   Entradas por URL:
     ?primeiro=<id>&ultimo=<id>   as imagens dos quadros (a sequência de
                                  um projeto manda as duas)
     ?projeto=<id>                o vídeo já cai no projeto
     ?ver=<id>                    abre aquele vídeo no palco
   ============================================================ */
import type { Metadata } from "next";
import { contexto, galeria, imagemPorId, listarVideos } from "@/lib/ai-studio/dados";
import { Cabecalho } from "@/components/ai-studio/Cabecalho";
import { Estudio } from "@/components/ai-studio/Video";
import a from "@/app/(pt)/crm/ai-studio.module.css";

export const metadata: Metadata = { title: "AI Studio" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function PaginaVideo({
  searchParams,
}: {
  searchParams: Promise<{ primeiro?: string; ultimo?: string; projeto?: string; ver?: string }>;
}) {
  const { primeiro, ultimo, projeto, ver } = await searchParams;
  const { supabase, ctx } = await contexto();

  const [videos, imagens, quadro1, quadro2] = ctx.semTabela
    ? [[], [], null, null]
    : await Promise.all([
        listarVideos(supabase),
        galeria(supabase, { limite: 80 }),
        primeiro && UUID.test(primeiro) ? imagemPorId(supabase, primeiro) : null,
        ultimo && UUID.test(ultimo) ? imagemPorId(supabase, ultimo) : null,
      ]);

  /* o vídeo pedido por ?ver vem primeiro, e o palco abre nele */
  const ordenados = ver ? [...videos.filter((v) => v.id === ver), ...videos.filter((v) => v.id !== ver)] : videos;

  return (
    <div className={a.estudio}>
      <Cabecalho ctx={ctx} />
      <Estudio
        key={`${primeiro ?? ""}-${ultimo ?? ""}`}
        ctx={ctx}
        videos={ordenados}
        imagens={imagens}
        inicial={{
          primeiro: quadro1,
          ultimo: quadro2,
          projeto: projeto && ctx.projetos.some((p) => p.id === projeto) ? projeto : null,
        }}
      />
    </div>
  );
}
