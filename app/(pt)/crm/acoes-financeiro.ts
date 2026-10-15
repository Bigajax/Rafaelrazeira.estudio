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
import { dataValida } from "@/lib/sistema/calendario";
import { hojeSP } from "@/lib/crm/regras";
import { datasDoCompromisso } from "@/lib/financeiro/ocorrencias";
import type { Custo } from "@/lib/financeiro/tipos";

export type Feito = { ok: true } | { ok: false; erro: string };

const SEM_TABELA =
  "A tabela de custos ainda não existe: rode o supabase/financeiro.sql no SQL Editor.";
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function registrarDespesa(
  campos: Record<string, unknown>,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  const nome = String(campos.nome ?? "").trim();
  const valor =
    Math.round(Number(String(campos.valor ?? "").replace(",", ".")) * 100) /
    100;
  const dia = campos.pago_em;
  if (
    !nome ||
    nome.length > 120 ||
    !Number.isFinite(valor) ||
    valor <= 0 ||
    !dataValida(dia) ||
    dia > hojeSP() ||
    !UUID.test(String(campos.request_id))
  )
    return {
      ok: false,
      erro: "Confira o nome, o valor e a data de pagamento.",
    };
  if (!(String(campos.categoria) in CATEGORIAS))
    return { ok: false, erro: "Escolha a categoria da despesa." };
  const moeda = campos.moeda_original === "USD" ? "USD" : "BRL";
  const original = moeda === "USD" ? Number(campos.valor_original) : valor;
  if (!Number.isFinite(original) || original <= 0)
    return { ok: false, erro: "Informe também o valor original em dólar." };
  const { error } = await s.supabase.from("fin_despesas").upsert(
    {
      owner_id: s.usuario.id,
      nome,
      categoria: campos.categoria,
      valor,
      pago_em: dia,
      moeda_original: moeda,
      valor_original: original,
      notas:
        String(campos.notas ?? "")
          .trim()
          .slice(0, 1000) || null,
      request_id: campos.request_id,
      ...(campos.custo_id ? { custo_id: campos.custo_id } : {}),
      ...(campos.ocorrencia_id ? { ocorrencia_id: campos.ocorrencia_id } : {}),
    },
    { onConflict: "request_id", ignoreDuplicates: true },
  );
  if (error)
    return {
      ok: false,
      erro: "Não consegui registrar a despesa. Confira a instalação do módulo e tente novamente.",
    };
  revalidatePath("/crm", "layout");
  return { ok: true };
}

export async function agendarCompromisso(
  custoId: string,
  primeiro: string,
  quantas: number,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada." };
  const { data: c, error } = await s.supabase
    .from("fin_custos")
    .select("*")
    .eq("id", custoId)
    .maybeSingle<Custo>();
  if (error || !c) return { ok: false, erro: "Custo não encontrado." };
  try {
    const datas = datasDoCompromisso(primeiro, c.frequencia, quantas);
    if (
      datas.some(
        (d) =>
          d.slice(0, 7) < c.inicio.slice(0, 7) ||
          (c.fim && d.slice(0, 7) > c.fim.slice(0, 7)),
      )
    )
      return {
        ok: false,
        erro: "As datas devem estar dentro da vigência do custo.",
      };
    const { error: e } = await s.supabase.from("fin_ocorrencias").upsert(
      datas.map((vence_em) => ({
        owner_id: s.usuario.id,
        custo_id: c.id,
        descricao: c.nome,
        valor: c.valor,
        moeda: c.moeda,
        vence_em,
      })),
      { onConflict: "owner_id,custo_id,vence_em", ignoreDuplicates: true },
    );
    if (e)
      return {
        ok: false,
        erro: "Não foi possível agendar. Confira a atualização do módulo.",
      };
    revalidatePath("/crm", "layout");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Datas inválidas.",
    };
  }
}

/** Um envio cadastra a conta e seus vencimentos. O mesmo pedido pode ser
 * retomado depois de uma falha sem criar outra conta ou outras parcelas. */
