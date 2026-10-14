"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  apagarCusto,
  criarCusto,
  salvarCusto,
  registrarDespesa,
  informarLiquido,
  registrarDevolucao,
  type Feito,
} from "@/app/(pt)/crm/acoes-financeiro";
import {
  CATEGORIAS,
  FREQUENCIAS,
  custoNoMes,
  nomeDoMes,
  porMes,
  reais,
  type Categoria,
  type Custo,
  type Recebimento,
} from "@/lib/financeiro/tipos";
import { apurarMes, INDICADORES, type Despesa, type Devolucao, type Venda } from "@/lib/sistema/indicadores";
import { proximoMes } from "@/lib/sistema/calendario";
import { Cabecalho, Indicador, Aviso, SerieMensal } from "@/components/sistema/Painel";
import { Virada } from "./Virada";
import s from "@/components/sistema/sistema.module.css";
import f from "@/app/(pt)/crm/financeiro.module.css";
type Rodar = (acao: () => Promise<Feito>, depois?: (r: Feito) => void) => void;
type Props = {
  mes: string;
  hoje: string;
  custos: Custo[];
  recebimentos: Recebimento[];
  dolar: { valor: number; quando: string } | null;
  vendas: Venda[];
  escolha: { ticket: number | null; margem: number | null };
  despesas?: Despesa[];
  devolucoes?: Devolucao[];
  movimentosDisponiveis?: boolean;
  aba?: string;
  previsao?: { mes: string; total: number; vencido: number }[];
  vencido?: number;
};
const ORDEM: Categoria[] = ["trafego", "ferramenta", "pessoal", "imposto", "outro"];
const ABAS = [
  ["visao", "Visão geral"],
  ["extrato", "Recebimentos"],
  ["contratos", "Contratações"],
  ["despesas", "Despesas pagas"],
  ["custos", "Custos previstos"],
  ["previsao", "Previsão"],
];

