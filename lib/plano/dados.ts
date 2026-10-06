/* A leitura do plano no servidor. Mesma chave do CRM: anônima + sessão, e
   o RLS decide o que volta. */
import { clienteServidor } from "@/lib/crm/supabase";
import type { Ciclo, Fonte, Meta, Projeto, Rmr, Valores } from "./tipos";

const SEM_TABELA = /plano_|does not exist|schema cache/i;

/* `ate`: o último mês que já conta (o mês corrente, ou 12 num ano que passou).
   Fonte automática sem movimento no mês vale ZERO, não "sem número": março
   sem Pix é um março com zero reais, e a meta tem que ver isso. */
export async function plano(ano: number, ate: number) {
  const supabase = await clienteServidor();
  const ini = `${ano}-01-01`;
  const fim = `${ano}-12-31`;

  const [ciclo, projetos, metas, medicoes, rmrs] = await Promise.all([
    supabase.from("plano_ciclos").select("*").eq("ano", ano).maybeSingle<Ciclo>(),
    supabase.from("plano_projetos").select("*").order("ordem").order("created_at").returns<Projeto[]>(),
    supabase.from("plano_metas").select("*").eq("ano", ano).order("ordem").order("created_at").returns<Meta[]>(),
    supabase
      .from("plano_medicoes")
      .select("meta_id, mes, valor")
      .gte("mes", ini)
      .lte("mes", fim)
      .returns<{ meta_id: string; mes: string; valor: number }[]>(),
    supabase.from("plano_rmr").select("*").order("mes").returns<Rmr[]>(),
  ]);

  const erro = ciclo.error ?? projetos.error ?? metas.error ?? medicoes.error ?? rmrs.error;
  if (erro && SEM_TABELA.test(erro.message)) return { semTabela: true as const };

  const listaMetas = metas.data ?? [];
  const valores: Valores = {};
  for (const m of medicoes.data ?? []) {
    const n = Number(m.mes.slice(5, 7));
    (valores[m.meta_id] ??= {})[n] = Number(m.valor);
  }

  /* as fontes automáticas: só busca o que alguma meta usa */
  const usadas = new Set<Fonte>(listaMetas.map((m) => m.fonte).filter((f) => f !== "manual"));
  /* o Caixa entra sempre: é ele que move os degraus do prêmio */
  usadas.add("recebido");
  const auto: Partial<Record<Fonte, Partial<Record<number, number>>>> = {};
  const somar = (f: Fonte, mes: number, v: number) => {
    const t = (auto[f] ??= {});
    t[mes] = (t[mes] ?? 0) + v;
  };

  const tarefas: PromiseLike<void>[] = [];
  /* VENDIDO AO LADO DO RECEBIDO (06/10): o valor dos ganhos por mês do
     fechamento. Só se mostra na Subida; os degraus continuam pelo Caixa,
     porque prêmio se paga com dinheiro que caiu. */
  const vendido: Partial<Record<number, number>> = {};
  tarefas.push(
    supabase
      .from("crm_leads")
      .select("valor_fechado, fechado_em")
      .eq("estagio", "ganho")
      .gte("fechado_em", ini)
      .lte("fechado_em", fim)
      .then(({ data }) => {
        for (const r of data ?? []) {
          const mes = Number(String(r.fechado_em).slice(5, 7));
          vendido[mes] = (vendido[mes] ?? 0) + Number(r.valor_fechado ?? 0);
        }
      }),
  );
  if (usadas.has("recebido")) {
    tarefas.push(
      supabase
        .from("crm_recebimentos")
        .select("valor, recebido_em")
        /* estorno fora: o prêmio se paga com dinheiro que ficou (06/10) */
        .is("estornado_em", null)
        .gte("recebido_em", ini)
        .lte("recebido_em", fim)
        .then(({ data }) => {
          for (const r of data ?? []) somar("recebido", Number(String(r.recebido_em).slice(5, 7)), Number(r.valor));
        }),
    );
  }
  if (usadas.has("fechados")) {
    tarefas.push(
      supabase
        .from("crm_leads")
        .select("fechado_em")
        .eq("estagio", "ganho")
        .gte("fechado_em", ini)
        .lte("fechado_em", fim)
        .then(({ data }) => {
          for (const r of data ?? []) somar("fechados", Number(String(r.fechado_em).slice(5, 7)), 1);
        }),
    );
  }
  if (usadas.has("posts")) {
    tarefas.push(
      supabase
        .from("mkt_pecas")
        .select("posta_em")
        .eq("status", "postada")
        .gte("posta_em", ini)
        .lte("posta_em", fim)
        .then(({ data }) => {
          for (const r of data ?? []) somar("posts", Number(String(r.posta_em).slice(5, 7)), 1);
        }),
    );
  }
  if (usadas.has("toques")) {
    /* contado no banco, mês a mês: em um ano são milhares de toques, e uma
       consulta comum para em 1000 linhas */
    for (let mes = 1; mes <= 12; mes++) {
      const de = `${ano}-${String(mes).padStart(2, "0")}-01T00:00:00-03:00`;
      const limite = mes === 12 ? `${ano + 1}-01-01T00:00:00-03:00` : `${ano}-${String(mes + 1).padStart(2, "0")}-01T00:00:00-03:00`;
      tarefas.push(
        supabase
          .from("crm_interacoes")
          .select("id", { count: "exact", head: true })
          .eq("direcao", "saida")
          .gte("created_at", de)
          .lt("created_at", limite)
          .then(({ count }) => {
            if (count) somar("toques", mes, count);
          }),
      );
    }
  }
  await Promise.all(tarefas);

  for (const m of listaMetas) {
    if (m.fonte === "manual") continue;
    /* a medição começa no mês em que a meta nasceu: uma meta criada em
       setembro não leva zero de janeiro a agosto, meses em que ela não
       existia (o teste de 30/09 deu 51% por isso) */
    const nasceu = (m as Meta & { created_at?: string }).created_at;
    /* no fuso de Maringá: a meta criada às 22h do dia 30 é de setembro, não de outubro */
    const criada = nasceu ? new Date(nasceu).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) : "";
    const inicio = criada.startsWith(String(ano)) ? Number(criada.slice(5, 7)) : 1;
    const v: Partial<Record<number, number>> = {};
    for (let mes = inicio; mes <= ate; mes++) v[mes] = auto[m.fonte]?.[mes] ?? 0;
    valores[m.id] = v;
  }

  return {
    semTabela: false as const,
    ciclo: ciclo.data,
    projetos: projetos.data ?? [],
    metas: listaMetas.map((m) => ({ ...m, alvo: Number(m.alvo) })),
    valores,
    rmrs: (rmrs.data ?? []).map((r) => ({ ...r, nota: r.nota === null ? null : Number(r.nota) })),
    recebido: auto.recebido ?? {},
    vendido,
  };
}

