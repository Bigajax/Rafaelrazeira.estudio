"use client";

/* A escolha do pilar, do formato e o briefing. "Começar" abre o editor com
   o esqueleto de slides do pilar; com "o time escreve" marcado, a linha
   inteira (Paula, Caetano, Dora, Vera) já vai para a fila, e você abre o
   editor para diagramar enquanto eles escrevem. */
import { useState, useTransition } from "react";
import { criarPeca } from "@/app/(pt)/crm/acoes-marketing";
import { PAPEIS, PILARES, TIPOS, TIPOS_SLIDE, type Pilar, type TipoPeca } from "@/lib/marketing/tipos";
import s from "@/app/(pt)/crm/crm.module.css";
import m from "@/app/(pt)/crm/marketing.module.css";

export function NovaPeca({ data, vendaAlta }: { data: string; vendaAlta: boolean }) {
  const [pilar, setPilar] = useState<Pilar>("conceito");
  const [tipo, setTipo] = useState<TipoPeca>("carrossel");
  const [briefing, setBriefing] = useState("");
  const [time, setTime] = useState(false);
  const [erro, setErro] = useState("");
  const [pendente, comecar] = useTransition();

  function criar() {
    const f = new FormData();
    f.set("pilar", pilar);
    f.set("tipo", tipo);
    f.set("briefing", briefing);
    if (data) f.set("posta_em", data);
    if (time) f.set("time", "1");
    comecar(async () => {
      const r = await criarPeca(f);
      if (r && !r.ok) setErro(r.erro);
    });
  }

  const roteiro = tipo === "carrossel" || tipo === "story" ? PILARES[pilar].roteiro : [["capa", "abertura"] as const];

  return (
    <div className={m.nova}>
      <div className={m.pilares} role="radiogroup" aria-label="Pilar do post">
        {(Object.keys(PILARES) as Pilar[]).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={pilar === p}
            className={`${m.pilarCartao} ${pilar === p ? m.pilarAtivo : ""} ${PILARES[p].valor ? "" : m.pilarVenda}`}
            onClick={() => setPilar(p)}
          >
            <b>{PILARES[p].nome}</b>
            <span>{PILARES[p].faz}</span>
            {!PILARES[p].valor ? <em>{vendaAlta ? "Venda: o mês já passou dos 20%" : "Venda: 1 em cada 5"}</em> : null}
          </button>
        ))}
      </div>

      <div className={m.novaForm}>
        <div className={s.dupla}>
          <label className={s.campo}>
            <span className={s.campoRot}>Formato</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPeca)}>
              {(Object.keys(TIPOS) as TipoPeca[]).map((t) => (
                <option key={t} value={t}>
                  {TIPOS[t].nome}
                </option>
              ))}
            </select>
          </label>
          <div className={s.campo}>
            <span className={s.campoRot}>Nasce com (o roteiro da imagem)</span>
            <ol className={m.roteiro}>
              {roteiro.map(([t, papel], k) => (
                <li key={k}>
                  <b>{TIPOS_SLIDE[t].nome}</b> {PAPEIS[papel].nome.toLowerCase()}
                </li>
              ))}
            </ol>
          </div>
        </div>
        <label className={s.campo}>
          <span className={s.campoRot}>Briefing</span>
          <textarea
            rows={4}
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            placeholder="O que a pessoa leva deste post. Ex.: por que foto de produto no fundo branco parece mais cara, com o exemplo da mesma camisa nos dois jeitos."
          />
        </label>
        <label className={m.check}>
          <input type="checkbox" checked={time} onChange={(e) => setTime(e.target.checked)} />
          <span>O time escreve a primeira versão (Paula, Caetano, Dora e Vera). O design continua com você.</span>
        </label>
        {erro ? <p className={s.erro}>{erro}</p> : null}
        <button type="button" className={s.btnAcao} disabled={pendente} onClick={criar}>
          {pendente ? "Abrindo" : "Começar"}
        </button>
      </div>
    </div>
  );
}
