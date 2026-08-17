import type { Metadata } from "next";
import Link from "next/link";
import { MetaSemana } from "@/components/crm/MetaSemana";
import { metricas } from "@/lib/crm/dados";
import { dataCurta, dinheiro, rotuloSemana } from "@/lib/crm/regras";
import { NOME_CANAL, NOME_MOTIVO, type Canal, type MotivoPerda } from "@/lib/crm/tipos";
import s from "../../crm.module.css";

export const metadata: Metadata = { title: "Métricas" };

const PERIODOS = [7, 30, 90] as const;

/* ---------- números de exemplo ----------
   `?exemplo=1` troca a consulta ao banco por este objeto e nada mais: a
   tela é a mesma, o Supabase nem é chamado. Existe para ver a tela
   vestida antes de os números reais chegarem lá, e os valores foram
   escolhidos para acender cada estado visual que a tela tem: duas semanas
   batendo a meta (verde), a semana corrente pela metade (hachura), uma
   queda abaixo de 50% no funil (rosa), faturamento existindo (verde na
   placa). */
type Metricas = Awaited<ReturnType<typeof metricas>>;

const EXEMPLO: Metricas = {
  dias: 30,
  inicio: "2026-07-18",
  hoje: "2026-08-16",
  metaSemana: 50,
  semanas: [
    { semana: "2026-07-13", n: 38 },
    { semana: "2026-07-20", n: 52 },
    { semana: "2026-07-27", n: 41 },
    { semana: "2026-08-03", n: 57 },
    { semana: "2026-08-10", n: 23 },
  ],
  canais: [
    ["whatsapp", 132],
    ["instagram", 51],
    ["email", 19],
    ["ligacao", 9],
  ],
  funil: [
    { etapa: "contatado", nome: "Contatado", n: 29 },
    { etapa: "conversa", nome: "Conversa", n: 18 },
    { etapa: "previa", nome: "Prévia", n: 11 },
    { etapa: "proposta", nome: "Proposta", n: 7 },
    { etapa: "ganho", nome: "Ganho", n: 3 },
  ],
  baseFunil: 34,
  respostas: { responderam: 18, contatados: 29 },
  cicloMedio: 19,
  pipelineAberto: 27400,
  faturamento: 8400,
  ganhos: 3,
  motivos: [
    ["sem_resposta", 4],
    ["preco", 3],
    ["timing", 2],
    ["fechou_com_outro", 1],
  ],
  perdidos: 10,
  toquesPeriodo: 211,
};

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
  searchParams: Promise<{ dias?: string; exemplo?: string }>;
}) {
  const { dias: bruto, exemplo } = await searchParams;
  const pedido = Number(bruto);
  const dias = (PERIODOS as readonly number[]).includes(pedido) ? (pedido as 7 | 30 | 90) : 30;

  const m = exemplo ? { ...EXEMPLO, dias } : await metricas(dias);

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
              href={`/crm/metricas?dias=${p}${exemplo ? "&exemplo=1" : ""}`}
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
        {exemplo ? " Números de exemplo, só para ver a tela." : ""}
      </p>

      {/* ---------- a placa de apuração ----------
          Os quatro números do período numa placa de tinta só, sangrando de
          borda a borda: é a linha de status desta rota, o trabalho que a
          faixa faz no Hoje. A cor dentro dela informa: verde é ganho, voz
          fraca é ausência de dado. */}
      <section className={s.placar}>
        <div className={s.placarCel}>
          <span>Pipeline aberto</span>
          <b className={s.placarNum}>{dinheiro(m.pipelineAberto) || "R$ 0"}</b>
          <small>soma dos tickets estimados nos estágios ativos, hoje</small>
        </div>

        <div className={s.placarCel}>
          <span>Faturamento fechado</span>
          <b className={`${s.placarNum} ${m.faturamento ? s.placarGanho : ""}`}>
            {dinheiro(m.faturamento) || "R$ 0"}
          </b>
          <small>
            {m.ganhos} {m.ganhos === 1 ? "projeto ganho" : "projetos ganhos"} no período
          </small>
        </div>

        <div className={s.placarCel}>
          <span>Taxa de resposta</span>
          <b className={`${s.placarNum} ${taxaResposta === null ? s.placarSem : ""}`}>
            {taxaResposta === null ? "sem dado" : `${taxaResposta}%`}
          </b>
          <small>
            {m.respostas.responderam} de {m.respostas.contatados} responderam depois de você falar
          </small>
        </div>

        <div className={s.placarCel}>
          <span>Ciclo médio</span>
          <b className={`${s.placarNum} ${m.cicloMedio === null ? s.placarSem : ""}`}>
            {m.cicloMedio === null ? "sem dado" : `${m.cicloMedio}d`}
          </b>
          <small>do primeiro registro até fechar, nos ganhos do período</small>
        </div>
      </section>

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

        {/* A amostra de cada item é a própria tinta do gráfico, na mesma
            ordem em que a coluna se lê de baixo para cima. */}
        <div className={s.legenda}>
          <span className={s.legendaItem}>
            <i className={`${s.legendaCor} ${s.semanaCheio}`} aria-hidden /> Toques
          </span>
          <span className={s.legendaItem}>
            <i className={`${s.legendaCor} ${s.semanaFalta}`} aria-hidden /> Faltou para a meta
          </span>
          <span className={s.legendaItem}>
            <i className={`${s.legendaCor} ${s.semanaBateu}`} aria-hidden /> Bateu a meta
          </span>
          <span className={s.legendaItem}>
            <i className={`${s.legendaCor} ${s.semanaAndamento}`} aria-hidden /> Semana em curso
          </span>
        </div>

        <div className={s.semanas}>
          {/* A linha da meta atravessa o gráfico inteiro. Sem ela as barras
              são só alturas relativas entre si, e a pergunta desta seção é
              "bati ou não bati". Ela mora num plano que cobre exatamente a
              área das barras, para a porcentagem dela e a das barras serem
              a mesma régua. */}
          <div className={s.semanasPlano} aria-hidden>
            <div className={s.linhaMeta} style={{ bottom: `${(m.metaSemana / tetoSemana) * 100}%` }}>
              <b>meta {m.metaSemana}</b>
            </div>
          </div>

          {m.semanas.map(({ semana, n }, i) => {
            /* Semana que bateu a meta é uma coluna INTEIRA verde, a mesma
               regra da régua da meta no Hoje. Quem não bateu mostra os
               toques em tinta e o que faltou em hachura rosa por cima. A
               semana corrente é a última da série: ela ainda não deve
               nada, então os toques dela saem em hachura de tinta e o
               rosa só chega quando a semana fecha. */
            const emCurso = i === m.semanas.length - 1;
            const bateu = n >= m.metaSemana;
            const falta = emCurso ? 0 : m.metaSemana - n;
            const alt = (x: number) => ({ height: `${(x / tetoSemana) * 100}%` });
            return (
              <div key={semana} className={s.semana}>
                <div className={s.semanaArea}>
                  <span className={`${s.semanaNum} ${bateu ? s.semanaNumBateu : ""}`}>{n}</span>
                  {bateu ? (
                    <i className={`${s.semanaSeg} ${s.semanaBateu}`} style={alt(n)} aria-hidden />
                  ) : (
                    <>
                      {falta > 0 && (
                        <i className={`${s.semanaSeg} ${s.semanaFalta}`} style={alt(falta)} aria-hidden />
                      )}
                      {n > 0 && (
                        <i
                          className={`${s.semanaSeg} ${emCurso ? s.semanaAndamento : s.semanaCheio}`}
                          style={alt(n)}
                          aria-hidden
                        />
                      )}
                    </>
                  )}
                </div>
                <span className={s.semanaRot}>{rotuloSemana(semana)}</span>
              </div>
            );
          })}
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
            /* A régua enche contra a BASE do período, não contra a primeira
               etapa: o trecho vazio da primeira régua já é informação (quem
               entrou e nunca foi contatado), e contra a primeira etapa esse
               vazio desapareceria. */
            const largura = m.baseFunil ? (etapa.n / m.baseFunil) * 100 : 0;
            return (
              <div key={etapa.etapa} className={s.funilEtapa}>
                <span className={s.funilNome}>{etapa.nome}</span>
                <span className={s.funilTrilho}>
                  <i
                    className={`${s.funilFill} ${etapa.etapa === "ganho" ? s.funilGanho : ""}`}
                    style={{ width: etapa.n ? `max(3px, ${largura}%)` : 0 }}
                    aria-hidden
                  />
                </span>
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
