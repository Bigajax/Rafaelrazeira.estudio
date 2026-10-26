/* ============================================================
   /api/ai-studio/gerar — a porta da IMAGEM (o vídeo tem a dele)

   POST com os parâmetros, e a rota devolve { imagem } já guardada e com
   os endereços assinados. A mesma porta atende os quatro pedidos de
   imagem do estúdio, que só mudam na imagem de base e no texto:
     criar      sem base; as referências entram como input_references
     editar     a base é a versão selecionada (imagem 1); refs depois
     variacao   a base é a imagem a variar
     quadro     a base (opcional) é o quadro anterior da sequência

   Tudo passa pelo OpenRouter (POST /api/v1/images), que é síncrono para
   imagem e devolve o custo real em `usage.cost`. As imagens de entrada
   nunca passam pelo corpo deste pedido (a Vercel corta em 4,5 MB): o
   navegador sobe para o bucket privado e esta rota manda ao OpenRouter um
   link assinado de 10 minutos.

   O middleware do CRM não cobre /api, então a sessão é conferida aqui.
   ============================================================ */
import { NextResponse } from "next/server";
import { z } from "zod";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { IMAGENS_MAX, PROMPT_MAX, modeloPorId, problemaImagem, rotuloImagem, type ParamsImagem } from "@/lib/ai-studio/modelos";
import { montarPrompt } from "@/lib/ai-studio/prompt";
import { gerarImagem, temChave, traduzirErro } from "@/lib/ai-studio/openrouter";
import { custoReal } from "@/lib/ai-studio/precos";
import { conferirTravas } from "@/lib/ai-studio/orcamento";
import { assinar, caminhoDoDono, gravarResultado, linkParaProvedor } from "@/lib/ai-studio/imagens";
import type { ImagemLinha } from "@/lib/ai-studio/tipos";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const Corpo = z.object({
  chave: z.uuid(),
  origem: z.enum(["criar", "editar", "variacao", "quadro"]),
  prompt: z.string().max(PROMPT_MAX).default(""),
  preservar: z.array(z.string().max(400)).max(20).default([]),
  modelo: z.string().max(80),
  qualidade: z.enum(["auto", "low", "medium", "high", "xhigh", "max"]),
  proporcao: z.string().max(8),
  resolucao: z.string().max(6),
  fundo: z.enum(["auto", "opaque", "transparent"]),
  referencias: z
    .array(
      z.object({
        caminho: z.string().max(300),
        funcao: z.enum(["produto", "estilo", "composicao", "personagem", "cenario", "geral"]),
      }),
    )
    .max(IMAGENS_MAX)
    .default([]),
  base_id: z.uuid().nullish(),
  projeto_id: z.uuid().nullish(),
  quadro_id: z.uuid().nullish(),
});

function erro(status: number, frase: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, erro: frase, ...extra }, { status });
}

