"use server";

/* ============================================================
   AS AÇÕES LEVES DO AI STUDIO (13/10/2026)

   Tudo que não chama o OpenRouter: projetos, quadros, mover, apagar, o
   download e a configuração do limite. A geração mora na rota
   /api/ai-studio/gerar, porque precisa de 2 minutos e de cancelamento.

   Apagar imagem NÃO apaga a linha: tira os arquivos do bucket e marca
   `apagada_em`, porque a linha é também o registro do custo (ver o
   supabase/ai-studio.sql).
   ============================================================ */
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { BUCKET } from "@/lib/ai-studio/tipos";
import { caminhoDoDono } from "@/lib/ai-studio/imagens";

export type Feito<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

const SEM_SESSAO = { ok: false as const, erro: "Sessão expirada. Entre de novo." };
const SEM_TABELA = "Não salvei. Rode o supabase/ai-studio.sql no SQL Editor.";

async function sessao() {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  return { uid: usuario.id, supabase: await clienteServidor() };
}

function atualizar() {
  revalidatePath("/crm/ai-studio", "layout");
}

/* ---------- projetos ---------- */

export async function criarProjeto(nome: string, descricao: string): Promise<Feito<{ id: string }>> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const n = nome.trim().slice(0, 120);
  if (!n) return { ok: false, erro: "Dê um nome ao projeto." };
  const { data, error } = await s.supabase
    .from("ai_projetos")
    .insert({ nome: n, descricao: descricao.trim() || null })
    .select("id")
    .single();
  if (error || !data) return { ok: false, erro: SEM_TABELA };
  atualizar();
  return { ok: true, id: data.id };
}

export async function salvarProjeto(id: string, nome: string, descricao: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const n = nome.trim().slice(0, 120);
  if (!n) return { ok: false, erro: "O projeto precisa de um nome." };
  const { error } = await s.supabase.from("ai_projetos").update({ nome: n, descricao: descricao.trim() || null }).eq("id", id);
  if (error) return { ok: false, erro: "Não salvei o projeto." };
  atualizar();
  return { ok: true };
}

/* O projeto e os quadros saem; as imagens voltam para "sem projeto" e
   continuam na galeria. Nada que custou dinheiro some por um clique. */
export async function excluirProjeto(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  await s.supabase.from("ai_imagens").update({ projeto_id: null, quadro_id: null }).eq("projeto_id", id);
  const { error } = await s.supabase.from("ai_projetos").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não excluí o projeto." };
  atualizar();
  return { ok: true };
}

export async function definirCapa(projetoId: string, imagemId: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { error } = await s.supabase.from("ai_projetos").update({ capa_id: imagemId }).eq("id", projetoId);
  if (error) return { ok: false, erro: "Não troquei a capa." };
  atualizar();
  return { ok: true };
}

/* ---------- imagens ---------- */

export async function moverImagem(imagemId: string, projetoId: string | null): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { error } = await s.supabase.from("ai_imagens").update({ projeto_id: projetoId }).eq("id", imagemId);
  if (error) return { ok: false, erro: "Não movi a imagem." };
  if (projetoId) {
    await s.supabase.from("ai_projetos").update({ capa_id: imagemId }).eq("id", projetoId).is("capa_id", null);
  }
  atualizar();
  return { ok: true };
}

export async function excluirImagem(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { data } = await s.supabase.from("ai_imagens").select("caminho, miniatura").eq("id", id).maybeSingle();
  if (!data) return { ok: false, erro: "A imagem não existe mais." };
  const arquivos = [data.caminho, data.miniatura].filter((c): c is string => Boolean(c));
  if (arquivos.length) await s.supabase.storage.from(BUCKET).remove(arquivos);
  await Promise.all([
    s.supabase.from("ai_quadros").update({ imagem_id: null }).eq("imagem_id", id),
    s.supabase.from("ai_projetos").update({ capa_id: null }).eq("capa_id", id),
  ]);
  const { error } = await s.supabase
    .from("ai_imagens")
    .update({ apagada_em: new Date().toISOString(), caminho: null, miniatura: null })
    .eq("id", id);
  if (error) return { ok: false, erro: "Tirei o arquivo, mas não marquei a imagem como apagada." };
  atualizar();
  return { ok: true };
}

