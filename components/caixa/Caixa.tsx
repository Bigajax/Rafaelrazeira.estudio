"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DadosCaixa } from "@/lib/caixa/dados";
import type { ParcelaPainel, Recebimento } from "@/lib/crm/tipos";
import { NOME_METODO, METODOS } from "@/lib/crm/tipos";
import {
  dinheiroExato as dinheiro,
  somar,
  centavos,
} from "@/lib/crm/financeiro";
import { dataCurta, diasEntre } from "@/lib/crm/regras";
import { diaLocal, proximoMes } from "@/lib/sistema/calendario";
import { valorRetido, recebimentoAnulado } from "@/lib/sistema/indicadores";
import {
  alocacoesDoRecebimento,
  metadados,
  semAlocacao,
} from "@/lib/caixa/recebimentos";
import {
  abertas,
  agendaCaixa,
  cobrancasDoCliente,
  filaCobranca,
  agruparParcelas,
  filtrarHistorico,
  resumoCaixa,
  saldoParcela,
} from "@/lib/caixa/operacao";
import { Cabecalho, Indicador, Aviso } from "@/components/sistema/Painel";
import {
  Lancamento,
  type DadosLancamento,
} from "@/components/financeiro/Lancamentos";
import { Liquido, Devolver } from "@/components/financeiro/DetalhesMovimentos";
import type { Feito } from "@/app/(pt)/crm/acoes-financeiro";
import { Cobranca } from "./Cobranca";
import { Ajustar } from "./Ajustar";
import { Dialogo } from "./Dialogo";
import s from "@/components/sistema/sistema.module.css";
import o from "@/components/financeiro/operacao.module.css";
import c from "./caixa.module.css";

type Aba = "cobrar" | "conferir" | "agenda" | "historico";
type Modal =
  | { tipo: "recebi"; parcela?: string }
  | { tipo: "cobrar" | "lembrar"; parcelas: ParcelaPainel[] }
  | { tipo: "cliente"; lead: string }
  | { tipo: "corrigir" | "identificar"; recebimento: Recebimento };
