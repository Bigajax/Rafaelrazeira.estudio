"use client";

/* A escolha da categoria, do pilar, do formato e o briefing. "Começar" abre
   o editor com o esqueleto de slides do pilar; com "o time escreve" marcado,
   a linha inteira (Paula, Caetano, Dora, Vera) já vai para a fila, e você
   abre o editor para diagramar enquanto eles escrevem.

   A categoria vem primeiro (01/10): é o assunto que equilibra o feed. A tela
   já abre na que está mais atrás da fatia dela no mês, e escolher uma
   categoria sugere o pilar que mais combina com ela, sem travar os outros. */
import { useState, useTransition } from "react";
import { criarPeca } from "@/app/(pt)/crm/acoes-marketing";
import { CATEGORIAS, PAPEIS, PILARES, TIPOS, TIPOS_SLIDE, type Categoria, type Pilar, type TipoPeca } from "@/lib/marketing/tipos";
import s from "@/app/(pt)/crm/crm.module.css";
import m from "@/app/(pt)/crm/marketing.module.css";

const NOMES_CATEGORIA = Object.keys(CATEGORIAS) as Categoria[];

/* a categoria mais atrás da meta dela neste mês */
function maisAtrasada(porCategoria: Record<Categoria, number>): Categoria {
  const total = NOMES_CATEGORIA.reduce((a, c) => a + (porCategoria[c] ?? 0), 0);
  const falta = (c: Categoria) => (CATEGORIAS[c].meta / 100) * (total + 1) - (porCategoria[c] ?? 0);
  return NOMES_CATEGORIA.reduce((a, c) => (falta(c) > falta(a) ? c : a));
}

export function NovaPeca({
  data,
  vendaAlta,
  porCategoria,
}: {
  data: string;
  vendaAlta: boolean;
  porCategoria: Record<Categoria, number>;
}) {
  const [categoria, setCategoria] = useState<Categoria>(() => maisAtrasada(porCategoria));
  const [pilar, setPilar] = useState<Pilar>(() => CATEGORIAS[maisAtrasada(porCategoria)].pilares[0]);
  const [tipo, setTipo] = useState<TipoPeca>("carrossel");
  const [briefing, setBriefing] = useState("");
  const [time, setTime] = useState(false);
  const [erro, setErro] = useState("");
  const [pendente, comecar] = useTransition();

  const totalMes = NOMES_CATEGORIA.reduce((a, c) => a + (porCategoria[c] ?? 0), 0);
  const combinam = CATEGORIAS[categoria].pilares;
  /* os pilares que combinam com a categoria vêm primeiro, na ordem dela */
  const pilares = [...combinam, ...(Object.keys(PILARES) as Pilar[]).filter((p) => !combinam.includes(p))];

  function escolherCategoria(c: Categoria) {
    setCategoria(c);
    if (!CATEGORIAS[c].pilares.includes(pilar)) setPilar(CATEGORIAS[c].pilares[0]);
  }

  function criar() {
    const f = new FormData();
    f.set("categoria", categoria);
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
      <h3 className={m.novaPergunta}>
        Do que este post fala<i className={s.ponto}>?</i>
      </h3>
      <div className={m.categorias} role="radiogroup" aria-label="Categoria do post">
        {NOMES_CATEGORIA.map((c) => {
          const n = porCategoria[c] ?? 0;
          const pct = totalMes ? Math.round((n / totalMes) * 100) : 0;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={categoria === c}
              className={`${m.pilarCartao} ${categoria === c ? m.pilarAtivo : ""}`}
              onClick={() => escolherCategoria(c)}
            >
              <b>{CATEGORIAS[c].nome}</b>
              <span>{CATEGORIAS[c].faz}</span>
              <span className={m.categoriaExemplo}>Ex.: {CATEGORIAS[c].exemplo}</span>
              <em className={m.categoriaConta}>
                {n} no mês{totalMes ? ` (${pct}%)` : ""}, meta {CATEGORIAS[c].meta}%
              </em>
            </button>
          );
        })}
      </div>

      <h3 className={m.novaPergunta}>
        E o que ele entrega<i className={s.ponto}>?</i>
      </h3>
      <div className={m.pilares} role="radiogroup" aria-label="Pilar do post">
        {pilares.map((p) => (
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
            {combinam.includes(p) ? <em className={m.combina}>Combina com {CATEGORIAS[categoria].nome}</em> : null}
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
