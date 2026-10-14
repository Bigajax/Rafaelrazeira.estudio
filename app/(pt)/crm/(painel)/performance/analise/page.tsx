/* ============================================================
   PERFORMANCE › ANÁLISE (14/10/2026)

   O Rafael: "o que está na minha mão". A rodada mais recente do
   scripts/analisar-vitrines.ts --gravar, das 7 lojas que pagaram:
   - a nota de cada loja em saúde do site, montagem e catálogo;
   - o que fazer, do mais urgente, com a ação de cada achado;
   - os números dos últimos 30 dias, somados, prontos para copy e anúncio.
   A análise roda no PC (precisa das pastas das lojas); esta tela só mostra.
   ============================================================ */

import type { Metadata } from "next";
import Link from "next/link";
import { clienteServidor } from "@/lib/crm/supabase";
import type { ResultadoLoja } from "@/lib/analise/checagens";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/performance.module.css";
import a from "./analise.module.css";

export const metadata: Metadata = { title: "Análise das vitrines" };
export const dynamic = "force-dynamic";

type Rodada = {
  quando: string;
  versao_pacote: string | null;
  lojas: ResultadoLoja[];
  estudio: { lojas: number; pessoas: number; visitas: number; pecasAbertas: number; chamaram: number; origem: Record<string, number> };
};

const NOME_NOTA = { saude: "Saúde do site", montagem: "Montagem", catalogo: "Catálogo" } as const;
const NOME_ORIGEM: Record<string, string> = { instagram: "Instagram", google: "Google", facebook: "Facebook", whatsapp: "WhatsApp", direto: "Direto", outro: "Outro" };
const QUANDO = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const n = (v: number) => v.toLocaleString("pt-BR");

