"use client";

/* ============================================================
   O FINANCEIRO NA TELA

   Simples, didático e com personalidade, na ordem em que a cabeça pergunta:
   1. a FRASE do mês: entrou tanto, saiu tanto, sobrou (ou faltou) tanto;
      e "de cada R$ 100 que entraram", para onde foi cada parte;
   2. o EXTRATO: o DRE impresso como cupom de caixa, linha a linha, cada
      linha com o que ela quer dizer. É a peça que se lembra;
   3. o MÊS A MÊS: entrou × saiu, lado a lado;
   4. os CUSTOS: a lista que alimenta tudo, editável.
   ============================================================ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { apagarCusto, criarCusto, salvarCusto, type Feito } from "@/app/(pt)/crm/acoes-financeiro";
import {
  CATEGORIAS,
  FREQUENCIAS,
  chaveMes,
  nomeDoMes,
  porMes,
  reais,
  resultadoDoMes,
  type Categoria,
  type Custo,
  type Recebimento,
} from "@/lib/financeiro/tipos";
import { Virada } from "./Virada";
import f from "@/app/(pt)/crm/financeiro.module.css";

type Props = {
  mes: string;
  hoje: string;
  custos: Custo[];
  recebimentos: Recebimento[];
  dolar: { valor: number; quando: string } | null;
  vendas: { valor: number; quando: string | null }[];
  escolha: { ticket: number | null; margem: number | null };
};

const ORDEM: Categoria[] = ["trafego", "ferramenta", "pessoal", "imposto", "outro"];

function vizinho(mes: string, passo: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + passo, 1);
  return chaveMes(d.getFullYear(), d.getMonth() + 1);
}

export function Financeiro({ mes, hoje, custos, recebimentos, dolar, vendas, escolha }: Props) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const cotacao = dolar?.valor ?? null;

  function rodar(acao: () => Promise<Feito>, depois?: (r: Feito) => void) {
    comecar(async () => {
      const r = await acao();
      setAviso(r.ok ? null : r.erro);
      depois?.(r);
      router.refresh();
    });
  }

  const r = resultadoDoMes(mes, recebimentos, custos, cotacao);
  const vendidasMes = vendas.filter((v) => v.quando?.slice(0, 7) === mes);
  const vendidoNoMes = { n: vendidasMes.length, valor: vendidasMes.reduce((s, v) => s + v.valor, 0) };
  const saiu = r.taxas + r.custos;
  const temDolar = custos.some((c) => c.moeda === "USD");
  /* o custo fixo de um mês de hoje: o que a virada tem que pagar */
  const custoFixo = custos
    .filter((c) => c.frequencia !== "unico" && (!c.fim || c.fim.slice(0, 7) >= hoje))
    .reduce((a, c) => a + porMes(c, cotacao), 0);

  /* os meses do histórico: do primeiro dinheiro ou custo até hoje */
  const primeiros = [...recebimentos.map((x) => x.recebido_em.slice(0, 7)), ...custos.map((c) => c.inicio.slice(0, 7))].sort();
  const meses: string[] = [];
  for (let m = primeiros[0] ?? hoje; m <= hoje && meses.length < 24; m = vizinho(m, 1)) meses.push(m);
  const historico = meses.map((m) => resultadoDoMes(m, recebimentos, custos, cotacao));
  const topo = Math.max(1, ...historico.map((h) => Math.max(h.entrou, h.taxas + h.custos)));

  /* de cada R$ 100 que entraram */
  const cem = (v: number) => (r.entrou > 0 ? Math.round((v / r.entrou) * 100) : 0);
  const partes = [
    ...ORDEM.filter((k) => r.porCategoria[k] > 0).map((k) => ({ chave: k, nome: CATEGORIAS[k].nome.toLowerCase(), v: r.porCategoria[k] })),
    ...(r.taxas > 0 ? [{ chave: "taxa", nome: "taxas", v: r.taxas }] : []),
  ];
  const base = Math.max(r.entrou, saiu, 1);

  return (
    <div className={`${f.tela} ${pendente ? f.ocupado : ""}`}>
      <header className={f.cabeca}>
        <div>
          <h1>
            Financeiro<i className={f.ponto}>.</i>
          </h1>
          <p className={f.voz}>Quanto entra, quanto sai, e o que sobra no fim do mês.</p>
        </div>
        <nav className={f.meses} aria-label="Trocar de mês">
          <Link href={`/crm/financeiro?mes=${vizinho(mes, -1)}`}>{nomeDoMes(vizinho(mes, -1))}</Link>
          <b>{nomeDoMes(mes)}</b>
          {mes < hoje ? <Link href={`/crm/financeiro?mes=${vizinho(mes, 1)}`}>{nomeDoMes(vizinho(mes, 1))}</Link> : <span />}
        </nav>
      </header>

      {aviso ? <p className={f.erro}>{aviso}</p> : null}

      <section className={f.topo}>
        {/* ---------- 1. a frase do mês ---------- */}
        <div className={f.frase}>
          <p className={f.fraseGrande}>
            Em {nomeDoMes(mes)} entraram <span className={f.entrou}>{reais(r.entrou)}</span> e saíram{" "}
            <span className={f.saiu}>{reais(saiu)}</span>.
          </p>
          <p className={`${f.veredito} ${r.resultado >= 0 ? f.azul : f.vermelho}`}>
            {r.entrou === 0 && saiu === 0
              ? "Nada entrou nem saiu ainda."
              : r.resultado >= 0
                ? `Sobraram ${reais(r.resultado)}${r.margem !== null ? `, ${Math.round(r.margem * 100)}% do que entrou` : ""}.`
                : `Faltaram ${reais(-r.resultado)}: o mês fechou no vermelho.`}
          </p>
          {mes === hoje ? <p className={f.nota}>O mês ainda está correndo: o que entrar até o dia 30 muda a conta.</p> : null}
          {/* VENDIDO AO LADO DO RECEBIDO (06/10): o ganho do mês, que só
              vira "entrou" quando o dinheiro cai. Fora do cupom de propósito:
              o DRE soma o que caiu, e vendido não é dinheiro na conta. */}
          {vendidoNoMes.n ? (
            <p className={f.nota}>
              Vendido em {nomeDoMes(mes)}: <b>{reais(vendidoNoMes.valor)}</b> em {vendidoNoMes.n}{" "}
              {vendidoNoMes.n === 1 ? "venda" : "vendas"}. Conta acima quando cai no Caixa.
            </p>
          ) : null}

          {r.entrou > 0 && partes.length ? (
            <div className={f.cem}>
              <p className={f.cemTitulo}>De cada R$ 100 que entraram</p>
              <div className={f.barra} role="img" aria-label="Para onde foi o dinheiro do mês">
                {partes.map((x) => (
                  <i key={x.chave} className={f[`c_${x.chave}`]} style={{ width: `${(x.v / base) * 100}%` }} />
                ))}
                {r.resultado > 0 ? <i className={f.c_sobra} style={{ width: `${(r.resultado / base) * 100}%` }} /> : null}
                {/* a linha dos R$ 100: onde acaba o que entrou */}
                <span className={f.linhaCem} style={{ left: `${(r.entrou / base) * 100}%` }} />
              </div>
              <ul className={f.cemLista}>
                {partes.map((x) => (
                  <li key={x.chave}>
                    <i className={f[`c_${x.chave}`]} /> R$ {cem(x.v)} para {x.nome}
                  </li>
                ))}
                {r.resultado > 0 ? (
                  <li>
                    <i className={f.c_sobra} /> R$ {cem(r.resultado)} sobraram
                  </li>
                ) : (
                  <li className={f.falta}>
                    faltaram R$ {cem(-r.resultado)}, que saíram do seu bolso
                  </li>
                )}
              </ul>
            </div>
          ) : null}
        </div>

        {/* ---------- 2. o extrato ---------- */}
        <Extrato mes={mes} r={r} cotacao={cotacao} />
      </section>

      {/* ---------- a conta da virada: quantas vitrines pagam o mês ---------- */}
      <Virada ano={Number(mes.slice(0, 4))} mes={mes} custoMes={custoFixo} vendas={vendas} escolha={escolha} rodar={rodar} />

      {/* ---------- 3. mês a mês ---------- */}
      {historico.length > 1 ? (
        <section className={f.andar}>
          <h2>
            Mês a mês<i className={f.ponto}>.</i>
          </h2>
          <p className={f.voz}>A barra azul é o que entrou; a tinta é o que saiu. Quando a tinta passa do azul, o mês fechou no vermelho.</p>
          <ol className={f.historico}>
            {historico.map((h) => (
              <li key={h.mes} className={h.mes === mes ? f.mesAtual : ""}>
                <Link href={`/crm/financeiro?mes=${h.mes}`} aria-label={`${nomeDoMes(h.mes)}: entrou ${reais(h.entrou)}, saiu ${reais(h.taxas + h.custos)}`}>
                  <span className={f.barras}>
                    <i className={f.bEntrou} style={{ height: `${(h.entrou / topo) * 100}%` }} />
                    <i className={f.bSaiu} style={{ height: `${((h.taxas + h.custos) / topo) * 100}%` }} />
                  </span>
                  <b>{nomeDoMes(h.mes).slice(0, 3)}</b>
                  <em className={h.resultado >= 0 ? f.azul : f.vermelho}>{h.resultado >= 0 ? "+" : "−"}{reais(Math.abs(h.resultado))}</em>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* ---------- 4. os custos ---------- */}
      <section className={f.andar}>
        <h2>
          Os custos<i className={f.ponto}>.</i>
        </h2>
        <p className={f.voz}>
          Tudo o que sai todo mês para o estúdio funcionar. O que é semanal ou anual vira &ldquo;por mês&rdquo; para caber na conta
          {temDolar ? (cotacao ? `, e o dólar é convertido pela cotação de hoje: R$ ${cotacao.toFixed(2).replace(".", ",")}.` : ". Sem a cotação do dólar agora: os custos em dólar ficaram fora da conta.") : "."}
        </p>
        <Custos custos={custos} cotacao={cotacao} rodar={rodar} hoje={hoje} />
      </section>
    </div>
  );
}

type Rodar = (acao: () => Promise<Feito>, depois?: (r: Feito) => void) => void;

/* ============================================================
   O EXTRATO: o DRE impresso como cupom de caixa
   ============================================================ */
function Extrato({ mes, r, cotacao }: { mes: string; r: ReturnType<typeof resultadoDoMes>; cotacao: number | null }) {
  const doCategoria = (k: Categoria) => r.linhas.filter((l) => l.custo.categoria === k);
  return (
    <div className={f.cupom} aria-label={`O resultado de ${nomeDoMes(mes)}`}>
      <p className={f.cupomCab}>
        Rafael Razeira Estúdio
        <br />
        resultado de {nomeDoMes(mes)} de {mes.slice(0, 4)}
      </p>
      <p className={f.cupomDica}>Isto é o DRE, o nome contábil para &ldquo;quanto sobrou&rdquo;.</p>

      <Linha rotulo="Entrou no Caixa" valor={r.entrou} explica="as vendas que caíram na conta no mês" />
      {r.taxas > 0 ? <Linha rotulo="Taxas do Mercado Pago" valor={-r.taxas} explica="o que a maquininha fica de cada Pix e cartão" /> : null}
      <Linha rotulo="Sobrou das vendas" valor={r.sobrouVendas} total />

      {ORDEM.filter((k) => r.porCategoria[k] > 0).map((k) => (
        <div key={k} className={f.bloco}>
          <Linha rotulo={CATEGORIAS[k].nome} valor={-r.porCategoria[k]} explica={CATEGORIAS[k].explica} />
          <ul className={f.miudos}>
            {doCategoria(k).map(({ custo, valor }) => (
              <li key={custo.id}>
                <span>
                  {custo.nome}
                  {custo.moeda === "USD" && cotacao ? ` (US$ ${custo.valor} ${FREQUENCIAS[custo.frequencia]})` : ""}
                  {custo.estimado ? ", estimativa" : ""}
                </span>
                <span>{reais(valor)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className={`${f.final} ${r.resultado >= 0 ? f.azul : f.vermelho}`}>
        <span>O mês fechou em</span>
        <b>
          {r.resultado < 0 ? "−" : ""}
          {reais(Math.abs(r.resultado))}
        </b>
      </div>
      <p className={f.cupomPe}>
        {r.margem === null
          ? "nada entrou neste mês"
          : r.resultado >= 0
            ? `margem de ${Math.round(r.margem * 100)}%: de cada R$ 100, sobraram R$ ${Math.round(r.margem * 100)}`
            : "prejuízo: saiu mais do que entrou"}
      </p>
    </div>
  );
}

function Linha({ rotulo, valor, explica, total }: { rotulo: string; valor: number; explica?: string; total?: boolean }) {
  return (
    <div className={`${f.linha} ${total ? f.linhaTotal : ""}`}>
      <span className={f.linhaRotulo}>{rotulo}</span>
      <span className={f.pontilhado} aria-hidden />
      <span className={f.linhaValor}>
        {valor < 0 ? "− " : ""}
        {reais(Math.abs(valor))}
      </span>
      {explica ? <span className={f.explica}>{explica}</span> : null}
    </div>
  );
}

/* ============================================================
   OS CUSTOS: a lista editável
   ============================================================ */
function Custos({ custos, cotacao, rodar, hoje }: { custos: Custo[]; cotacao: number | null; rodar: Rodar; hoje: string }) {
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const ativos = custos.filter((c) => !c.fim || c.fim.slice(0, 7) >= hoje);
  const parados = custos.filter((c) => c.fim && c.fim.slice(0, 7) < hoje);
  const totalMes = ativos.filter((c) => c.frequencia !== "unico").reduce((a, c) => a + porMes(c, cotacao), 0);

  return (
    <div className={f.custos}>
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
                    salvar={(campos) => rodar(() => salvarCusto(c.id, campos), (r) => r.ok && setEditando(null))}
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
                      if (e.target.value.trim() && e.target.value.trim() !== c.nome) rodar(() => salvarCusto(c.id, { nome: e.target.value }));
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
                    <select value={c.moeda} aria-label="Moeda" onChange={(e) => rodar(() => salvarCusto(c.id, { moeda: e.target.value }))}>
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
                        if (Number(e.target.value) > 0 && Number(e.target.value) !== c.valor) rodar(() => salvarCusto(c.id, { valor: e.target.value }));
                      }}
                    />
                    <select value={c.frequencia} aria-label="Frequência" onChange={(e) => rodar(() => salvarCusto(c.id, { frequencia: e.target.value }))}>
                      {Object.entries(FREQUENCIAS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </span>
                </td>
                <td className={f.porMes}>{c.frequencia === "unico" ? "uma vez" : c.moeda === "USD" && !cotacao ? "sem cotação" : reais(porMes(c, cotacao))}</td>
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
            <td colSpan={3}>Custo fixo por mês, hoje</td>
            <td className={f.porMes}>
              <b>{reais(totalMes)}</b>
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      {novo ? (
        <FormCusto hoje={hoje} salvar={(campos) => rodar(() => criarCusto(campos), (r) => r.ok && setNovo(false))} cancelar={() => setNovo(false)} />
      ) : (
        <button type="button" className={f.btn} onClick={() => setNovo(true)}>
          Adicionar um custo
        </button>
      )}

      {parados.length ? (
        <p className={f.parados}>
          Custos que já pararam: {parados.map((c) => `${c.nome} (até ${nomeDoMes(c.fim!.slice(0, 7))})`).join(", ")}.
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
        <input name="nome" defaultValue={custo?.nome} placeholder="Ex.: Claude, Meta Ads, contador" maxLength={80} required />
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
        <input name="nota" defaultValue={custo?.nota ?? ""} placeholder="Opcional: de onde veio o número" maxLength={200} />
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
