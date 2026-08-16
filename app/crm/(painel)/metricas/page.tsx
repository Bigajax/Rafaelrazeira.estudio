import type { Metadata } from "next";
import Link from "next/link";
import { MetaSemana } from "@/components/crm/MetaSemana";
import { metricas } from "@/lib/crm/dados";
import { dataCurta, dinheiro, rotuloSemana } from "@/lib/crm/regras";
import { NOME_CANAL, NOME_MOTIVO, type Canal, type MotivoPerda } from "@/lib/crm/tipos";
import s from "../../crm.module.css";

export const metadata: Metadata = { title: "Métricas" };

const PERIODOS = [7, 30, 90] as const;

/* ============================================================
   MÉTRICAS

   Tela de servidor inteira, sem um grama de JavaScript no cliente além do
   campo da meta. Todo gráfico daqui é uma div com largura ou altura em
   porcentagem: quatro formas, nenhuma dependência, e a tipografia é a mesma
   do resto da casa, que nenhuma biblioteca de gráfico entregaria.

   A ordem das seções responde a três perguntas em sequência, e ela é a
   ordem em que um estúdio solo precisa delas:
     1. Estou trabalhando o suficiente?   (atividade contra a meta)
     2. O trabalho está virando conversa? (funil e taxa de resposta)
     3. Está virando dinheiro?            (pipeline, faturamento, ciclo)
     4. E quando não vira, por quê?       (motivos de perda)
   ============================================================ */
