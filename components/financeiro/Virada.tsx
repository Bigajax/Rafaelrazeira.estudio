"use client";

/* ============================================================
   A CONTA DA VIRADA (30/09/2026)

   "Temos que ter metas claras: quantas vitrines a gente tem que fazer para
   bater o custo, passar, e ter uma margem." Duas contas, com dois números
   que o Rafael escolhe (o ticket e a margem):

     vitrines para empatar  = custo do mês ÷ ticket, para cima
     vitrines com margem    = custo ÷ (1 − margem) ÷ ticket, para cima

   E a fileira: uma vitrine por quadrado. As vendidas no mês ficam cheias,
   as que faltam para empatar ficam tracejadas em tinta, e as da margem em
   azul. Dá para ver de longe quantas faltam.
   ============================================================ */

import { useState } from "react";
import { levarAoPlano, salvarVirada, type Feito } from "@/app/(pt)/crm/acoes-financeiro";
import { nomeDoMes, reais } from "@/lib/financeiro/tipos";
import f from "@/app/(pt)/crm/financeiro.module.css";

type Rodar = (acao: () => Promise<Feito>, depois?: (r: Feito) => void) => void;

export function Virada({
  ano,
  mes,
  custoMes,
  vendas,
  escolha,
  rodar,
}: {
  ano: number;
  mes: string;
  custoMes: number;
  vendas: { valor: number; quando: string | null }[];
  escolha: { ticket: number | null; margem: number | null };
  rodar: Rodar;
}) {
  const reais_ = vendas.filter((v) => v.valor > 0);
  const media = reais_.length ? reais_.reduce((a, v) => a + v.valor, 0) / reais_.length : null;
  const [ticket, setTicket] = useState<number>(escolha.ticket ?? (media ? Math.round(media) : 999));
  const [margem, setMargem] = useState<number>(escolha.margem ?? 30);
  const [levado, setLevado] = useState(false);

  const t = ticket > 0 ? ticket : 1;
  const m = Math.min(90, Math.max(0, margem)) / 100;
  const empate = Math.ceil(custoMes / t);
  const receitaMargem = custoMes / (1 - m);
  const comMargem = Math.max(empate, Math.ceil(receitaMargem / t));
  const vendidasNoMes = vendas.filter((v) => v.quando?.slice(0, 7) === mes).length;
  const faltamEmpate = Math.max(0, empate - vendidasNoMes);
  const faltamMargem = Math.max(0, comMargem - vendidasNoMes);
  const quadros = Math.min(40, Math.max(comMargem, vendidasNoMes));

  const salvar = (nt: number, nm: number) => {
    if (nt === (escolha.ticket ?? null) && nm === (escolha.margem ?? null)) return;
    rodar(() => salvarVirada(ano, nt, nm));
  };

  return (
    <section className={f.andar} id="virada">
      <h2>
        A conta da virada<i className={f.ponto}>.</i>
      </h2>
      <p className={f.voz}>Quantas vitrines pagam o mês, e quantas deixam dinheiro sobrando. Mude os dois números e a conta refaz.</p>

      <div className={f.viradaPerguntas}>
        <label>
          <span>Cada vitrine rende</span>
          <span className={f.campoDinheiro}>
            R$
            <input
              type="number"
              min={1}
              value={ticket || ""}
              onChange={(e) => setTicket(Number(e.target.value))}
              onBlur={() => salvar(ticket, margem)}
              aria-label="Ticket médio por vitrine"
            />
          </span>
          <em>
            {media ? `a média real das suas ${reais_.length} vendas é ${reais(media)}; a tabela é R$ 999` : "a tabela é R$ 999"}
          </em>
        </label>
        <label>
          <span>e você quer que sobre</span>
          <span className={f.campoDinheiro}>
            <input
              type="number"
              min={0}
              max={90}
              value={margem}
              onChange={(e) => setMargem(Number(e.target.value))}
              onBlur={() => salvar(ticket, margem)}
              aria-label="Margem desejada"
            />
            %
          </span>
          <em>do que entrar, depois de pagar tudo</em>
        </label>
        <label>
          <span>com o custo do mês em</span>
          <b className={f.custoFixo}>{reais(custoMes)}</b>
          <em>a soma dos custos lá embaixo</em>
        </label>
      </div>

      <div className={f.viradaNumeros}>
        <div>
          <b>{empate}</b>
          <span>
            {empate === 1 ? "vitrine paga" : "vitrines pagam"} o mês
            <em>é o empate: entra {reais(empate * t)}, sai {reais(custoMes)}</em>
          </span>
        </div>
        <div className={f.viradaMeta}>
          <b>{comMargem}</b>
          <span>
            {comMargem === 1 ? "vitrine deixa" : "vitrines deixam"} {Math.round(m * 100)}% de margem
            <em>
              entram {reais(comMargem * t)} e sobram {reais(comMargem * t - custoMes)}
            </em>
          </span>
        </div>
      </div>

      <div className={f.fileira} role="img" aria-label={`${vendidasNoMes} vendidas em ${nomeDoMes(mes)}, ${empate} para empatar, ${comMargem} para a margem`}>
        {Array.from({ length: quadros }, (_, i) => (
          <i key={i} className={i < vendidasNoMes ? f.qVendida : i < empate ? f.qEmpate : f.qMargem}>
            {i + 1 === empate ? <span>empata</span> : null}
          </i>
        ))}
      </div>
      <ul className={f.fileiraLegenda}>
        <li className={f.lVendida}>vendidas em {nomeDoMes(mes)}: {vendidasNoMes}</li>
        <li className={f.lEmpate}>até empatar: {faltamEmpate ? `faltam ${faltamEmpate}` : "já empatou"}</li>
        <li className={f.lMargem}>até a margem: {faltamMargem ? `faltam ${faltamMargem}` : "já chegou"}</li>
      </ul>

      <div className={f.levar}>
        <button
          type="button"
          className={f.btn}
          onClick={() => rodar(() => levarAoPlano(ano, comMargem, comMargem * t), (r) => setLevado(r.ok))}
        >
          Levar para as metas do Plano
        </button>
        <span>
          {levado
            ? `Feito: no Plano de ${ano}, "Vendas fechadas" pede ${comMargem} por mês e "Dinheiro que entrou", ${reais(Math.ceil((comMargem * t) / 100) * 100)}.`
            : `"Vendas fechadas" passa a pedir ${comMargem} por mês e "Dinheiro que entrou", ${reais(Math.ceil((comMargem * t) / 100) * 100)}.`}
        </span>
      </div>
    </section>
  );
}
