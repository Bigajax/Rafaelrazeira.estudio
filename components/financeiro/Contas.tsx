"use client";
import Link from "next/link";
import { useState } from "react";
import type { Caixa } from "@/lib/crm/dados";
import { dataCurta, linkWhatsapp, somarDias } from "@/lib/crm/regras";
import { contasAPagar, NOME_SITUACAO, situacaoConta, type ParcelaOperacional } from "@/lib/financeiro/operacao";
import { reais } from "@/lib/financeiro/tipos";
import { FAIXAS_ATRASO, faixaDoAtraso } from "@/lib/sistema/atrasos";
import type { DadosLancamento, TipoLancamento } from "./Lancamentos";
import { AmarrarRecebimento } from "@/components/crm/AmarrarRecebimento";
import s from "@/components/sistema/sistema.module.css";
import o from "./operacao.module.css";

export type AbrirLancamento = (tipo: TipoLancamento, parcela?: string, conta?: string) => void;
const FILTROS = [["abertas", "Todas em aberto"], ["vencidas", "Vencidas"], ["hoje", "Vencem hoje"], ["semana", "Próximos 7 dias"], ["mes", "Vencimentos no mês selecionado"], ["parciais", "Pagas parcialmente"], ["pagas", "Pagas"], ...FAIXAS_ATRASO.map((f) => [f.id, f.nome])];
function corresponde(filtro: string, saldo: number, total: number, vence: string, hoje: string, mes: string) {
  if (filtro === "pagas") return saldo <= 0;
  if (saldo <= 0) return false;
  if (FAIXAS_ATRASO.some((f) => f.id === filtro)) return faixaDoAtraso(vence, hoje) === filtro;
  if (filtro === "vencidas") return vence < hoje;
  if (filtro === "hoje") return vence === hoje;
  if (filtro === "semana") return vence >= hoje && vence <= somarDias(hoje, 7);
  if (filtro === "mes") return vence.slice(0, 7) === mes;
  if (filtro === "parciais") return saldo < total;
  return true;
}

