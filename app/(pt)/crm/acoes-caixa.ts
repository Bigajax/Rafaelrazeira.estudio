"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import {
  CANAIS,
  METODOS,
  type Interacao,
  type Parcela,
  type Recebimento,
} from "@/lib/crm/tipos";
import { hojeSP } from "@/lib/crm/regras";
import { centavos } from "@/lib/crm/financeiro";
import { dataValida, diaLocal } from "@/lib/sistema/calendario";
import { lerTodos } from "@/lib/sistema/consultas";
import { valorRetido, recebimentoAnulado } from "@/lib/sistema/indicadores";
import {
  metadados,
  pagamentosPorParcela,
  type Alocacao,
} from "@/lib/caixa/recebimentos";
import { PREFIXO_COBRANCA } from "@/lib/caixa/operacao";
import type { Feito } from "./acoes-financeiro";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const falha = (erro: string): Feito => ({ ok: false, erro });
const igual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const x = Object.entries(a)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  const y = Object.entries(b)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return (
    x.length === y.length &&
    x.every(([k, v], i) => k === y[i][0] && igual(v, y[i][1]))
  );
};
async function sessao() {
  const usuario = await usuarioAtual();
  return usuario ? { usuario, b: await clienteServidor() } : null;
}
function atualizar(): Feito {
  revalidatePath("/crm", "layout");
  return { ok: true };
}

export async function registrarCobranca(d: {
  request: string;
  lead: string;
  parcelas: string[];
  dia: string;
  canal: string;
  nota: string;
  lembrete: string;
}): Promise<Feito> {
  const s = await sessao();
  if (!s) return falha("Sessão expirada. Entre novamente.");
  if (
    !UUID.test(d.request) ||
    !UUID.test(d.lead) ||
    !dataValida(d.dia) ||
    d.dia > hojeSP() ||
    !(CANAIS as readonly string[]).includes(d.canal) ||
    d.nota.length > 1000
  )
    return falha("Confira a data, o canal e a observação.");
  if (d.lembrete && (!dataValida(d.lembrete) || d.lembrete <= hojeSP()))
    return falha("O próximo lembrete deve ser depois de hoje.");
  const ids = [...new Set(d.parcelas)].sort();
  if (!ids.length || ids.length > 100 || ids.some((id) => !UUID.test(id)))
    return falha("Selecione as parcelas da cobrança.");
  const parcelas = await lerTodos<Parcela>(
    s.b,
    "crm_parcelas",
    "*",
    undefined,
    { id: ids, lead_id: d.lead },
  );
  if (parcelas.length !== ids.length)
    return falha("Uma parcela não está mais disponível. Atualize o Caixa.");
  const resumo = `${PREFIXO_COBRANCA} · ${parcelas
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((p) => `${p.rotulo} (vence ${p.vence_em})`)
    .join(
      "; ",
    )}${d.nota.trim() ? ` · ${d.nota.trim()}` : ""}${d.lembrete ? ` · Próximo lembrete: ${d.lembrete}` : ""}`;
  const registro = {
    id: d.request,
    owner_id: s.usuario.id,
    lead_id: d.lead,
    canal: d.canal,
    direcao: "saida",
    resumo,
    created_at: `${d.dia}T12:00:00-03:00`,
  };
  const { data: anterior, error: erroLeitura } = await s.b
    .from("crm_interacoes")
    .select("*")
    .eq("id", d.request)
    .maybeSingle<Interacao>();
  if (erroLeitura)
    return falha("Não consegui conferir o registro anterior. Tente novamente.");
  if (
    anterior &&
    (anterior.lead_id !== d.lead ||
      anterior.canal !== d.canal ||
      anterior.resumo !== resumo ||
      diaLocal(anterior.created_at) !== d.dia)
  )
    return falha("Este envio já registrou outra cobrança. Atualize a tela.");
  if (!anterior) {
    const { error } = await s.b
      .from("crm_interacoes")
      .upsert(registro, { onConflict: "id", ignoreDuplicates: true });
    if (error)
      return falha(
        "Não consegui registrar a cobrança. Tente novamente neste formulário.",
      );
    const { data: gravado, error: erroConferencia } = await s.b
      .from("crm_interacoes")
      .select("lead_id,canal,resumo,created_at")
      .eq("id", d.request)
      .maybeSingle<Interacao>();
    if (
      erroConferencia ||
      !gravado ||
      gravado.lead_id !== d.lead ||
      gravado.canal !== d.canal ||
      gravado.resumo !== resumo ||
      diaLocal(gravado.created_at) !== d.dia
    )
      return falha(
        "Não consegui confirmar esta cobrança. Confira o histórico antes de tentar novamente.",
      );
  }
  if (d.lembrete) {
    const { error } = await s.b
      .from("crm_parcelas")
      .update({ cobrar_em: d.lembrete })
      .in("id", ids)
      .eq("lead_id", d.lead);
    if (error) {
      atualizar();
      return falha(
        "Cobrança registrada; o lembrete não foi atualizado. Tente novamente neste formulário.",
      );
    }
  }
  return atualizar();
}

