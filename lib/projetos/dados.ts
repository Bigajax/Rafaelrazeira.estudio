/* ============================================================
   PROJETOS: a leitura

   Vira projeto quem PAGOU a entrada: qualquer lead com dinheiro recebido
   no Caixa. Os leads em `ganho` entram também, para os clientes antigos,
   de antes do Caixa, não sumirem. O que a tela mostra de cada um vem de
   quatro lugares, lidos juntos:
     crm_leads      quem é e quando fechou
     crm_projetos   o checklist e os endereços (pode não existir ainda)
     o Caixa        contrato, parcelas e recebimentos: se a entrada e o
                    saldo entraram
     prod_lojas     o endereço da prévia, para o projeto nascer sabendo
                    onde a vitrine está

   Se a tabela crm_projetos ainda não foi criada (o supabase/projetos.sql
   não rodou), a aba funciona só com o molde e avisa: `semTabela`.
   ============================================================ */

import { clienteServidor } from "@/lib/crm/supabase";
import { centavos, quitacaoDoContrato, situacaoDaParcela } from "@/lib/crm/financeiro";
import type { Contrato, Parcela, Recebimento } from "@/lib/crm/tipos";
import { checklistDe, type Caixa, type ItemChecklist, type Projeto } from "./tipos";

const CAMPOS_LEAD = "id, empresa, nome, instagram, whatsapp, fechado_em, valor_fechado";

type LinhaLead = {
  id: string;
  empresa: string | null;
  nome: string | null;
  instagram: string | null;
  whatsapp: string | null;
  fechado_em: string | null;
  valor_fechado: number | null;
};

type LinhaProjeto = {
  id: string;
  lead_id: string;
  checklist: ItemChecklist[] | null;
  site: string | null;
  dominio: string | null;
  repo: string | null;
  material: string | null;
  notas: string | null;
  entregue_em: string | null;
};

function caixaDo(leadId: string, contratos: Contrato[], parcelas: Parcela[], recebimentos: Recebimento[]): Caixa {
  const vivos = contratos.filter((c) => c.lead_id === leadId && c.status === "ativo");
  const pagoPorParcela = new Map<string, number>();
  for (const r of recebimentos) {
    if (r.lead_id !== leadId || !r.parcela_id || r.estornado_em) continue;
    pagoPorParcela.set(r.parcela_id, (pagoPorParcela.get(r.parcela_id) ?? 0) + Number(r.valor));
  }
  const minhas = parcelas
    .filter((p) => p.lead_id === leadId && vivos.some((c) => c.id === p.contrato_id))
    .map((p) => ({ ...p, recebido: centavos(pagoPorParcela.get(p.id) ?? 0) }));

  let total = 0, pago = 0, quitados = 0;
  for (const c of vivos) {
    const q = quitacaoDoContrato(c, minhas.filter((p) => p.contrato_id === c.id));
    total += q.total;
    pago += q.pago;
    if (q.quitado && q.total > 0) quitados++;
  }

  const vivas = minhas.filter((p) => !p.cancelada_em).sort((a, b) => a.numero - b.numero || a.vence_em.localeCompare(b.vence_em));
  const primeira = vivas[0];
  const abertas = vivas
    .map((p) => ({ p, s: situacaoDaParcela(p) }))
    .filter(({ s }) => s.situacao !== "paga" && s.situacao !== "cancelada")
    .sort((a, b) => a.p.vence_em.localeCompare(b.p.vence_em));

  return {
    contrato: vivos.length > 0,
    entrada: !!primeira && situacaoDaParcela(primeira).situacao === "paga",
    saldo: vivos.length > 0 && quitados === vivos.length,
    total: centavos(total),
    pago: centavos(pago),
    proxima: abertas[0] ? { rotulo: abertas[0].p.rotulo, valor: abertas[0].s.saldo, vence_em: abertas[0].p.vence_em } : null,
  };
}

