/* ============================================================
   PERFORMANCE › CRIATIVOS (19/10/2026)

   Os anúncios do ESTÚDIO, não os das lojas. O Rafael: "uma análise de dados
   dos meus anúncios": quanto saiu em cada criativo e o que voltou. A fase 1
   do docs/plano-performance-criativos.md: o que a Meta diz (gasto, hook,
   hold, cliques, página, formulário, checkout), lido pelo
   scripts/ler-meta.ts --gravar. Lead e venda do CRM entram na fase 2.
   ============================================================ */

import type { Metadata } from "next";
import Link from "next/link";
import { clienteServidor } from "@/lib/crm/supabase";
import {
  agruparCriativos,
  avisosDaConta,
  compraDireta,
  CPL_ALVO,
  componentesDo,
  ligarCRM,
  mesAMes,
  porComponente,
  semanaContraAnterior,
  pct,
  PISO_IMPRESSOES,
  type Conta,
  type LinhaAnuncio,
  type LinhaDia,
  type LinhaLead,
  type LinhaPagina,
  type LinhaRecebimento,
} from "@/lib/performance/criativos";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/performance.module.css";
import a from "../analise/analise.module.css";
import c from "./criativos.module.css";

export const metadata: Metadata = { title: "Criativos" };
export const dynamic = "force-dynamic";

const PERIODOS = [7, 30, 90] as const;
const reais = (v: number | null, casas = 2) =>
  v == null ? "–" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas });
const n = (v: number) => v.toLocaleString("pt-BR");
const dataBR = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const GRUPOS = [
  { nivel: "vermelho", titulo: "Cortar", vazio: "Nada para cortar." },
  { nivel: "amarelo", titulo: "Vale olhar", vazio: "Nada caro demais." },
  { nivel: "verde", titulo: "Funcionando", vazio: "Nenhum com resultado ainda." },
] as const;

/* a primeira célula das duas tabelas: o nome e de onde ele é */
function Nome({ g }: { g: ReturnType<typeof agruparCriativos>[number] }) {
  return (
    <th scope="row">
      <b>
        <Link href={`/crm/performance/criativos/${encodeURIComponent(g.chave)}`} className={c.nomeLink}>
          {g.nome}
        </Link>
      </b>
      <span>
        {g.campanhas[0] ?? "sem campanha"}
        {g.anuncios > 1 ? ` · ${g.anuncios} anúncios` : ""}
        {g.ligados ? " · no ar" : ""}
      </span>
    </th>
  );
}

