/* ============================================================
   PERFORMANCE › CRIATIVOS › A FICHA DE UM CRIATIVO (19/10/2026)

   A fase 3 do docs/plano-performance-criativos.md: tudo de um criativo numa
   página, para a leitura de 01/10 (a do h27u, que levou uma tarde) sair sem
   abrir o Gerenciador:
   - a curva de retenção com os quadros do vídeo embaixo, segundo a segundo;
   - o caminho na página (Mixpanel) e os leads pelo nome, com a etapa;
   - quanto custou fazer (reais + AI Studio) e o retorno contando isso;
   - as decisões, com data.
   A história inteira do criativo, sem período.
   ============================================================ */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clienteServidor } from "@/lib/crm/supabase";
import { cotacaoDolar } from "@/lib/financeiro/dados";
import {
  agruparCriativos,
  chaveDaUtm,
  chaveDo,
  ligarCRM,
  maiorQueda,
  pct,
  pontosDaCurva,
  type LinhaAnuncio,
  type LinhaDia,
  type LinhaRecebimento,
} from "@/lib/performance/criativos";
import { FormDecisao, FormProducao } from "@/components/performance/FichaCriativo";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/performance.module.css";
import a from "../../analise/analise.module.css";
import c from "../criativos.module.css";

export const metadata: Metadata = { title: "Criativo" };
export const dynamic = "force-dynamic";

const reais = (v: number | null, casas = 2) =>
  v == null ? "–" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas });
const n = (v: number) => v.toLocaleString("pt-BR");
const dataBR = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const ESTAGIO: Record<string, string> = {
  lista: "Na lista",
  contatado: "Contatado",
  follow_up: "Follow-up",
  conversa: "Em conversa",
  previa: "Prévia",
  proposta: "Proposta",
  negociacao: "Negociação",
  geladeira: "Geladeira",
  ganho: "Cliente",
  perdido: "Perdido",
};

type Pagina = { utm_content: string; visitantes: number; interagiram: number; rolaram: number; viram_oferta: number; comecaram: number; enviaram: number };
type Lead = { id: string; nome: string | null; empresa: string | null; estagio: string; created_at: string; anuncio: string | null };

