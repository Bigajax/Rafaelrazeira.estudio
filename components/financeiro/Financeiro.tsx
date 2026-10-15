"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Caixa } from "@/lib/crm/dados";
import type { Feito } from "@/app/(pt)/crm/acoes-financeiro";
import { nomeDoMes, porMes, reais, type Custo, type Recebimento } from "@/lib/financeiro/tipos";
import { apurarMes, type Despesa, type Devolucao, type Venda } from "@/lib/sistema/indicadores";
import { proximoMes } from "@/lib/sistema/calendario";
import { dataCurta } from "@/lib/crm/regras";
import { situacaoDaParcela } from "@/lib/crm/financeiro";
import { previstoNoMes, type Ocorrencia } from "@/lib/financeiro/ocorrencias";
import { areaFinanceiro, contasAPagar, liquidoConfirmado, pendenciasFinanceiras, urlFinanceiro, type AreaFinanceiro, type ParcelaOperacional } from "@/lib/financeiro/operacao";
import { Cabecalho, Indicador, Aviso, SerieMensal } from "@/components/sistema/Painel";
import { NavegacaoFinanceiro } from "./Navegacao";
import { Lancamento, type TipoLancamento, type DadosLancamento } from "./Lancamentos";
import { ContasReceber, ContasPagar } from "./Contas";
import { Extrato } from "./Extrato";
import { Custos } from "./Custos";
import { Compromissos } from "./Compromissos";
import { Virada } from "./Virada";
import s from "@/components/sistema/sistema.module.css";
import f from "@/app/(pt)/crm/financeiro.module.css";
import o from "./operacao.module.css";

