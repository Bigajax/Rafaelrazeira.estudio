/* ============================================================
   /api/checkin — a porta do check-in das fotos (ver lib/checkin.ts)

   Sem login: quem tem o token do link é o dono da loja. Cinco pedidos:
     subir    devolve uma URL assinada para o navegador subir UMA foto
              direto no Storage (o arquivo nunca passa por aqui)
     nota     grava a ficha da foto em <foto>.json: a nota solta ("modelo,
              numeração e valor") ou os campos da loja (nome, marca, cores,
              tamanhos, preço...), desde 19/10/2026
     loja     grava as respostas da loja (as perguntas) em <slug>/_loja.json
     apagar   tira uma foto que foi errada (e a nota dela)
     avisar   o lote terminou de subir: avisa o celular do Rafael
   ============================================================ */
import { NextResponse } from "next/server";
import { z } from "zod";
import { ARQUIVO_LOJA, EXTENSOES, caminhoValido, camposDa, filtrarChaves, lerCheckin } from "@/lib/checkin";
import { avisarRafael, storageCheckin } from "@/lib/checkin-servidor";

const Pedido = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("subir"), token: z.string(), categoria: z.string(), tipo: z.string() }),
  z.object({
    acao: z.literal("nota"),
    token: z.string(),
    caminho: z.string(),
    nota: z.string().max(500).default(""),
    campos: z.record(z.string(), z.string().max(300)).optional(),
  }),
  z.object({ acao: z.literal("loja"), token: z.string(), respostas: z.record(z.string(), z.string().max(600)) }),
  z.object({ acao: z.literal("apagar"), token: z.string(), caminho: z.string() }),
  z.object({ acao: z.literal("avisar"), token: z.string(), categoria: z.string(), quantas: z.number().int().min(1).max(500) }),
]);

const erro = (mensagem: string, status = 400) => NextResponse.json({ erro: mensagem }, { status });

export async function POST(req: Request) {
  const lido = Pedido.safeParse(await req.json().catch(() => null));
  if (!lido.success) return erro("Pedido inválido.");
  const p = lido.data;

  const c = lerCheckin(p.token);
  if (!c) return erro("Link inválido.", 404);
  const st = storageCheckin();
  if (!st) return erro("O envio está fora do ar. Avise o Rafael.", 503);

  if (p.acao === "subir") {
    if (!c.categorias.some((k) => k.id === p.categoria)) return erro("Categoria inválida.");
    const ext = EXTENSOES[p.tipo.toLowerCase()];
    if (!ext) return erro("Esse arquivo não é foto. Mande JPG, PNG, WebP ou HEIC.");
    /* a data na frente deixa a pasta na ordem em que ele mandou */
    const nome = `${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const caminho = `${c.slug}/${p.categoria}/${nome}`;
    const { data, error } = await st.createSignedUploadUrl(caminho);
    if (error || !data) return erro("Não deu para preparar o envio. Tente de novo.", 502);
    return NextResponse.json({ caminho, url: data.signedUrl });
  }

  if (p.acao === "avisar") {
    const k = c.categorias.find((x) => x.id === p.categoria);
    await avisarRafael(`${c.loja}: ${p.quantas} foto${p.quantas > 1 ? "s" : ""} nova${p.quantas > 1 ? "s" : ""} em ${k?.nome ?? p.categoria}`);
    return NextResponse.json({ ok: true });
  }

  if (p.acao === "loja") {
    if (!c.perguntas) return erro("Esta loja não tem perguntas.");
    const corpo = JSON.stringify({ respostas: filtrarChaves(c.perguntas, p.respostas), em: new Date().toISOString() });
    const { error } = await st.upload(`${c.slug}/${ARQUIVO_LOJA}`, corpo, { contentType: "application/json", upsert: true });
    if (error) return erro("Não deu para guardar as respostas.", 502);
    return NextResponse.json({ ok: true });
  }

  if (!caminhoValido(c, p.caminho)) return erro("Foto inválida.");

  if (p.acao === "nota") {
    const ficha = camposDa(c, p.caminho.split("/")[1]);
    const campos = ficha && p.campos ? filtrarChaves(ficha, p.campos) : undefined;
    const corpo = JSON.stringify({ nota: p.nota.trim(), ...(campos ? { campos } : {}), em: new Date().toISOString() });
    const { error } = await st.upload(`${p.caminho}.json`, corpo, { contentType: "application/json", upsert: true });
    if (error) return erro("Não deu para guardar a anotação.", 502);
    return NextResponse.json({ ok: true });
  }

  const { error } = await st.remove([p.caminho, `${p.caminho}.json`]);
  if (error) return erro("Não deu para tirar a foto.", 502);
  return NextResponse.json({ ok: true });
}
