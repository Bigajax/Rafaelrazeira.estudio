/* AI STUDIO · 02 EDITAR. `?imagem=<id>` abre a imagem (e todas as versões
   da mesma linha); sem ela, a tela pede o upload da original. */
import type { Metadata } from "next";
import { contexto, imagemPorId, versoes } from "@/lib/ai-studio/dados";
import { Cabecalho } from "@/components/ai-studio/Cabecalho";
import { Editor } from "@/components/ai-studio/Editor";
import a from "@/app/(pt)/crm/ai-studio.module.css";

export const metadata: Metadata = { title: "Editar · AI Studio" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function PaginaEditar({ searchParams }: { searchParams: Promise<{ imagem?: string }> }) {
  const { imagem } = await searchParams;
  const { supabase, ctx } = await contexto();
  const base = !ctx.semTabela && imagem && UUID.test(imagem) ? await imagemPorId(supabase, imagem) : null;
  const lista = base ? await versoes(supabase, base) : [];

  return (
    <div className={a.estudio}>
      <Cabecalho ctx={ctx} />
      {/* A chave é a linha de versões: "Continuar editando" troca a URL sem
          remontar (o modelo escolhido e as referências ficam); abrir outra
          imagem da galeria remonta a mesa do zero. */}
      <Editor key={base ? (base.raiz_id ?? base.id) : "vazio"} ctx={ctx} base={base} versoes={lista} />
    </div>
  );
}
