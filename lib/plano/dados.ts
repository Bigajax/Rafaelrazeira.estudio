import { clienteServidor } from "@/lib/crm/supabase";
import { financeiro } from "@/lib/financeiro/dados";
import { projetos as lerProjetos } from "@/lib/projetos/dados";
import { apurarMes } from "@/lib/sistema/indicadores";
import { lerTodos, tabelaAusente } from "@/lib/sistema/consultas";
import { diaLocal, instanteSP, limitesAno, mesLocal } from "@/lib/sistema/calendario";
import type { Ciclo, Fonte, Meta, Projeto, Rmr, Valores } from "./tipos";

export async function plano(ano: number, ate: number) {
  const b = await clienteServidor();
  const { inicio, fim } = limitesAno(ano);
  const [ciclo, iniciativas, metas, medicoes, rmrs] = await Promise.all([
    b.from("plano_ciclos").select("*").eq("ano", ano).maybeSingle<Ciclo>(),
    lerTodos<Projeto>(b, "plano_projetos").catch((e) => {
      if (tabelaAusente(e)) return null;
      throw e;
    }),
    lerTodos<Meta>(b, "plano_metas").catch((e) => {
      if (tabelaAusente(e)) return null;
      throw e;
    }),
    lerTodos<{ id: string; meta_id: string; mes: string; valor: number }>(
      b,
      "plano_medicoes",
      "id,meta_id,mes,valor",
      { coluna: "mes", inicio, fim },
    ),
    lerTodos<Rmr & { id: string }>(b, "plano_rmr"),
  ]);
  if (tabelaAusente(ciclo.error) || iniciativas === null || metas === null)
    return { semTabela: true as const };
  if (ciclo.error) throw new Error("Não foi possível carregar o Plano. Tente novamente.");
  const listaMetas = metas.filter((m) => m.ano === ano).sort((a, b) => a.ordem - b.ordem);
  const valores: Valores = {};
  for (const m of medicoes) (valores[m.meta_id] ??= {})[Number(m.mes.slice(5, 7))] = Number(m.valor);
  const [fin, entregas, toques, posts] = await Promise.all([
    financeiro(ano),
    lerProjetos(),
    lerTodos<{ id: string; direcao: string; created_at: string }>(
      b,
      "crm_interacoes",
      "id,direcao,created_at",
      { coluna: "created_at", inicio: instanteSP(inicio), fim: instanteSP(fim) },
    ),
    lerTodos<{ id: string; status: string; posta_em: string | null }>(b, "mkt_pecas", "id,status,posta_em", {
      coluna: "posta_em",
      inicio,
      fim,
    }),
  ]);
  if (fin.semTabela) throw new Error("Não foi possível carregar as fontes financeiras do Plano.");
  const auto: Partial<Record<Fonte, Partial<Record<number, number>>>> = {};
  const somar = (f: Fonte, mes: number, v: number) => {
    const t = (auto[f] ??= {});
    t[mes] = (t[mes] ?? 0) + v;
  };
  const recebido: Partial<Record<number, number>> = {};
  const vendido: Partial<Record<number, number>> = {};
  for (let mes = 1; mes <= ate; mes++) {
    const chave = String(ano) + "-" + String(mes).padStart(2, "0");
    const r = apurarMes(chave, fin.recebimentos, fin.despesas, fin.devolucoes, fin.vendas);
    recebido[mes] = r.bruto - r.devolvido;
    vendido[mes] = r.vendido;
    somar("recebido", mes, r.bruto - r.devolvido);
    somar("fechados", mes, fin.vendas.filter((v) => v.quando && mesLocal(v.quando) === chave).length);
    if (fin.movimentosDisponiveis) {
      somar("despesas", mes, r.despesas);
      if (r.saldo !== null) somar("saldo", mes, r.saldo);
    }
    somar(
      "entregas",
      mes,
      entregas.projetos.filter((p) => p.entregue_em && mesLocal(p.entregue_em) === chave).length,
    );
    somar("toques", mes, 0);
    somar("posts", mes, 0);
  }
  for (const t of toques)
    if (t.direcao === "saida") somar("toques", Number(diaLocal(t.created_at).slice(5, 7)), 1);
  for (const p of posts)
    if (p.status === "postada" && p.posta_em) somar("posts", Number(p.posta_em.slice(5, 7)), 1);
  for (const m of listaMetas) {
    if (m.fonte === "manual") continue;
    const criada = (m as Meta & { created_at?: string }).created_at;
    const de = criada && diaLocal(criada).startsWith(String(ano)) ? Number(diaLocal(criada).slice(5, 7)) : 1;
    const v: Partial<Record<number, number>> = {};
    for (let n = de; n <= ate; n++) if (auto[m.fonte]?.[n] !== undefined) v[n] = auto[m.fonte]![n];
    valores[m.id] = v;
  }
  return {
    semTabela: false as const,
    ciclo: ciclo.data,
    projetos: iniciativas.sort((a, b) => a.ordem - b.ordem),
    metas: listaMetas.map((m) => ({ ...m, alvo: Number(m.alvo) })),
    valores,
    rmrs: rmrs
      .filter((r) => r.mes >= inicio && r.mes < fim)
      .map((r) => ({ ...r, nota: r.nota === null ? null : Number(r.nota) })),
    recebido,
    vendido,
    movimentosDisponiveis: fin.movimentosDisponiveis,
  };
}