export default async function PaginaCriativos({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias: diasParam } = await searchParams;
  const dias = PERIODOS.find((d) => String(d) === diasParam) ?? 30;
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const desde = new Date(Date.parse(hoje) - (dias - 1) * 864e5).toISOString().slice(0, 10);

  const supabase = await clienteServidor();
  const [contaR, anunciosR] = await Promise.all([
    supabase.from("ads_conta").select("nome, status, motivo, gasto_vida, ultimo_gasto_em, lido_em").order("lido_em", { ascending: false }).limit(1),
    supabase.from("ads_anuncios").select("ad_id, nome, status, conjunto, campanha, utm_content, destino"),
  ]);
  const semTabela = Boolean(contaR.error && /ads_conta|does not exist|schema cache/i.test(contaR.error.message));

  /* O PostgREST devolve no máximo 1.000 linhas por vez. Lê a história inteira
     (o mês a mês precisa dela) e o período sai filtrado em memória. */
  async function tudo<T>(tabela: string, colunas: string, ordem: string, naoNulo?: string): Promise<T[]> {
    const linhas: T[] = [];
    for (let de = 0; ; de += 1000) {
      let q = supabase.from(tabela).select(colunas);
      if (naoNulo) q = q.not(naoNulo, "is", null);
      const { data, error } = await q.order(ordem).range(de, de + 999);
      if (error || !data?.length) break;
      linhas.push(...(data as T[]));
      if (data.length < 1000) break;
    }
    return linhas;
  }
  const [todosDias, paginas, leads, recebimentos] = semTabela
    ? [[], [], [], []]
    : await Promise.all([
        tudo<LinhaDia>("ads_meta_dia", "ad_id, dia, gasto, impressoes, plays_3s, thruplay, cliques_link, lpv, formularios, checkouts, compras", "dia"),
        tudo<LinhaPagina>("ads_pagina_dia", "utm_content, pagina, dia, visitantes, interagiram, comecaram, enviaram", "dia"),
        tudo<LinhaLead>("crm_leads", "id, anuncio, estagio, created_at", "created_at", "anuncio"),
        // a utm da compra direta volta no metadata do Mercado Pago (o rastro do checkout, 19/10)
        tudo<LinhaRecebimento>("crm_recebimentos", "lead_id, valor, valor_estornado, estornado_em, recebido_em, utm:bruto->metadata->>utm_content", "recebido_em"),
      ]);
  const linhasDia = todosDias.filter((d) => d.dia >= desde);
  const temPagina = paginas.length > 0;

  const conta = (contaR.data?.[0] ?? null) as Conta | null;
  const anuncios = (anunciosR.data ?? []) as LinhaAnuncio[];
  const criativos = ligarCRM(agruparCriativos(anuncios, linhasDia), anuncios, paginas, leads, recebimentos, desde, hoje);
  const avisos = avisosDaConta(conta, anuncios, hoje);
  // gastou e a Meta registrou gente na página, mas o Mixpanel não viu ninguém: link ou utm quebrada
  if (temPagina)
    for (const g of criativos.filter((x) => x.ligados && x.lpv >= 20 && !x.visitantes))
      avisos.push({ nivel: "amarelo", texto: `${g.nome}: a Meta registrou ${g.lpv} visitas na página, e o Mixpanel não viu nenhuma com essa utm. Confira o link do anúncio.` });
  const meses = mesAMes(anuncios, todosDias, leads, recebimentos);
  const semana = semanaContraAnterior(todosDias, leads, anuncios, hoje);
  // os lotes do período: os do L08 em diante (com loja) e os formatos de antes
  const lotes = [...new Set(criativos.filter((g) => g.gasto > 0).map((g) => componentesDo(g.nome)?.lote ?? (componentesDo(g.nome) ? "" : null)))].filter(
    (x): x is string => x !== null,
  );

  const t = criativos.reduce(
    (x, g) => ({
      gasto: x.gasto + g.gasto,
      form: x.form + g.formularios,
      check: x.check + g.checkouts,
      compras: x.compras + g.compras,
      lpv: x.lpv + g.lpv,
      leads: x.leads + g.leads,
      clientes: x.clientes + g.clientes,
      receita: x.receita + g.receita,
    }),
    { gasto: 0, form: 0, check: 0, compras: 0, lpv: 0, leads: 0, clientes: 0, receita: 0 },
  );
  const comGasto = criativos.filter((g) => g.gasto > 0);
  // só o que passou do piso entra nas tabelas; o resto vai para "Ainda cedo"
  const julgaveis = comGasto.filter((g) => g.impressoes >= PISO_IMPRESSOES);
  const cedo = comGasto.filter((g) => g.impressoes < PISO_IMPRESSOES);
  // o que mais rendeu: o maior retorno em dinheiro; sem venda nenhuma, o formulário mais barato
  const melhor =
    julgaveis.filter((g) => g.receita > 0).sort((x, y) => (y.retorno ?? 0) - (x.retorno ?? 0))[0] ??
    julgaveis.filter((g) => g.cpl != null).sort((x, y) => (x.cpl ?? 0) - (y.cpl ?? 0))[0] ??
    null;
  const maiorHook = Math.max(0.0001, ...julgaveis.map((g) => g.hook ?? 0));

  return (
    <div className={p.tela}>
      <header className={p.cabeca}>
        <div>
          <p className={a.trilha}>
            <Link href="/crm/performance">Performance</Link> / Criativos
          </p>
          <h1>
            Criativos<i className={s.ponto}>.</i>
          </h1>
          <p className={p.placar}>Os anúncios do estúdio, pelo que a Meta diz. Não aparece para as lojas.</p>
        </div>
        <nav className={c.periodos} aria-label="Período">
          {PERIODOS.map((d) => (
            <Link key={d} href={`/crm/performance/criativos?dias=${d}`} aria-current={d === dias ? "page" : undefined}>
              {d} dias
            </Link>
          ))}
        </nav>
      </header>

      {semTabela ? (
        <p className={p.aviso}>
          As tabelas dos criativos ainda não existem. Rode o <code>supabase/ads-criativos.sql</code> no SQL Editor do Supabase do estúdio e depois a
          leitura abaixo.
        </p>
      ) : null}

      {avisos.length ? (
        <ul className={c.avisos}>
          {avisos.map((x, i) => (
            <li key={i} data-nivel={x.nivel}>
              {x.texto}
            </li>
          ))}
        </ul>
      ) : null}

      {/* a frase do período */}
      {comGasto.length ? (
        <p className={c.frase}>
          De {dataBR(desde)} a {dataBR(hoje)} saíram <b>{reais(t.gasto)}</b> em {comGasto.length} {comGasto.length === 1 ? "criativo" : "criativos"}.{" "}
          {t.form ? (
            <>
              Vieram <b>{n(t.form)}</b> {t.form === 1 ? "formulário" : "formulários"}, e cada um custou <b>{reais(t.gasto / t.form)}</b>.
            </>
          ) : (
            <>Nenhum formulário no período.</>
          )}
          {(() => {
            const pagar = comGasto.filter((g) => compraDireta(g.destino)).reduce((x, g) => x + g.checkouts, 0);
            return pagar ? ` ${n(pagar)} ${pagar === 1 ? "pessoa tocou" : "pessoas tocaram"} em pagar na compra direta.` : "";
          })()}
          {t.compras ? ` A Meta atribui ${n(t.compras)} ${t.compras === 1 ? "compra" : "compras"}.` : ""}
        </p>
      ) : !semTabela ? (
        <p className={p.vazio}>{conta ? `Nenhum anúncio gastou nos últimos ${dias} dias.` : "Nenhuma leitura da Meta gravada ainda."}</p>
      ) : null}

      <p className={a.como}>
        Para atualizar, no PC: <code>npx tsx scripts/ler-meta.ts --gravar</code> e <code>npx tsx scripts/ler-pagina.ts --gravar</code> (30 dias;{" "}
        <code>--desde 2026-08-01</code> para mais). Leads e vendas vêm do CRM na hora. Régua da matriz:
        nada se julga antes de {n(PISO_IMPRESSOES)} impressões; o hook corta o pior terço; o custo por formulário alvo é {reais(CPL_ALVO, 0)} até você
        decidir outro.
      </p>

      {comGasto.length ? (
        <>
          {/* 0. a semana contra a anterior (a leitura de segunda-feira) */}
          {semana.esta.gasto || semana.antes.gasto ? (
            <div className={c.semana} aria-label="Esta semana contra a anterior">
              <p className={c.semanaTitulo}>
                Últimos 7 dias ({dataBR(semana.esta.de)} a {dataBR(semana.esta.ate)}) contra os 7 de antes
              </p>
              <ul>
                {(
                  [
                    ["Gasto", reais(semana.esta.gasto, 0), reais(semana.antes.gasto, 0), semana.esta.gasto - semana.antes.gasto, false],
                    ["Formulários", n(semana.esta.formularios), n(semana.antes.formularios), semana.esta.formularios - semana.antes.formularios, true],
                    ["Cada formulário", reais(semana.esta.cpl), reais(semana.antes.cpl), (semana.esta.cpl ?? 0) - (semana.antes.cpl ?? 0), false],
                    ["Leads no CRM", n(semana.esta.leads), n(semana.antes.leads), semana.esta.leads - semana.antes.leads, true],
                  ] as const
                ).map(([rotulo, agora, antes, delta, maisEhMelhor]) => (
                  <li key={rotulo}>
                    <span>{rotulo}</span>
                    <b>{agora}</b>
                    <small data-tendencia={delta === 0 ? "igual" : (delta > 0) === maisEhMelhor ? "bom" : "ruim"}>
                      {delta === 0 ? "=" : delta > 0 ? "▲" : "▼"} antes {antes}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* 1. os números grandes */}
          <div className={c.cartoes}>
            <div>
              <span>Gasto</span>
              <b>{reais(t.gasto, 0)}</b>
              <small>em {comGasto.length} criativos</small>
            </div>
            <div>
              <span>Formulários</span>
              <b>{n(t.form)}</b>
              <small>{t.lpv ? `de ${n(t.lpv)} que chegaram na página` : "no período"}</small>
            </div>
            <div>
              <span>Cada formulário</span>
              <b>{t.form ? reais(t.gasto / t.form) : "–"}</b>
              <small>a régua é {reais(CPL_ALVO, 0)}</small>
            </div>
            <div>
              <span>Viraram cliente</span>
              <b>{n(t.clientes)}</b>
              <small>de {n(t.leads)} leads que chegaram no CRM</small>
            </div>
            <div>
              <span>Cada cliente custou</span>
              <b>{t.clientes ? reais(t.gasto / t.clientes, 0) : "–"}</b>
              <small>{t.receita ? `e entraram ${reais(t.receita, 0)}` : "nenhum pagamento ainda"}</small>
            </div>
            <div>
              <span>Cada R$ 1 em anúncio</span>
              <b>{t.gasto ? reais(t.receita / t.gasto) : "–"}</b>
              <small>voltou em dinheiro recebido</small>
            </div>
            <div>
              <span>O que mais rendeu</span>
              <b className={c.cartaoNome}>{melhor ? melhor.nome : "–"}</b>
              <small>
                {melhor
                  ? melhor.clientes
                    ? `${n(melhor.clientes)} clientes, ${reais(melhor.receita, 0)} recebidos`
                    : `${reais(melhor.cpl)} por formulário`
                  : `nenhum com resultado e ${n(PISO_IMPRESSOES)} impressões`}
              </small>
            </div>
          </div>

          {/* 2. o que fazer, em três colunas */}
          <section className={a.secao} aria-labelledby="criativos-fazer">
            <h2 id="criativos-fazer">O que fazer</h2>
            <div className={c.colunas}>
              {GRUPOS.map(({ nivel, titulo, vazio }) => {
                const lista = julgaveis.filter((g) => g.conselho.nivel === nivel);
                return (
                  <div key={nivel} className={c.coluna} data-nivel={nivel}>
                    <h3>
                      {titulo} <span>{lista.length}</span>
                    </h3>
                    {lista.length ? (
                      <ul>
                        {lista.map((g) => (
                          <li key={g.chave}>
                            <b><Link href={`/crm/performance/criativos/${encodeURIComponent(g.chave)}`} className={c.nomeLink}>{g.nome}</Link></b>
                            <span>{g.conselho.texto}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>{vazio}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3a. o vídeo segurou? */}
          <section className={a.secao} aria-labelledby="criativos-atencao">
            <h2 id="criativos-atencao">Prendeu a atenção?</h2>
            <p className={c.legenda}>De cada 100 pessoas que viram o anúncio, quantas pararam 3 segundos, quantas assistiram e quantas clicaram.</p>
            <div className={c.rolagem} tabIndex={0} aria-label="Tabela da atenção">
              <table className={c.tabela}>
                <thead>
                  <tr>
                    <th scope="col">Criativo</th>
                    <th scope="col">Gasto</th>
                    <th scope="col">Viram</th>
                    <th scope="col" title="plays de 3 segundos ÷ impressões">Pararam</th>
                    <th scope="col" title="ThruPlay ÷ impressões">Assistiram</th>
                    <th scope="col" title="cliques no link ÷ impressões">Clicaram</th>
                  </tr>
                </thead>
                <tbody>
                  {julgaveis.map((g) => (
                    <tr key={g.chave}>
                      <Nome g={g} />
                      <td>{reais(g.gasto)}</td>
                      <td>{n(g.impressoes)}</td>
                      <td className={c.comBarra}>
                        {g.hook != null ? <i style={{ width: `${Math.round((g.hook / maiorHook) * 100)}%` }} aria-hidden="true" /> : null}
                        <span>{g.hook != null ? pct(g.hook) : "imagem"}</span>
                      </td>
                      <td>{pct(g.hold)}</td>
                      <td>{pct(g.ctr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3b. a página converteu? */}
          <section className={a.secao} aria-labelledby="criativos-resultado">
            <h2 id="criativos-resultado">Trouxe resultado?</h2>
            <p className={c.legenda}>Quem chegou na página e quem preencheu. "Começaram" é quem tocou no formulário (ou em pagar, na compra direta).</p>
            <div className={c.rolagem} tabIndex={0} aria-label="Tabela do resultado">
              <table className={c.tabela}>
                <thead>
                  <tr>
                    <th scope="col">Criativo</th>
                    <th scope="col" title="visualizações da página pela Meta">Na página</th>
                    <th scope="col" title="visitantes reais pelo Mixpanel (sem teste, robô e Maringá)">Pessoas</th>
                    <th scope="col">Cada visita</th>
                    <th scope="col">Começaram</th>
                    <th scope="col">Formulários</th>
                    <th scope="col">Cada formulário</th>
                  </tr>
                </thead>
                <tbody>
                  {[...julgaveis]
                    .sort((x, y) => (x.cpl ?? Infinity) - (y.cpl ?? Infinity) || y.gasto - x.gasto)
                    .map((g) => (
                      <tr key={g.chave}>
                        <Nome g={g} />
                        <td>{n(g.lpv)}</td>
                        <td>{temPagina ? n(g.visitantes) : "–"}</td>
                        <td>{reais(g.custoLpv)}</td>
                        <td>{n(g.checkouts)}</td>
                        <td>{n(g.formularios)}</td>
                        <td className={c.forte} data-nivel={g.cpl == null ? "cinza" : g.cpl > 2 * CPL_ALVO ? "amarelo" : "verde"}>
                          {reais(g.cpl)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3c. virou dinheiro? */}
          <section className={a.secao} aria-labelledby="criativos-clientes">
            <h2 id="criativos-clientes">Virou cliente?</h2>
            <p className={c.legenda}>
              Os leads que chegaram no período e tudo o que eles já pagaram, mesmo depois. O saldo da entrega entra quando for pago.
            </p>
            <div className={c.rolagem} tabIndex={0} aria-label="Tabela dos clientes">
              <table className={c.tabela}>
                <thead>
                  <tr>
                    <th scope="col">Criativo</th>
                    <th scope="col">Gasto</th>
                    <th scope="col">Leads no CRM</th>
                    <th scope="col">Clientes</th>
                    <th scope="col">Entrou</th>
                    <th scope="col">Cada cliente</th>
                    <th scope="col" title="dinheiro recebido ÷ gasto">Cada R$ 1</th>
                  </tr>
                </thead>
                <tbody>
                  {[...julgaveis]
                    .sort((x, y) => y.receita - x.receita || y.leads - x.leads || y.gasto - x.gasto)
                    .map((g) => (
                      <tr key={g.chave}>
                        <Nome g={g} />
                        <td>{reais(g.gasto)}</td>
                        <td>{n(g.leads)}</td>
                        <td>{n(g.clientes)}</td>
                        <td>{g.receita ? reais(g.receita, 0) : "–"}</td>
                        <td>{g.cac != null ? reais(g.cac, 0) : "–"}</td>
                        <td className={c.forte} data-nivel={g.retorno == null || !g.receita ? "cinza" : g.retorno >= 1 ? "verde" : "amarelo"}>
                          {g.receita ? reais(g.retorno) : "–"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3d. mês a mês, o retrato para o Financeiro */}
          {meses.length ? (
            <section className={a.secao} aria-labelledby="criativos-meses">
              <h2 id="criativos-meses">Mês a mês</h2>
              <p className={c.legenda}>O gasto real da Meta, sem estimativa, contra o dinheiro que os leads de cada mês trouxeram.</p>
              <div className={c.rolagem} tabIndex={0} aria-label="Tabela mês a mês">
                <table className={c.tabela}>
                  <thead>
                    <tr>
                      <th scope="col">Mês</th>
                      <th scope="col">Gasto</th>
                      <th scope="col">Formulários</th>
                      <th scope="col">Leads</th>
                      <th scope="col">Clientes</th>
                      <th scope="col">Entrou</th>
                      <th scope="col">Cada R$ 1</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meses.map((m) => (
                      <tr key={m.mes}>
                        <th scope="row">
                          <b>{new Date(`${m.mes}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</b>
                        </th>
                        <td>{reais(m.gasto)}</td>
                        <td>{n(m.formularios)}</td>
                        <td>{n(m.leads)}</td>
                        <td>{n(m.clientes)}</td>
                        <td>{m.receita ? reais(m.receita, 0) : "–"}</td>
                        <td className={c.forte} data-nivel={!m.receita ? "cinza" : m.receita >= m.gasto ? "verde" : "amarelo"}>
                          {m.gasto && m.receita ? reais(m.receita / m.gasto) : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {/* 3e. os lotes: o que o teste quis saber (fase 4) */}
          {lotes.length ? (
            <section className={a.secao} aria-labelledby="criativos-lotes">
              <h2 id="criativos-lotes">Os lotes</h2>
              <p className={c.legenda}>
                A soma por componente do teste. Um lote sozinho é uma pista; a matriz só tira regra de 3 a 4 lotes seguidos.
              </p>
              <div className={c.colunas}>
                {lotes.map((lote) =>
                  (["formato", "loja"] as const).map((campo) => {
                    const linhas = porComponente(criativos, campo, lote || null);
                    if (linhas.length < 2) return null;
                    return (
                      <div key={`${lote}-${campo}`} className={c.loteCaixa}>
                        <h3>
                          {lote || "Antes do L08"} · por {campo === "formato" ? "formato" : "loja"}
                        </h3>
                        <table className={c.tabelaMini}>
                          <thead>
                            <tr>
                              <th scope="col">{campo === "formato" ? "Formato" : "Loja"}</th>
                              <th scope="col">Gasto</th>
                              <th scope="col">Pararam</th>
                              <th scope="col">Resultado</th>
                              <th scope="col">Cada um</th>
                              <th scope="col">Clientes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linhas.map((x) => (
                              <tr key={x.valor}>
                                <th scope="row">
                                  {x.valor} <small>({x.criativos})</small>
                                </th>
                                <td>{reais(x.gasto, 0)}</td>
                                <td>{pct(x.hook)}</td>
                                <td>{n(x.resultado)}</td>
                                <td>{reais(x.custo)}</td>
                                <td>{n(x.clientes)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }),
                )}
              </div>
            </section>
          ) : null}

          {/* 4. os que ainda não dizem nada */}
          {cedo.length ? (
            <details className={c.cedo}>
              <summary>
                Ainda cedo ({cedo.length}): menos de {n(PISO_IMPRESSOES)} impressões, {reais(cedo.reduce((x, g) => x + g.gasto, 0))} no total
              </summary>
              <ul>
                {cedo.map((g) => (
                  <li key={g.chave}>
                    <b>{g.nome}</b> {reais(g.gasto)}, {n(g.impressoes)} impressões{g.formularios ? `, ${n(g.formularios)} formulário${g.formularios > 1 ? "s" : ""}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}

      {comGasto.length ? (
        <section aria-label="De onde vêm os números">
          {conta?.lido_em ? (
            <p className={c.rodape}>
              Lido da Meta em {new Date(conta.lido_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.
              Conta {conta.nome}, {reais(conta.gasto_vida)} gastos desde o começo. Lead e venda do CRM entram aqui na próxima fase.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