export default async function PaginaAnalise() {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("perf_analises").select("criado_em, resultado").order("criado_em", { ascending: false }).limit(1);
  const semTabela = Boolean(error && /perf_analises|does not exist|schema cache/i.test(error.message));
  const rodada = (data?.[0]?.resultado ?? null) as Rodada | null;

  const todos = (rodada?.lojas ?? [])
    .flatMap((l) => l.achados.map((x) => ({ ...x, loja: l.nome })))
    .sort((x, y) => (x.nivel === y.nivel ? 0 : x.nivel === "vermelho" ? -1 : 1));
  const vermelhos = todos.filter((x) => x.nivel === "vermelho").length;
  const e = rodada?.estudio;
  const taxa = e && e.pessoas ? Math.round((e.chamaram / e.pessoas) * 100) : 0;
  const origemTop = e ? Object.entries(e.origem).sort((x, y) => y[1] - x[1]) : [];

  return (
    <div className={p.tela}>
      <header className={p.cabeca}>
        <div>
          <p className={a.trilha}>
            <Link href="/crm/performance">Performance</Link> / Análise
          </p>
          <h1>
            Análise das vitrines<i className={s.ponto}>.</i>
          </h1>
          <p className={p.placar}>
            {rodada
              ? `Rodada de ${QUANDO.format(new Date(rodada.quando))}: ${rodada.lojas.length} lojas, ${vermelhos} ${vermelhos === 1 ? "problema urgente" : "problemas urgentes"}, ${todos.length - vermelhos} para melhorar.`
              : "Nenhuma análise gravada ainda."}
          </p>
        </div>
      </header>

      {semTabela ? (
        <p className={p.aviso}>
          A tabela da análise ainda não existe. Rode o <code>supabase/perf-analises.sql</code> no SQL Editor do Supabase do estúdio.
        </p>
      ) : null}

      <p className={a.como}>
        Para atualizar, no PC: <code>unset ANTHROPIC_API_KEY; npx tsx scripts/analisar-vitrines.ts --gravar</code> (uma vez por semana, junto do{" "}
        <code>conferir-vitrines.ts</code>).
      </p>

      {rodada ? (
        <>
          {/* as notas de cada loja */}
          <section className={a.secao} aria-labelledby="analise-lojas">
            <h2 id="analise-lojas">As lojas</h2>
            <ul className={a.lojas}>
              {rodada.lojas.map((l) => (
                <li key={l.perf} className={a.loja}>
                  <div className={a.lojaNome}>
                    <b>{l.nome}</b>
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.url.replace(/^https:\/\//, "")}
                    </a>
                  </div>
                  <div className={a.notas}>
                    {(Object.keys(NOME_NOTA) as (keyof typeof NOME_NOTA)[]).map((k) => (
                      <span key={k} className={a.nota} data-nivel={l.notas[k]}>
                        <i aria-hidden="true" />
                        {NOME_NOTA[k]}
                      </span>
                    ))}
                  </div>
                  <p className={a.lojaResumo}>
                    {l.numeros ? `${n(l.numeros.pessoas)} pessoas e ${n(l.numeros.chamaram)} no WhatsApp em 30 dias` : "sem contagem"}
                    {l.fatos.pecas_no_site != null ? `, ${n(Number(l.fatos.pecas_no_site))} peças no site` : ""}
                    {l.fatos.pacote ? `, painel ${l.fatos.pacote}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* o que fazer */}
          <section className={a.secao} aria-labelledby="analise-fazer">
            <h2 id="analise-fazer">O que fazer, do mais urgente</h2>
            {todos.length ? (
              <ol className={a.fazer}>
                {todos.map((x, i) => (
                  <li key={i} data-nivel={x.nivel}>
                    <span className={a.fazerLoja}>
                      {x.loja} · {NOME_NOTA[x.area]}
                    </span>
                    <p className={a.fazerTexto}>{x.texto}</p>
                    <p className={a.fazerAcao}>{x.acao}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={p.vazio}>Nada pendente nas 7 lojas.</p>
            )}
          </section>

          {/* os números para anúncio */}
          {e ? (
            <section className={a.secao} aria-labelledby="analise-numeros">
              <h2 id="analise-numeros">Números para anúncio (últimos 30 dias)</h2>
              <p className={a.numerosNota}>Somados de {e.lojas} vitrines do estúdio. Cada número é contado, nunca estimado: dá para usar em copy como está.</p>
              <div className={a.numeros}>
                <div>
                  <b>{n(e.pessoas)}</b>
                  <span>pessoas entraram nas vitrines</span>
                </div>
                <div>
                  <b>{n(e.pecasAbertas)}</b>
                  <span>vezes uma peça foi aberta</span>
                </div>
                <div>
                  <b>{n(e.chamaram)}</b>
                  <span>pessoas chamaram a loja no WhatsApp</span>
                </div>
                <div>
                  <b>{taxa}%</b>
                  <span>de quem entrou chamou no WhatsApp</span>
                </div>
              </div>
              {origemTop.length ? (
                <p className={a.origem}>
                  De onde vieram:{" "}
                  {origemTop.map(([k, v], i) => (
                    <span key={k}>
                      {i ? ", " : ""}
                      {NOME_ORIGEM[k] ?? k} {n(v)}
                    </span>
                  ))}
                  .
                </p>
              ) : null}
              <div className={a.frases}>
                <p className={a.frasesTitulo}>Frases prontas, com os números de hoje</p>
                <ul>
                  <li>
                    &ldquo;Em 30 dias, as vitrines do estúdio levaram {n(e.chamaram)} pessoas a chamar a loja no WhatsApp.&rdquo;
                  </li>
                  <li>
                    &ldquo;{n(e.pessoas)} pessoas entraram nas vitrines que eu fiz, no último mês.&rdquo;
                  </li>
                  {taxa ? <li>&ldquo;De cada 100 pessoas que entram numa vitrine minha, {taxa} chamam a loja no WhatsApp.&rdquo;</li> : null}
                </ul>
              </div>
              <ul className={a.porLoja}>
                {rodada.lojas
                  .filter((l) => l.numeros && l.numeros.pessoas)
                  .sort((x, y) => (y.numeros?.pessoas ?? 0) - (x.numeros?.pessoas ?? 0))
                  .map((l) => (
                    <li key={l.perf}>
                      <b>{l.nome}</b>: {n(l.numeros!.pessoas)} pessoas, {n(l.numeros!.chamaram)} no WhatsApp
                      {l.numeros!.procuraram.length ? `; procuraram e não acharam: ${l.numeros!.procuraram.slice(0, 3).map((b) => `"${b.termo}"`).join(", ")}` : ""}
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
