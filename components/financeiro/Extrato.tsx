"use client";
import Link from "next/link";
import { useState } from "react";
import { dataCurta } from "@/lib/crm/regras";
import { extratoFinanceiro } from "@/lib/financeiro/operacao";
import { reais } from "@/lib/financeiro/tipos";
import { baixarCSV } from "@/lib/sistema/exportar";
import type { Devolucao } from "@/lib/sistema/indicadores";
import type { Feito } from "@/app/(pt)/crm/acoes-financeiro";
import { Retificar } from "./Compromissos";
import { Liquido, Devolver } from "./DetalhesMovimentos";
import type { DadosLancamento } from "./Lancamentos";
import s from "@/components/sistema/sistema.module.css";
import o from "./operacao.module.css";
export function Extrato({ dados, mes, devolucoes, revisaoDisponivel, movimentosDisponiveis, filtroInicial, rodar, historico }: {
  dados: DadosLancamento; mes: string; devolucoes: Devolucao[]; revisaoDisponivel: boolean; movimentosDisponiveis: boolean; filtroInicial?: string;
  rodar: (acao: () => Promise<Feito>, depois?: (r: Feito) => void) => void;
  historico: { id: string; despesa_id: string; motivo: string; alterado_em: string }[];
}) {
  const [tipo, setTipo] = useState(filtroInicial === "saidas" ? "saida" : "todos");
  const [pendentes, setPendentes] = useState(filtroInicial === "taxas");
  const [cliente, setCliente] = useState("");
  const [busca, setBusca] = useState("");
  const nomeCliente = (id?: string | null) => { const c = dados.clientes.find((c) => c.id === id); return c?.empresa || c?.nome || "Cliente não identificado"; };
  const movimentos = extratoFinanceiro(mes, dados.recebimentos, dados.despesas, devolucoes).filter((m) => {
    if (tipo !== "todos" && m.tipo !== tipo) return false;
    if (cliente && m.lead_id !== cliente) return false;
    if (pendentes && (m.tipo !== "entrada" || dados.recebimentos.find((r) => r.id === m.origemId)?.valor_liquido != null)) return false;
    return [m.descricao, m.lead_id ? nomeCliente(m.lead_id) : ""].join(" ").toLowerCase().includes(busca.toLowerCase());
  });
  function exportar() {
    baixarCSV("extrato-" + mes + ".csv", [
      ["Data", "Movimento", "Descrição", "Cliente", "Valor bruto/saída", "Líquido confirmado", "Categoria", "Moeda original", "Valor original"],
      ...movimentos.map((m) => {
        const entrada = m.tipo === "entrada" ? dados.recebimentos.find((r) => r.id === m.origemId) : undefined;
        const despesa = m.tipo === "saida" ? dados.despesas.find((d) => d.id === m.origemId) : undefined;
        return [m.data, m.tipo, m.descricao, m.lead_id ? nomeCliente(m.lead_id) : "", m.tipo === "entrada" ? m.valor : -m.valor,
          entrada?.valor_liquido ?? "", despesa?.categoria ?? "", despesa?.moeda_original ?? "", despesa?.valor_original ?? ""];
      }),
    ]);
  }
  return <section className={s.painel}>
    <h2>Extrato do mês</h2><p className={s.descricao}>Entradas, despesas e devoluções em ordem de data. Uma conta prevista só aparece aqui quando há pagamento registrado.</p>
    <div className={o.filtros}><label>Movimento<select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="todos">Todos</option><option value="entrada">Entradas</option><option value="saida">Despesas pagas</option><option value="devolucao">Devoluções</option></select></label><label>Cliente<select value={cliente} onChange={(e) => setCliente(e.target.value)}><option value="">Todos</option>{dados.clientes.map((c) => <option key={c.id} value={c.id}>{c.empresa || c.nome}</option>)}</select></label><label>Buscar<input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cliente ou descrição" /></label></div>
    <div className={o.acoes}><label className={o.nota}><input type="checkbox" checked={pendentes} onChange={(e) => { setPendentes(e.target.checked); if (e.target.checked) setTipo("entrada"); }} /> Somente recebimentos com líquido a conferir</label><button className={s.botao} onClick={exportar}>Exportar seleção</button></div>
    <p className={o.nota}>{movimentos.length} movimento(s) nesta seleção. Os valores das entradas são brutos; as taxas aparecem nos detalhes.</p>
    <div className={o.extrato}>{movimentos.map((m) => {
      const recebimento = m.tipo === "entrada" ? dados.recebimentos.find((r) => r.id === m.origemId) : undefined;
      const despesa = m.tipo === "saida" ? dados.despesas.find((r) => r.id === m.origemId) : undefined;
      const devolvido = devolucoes.filter((d) => d.recebimento_id === m.origemId).reduce((v, d) => v + Number(d.valor), 0);
      return <article className={o.movimento} key={m.id} data-tipo={m.tipo}>
        <time dateTime={m.data}>{dataCurta(m.data)}</time><div><b>{m.tipo === "entrada" ? nomeCliente(m.lead_id) : m.descricao}</b><small>{m.tipo === "entrada" ? recebimento?.mp_payment_id ? "Recebimento automático · Mercado Pago" : "Recebimento manual" : m.tipo === "saida" ? "Despesa paga" : "Dinheiro devolvido ao cliente"}</small>
          {recebimento ? <small>{recebimento.valor_liquido == null ? "Valor líquido a conferir" : `Líquido confirmado: ${reais(Number(recebimento.valor_liquido), true)}`}{recebimento.estornado_em ? " · Devolvido integralmente" : ""}</small> : null}
        </div><b className={o.valor}>{m.tipo === "entrada" ? "+" : "−"} {reais(m.valor, true)}</b>
        <details><summary>{m.tipo === "entrada" ? "Conferir recebimento" : m.tipo === "saida" ? "Detalhes e correções" : "Ver origem da devolução"}</summary>
          <div className={o.acoes}>
            {m.lead_id ? <Link className={s.botao} href={"/crm/lead/" + m.lead_id}>Abrir cliente</Link> : null}
            {recebimento?.mp_payment_id ? <Link className={s.botao} href="/crm/conciliacao">Conferir no Mercado Pago</Link> : null}
            {recebimento?.id ? <Liquido id={recebimento.id} bruto={Number(recebimento.valor)} inicial={recebimento.valor_liquido} rodar={rodar} /> : null}
            {recebimento?.id && !recebimento.mp_payment_id && movimentosDisponiveis ? <Devolver id={recebimento.id} limite={recebimento.estornado_em ? 0 : Math.max(0, Number(recebimento.valor) - devolvido)} rodar={rodar} /> : null}
            {despesa && revisaoDisponivel ? <Retificar despesa={despesa} rodar={rodar} /> : null}
          </div>
          {despesa ? <><p className={o.nota}>{despesa.notas || "Sem observação."}{despesa.moeda_original === "USD" ? ` Valor original: US$ ${despesa.valor_original}.` : ""}</p>{historico.filter((h) => h.despesa_id === despesa.id).map((h) => <p className={o.nota} key={h.id}>{dataCurta(h.alterado_em)} · {h.motivo}</p>)}</> : null}
          {m.tipo === "devolucao" ? <p className={o.nota}>Vinculada ao recebimento {m.origemId}. A devolução entra no resultado na data em que ocorreu.</p> : null}
        </details>
      </article>;
    })}</div>
    {!movimentos.length ? <p className={o.vazio}>Nenhum movimento nesta seleção. Ajuste os filtros ou registre um recebimento ou pagamento.</p> : null}
  </section>;
}
