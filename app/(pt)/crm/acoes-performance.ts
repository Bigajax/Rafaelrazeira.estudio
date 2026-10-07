"use server";

/* ============================================================
   AS AÇÕES DO PERFORMANCE (06/10/2026)

   Criar a loja, gerar a chave, mexer na trava e desligar. Tudo logado e
   pelo RLS de perf_lojas (owner_id = auth.uid()); a única exceção é a
   chave, que sai da função perf_criar_chave porque o hash tem que ser
   feito no banco e o texto devolvido uma vez só.

   O que estende a trava NO DIA A DIA não está aqui: é o recebimento da
   mensalidade no Caixa, pelo trigger perf_ao_receber. Os botões abaixo
   são a mão do Rafael: o teste grátis, o mês de cortesia, o "para
   sempre" de quem comprou de uma vez.
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

function traduzir(erro: { code?: string; message?: string } | null): string {
  if (!erro) return "Não foi possível salvar.";
  if (erro.code === "23505") return "Já existe uma loja com este nome curto.";
  if (erro.code === "23514") return "O nome curto só aceita letras minúsculas, números e hífen.";
  if (erro.code === "42P01") return "A tabela do Performance ainda não existe. Rode o supabase/performance.sql.";
  return erro.message || "Não foi possível salvar.";
}

export async function criarLojaPerformance(dados: {
  nome: string;
  slug: string;
  lead_id?: string | null;
  dominio?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const usuario = await exigirSessao();
  const supabase = await clienteServidor();
  const nome = String(dados.nome || "").trim();
  const slug = String(dados.slug || "").trim().toLowerCase();
  if (!nome) return { ok: false, erro: "A loja precisa de um nome." };
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) return { ok: false, erro: "O nome curto só aceita letras minúsculas, números e hífen (ex.: japa-modas)." };

  const { data, error } = await supabase
    .from("perf_lojas")
    .insert({ owner_id: usuario.id, nome, slug, lead_id: dados.lead_id || null, dominio: dados.dominio?.trim() || null })
    .select("id")
    .single();
  if (error || !data) return { ok: false, erro: traduzir(error) };
  atualizar();
  return { ok: true, id: data.id as string };
}

/** Gera (ou troca) a chave da loja e devolve o texto UMA vez. */
export async function novaChavePerformance(lojaId: string): Promise<{ ok: true; chave: string } | { ok: false; erro: string }> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("perf_criar_chave", { loja: lojaId });
  if (error || typeof data !== "string") return { ok: false, erro: traduzir(error) };
  atualizar();
  return { ok: true, chave: data };
}

/**
 * A trava, pela mão. `dias` soma a partir de hoje ou do que já estava
 * liberado (o que for maior), para um "+7 dias" dado antes do fim não
 * encurtar nada. `paraSempre` é o caso de quem comprou de uma vez.
 */
export async function liberarPerformance(
  lojaId: string,
  como: { dias?: number; paraSempre?: boolean; travar?: boolean },
): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();

  if (como.travar) {
    const { error } = await supabase.from("perf_lojas").update({ liberado_ate: null, para_sempre: false }).eq("id", lojaId);
    if (error) return { ok: false, erro: traduzir(error) };
    atualizar();
    return { ok: true };
  }
  if (como.paraSempre) {
    const { error } = await supabase.from("perf_lojas").update({ para_sempre: true }).eq("id", lojaId);
    if (error) return { ok: false, erro: traduzir(error) };
    atualizar();
    return { ok: true };
  }
  const dias = Math.floor(Number(como.dias));
  if (!Number.isFinite(dias) || dias <= 0 || dias > 400) return { ok: false, erro: "Quantos dias? Entre 1 e 400." };

  const { data: atual } = await supabase.from("perf_lojas").select("liberado_ate").eq("id", lojaId).maybeSingle<{ liberado_ate: string | null }>();
  const base = Math.max(Date.now(), atual?.liberado_ate ? new Date(atual.liberado_ate).getTime() : 0);
  const ate = new Date(base + dias * 86400000).toISOString();
  const { error } = await supabase.from("perf_lojas").update({ liberado_ate: ate }).eq("id", lojaId);
  if (error) return { ok: false, erro: traduzir(error) };
  atualizar();
  return { ok: true };
}