export default async function FichaCriativo({ params }: { params: Promise<{ chave: string }> }) {
  const chave = decodeURIComponent((await params).chave);
  const supabase = await clienteServidor();
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  const { data: todos } = await supabase.from("ads_anuncios").select("ad_id, nome, status, conjunto, campanha, utm_content, destino");
  const meus = ((todos ?? []) as LinhaAnuncio[]).filter((x) => chaveDo(x) === chave);
  if (!meus.length) notFound();
  const ids = meus.map((x) => x.ad_id);

  const [diasR, paginasR, leadsR, recR, curvasR, fichaR, projetosR, cotacao] = await Promise.all([
    supabase.from("ads_meta_dia").select("ad_id, dia, gasto, impressoes, plays_3s, thruplay, cliques_link, lpv, formularios, checkouts, compras").in("ad_id", ids).limit(5000),
    supabase.from("ads_pagina_dia").select("utm_content, visitantes, interagiram, rolaram, viram_oferta, comecaram, enviaram").limit(5000),
    supabase.from("crm_leads").select("id, nome, empresa, estagio, created_at, anuncio").not("anuncio", "is", null).order("created_at", { ascending: false }).limit(5000),
    supabase.from("crm_recebimentos").select("lead_id, valor, valor_estornado, estornado_em, recebido_em, utm:bruto->metadata->>utm_content").limit(5000),
    supabase.from("ads_curvas").select("ad_id, curva, duracao, folha, lido_em").in("ad_id", ids),
    supabase.from("ads_criativos").select("custo_producao, ai_projeto_id, decisoes").eq("chave", chave).maybeSingle(),
    supabase.from("ai_projetos").select("id, nome").order("created_at", { ascending: false }).limit(200),
    cotacaoDolar(),
  ]);

  const dias = (diasR.data ?? []) as LinhaDia[];
  const doCriativo = (utm: string | null) => chaveDaUtm(utm, meus) === chave;
  const paginas = ((paginasR.data ?? []) as Pagina[]).filter((x) => doCriativo(x.utm_content));
  const leads = ((leadsR.data ?? []) as Lead[]).filter((x) => doCriativo(x.anuncio));
  const recebimentos = (recR.data ?? []) as LinhaRecebimento[];
  const g = ligarCRM(
    agruparCriativos(meus, dias),
    meus,
    paginas.map((x) => ({ ...x, pagina: "", dia: hoje })),
    leads,
    recebimentos,
    "2000-01-01",
    hoje,
  )[0];

  /* a curva do anúncio que mais apareceu (é a que tem mais gente por trás) */
  const impPorAd = new Map<string, number>();
  for (const d of dias) impPorAd.set(d.ad_id, (impPorAd.get(d.ad_id) ?? 0) + d.impressoes);
  type Curva = { ad_id: string; curva: number[]; duracao: number | null; folha: string | null; lido_em: string };
  const curva = ((curvasR.data ?? []) as Curva[]).sort((x, y) => (impPorAd.get(y.ad_id) ?? 0) - (impPorAd.get(x.ad_id) ?? 0))[0] ?? null;
  const pontos = curva ? pontosDaCurva(curva.curva, curva.duracao) : [];
  const queda = maiorQueda(pontos);
  const quadros = curva ? Math.min(60, Math.max(1, Math.ceil(curva.duracao ?? 30))) : 0;
  const W = quadros * 96;
  const H = 160;
  const x = (t: number) => (t / quadros) * W;
  const y = (v: number) => H - (v / 100) * H;

  /* a produção: o que foi digitado em reais + o AI Studio em dólar, pela cotação do dia */
  const ficha = fichaR.data as { custo_producao: number | null; ai_projeto_id: string | null; decisoes: { quando: string; texto: string }[] } | null;
  let usd = 0;
  if (ficha?.ai_projeto_id) {
    const [v, i] = await Promise.all([
      supabase.from("ai_videos").select("custo_usd").eq("projeto_id", ficha.ai_projeto_id),
      supabase.from("ai_imagens").select("custo_usd").eq("projeto_id", ficha.ai_projeto_id),
    ]);
    for (const r of [...(v.data ?? []), ...(i.data ?? [])]) usd += Number(r.custo_usd) || 0;
  }
  const producao = (Number(ficha?.custo_producao) || 0) + (usd && cotacao ? usd * cotacao.valor : 0);
  const custoTotal = (g?.gasto ?? 0) + producao;

  const funil = paginas.reduce(
    (t, x) => ({
      visitantes: t.visitantes + x.visitantes,
      interagiram: t.interagiram + x.interagiram,
      rolaram: t.rolaram + x.rolaram,
      viram_oferta: t.viram_oferta + x.viram_oferta,
      comecaram: t.comecaram + x.comecaram,
      enviaram: t.enviaram + x.enviaram,
    }),
    { visitantes: 0, interagiram: 0, rolaram: 0, viram_oferta: 0, comecaram: 0, enviaram: 0 },
  );
  const passos = [
    ["Chegaram", funil.visitantes],
    ["Interagiram", funil.interagiram],
    ["Passaram da metade", funil.rolaram],
    ["Viram a oferta", funil.viram_oferta],
    ["Começaram", funil.comecaram],
    ["Enviaram", funil.enviaram],
  ] as const;

  return (
    <div className={p.tela}>
      <header className={p.cabeca}>
        <div>
          <p className={a.trilha}>
            <Link href="/crm/performance">Performance</Link> / <Link href="/crm/performance/criativos?dias=90">Criativos</Link> / ficha
          </p>
          <h1 className={c.tituloFicha}>
            {g?.nome ?? chave}
            <i className={s.ponto}>.</i>
          </h1>
          <p className={p.placar}>
            {meus.length} {meus.length === 1 ? "anúncio" : "anúncios"} · {[...new Set(meus.map((x) => x.campanha).filter(Boolean))].join(", ")}
            {g?.destino ? ` · ${g.destino}` : ""}
          </p>
        </div>
      </header>

      {g ? (
        <div className={c.cartoes}>
          <div>
            <span>Gasto na Meta</span>
            <b>{reais(g.gasto, 0)}</b>
            <small>{n(g.impressoes)} impressões</small>
          </div>
          <div>
            <span>Pararam / assistiram</span>
            <b>{pct(g.hook)}</b>
            <small>{g.hold != null ? `${pct(g.hold)} assistiram` : "imagem, sem vídeo"}</small>
          </div>
          <div>
            <span>Formulários</span>
            <b>{n(g.formularios)}</b>
            <small>{g.cpl != null ? `${reais(g.cpl)} cada` : "nenhum ainda"}</small>
          </div>
          <div>
            <span>Clientes</span>
            <b>{n(g.clientes)}</b>
            <small>
              de {n(g.leads)} leads{g.cac != null ? `, ${reais(g.cac, 0)} cada` : ""}
            </small>
          </div>
          <div>
            <span>Entrou</span>
            <b>{reais(g.receita, 0)}</b>
            <small>
              {custoTotal ? `${reais(g.receita / custoTotal)} por real, contando a produção` : "sem custo registrado"}
            </small>
          </div>
        </div>
      ) : (
        <p className={p.vazio}>Este criativo ainda não gastou.</p>
      )}

      {/* a curva com os quadros */}
      <section className={a.secao} aria-labelledby="ficha-curva">
        <h2 id="ficha-curva">Onde o vídeo perde gente</h2>
        {curva && pontos.length ? (
          <>
            <p className={c.legenda}>
              {queda
                ? `A maior perda é entre o segundo ${queda.de} e o ${queda.ate}: de ${queda.antes}% para ${queda.depois}% de quem começou a ver. `
                : ""}
              {pontos.find((x) => x.t === 3) ? `No 3º segundo ficam ${pontos.find((x) => x.t === 3)!.v}%.` : ""} Cada quadro embaixo é um segundo do vídeo.
            </p>
            <div className={c.curvaCaixa}>
              <div className={c.curvaRolagem} tabIndex={0} aria-label="Curva de retenção com os quadros do vídeo, role para o lado">
                <div className={c.curvaPalco} style={{ width: `${W / 1.6}px` }}>
                  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={c.curvaSvg} role="img" aria-label={`Curva de retenção: ${pontos.map((q) => `${q.t}s ${q.v}%`).join(", ")}`}>
                    {[25, 50, 75].map((v) => (
                      <line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} className={c.curvaGrade} vectorEffect="non-scaling-stroke" />
                    ))}
                    {queda ? <rect x={x(queda.de)} width={x(queda.ate) - x(queda.de)} y={0} height={H} className={c.curvaQueda} /> : null}
                    <polygon points={`0,${H} ${pontos.map((q) => `${x(q.t)},${y(q.v)}`).join(" ")} ${x(pontos.at(-1)!.t)},${H}`} className={c.curvaArea} />
                    <polyline points={pontos.map((q) => `${x(q.t)},${y(q.v)}`).join(" ")} className={c.curvaLinha} vectorEffect="non-scaling-stroke" />
                  </svg>
                  <div className={c.curvaRotulos} aria-hidden="true">
                    {pontos
                      .filter((q) => q.t <= 15 || q.t % 10 === 0)
                      .map((q) => (
                        <span key={q.t} style={{ left: `${(q.t / quadros) * 100}%` }}>
                          {q.v}%
                        </span>
                      ))}
                  </div>
                  {curva.folha ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={curva.folha} alt="Um quadro por segundo do vídeo" className={c.folha} />
                  ) : (
                    <p className={c.legenda}>Os quadros do vídeo ainda não foram lidos.</p>
                  )}
                </div>
              </div>
            </div>
            <p className={c.rodape}>Curva da Meta lida em {dataBR(curva.lido_em)}, do anúncio com mais impressões deste criativo.</p>
          </>
        ) : (
          <p className={c.legenda}>
            Sem curva: o criativo é imagem, ainda não passou de 500 impressões, ou a leitura não rodou (<code>npx tsx scripts/ler-curvas.ts --gravar</code>).
          </p>
        )}
      </section>

      {/* o caminho na página */}
      <section className={a.secao} aria-labelledby="ficha-pagina">
        <h2 id="ficha-pagina">O que fizeram na página</h2>
        {funil.visitantes ? (
          <ol className={c.funil}>
            {passos.map(([rotulo, valor]) => (
              <li key={rotulo}>
                <span>{rotulo}</span>
                <i style={{ width: `${Math.max(1, (valor / funil.visitantes) * 100)}%` }} aria-hidden="true" />
                <b>
                  {n(valor)} <small>{Math.round((valor / funil.visitantes) * 100)}%</small>
                </b>
              </li>
            ))}
          </ol>
        ) : (
          <p className={c.legenda}>O Mixpanel não registrou visitante real com este criativo.</p>
        )}
      </section>

      {/* os leads */}
      <section className={a.secao} aria-labelledby="ficha-leads">
        <h2 id="ficha-leads">Quem chegou no CRM ({n(leads.length)})</h2>
        {leads.length ? (
          <ul className={c.leads}>
            {leads.slice(0, 60).map((l) => (
              <li key={l.id} data-ganho={l.estagio === "ganho" || undefined}>
                <Link href={`/crm/lead/${l.id}`}>{l.empresa || l.nome || "sem nome"}</Link>
                <span>
                  {ESTAGIO[l.estagio] ?? l.estagio} · {dataBR(l.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={c.legenda}>Nenhum lead do CRM veio deste criativo.</p>
        )}
      </section>

      {/* a produção e as decisões */}
      <section className={a.secao} aria-labelledby="ficha-producao">
        <h2 id="ficha-producao">Quanto custou fazer</h2>
        <p className={c.legenda}>
          {producao
            ? `${reais(producao)} de produção${usd ? ` (${usd.toLocaleString("pt-BR", { style: "currency", currency: "USD" })} no AI Studio${cotacao ? ` a R$ ${cotacao.valor.toFixed(2).replace(".", ",")}` : ", sem cotação hoje: fora da conta"})` : ""}. Somado ao gasto: ${reais(custoTotal)}.`
            : "Nenhum custo de produção registrado."}
        </p>
        <FormProducao
          chave={chave}
          custo={ficha?.custo_producao ?? null}
          projeto={ficha?.ai_projeto_id ?? null}
          projetos={(projetosR.data ?? []) as { id: string; nome: string }[]}
        />
      </section>

      <section className={a.secao} aria-labelledby="ficha-decisoes">
        <h2 id="ficha-decisoes">Decisões</h2>
        {ficha?.decisoes?.length ? (
          <ol className={c.decisoes}>
            {[...ficha.decisoes].reverse().map((d, i) => (
              <li key={i}>
                <span>{dataBR(d.quando)}</span>
                <p>{d.texto}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className={c.legenda}>Nenhuma decisão anotada. Quando cortar, escalar ou mudar, escreva aqui o porquê.</p>
        )}
        <FormDecisao chave={chave} />
      </section>
    </div>
  );
}
