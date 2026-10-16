"use client";

import Link from "next/link";
import { useState } from "react";
import { FONTES, MESES_LONGOS, formatar, type Meta, type Projeto, type Valores } from "@/lib/plano/tipos";
import { fonteDaMeta, leituraMeta, metaPrincipal, type OperacaoPlano } from "@/lib/plano/resumo";
import { EvolucaoMeta } from "./EvolucaoMeta";
import s from "./resumo.module.css";

export function ResumoPlano({ ano, ate, metas, projetos, valores, operacao }: {
  ano: number; ate: number; metas: Meta[]; projetos: Projeto[]; valores: Valores; operacao: OperacaoPlano | null;
}) {
  const principal = metaPrincipal(metas, projetos);
  const [escolhida, setEscolhida] = useState(principal?.id ?? "");
  const meta = metas.find((m) => m.id === escolhida) ?? principal;
  const leitura = meta ? leituraMeta(meta, valores[meta.id] ?? {}, ate) : null;
  const fonte = meta ? fonteDaMeta(meta.fonte, ano, ate) : null;
  const vigente = metas.filter((m) => leituraMeta(m, valores[m.id] ?? {}, ate).vigente);
  const pendentes = vigente.filter((m) => leituraMeta(m, valores[m.id] ?? {}, ate).realizado === null).length;
  const noRitmo = vigente.filter((m) => (leituraMeta(m, valores[m.id] ?? {}, ate).percentual ?? 0) >= 1).length;
  const realizado = leitura?.realizado ?? null;
  const falta = meta && realizado !== null ? Math.max(0, meta.direcao === "reduzir" ? realizado - meta.alvo : meta.alvo - realizado) : null;
  const progresso = meta && realizado !== null ? Math.min(100, Math.max(0, (meta.direcao === "reduzir" ? realizado <= 0 ? 1 : meta.alvo / realizado : realizado / meta.alvo) * 100)) : 0;
  return <div className={s.resumo}>
    <section className={s.foco} aria-label="Objetivo em foco">
      <div className={s.focoCab}><span className={s.sobretitulo}>OBJETIVO EM FOCO · {ate ? `${MESES_LONGOS[ate - 1]} de ${ano}` : `Planejamento de ${ano}`}</span>{metas.length > 1 && <label>Ver objetivo<select value={meta?.id ?? ""} onChange={(e) => setEscolhida(e.target.value)}>{metas.map((m) => <option key={m.id} value={m.id}>{m.titulo}</option>)}</select></label>}</div>
      <h2>{meta?.titulo ?? "Defina o resultado que você quer alcançar"}</h2>
      {meta && leitura && fonte ? <>
        <p>{projetos.find((p) => p.id === meta.projeto_id)?.nome ?? "Objetivo do estúdio"} · {meta.periodo === "ano" ? "Meta anual, com realizado acumulado" : "Meta mensal"}{meta.direcao === "reduzir" ? " · Manter dentro do limite" : ""}{projetos.find((p) => p.id === meta.projeto_id)?.status === "pausado" ? " · Iniciativa pausada" : projetos.find((p) => p.id === meta.projeto_id)?.status === "encerrado" ? " · Iniciativa encerrada" : ""}</p>
        <dl className={s.numeros}>
          <div><dt>{meta.periodo === "ano" ? "Realizado acumulado" : "Realizado no mês"}</dt><dd>{realizado === null ? "A apurar" : formatar(realizado, meta.unidade)}</dd></div>
          <div><dt>{meta.direcao === "reduzir" ? "Limite" : "Objetivo"} {meta.periodo === "ano" ? "do ano" : "do mês"}</dt><dd>{formatar(meta.alvo, meta.unidade)}</dd></div>
          <div><dt>{meta.direcao === "reduzir" ? "Precisa reduzir" : "Falta alcançar"}</dt><dd>{falta === null ? "A apurar" : falta === 0 ? meta.direcao === "reduzir" ? "Dentro do limite" : "Alcançado" : formatar(falta, meta.unidade)}</dd></div>
        </dl>
        <div className={s.barra} role="progressbar" aria-label={`Progresso de ${meta.titulo}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={realizado === null ? undefined : Math.round(progresso)} aria-valuetext={realizado === null ? "Medição a apurar" : undefined}><i style={{ width: `${progresso}%` }} /></div>
        <div className={s.situacao}>
          <p>{!ate ? "O ano ainda não começou. Prepare as metas; os resultados aparecem conforme os meses acontecem." : realizado === null ? "Há números a apurar. Confira a fonte ou complete as medições antes de avaliar o resultado." : meta.periodo === "ano" ? `Ritmo até ${MESES_LONGOS[ate - 1]}: ${formatar(leitura.alvo, meta.unidade)}. ${leitura.falta === 0 ? "Dentro do ritmo previsto." : `${meta.direcao === "reduzir" ? "Reduzir" : "Faltam"} ${formatar(leitura.falta, meta.unidade)} para esse ritmo.`}` : falta === 0 ? "Objetivo do período atendido. Continue acompanhando os registros." : "Use as ações abaixo para trabalhar o resultado deste mês."}</p>
          <Link className={s.botao} href={fonte.href}>{fonte.acao} →</Link>
        </div>
        <span className={s.fonte}>{FONTES[meta.fonte].nome}. {FONTES[meta.fonte].ajuda}.</span>
        <EvolucaoMeta meta={meta} valores={valores[meta.id] ?? {}} ate={ate} />
      </> : <><p>Comece com uma iniciativa e uma meta mensurável. O Plano mostrará o realizado, a diferença e onde agir.</p><a className={s.botao} href={projetos.length ? "#metas" : "#projetos"}>Definir meu primeiro objetivo →</a></>}
    </section>
    {ate > 0 && metas.length > 0 && <p className={s.cobertura}>{noRitmo} de {vigente.length} metas no ritmo do período{pendentes ? ` · ${pendentes} a apurar; o resultado está incompleto` : " · medições disponíveis"}. <a href="#metas">Conferir todas</a></p>}
    {operacao && <section className={s.operacao} aria-label="Ações conectadas ao plano"><div className={s.titulo}><h2>Onde agir agora</h2><span>Posição atual do estúdio</span></div><div className={s.acoes}>
      <Link href="/crm/atendimento"><b>{operacao.novos + operacao.respostas}</b><strong>Atender contatos</strong><span>{operacao.novos} novos · {operacao.respostas} aguardando resposta</span></Link>
      <Link href="/crm/pipeline"><b>{operacao.propostas}</b><strong>Avançar propostas</strong><span>Propostas e negociações abertas no funil</span></Link>
      <Link href={operacao.taxasPendentes ? `/crm/financeiro?mes=${ano}-${String(ate).padStart(2, "0")}&aba=extrato&filtro=taxas` : "/crm/financeiro?aba=receber"}><b>{operacao.taxasPendentes || "R$"}</b><strong>{operacao.taxasPendentes ? "Conferir taxas" : "Receber e cobrar"}</strong><span>{operacao.taxasPendentes ? "Recebimentos sem líquido confirmado afetam o resultado" : "Conferir parcelas abertas e registrar pagamentos"}</span></Link>
      <Link href="/crm/projetos"><b>{operacao.entregasPendentes ?? "A conferir"}</b><strong>Concluir entregas</strong><span>{operacao.entregasPendentes === null ? "Confira a disponibilidade dos dados em Projetos" : "Projetos ativos ainda não entregues"}</span></Link>
    </div></section>}
    {metas.length > 1 && <details className={s.outras}><summary>Todas as metas de {ano} ({metas.length})</summary><ul>{metas.map((m) => { const l = leituraMeta(m, valores[m.id] ?? {}, ate), f = fonteDaMeta(m.fonte, ano, ate); return <li key={m.id}><div><b>{m.titulo}</b><span>{l.realizado === null ? "A apurar" : formatar(l.realizado, m.unidade)} de {formatar(m.alvo, m.unidade)} {m.periodo === "ano" ? "no ano" : "no mês"}{m.direcao === "reduzir" ? " · quanto menor, melhor" : ""}</span></div><Link href={f.href}>{f.acao}</Link></li>; })}</ul></details>}
  </div>;
}