export default async function PaginaMetricas({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias: bruto } = await searchParams;
  const pedido = Number(bruto);
  const dias = (PERIODOS as readonly number[]).includes(pedido) ? (pedido as 7 | 30 | 90) : 30;

  const m = await metricas(dias);

  const taxaResposta = m.respostas.contatados
    ? Math.round((m.respostas.responderam / m.respostas.contatados) * 100)
    : null;

  /* O teto do gráfico é o maior entre a semana mais cheia e a própria meta:
     sem a meta na conta, uma semana fraca desenharia barras altas e a linha
     tracejada sairia do quadro por cima. */
  const tetoSemana = Math.max(m.metaSemana, ...m.semanas.map((x) => x.n), 1);
  const maiorCanal = Math.max(1, ...m.canais.map(([, n]) => n));
  const maiorMotivo = Math.max(1, ...m.motivos.map(([, n]) => n));

  return (
    <div className={s.wrap}>
      <div className={s.tituloLinha}>
        <h1>
          Métricas<i className={s.ponto}>.</i>
        </h1>
        <nav className={s.periodo} aria-label="Período">
          {PERIODOS.map((p) => (
            <Link
              key={p}
              href={`/crm/metricas?dias=${p}`}
              className={p === dias ? s.periodoAtivo : ""}
              aria-current={p === dias ? "page" : undefined}
            >
              {p} dias
            </Link>
          ))}
        </nav>
      </div>

      <p className={s.subtitulo}>
        De {dataCurta(m.inicio)} a {dataCurta(m.hoje)}.
      </p>

      {/* ---------- os números do período ---------- */}
      <div className={s.cartoes}>
        <div className={s.cartao}>
          <span>Pipeline aberto</span>
          <b className={s.cartaoNum}>{dinheiro(m.pipelineAberto) || "R$ 0"}</b>
          <small>soma dos tickets estimados nos estágios ativos, hoje</small>
        </div>

        <div className={s.cartao}>
          <span>Faturamento fechado</span>
          <b className={s.cartaoNum}>{dinheiro(m.faturamento) || "R$ 0"}</b>
          <small>
            {m.ganhos} {m.ganhos === 1 ? "projeto ganho" : "projetos ganhos"} no período
          </small>
        </div>

        <div className={s.cartao}>
          <span>Taxa de resposta</span>
          <b className={s.cartaoNum}>{taxaResposta === null ? "sem dado" : `${taxaResposta}%`}</b>
          <small>
            {m.respostas.responderam} de {m.respostas.contatados} responderam depois de você falar
          </small>
        </div>

        <div className={s.cartao}>
          <span>Ciclo médio</span>
          <b className={s.cartaoNum}>{m.cicloMedio === null ? "sem dado" : `${m.cicloMedio}d`}</b>
          <small>do primeiro registro até fechar, nos ganhos do período</small>
        </div>
      </div>

      {/* ---------- 1. atividade ---------- */}
      <h2 className={s.rotulo}>
        Toques por semana
        <span className={s.rotuloCont}>{m.toquesPeriodo} no período</span>
      </h2>

      <section className={s.bloco}>
        <div className={s.blocoCab}>
          <span className={s.blocoNota}>
            Só toques de saída: o que você fez, não o que responderam.
          </span>
          <MetaSemana valor={m.metaSemana} />
        </div>

        <div className={s.semanas}>
          {/* A linha da meta atravessa o gráfico inteiro. Sem ela as barras
              são só alturas relativas entre si, e a pergunta desta seção é
              "bati ou não bati". */}
          <div className={s.linhaMeta} style={{ bottom: `${(m.metaSemana / tetoSemana) * 100}%` }}>
            <b>meta {m.metaSemana}</b>
          </div>

          {m.semanas.map(({ semana, n }) => (
            <div key={semana} className={s.semana}>
              <span className={s.semanaNum}>{n || ""}</span>
              <i
                className={`${s.semanaBarra} ${n >= m.metaSemana ? s.semanaBateu : ""}`}
                style={{ height: `${Math.max(1, (n / tetoSemana) * 100)}%` }}
                aria-hidden
              />
              <span className={s.semanaRot}>{rotuloSemana(semana)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- toques por canal ---------- */}
      {m.canais.length ? (
        <>
          <h2 className={s.rotulo}>Toques por canal</h2>
          <section className={s.bloco}>
            <div className={s.barras}>
              {m.canais.map(([canal, n]) => (
                <div key={canal} className={s.barra}>
                  <span className={s.barraRot}>{NOME_CANAL[canal as Canal] ?? canal}</span>
                  <span className={s.barraTrilho}>
                    <i className={s.barraFill} style={{ width: `${(n / maiorCanal) * 100}%` }} />
                  </span>
                  <b className={s.barraNum}>{n}</b>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {/* ---------- 2. conversão ---------- */}
      <h2 className={s.rotulo}>
        Conversão por etapa
        <span className={s.rotuloCont}>{m.baseFunil} leads novos no período</span>
      </h2>

      <section className={s.bloco}>
        <div className={s.funil}>
          {m.funil.map((etapa, i) => {
            const anterior = i === 0 ? m.baseFunil : m.funil[i - 1].n;
            const pct = anterior ? Math.round((etapa.n / anterior) * 100) : null;
            return (
              <div key={etapa.etapa} className={s.funilEtapa}>
                <span className={s.funilNome}>{etapa.nome}</span>
                <b className={s.funilNum}>{etapa.n}</b>
                {/* A porcentagem é sempre contra a etapa ANTERIOR, e não
                    contra o total. É a queda entre dois degraus que diz onde
                    o funil vaza; contra o total, todas as etapas do fim
                    parecem igualmente ruins. */}
                <span className={`${s.funilPct} ${pct !== null && pct < 50 ? s.funilQueda : ""}`}>
                  {pct === null ? "" : `${pct}%`}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- 4. motivos de perda ---------- */}
      <h2 className={s.rotulo}>
        Por que os leads se perdem
        <span className={s.rotuloCont}>{m.perdidos} no período</span>
      </h2>

      <section className={s.bloco}>
        {m.motivos.length === 0 ? (
          <p className={s.blocoNota}>Nenhum lead marcado como perdido neste período.</p>
        ) : (
          <div className={s.barras}>
            {m.motivos.map(([motivo, n]) => (
              <div key={motivo} className={s.barra}>
                <span className={s.barraRot}>{NOME_MOTIVO[motivo as MotivoPerda] ?? motivo}</span>
                <span className={s.barraTrilho}>
                  <i
                    className={`${s.barraFill} ${s.barraPerda}`}
                    style={{ width: `${(n / maiorMotivo) * 100}%` }}
                  />
                </span>
                <b className={s.barraNum}>{n}</b>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
