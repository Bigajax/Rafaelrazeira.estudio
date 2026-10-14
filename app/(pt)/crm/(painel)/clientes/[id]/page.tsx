import Link from "next/link";
import { notFound } from "next/navigation";
import { clienteServidor } from "@/lib/crm/supabase";
import { lerTodos } from "@/lib/sistema/consultas";
import { valorRetido } from "@/lib/sistema/indicadores";
import { projetos } from "@/lib/projetos/dados";
import { dinheiroExato, quitacaoDoContrato } from "@/lib/crm/financeiro";
import type { Contrato, Parcela, Recebimento } from "@/lib/crm/tipos";
import { Cabecalho, Indicador } from "@/components/sistema/Painel";
import s from "@/components/sistema/sistema.module.css";
export const metadata = { title: "Cliente" };
export default async function Cliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await clienteServidor();
  const { data: c, error } = await b
    .from("crm_clientes")
    .select("id,nome,whatsapp,email")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o cliente.");
  if (!c) notFound();
  const [vinculos, negocios, contratos, parcelas, recebimentos, entregas, lojas, eventos] = await Promise.all(
    [
      lerTodos<{ id: string; cliente_id: string; lead_id: string }>(b, "crm_cliente_negocios"),
      lerTodos<{
        id: string;
        nome: string;
        estagio: string;
        proximo_passo: string | null;
        proxima_acao_em: string | null;
      }>(b, "crm_leads", "id,nome,estagio,proximo_passo,proxima_acao_em"),
      lerTodos<Contrato>(b, "crm_contratos"),
      lerTodos<Parcela>(b, "crm_parcelas"),
      lerTodos<Recebimento>(b, "crm_recebimentos"),
      projetos(),
      lerTodos<{ id: string; nome: string; lead_id: string; liberado_ate: string | null; ativa: boolean }>(
        b,
        "perf_lojas",
        "id,nome,lead_id,liberado_ate,ativa",
      ),
      lerTodos<{
        id: string;
        lead_id: string;
        etapa: string;
        anterior: string | null;
        ocorrido_em: string;
        inicial: boolean;
      }>(b, "crm_eventos_etapa"),
    ],
  );
  const ids = new Set(vinculos.filter((v) => v.cliente_id === id).map((v) => v.lead_id));
  const ns = negocios.filter((n) => ids.has(n.id));
  const cs = contratos.filter((c) => ids.has(c.lead_id));
  const rs = recebimentos.filter((r) => r.lead_id && ids.has(r.lead_id));
  const ps = parcelas
    .filter((p) => ids.has(p.lead_id))
    .map((p) => ({
      ...p,
      recebido: rs.filter((r) => r.parcela_id === p.id).reduce((s, r) => s + valorRetido(r), 0),
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
  return (
    <div className={s.tela}>
      <Cabecalho
        titulo={c.nome}
        descricao={
          [c.whatsapp, c.email].filter(Boolean).join(" · ") || "Histórico e próximos passos do cliente."
        }
      >
        <Link href="/crm/clientes" className={s.botao}>
          ← Clientes
        </Link>
      </Cabecalho>
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
          valor={String(es.filter((e) => !e.entregue_em).length)}
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
                      {c.tipo === "recorrencia" ? dinheiroExato(Number(c.valor_ciclo)) + "/mês" : "Projeto"}
                    </td>
                    <td className={s.numero}>{dinheiroExato(q.pago)}</td>
                    <td className={s.numero}>
                      {c.status === "ativo" ? dinheiroExato(q.saldo) : "Cancelado"}
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
                <small>{e.entregue_em ? "Entregue em " + e.entregue_em : "Em execução"}</small>
              </div>
              <Link
                className={s.botao}
                href={"/crm/projetos/" + e.lead_id + (e.contrato_id ? "?contrato=" + e.contrato_id : "")}
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
                    {l.ativa ? "Performance ativo" : "Performance inativo"} ·{" "}
                    {l.liberado_ate ? "Acesso até " + l.liberado_ate : "Vigência na ficha"}
                  </small>
                </div>
                <Link className={s.botao} href={"/crm/performance/" + l.id}>
                  Performance
                </Link>
              </li>
            ))}
        </ul>
      </section>
      <section className={s.painel}>
        <h2>Histórico comercial</h2>
        <p className={s.descricao}>
          A base anterior registra a posição inicial; mudanças seguintes têm data própria.
        </p>
        <ul className={s.fila}>
          {eventos
            .filter((e) => ids.has(e.lead_id))
            .sort((a, b) => b.ocorrido_em.localeCompare(a.ocorrido_em))
            .slice(0, 50)
            .map((e) => (
              <li key={e.id}>
                <div>
                  <b>{e.inicial ? "Base anterior" : e.anterior ? e.anterior + " → " + e.etapa : e.etapa}</b>
                  <small>
                    {new Date(e.ocorrido_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </small>
                </div>
                <Link href={"/crm/lead/" + e.lead_id}>Negócio</Link>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
