"use server";

/* ============================================================
   AS AÇÕES DO PLANO

   O mesmo contrato das ações do CRM: { ok: true } ou { ok: false, erro }
   com a frase para a tela. Tudo que vem do navegador passa por uma lista
   fechada de campos e de valores: nada escreve em owner_id.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { hojeSP } from "@/lib/crm/regras";
import { inicioDaMeta } from "@/lib/sistema/metas";
import { tabelaAusente } from "@/lib/sistema/consultas";
import { plano as carregarPlano } from "@/lib/plano/dados";
import { leituraMeta, notaDoMes } from "@/lib/plano/resumo";
import {
  FONTES,
  HORIZONTES,
  PRIORIDADES,
  type Fonte,
  type Horizonte,
  type Periodo,
  type Prioridade,
  type StatusProjeto,
  type Unidade,
  type Meta,
} from "@/lib/plano/tipos";

export type Feito = { ok: true; id?: string } | { ok: false; erro: string };

const SEM_TABELA = "As tabelas do plano ainda não existem: rode o supabase/plano.sql no SQL Editor.";

async function sessao() {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  return { usuario, supabase: await clienteServidor() };
}

function falhou(error: { message: string; code?: string } | null): Feito | null {
  if (!error) return null;
  if (tabelaAusente(error)) return { ok: false, erro: SEM_TABELA };
  return { ok: false, erro: "Não consegui salvar. Tente de novo." };
}

const texto = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) || null : null);
const inteiro = (v: unknown, min: number, max: number) => {
  if ((typeof v !== "string" && typeof v !== "number") || (typeof v === "string" && !v.trim())) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/* ---------- o ciclo do ano: missão, visão, projeções, prêmio ---------- */
export async function salvarCiclo(ano: number, campos: Record<string, unknown>): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!inteiro(ano, 2020, 2100)) return { ok: false, erro: "Ano inválido." };
  const linha: Record<string, unknown> = { owner_id: s.usuario.id, ano };
  if ("missao" in campos) linha.missao = texto(campos.missao, 600);
  if ("visao" in campos) linha.visao = texto(campos.visao, 800);
  if ("horizonte" in campos) {
    linha.horizonte = campos.horizonte === null || campos.horizonte === "" ? null : inteiro(campos.horizonte, ano, 2100);
    if (linha.horizonte === null && campos.horizonte !== null && campos.horizonte !== "") return { ok: false, erro: "Informe um ano de horizonte válido, a partir do ano do plano." };
  }
  if ("premio" in campos) linha.premio = texto(campos.premio, 300);
  if ("premio_corte" in campos) linha.premio_corte = inteiro(campos.premio_corte, 1, 200) ?? 80;
  if ("premios" in campos) {
    if (!Array.isArray(campos.premios) || campos.premios.length > 12) return { ok: false, erro: "Use até 12 marcos na Montanha." };
    const premios = [];
    for (const d of campos.premios) {
      if (!d || typeof d !== "object") return { ok: false, erro: "Preencha os marcos da Montanha." };
      const nome = texto(d.nome, 80), patamar = Number(d.patamar), meses = inteiro(d.meses, 1, 12);
      if (!nome || !Number.isFinite(patamar) || patamar <= 0 || meses === null) return { ok: false, erro: "Cada marco precisa de nome, valor positivo e de 1 a 12 meses inteiros. Remova linhas que não quer usar." };
      premios.push({ nome, patamar, meses });
    }
    linha.premios = premios;
  }
  if ("projecoes" in campos) {
    if (!Array.isArray(campos.projecoes) || campos.projecoes.length > 10) return { ok: false, erro: "Use até 10 projeções anuais." };
    const projecoes = [], anos = new Set<number>();
    for (const p of campos.projecoes) {
      const a = p && typeof p === "object" ? inteiro(p.ano, ano, 2100) : null;
      if (a === null || anos.has(a)) return { ok: false, erro: "As projeções precisam de anos válidos e sem repetição." };
      const num = (v: unknown) => v === null || v === "" || v === undefined ? null : Number(v);
      const faturamento = num(p.faturamento), caixa = num(p.caixa);
      if ([faturamento, caixa].some((v) => v !== null && (!Number.isFinite(v) || v < 0))) return { ok: false, erro: "As projeções devem ser valores positivos ou zero." };
      anos.add(a); projecoes.push({ ano: a, faturamento, caixa });
    }
    linha.projecoes = projecoes;
  }
  const { error } = await s.supabase.from("plano_ciclos").upsert(linha, { onConflict: "owner_id,ano" });
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm", "layout");
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
  revalidatePath("/crm", "layout");
  return { ok: true, id: data?.id };
}