export function Caixa({
  dados,
  mes,
  abaInicial,
  filtroInicial = "",
}: {
  dados: DadosCaixa;
  mes: string;
  abaInicial: Aba;
  filtroInicial?: string;
}) {
  const { contas, contatos, processamentos } = dados,
    hoje = contas.hoje,
    router = useRouter();
  const [modal, setModal] = useState<Modal | null>(null),
    [mensagem, setMensagem] = useState(""),
    [erro, setErro] = useState(false),
    [ocupado, iniciar] = useTransition();
  const [busca, setBusca] = useState(""),
    [filtro, setFiltro] = useState(filtroInicial),
    [dias, setDias] = useState(30);
  const [historico, setHistorico] = useState({
    inicio: `${mes}-01`,
    fim: new Date(`${proximoMes(mes)}-01T12:00:00Z`).getTime() - 86400000,
    cliente: "",
    contrato: "",
    metodo: "",
    origem: "",
    conferencia: "",
  });
  const parcelas = useMemo(
    () => contas.clientes.flatMap((c) => c.parcelas),
    [contas.clientes],
  );
  const resumo = resumoCaixa(
    parcelas,
    contas.recebimentos,
    contas.devolucoes,
    mes,
    hoje,
  );
  const clientes = contas.leads.map((l) => ({
    ...l,
    nome: l.nome ?? l.empresa ?? "Cliente",
  }));
  const dadosLancamento: DadosLancamento = {
    hoje,
    clientes,
    parcelas: abertas(parcelas).map((p) => ({
      id: p.id,
      lead_id: p.lead_id,
      lead_nome: p.lead_nome,
      rotulo: p.rotulo,
      vence_em: p.vence_em,
      saldo: saldoParcela(p),
      valor: p.valor,
      recebido: p.recebido,
      contrato_titulo: p.contrato_titulo,
      metodo_previsto: p.metodo_previsto,
      whatsapp: p.lead_whatsapp,
      cobrar_em: p.cobrar_em,
    })),
    recebimentos: contas.recebimentos,
    custos: [],
    ocorrencias: [],
    despesas: [],
  };
  const semVinculo = contas.recebimentos.filter(
    (r) =>
      semAlocacao(r) > 0.005 && !r.mp_external_reference?.startsWith("perf:"),
  );
  const semLiquido = contas.recebimentos.filter(
    (r) => !recebimentoAnulado(r) && r.valor_liquido == null && !r.estornado_em,
  );
  const conferir =
    semVinculo.length +
    semLiquido.length +
    (processamentos ?? 0) +
    contas.desencontros.length;
  const url = (aba: Aba, extra: Record<string, string> = {}) =>
    `/crm/caixa?${new URLSearchParams({ mes, aba, ...extra })}`;
  const salvar = () => {
    setModal(null);
    setErro(false);
    setMensagem("Registro salvo. Os saldos foram atualizados.");
    router.refresh();
  };
  const rodar = (acao: () => Promise<Feito>, depois?: (r: Feito) => void) => {
    if (ocupado) return;
    iniciar(async () => {
      try {
        const r = await acao();
        depois?.(r);
        setErro(!r.ok);
        setMensagem(r.ok ? "Registro salvo. Saldos atualizados." : r.erro);
        if (r.ok) router.refresh();
      } catch {
        setErro(true);
        setMensagem("Não consegui salvar. Tente novamente.");
      }
    });
  };
  const combina = (p: ParcelaPainel) =>
    `${p.lead_nome} ${p.contrato_titulo} ${p.rotulo}`
      .toLocaleLowerCase("pt-BR")
      .includes(busca.toLocaleLowerCase("pt-BR"));
  const vencidas = abertas(parcelas).filter((p) => p.vence_em < hoje);
  const daFila =
    filtro === ""
      ? filaCobranca(parcelas, hoje)
      : agruparParcelas(
          abertas(parcelas).filter((p) =>
            filtro === "hoje"
              ? p.vence_em === hoje
              : filtro === "vencidas"
                ? p.vence_em < hoje
                : filtro === "mes"
                  ? p.vence_em.startsWith(mes)
                  : diasEntre(p.vence_em, hoje) > 0 &&
                    (filtro === "90+"
                      ? diasEntre(p.vence_em, hoje) > 90
                      : filtro === "1-7"
                        ? diasEntre(p.vence_em, hoje) <= 7
                        : filtro === "8-30"
                          ? diasEntre(p.vence_em, hoje) >= 8 &&
                            diasEntre(p.vence_em, hoje) <= 30
                          : diasEntre(p.vence_em, hoje) >= 31 &&
                            diasEntre(p.vence_em, hoje) <= 90),
          ),
        );
  const fila = daFila.filter((g) => g.parcelas.some(combina));
  const movimento = (r: Recebimento) => {
    const anulado = recebimentoAnulado(r);
    const cliente = clientes.find((l) => l.id === r.lead_id),
      alocacoes = alocacoesDoRecebimento(r),
      historico = metadados(r.bruto).caixa_historico;
    return (
      <article key={r.id} className={o.movimento} data-tipo="entrada">
        <time>{dataCurta(diaLocal(r.recebido_em))}</time>
        <div>
          <b>{cliente?.nome ?? "Cliente não identificado"}</b>
          <small>
            {r.origem === "mercadopago" ? "Mercado Pago" : "Manual"} ·{" "}
            {NOME_METODO[r.metodo] ?? r.metodo}
          </small>
          <small>
            {alocacoes
              .map((a) => {
                const p = contas.todasParcelas.find((p) => p.id === a.parcela_id);
                return `${p?.contrato_titulo ?? "Contrato"} · ${p?.rotulo ?? "Parcela"}: ${dinheiro(a.valor)}`;
              })
              .join("; ") || "Sem parcela vinculada"}
          </small>
          {semAlocacao(r) > 0.005 && (
            <small>Falta distribuir {dinheiro(semAlocacao(r))}</small>
          )}
          <small>
            {anulado ? "Líquido original: " : "Líquido: "}
            {r.valor_liquido == null
              ? "aguarda conferência"
              : dinheiro(r.valor_liquido)}
          </small>
        </div>
        <div className={o.valor}>{anulado ? "Anulado" : dinheiro(r.valor)}</div>
        <details>
          <summary>Conferir e ajustar</summary>
          <div className={c.espaco}>
            {r.notas && <p>{r.notas}</p>}
            <p className={o.nota}>
              {anulado ? (
                `Lançamento original de ${dinheiro(r.valor)} anulado por engano, sem devolução de dinheiro.`
              ) : (
                <>
                  Devolvido:{" "}
                  {dinheiro(centavos(Number(r.valor) - valorRetido(r)))} ·
                  Retido: {dinheiro(valorRetido(r))}
                </>
              )}
            </p>
            <div className={o.acoes}>
              {!anulado && !r.estornado_em && (
                <button
                  type="button"
                  className={s.botao}
                  onClick={() =>
                    setModal({ tipo: "identificar", recebimento: r })
                  }
                >
                  Identificar / distribuir
                </button>
              )}
              {r.origem === "manual" &&
                !anulado &&
                !r.mp_payment_id &&
                !r.estornado_em &&
                !Number(r.valor_estornado) && (
                  <button
                    type="button"
                    className={s.botao}
                    onClick={() =>
                      setModal({ tipo: "corrigir", recebimento: r })
                    }
                  >
                    Corrigir lançamento
                  </button>
                )}
              {r.mp_payment_id && (
                <Link className={s.botao} href="/crm/conciliacao">
                  Conferir origem automática
                </Link>
              )}
            </div>
            {!anulado && (
              <fieldset disabled={ocupado} className={c.semBorda}>
                <Liquido
                  id={r.id}
                  bruto={r.valor}
                  inicial={r.valor_liquido}
                  rodar={rodar}
                />
                <Devolver id={r.id} limite={valorRetido(r)} rodar={rodar} />
              </fieldset>
            )}
            <p className={o.nota}>
              Devolver registra dinheiro que voltou ao cliente e reabre o saldo.
              Corrigir registra um erro de digitação.
            </p>
            {Array.isArray(historico) && (
              <details>
                <summary>Histórico de correções · {historico.length}</summary>
                {historico.map(
                  (h: {
                    request: string;
                    quando: string;
                    motivo: string;
                    antes: Record<string, unknown>;
                    depois: Record<string, unknown>;
                  }) => (
                    <div className={c.registro} key={h.request}>
                      <b>
                        {dataCurta(diaLocal(h.quando))} · {h.motivo}
                      </b>
                      <p className={o.nota}>
                        Bruto anterior: {dinheiro(Number(h.antes.valor))}
                        {metadados(h.depois.pedido).anular
                          ? " · Lançamento anulado, sem devolução"
                          : h.depois.valor !== undefined
                            ? ` → ${dinheiro(Number(h.depois.valor))}`
                            : " · Vínculo atualizado"}
                      </p>
                    </div>
                  ),
                )}
              </details>
            )}
            <details>
              <summary>Identificação do registro</summary>
              <p className={c.codigo}>
                {r.id}
                {r.mp_payment_id ? ` · Pagamento ${r.mp_payment_id}` : ""}
              </p>
            </details>
          </div>
        </details>
      </article>
    );
  };
  const linha = (p: ParcelaPainel) => (
    <div className={c.parcela} key={p.id}>
      <div>
        <b>
          {p.lead_nome} · {p.rotulo}
        </b>
        <small>
          {p.contrato_titulo} · {p.cancelada_em?"Cancelada · Vencimento original":"Vence"} {dataCurta(p.vence_em)}
          {!p.cancelada_em && p.vence_em < hoje
            ? ` · ${diasEntre(p.vence_em, hoje)} dias em atraso`
            : ""}
        </small>
        <small>
          Valor combinado {dinheiro(p.valor)} · Já recebido{" "}
          {dinheiro(p.recebido)}
          {p.cobrar_em ? ` · Lembrete ${dataCurta(p.cobrar_em)}` : ""}
        </small>
      </div>
      <div>
        <b>Falta {dinheiro(saldoParcela(p))}</b>
        {saldoParcela(p) > 0 && !p.cancelada_em && (
          <button
            className={s.botao}
            type="button"
            onClick={() => setModal({ tipo: "recebi", parcela: p.id })}
          >
            Recebi
          </button>
        )}
      </div>
    </div>
  );
  const selecionados = filtrarHistorico(
    contas.recebimentos,
    { ...historico, fim: new Date(historico.fim).toISOString().slice(0, 10) },
    contas.todasParcelas,
  );
  const selecionadosAtivos = selecionados.filter((r) => !recebimentoAnulado(r));
  const porFiltroSemData = filtrarHistorico(
    contas.recebimentos,
    { ...historico, inicio: "0000-01-01", fim: "9999-12-31" },
    contas.todasParcelas,
  );
  const idsPorFiltro = new Set(porFiltroSemData.map((r) => r.id));
  const devolucoesSelecionadas = contas.devolucoes.filter(
    (d) =>
      idsPorFiltro.has(d.recebimento_id) &&
      diaLocal(d.devolvido_em) >= historico.inicio &&
      diaLocal(d.devolvido_em) <=
        new Date(historico.fim).toISOString().slice(0, 10),
  );
  const exportar = () => {
    const cell = (v: unknown) =>
      `"${String(v ?? "")
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""')}"`;
    const devolucoes = devolucoesSelecionadas;
    const linhas = [
      [
        "Tipo",
        "Data",
        "Cliente",
        "Forma",
        "Origem",
        "Bruto",
        "Líquido conhecido",
        "Devolvido",
        "Recebimento",
        "Valor original se anulado",
      ],
      ...selecionados.map((r) => [
        recebimentoAnulado(r) ? "Anulado" : "Recebimento",
        diaLocal(r.recebido_em),
        clientes.find((l) => l.id === r.lead_id)?.nome ?? "Sem identificação",
        NOME_METODO[r.metodo],
        r.origem,
        recebimentoAnulado(r) ? 0 : r.valor,
        recebimentoAnulado(r) ? 0 : r.valor_liquido,
        "",
        r.id,
        recebimentoAnulado(r) ? r.valor : "",
      ]),
      ...devolucoes.map((d) => [
        "Devolução",
        diaLocal(d.devolvido_em),
        "",
        "",
        "",
        "",
        "",
        d.valor,
        d.recebimento_id,
        "",
      ]),
    ];
    const href = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + linhas.map((l) => l.map(cell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = href;
    a.download = `caixa-${mes}.csv`;
    a.click();
    URL.revokeObjectURL(href);
  };
  return (
    <div className={`${s.tela} ${c.tela}`}>
      <Cabecalho
        titulo="Caixa"
        descricao="Receba, cobre e confira os pagamentos. Cobranças e saldos mostram a posição de hoje."
      >
        <Link className={s.botao} href={`/crm/financeiro?mes=${mes}`}>
          Financeiro
        </Link>
        <button
          className={`${s.botao} ${s.primario}`}
          onClick={() => setModal({ tipo: "recebi" })}
        >
          + Recebi
        </button>
      </Cabecalho>
      <form className={s.form} action="/crm/caixa">
        <label>
          Período dos recebimentos
          <input type="month" name="mes" required defaultValue={mes} />
        </label>
        <input type="hidden" name="aba" value={abaInicial} />
        <button className={s.botao}>Consultar período</button>
      </form>
      <div className={s.kpis}>
        <Indicador
          nome="Recebido no período"
          valor={dinheiro(resumo.recebido)}
          nota={`${dinheiro(resumo.bruto)} bruto − ${dinheiro(resumo.devolvido)} devolvido`}
          href={url("historico")}
        />
        <Indicador
          nome="Em atraso hoje"
          valor={dinheiro(resumo.vencido)}
          nota="Vencimento contratual anterior a hoje"
          href={url("cobrar", { filtro: "vencidas" })}
        />
        <Indicador
          nome="Vence hoje"
          valor={dinheiro(resumo.hoje)}
          nota={dataCurta(hoje)}
          href={url("cobrar", { filtro: "hoje" })}
        />
        <Indicador
          nome="Próximos 30 dias"
          valor={dinheiro(resumo.futuro)}
          nota="Saldo a vencer depois de hoje"
          href={url("agenda")}
        />
      </div>
      <p className={o.nota}>
        Líquido confirmado no período: {dinheiro(resumo.liquidoConhecido)} antes
        das devoluções.{" "}
        {resumo.taxasPendentes
          ? `${resumo.taxasPendentes} recebimento(s) aguardam taxas; o líquido total está incompleto.`
          : "Todos os valores líquidos foram informados."}{" "}
        O total recebido não indica quitação das parcelas que vencem neste mês.
      </p>
      <nav className={s.abas} aria-label="Operação do Caixa">
        {(
          [
            ["cobrar", "Cobrar agora"],
            ["conferir", `Para conferir · ${conferir}`],
            ["agenda", "Próximas entradas"],
            ["historico", "Histórico"],
          ] as [Aba, string][]
        ).map(([aba, nome]) => (
          <Link
            key={aba}
            href={url(aba)}
            aria-current={aba === abaInicial ? "page" : undefined}
          >
            {nome}
          </Link>
        ))}
      </nav>
      {mensagem && <Aviso erro={erro}>{mensagem}</Aviso>}
      {abaInicial === "cobrar" && (
        <section className={s.painel}>
          <h2>{filtro ? "Parcelas por vencimento" : "Cobrar agora"}</h2>
          <p className={o.nota}>
            {filtro
              ? "Filtro financeiro: inclui parcelas com lembrete adiado. O vencimento original é preservado."
              : "Uma conversa por cliente. A fila respeita o próximo lembrete; o atraso financeiro usa o vencimento combinado."}
          </p>
          <div className={o.filtros}>
            <label>
              Buscar cliente ou contrato
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </label>
            <label>
              Mostrar
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="">Cobrança devida agora</option>
                <option value="vencidas">Todas as vencidas</option>
                <option value="hoje">Vencem hoje</option>
                <option value="mes">Vencem no período consultado</option>
                {["1-7", "8-30", "31-90", "90+"].map((v) => (
                  <option value={v} key={v}>
                    {v} dias de atraso
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className={o.nota}>
            {fila.length} cliente(s) · Falta receber{" "}
            {dinheiro(somar(fila.map((g) => g.saldo)))}
          </p>
          {fila.length ? (
            fila.map((g) => {
              const ultimo = cobrancasDoCliente(contatos, g.lead_id)[0];
              return (
                <article className={c.cliente} key={g.lead_id}>
                  <div className={c.topo}>
                    <div>
                      <h3>{g.parcelas[0].lead_nome}</h3>
                      <p className={o.nota}>
                        {ultimo
                          ? `Última cobrança: ${dataCurta(diaLocal(ultimo.created_at))} · ${ultimo.canal}`
                          : "Nenhuma cobrança registrada"}
                      </p>
                    </div>
                    <strong>{dinheiro(g.saldo)} a receber</strong>
                  </div>
                  {g.parcelas.map(linha)}
                  <div className={o.acoes}>
                    <button
                      className={s.botao}
                      onClick={() =>
                        setModal({ tipo: "cobrar", parcelas: g.parcelas })
                      }
                    >
                      Cobrar / registrar contato
                    </button>
                    <button
                      className={s.botao}
                      onClick={() =>
                        setModal({ tipo: "lembrar", parcelas: g.parcelas })
                      }
                    >
                      Lembrar depois
                    </button>
                    <button
                      className={s.botao}
                      onClick={() =>
                        setModal({ tipo: "cliente", lead: g.lead_id })
                      }
                    >
                      Ver detalhes financeiros
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <p className={o.vazio}>
              Nenhum cliente nesta seleção. Confira os próximos vencimentos ou
              ajuste os filtros.
            </p>
          )}
        </section>
      )}
      {abaInicial === "conferir" && (
        <section className={s.painel}>
          <h2>Pagamentos para conferir</h2>
          <p className={o.nota}>
            As pendências consideram todo o histórico. O mesmo pagamento pode
            precisar de identificação e de valor líquido.
          </p>
          <details className={o.detalhes} open>
            <summary>Sem cliente ou sem parcela · {semVinculo.length}</summary>
            {semVinculo.length ? (
              semVinculo.map(movimento)
            ) : (
              <p className={o.vazio}>
                Todos os pagamentos estão distribuídos ou identificados como
                mensalidade de Performance.
              </p>
            )}
          </details>
          <details className={o.detalhes}>
            <summary>Líquido a confirmar · {semLiquido.length}</summary>
            {semLiquido.length ? (
              semLiquido.map(movimento)
            ) : (
              <p className={o.vazio}>Nenhuma taxa pendente.</p>
            )}
          </details>
          <details className={o.detalhes}>
            <summary>
              Pagamentos automáticos pendentes ·{" "}
              {processamentos ?? "indisponível"}
            </summary>
            <p className={o.nota}>
              {processamentos == null
                ? "O acompanhamento de tentativas ainda não está disponível."
                : `${processamentos} processamento(s) aguardando conferência.`}
            </p>
            <Link className={s.botao} href="/crm/conciliacao">
              Abrir conferência dos pagamentos automáticos
            </Link>
          </details>
          <details className={o.detalhes}>
            <summary>
              Planos de parcelas incompletos · {contas.desencontros.length}
            </summary>
            {contas.desencontros.map((x) => (
              <div className={c.registro} key={x.contrato.id}>
                <b>
                  {x.lead?.nome} · {x.contrato.titulo}
                </b>
                <p>
                  Faltam parcelas para {dinheiro(x.q.semParcela)} do valor
                  combinado.
                </p>
                <Link
                  className={s.botao}
                  href={`/crm/lead/${x.contrato.lead_id}`}
                >
                  Ajustar plano de pagamento
                </Link>
              </div>
            ))}
            {!contas.desencontros.length && (
              <p className={o.vazio}>Os planos cobrem os valores combinados.</p>
            )}
          </details>
        </section>
      )}
      {abaInicial === "agenda" && (
        <section className={s.painel}>
          <h2>Próximas entradas</h2>
          <p className={o.nota}>
            Previsão por vencimento contratual. O dinheiro só aparece como
            recebido depois da baixa.
          </p>
          <div className={o.filtros}>
            <label>
              Horizonte
              <select
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
              >
                <option value={7}>Próximos 7 dias</option>
                <option value={30}>Próximos 30 dias</option>
              </select>
            </label>
          </div>
          <details className={o.detalhes}>
            <summary>Já vencido · {dinheiro(resumo.vencido)}</summary>
            {vencidas.map(linha)}
            {!vencidas.length && <p>Não há parcelas vencidas.</p>}
          </details>
          {agendaCaixa(parcelas, hoje, dias).map((g) => (
            <details className={o.detalhes} key={g.dia}>
              <summary>
                {dataCurta(g.dia)} · {dinheiro(g.saldo)} · {g.parcelas.length}{" "}
                parcela(s)
              </summary>
              {g.parcelas.map(linha)}
            </details>
          ))}
          {!agendaCaixa(parcelas, hoje, dias).length && (
            <p className={o.vazio}>
              Nenhum vencimento nessa janela. Cadastre o plano de pagamento no
              contrato do cliente para organizar as próximas entradas.
            </p>
          )}
        </section>
      )}
      {abaInicial === "historico" && (
        <section className={s.painel}>
          <h2>Histórico de recebimentos</h2>
          <div className={o.filtros}>
            <label>
              De
              <input
                type="date"
                value={historico.inicio}
                onChange={(e) =>
                  e.target.value &&
                  setHistorico((h) => ({ ...h, inicio: e.target.value }))
                }
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={new Date(historico.fim).toISOString().slice(0, 10)}
                onChange={(e) =>
                  e.target.value &&
                  setHistorico((h) => ({
                    ...h,
                    fim: new Date(`${e.target.value}T12:00:00Z`).getTime(),
                  }))
                }
              />
            </label>
            <label>
              Cliente
              <select
                value={historico.cliente}
                onChange={(e) =>
                  setHistorico((h) => ({
                    ...h,
                    cliente: e.target.value,
                    contrato: "",
                  }))
                }
              >
                <option value="">Todos</option>
                {clientes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contrato
              <select
                value={historico.contrato}
                onChange={(e) =>
                  setHistorico((h) => ({ ...h, contrato: e.target.value }))
                }
              >
                <option value="">Todos</option>
                {contas.contratos
                  .filter(
                    (c) =>
                      !historico.cliente ||
                      c.lead_id === historico.cliente,
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {clientes.find(l=>l.id===c.lead_id)?.nome} · {c.titulo}{c.status==="cancelado"?" (cancelado)":""}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Forma
              <select
                value={historico.metodo}
                onChange={(e) =>
                  setHistorico((h) => ({ ...h, metodo: e.target.value }))
                }
              >
                <option value="">Todas</option>
                {METODOS.map((m) => (
                  <option key={m} value={m}>
                    {NOME_METODO[m]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Origem
              <select
                value={historico.origem}
                onChange={(e) =>
                  setHistorico((h) => ({ ...h, origem: e.target.value }))
                }
              >
                <option value="">Todas</option>
                <option value="manual">Manual</option>
                <option value="mercadopago">Mercado Pago</option>
              </select>
            </label>
            <label>
              Conferência de taxas
              <select
                value={historico.conferencia}
                onChange={(e) =>
                  setHistorico((h) => ({ ...h, conferencia: e.target.value }))
                }
              >
                <option value="">Todas</option>
                <option value="pendente">Líquido pendente</option>
                <option value="confirmado">Líquido confirmado</option>
                <option value="anulado">Lançamentos anulados</option>
              </select>
            </label>
          </div>
          <div className={o.resumo}>
            <div>
              <small>Bruto da seleção</small>
              <strong>
                {dinheiro(somar(selecionadosAtivos.map((r) => r.valor)))}
              </strong>
            </div>
            <div>
              <small>Líquido conhecido (antes de devoluções)</small>
              <strong>
                {dinheiro(
                  somar(selecionadosAtivos.map((r) => r.valor_liquido ?? 0)),
                )}
              </strong>
            </div>
            <button className={s.botao} onClick={exportar}>
              Exportar seleção CSV
            </button>
          </div>
          {selecionados.map(movimento)}
          {!selecionados.length && (
            <p className={o.vazio}>
              Nenhum recebimento para estes filtros. Ajuste o período ou
              registre o pagamento recebido.
            </p>
          )}
          <details className={o.detalhes}>
            <summary>Devoluções que aconteceram no intervalo</summary>
            {devolucoesSelecionadas.map((d) => (
              <p key={d.id}>
                {dataCurta(diaLocal(d.devolvido_em))} · {dinheiro(d.valor)} ·{" "}
                {clientes.find(
                  (l) =>
                    l.id ===
                    contas.recebimentos.find((r) => r.id === d.recebimento_id)
                      ?.lead_id,
                )?.nome ?? "Cliente não identificado"}
              </p>
            ))}
          </details>
        </section>
      )}
      {modal?.tipo === "recebi" && (
        <Lancamento
          tipo="recebi"
          dados={dadosLancamento}
          parcelaInicial={modal.parcela}
          aoFechar={() => setModal(null)}
          aoSalvar={salvar}
        />
      )}
      {(modal?.tipo === "cobrar" || modal?.tipo === "lembrar") && (
        <Cobranca
          parcelas={modal.parcelas}
          hoje={hoje}
          soLembrete={modal.tipo === "lembrar"}
          fechar={() => setModal(null)}
          salvo={salvar}
        />
      )}
      {(modal?.tipo === "corrigir" || modal?.tipo === "identificar") && (
        <Ajustar
          recebimento={modal.recebimento}
          modo={modal.tipo}
          hoje={hoje}
          parcelas={parcelas}
          clientes={clientes}
          fechar={() => setModal(null)}
          salvo={salvar}
        />
      )}
      {modal?.tipo === "cliente" && (
        <Dialogo
          titulo={
            clientes.find((l) => l.id === modal.lead)?.nome ??
            "Detalhe financeiro"
          }
          fechar={() => setModal(null)}
        >
          <div className={c.espaco}>
            {contas.clientes
              .filter((c) => c.contrato.lead_id === modal.lead)
              .map((x) => (
                <section className={o.detalhes} key={x.contrato.id}>
                  <h3>{x.contrato.titulo}</h3>
                  <div className={o.resumo}>
                    <div>
                      <small>Valor combinado</small>
                      <strong>{dinheiro(x.q.total)}</strong>
                    </div>
                    <div>
                      <small>Já recebido (retido nas parcelas)</small>
                      <strong>{dinheiro(x.q.pago)}</strong>
                    </div>
                    <div>
                      <small>Falta receber</small>
                      <strong>{dinheiro(x.q.saldo)}</strong>
                    </div>
                  </div>
                  {x.parcelas.map(linha)}
                </section>
              ))}
            <h3>Recebimentos e devoluções</h3>
            {contas.recebimentos
              .filter((r) => r.lead_id === modal.lead)
              .map(movimento)}
            <h3>Histórico de cobranças</h3>
            {cobrancasDoCliente(contatos, modal.lead).map((i) => (
              <div key={i.id} className={c.registro}>
                <b>
                  {dataCurta(diaLocal(i.created_at))} · {i.canal}
                </b>
                <p className={o.nota}>{i.resumo}</p>
              </div>
            ))}
            {!cobrancasDoCliente(contatos, modal.lead).length && (
              <p className={o.nota}>Nenhuma cobrança registrada.</p>
            )}
            <Link className={s.botao} href={`/crm/lead/${modal.lead}`}>
              Abrir ficha completa
            </Link>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