export async function criarCompromisso(campos: Record<string, unknown>): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  const id = String(campos.request_id ?? "");
  const primeiro = String(campos.primeiro_vencimento ?? "");
  const frequencia = String(campos.frequencia ?? "");
  if (!UUID.test(id) || !dataValida(primeiro) ||
      !Object.hasOwn(FREQUENCIAS, frequencia) || !Object.hasOwn(CATEGORIAS, String(campos.categoria)) ||
      !["BRL", "USD"].includes(String(campos.moeda)))
    return { ok: false, erro: "Confira a categoria, a frequência e o primeiro vencimento." };
  const linha = limpar({ ...campos, inicio: primeiro.slice(0, 7) });
  if (typeof linha === "string") return { ok: false, erro: linha };
  if (!linha.nome || !linha.valor) return { ok: false, erro: "Informe o nome e o valor da conta." };
  let datas: string[];
  try {
    datas = datasDoCompromisso(primeiro, frequencia as Custo["frequencia"], Number(campos.quantas));
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Vencimentos inválidos." };
  }
  const anteriores = await s.supabase.from("fin_ocorrencias").select("vence_em").eq("custo_id", id);
  if (anteriores.error) return { ok: false, erro: "Não foi possível consultar os vencimentos. Tente novamente." };
  if ((anteriores.data ?? []).some((o) => !datas.includes(o.vence_em)))
    return { ok: false, erro: "Este cadastro já gerou outros vencimentos. Confira a conta em A pagar antes de alterá-lo." };
  const insercao = await s.supabase.from("fin_custos").upsert(
    { id, owner_id: s.usuario.id, ...linha }, { onConflict: "id", ignoreDuplicates: true },
  );
  if (insercao.error) return falhou(insercao.error)!;
  const { data: custo, error } = await s.supabase.from("fin_custos").select("*").eq("id", id).single<Custo>();
  if (error || !custo) return { ok: false, erro: "Não foi possível conferir o cadastro. Tente novamente com os mesmos dados." };
  if (custo.nome !== linha.nome || Number(custo.valor) !== Number(linha.valor) ||
      custo.categoria !== linha.categoria || custo.frequencia !== frequencia || custo.moeda !== linha.moeda || custo.inicio !== linha.inicio)
    return { ok: false, erro: "O cadastro anterior foi preservado. Retome com os mesmos dados ou confira a conta em Planejamento." };
  const agenda = await s.supabase.from("fin_ocorrencias").upsert(
    datas.map((vence_em) => ({ owner_id: s.usuario.id, custo_id: id, descricao: custo.nome, valor: custo.valor, moeda: custo.moeda, vence_em })),
    { onConflict: "owner_id,custo_id,vence_em", ignoreDuplicates: true },
  );
  revalidatePath("/crm", "layout");
  if (agenda.error) return { ok: false, erro: "A conta foi cadastrada, mas os vencimentos não foram confirmados. Tente novamente com os mesmos dados para concluir." };
  return { ok: true };
}
export async function retificarDespesa(
  id: string,
  dados: Record<string, unknown>,
  motivo: string,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada." };
  if (
    !dataValida(dados.pago_em) ||
    dados.pago_em > hojeSP() ||
    !Number.isFinite(Number(dados.valor)) ||
    Number(dados.valor) <= 0 ||
    motivo.trim().length < 5
  )
    return {
      ok: false,
      erro: "Confira os dados e explique o motivo da correção.",
    };
  const { error } = await s.supabase.rpc("fin_retificar_despesa", {
    p_id: id,
    p_dados: dados,
    p_motivo: motivo,
  });
  if (error)
    return {
      ok: false,
      erro: "Não foi possível retificar a despesa. Confira os valores e a atualização do módulo.",
    };
  revalidatePath("/crm", "layout");
  return { ok: true };
}

export async function informarLiquido(
  id: string,
  valor: number,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada." };
  const { data: r, error: e } = await s.supabase
    .from("crm_recebimentos")
    .select("valor")
    .eq("id", id)
    .maybeSingle();
  if (
    e ||
    !r ||
    !Number.isFinite(valor) ||
    valor < 0 ||
    valor > Number(r.valor)
  )
    return {
      ok: false,
      erro: "O líquido deve estar entre zero e o valor bruto recebido.",
    };
  const { error } = await s.supabase
    .from("crm_recebimentos")
    .update({ valor_liquido: Math.round(valor * 100) / 100 })
    .eq("id", id);
  if (error) return { ok: false, erro: "Não consegui salvar o valor líquido." };
  revalidatePath("/crm", "layout");
  return { ok: true };
}

export async function registrarDevolucao(
  id: string,
  valor: number,
  dia: string,
  request: string,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada." };
  if (
    !UUID.test(id) ||
    !UUID.test(request) ||
    !dataValida(dia) ||
    dia > hojeSP() ||
    !Number.isFinite(valor) ||
    valor <= 0
  )
    return { ok: false, erro: "Confira o valor e a data da devolução." };
  const { data: recebimento, error: erroLeitura } = await s.supabase
    .from("crm_recebimentos")
    .select("estornado_em,mp_payment_id")
    .eq("id", id)
    .maybeSingle();
  if (erroLeitura || !recebimento)
    return { ok: false, erro: "Não foi possível conferir o recebimento." };
  if (recebimento.estornado_em)
    return {
      ok: false,
      erro: "Recebimento já integralmente devolvido. Atualize a tela.",
    };
  if (recebimento.mp_payment_id)
    return {
      ok: false,
      erro: "Atualize este pagamento na Conciliação para importar as devoluções do Mercado Pago.",
    };
  const { error } = await s.supabase.rpc("crm_registrar_devolucao", {
    p_recebimento: id,
    p_valor: valor,
    p_dia: dia,
    p_request: request,
  });
  if (error)
    return {
      ok: false,
      erro: "Não consegui registrar. A devolução não pode superar o saldo do recebimento e exige o módulo instalado.",
    };
  revalidatePath("/crm", "layout");
  return { ok: true };
}

