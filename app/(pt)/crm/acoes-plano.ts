"use server";

/* ============================================================
   AS AÇÕES DO PLANO

   O mesmo contrato das ações do CRM: { ok: true } ou { ok: false, erro }
   com a frase para a tela. Tudo que vem do navegador passa por uma lista
   fechada de campos e de valores: nada escreve em owner_id.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { FONTES, HORIZONTES, PRIORIDADES, type Fonte, type Horizonte, type Periodo, type Prioridade, type StatusProjeto, type Unidade } from "@/lib/plano/tipos";

export type Feito = { ok: true; id?: string } | { ok: false; erro: string };

const SEM_TABELA = "As tabelas do plano ainda não existem: rode o supabase/plano.sql no SQL Editor.";

async function sessao() {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  return { usuario, supabase: await clienteServidor() };
}

function falhou(error: { message: string } | null): Feito | null {
  if (!error) return null;
  if (/plano_|does not exist|schema cache/i.test(error.message)) return { ok: false, erro: SEM_TABELA };
  return { ok: false, erro: "Não consegui salvar. Tente de novo." };
}

const texto = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) || null : null);
const inteiro = (v: unknown, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/* ---------- o ciclo do ano: missão, visão, projeções, prêmio ---------- */
export async function salvarCiclo(ano: number, campos: Record<string, unknown>): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!inteiro(ano, 2020, 2100)) return { ok: false, erro: "Ano inválido." };
  const linha: Record<string, unknown> = { owner_id: s.usuario.id, ano };
  if ("missao" in campos) linha.missao = texto(campos.missao, 600);
  if ("visao" in campos) linha.visao = texto(campos.visao, 800);
  if ("horizonte" in campos) linha.horizonte = campos.horizonte === null || campos.horizonte === "" ? null : inteiro(campos.horizonte, 2020, 2100);
  if ("premio" in campos) linha.premio = texto(campos.premio, 300);
  if ("premio_corte" in campos) linha.premio_corte = inteiro(campos.premio_corte, 1, 200) ?? 80;
  if ("premios" in campos) {
    const lista = Array.isArray(campos.premios) ? campos.premios : [];
    linha.premios = lista.slice(0, 12).flatMap((d: Record<string, unknown>) => {
      const nome = texto(d?.nome, 80);
      const patamar = Number(d?.patamar);
      if (!nome || !Number.isFinite(patamar) || patamar <= 0) return [];
      return [{ nome, patamar, meses: inteiro(d?.meses, 1, 12) ?? 1 }];
    });
  }
  if ("projecoes" in campos) {
    const lista = Array.isArray(campos.projecoes) ? campos.projecoes : [];
    linha.projecoes = lista.slice(0, 10).flatMap((p: Record<string, unknown>) => {
      const a = inteiro(p?.ano, 2020, 2100);
      if (!a) return [];
      const num = (v: unknown) => (v === null || v === "" || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null);
      return [{ ano: a, faturamento: num(p.faturamento), caixa: num(p.caixa) }];
    });
  }
  const { error } = await s.supabase.from("plano_ciclos").upsert(linha, { onConflict: "owner_id,ano" });
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm/plano");
  return { ok: true };
}

/* ---------- os projetos ---------- */
export async function criarProjeto(nome: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const n = texto(nome, 80);
  if (!n) return { ok: false, erro: "Dê um nome ao projeto." };
  const { data, error } = await s.supabase
    .from("plano_projetos")
    .insert({ owner_id: s.usuario.id, nome: n, ordem: Date.now() / 1000 })
    .select("id")
    .single<{ id: string }>();
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm/plano");
  return { ok: true, id: data?.id };
}

export async function salvarProjeto(id: string, campos: Record<string, unknown>): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linha: Record<string, unknown> = {};
  if ("nome" in campos) {
    const n = texto(campos.nome, 80);
    if (!n) return { ok: false, erro: "O projeto precisa de um nome." };
    linha.nome = n;
  }
  if ("porque" in campos) linha.porque = texto(campos.porque, 400);
  if ("prioridade" in campos && String(campos.prioridade) in PRIORIDADES) linha.prioridade = campos.prioridade as Prioridade;
  if ("horizonte" in campos && String(campos.horizonte) in HORIZONTES) linha.horizonte = campos.horizonte as Horizonte;
  if ("status" in campos && ["ativo", "pausado", "encerrado"].includes(String(campos.status))) linha.status = campos.status as StatusProjeto;
  if ("motivo_encerrado" in campos) linha.motivo_encerrado = texto(campos.motivo_encerrado, 300);
  if (!Object.keys(linha).length) return { ok: true };
  const { error } = await s.supabase.from("plano_projetos").update(linha).eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm/plano");
  return { ok: true };
}