/* O link de download do ORIGINAL, assinado na hora e com nome de arquivo. */
export async function linkDownload(id: string): Promise<Feito<{ url: string }>> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { data } = await s.supabase.from("ai_imagens").select("caminho, formato, created_at").eq("id", id).maybeSingle();
  if (!data?.caminho) return { ok: false, erro: "A imagem não existe mais." };
  const ext = data.caminho.split(".").pop();
  const nome = `ai-studio-${data.created_at.slice(0, 10)}-${id.slice(0, 8)}.${ext}`;
  const { data: link, error } = await s.supabase.storage.from(BUCKET).createSignedUrl(data.caminho, 600, { download: nome });
  if (error || !link) return { ok: false, erro: "Não consegui gerar o link de download." };
  return { ok: true, url: link.signedUrl };
}

/* A foto que o Rafael subiu para editar vira uma imagem `upload`: entra no
   histórico de versões como a raiz, sem custo, com miniatura. */
export async function registrarUpload(caminho: string, projetoId: string | null): Promise<Feito<{ id: string }>> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  if (!caminhoDoDono(s.uid, caminho)) return { ok: false, erro: "Arquivo fora da sua pasta." };
  const { data: arquivo, error: errBaixar } = await s.supabase.storage.from(BUCKET).download(caminho);
  if (errBaixar || !arquivo) return { ok: false, erro: "Não achei o arquivo enviado." };
  const buffer = Buffer.from(await arquivo.arrayBuffer());

  let meta: sharp.Metadata;
  let mini: Buffer;
  try {
    meta = await sharp(buffer).metadata();
    mini = await sharp(buffer).resize(768, 768, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  } catch {
    return { ok: false, erro: "Esse arquivo não é uma imagem que eu consiga ler." };
  }

  const { data, error } = await s.supabase
    .from("ai_imagens")
    .insert({
      origem: "upload",
      status: "pronta",
      projeto_id: projetoId,
      caminho,
      formato: meta.format === "jpeg" ? "jpeg" : meta.format,
      largura: meta.width ?? null,
      altura: meta.height ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, erro: SEM_TABELA };

  const miniatura = `${s.uid}/mini/${data.id}.webp`;
  const up = await s.supabase.storage.from(BUCKET).upload(miniatura, mini, { contentType: "image/webp", upsert: true });
  if (!up.error) await s.supabase.from("ai_imagens").update({ miniatura }).eq("id", data.id);
  atualizar();
  return { ok: true, id: data.id };
}

/* ---------- quadros da sequência ---------- */

type QuadroOrdem = { id: string; ordem: number };

async function reordenar(supabase: Awaited<ReturnType<typeof clienteServidor>>, lista: QuadroOrdem[]) {
  await Promise.all(
    lista.map((q, i) => (q.ordem === i ? null : supabase.from("ai_quadros").update({ ordem: i }).eq("id", q.id))),
  );
}

async function quadrosDoProjeto(supabase: Awaited<ReturnType<typeof clienteServidor>>, projetoId: string) {
  const { data } = await supabase
    .from("ai_quadros")
    .select("id, ordem")
    .eq("projeto_id", projetoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<QuadroOrdem[]>();
  return data ?? [];
}

/* Um quadro novo, no fim ou logo depois de `aposId`. Com `imagemId`, ele
   já nasce com essa imagem (o "Adicionar à sequência" da galeria). */
export async function adicionarQuadro(
  projetoId: string,
  opcoes: { nome?: string; imagemId?: string | null; aposId?: string | null } = {},
): Promise<Feito<{ id: string }>> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const lista = await quadrosDoProjeto(s.supabase, projetoId);
  const pos = opcoes.aposId ? lista.findIndex((q) => q.id === opcoes.aposId) + 1 : lista.length;
  const posicao = pos <= 0 ? lista.length : pos;
  const nome = (opcoes.nome ?? "").trim().slice(0, 120) || `Cena ${String(lista.length + 1).padStart(2, "0")}`;

  const { data, error } = await s.supabase
    .from("ai_quadros")
    .insert({ projeto_id: projetoId, ordem: posicao, nome, imagem_id: opcoes.imagemId ?? null })
    .select("id")
    .single();
  if (error || !data) return { ok: false, erro: SEM_TABELA };

  const nova = [...lista];
  nova.splice(posicao, 0, { id: data.id, ordem: posicao });
  await reordenar(s.supabase, nova);
  if (opcoes.imagemId) {
    await s.supabase.from("ai_imagens").update({ projeto_id: projetoId }).eq("id", opcoes.imagemId);
    await s.supabase.from("ai_projetos").update({ capa_id: opcoes.imagemId }).eq("id", projetoId).is("capa_id", null);
  }
  atualizar();
  return { ok: true, id: data.id };
}

export async function renomearQuadro(id: string, nome: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { error } = await s.supabase.from("ai_quadros").update({ nome: nome.trim().slice(0, 120) }).eq("id", id);
  if (error) return { ok: false, erro: "Não renomeei o quadro." };
  atualizar();
  return { ok: true };
}

export async function duplicarQuadro(id: string): Promise<Feito<{ id: string }>> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { data: q } = await s.supabase.from("ai_quadros").select("projeto_id, nome, imagem_id").eq("id", id).maybeSingle();
  if (!q) return { ok: false, erro: "O quadro não existe mais." };
  return adicionarQuadro(q.projeto_id, { nome: `${q.nome} (cópia)`, imagemId: q.imagem_id, aposId: id });
}