export function ContasReceber({ parcelas, contas, mes, hoje, filtroInicial, aoAbrir }: {
  parcelas: ParcelaOperacional[]; contas: Caixa; mes: string; hoje: string; filtroInicial?: string; aoAbrir: AbrirLancamento;
}) {
  const [filtro, setFiltro] = useState(filtroInicial ?? "abertas");
  const [busca, setBusca] = useState("");
  const [cliente, setCliente] = useState("");
  const filtradas = [...parcelas].filter((p) => corresponde(filtro, p.saldo, p.valor ?? p.saldo, p.vence_em, hoje, mes) &&
    (!cliente || cliente === p.lead_id) && [p.lead_nome, p.rotulo, p.contrato_titulo].join(" ").toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.vence_em.localeCompare(b.vence_em) || a.id.localeCompare(b.id));
  const clientes = [...new Map(parcelas.map((p) => [p.lead_id, p.lead_nome])).entries()];
  return <>
    <section className={s.painel}>
      <div className={o.acoes}><div style={{ flex: 1 }}><h2>A receber</h2><p className={s.descricao}>Posição de hoje, {dataCurta(hoje)}. O vencimento combinado continua valendo mesmo quando o lembrete de cobrança é adiado.</p></div><button className={s.botao + " " + s.primario} onClick={() => aoAbrir("recebi")}>Recebi</button></div>
      <div className={o.resumo}><div><small>Saldo da seleção</small><strong>{reais(filtradas.reduce((v, p) => v + p.saldo, 0), true)}</strong></div><div><small>Parcelas na seleção</small><strong>{filtradas.length}</strong></div></div>
      <div className={o.filtros}><label>Situação<select value={filtro} onChange={(e) => setFiltro(e.target.value)}>{FILTROS.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label><label>Cliente<select value={cliente} onChange={(e) => setCliente(e.target.value)}><option value="">Todos os clientes</option>{clientes.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label><label>Buscar<input type="search" placeholder="Cliente, contrato ou parcela" value={busca} onChange={(e) => setBusca(e.target.value)} /></label></div>
      <ul className={o.lista}>{filtradas.map((p) => {
        const situacao = situacaoConta(p.valor ?? p.saldo, p.saldo, p.vence_em, hoje);
        const zap = linkWhatsapp(p.whatsapp ?? null, `Olá! Sobre a parcela ${p.rotulo}, com vencimento em ${dataCurta(p.vence_em)}: consta um saldo de ${reais(p.saldo, true)}. Você consegue me confirmar o pagamento?`);
        return <li key={p.id} className={o.conta}><div><h3><Link href={"/crm/lead/" + p.lead_id}>{p.lead_nome}</Link></h3><small>{p.contrato_titulo} · {p.rotulo}</small><small>Vencimento: {dataCurta(p.vence_em)}</small>
          {(p.recebido ?? 0) > 0 ? <small>Já recebido: {reais(p.recebido!, true)} de {reais(p.valor ?? 0, true)}</small> : null}
          {p.cobrar_em && p.cobrar_em !== p.vence_em ? <small>Lembrete de cobrança: {dataCurta(p.cobrar_em)}</small> : null}
        </div><div className={o.lateral}><span className={o.situacao} data-tom={situacao}>{NOME_SITUACAO[situacao]}</span><div className={o.valor}>{reais(p.saldo, true)}</div><div className={o.acoes}>
          {p.saldo > 0 ? <><button className={s.botao + " " + s.primario} onClick={() => aoAbrir("recebi", p.id)}>Registrar recebimento</button>{zap ? <a className={s.botao} href={zap} target="_blank" rel="noopener noreferrer">Cobrar no WhatsApp ↗</a> : null}</> : <Link href={"/crm/lead/" + p.lead_id} className={s.botao}>Ver histórico</Link>}
        </div></div></li>;
      })}</ul>
      {!filtradas.length ? <p className={o.vazio}>Nenhuma parcela nesta seleção. Ajuste os filtros para conferir outros vencimentos.</p> : null}
    </section>
    {contas.semDono.length ? <section className={s.painel} id="identificar"><h2>Recebimentos para identificar · {contas.semDono.length}</h2><p className={s.descricao}>Estes pagamentos já foram registrados. Vincule à parcela correta para atualizar o saldo; não registre outro recebimento.</p>
      {contas.semDono.map((r) => <AmarrarRecebimento key={r.id} recebimento={{ id: r.id, valor: Number(r.valor), recebido_em: r.recebido_em, metodo: r.metodo, origem: r.origem, referencia: r.mp_external_reference }} candidatas={parcelas.filter((p) => p.saldo > 0).map((p) => ({ id: p.id, rotulo: `${p.lead_nome} · ${p.rotulo} · ${reais(p.saldo, true)}` }))} />)}
    </section> : null}
    <details className={o.detalhes} id="contratos"><summary>Contratos e planos de pagamento · {contas.clientes.length}</summary><ul className={o.lista}>{contas.clientes.map((c) => <li className={o.conta} key={c.contrato.id}><div><h3>{c.lead?.empresa || c.lead?.nome || "Cliente"}</h3><small>{c.contrato.titulo}</small><small>Recebido: {reais(c.q.pago, true)} · saldo: {reais(c.q.saldo, true)}</small>{c.q.semParcela > .005 ? <small>Faltam parcelas para {reais(c.q.semParcela, true)} deste contrato.</small> : null}</div><Link className={s.botao} href={"/crm/lead/" + c.contrato.lead_id}>Abrir contrato</Link></li>)}</ul>{!contas.clientes.length ? <p className={o.vazio}>Os contratos aparecem aqui quando você registra uma venda na ficha do cliente.</p> : null}</details>
  </>;
}

export function ContasPagar({ dados, mes, filtroInicial, aoAbrir }: {
  dados: DadosLancamento; mes: string; filtroInicial?: string; aoAbrir: AbrirLancamento;
}) {
  const [filtro, setFiltro] = useState(filtroInicial ?? "abertas");
  const [busca, setBusca] = useState("");
  const filtradas = contasAPagar(dados.ocorrencias, dados.despesas, dados.hoje).filter((c) =>
    corresponde(filtro, c.saldo, Number(c.valor), c.vence_em, dados.hoje, mes) && c.descricao.toLowerCase().includes(busca.toLowerCase()));
  const reaisAbertos = filtradas.filter((c) => c.moeda === "BRL").reduce((v, c) => v + c.saldo, 0);
  const dolaresAbertos = filtradas.filter((c) => c.moeda === "USD").reduce((v, c) => v + c.saldo, 0);
  return <section className={s.painel}>
    <div className={o.acoes}><div style={{ flex: 1 }}><h2>A pagar</h2><p className={s.descricao}>Vencimentos agendados, com os pagamentos já descontados. Posição de hoje, {dataCurta(dados.hoje)}.</p></div><button className={s.botao + " " + s.primario} onClick={() => aoAbrir("paguei")}>Paguei</button><button className={s.botao} onClick={() => aoAbrir("conta")}>Cadastrar conta</button></div>
    <div className={o.resumo}><div><small>Saldo em reais na seleção</small><strong>{reais(reaisAbertos, true)}</strong></div>{dolaresAbertos > 0 ? <div><small>Saldo em dólar, separado</small><strong>US$ {dolaresAbertos.toFixed(2)}</strong></div> : null}<div><small>Contas na seleção</small><strong>{filtradas.length}</strong></div></div>
    <div className={o.filtros}><label>Situação<select value={filtro} onChange={(e) => setFiltro(e.target.value)}>{FILTROS.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label><label>Buscar<input type="search" placeholder="Nome da conta ou fornecedor" value={busca} onChange={(e) => setBusca(e.target.value)} /></label></div>
    <ul className={o.lista}>{filtradas.map((c) => <li key={c.id} className={o.conta}><div><h3>{c.descricao}</h3><small>Vencimento: {dataCurta(c.vence_em)}</small><small>Valor combinado: {c.moeda === "USD" ? "US$ " + Number(c.valor).toFixed(2) : reais(Number(c.valor), true)}</small>{c.saldo > 0 && c.saldo < Number(c.valor) ? <small>Pagamento parcial registrado; o valor ao lado é o que ainda falta pagar.</small> : null}</div><div className={o.lateral}><span className={o.situacao} data-tom={c.situacao}>{NOME_SITUACAO[c.situacao]}</span><div className={o.valor}>{c.moeda === "USD" ? "US$ " + c.saldo.toFixed(2) : reais(c.saldo, true)}</div>{c.saldo > 0 ? <button className={s.botao + " " + s.primario} onClick={() => aoAbrir("paguei", undefined, c.id)}>Registrar pagamento</button> : null}</div></li>)}</ul>
    {!filtradas.length ? <div className={o.vazio}>Nenhuma conta nesta seleção. Cadastre uma conta com vencimento ou registre uma despesa avulsa em “Paguei”.</div> : null}
  </section>;
}
