import { clienteServidor } from "@/lib/crm/supabase";
import { centavos, quitacaoDoContrato, situacaoDaParcela } from "@/lib/crm/financeiro";
import { lerTodos, tabelaAusente } from "@/lib/sistema/consultas";
import { valorRetido } from "@/lib/sistema/indicadores";
import type { Contrato, Parcela, Recebimento } from "@/lib/crm/tipos";
import { checklistDe, type Caixa, type ItemChecklist, type Projeto } from "./tipos";

type LinhaLead = {
  id: string;
  empresa: string | null;
  nome: string | null;
  instagram: string | null;
  whatsapp: string | null;
  estagio: string;
  fechado_em: string | null;
  valor_fechado: number | null;
};
type LinhaProjeto = {
  id: string;
  lead_id: string;
  contrato_id?: string;
  checklist: ItemChecklist[] | null;
  site: string | null;
  dominio: string | null;
  repo: string | null;
  material: string | null;
  notas: string | null;
  entregue_em: string | null;
  prazo?: string | null;
};
export function caixaDo(
  leadId: string,
  contratos: Contrato[],
  parcelas: Parcela[],
  recebimentos: Recebimento[],
  contratoId?: string | null,
): Caixa {
  const vivos = contratos.filter(
    (c) =>
      c.lead_id === leadId &&
      c.status === "ativo" &&
      c.tipo === "projeto" &&
      (!contratoId || c.id === contratoId),
  );
  const pago = new Map<string, number>();
  for (const r of recebimentos) {
    if (r.parcela_id && r.lead_id === leadId)
      pago.set(r.parcela_id, (pago.get(r.parcela_id) ?? 0) + valorRetido(r));
  }
  const minhas = parcelas
    .filter((p) => p.lead_id === leadId && vivos.some((c) => c.id === p.contrato_id))
    .map((p) => ({ ...p, recebido: centavos(pago.get(p.id) ?? 0) }));
  const qs = vivos.map((c) =>
    quitacaoDoContrato(
      c,
      minhas.filter((p) => p.contrato_id === c.id),
    ),
  );
  const vivas = minhas
    .filter((p) => !p.cancelada_em)
    .sort((a, b) => a.numero - b.numero || a.vence_em.localeCompare(b.vence_em));
  const abertas = vivas
    .map((p) => ({ p, s: situacaoDaParcela(p) }))
    .filter((x) => x.s.situacao !== "paga" && x.s.situacao !== "cancelada")
    .sort((a, b) => a.p.vence_em.localeCompare(b.p.vence_em));
  return {
    contrato: vivos.length > 0,
    entrada: !!vivas[0] && situacaoDaParcela(vivas[0]).situacao === "paga",
    saldo: vivos.length > 0 && qs.every((q) => q.quitado && q.total > 0),
    total: centavos(qs.reduce((s, q) => s + q.total, 0)),
    pago: centavos(qs.reduce((s, q) => s + q.pago, 0)),
    proxima: abertas[0]
      ? { rotulo: abertas[0].p.rotulo, valor: abertas[0].s.saldo, vence_em: abertas[0].p.vence_em }
      : null,
  };
}
async function ler(leadId?: string) {
  const b = await clienteServidor();
  const [leads, contratos, parcelas, recebimentos, legados, entregas, lojas, performance] = await Promise.all(
    [
      lerTodos<LinhaLead>(
        b,
        "crm_leads",
        "id,empresa,nome,instagram,whatsapp,estagio,fechado_em,valor_fechado",
      ),
      lerTodos<Contrato>(b, "crm_contratos"),
      lerTodos<Parcela>(b, "crm_parcelas"),
      lerTodos<Recebimento>(b, "crm_recebimentos"),
      lerTodos<LinhaProjeto>(b, "crm_projetos").catch((e) => {
        if (tabelaAusente(e)) return null;
        throw e;
      }),
      lerTodos<LinhaProjeto>(b, "crm_entregas").catch((e) => {
        if (tabelaAusente(e)) return null;
        throw e;
      }),
      lerTodos<{ lead_id: string | null; previa_url: string | null }>(
        b,
        "prod_lojas",
        "id,lead_id,previa_url",
      ),
      lerTodos<NonNullable<Projeto["performance"]> & { lead_id: string | null }>(
        b,
        "perf_lojas",
        "id,lead_id,nome,slug,chave_prefixo,liberado_ate,para_sempre,ativa",
      ).catch((e) => {
        if (tabelaAusente(e)) return [];
        throw e;
      }),
    ],
  );
  const resultado: Projeto[] = [];
  for (const l of leads.filter((l) => !leadId || l.id === leadId)) {
    const todos = contratos.filter((c) => c.lead_id === l.id);
    const ativos = todos.filter((c) => c.tipo === "projeto" && c.status === "ativo");
    const legado = (legados ?? []).find((p) => p.lead_id === l.id);
    // Recorrência sozinha não significa entrega; ganho antigo continua disponível.
    if (!ativos.length && !(legado || (l.estagio === "ganho" && !todos.length))) continue;
    for (const c of ativos.length ? ativos : [null]) {
      const novo = c ? (entregas ?? []).find((p) => p.contrato_id === c.id) : null;
      const p = novo ?? (!c || (entregas === null && ativos.length <= 1) ? legado : undefined);
      const caixa = caixaDo(l.id, contratos, parcelas, recebimentos, c?.id);
      const previas = lojas.filter((x) => x.lead_id === l.id && x.previa_url);
      const perfs = performance.filter((x) => x.lead_id === l.id);
      resultado.push({
        lead_id: l.id,
        contrato_id: entregas !== null ? (c?.id ?? null) : ativos.length > 1 ? c?.id : null,
        contrato_titulo: c?.titulo ?? null,
        prazo: p?.prazo ?? null,
        id: p?.id ?? null,
        nome: l.empresa || l.nome || l.instagram || "Sem nome",
        instagram: l.instagram,
        whatsapp: l.whatsapp,
        fechado_em: c?.assinado_em ?? l.fechado_em,
        valor: c?.valor_total ?? l.valor_fechado,
        checklist: checklistDe(p?.checklist),
        site: p?.site ?? (previas.length === 1 ? previas[0].previa_url : null),
        dominio: p?.dominio ?? null,
        repo: p?.repo ?? null,
        material: p?.material ?? null,
        notas: p?.notas ?? null,
        entregue_em: p?.entregue_em ?? null,
        caixa,
        auto: {
          contrato: caixa.contrato,
          entrada: caixa.entrada,
          saldo: caixa.saldo,
          checklist: !!p?.material,
        },
        performance: perfs.length === 1 ? perfs[0] : null,
      });
    }
  }
  return {
    projetos: resultado.sort((a, b) => (b.fechado_em ?? "").localeCompare(a.fechado_em ?? "")),
    semTabela: legados === null,
    integrado: entregas !== null,
  };
}
export const projetos = () => ler();
export async function projeto(leadId: string, contratoId?: string) {
  const r = await ler(leadId);
  return {
    ...r,
    projeto: contratoId
      ? (r.projetos.find((p) => p.contrato_id === contratoId) ?? null)
      : r.projetos.length === 1
        ? r.projetos[0]
        : null,
  };
}
