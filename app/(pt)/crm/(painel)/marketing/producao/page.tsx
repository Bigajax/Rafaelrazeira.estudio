/* ============================================================
   MARKETING: a produção (30/09/2026)

   "Rascunhos para eu ver o que está sendo produzido e o que não está."
   O calendário responde QUANDO; esta tela responde O QUE FALTA. Cada peça
   aparece com os cinco passos (texto, imagens, legenda, revisão, data) e o
   que trava cada um, em três colunas: em produção, prontas e postadas.
   ============================================================ */

import type { Metadata } from "next";
import Link from "next/link";
import { producao } from "@/lib/marketing/dados";
import { andamento } from "@/lib/marketing/andamento";
import { PILARES, TIPOS, urlFundo, type Peca } from "@/lib/marketing/tipos";
import { hojeSP } from "@/lib/crm/regras";
import { Miniatura } from "@/components/marketing/Miniatura";
import { SinalTime } from "@/components/marketing/SinalTime";
import { AbasMarketing } from "@/components/marketing/AbasMarketing";
import s from "@/app/(pt)/crm/crm.module.css";
import m from "@/app/(pt)/crm/marketing.module.css";

export const metadata: Metadata = { title: "Produção · Marketing" };

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function quando(data: string | null, hoje: string) {
  if (!data) return "sem data";
  if (data === hoje) return "hoje";
  const [, mes, dia] = data.split("-").map(Number);
  return `${dia} ${MESES[mes - 1]}${data < hoje ? ", passou" : ""}`;
}

function Cartao({ p, hoje, noTime }: { p: Peca; hoje: string; noTime: "rodando" | "na_fila" | undefined }) {
  const a = andamento(p);
  const postada = p.status === "postada";
  const atrasada = !postada && p.posta_em !== null && p.posta_em < hoje;
  return (
    <li className={m.prodCartao}>
      <Link href={`/crm/marketing/${p.id}`} className={m.prodCapa} aria-label="Abrir a peça">
        <Miniatura peca={p} largura={92} fundo={urlFundo(p.fundo)} />
      </Link>
      <div className={m.prodTexto}>
        <span className={m.prodMeta}>
          {p.pilar ? <b>{PILARES[p.pilar].nome}</b> : null} {TIPOS[p.tipo].nome}
          {" · "}
          <span className={atrasada ? m.prodAtrasada : ""}>{quando(p.posta_em, hoje)}</span>
        </span>
        <Link href={`/crm/marketing/${p.id}`} className={m.prodGancho}>
          {p.gancho || p.slides[0]?.manchete || p.briefing || "Peça sem briefing"}
        </Link>
        {noTime === "rodando" ? (
          <span className={m.prodTime}>O time está mexendo nela agora</span>
        ) : noTime === "na_fila" ? (
          <span className={m.prodFila}>Na fila do time</span>
        ) : null}
        {postada ? null : (
          <>
            <div className={m.prodBarra} aria-label={`${a.feitos} de ${a.total} passos feitos`}>
              {a.passos.map((x) => (
                <i key={x.nome} className={x.feito ? m.prodBarraFeita : ""} />
              ))}
            </div>
            <ul className={m.prodPassos}>
              {a.passos.map((x) => (
                <li key={x.nome} className={x.feito ? m.prodFeito : m.prodFalta}>
                  <span aria-hidden>{x.feito ? "✓" : "○"}</span> {x.nome}
                  {x.detalhe && (!x.feito || x.nome === "Imagens") ? <em>{x.detalhe}</em> : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </li>
  );
}

export default async function PaginaProducao() {
  const hoje = hojeSP();
  const { abertas, postadas, fila, vistoEm } = await producao();
  /* rodando vence na_fila: a peça pode ter um pedido em cada */
  const noTime = new Map<string, "rodando" | "na_fila">();
  for (const f of fila) {
    if (!f.peca_id || f.status === "feito" || f.status === "erro") continue;
    if (noTime.get(f.peca_id) !== "rodando") noTime.set(f.peca_id, f.status);
  }

  /* em produção: primeiro a que o time está mexendo, depois a que tem data
     mais perto (atrasada no topo), e por último as sem data, da mais
     adiantada para a mais crua */
  const rascunhos = abertas
    .filter((p) => p.status === "rascunho")
    .sort((x, y) => {
      const t = Number(noTime.has(y.id)) - Number(noTime.has(x.id));
      if (t) return t;
      if (x.posta_em && y.posta_em) return x.posta_em.localeCompare(y.posta_em);
      if (x.posta_em || y.posta_em) return x.posta_em ? -1 : 1;
      return andamento(y).feitos - andamento(x).feitos;
    });
  const prontas = abertas
    .filter((p) => p.status === "pronta")
    .sort((x, y) => (x.posta_em ?? "9999").localeCompare(y.posta_em ?? "9999"));

  const colunas: { titulo: string; nota: string; pecas: Peca[]; vazio: string }[] = [
    { titulo: "Em produção", nota: "rascunhos, com o que falta em cada um", pecas: rascunhos, vazio: "Nenhum rascunho. Peça pautas à Paula no Calendário." },
    { titulo: "Prontas", nota: "marcadas como prontas, esperando o dia", pecas: prontas, vazio: "Nenhuma peça pronta esperando." },
    { titulo: "Postadas", nota: "as últimas oito", pecas: postadas, vazio: "Nada postado ainda." },
  ];

  return (
    <div className={m.tela}>
      <AbasMarketing ativa="producao" />
      <header className={m.cabeca}>
        <div>
          <h1>
            Produção<i className={s.ponto}>.</i>
          </h1>
          <p className={m.placar}>
            {rascunhos.length} em produção, {prontas.length} {prontas.length === 1 ? "pronta" : "prontas"}, {postadas.length} postadas por último.
          </p>
        </div>
        <SinalTime vistoEm={vistoEm} abertos={fila} />
      </header>

      <div className={m.prodColunas}>
        {colunas.map((c) => (
          <section key={c.titulo} className={m.prodColuna}>
            <h2>
              <span>
                {c.titulo}
                <i className={s.ponto}>.</i>
              </span>
              <span className={m.cont}>{c.pecas.length}</span>
            </h2>
            <p className={m.bandejaNota}>{c.nota}</p>
            {c.pecas.length === 0 ? (
              <div className={m.bandejaVazia}>
                <p>{c.vazio}</p>
              </div>
            ) : (
              <ul className={m.prodLista}>
                {c.pecas.map((p) => (
                  <Cartao key={p.id} p={p} hoje={hoje} noTime={noTime.get(p.id)} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