function limpar(
  campos: Record<string, unknown>,
): Record<string, unknown> | string {
  const linha: Record<string, unknown> = {};
  if ("nome" in campos) {
    const n = String(campos.nome ?? "")
      .trim()
      .slice(0, 80);
    if (!n) return "Dê um nome ao custo.";
    linha.nome = n;
  }
  if ("categoria" in campos && String(campos.categoria) in CATEGORIAS)
    linha.categoria = campos.categoria;
  if ("valor" in campos) {
    const v = Number(String(campos.valor).replace(",", "."));
    if (!Number.isFinite(v) || v <= 0)
      return "O valor tem que ser maior que zero.";
    linha.valor = v;
  }
  if ("moeda" in campos && ["BRL", "USD"].includes(String(campos.moeda)))
    linha.moeda = campos.moeda;
  if ("frequencia" in campos && String(campos.frequencia) in FREQUENCIAS)
    linha.frequencia = campos.frequencia;
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
  if ("nota" in campos)
    linha.nota =
      String(campos.nota ?? "")
        .trim()
        .slice(0, 200) || null;
  return linha;
}

async function sessao() {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  return { usuario, supabase: await clienteServidor() };
}

function falhou(
  error: { message: string; code?: string } | null,
): Feito | null {
  if (!error) return null;
  if (error.code === "23503")
    return {
      ok: false,
      erro: "Este custo possui vínculos. Encerre a vigência para preservar o histórico dos pagamentos.",
    };
  if (error.code === "42P01" || error.code === "PGRST205")
    return { ok: false, erro: SEM_TABELA };
  return { ok: false, erro: "Não consegui salvar. Tente de novo." };
}

export async function criarCusto(
  campos: Record<string, unknown>,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linha = limpar(campos);
  if (typeof linha === "string") return { ok: false, erro: linha };
  if (!linha.nome || !linha.valor)
    return { ok: false, erro: "Preencha o nome e o valor." };
  const { error } = await s.supabase
    .from("fin_custos")
    .insert({ owner_id: s.usuario.id, ...linha });
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm", "layout");
  return { ok: true };
}

export async function salvarCusto(
  id: string,
  campos: Record<string, unknown>,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linha = limpar(campos);
  if (typeof linha === "string") return { ok: false, erro: linha };
  if (!Object.keys(linha).length) return { ok: true };
  const { error } = await s.supabase
    .from("fin_custos")
    .update(linha)
    .eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm", "layout");
  return { ok: true };
}

export async function apagarCusto(id: string): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await s.supabase.from("fin_custos").delete().eq("id", id);
  const erro = falhou(error);
  if (erro) return erro;
  revalidatePath("/crm", "layout");
  return { ok: true };
}

/* ---------- a conta da virada ---------- */
const SEM_COLUNA =
  "Falta rodar de novo o supabase/financeiro.sql no SQL Editor (as colunas do ticket e da margem).";

export async function salvarVirada(
  ano: number,
  ticket: number,
  margem: number,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!Number.isFinite(ticket) || ticket <= 0)
    return { ok: false, erro: "O ticket tem que ser maior que zero." };
  if (!Number.isFinite(margem) || margem < 0 || margem > 90)
    return { ok: false, erro: "A margem vai de 0 a 90%." };
  const { error } = await s.supabase.from("plano_ciclos").upsert(
    {
      owner_id: s.usuario.id,
      ano,
      ticket_medio: ticket,
      margem_alvo: Math.round(margem),
    },
    { onConflict: "owner_id,ano" },
  );
  if (error)
    return {
      ok: false,
      erro: /ticket_medio|margem_alvo|schema cache/i.test(error.message)
        ? SEM_COLUNA
        : "Não consegui salvar. Tente de novo.",
    };
  revalidatePath("/crm", "layout");
  return { ok: true };
}

/* Leva a conta para o painel do Plano: a meta de vendas fechadas e a de
   dinheiro que entrou (as duas automáticas) ganham os alvos da virada. */
export async function levarAoPlano(
  ano: number,
  vendas: number,
  receita: number,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (
    !Number.isFinite(vendas) ||
    vendas < 1 ||
    !Number.isFinite(receita) ||
    receita <= 0
  )
    return { ok: false, erro: "Conta inválida." };
  const a = await s.supabase
    .from("plano_metas")
    .update({ alvo: Math.ceil(vendas) })
    .eq("ano", ano)
    .eq("fonte", "fechados")
    .select("id");
  const b = await s.supabase
    .from("plano_metas")
    .update({ alvo: Math.ceil(receita / 100) * 100 })
    .eq("ano", ano)
    .eq("fonte", "recebido")
    .select("id");
  if (a.error || b.error)
    return { ok: false, erro: "Não consegui atualizar as metas do Plano." };
  if (!a.data?.length && !b.data?.length)
    return {
      ok: false,
      erro: `O Plano de ${ano} não tem meta de vendas fechadas nem de dinheiro que entrou.`,
    };
  revalidatePath("/crm", "layout");
  return { ok: true };
}