export async function POST(pedido: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return erro(401, "Sessão expirada. Entre de novo no CRM.");

  let corpo: z.infer<typeof Corpo>;
  try {
    const lido = Corpo.safeParse(await pedido.json());
    if (!lido.success) return erro(400, "Pedido com parâmetros inválidos.");
    corpo = lido.data;
  } catch {
    return erro(400, "Pedido sem corpo.");
  }

  /* ---------- 1. os parâmetros, contra o catálogo ---------- */
  if (!temChave()) return erro(503, "Configure a chave do OpenRouter (OPENROUTER_API_KEY) para gerar.", { semChave: true });
  const params: ParamsImagem = {
    modelo: corpo.modelo,
    qualidade: corpo.qualidade,
    proporcao: corpo.proporcao,
    resolucao: corpo.resolucao,
    fundo: corpo.fundo,
  };
  const problema = problemaImagem(params);
  if (problema) return erro(400, problema);
  const modelo = modeloPorId(params.modelo)!;

  const prompt = corpo.prompt.trim();
  if (!prompt && corpo.origem !== "variacao") {
    return erro(400, corpo.origem === "editar" ? "Diga o que você deseja modificar." : "Escreva o prompt antes de gerar.");
  }
  if ((corpo.origem === "editar" || corpo.origem === "variacao") && !corpo.base_id) {
    return erro(400, "Escolha a imagem de base.");
  }

  const uid = usuario.id;
  for (const r of corpo.referencias) {
    if (!caminhoDoDono(uid, r.caminho)) return erro(400, "Uma das referências não é sua.");
  }
  if (corpo.referencias.length + (corpo.base_id ? 1 : 0) > modelo.maxRefs) {
    return erro(400, `O ${modelo.nome} aceita até ${modelo.maxRefs} imagens por pedido.`);
  }

  const supabase = await clienteServidor();

  /* ---------- 2. a base, o quadro e o projeto ---------- */
  let base: ImagemLinha | null = null;
  if (corpo.base_id) {
    const { data } = await supabase.from("ai_imagens").select("*").eq("id", corpo.base_id).maybeSingle<ImagemLinha>();
    if (!data || data.status !== "pronta" || !data.caminho || data.apagada_em) {
      return erro(404, "A imagem de base não existe mais.");
    }
    base = data;
  }

  let projetoId = corpo.projeto_id ?? base?.projeto_id ?? null;
  if (corpo.quadro_id) {
    const { data: q } = await supabase.from("ai_quadros").select("projeto_id").eq("id", corpo.quadro_id).maybeSingle();
    if (!q) return erro(404, "O quadro não existe mais.");
    projetoId = q.projeto_id;
  }
  let projeto: { nome: string; descricao: string | null; capa_id: string | null } | null = null;
  if (projetoId) {
    const { data } = await supabase.from("ai_projetos").select("nome, descricao, capa_id").eq("id", projetoId).maybeSingle();
    if (!data) projetoId = null;
    projeto = data ?? null;
  }

  /* ---------- 3. as travas: limite, ritmo, duplicata ---------- */
  const trava = await conferirTravas(supabase, null, "imagem");
  if (trava) return erro(trava.status, trava.frase);

  const promptBase = corpo.origem === "variacao" && !prompt ? (base?.prompt ?? "") : prompt;
  const promptFinal = montarPrompt({
    origem: corpo.origem,
    prompt: promptBase,
    temBase: Boolean(base),
    funcoes: corpo.referencias.map((r) => r.funcao),
    preservar: corpo.preservar,
    projeto,
  });
  if (promptFinal.length > PROMPT_MAX) return erro(400, `O prompt montado passou de ${PROMPT_MAX} caracteres.`);

  const { data: linha, error: errInsert } = await supabase
    .from("ai_imagens")
    .insert({
      chave: corpo.chave,
      projeto_id: projetoId,
      quadro_id: corpo.quadro_id ?? null,
      pai_id: base?.id ?? null,
      raiz_id: base ? (base.raiz_id ?? base.id) : null,
      origem: corpo.origem,
      prompt: promptBase,
      prompt_final: promptFinal,
      preservar: corpo.preservar.filter(Boolean).join("\n") || null,
      modelo: modelo.id,
      qualidade: modelo.qualidades ? params.qualidade : null,
      tamanho_pedido: rotuloImagem(params),
      fundo: modelo.fundos ? params.fundo : null,
      referencias: corpo.referencias,
      status: "gerando",
    })
    .select("id")
    .single();
  if (errInsert || !linha) {
    if (errInsert?.code === "23505") return erro(409, "Este pedido já foi enviado.", { duplicado: true });
    return erro(500, "Não consegui registrar o pedido. Confira se o supabase/ai-studio.sql foi rodado.");
  }

  /* ---------- 4. a chamada ---------- */
  const inicio = Date.now();
  try {
    const caminhos = [...(base?.caminho ? [base.caminho] : []), ...corpo.referencias.map((r) => r.caminho)];
    const links = await Promise.all(caminhos.map((c) => linkParaProvedor(supabase, c)));

    const { buffer, mime, usage } = await gerarImagem(
      {
        modelo: modelo.id,
        prompt: promptFinal,
        qualidade: modelo.qualidades ? params.qualidade : null,
        proporcao: params.proporcao,
        resolucao: modelo.resolucoes ? params.resolucao : null,
        fundo: modelo.fundos ? params.fundo : null,
        referencias: links,
      },
      pedido.signal,
    );

    const salvo = await gravarResultado(supabase, uid, linha.id, buffer, mime);
    const { data: pronta, error: errUpdate } = await supabase
      .from("ai_imagens")
      .update({ ...salvo, status: "pronta", usage, custo_usd: custoReal(usage), duracao_ms: Date.now() - inicio })
      .eq("id", linha.id)
      .select("*")
      .single<ImagemLinha>();
    if (errUpdate || !pronta) throw new Error("A imagem foi guardada, mas o registro não atualizou.");

    if (corpo.quadro_id) {
      await supabase.from("ai_quadros").update({ imagem_id: pronta.id }).eq("id", corpo.quadro_id);
    }
    if (projetoId && projeto && !projeto.capa_id) {
      await supabase.from("ai_projetos").update({ capa_id: pronta.id }).eq("id", projetoId);
    }

    const [imagem] = await assinar(supabase, [pronta]);
    return NextResponse.json({ ok: true, imagem });
  } catch (e) {
    const t = traduzirErro(e);
    await supabase
      .from("ai_imagens")
      .update({ status: "falhou", erro: t.frase, duracao_ms: Date.now() - inicio })
      .eq("id", linha.id);
    return erro(t.status, t.frase, t.cancelado ? { cancelado: true } : undefined);
  }
}
