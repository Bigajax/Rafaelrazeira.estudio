"use server";

/* ============================================================
   AS AÇÕES DO FINANCEIRO

   O mesmo contrato das ações do CRM: { ok: true } ou { ok: false, erro }
   com a frase para a tela. Só os custos são escritos aqui; a receita é do
   Caixa.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { CATEGORIAS, FREQUENCIAS } from "@/lib/financeiro/tipos";

export type Feito = { ok: true } | { ok: false; erro: string };

const SEM_TABELA = "A tabela de custos ainda não existe: rode o supabase/financeiro.sql no SQL Editor.";
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

function limpar(campos: Record<string, unknown>): Record<string, unknown> | string {
  const linha: Record<string, unknown> = {};
  if ("nome" in campos) {
    const n = String(campos.nome ?? "").trim().slice(0, 80);
    if (!n) return "Dê um nome ao custo.";
    linha.nome = n;
  }
  if ("categoria" in campos && String(campos.categoria) in CATEGORIAS) linha.categoria = campos.categoria;
  if ("valor" in campos) {
    const v = Number(String(campos.valor).replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return "O valor tem que ser maior que zero.";
    linha.valor = v;
  }
  if ("moeda" in campos && ["BRL", "USD"].includes(String(campos.moeda))) linha.moeda = campos.moeda;
  if ("frequencia" in campos && String(campos.frequencia) in FREQUENCIAS) linha.frequencia = campos.frequencia;
  /* os meses chegam como "2026-09"; o banco guarda o dia 1 */
  if ("inicio" in campos) {
    if (!MES.test(String(campos.inicio))) return "Mês de início inválido.";
    linha.inicio = `${campos.inicio}-01`;
  }
  if ("fim" in campos) {
    const f = String(campos.fim ?? "");
    if (f && !MES.test(f)) return "Mês de fim inválido.";
    linha.fim = f ? `${f}-01` : null;
  }
  if ("estimado" in campos) linha.estimado = Boolean(campos.estimado);
  if ("nota" in campos) linha.nota = String(campos.nota ?? "").trim().slice(0, 200) || null;
  return linha;
}

async function sessao() {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  return { usuario, supabase: await clienteServidor() };
}

function falhou(error: { message: string } | null): Feito | null {
  if (!error) return null;
  if (/fin_custos|does not exist|schema cache/i.test(error.message)) return { ok: false, erro: SEM_TABELA };
  return { ok: false, erro: "Não consegui salvar. Tente de novo." };
}

export async function criarCusto(campos: Record<string, unknown>): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linha = limpar(campos);
  if (typeof linha === "string") return { ok: false, erro: linha };
  if (!linha.nome || !linha.valor) return { ok: false, erro: "Preencha o nome e o valor." };
  const { error } = await s.supabase.from("fin_custos").insert({ owner_id: s.usuario.id, ...linha });
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm/financeiro");
  return { ok: true };
}

export async function salvarCusto(id: string, campos: Record<string, unknown>): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linha = limpar(campos);
  if (typeof linha === "string") return { ok: false, erro: linha };
  if (!Object.keys(linha).length) return { ok: true };
  const { error } = await s.supabase.from("fin_custos").update(linha).eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm/financeiro");
  return { ok: true };
}

export async function apagarCusto(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await s.supabase.from("fin_custos").delete().eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm/financeiro");
  return { ok: true };
}

/* ---------- a conta da virada ---------- */
const SEM_COLUNA = "Falta rodar de novo o supabase/financeiro.sql no SQL Editor (as colunas do ticket e da margem).";

export async function salvarVirada(ano: number, ticket: number, margem: number): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!Number.isFinite(ticket) || ticket <= 0) return { ok: false, erro: "O ticket tem que ser maior que zero." };
  if (!Number.isFinite(margem) || margem < 0 || margem > 90) return { ok: false, erro: "A margem vai de 0 a 90%." };
  const { error } = await s.supabase
    .from("plano_ciclos")
    .upsert({ owner_id: s.usuario.id, ano, ticket_medio: ticket, margem_alvo: Math.round(margem) }, { onConflict: "owner_id,ano" });
  if (error) return { ok: false, erro: /ticket_medio|margem_alvo|schema cache/i.test(error.message) ? SEM_COLUNA : "Não consegui salvar. Tente de novo." };
  revalidatePath("/crm/financeiro");
  revalidatePath("/crm/plano");
  return { ok: true };
}

/* Leva a conta para o painel do Plano: a meta de vendas fechadas e a de
   dinheiro que entrou (as duas automáticas) ganham os alvos da virada. */
export async function levarAoPlano(ano: number, vendas: number, receita: number): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!Number.isFinite(vendas) || vendas < 1 || !Number.isFinite(receita) || receita <= 0) return { ok: false, erro: "Conta inválida." };
  const a = await s.supabase.from("plano_metas").update({ alvo: Math.ceil(vendas) }).eq("ano", ano).eq("fonte", "fechados").select("id");
  const b = await s.supabase.from("plano_metas").update({ alvo: Math.ceil(receita / 100) * 100 }).eq("ano", ano).eq("fonte", "recebido").select("id");
  if (a.error || b.error) return { ok: false, erro: "Não consegui atualizar as metas do Plano." };
  if (!a.data?.length && !b.data?.length) return { ok: false, erro: `O Plano de ${ano} não tem meta de vendas fechadas nem de dinheiro que entrou.` };
  revalidatePath("/crm/plano");
  revalidatePath("/crm/financeiro");
  return { ok: true };
}