async function ler(leadId?: string): Promise<{ projetos: Projeto[]; semTabela: boolean }> {
  const supabase = await clienteServidor();

  /* quem já pagou alguma coisa: o recebimento amarrado a um lead */
  let pagos = supabase.from("crm_recebimentos").select("lead_id, recebido_em").not("lead_id", "is", null).is("estornado_em", null);
  if (leadId) pagos = pagos.eq("lead_id", leadId);
  const { data: recebidos } = await pagos.returns<{ lead_id: string; recebido_em: string }[]>();
  const primeiroPagamento = new Map<string, string>();
  for (const r of recebidos ?? []) {
    const antes = primeiroPagamento.get(r.lead_id);
    if (!antes || r.recebido_em < antes) primeiroPagamento.set(r.lead_id, r.recebido_em);
  }

  let ganhos = supabase.from("crm_leads").select(CAMPOS_LEAD).eq("estagio", "ganho");
  if (leadId) ganhos = ganhos.eq("id", leadId);
  const idsPagos = [...primeiroPagamento.keys()];
  const [{ data: porEstagio }, { data: porPagamento }] = await Promise.all([
    ganhos.returns<LinhaLead[]>(),
    idsPagos.length
      ? supabase.from("crm_leads").select(CAMPOS_LEAD).in("id", idsPagos).neq("estagio", "perdido").returns<LinhaLead[]>()
      : Promise.resolve({ data: [] as LinhaLead[] }),
  ]);
  const unicos = new Map<string, LinhaLead>();
  for (const l of [...(porEstagio ?? []), ...(porPagamento ?? [])]) unicos.set(l.id, l);
  const leads = [...unicos.values()]
    .map((l) => ({ ...l, fechado_em: l.fechado_em ?? primeiroPagamento.get(l.id)?.slice(0, 10) ?? null }))
    .sort((a, b) => (b.fechado_em ?? "").localeCompare(a.fechado_em ?? ""));
  const ids = leads.map((l) => l.id);
  if (!ids.length) return { projetos: [], semTabela: false };

  const [contratos, parcelas, recebimentos, projetos, lojas] = await Promise.all([
    supabase.from("crm_contratos").select("*").in("lead_id", ids).returns<Contrato[]>(),
    supabase.from("crm_parcelas").select("*").in("lead_id", ids).returns<Parcela[]>(),
    supabase.from("crm_recebimentos").select("*").in("lead_id", ids).returns<Recebimento[]>(),
    supabase.from("crm_projetos").select("id, lead_id, checklist, site, dominio, repo, material, notas, entregue_em").in("lead_id", ids).returns<LinhaProjeto[]>(),
    supabase.from("prod_lojas").select("lead_id, previa_url").in("lead_id", ids).returns<{ lead_id: string; previa_url: string | null }[]>(),
  ]);

  const semTabela = !!projetos.error;
  const porLead = new Map((projetos.data ?? []).map((p) => [p.lead_id, p]));
  const previa = new Map((lojas.data ?? []).filter((l) => l.previa_url).map((l) => [l.lead_id, l.previa_url]));

  return {
    semTabela,
    projetos: leads.map((l) => {
      const p = porLead.get(l.id);
      const caixa = caixaDo(l.id, contratos.data ?? [], parcelas.data ?? [], recebimentos.data ?? []);
      return {
        lead_id: l.id,
        id: p?.id ?? null,
        nome: l.empresa || l.nome || (l.instagram ? `@${l.instagram}` : "Sem nome"),
        instagram: l.instagram,
        whatsapp: l.whatsapp,
        fechado_em: l.fechado_em,
        valor: l.valor_fechado,
        checklist: checklistDe(p?.checklist),
        site: p?.site ?? previa.get(l.id) ?? null,
        dominio: p?.dominio ?? null,
        repo: p?.repo ?? null,
        material: p?.material ?? null,
        notas: p?.notas ?? null,
        entregue_em: p?.entregue_em ?? null,
        caixa,
        auto: { contrato: caixa.contrato, entrada: caixa.entrada || primeiroPagamento.has(l.id), saldo: caixa.saldo, checklist: !!p?.material },
      };
    }),
  };
}

export const projetos = () => ler();

export async function projeto(leadId: string) {
  const { projetos: lista, semTabela } = await ler(leadId);
  return { projeto: lista[0] ?? null, semTabela };
}
