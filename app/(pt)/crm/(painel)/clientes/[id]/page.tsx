import Link from "next/link";
import { notFound } from "next/navigation";
import { clienteServidor } from "@/lib/crm/supabase";
import { lerTodos } from "@/lib/sistema/consultas";
import { valorRetido } from "@/lib/sistema/indicadores";
import { projeto } from "@/lib/projetos/dados";
import { EditarCliente } from "@/components/sistema/EditarCliente";
import { paginarHistorico, type EventoCliente } from "@/lib/sistema/historico";
import type { Devolucao } from "@/lib/sistema/indicadores";
import { dinheiroExato, quitacaoDoContrato } from "@/lib/crm/financeiro";
import type { Contrato, Parcela, Recebimento } from "@/lib/crm/tipos";
import { Cabecalho, Indicador } from "@/components/sistema/Painel";
import s from "@/components/sistema/sistema.module.css";
export const metadata = { title: "Cliente" };
export default async function Cliente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; pagina?: string }>;
}) {
  const { id } = await params;
  const filtros = await searchParams;
  const b = await clienteServidor();
  const { data: c, error } = await b
    .from("crm_clientes")
    .select("id,nome,whatsapp,email")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o cliente.");
  if (!c) notFound();
  const vinculos = await lerTodos<{
    id: string;
    cliente_id: string;
    lead_id: string;
  }>(b, "crm_cliente_negocios", "id,cliente_id,lead_id", undefined, {
    cliente_id: id,
  });
  const ids = new Set(vinculos.map((v) => v.lead_id));
  const porNegocio = { lead_id: [...ids] };
  const [
    negocios,
    contratos,
    parcelas,
    recebimentos,
    entregas,
    lojas,
    eventos,
  ] = await Promise.all([
    lerTodos<{
      id: string;
      nome: string;
      estagio: string;
      proximo_passo: string | null;
      proxima_acao_em: string | null;
    }>(
      b,
      "crm_leads",
      "id,nome,estagio,proximo_passo,proxima_acao_em",
      undefined,
      { id: [...ids] },
    ),
    lerTodos<Contrato>(b, "crm_contratos", "*", undefined, porNegocio),
    lerTodos<Parcela>(b, "crm_parcelas", "*", undefined, porNegocio),
    lerTodos<Recebimento>(b, "crm_recebimentos", "*", undefined, porNegocio),
    Promise.all([...ids].map((lead) => projeto(lead))).then((rs) => ({
      projetos: rs.flatMap((r) => r.projetos),
    })),
    lerTodos<{
      id: string;
      nome: string;
      lead_id: string;
      liberado_ate: string | null;
      ativa: boolean;
      para_sempre: boolean;
      chave_prefixo: string | null;
    }>(
      b,
      "perf_lojas",
      "id,nome,lead_id,liberado_ate,ativa,para_sempre,chave_prefixo",
      undefined,
      porNegocio,
    ),
    lerTodos<{
      id: string;
      lead_id: string;
      etapa: string;
      anterior: string | null;
      ocorrido_em: string;
      inicial: boolean;
    }>(b, "crm_eventos_etapa", "*", undefined, porNegocio),
  ]);
  const ns = negocios.filter((n) => ids.has(n.id));
  const cs = contratos.filter((c) => ids.has(c.lead_id));
  const rs = recebimentos.filter((r) => r.lead_id && ids.has(r.lead_id));
  const ps = parcelas
    .filter((p) => ids.has(p.lead_id))
    .map((p) => ({
      ...p,
      recebido: rs
        .filter((r) => r.parcela_id === p.id)
        .reduce((s, r) => s + valorRetido(r), 0),
    }));
  const qs = cs
    .filter((c) => c.status === "ativo")
    .map((c) =>
      quitacaoDoContrato(
        c,
        ps.filter((p) => p.contrato_id === c.id),
      ),
    );
  const es = entregas.projetos.filter((p) => ids.has(p.lead_id));
  const devolucoes = await lerTodos<Devolucao>(
    b,
    "crm_devolucoes",
    "*",
    undefined,
    { recebimento_id: rs.map((r) => r.id) },
  );
  const dataEvento = (dia: string) =>
    dia.length === 10 ? dia + "T12:00:00-03:00" : dia;
  const timeline: EventoCliente[] = [
    ...eventos.map((e) => ({
      id: "etapa:" + e.id,
      tipo: "etapas" as const,
      quando: e.ocorrido_em,
      titulo: e.inicial
        ? "Base anterior"
        : e.anterior
          ? e.anterior + " → " + e.etapa
          : e.etapa,
      nota: e.inicial
        ? "Posição inicial; sem reconstrução de passagens antigas"
        : "Mudança registrada no CRM",
      href: "/crm/lead/" + e.lead_id,
    })),
    ...cs
      .filter((c) => c.assinado_em)
      .map((c) => ({
        id: "contrato:" + c.id,
        tipo: "contratos" as const,
        quando: dataEvento(c.assinado_em!),
        titulo: "Contrato · " + c.titulo,
        nota: c.status,
        href: "/crm/lead/" + c.lead_id,
      })),
    ...rs.map((r) => ({
      id: "recebimento:" + r.id,
      tipo: "financeiro" as const,
      quando: dataEvento(r.recebido_em),
      titulo: "Recebimento · " + dinheiroExato(Number(r.valor)),
      nota: r.origem === "mercadopago" ? "Mercado Pago" : "Registro manual",
      href: "/crm/financeiro?mes=" + r.recebido_em.slice(0, 7) + "&aba=extrato",
    })),
    ...devolucoes.map((d) => ({
      id: "devolucao:" + d.id,
      tipo: "financeiro" as const,
      quando: dataEvento(d.devolvido_em),
      titulo: "Devolução · " + dinheiroExato(Number(d.valor)),
      nota: d.notas ?? "Movimento vinculado ao recebimento original",
      href:
        "/crm/financeiro?mes=" + d.devolvido_em.slice(0, 7) + "&aba=extrato",
    })),
    ...es
      .filter((e) => e.entregue_em)
      .map((e) => ({
        id: "entrega:" + (e.id ?? e.lead_id),
        tipo: "entregas" as const,
        quando: dataEvento(e.entregue_em!),
        titulo: "Entrega concluída · " + (e.contrato_titulo ?? e.nome),
        nota:
          e.status_contrato === "cancelado"
            ? "Contrato atualmente cancelado"
            : "Conclusão registrada",
        href:
          "/crm/projetos/" +
          e.lead_id +
          (e.contrato_id ? "?contrato=" + e.contrato_id : ""),
      })),
  ];
  const historico = paginarHistorico(
    timeline,
    filtros.tipo,
    Number(filtros.pagina ?? 1),
  );
  const urlPagina = (pagina: number) =>
    `/crm/clientes/${id}?tipo=${encodeURIComponent(filtros.tipo ?? "")}&pagina=${pagina}#historico`;
  return (
    <div className={s.tela}>
      <Cabecalho
        titulo={c.nome}
        descricao={
          [c.whatsapp, c.email].filter(Boolean).join(" · ") ||
          "Histórico e próximos passos do cliente."
        }
      >
        <Link href="/crm/clientes" className={s.botao}>
          ← Clientes
        </Link>
      </Cabecalho>
      <EditarCliente cliente={c} />
      <div className={s.kpis}>
        <Indicador
          nome="Negócios"
          valor={String(ns.length)}
          nota="Oportunidades vinculadas"
          href="#negocios"
        />
        <Indicador
          nome="Recebimentos retidos"
          valor={dinheiroExato(rs.reduce((s, r) => s + valorRetido(r), 0))}
          nota="Histórico após devoluções"
          href="#contratos"
        />
        <Indicador
          nome="Saldo contratual"
          valor={dinheiroExato(qs.reduce((s, q) => s + q.saldo, 0))}
          nota="Contratos ativos"
          href="#contratos"
        />
        <Indicador
          nome="Entregas abertas"
          valor={String(
            es.filter(
              (e) => !e.entregue_em && e.status_contrato !== "cancelado",
            ).length,
          )}
          nota="Projetos deste cliente"
          href="#entregas"
        />
      </div>
      <section id="negocios" className={s.painel}>
        <h2>Negócios e próximos passos</h2>
        <ul className={s.fila}>
          {ns.map((n) => (
            <li key={n.id}>
              <div>
                <b>
                  {n.nome} <span className={s.badge}>{n.estagio}</span>
                </b>
                <small>
                  {n.proximo_passo ?? "Definir próximo passo"}
                  {n.proxima_acao_em ? " · " + n.proxima_acao_em : ""}
                </small>
              </div>
              <Link className={s.botao} href={"/crm/lead/" + n.id}>
                Abrir negócio
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section id="contratos" className={s.painel}>
        <h2>Contratos e parcelas</h2>
        <div className={s.rolagem}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Contrato</th>
                <th>Modalidade</th>
                <th className={s.numero}>Recebido</th>
                <th className={s.numero}>Saldo</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {cs.map((c) => {
                const q = quitacaoDoContrato(
                  c,
                  ps.filter((p) => p.contrato_id === c.id),
                );
                return (
                  <tr key={c.id}>
                    <td>
                      {c.titulo}
                      <br />
                      <small>{c.status}</small>
                    </td>
                    <td>
                      {c.tipo === "recorrencia"
                        ? dinheiroExato(Number(c.valor_ciclo)) + "/mês"
                        : "Projeto"}
                    </td>
                    <td className={s.numero}>{dinheiroExato(q.pago)}</td>
                    <td className={s.numero}>
                      {c.status === "ativo"
                        ? dinheiroExato(q.saldo)
                        : "Cancelado"}
                    </td>
                    <td>
                      <Link href={"/crm/lead/" + c.lead_id}>Ver parcelas</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section id="entregas" className={s.painel}>
        <h2>Entregas e lojas</h2>
        <ul className={s.fila}>
          {es.map((e) => (
            <li key={e.contrato_id ?? e.lead_id}>
              <div>
                <b>{e.contrato_titulo ?? e.nome}</b>
                <small>
                  {e.status_contrato === "cancelado"
                    ? "Contrato cancelado · histórico"
                    : e.entregue_em
                      ? "Entregue em " + e.entregue_em
                      : "Em execução"}
                  {e.prazo ? " · prazo " + e.prazo : ""}
                  {e.bloqueio ? " · bloqueio: " + e.bloqueio : ""}
                </small>
              </div>
              <Link
                className={s.botao}
                href={
                  "/crm/projetos/" +
                  e.lead_id +
                  (e.contrato_id ? "?contrato=" + e.contrato_id : "")
                }
              >
                Abrir entrega
              </Link>
            </li>
          ))}
          {lojas
            .filter((l) => ids.has(l.lead_id))
            .map((l) => (
              <li key={l.id}>
                <div>
                  <b>{l.nome}</b>
                  <small>
                    {!l.ativa
                      ? "Loja inativa"
                      : !l.chave_prefixo
                        ? "Sem chave de acesso"
                        : l.para_sempre
                          ? "Acesso permanente"
                          : l.liberado_ate &&
                              new Date(l.liberado_ate).getTime() > Date.now()
                            ? "Acesso vigente até " +
                              new Date(l.liberado_ate).toLocaleDateString(
                                "pt-BR",
                                { timeZone: "America/Sao_Paulo" },
                              )
                            : "Acesso expirado"}
                  </small>
                </div>
                <Link className={s.botao} href={"/crm/performance/" + l.id}>
                  Performance
                </Link>
              </li>
            ))}
        </ul>
      </section>
      <section id="historico" className={s.painel}>
        <h2>Histórico do cliente</h2>
        <form className={s.form}>
          <label>
            Mostrar
            <select name="tipo" defaultValue={filtros.tipo ?? ""}>
              <option value="">Todos os eventos</option>
              <option value="etapas">Etapas comerciais</option>
              <option value="contratos">Contratos</option>
              <option value="financeiro">Recebimentos e devoluções</option>
              <option value="entregas">Entregas</option>
            </select>
          </label>
          <button className={s.botao}>Filtrar histórico</button>
        </form>
        <ul className={s.fila}>
          {historico.eventos.map((e) => (
            <li key={e.id}>
              <div>
                <b>{e.titulo}</b>
                <small>
                  {new Date(e.quando).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}{" "}
                  · {e.nota}
                </small>
              </div>
              <Link href={e.href}>Abrir origem</Link>
            </li>
          ))}
        </ul>
        {!historico.total ? (
          <p className={s.vazio}>Nenhum evento neste filtro.</p>
        ) : null}
        <nav className={s.acoes} aria-label="Páginas do histórico">
          {historico.atual > 1 ? (
            <Link href={urlPagina(historico.atual - 1)}>← Anterior</Link>
          ) : null}
          <span>
            {historico.atual} de {historico.totalPaginas} · {historico.total}{" "}
            eventos
          </span>
          {historico.atual < historico.totalPaginas ? (
            <Link href={urlPagina(historico.atual + 1)}>Próxima →</Link>
          ) : null}
        </nav>
      </section>
    </div>
  );
}