export async function salvarProjeto(id: string, campos: Record<string, unknown>): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (("prioridade" in campos && !Object.hasOwn(PRIORIDADES, String(campos.prioridade))) || ("horizonte" in campos && !Object.hasOwn(HORIZONTES, String(campos.horizonte))) || ("status" in campos && !["ativo", "pausado", "encerrado"].includes(String(campos.status)))) return { ok: false, erro: "Revise a prioridade e a situação da iniciativa." };
  const linha: Record<string, unknown> = {};
  if ("nome" in campos) {
    const n = texto(campos.nome, 80);
    if (!n) return { ok: false, erro: "O projeto precisa de um nome." };
    linha.nome = n;
  }
  if ("porque" in campos) linha.porque = texto(campos.porque, 400);
  if ("prioridade" in campos && Object.hasOwn(PRIORIDADES, String(campos.prioridade)))
    linha.prioridade = campos.prioridade as Prioridade;
  if ("horizonte" in campos && Object.hasOwn(HORIZONTES, String(campos.horizonte)))
    linha.horizonte = campos.horizonte as Horizonte;
  if ("status" in campos && ["ativo", "pausado", "encerrado"].includes(String(campos.status)))
    linha.status = campos.status as StatusProjeto;
  if ("motivo_encerrado" in campos) linha.motivo_encerrado = texto(campos.motivo_encerrado, 300);
  if (!Object.keys(linha).length) return { ok: true };
  const { error } = await s.supabase.from("plano_projetos").update(linha).eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm", "layout");
  return { ok: true };
}

export async function apagarProjeto(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { data: metas, error: erroMetas } = await s.supabase.from("plano_metas").select("id").eq("projeto_id", id).eq("owner_id", s.usuario.id).limit(1);
  if (erroMetas) return falhou(erroMetas)!;
  if (metas?.length) return { ok: false, erro: "Esta iniciativa tem metas. Encerre a iniciativa para preservar o histórico, ou remova as metas antes de apagar." };
  const { error } = await s.supabase.from("plano_projetos").delete().eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm", "layout");
  return { ok: true };
}

/* ---------- as metas ---------- */
function limparMeta(campos: Record<string, unknown>) {
  const linha: Record<string, unknown> = {};
  const enumValido = (campo: string, valores: readonly string[]) => !(campo in campos) || valores.includes(String(campos[campo]));
  if (!enumValido("fonte", Object.keys(FONTES)) || !enumValido("unidade", ["R$", "un", "%"]) || !enumValido("periodo", ["mes", "ano"]) || !enumValido("direcao", ["aumentar", "reduzir"])) return null;
  if ("alvo" in campos && (!Number.isFinite(Number(campos.alvo)) || Number(campos.alvo) <= 0)) return null;
  if ("peso" in campos && inteiro(campos.peso, 0, 100) === null) return null;
  if (campos.direcao === "reduzir") linha.direcao = "reduzir";
  if (campos.direcao === "aumentar") linha.direcao = "aumentar";
  if ("titulo" in campos) linha.titulo = texto(campos.titulo, 120);
  if ("unidade" in campos && ["R$", "un", "%"].includes(String(campos.unidade)))
    linha.unidade = campos.unidade as Unidade;
  if ("alvo" in campos) {
    const a = Number(campos.alvo);
    if (Number.isFinite(a) && a > 0) linha.alvo = a;
  }
  if ("periodo" in campos && ["mes", "ano"].includes(String(campos.periodo)))
    linha.periodo = campos.periodo as Periodo;
  if ("peso" in campos) {
    const p = inteiro(campos.peso, 0, 100);
    if (p !== null) linha.peso = p;
  }
  if ("fonte" in campos && Object.hasOwn(FONTES, String(campos.fonte))) {
    linha.fonte = campos.fonte as Fonte;
    /* fonte automática já sabe a unidade: dinheiro é R$, contagem é un */
    const u = FONTES[campos.fonte as Fonte].unidade;
    if (u) linha.unidade = u;
  }
  return linha;
}

