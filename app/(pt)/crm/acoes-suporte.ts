"use server";

/* ============================================================
   AS AÇÕES DO SUPORTE (23/10/2026)

   Responder, resolver, dar o tema e transformar a resposta em pergunta da
   FAQ. Tudo logado e pelo RLS do central (a loja do chamado é do dono).
   A loja escreve pelas funções sup_* com a PERF_CHAVE; o estúdio, daqui.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";

type Resultado = { ok: true } | { ok: false; erro: string };

async function exigirSessao() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/crm/login");
  return usuario;
}

function atualizar() {
  revalidatePath("/crm", "layout");
}

export async function responderChamado(chamado: string, texto: string, resolver: boolean): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const t = String(texto || "").trim().slice(0, 2000);
  if (!t) return { ok: false, erro: "Escreva a resposta." };
  const { error } = await supabase.from("sup_mensagens").insert({ chamado_id: chamado, autor: "estudio", texto: t });
  if (error) return { ok: false, erro: "Não foi possível enviar a resposta." };
  const agora = new Date().toISOString();
  const { error: e2 } = await supabase
    .from("sup_chamados")
    .update({ estado: resolver ? "resolvido" : "respondido", movido_em: agora, respondido_em: agora, resolvido_em: resolver ? agora : null })
    .eq("id", chamado);
  if (e2) return { ok: false, erro: "A resposta foi, mas o estado não mudou." };
  atualizar();
  return { ok: true };
}

export async function mudarChamado(chamado: string, campos: { estado?: "aberto" | "resolvido"; tema?: string | null }): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const mudar: Record<string, string | null> = {};
  if (campos.estado) {
    mudar.estado = campos.estado;
    mudar.resolvido_em = campos.estado === "resolvido" ? new Date().toISOString() : null;
  }
  if (campos.tema !== undefined) mudar.tema = campos.tema?.trim().slice(0, 40) || null;
  const { error } = await supabase.from("sup_chamados").update(mudar).eq("id", chamado);
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  atualizar();
  return { ok: true };
}

export async function salvarFaq(dados: {
  id?: string;
  pergunta: string;
  resposta: string;
  tema?: string | null;
  ancora_manual?: string | null;
  ordem?: number;
  publicada?: boolean;
  /* o chamado de onde a pergunta saiu, para ficar ligado */
  chamado?: string | null;
}): Promise<Resultado> {
  const usuario = await exigirSessao();
  const supabase = await clienteServidor();
  const pergunta = String(dados.pergunta || "").trim();
  const resposta = String(dados.resposta || "").trim();
  if (pergunta.length < 3 || resposta.length < 3) return { ok: false, erro: "A pergunta e a resposta precisam de texto." };
  const ancora = dados.ancora_manual?.trim() || null;
  if (ancora && !/^#[a-z0-9-]{1,40}$/.test(ancora)) return { ok: false, erro: 'A seção do manual vai como "#estoque".' };
  const linha = {
    pergunta: pergunta.slice(0, 200),
    resposta: resposta.slice(0, 4000),
    tema: dados.tema?.trim() || null,
    ancora_manual: ancora,
    ordem: dados.ordem ?? 100,
    publicada: dados.publicada ?? true,
  };
  const { data, error } = dados.id
    ? await supabase.from("sup_faq").update(linha).eq("id", dados.id).select("id").single()
    : await supabase.from("sup_faq").insert({ ...linha, owner_id: usuario.id }).select("id").single();
  if (error || !data) return { ok: false, erro: "Não foi possível salvar a pergunta." };
  if (dados.chamado) await supabase.from("sup_chamados").update({ faq_id: data.id }).eq("id", dados.chamado);
  atualizar();
  return { ok: true };
}

export async function apagarFaq(id: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { error } = await supabase.from("sup_faq").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível apagar." };
  atualizar();
  return { ok: true };
}