export function Financeiro({
  mes,
  hoje,
  custos,
  recebimentos,
  dolar,
  vendas,
  escolha,
  despesas = [],
  devolucoes = [],
  movimentosDisponiveis = false,
  aba = "visao",
  previsao = [],
  vencido = 0,
}: Props) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const ativa = ABAS.some(([id]) => id === aba) ? aba : "visao";
  const cotacao = dolar?.valor ?? null;
  function rodar(acao: () => Promise<Feito>, depois?: (r: Feito) => void) {
    comecar(async () => {
      try {
        const r = await acao();
        setAviso(r.ok ? null : r.erro);
        depois?.(r);
        if (r.ok) router.refresh();
      } catch {
        setAviso("Não consegui concluir a operação. Tente novamente.");
      }
    });
  }
  const r = apurarMes(mes, recebimentos, despesas, devolucoes, vendas);
  const saldo = movimentosDisponiveis ? r.saldo : null;
  const meses = Array.from({ length: 12 }, (_, i) => proximoMes(mes, i - 11));
  const historico = meses.map((m) => apurarMes(m, recebimentos, despesas, devolucoes, vendas));
  const fixos = custos.filter(
    (c) => c.frequencia !== "unico" && c.inicio.slice(0, 7) <= hoje && (!c.fim || c.fim.slice(0, 7) >= hoje),
  );
  const custoFixo = fixos.reduce((v, c) => v + (porMes(c, cotacao) ?? 0), 0);
  const semCambio = fixos.some((c) => porMes(c, cotacao) === null);
  const valor = (v: number | null) => (v === null ? "A apurar" : reais(v, true));
  return (
    <div className={s.tela + " " + f.tela} aria-busy={pendente}>
      <Cabecalho
        titulo="Financeiro"
        descricao="Movimentos realizados, compromissos previstos e o resultado da operação."
      >
        <nav className={s.acoes} aria-label="Mês financeiro">
          <Link className={s.botao} href={"/crm/financeiro?mes=" + proximoMes(mes, -1) + "&aba=" + ativa}>
            ←
          </Link>
          <b>
            {nomeDoMes(mes)} / {mes.slice(0, 4)}
          </b>
          {mes < hoje ? (
            <Link className={s.botao} href={"/crm/financeiro?mes=" + proximoMes(mes) + "&aba=" + ativa}>
              →
            </Link>
          ) : null}
        </nav>
      </Cabecalho>
      <nav className={s.abas} aria-label="Áreas do Financeiro">
        {ABAS.map(([id, nome]) => (
          <Link
            key={id}
            aria-current={ativa === id ? "page" : undefined}
            href={"/crm/financeiro?mes=" + mes + "&aba=" + id}
          >
            {nome}
          </Link>
        ))}
        <Link href="/crm/caixa">Contas a receber ↗</Link>
      </nav>
      {aviso ? <Aviso erro>{aviso}</Aviso> : null}
      {!movimentosDisponiveis ? (
        <Aviso>
          O registro de despesas pagas e devoluções aguarda a instalação do módulo integrado. Os custos
          cadastrados continuam sendo previsões; o saldo realizado fica a apurar.
        </Aviso>
      ) : null}
      {r.taxasPendentes && (ativa === "visao" || ativa === "extrato") ? (
        <Aviso>
          {r.taxasPendentes} recebimento(s) deste mês sem valor líquido informado. Complete em{" "}
          <Link href={"/crm/financeiro?mes=" + mes + "&aba=extrato"}>Recebimentos</Link> para apurar taxas e
          saldo.
        </Aviso>
      ) : null}
      {ativa === "visao" ? (
        <>
          <div className={s.kpis}>
            <Indicador
              nome="Recebido bruto"
              valor={valor(r.bruto)}
              nota="Entradas neste mês"
              href={"/crm/financeiro?mes=" + mes + "&aba=extrato"}
            />
            <Indicador
              nome="Recebido líquido"
              valor={valor(r.liquido)}
              nota={r.taxasPendentes ? "Taxas ainda não confirmadas" : "Após taxas confirmadas"}
              href={"/crm/financeiro?mes=" + mes + "&aba=extrato"}
            />
            <Indicador
              nome="Despesas pagas"
              valor={movimentosDisponiveis ? valor(r.despesas) : "A apurar"}
              nota="Saídas registradas neste mês"
              href={"/crm/financeiro?mes=" + mes + "&aba=despesas"}
            />
            <Indicador
              nome="Saldo operacional"
              valor={valor(saldo)}
              nota="Líquido − devoluções − despesas"
              href={"/crm/financeiro?mes=" + mes + "&aba=extrato"}
            />
          </div>
          <div className={s.grade}>
            <section className={s.painel}>
              <h2>Entradas e saídas por mês</h2>
              <SerieMensal
                dados={historico.map((h) => ({
                  mes: h.mes,
                  valores: [h.bruto, movimentosDisponiveis ? h.despesas + h.devolvido : null],
                }))}
                series={["Recebimentos brutos", "Despesas + devoluções"]}
                rotulo="Recebimentos antes das taxas, nos últimos 12 meses. No celular, seis meses recentes; a tabela contém todos os valores."
                href={(m) => "/crm/financeiro?mes=" + m + "&aba=extrato"}
              />
            </section>
            <section className={s.painel}>
              <h2>Composição do mês</h2>
              <table className={s.tabela}>
                <tbody>
                  {[
                    ["Recebido bruto", r.bruto],
                    ["Taxas confirmadas", r.taxas],
                    ["Devoluções", r.devolvido],
                    ["Despesas pagas", movimentosDisponiveis ? r.despesas : null],
                    ["Saldo operacional", saldo],
                  ].map(([nome, v]) => (
                    <tr key={String(nome)}>
                      <td>{nome}</td>
                      <td className={s.numero}>{valor(v as number | null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={s.meta}>
                Contratado no mês: {valor(r.vendido)}. É compromisso comercial; entra no resultado quando
                recebido.
              </p>
              <details className={s.detalhes}>
                <summary>Como os números são calculados</summary>
                {Object.values(INDICADORES)
                  .filter((i) => i.unidade === "R$")
                  .map((i) => (
                    <p key={i.nome}>
                      <b>{i.nome}:</b> {i.regra}
                    </p>
                  ))}
              </details>
            </section>
          </div>
          {!semCambio ? (
            <details className={s.detalhes}>
              <summary>Simular metas de vendas</summary>
              <p>
                Simulação com ticket integral recebido e custos previstos. Não inclui taxas futuras nem o
                prazo das parcelas; confira o fluxo de recebimentos antes de levar os alvos ao Plano.
              </p>
              <Virada
                ano={Number(mes.slice(0, 4))}
                mes={mes}
                custoMes={custoFixo}
                vendas={vendas}
                escolha={escolha}
                rodar={rodar}
              />
            </details>
          ) : (
            <Aviso>
              A previsão do custo fixo precisa da cotação dos custos em dólar. A meta de vendas não será
              calculada com esses custos zerados.
            </Aviso>
          )}
        </>
      ) : null}
      {ativa === "contratos" ? (
        <section className={s.painel}>
          <h2>Contratações de {nomeDoMes(mes)}</h2>
          <p className={s.descricao}>
            Serviços de projeto pela data de assinatura. Recorrências não entram neste total.
          </p>
          <ul className={s.fila}>
            {vendas
              .filter((v) => v.quando && v.quando.slice(0, 7) === mes)
              .map((v, i) => (
                <li key={v.id ?? i}>
                  <div>
                    <b>{reais(v.valor, true)}</b>
                    <small>{v.quando}</small>
                  </div>
                  {v.lead_id ? (
                    <Link className={s.botao} href={"/crm/lead/" + v.lead_id}>
                      Abrir contrato
                    </Link>
                  ) : null}
                </li>
              ))}
          </ul>
          {!vendas.some((v) => v.quando?.slice(0, 7) === mes) ? (
            <p className={s.vazio}>Nenhuma contratação registrada neste mês.</p>
          ) : null}
        </section>
      ) : null}
      {ativa === "extrato" ? (
        <section className={s.painel} id="extrato">
          <h2>Recebimentos de {nomeDoMes(mes)}</h2>
          <p className={s.descricao}>
            Confira o valor líquido no comprovante. Taxa zero também precisa ser confirmada.
          </p>
          <div className={s.rolagem}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th>Data / cliente</th>
                  <th className={s.numero}>Bruto</th>
                  <th>Líquido confirmado</th>
                  <th>Devolução</th>
                </tr>
              </thead>
              <tbody>
                {r.entradas.map((e, i) => (
                  <tr key={e.id ?? i}>
                    <td>
                      {e.recebido_em.slice(0, 10)}
                      {e.lead_id ? (
                        <>
                          <br />
                          <Link href={"/crm/lead/" + e.lead_id}>Abrir ficha</Link>
                        </>
                      ) : null}
                    </td>
                    <td className={s.numero}>{valor(e.valor)}</td>
                    <td>
                      {e.id ? (
                        <Liquido id={e.id} bruto={e.valor} inicial={e.valor_liquido} rodar={rodar} />
                      ) : (
                        valor(e.valor_liquido)
                      )}
                    </td>
                    <td>
                      {e.id && movimentosDisponiveis ? (
                        <Devolver
                          id={e.id}
                          limite={
                            e.estornado_em
                              ? 0
                              : Math.max(
                                  0,
                                  e.valor -
                                    devolucoes
                                      .filter((d) => d.recebimento_id === e.id)
                                      .reduce((a, d) => a + Number(d.valor), 0) -
                                    (e.estornado_em && !devolucoes.some((d) => d.recebimento_id === e.id)
                                      ? e.valor
                                      : 0),
                                )
                          }
                          rodar={rodar}
                        />
                      ) : e.estornado_em ? (
                        "Devolvido"
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!r.entradas.length ? <p className={s.vazio}>Nenhum recebimento neste mês.</p> : null}
          {r.devolucoes.length ? (
            <>
              <h3>Devoluções realizadas neste mês</h3>
              <ul className={s.fila}>
                {r.devolucoes.map((d) => (
                  <li key={d.id}>
                    <span>{d.devolvido_em}</span>
                    <b>{valor(Number(d.valor))}</b>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
      {ativa === "despesas" ? (
        <section className={s.painel} id="despesas">
          <h2>Despesas pagas</h2>
          <p className={s.descricao}>
            Registre o que saiu, com data e valor em reais. Compromissos futuros ficam em Custos previstos.
          </p>
          {movimentosDisponiveis ? <FormDespesa hoje={hoje} rodar={rodar} /> : null}
          <div className={s.rolagem}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Despesa</th>
                  <th>Categoria</th>
                  <th className={s.numero}>Pago em reais</th>
                </tr>
              </thead>
              <tbody>
                {r.saidas.map((d) => (
                  <tr key={d.id}>
                    <td>{d.pago_em}</td>
                    <td>
                      {d.nome}
                      {d.moeda_original === "USD" ? <small> · US$ {d.valor_original}</small> : null}
                    </td>
                    <td>{CATEGORIAS[d.categoria as Categoria]?.nome ?? d.categoria}</td>
                    <td className={s.numero}>{valor(Number(d.valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {movimentosDisponiveis && !r.saidas.length ? (
            <p className={s.vazio}>Nenhuma despesa paga registrada neste mês.</p>
          ) : null}
        </section>
      ) : null}
      {ativa === "custos" ? (
        <section className={s.painel}>
          <h2>Custos previstos</h2>
          <p className={s.descricao}>
            Compromissos para planejar. Custos semanais e anuais mostram o equivalente mensal, sem representar
            pagamento.
          </p>
          {custos.some((c) => c.moeda === "USD") ? (
            <p className={s.meta}>
              {dolar
                ? "Conversão estimada pela cotação " +
                  dolar.valor.toFixed(2) +
                  " de " +
                  dolar.quando +
                  ". O valor pago em reais fica preservado em Despesas."
                : "Sem cotação: a previsão em dólar está incompleta."}
            </p>
          ) : null}
          <Custos custos={custos} cotacao={cotacao} rodar={rodar} hoje={hoje} />
        </section>
      ) : null}
      {ativa === "previsao" ? (
        <section className={s.painel}>
          <h2>Previsão a partir de hoje</h2>
          <p className={s.descricao}>
            Vencimentos contratuais futuros e custos estimados. Não inclui negociações abertas como receita
            garantida.
          </p>
          {vencido > 0 ? (
            <Aviso>
              Saldo vencido: {valor(vencido)}. É uma possibilidade de recuperação, separada da previsão.{" "}
              <Link href="/crm/caixa">Abrir cobranças</Link>
            </Aviso>
          ) : null}
          <div className={s.rolagem}>
            <table className={s.tabela}>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th className={s.numero}>A receber no prazo</th>
                  <th className={s.numero}>Custos previstos</th>
                  <th className={s.numero}>Diferença prevista</th>
                </tr>
              </thead>
              <tbody>
                {previsao.map((p) => {
                  const vs = custos.map((c) => custoNoMes(c, p.mes, cotacao));
                  const previsto = vs.some((v) => v === null)
                    ? null
                    : vs.reduce<number>((a, v) => a + (v ?? 0), 0);
                  const entrada = Math.max(0, p.total - p.vencido);
                  return (
                    <tr key={p.mes}>
                      <td>
                        <Link href="/crm/caixa">{p.mes}</Link>
                      </td>
                      <td className={s.numero}>{valor(entrada)}</td>
                      <td className={s.numero}>{valor(previsto)}</td>
                      <td className={s.numero}>{valor(previsto === null ? null : entrada - previsto)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={s.meta}>
            Entradas brutas, antes de taxas futuras. Os custos podem incluir equivalentes mensais de
            compromissos anuais.
          </p>
        </section>
      ) : null}
    </div>
  );
}
function Liquido({
  id,
  bruto,
  inicial,
  rodar,
}: {
  id: string;
  bruto: number;
  inicial: number | null;
  rodar: Rodar;
}) {
  const [v, setV] = useState(inicial?.toFixed(2) ?? "");
  return (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        rodar(() => informarLiquido(id, Number(v)));
      }}
    >
      <label>
        Líquido em reais
        <input
          required
          type="number"
          min="0"
          max={bruto}
          step="0.01"
          value={v}
          placeholder="Não informado"
          onChange={(e) => setV(e.target.value)}
        />
      </label>
      <button className={s.botao}>Confirmar</button>
    </form>
  );
}
function Devolver({ id, limite, rodar }: { id: string; limite: number; rodar: Rodar }) {
  const [aberto, setAberto] = useState(false);
  const [request, setRequest] = useState("");
  if (limite <= 0) return <span>Devolvido</span>;
  return aberto ? (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        if (!window.confirm("Registrar a devolução e reabrir o saldo correspondente da parcela?")) return;
        rodar(
          () => registrarDevolucao(id, Number(d.get("valor")), String(d.get("dia")), request),
          (r) => {
            if (r.ok) setAberto(false);
          },
        );
      }}
    >
      <label>
        Valor devolvido
        <input name="valor" required type="number" min="0.01" max={limite} step="0.01" />
      </label>
      <label>
        Data
        <input required name="dia" type="date" />
      </label>
      <button className={s.botao}>Registrar</button>
      <button type="button" className={s.botao} onClick={() => setAberto(false)}>
        Cancelar
      </button>
    </form>
  ) : (
    <button
      type="button"
      className={s.botao}
      onClick={() => {
        setRequest(crypto.randomUUID());
        setAberto(true);
      }}
    >
      Devolver
    </button>
  );
}
function FormDespesa({ hoje, rodar }: { hoje: string; rodar: Rodar }) {
  const [aberto, setAberto] = useState(false);
  const [request, setRequest] = useState("");
  const [moeda, setMoeda] = useState("BRL");
  if (!aberto)
    return (
      <button
        type="button"
        className={s.botao + " " + s.primario}
        onClick={() => {
          setRequest(crypto.randomUUID());
          setAberto(true);
        }}
      >
        Registrar despesa paga
      </button>
    );
  return (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.currentTarget));
        rodar(
          () => registrarDespesa({ ...d, request_id: request }),
          (r) => {
            if (r.ok) setAberto(false);
          },
        );
      }}
    >
      <label>
        Nome
        <input required name="nome" maxLength={120} />
      </label>
      <label>
        Categoria
        <select name="categoria">
          {ORDEM.map((k) => (
            <option key={k} value={k}>
              {CATEGORIAS[k].nome}
            </option>
          ))}
        </select>
      </label>
      <label>
        Pago em reais
        <input required name="valor" type="number" min="0.01" step="0.01" />
      </label>
      <label>
        Data
        <input
          required
          type="date"
          name="pago_em"
          max={new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}
        />
      </label>
      <label>
        Moeda original
        <select name="moeda_original" value={moeda} onChange={(e) => setMoeda(e.target.value)}>
          <option value="BRL">Reais</option>
          <option value="USD">Dólar</option>
        </select>
      </label>
      {moeda === "USD" ? (
        <label>
          Valor original em dólar
          <input name="valor_original" type="number" min="0.01" step="0.01" required />
        </label>
      ) : null}
      <button className={s.botao + " " + s.primario}>Salvar despesa</button>
      <button className={s.botao} type="button" onClick={() => setAberto(false)}>
        Cancelar
      </button>
    </form>
  );
}

function Custos({
  custos,
  cotacao,
  rodar,
  hoje,
}: {
  custos: Custo[];
  cotacao: number | null;
  rodar: Rodar;
  hoje: string;
}) {
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const ativos = custos.filter((c) => !c.fim || c.fim.slice(0, 7) >= hoje);
  const parados = custos.filter((c) => c.fim && c.fim.slice(0, 7) < hoje);
  const totalMes = ativos
    .filter((c) => c.frequencia !== "unico")
    .reduce((a, c) => a + (porMes(c, cotacao) ?? 0), 0);

  return (
    <div className={f.custos}>
      <div className={f.rolagem} role="region" aria-label="Custos do estúdio" tabIndex={0}>
        <table className={f.tabela}>
          <thead>
            <tr>
              <th>O quê</th>
              <th>Tipo</th>
              <th>Quanto</th>
              <th>Por mês</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {ativos.map((c) =>
              editando === c.id ? (
                <tr key={c.id}>
                  <td colSpan={5}>
                    <FormCusto
                      custo={c}
                      hoje={hoje}
                      salvar={(campos) =>
                        rodar(
                          () => salvarCusto(c.id, campos),
                          (r) => r.ok && setEditando(null),
                        )
                      }
                      cancelar={() => setEditando(null)}
                      apagar={() => rodar(() => apagarCusto(c.id))}
                    />
                  </td>
                </tr>
              ) : (
                /* editável direto na linha (30/09: "tem que ser um pouco mais
                 editável"): muda e salva ao sair do campo. "Mais" abre o resto
                 (desde, até, estimativa, nota) e o apagar. */
                <tr key={c.id} className={f.linhaViva}>
                  <td>
                    <input
                      className={f.celNome}
                      defaultValue={c.nome}
                      aria-label="Nome do custo"
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value.trim() !== c.nome)
                          rodar(() => salvarCusto(c.id, { nome: e.target.value }));
                      }}
                    />
                    {c.estimado ? <em className={f.estimado}>estimativa</em> : null}
                    {c.nota ? <span className={f.notaCusto}>{c.nota}</span> : null}
                  </td>
                  <td>
                    <select
                      className={f.celSel}
                      value={c.categoria}
                      aria-label="Tipo do custo"
                      onChange={(e) => rodar(() => salvarCusto(c.id, { categoria: e.target.value }))}
                    >
                      {ORDEM.map((k) => (
                        <option key={k} value={k}>
                          {CATEGORIAS[k].nome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={f.celValor}>
                      <select
                        value={c.moeda}
                        aria-label="Moeda"
                        onChange={(e) => rodar(() => salvarCusto(c.id, { moeda: e.target.value }))}
                      >
                        <option value="BRL">R$</option>
                        <option value="USD">US$</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        defaultValue={c.valor}
                        aria-label="Valor"
                        onBlur={(e) => {
                          if (Number(e.target.value) > 0 && Number(e.target.value) !== c.valor)
                            rodar(() => salvarCusto(c.id, { valor: e.target.value }));
                        }}
                      />
                      <select
                        value={c.frequencia}
                        aria-label="Frequência"
                        onChange={(e) => rodar(() => salvarCusto(c.id, { frequencia: e.target.value }))}
                      >
                        {Object.entries(FREQUENCIAS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </span>
                  </td>
                  <td className={f.porMes}>
                    {c.frequencia === "unico"
                      ? "uma vez"
                      : c.moeda === "USD" && !cotacao
                        ? "sem cotação"
                        : reais(porMes(c, cotacao) ?? 0)}
                  </td>
                  <td>
                    <button type="button" className={f.mini} onClick={() => setEditando(c.id)}>
                      Mais
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Previsão mensal conhecida, hoje</td>
              <td className={f.porMes}>
                <b>{reais(totalMes)}</b>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {novo ? (
        <FormCusto
          hoje={hoje}
          salvar={(campos) =>
            rodar(
              () => criarCusto(campos),
              (r) => r.ok && setNovo(false),
            )
          }
          cancelar={() => setNovo(false)}
        />
      ) : (
        <button type="button" className={f.btn} onClick={() => setNovo(true)}>
          Adicionar um custo
        </button>
      )}

      {parados.length ? (
        <p className={f.parados}>
          Custos que já pararam:{" "}
          {parados.map((c) => `${c.nome} (até ${nomeDoMes(c.fim!.slice(0, 7))})`).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}

function FormCusto({
  custo,
  hoje,
  salvar,
  cancelar,
  apagar,
}: {
  custo?: Custo;
  hoje: string;
  salvar: (campos: Record<string, unknown>) => void;
  cancelar: () => void;
  apagar?: () => void;
}) {
  return (
    <form
      className={f.form}
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        salvar({
          nome: d.get("nome"),
          categoria: d.get("categoria"),
          valor: d.get("valor"),
          moeda: d.get("moeda"),
          frequencia: d.get("frequencia"),
          inicio: d.get("inicio"),
          fim: d.get("fim") ?? "",
          estimado: d.get("estimado") === "on",
          nota: d.get("nota"),
        });
      }}
    >
      <label className={f.largo}>
        O quê
        <input
          name="nome"
          defaultValue={custo?.nome}
          placeholder="Ex.: Claude, Meta Ads, contador"
          maxLength={80}
          required
        />
      </label>
      <label>
        Tipo
        <select name="categoria" defaultValue={custo?.categoria ?? "ferramenta"}>
          {ORDEM.map((k) => (
            <option key={k} value={k}>
              {CATEGORIAS[k].nome}
            </option>
          ))}
        </select>
      </label>
      <label>
        Valor
        <input name="valor" type="number" min={0} step="any" defaultValue={custo?.valor} required />
      </label>
      <label>
        Moeda
        <select name="moeda" defaultValue={custo?.moeda ?? "BRL"}>
          <option value="BRL">reais</option>
          <option value="USD">dólar</option>
        </select>
      </label>
      <label>
        Frequência
        <select name="frequencia" defaultValue={custo?.frequencia ?? "mensal"}>
          {Object.entries(FREQUENCIAS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Desde
        <input name="inicio" type="month" defaultValue={custo?.inicio.slice(0, 7) ?? hoje} required />
      </label>
      <label>
        Até (se parou)
        <input name="fim" type="month" defaultValue={custo?.fim?.slice(0, 7) ?? ""} />
      </label>
      <label className={f.check}>
        <input name="estimado" type="checkbox" defaultChecked={custo?.estimado} /> é uma estimativa
      </label>
      <label className={f.largo}>
        Nota
        <input
          name="nota"
          defaultValue={custo?.nota ?? ""}
          placeholder="Opcional: de onde veio o número"
          maxLength={200}
        />
      </label>
      <div className={f.formPe}>
        <button type="submit" className={f.btn}>
          {custo ? "Salvar" : "Adicionar"}
        </button>
        <button type="button" className={f.mini} onClick={cancelar}>
          Cancelar
        </button>
        {apagar ? (
          <button type="button" className={f.mini} onClick={apagar}>
            Apagar
          </button>
        ) : null}
      </div>
    </form>
  );
}