export async function apagarProjeto(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await s.supabase.from("plano_projetos").delete().eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm/plano");
  return { ok: true };
}

/* ---------- as metas ---------- */
function limparMeta(campos: Record<string, unknown>) {
  const linha: Record<string, unknown> = {};
  if ("titulo" in campos) linha.titulo = texto(campos.titulo, 120);
  if ("unidade" in campos && ["R$", "un", "%"].includes(String(campos.unidade))) linha.unidade = campos.unidade as Unidade;
  if ("alvo" in campos) {
    const a = Number(campos.alvo);
    if (Number.isFinite(a) && a > 0) linha.alvo = a;
  }
  if ("periodo" in campos && ["mes", "ano"].includes(String(campos.periodo))) linha.periodo = campos.periodo as Periodo;
  if ("peso" in campos) {
    const p = inteiro(campos.peso, 0, 100);
    if (p !== null) linha.peso = p;
  }
  if ("fonte" in campos && String(campos.fonte) in FONTES) {
    linha.fonte = campos.fonte as Fonte;
    /* fonte automática já sabe a unidade: dinheiro é R$, contagem é un */
    const u = FONTES[campos.fonte as Fonte].unidade;
    if (u) linha.unidade = u;
  }
  return linha;
}

export async function criarMeta(projetoId: string, ano: number, campos: Record<string, unknown>): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linha = limparMeta(campos);
  if (!linha.titulo) return { ok: false, erro: "Escreva a meta." };
  if (!linha.alvo) return { ok: false, erro: "A meta precisa de um alvo maior que zero." };
  if (!inteiro(ano, 2020, 2100)) return { ok: false, erro: "Ano inválido." };
  const { data, error } = await s.supabase
    .from("plano_metas")
    .insert({ owner_id: s.usuario.id, projeto_id: projetoId, ano, ordem: Date.now() / 1000, ...linha })
    .select("id")
    .single<{ id: string }>();
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm/plano");
  return { ok: true, id: data?.id };
}

export async function salvarMeta(id: string, campos: Record<string, unknown>): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linha = limparMeta(campos);
  if ("titulo" in campos && !linha.titulo) return { ok: false, erro: "A meta precisa de um texto." };
  if ("alvo" in campos && !linha.alvo) return { ok: false, erro: "O alvo tem que ser maior que zero." };
  if (!Object.keys(linha).length) return { ok: true };
  const { error } = await s.supabase.from("plano_metas").update(linha).eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm/plano");
  return { ok: true };
}

export async function apagarMeta(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await s.supabase.from("plano_metas").delete().eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm/plano");
  return { ok: true };
}

/* ---------- a RMR: o número do mês e o mês fechado ---------- */
const MES = /^\d{4}-(0[1-9]|1[0-2])-01$/;

export async function lancar(metaId: string, mes: string, valor: number | null): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!MES.test(mes)) return { ok: false, erro: "Mês inválido." };
  if (valor === null) {
    const { error } = await s.supabase.from("plano_medicoes").delete().eq("meta_id", metaId).eq("mes", mes);
    const erro = falhou(error);
    if (erro) return erro;
  } else {
    if (!Number.isFinite(valor)) return { ok: false, erro: "Número inválido." };
    const { error } = await s.supabase
      .from("plano_medicoes")
      .upsert({ owner_id: s.usuario.id, meta_id: metaId, mes, valor }, { onConflict: "meta_id,mes" });
    const erro = falhou(error);
    if (erro) return erro;
  }
  revalidatePath("/crm/plano");
  return { ok: true };
}

export async function fecharRmr(mes: string, nota: number | null, causa: string, plano: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!MES.test(mes)) return { ok: false, erro: "Mês inválido." };
  const { error } = await s.supabase.from("plano_rmr").upsert(
    {
      owner_id: s.usuario.id,
      mes,
      nota: nota !== null && Number.isFinite(nota) ? Math.round(nota * 1000) / 1000 : null,
      causa: texto(causa, 1200),
      plano: texto(plano, 1200),
      fechada_em: new Date().toISOString(),
    },
    { onConflict: "owner_id,mes" },
  );
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm/plano");
  return { ok: true };
}