export async function lembrarCobranca(
  lead: string,
  ids: string[],
  dia: string,
): Promise<Feito> {
  const s = await sessao();
  if (!s) return falha("Sessão expirada.");
  if (
    !UUID.test(lead) ||
    !ids.length ||
    ids.length > 100 ||
    ids.some((id) => !UUID.test(id)) ||
    !dataValida(dia) ||
    dia <= hojeSP()
  )
    return falha("Escolha uma data depois de hoje.");
  const parcelas = await lerTodos<Parcela>(
    s.b,
    "crm_parcelas",
    "*",
    undefined,
    { id: ids, lead_id: lead },
  );
  if (parcelas.length !== new Set(ids).size)
    return falha("Parcela não encontrada. Atualize a tela.");
  const { error } = await s.b
    .from("crm_parcelas")
    .update({ cobrar_em: dia })
    .in("id", ids)
    .eq("lead_id", lead);
  return error ? falha("Não consegui atualizar o lembrete.") : atualizar();
}

type Auditoria = {
  request: string;
  quando: string;
  usuario: string;
  motivo: string;
  antes: unknown;
  depois: Record<string, unknown>;
};
/** Vínculo, valores e auditoria são gravados juntos, com verificação de concorrência. */
export async function ajustarRecebimento(d: {
  id: string;
  request: string;
  motivo: string;
  valor?: number;
  dia?: string;
  metodo?: string;
  liquido?: number | null;
  alocacoes?: Alocacao[];
  lead?: string;
  anular?: boolean;
}): Promise<Feito> {
  const s = await sessao();
  if (!s) return falha("Sessão expirada.");
  if (
    !UUID.test(d.id) ||
    !UUID.test(d.request) ||
    !d.motivo.trim() ||
    d.motivo.length > 1000
  )
    return falha("Informe o motivo da alteração.");
  const { data: r, error } = await s.b
    .from("crm_recebimentos")
    .select("*")
    .eq("id", d.id)
    .maybeSingle<Recebimento>();
  if (error || !r) return falha("Recebimento não encontrado.");
  const meta = { ...metadados(r.bruto) },
    historico = (
      Array.isArray(meta.caixa_historico) ? meta.caixa_historico : []
    ) as Auditoria[];
  const pedido = {
    motivo: d.motivo.trim(),
    valor: d.valor,
    dia: d.dia,
    metodo: d.metodo,
    liquido: d.liquido,
    alocacoes: d.alocacoes,
    lead: d.lead,
    anular: d.anular,
  };
  const anterior = historico.find((h) => h.request === d.request);
  if (anterior)
    return igual(anterior.depois.pedido, pedido)
      ? atualizar()
      : falha("Este envio já aplicou outra alteração. Atualize a tela.");
  if (recebimentoAnulado(r))
    return falha(
      "Este lançamento já foi anulado. O registro original permanece no histórico.",
    );
  const valores: Record<string, unknown> = {};
  if (d.anular) {
    if (
      r.origem !== "manual" ||
      r.mp_payment_id ||
      r.estornado_em ||
      Number(r.valor_estornado) > 0
    )
      return falha(
        "Só é possível anular lançamentos manuais sem devoluções. Confira a origem deste pagamento.",
      );
    meta.caixa_anulado = {
      quando: new Date().toISOString(),
      motivo: d.motivo.trim(),
      usuario: s.usuario.id,
    };
  } else if (d.valor !== undefined) {
    if (r.origem !== "manual" || r.mp_payment_id)
      return falha(
        "Pagamentos automáticos devem ser conferidos com a origem. O valor não pode ser reescrito aqui.",
      );
    if (r.estornado_em || Number(r.valor_estornado) > 0)
      return falha(
        "Este recebimento tem devolução. Preserve os valores e confira o histórico.",
      );
    const valor = centavos(Number(d.valor));
    if (
      !Number.isFinite(d.valor) ||
      valor <= 0 ||
      !dataValida(d.dia) ||
      d.dia > hojeSP() ||
      !(METODOS as readonly string[]).includes(d.metodo ?? "")
    )
      return falha("Confira o valor, a data e a forma de pagamento.");
    if (
      d.liquido != null &&
      (!Number.isFinite(d.liquido) || d.liquido < 0 || d.liquido > valor)
    )
      return falha("O líquido deve estar entre zero e o bruto.");
    Object.assign(valores, {
      valor,
      recebido_em: d.dia,
      metodo: d.metodo,
      valor_liquido: d.liquido ?? null,
    });
  }
  if (d.alocacoes && !d.anular) {
    if (
      r.estornado_em ||
      !UUID.test(d.lead ?? "") ||
      d.alocacoes.length > 100 ||
      d.alocacoes.some(
        (a) =>
          !UUID.test(a.parcela_id) || !Number.isFinite(a.valor) || a.valor <= 0,
      ) ||
      new Set(d.alocacoes.map((a) => a.parcela_id)).size !== d.alocacoes.length
    )
      return falha("Confira o cliente e os valores destinados a cada parcela.");
    const { data: lead } = await s.b
      .from("crm_leads")
      .select("id")
      .eq("id", d.lead!)
      .maybeSingle();
    if (!lead) return falha("Cliente não encontrado.");
    const parcelas = await lerTodos<Parcela>(
      s.b,
      "crm_parcelas",
      "*",
      undefined,
      { id: d.alocacoes.map((a) => a.parcela_id), lead_id: d.lead! },
    );
    const contratos = await lerTodos<{ id: string; status: string }>(
      s.b,
      "crm_contratos",
      "id,status",
      undefined,
      { id: [...new Set(parcelas.map((p) => p.contrato_id))] },
    );
    const pagamentos = pagamentosPorParcela(
      (await lerTodos<Recebimento>(s.b, "crm_recebimentos")).filter(
        (x) => x.id !== r.id,
      ),
    );
    if (
      parcelas.length !== d.alocacoes.length ||
      parcelas.some(
        (p) =>
          p.cancelada_em ||
          contratos.find((c) => c.id === p.contrato_id)?.status !== "ativo",
      )
    )
      return falha("Selecione parcelas de contratos ativos deste cliente.");
    const total = centavos(d.alocacoes.reduce((t, a) => t + a.valor, 0));
    if (
      total > valorRetido({ ...r, ...valores }) + 0.005 ||
      d.alocacoes.some(
        (a) =>
          a.valor >
          centavos(
            Number(parcelas.find((p) => p.id === a.parcela_id)!.valor) -
              (pagamentos.get(a.parcela_id) ?? 0),
          ) +
            0.005,
      )
    )
      return falha(
        "A alocação excede o pagamento disponível ou o saldo de uma parcela. Atualize a tela.",
      );
    const direta =
      d.alocacoes.length === 1 &&
      Math.abs(total - valorRetido({ ...r, ...valores })) < 0.005
        ? d.alocacoes[0].parcela_id
        : null;
    Object.assign(valores, { lead_id: d.lead, parcela_id: direta });
    meta.caixa_alocacoes = d.alocacoes.map((a) => ({
      ...a,
      valor: centavos(a.valor),
    }));
  }
  if (!Object.keys(valores).length && !d.anular)
    return falha("Nenhuma alteração informada.");
  if (r.parcela_id && d.valor !== undefined && !d.alocacoes && !d.anular) {
    const { data: p } = await s.b
      .from("crm_parcelas")
      .select("valor")
      .eq("id", r.parcela_id)
      .maybeSingle();
    const pagos = pagamentosPorParcela(
      (await lerTodos<Recebimento>(s.b, "crm_recebimentos")).filter(
        (x) => x.id !== r.id,
      ),
    );
    if (
      !p ||
      Number(valores.valor) >
        centavos(Number(p.valor) - (pagos.get(r.parcela_id) ?? 0)) + 0.005
    )
      return falha(
        "O valor corrigido excede o saldo desta parcela. Confira o vínculo antes de alterar o lançamento.",
      );
  }
  const auditoria: Auditoria = {
    request: d.request,
    quando: new Date().toISOString(),
    usuario: s.usuario.id,
    motivo: d.motivo.trim(),
    antes: {
      valor: r.valor,
      valor_liquido: r.valor_liquido,
      recebido_em: r.recebido_em,
      metodo: r.metodo,
      lead_id: r.lead_id,
      parcela_id: r.parcela_id,
      alocacoes: metadados(r.bruto).caixa_alocacoes,
    },
    depois: { ...valores, pedido },
  };
  const bruto = {
    ...metadados(r.bruto),
    ...meta,
    caixa_historico: [...historico, auditoria],
    caixa_versao: d.request,
  };
  let consulta = s.b
    .from("crm_recebimentos")
    .update({ ...valores, bruto })
    .eq("id", r.id)
    .eq("valor", r.valor)
    .eq("recebido_em", r.recebido_em);
  consulta =
    typeof metadados(r.bruto).caixa_versao === "string"
      ? consulta.eq("bruto->>caixa_versao", metadados(r.bruto).caixa_versao)
      : consulta.is("bruto->>caixa_versao", null);
  consulta =
    r.estornado_em == null
      ? consulta.is("estornado_em", null)
      : consulta.eq("estornado_em", r.estornado_em);
  consulta =
    r.valor_estornado == null
      ? consulta.is("valor_estornado", null)
      : consulta.eq("valor_estornado", r.valor_estornado);
  consulta =
    r.valor_liquido == null
      ? consulta.is("valor_liquido", null)
      : consulta.eq("valor_liquido", r.valor_liquido);
  consulta =
    r.parcela_id == null
      ? consulta.is("parcela_id", null)
      : consulta.eq("parcela_id", r.parcela_id);
  consulta =
    r.lead_id == null
      ? consulta.is("lead_id", null)
      : consulta.eq("lead_id", r.lead_id);
  const { data: gravado, error: erroSalvar } = await consulta
    .select("id")
    .maybeSingle();
  if (erroSalvar || !gravado)
    return falha(
      "O recebimento mudou durante a conferência. Atualize a tela antes de tentar novamente.",
    );
  return atualizar();
}