export async function ligarLojaPerformance(lojaId: string, ativa: boolean): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { error } = await supabase.from("perf_lojas").update({ ativa }).eq("id", lojaId);
  if (error) return { ok: false, erro: traduzir(error) };
  atualizar();
  return { ok: true };
}

export async function salvarLojaPerformance(
  lojaId: string,
  dados: { nome?: string; dominio?: string | null; lead_id?: string | null },
): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const patch: Record<string, unknown> = {};
  if (dados.nome !== undefined) {
    const nome = dados.nome.trim();
    if (!nome) return { ok: false, erro: "A loja precisa de um nome." };
    patch.nome = nome;
  }
  if (dados.dominio !== undefined) patch.dominio = dados.dominio?.trim() || null;
  if (dados.lead_id !== undefined) patch.lead_id = dados.lead_id || null;
  const { error } = await supabase.from("perf_lojas").update(patch).eq("id", lojaId);
  if (error) return { ok: false, erro: traduzir(error) };
  atualizar();
  return { ok: true };
}

/**
 * As lojas que podem ganhar um contrato mensal: as que ainda não têm um.
 * As do lead vêm primeiro; o modal do contrato lê isto ao abrir o modo
 * Mensalidade.
 */
export async function lojasParaContrato(leadId: string): Promise<{ id: string; nome: string; slug: string; doLead: boolean }[]> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("perf_lojas")
    .select("id, nome, slug, lead_id")
    .is("contrato_id", null)
    .eq("ativa", true)
    .order("nome")
    .returns<{ id: string; nome: string; slug: string; lead_id: string | null }[]>();
  return (data ?? [])
    .map((l) => ({ id: l.id, nome: l.nome, slug: l.slug, doLead: l.lead_id === leadId }))
    .sort((a, b) => Number(b.doLead) - Number(a.doLead));
}

/** Apaga a loja e, em cascata, toda a contagem dela. Só para loja de teste. */
export async function apagarLojaPerformance(lojaId: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { error } = await supabase.from("perf_lojas").delete().eq("id", lojaId);
  if (error) return { ok: false, erro: traduzir(error) };
  atualizar();
  return { ok: true };
}

/* ============================================================
   O RELATÓRIO DO MÊS (06/10/2026)

   Uma linha em perf_relatorios por loja e por mês. Criar devolve o id (ou
   o do relatório que já existia naquele mês: um por mês). O texto que o
   Rafael escreve, a leitura e o que foi feito, é o que faz do relatório
   um serviço e não só números: o resto sai sozinho do banco.
   ============================================================ */

export async function criarRelatorio(lojaId: string, mes: string): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const usuario = await exigirSessao();
  const supabase = await clienteServidor();
  if (!/^\d{4}-\d{2}$/.test(mes)) return { ok: false, erro: "Mês inválido." };
  const primeiro = `${mes}-01`;
  const { data: existe } = await supabase.from("perf_relatorios").select("id").eq("loja_id", lojaId).eq("mes", primeiro).maybeSingle();
  if (existe?.id) return { ok: true, id: existe.id as string };
  const { data, error } = await supabase
    .from("perf_relatorios")
    .insert({ owner_id: usuario.id, loja_id: lojaId, mes: primeiro })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "42P01") return { ok: false, erro: "A tabela dos relatórios ainda não existe. Rode a seção 10 do supabase/performance.sql." };
    return { ok: false, erro: traduzir(error) };
  }
  atualizar();
  return { ok: true, id: data.id as string };
}

export async function salvarRelatorio(id: string, dados: { leitura: string; feito: string }): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("perf_relatorios")
    .update({ leitura: dados.leitura.trim() || null, feito: dados.feito.trim() || null })
    .eq("id", id);
  if (error) return { ok: false, erro: traduzir(error) };
  atualizar();
  return { ok: true };
}

export async function apagarRelatorio(id: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { error } = await supabase.from("perf_relatorios").delete().eq("id", id);
  if (error) return { ok: false, erro: traduzir(error) };
  atualizar();
  return { ok: true };
}