type Props = {
  mes: string; hoje: string; custos: Custo[]; recebimentos: Recebimento[];
  dolar: { valor: number; quando: string } | null; vendas: Venda[];
  escolha: { ticket: number | null; margem: number | null };
  despesas?: Despesa[]; devolucoes?: Devolucao[]; movimentosDisponiveis?: boolean;
  aba?: string; previsao?: { mes: string; total: number; vencido: number }[]; vencido?: number;
  ocorrencias?: Ocorrencia[]; revisaoDisponivel?: boolean;
  historicoDespesas?: { id: string; despesa_id: string; motivo: string; alterado_em: string; antes?: { valor: number; pago_em: string }; depois?: { valor: number; pago_em: string } }[];
  clientes?: { id: string; nome: string; empresa: string | null }[];
  previsaoSelecionada?: string;
  contas: Caixa; filtro?: string; conferenciasPendentes?: number;
};
export function Financeiro({ mes, hoje, custos, recebimentos, dolar, vendas, escolha, despesas = [], devolucoes = [], movimentosDisponiveis = false, aba = "visao", previsao = [], vencido = 0, ocorrencias = [], revisaoDisponivel = false, historicoDespesas = [], clientes = [], previsaoSelecionada, contas, filtro, conferenciasPendentes = 0 }: Props) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [confirmacao, setConfirmacao] = useState<{ texto: string; href: string; acao: string } | null>(null);
  const [lancamento, setLancamento] = useState<{ tipo: TipoLancamento; parcela?: string; conta?: string } | null>(null);
  const ativa = areaFinanceiro(aba);
  const cotacao = dolar?.valor ?? null;
  const diaHoje = contas.hoje;
  function rodar(acao: () => Promise<Feito>, depois?: (r: Feito) => void) {
    comecar(async () => {
      setAviso(null); setSucesso(false); setConfirmacao(null);
      try {
        const r = await acao();
        setAviso(r.ok ? null : r.erro); setSucesso(r.ok); depois?.(r);
        if (r.ok) router.refresh();
      } catch { setAviso("Não consegui confirmar a operação. Confira o registro antes de tentar novamente."); }
    });
  }
  const abrir = (tipo: TipoLancamento, parcela?: string, conta?: string) => { setSucesso(false); setLancamento({ tipo, parcela, conta }); };
  const parcelas: ParcelaOperacional[] = contas.clientes.flatMap((c) => c.parcelas.filter((p) => !p.cancelada_em).map((p) => ({
    id: p.id, lead_id: p.lead_id, lead_nome: c.lead?.empresa || c.lead?.nome || p.lead_nome,
    rotulo: p.rotulo, vence_em: p.vence_em, saldo: situacaoDaParcela(p, diaHoje).saldo,
    valor: Number(p.valor), recebido: p.recebido, metodo_previsto: p.metodo_previsto,
    whatsapp: p.lead_whatsapp, contrato_titulo: c.contrato.titulo, cobrar_em: p.cobrar_em,
  })));
  const dados: DadosLancamento = { hoje: diaHoje, clientes, parcelas: parcelas.filter((p) => p.saldo > 0), ocorrencias, despesas, custos, recebimentos };
  const aPagar = contasAPagar(ocorrencias, despesas, diaHoje);
  const fila = pendenciasFinanceiras(parcelas, aPagar, diaHoje);
  const r = apurarMes(mes, recebimentos, despesas, devolucoes, vendas);
  const confirmado = liquidoConfirmado(r.entradas);
  const saldo = movimentosDisponiveis ? r.saldo : null;
  const valor = (v: number | null) => v == null ? "A conferir" : reais(v, true);
  const link = (area: AreaFinanceiro, filtros: Record<string, string> = {}) => urlFinanceiro(mes, area, filtros);
  const pendencias = [
    { nome: "Parcelas de clientes vencidas", quantidade: fila.receberVencido.length, nota: "Abrir a lista para cobrar ou registrar o recebimento.", href: link("receber", { filtro: "vencidas" }) },
    { nome: "Parcelas de clientes vencendo hoje", quantidade: fila.receberHoje.length, nota: "Conferir os pagamentos de hoje.", href: link("receber", { filtro: "hoje" }) },
    { nome: "Contas do estúdio vencidas", quantidade: fila.pagarVencido.length, nota: "Conferir o que ainda falta pagar.", href: link("pagar", { filtro: "vencidas" }) },
    { nome: "Contas vencendo nos próximos 7 dias", quantidade: fila.pagarSemana.length, nota: "Organizar os pagamentos da semana, incluindo hoje.", href: link("pagar", { filtro: "semana" }) },
    { nome: "Recebimentos do mês com líquido a conferir", quantidade: r.taxasPendentes, nota: "Confirmar as taxas para concluir o resultado do mês.", href: link("extrato", { filtro: "taxas" }) },
    { nome: "Recebimentos para identificar", quantidade: contas.semDono.length, nota: "Vincular pagamentos já registrados à parcela correta.", href: link("receber") + "#identificar" },
    { nome: "Pagamentos automáticos para conferir", quantidade: conferenciasPendentes, nota: "Conferir os registros do Mercado Pago.", href: "/crm/conciliacao?mes=" + mes },
    { nome: "Contratos com plano incompleto", quantidade: contas.desencontros.length, nota: "Completar as parcelas que faltam no contrato.", href: link("receber") + "#contratos" },
  ].filter((p) => p.quantidade > 0);
  const meses = Array.from({ length: 12 }, (_, i) => proximoMes(mes, i - 11));
  const historico = meses.map((m) => apurarMes(m, recebimentos, despesas, devolucoes, vendas));
  const fixos = custos.filter((c) => c.frequencia !== "unico" && c.inicio.slice(0, 7) <= hoje && (!c.fim || c.fim.slice(0, 7) >= hoje));
  const semCambio = fixos.some((c) => porMes(c, cotacao) === null);
  const custoFixo = fixos.reduce((v, c) => v + (porMes(c, cotacao) ?? 0), 0);
  const semAgenda = custos.filter((c) => (!c.fim || c.fim.slice(0, 7) >= hoje) && !ocorrencias.some((x) => x.custo_id === c.id));
  const mesPrevisto = previsao.find((p) => p.mes === previsaoSelecionada)?.mes ?? previsao.find((p) => p.mes === mes)?.mes ?? previsao[0]?.mes;
  const filtroInicial = filtro ?? (aba === "despesas" ? "saidas" : undefined);
  const urlPrevisao = (m: string) => link("planejamento", { previsao: m }) + "#movimentos-previstos";
  return <div className={s.tela + " " + f.tela} aria-busy={pendente}>
    <fieldset disabled={pendente} className={s.semBorda}>
    <Cabecalho titulo="Financeiro" descricao="O que precisa de atenção, o que entrou e o resultado do mês.">
      <div className={o.acoes}><button type="button" className={s.botao + " " + s.primario} onClick={() => abrir("recebi")}>Recebi</button><button type="button" className={s.botao} onClick={() => abrir("paguei")} disabled={!movimentosDisponiveis}>Paguei</button><button type="button" className={s.botao} onClick={() => abrir("conta")} disabled={!revisaoDisponivel}>Cadastrar conta</button></div>
    </Cabecalho>
    <div className={o.filtros}><label>Mês para análise<input aria-label="Mês financeiro" type="month" value={mes} max={proximoMes(hoje, 12)} onChange={(e) => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) router.push(urlFinanceiro(e.target.value, ativa)); }} /></label>
      <div className={o.acoes}><Link className={s.botao} href={urlFinanceiro(proximoMes(mes, -1), ativa)} aria-label="Mês anterior">←</Link>{mes < proximoMes(hoje, 12) ? <Link className={s.botao} href={urlFinanceiro(proximoMes(mes), ativa)} aria-label="Próximo mês">→</Link> : null}{mes !== hoje ? <Link className={s.botao} href={urlFinanceiro(hoje, ativa)}>Voltar ao mês atual</Link> : null}</div>
    </div>
    <NavegacaoFinanceiro mes={mes} ativa={ativa} />
    {aviso ? <Aviso erro>{aviso}</Aviso> : null}{sucesso ? <p role="status" className={s.aviso}>{confirmacao ? <>{confirmacao.texto} <Link href={confirmacao.href}>{confirmacao.acao}</Link></> : "Alteração salva."}</p> : null}
    {!movimentosDisponiveis ? <Aviso>O registro de despesas pagas e devoluções ainda não está disponível. O resultado permanece a conferir.</Aviso> : null}
    {lancamento ? <Lancamento key={lancamento.tipo + (lancamento.parcela ?? "") + (lancamento.conta ?? "")} tipo={lancamento.tipo} dados={dados} parcelaInicial={lancamento.parcela} contaInicial={lancamento.conta} aoFechar={() => setLancamento(null)} aoSalvar={(dia) => {
      setConfirmacao(lancamento.tipo === "conta" ? { texto: "Conta cadastrada e vencimentos gerados.", href: link("pagar"), acao: "Conferir em A pagar" } : { texto: `${lancamento.tipo === "recebi" ? "Recebimento" : "Pagamento"} registrado em ${dataCurta(dia)}.`, href: urlFinanceiro(dia.slice(0, 7), "extrato"), acao: "Ver no extrato" });
      setSucesso(true); setLancamento(null);
    }} /> : null}
    {ativa === "visao" ? <>
      <section className={o.hero}><div><span className={o.sobretitulo}>Sua rotina financeira</span><h2>{pendencias.length ? "Comece pelo que precisa de atenção." : "Sua rotina está em dia."}</h2><p>Pendências na posição de hoje, {dataCurta(diaHoje)}. Os valores do resultado abaixo pertencem a {nomeDoMes(mes)} de {mes.slice(0, 4)}.</p></div><div className={o.acoes}><Link className={s.botao} href={link("receber")}>Conferir recebimentos</Link><Link className={s.botao} href={link("pagar")}>Organizar pagamentos</Link></div></section>
      <section className={s.painel} aria-labelledby="financeiro-pendencias"><h2 id="financeiro-pendencias">Resolver agora</h2><p className={s.descricao}>Cada pendência abre a lista com o filtro correspondente. Abrir uma cobrança não envia mensagem automaticamente.</p>
        {pendencias.length ? <div className={o.pendencias}>{pendencias.map((p) => <Link className={o.pendencia} key={p.nome} href={p.href}><div><b>{p.nome}</b><small>{p.nota}</small></div><span className={o.quantidade}>{p.quantidade}</span></Link>)}</div> : <p className={o.vazio}>Nenhuma pendência identificada. Confira os próximos vencimentos em A pagar e A receber.</p>}
      </section>
      <div className={s.kpis}>
        <Indicador nome="Recebido no mês" valor={valor(r.bruto)} nota="Pagamentos registrados, antes das taxas." href={link("extrato")} />
        <Indicador nome={confirmado.pendentes ? "Líquido já confirmado" : "Recebido líquido"} valor={valor(confirmado.valor)} nota={confirmado.pendentes ? `${confirmado.pendentes} pagamento(s) ainda aguardando conferência.` : "Recebimentos após as taxas confirmadas."} href={link("extrato", confirmado.pendentes ? { filtro: "taxas" } : {})} />
        <Indicador nome="Despesas pagas" valor={movimentosDisponiveis ? valor(r.despesas) : "A conferir"} nota="Saídas registradas no mês, sem incluir contas futuras." href={link("extrato", { filtro: "saidas" })} />
        <Indicador nome="Resultado do mês" valor={valor(saldo)} nota={r.taxasPendentes ? "Incompleto: confirme as taxas dos recebimentos." : "Líquido menos devoluções e despesas. Não é saldo bancário."} href={link("extrato")} />
      </div>
      <div className={s.grade}><section className={s.painel}><h2>Como chegamos ao resultado</h2><p className={s.descricao}>A conta considera apenas o dinheiro movimentado no mês selecionado.</p><div className={o.formula}>
        <div><span>Recebido dos clientes</span><b>{valor(r.bruto)}</b></div><div><span>− Taxas {r.taxasPendentes ? "já confirmadas" : "dos pagamentos"}</span><b>{valor(r.taxas)}</b></div><div><span>− Dinheiro devolvido</span><b>{valor(r.devolvido)}</b></div><div><span>− Despesas pagas</span><b>{movimentosDisponiveis ? valor(r.despesas) : "A conferir"}</b></div><div><span>Resultado do mês</span><b>{valor(saldo)}</b></div>
      </div>{r.taxasPendentes ? <p className={o.nota}>Faltam taxas de {r.taxasPendentes} recebimento(s). O líquido confirmado acima mostra somente os pagamentos já conferidos.</p> : null}<p className={o.nota}>O saldo da conta bancária também depende do dinheiro que já existia e de outras movimentações. Este painel mostra o resultado registrado no CRM.</p></section>
      <section className={s.painel}><h2>O que ainda vai acontecer</h2><p className={s.descricao}>Posição de hoje. Valores previstos permanecem separados do resultado realizado.</p><div className={o.formula}><div><span>Clientes ainda devem</span><b>{valor(contas.aReceber)}</b></div><div><span>Deste saldo, já vencido</span><b>{valor(contas.vencidoContratual)}</b></div><div><span>Contas em reais para pagar</span><b>{valor(aPagar.filter((c) => c.moeda === "BRL").reduce((v, c) => v + c.saldo, 0))}</b></div></div>{aPagar.some((c) => c.moeda === "USD" && c.saldo > 0) ? <p className={o.nota}>Há também contas em dólar. Os valores originais e a estimativa de conversão ficam no Planejamento.</p> : null}<div className={o.acoes}><Link className={s.botao} href={link("planejamento")}>Ver próximos meses</Link></div></section></div>
      <section className={s.painel}><h2>Entradas e saídas nos últimos 12 meses</h2><SerieMensal dados={historico.map((h) => ({ mes: h.mes, valores: [h.bruto, movimentosDisponiveis ? h.despesas : null, movimentosDisponiveis ? h.devolvido : null] }))} series={["Recebimentos brutos", "Despesas pagas", "Devoluções"]} rotulo="Movimentos pela data em que ocorreram. As taxas são detalhadas no extrato." href={(m) => urlFinanceiro(m, "extrato")} /></section>
    </> : null}
    {ativa === "receber" ? <ContasReceber key={mes + (filtroInicial ?? "")} parcelas={parcelas} contas={contas} mes={mes} hoje={diaHoje} filtroInicial={filtroInicial} aoAbrir={abrir} /> : null}
    {ativa === "pagar" ? revisaoDisponivel ? <ContasPagar key={mes + (filtroInicial ?? "")} dados={dados} mes={mes} filtroInicial={filtroInicial} aoAbrir={abrir} /> : <Aviso>A agenda de contas ainda não está disponível. As estimativas cadastradas continuam acessíveis em Planejamento.</Aviso> : null}
    {ativa === "extrato" ? <Extrato key={mes + (filtroInicial ?? "")} dados={dados} mes={mes} devolucoes={devolucoes} revisaoDisponivel={revisaoDisponivel} movimentosDisponiveis={movimentosDisponiveis} filtroInicial={filtroInicial} rodar={rodar} historico={historicoDespesas} /> : null}
    {ativa === "planejamento" ? <>
      <section className={s.painel}><div className={o.acoes}><div style={{ flex: 1 }}><h2>Próximos seis meses</h2><p className={s.descricao}>A partir do mês atual. Entradas por parcelas a vencer e saídas pelos vencimentos agendados.</p></div><button className={s.botao + " " + s.primario} disabled={!revisaoDisponivel} onClick={() => abrir("conta")}>Cadastrar conta recorrente</button></div>
        <SerieMensal dados={previsao.map((p) => ({ mes: p.mes, valores: [Math.max(0, p.total - p.vencido), revisaoDisponivel ? previstoNoMes(p.mes, ocorrencias, despesas, cotacao) : null] }))} series={["A receber no prazo", "Contas a pagar"]} rotulo="Entradas brutas, antes das taxas futuras. Parcelas de clientes já vencidas ficam separadas; as contas do mês ainda não pagas permanecem previstas." href={urlPrevisao} />
        {semAgenda.length ? <Aviso>{semAgenda.length} estimativa(s) sem vencimentos agendados. Elas ainda não entram na previsão de pagamentos. <a href="#agenda-existente">Agendar vencimentos</a></Aviso> : null}
        {vencido > 0 ? <Aviso>Clientes devem {valor(vencido)} em parcelas já vencidas. Esse valor fica fora da previsão no prazo. <Link href={link("receber", { filtro: "vencidas" })}>Abrir cobranças</Link></Aviso> : null}
        <div className={s.rolagem}><table className={s.tabela}><thead><tr><th>Mês</th><th>A receber no prazo</th><th>Contas a pagar</th><th>Diferença prevista</th></tr></thead><tbody>{previsao.map((p) => { const saida = revisaoDisponivel ? previstoNoMes(p.mes, ocorrencias, despesas, cotacao) : null; const entrada = Math.max(0, p.total - p.vencido); return <tr key={p.mes}><td><Link href={urlPrevisao(p.mes)}>{nomeDoMes(p.mes)} / {p.mes.slice(0,4)}</Link></td><td>{valor(entrada)}</td><td>{valor(saida)}</td><td>{valor(saida === null ? null : entrada - saida)}</td></tr>; })}</tbody></table></div>
        <p className={o.nota}>Diferença prevista é a comparação entre essas entradas e saídas; não representa saldo bancário futuro. Contas anuais entram por inteiro no mês do vencimento.</p>
      </section>
      <section className={s.painel} id="movimentos-previstos"><h2>Vencimentos de {mesPrevisto ? nomeDoMes(mesPrevisto) + " / " + mesPrevisto.slice(0, 4) : "cada mês"}</h2><div className={o.acoes}>{previsao.map((p) => <Link className={s.botao} aria-current={p.mes === mesPrevisto ? "page" : undefined} key={p.mes} href={urlPrevisao(p.mes)}>{nomeDoMes(p.mes)}</Link>)}</div>
        <ul className={o.lista}>{parcelas.filter((p) => p.saldo > 0 && p.vence_em >= diaHoje && p.vence_em.slice(0,7) === mesPrevisto).map((p) => <li className={o.conta} key={p.id}><div><h3>{p.lead_nome}</h3><small>Entrada · {p.rotulo} · {dataCurta(p.vence_em)}</small></div><b>{valor(p.saldo)}</b></li>)}{aPagar.filter((p) => p.saldo > 0 && p.vence_em.slice(0,7) === mesPrevisto).map((p) => <li className={o.conta} key={p.id}><div><h3>{p.descricao}</h3><small>Saída · {dataCurta(p.vence_em)}</small></div><b>{p.moeda === "USD" ? "US$ " + p.saldo.toFixed(2) : valor(p.saldo)}</b></li>)}</ul>
        {!parcelas.some((p) => p.saldo > 0 && p.vence_em >= diaHoje && p.vence_em.slice(0,7) === mesPrevisto) && !aPagar.some((p) => p.saldo > 0 && p.vence_em.slice(0,7) === mesPrevisto) ? <p className={o.vazio}>Nenhum vencimento em aberto neste mês.</p> : null}
      </section>
      {revisaoDisponivel ? <details className={o.detalhes} id="agenda-existente"><summary>Agendar vencimentos de uma conta já cadastrada</summary><Compromissos custos={custos} ocorrencias={ocorrencias} despesas={despesas} hoje={diaHoje} rodar={rodar} somenteAgendamento /></details> : null}
      <details className={o.detalhes}><summary>Estimativas e cadastros de custos</summary><p className={o.nota}>O equivalente mensal ajuda a comparar custos. Para uma conta entrar em A pagar, cadastre seus vencimentos. Alterar uma estimativa não reescreve pagamentos nem vencimentos já gerados.</p>{custos.some((c) => c.moeda === "USD") ? <p className={o.nota}>{dolar ? `Conversão estimada: R$ ${dolar.valor.toFixed(2)} por dólar, cotação de ${dolar.quando}. O pagamento efetivo em reais fica preservado no extrato.` : "Cotação indisponível: a previsão em dólar está incompleta."}</p> : null}<Custos custos={custos} cotacao={cotacao} rodar={rodar} hoje={hoje} /></details>
      {!semCambio ? <details className={o.detalhes}><summary>Simular metas de vendas</summary><p className={o.nota}>Simulação com ticket integral recebido e custos previstos. As datas das parcelas e taxas futuras não estão incluídas.</p><Virada ano={Number(mes.slice(0,4))} mes={mes} custoMes={custoFixo} vendas={vendas} escolha={escolha} rodar={rodar} /></details> : null}
    </> : null}
    </fieldset>
  </div>;
}