export async function criarMeta(
  projetoId: string,
  ano: number,
  campos: Record<string, unknown>,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linha = limparMeta(campos);
  if (!linha) return { ok: false, erro: "Revise a fonte, o alvo positivo e a importância inteira de 0 a 100." };
  if (!linha.titulo) return { ok: false, erro: "Escreva a meta." };
  if (!linha.alvo) return { ok: false, erro: "A meta precisa de um alvo maior que zero." };
  if (!inteiro(ano, 2020, 2100)) return { ok: false, erro: "Ano inválido." };
  const { data: projeto, error: erroProjeto } = await s.supabase.from("plano_projetos").select("id").eq("id", projetoId).eq("owner_id", s.usuario.id).maybeSingle();
  if (erroProjeto || !projeto) return { ok: false, erro: "A iniciativa não foi encontrada." };
  const { data, error } = await s.supabase
    .from("plano_metas")
    .insert({ owner_id: s.usuario.id, projeto_id: projetoId, ano, ordem: Date.now() / 1000, ...linha })
    .select("id")
    .single<{ id: string }>();
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm", "layout");
  return { ok: true, id: data?.id };
}

export async function salvarMeta(id: string, campos: Record<string, unknown>): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linha = limparMeta(campos);
  if (!linha) return { ok: false, erro: "Revise a fonte, o alvo positivo e a importância inteira de 0 a 100." };
  if ("titulo" in campos && !linha.titulo) return { ok: false, erro: "A meta precisa de um texto." };
  if ("alvo" in campos && !linha.alvo) return { ok: false, erro: "O alvo tem que ser maior que zero." };
  if (!Object.keys(linha).length) return { ok: true };
  const { error } = await s.supabase.from("plano_metas").update(linha).eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm", "layout");
  return { ok: true };
}

export async function apagarMeta(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await s.supabase.from("plano_metas").delete().eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm", "layout");
  return { ok: true };
}

/* ---------- a RMR: o número do mês e o mês fechado ---------- */
const MES = /^\d{4}-(0[1-9]|1[0-2])-01$/;

export async function lancar(metaId: string, mes: string, valor: number | null): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!MES.test(mes)) return { ok: false, erro: "Mês inválido." };
  if (mes.slice(0, 7) > hojeSP().slice(0, 7)) return { ok: false, erro: "O mês ainda não começou. Lance resultados realizados." };
  const { data: meta, error: erroMeta } = await s.supabase.from("plano_metas").select("ano,fonte").eq("id", metaId).eq("owner_id", s.usuario.id).maybeSingle<Pick<Meta, "ano" | "fonte">>();
  if (erroMeta || !meta) return { ok: false, erro: "Meta não encontrada." };
  if (meta.fonte !== "manual") return { ok: false, erro: "Esta meta é automática. Corrija o registro na área de origem." };
  if (meta.ano !== Number(mes.slice(0, 4))) return { ok: false, erro: "A medição precisa pertencer ao ano da meta." };
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
  revalidatePath("/crm", "layout");
  return { ok: true };
}

export async function fecharRmr(
  mes: string,
  _nota: number | null,
  causa: string,
  plano: string,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!MES.test(mes)) return { ok: false, erro: "Mês inválido." };
  if (mes.slice(0, 7) >= hojeSP().slice(0, 7)) return { ok: false, erro: "Espere o mês terminar para concluir a revisão." };
  const ano = Number(mes.slice(0, 4)), numeroMes = Number(mes.slice(5, 7));
  if (!inteiro(ano, 2020, 2100)) return { ok: false, erro: "Ano inválido." };
  const dados = await carregarPlano(ano, numeroMes);
  if (dados.semTabela) return { ok: false, erro: SEM_TABELA };
  const vigentes = dados.metas.filter((m) => inicioDaMeta(m) <= numeroMes);
  if (!vigentes.length) return { ok: false, erro: "Defina pelo menos uma meta para revisar este mês." };
  if (vigentes.some((m) => leituraMeta(m, dados.valores[m.id] ?? {}, numeroMes).realizado === null)) return { ok: false, erro: "Há medições a apurar. Complete os números antes de concluir a revisão." };
  const nota = notaDoMes(vigentes, dados.valores, numeroMes);
  if (nota === null) return { ok: false, erro: "Defina a importância de pelo menos uma meta antes de concluir." };
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
  revalidatePath("/crm", "layout");
  return { ok: true };
}