export async function moverQuadro(id: string, direcao: -1 | 1): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { data: q } = await s.supabase.from("ai_quadros").select("projeto_id").eq("id", id).maybeSingle();
  if (!q) return { ok: false, erro: "O quadro não existe mais." };
  const lista = await quadrosDoProjeto(s.supabase, q.projeto_id);
  const i = lista.findIndex((x) => x.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return { ok: true };
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await reordenar(s.supabase, lista);
  atualizar();
  return { ok: true };
}

export async function definirVersao(quadroId: string, imagemId: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { error } = await s.supabase.from("ai_quadros").update({ imagem_id: imagemId }).eq("id", quadroId);
  if (error) return { ok: false, erro: "Não troquei a versão." };
  atualizar();
  return { ok: true };
}

export async function excluirQuadro(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { data: q } = await s.supabase.from("ai_quadros").select("projeto_id").eq("id", id).maybeSingle();
  /* as imagens do quadro ficam no projeto e na galeria */
  await s.supabase.from("ai_imagens").update({ quadro_id: null }).eq("quadro_id", id);
  const { error } = await s.supabase.from("ai_quadros").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não excluí o quadro." };
  if (q) await reordenar(s.supabase, await quadrosDoProjeto(s.supabase, q.projeto_id));
  atualizar();
  return { ok: true };
}

/* ---------- configuração ---------- */

export async function salvarConfig(limite: number | null, confirmarAntes: boolean): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  if (limite !== null && (!Number.isFinite(limite) || limite < 0 || limite > 100000)) {
    return { ok: false, erro: "Limite inválido." };
  }
  const { error } = await s.supabase
    .from("ai_config")
    .upsert({ owner_id: s.uid, limite_mensal_usd: limite, confirmar_antes: confirmarAntes });
  if (error) return { ok: false, erro: SEM_TABELA };
  atualizar();
  return { ok: true };
}


/* ---------- vídeos ---------- */

export async function linkDownloadVideo(id: string): Promise<Feito<{ url: string }>> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { data } = await s.supabase.from("ai_videos").select("caminho, created_at").eq("id", id).maybeSingle();
  if (!data?.caminho) return { ok: false, erro: "O vídeo ainda não está pronto." };
  const nome = `ai-studio-${data.created_at.slice(0, 10)}-${id.slice(0, 8)}.mp4`;
  const { data: link, error } = await s.supabase.storage.from(BUCKET).createSignedUrl(data.caminho, 600, { download: nome });
  if (error || !link) return { ok: false, erro: "Não consegui gerar o link de download." };
  return { ok: true, url: link.signedUrl };
}

/* Como a imagem: o arquivo sai, a linha fica, porque guarda o custo. */
export async function excluirVideo(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { data } = await s.supabase.from("ai_videos").select("caminho").eq("id", id).maybeSingle();
  if (!data) return { ok: false, erro: "O vídeo não existe mais." };
  if (data.caminho) await s.supabase.storage.from(BUCKET).remove([data.caminho]);
  const { error } = await s.supabase
    .from("ai_videos")
    .update({ apagada_em: new Date().toISOString(), caminho: null })
    .eq("id", id);
  if (error) return { ok: false, erro: "Não excluí o vídeo." };
  atualizar();
  return { ok: true };
}

export async function moverVideo(id: string, projetoId: string | null): Promise<Feito> {
  const s = await sessao();
  if (!s) return SEM_SESSAO;
  const { error } = await s.supabase.from("ai_videos").update({ projeto_id: projetoId }).eq("id", id);
  if (error) return { ok: false, erro: "Não movi o vídeo." };
  atualizar();
  return { ok: true };
}
