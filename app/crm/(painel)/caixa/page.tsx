/* ============================================================
   O CAIXA — a aba do dinheiro

   ---------- por que a primeira versão não tinha personalidade ----------
   Ela era quatro números iguais numa placa, seguidos de três cartões
   brancos do mesmo tamanho e um gráfico de 250px de altura. Com o CRM
   vazio, os quatro números eram quatro "R$ 0" cinzas idênticos e os três
   cartões diziam três frases de desculpa. Um relatório, não um instrumento.

   O erro de fundo: a tela foi desenhada para o estado CHEIO e entregue no
   estado VAZIO, que é o que se vê no primeiro dia e por várias semanas.

   ---------- o que ela é agora ----------
   A mesma folha de grafite que a carta da vez usa: um plano de tinta
   sangrando de ponta a ponta, com o número em corpo de cartaz à esquerda,
   os fatos da carteira numa coluna à direita, e entre eles a RÉGUA DO MÊS.

   A régua é a assinatura desta tela, e é irmã da linha do horizonte do
   painel Hoje: um instrumento que responde de relance, sem legenda. Trilho
   cheio é o previsto do mês, o preenchido é o que entrou. Cheia quer dizer
   "o mês está pago", curta quer dizer "falta entrar", e a hachura rosa é o
   que venceu e não veio.

   ---------- e as seções só existem quando existem ----------
   Nada de cartão vazio pedindo desculpa. Sem devedor, a seção some (a
   coluna de fatos já disse "em atraso: R$ 0", em esmeralda). Sem dinheiro
   no ano, o gráfico some. Sem contrato nenhum, a tela inteira vira um
   convite, do mesmo jeito que o `DiaLimpo` faz na fila.

   ---------- a distinção que vale a aba inteira ----------
   Métricas responde "o estúdio está funcionando?" e mostra o que foi
   CONTRATADO. Esta responde "o dinheiro entrou?" e mostra o que foi
   RECEBIDO. Fechar R$ 999 em agosto e receber R$ 199 em agosto e R$ 800 em
   setembro é o caso normal deste estúdio: um número só teria que mentir
   sobre um dos dois meses.
   ============================================================ */

import type { Metadata } from "next";
import Link from "next/link";
import { caixa, type Caixa } from "@/lib/crm/dados";
import {
  dinheiroExato,
  mesesAFrente,
  mesesDoAno,
  nomeDaSituacao,
  quitacaoDoContrato,
  rotuloMes,
  situacaoDaParcela,
} from "@/lib/crm/financeiro";
import { hojeSP } from "@/lib/crm/regras";
import type { Contrato, ParcelaPainel } from "@/lib/crm/tipos";
import { BaixaRapida } from "@/components/crm/BaixaRapida";
import { AmarrarRecebimento } from "@/components/crm/AmarrarRecebimento";
import s from "@/app/crm/crm.module.css";

export const metadata: Metadata = { title: "Caixa" };

const MES_POR_EXTENSO = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function PaginaCaixa({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; exemplo?: string }>;
}) {
  const { ano: bruto, exemplo } = await searchParams;
  const agora = new Date().getUTCFullYear();
  const pedido = Number(bruto);
  /* Janela curta de propósito: o estúdio nasceu em 2026, e um seletor que
     oferece 2019 é um seletor que não sabe do que está falando. */
  const ano = pedido >= 2026 && pedido <= agora + 1 ? pedido : agora;

  /* O `?exemplo=1` NÃO chama o Supabase: é a mesma peça que a tela de
     métricas já tem, e aqui ela importa mais, porque o caixa só enche
     quando alguém paga e até lá não haveria como olhar para esta tela e
     decidir se ela está boa. */
  const c = exemplo ? exemploDoCaixa(ano, hojeSP()) : await caixa(ano);
  const anos = [agora, agora - 1].filter((a) => a >= 2026);

  const noAno = c.meses.reduce((t, m) => t + m.valor, 0);
  const mesNome = MES_POR_EXTENSO[Number(c.mesAtual.slice(5, 7)) - 1] ?? "";

  /* ---------- a régua do mês ----------
     O trilho é o previsto; o preenchido é o que entrou. Quando entra mais
     do que vencia (parcela de julho paga em agosto), ela enche e para: uma
     régua de 140% desenharia para fora do próprio trilho, e o excedente já
     está dito no número em corpo de cartaz logo acima.

     Sem nada previsto, a base vira o próprio recebido: assim um mês que só
     teve pagamento adiantado ainda desenha uma régua cheia em vez de uma
     divisão por zero. */
  const baseMes = Math.max(c.previstoNoMes, c.recebidoNoMes, 1);
  const pctRecebido = Math.min(100, (c.recebidoNoMes / baseMes) * 100);
  const pctAtraso = Math.min(100 - pctRecebido, (c.emAtraso / baseMes) * 100);
  const mesPago = c.previstoNoMes > 0 && c.recebidoNoMes >= c.previstoNoMes;

  /* ---------- a tela sem nada ----------
     Um convite e mais nada, do jeito que o `DiaLimpo` resolve a fila
     limpa. Quatro zeros numa placa e três cartões de desculpa não são
     "vazio", são uma ferramenta parecendo quebrada. */
  const semNada = c.clientes.length === 0 && c.semDono.length === 0 && noAno === 0;

  return (
    <div className={s.wrap}>
      <div className={s.tituloLinha}>
        <h1>
          Caixa<i className={s.ponto}>.</i>
        </h1>
        {anos.length > 1 && !semNada ? (
          <nav className={s.periodo} aria-label="Ano">
            {anos.map((a) => (
              <Link
                key={a}
                href={`/crm/caixa?ano=${a}`}
                className={a === ano ? s.periodoAtivo : ""}
                aria-current={a === ano ? "page" : undefined}
              >
                {a}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      <p className={s.subtitulo}>
        O que entrou de verdade, e não o que foi vendido. As vendas fechadas ficam em{" "}
        <Link href="/crm/metricas">Métricas</Link>, e os dois números não batem de propósito:
        fechar em agosto e receber em setembro é o normal aqui.
      </p>

      {/* ============================================================
          A FOLHA — o objeto desta tela
          O mesmo plano de tinta da carta da vez, sangrando de ponta a
          ponta. Ele existe para a aba ter um corpo: sem ele, dinheiro é a
          única tela do CRM que abre com uma tabela.
          ============================================================ */}
      <section className={`${s.caixaFolha} ${c.emAtraso ? s.caixaFolhaDeve : ""}`}>
        {semNada ? (
          /* ---------- o vazio como convite ----------
             Ele ocupa as DUAS colunas, e a da direita não é enfeite: ela
             responde a pergunta que um caixa zerado levanta ("e como isso
             enche?") no lugar exato onde, com dados, moram os fatos da
             carteira. Sem ela sobrava meia folha de grafite vazia, que é o
             mesmo desperdício que fez a fila do dia virar carta. */
          <div className={s.caixaCorpo}>
            <div className={s.caixaVazio}>
              <span className={s.caixaMes}>Caixa</span>
              <p className={s.caixaNumero}>
                Nada entrou ainda<i className={s.vezPonto}>.</i>
              </p>
              <p className={s.caixaConvite}>
                O caixa nasce na ficha de um lead ganho: monte o contrato e as parcelas passam a
                te cobrar sozinhas, aqui e na fila do dia.
              </p>
              <span className={s.caixaBotoes}>
                <Link href="/crm/pipeline" className={s.btnAcao}>
                  Ir para o quadro
                </Link>
                <Link href="/crm/caixa?exemplo=1" className={s.btnEscuro}>
                  Ver a tela com números
                </Link>
              </span>
            </div>

            <aside className={s.vezDossie}>
              {[
                ["1", "Monte o contrato", "na ficha de um lead ganho, a partir do plano da própria proposta"],
                ["2", "As parcelas cobram", "a que vence aparece na fila do dia, com o passo já escrito"],
                ["3", "A baixa é sozinha", "pagou pela página da proposta, o webhook dá baixa e move para Ganho"],
              ].map(([n, titulo, nota]) => (
                <div key={n} className={s.vezFato}>
                  <span className={s.vezFatoRot}>Passo {n}</span>
                  <b className={s.vezFatoVal}>{titulo}</b>
                  <span className={s.vezFatoNota}>{nota}</span>
                </div>
              ))}
            </aside>
          </div>
        ) : (
          <div className={s.caixaCorpo}>
            <div className={s.caixaPrincipal}>
              <span className={s.caixaMes}>{mesNome} de {c.mesAtual.slice(0, 4)}</span>

              {/* O número em corpo de cartaz, com o ponto rosa da casa. É a
                  única coisa desta tela que se lê de longe, e é a pergunta
                  que se faz toda manhã. */}
              <p className={`${s.caixaNumero} ${c.recebidoNoMes ? s.caixaNumeroVivo : ""}`}>
                {dinheiroExato(c.recebidoNoMes)}
                <i className={s.vezPonto}>.</i>
              </p>
              <p className={s.caixaLegenda}>
                {c.recebimentosDoMes
                  ? `entrou este mês, em ${c.recebimentosDoMes} ${c.recebimentosDoMes === 1 ? "pagamento" : "pagamentos"}`
                  : "entrou este mês"}
                {c.previstoNoMes
                  ? ` · ${dinheiroExato(c.previstoNoMes)} previstos`
                  : " · nada vencia neste mês"}
              </p>

              {/* ---------- A RÉGUA DO MÊS ----------
                  Irmã da linha do horizonte do painel Hoje: um instrumento
                  que responde de relance e sem legenda. O vazio é que dá
                  escala ao cheio, então o trilho aparece sempre. */}
              <div
                className={s.caixaRegua}
                role="img"
                aria-label={`${dinheiroExato(c.recebidoNoMes)} recebidos de ${dinheiroExato(c.previstoNoMes)} previstos no mês${
                  c.emAtraso ? `, com ${dinheiroExato(c.emAtraso)} vencidos e não pagos` : ""
                }.`}
              >
                <i
                  className={`${s.caixaReguaFill} ${mesPago ? s.caixaReguaPago : ""}`}
                  style={{ width: `${pctRecebido}%` }}
                />
                {pctAtraso > 0 ? (
                  <i className={s.caixaReguaAtraso} style={{ width: `${pctAtraso}%` }} />
                ) : null}
              </div>

              <div className={s.caixaLegendaRegua}>
                <span>
                  <i className={`${s.caixaAmostra} ${mesPago ? s.caixaReguaPago : s.caixaReguaFill}`} />
                  recebido
                </span>
                {c.emAtraso ? (
                  <span>
                    <i className={`${s.caixaAmostra} ${s.caixaReguaAtraso}`} />
                    vencido e não pago
                  </span>
                ) : null}
                <span>
                  <i className={`${s.caixaAmostra} ${s.caixaAmostraVazia}`} />a vencer
                </span>
              </div>
            </div>

            {/* A coluna da direita é a CARTEIRA, e a régua ao lado é o MÊS:
                duas perguntas diferentes, sem repetir número nenhum. Mesma
                peça do dossiê da carta da vez, e sempre os três fatos, na
                mesma ordem, para o olho não procurar. */}
            <aside className={s.vezDossie}>
              <div className={s.vezFato}>
                <span className={s.vezFatoRot}>Em atraso</span>
                <b className={`${s.vezFatoVal} ${c.emAtraso ? s.caixaDeve : s.caixaEmDia}`}>
                  {dinheiroExato(c.emAtraso)}
                </b>
                <span className={s.vezFatoNota}>
                  {c.devendo.length
                    ? `${c.devendo.length} ${c.devendo.length === 1 ? "parcela venceu" : "parcelas venceram"}`
                    : "ninguém devendo"}
                </span>
              </div>

              <div className={s.vezFato}>
                <span className={s.vezFatoRot}>A receber</span>
                <b className={`${s.vezFatoVal} ${c.aReceber ? "" : s.vezFatoVazio}`}>
                  {dinheiroExato(c.aReceber)}
                </b>
                <span className={s.vezFatoNota}>
                  {c.aReceberN} {c.aReceberN === 1 ? "parcela em aberto" : "parcelas em aberto"}
                </span>
              </div>

              <div className={s.vezFato}>
                <span className={s.vezFatoRot}>Contratado</span>
                <b className={`${s.vezFatoVal} ${c.contratado ? "" : s.vezFatoVazio}`}>
                  {dinheiroExato(c.contratado)}
                </b>
                <span className={s.vezFatoNota}>
                  {c.clientes.length} {c.clientes.length === 1 ? "contrato" : "contratos"}
                </span>
              </div>
            </aside>
          </div>
        )}
      </section>

      {/* ---------- quem está me devendo ----------
          Só existe quando existe. Sem devedor, o "em atraso R$ 0" em
          esmeralda na folha já disse, e um cartão dizendo "ninguém está
          atrasado" seria a mesma notícia pela segunda vez. */}
      {c.devendo.length ? (
        <>
          <h2 className={`${s.rotulo} ${s.rotuloAlerta}`}>
            Quem está me devendo
            <span className={s.rotuloCont}>{c.devendo.length}</span>
          </h2>
          <section className={`${s.bloco} ${s.blocoDivida}`}>
            <div className={s.dividas}>
              {c.devendo.map(({ parcela, s: sit }) => (
                <div key={parcela.id} className={s.divida}>
                  <div className={s.dividaQuem}>
                    <Link href={`/crm/lead/${parcela.lead_id}`} className={s.dividaNome}>
                      {parcela.lead_nome}
                    </Link>
                    <span className={s.dividaCtx}>
                      {parcela.rotulo}
                      {parcela.contrato_titulo ? ` · ${parcela.contrato_titulo}` : ""}
                    </span>
                  </div>
                  <b className={s.dividaValor}>{dinheiroExato(sit.saldo)}</b>
                  <span className={s.dividaSinal}>{nomeDaSituacao(sit)}</span>
                  <div className={s.dividaAcoes}>
                    <BaixaRapida
                      parcelaId={parcela.id}
                      saldo={sit.saldo}
                      hoje={c.hoje}
                      metodoPrevisto={parcela.metodo_previsto}
                      compacto
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {/* ---------- o dinheiro sem dono ----------
          O que o webhook gravou e não conseguiu amarrar: o cliente pagou
          antes de o contrato existir. Ele fica aqui em vez de ser
          descartado, e é a razão de `parcela_id` ser anulável. */}
      {c.semDono.length ? (
        <>
          <h2 className={`${s.rotulo} ${s.rotuloAlerta}`}>
            Entrou sem contrato
            <span className={s.rotuloCont}>{c.semDono.length}</span>
          </h2>
          <section className={`${s.bloco} ${s.blocoDivida}`}>
            <p className={s.blocoNota}>
              Dinheiro que chegou e não bateu com nenhuma parcela. Amarre no contrato certo, ou
              monte o contrato primeiro e volte aqui.
            </p>
            {c.semDono.map((r) => (
              <AmarrarRecebimento
                key={r.id}
                recebimento={{
                  id: r.id,
                  valor: Number(r.valor),
                  recebido_em: r.recebido_em,
                  metodo: r.metodo,
                  origem: r.origem,
                  referencia: r.mp_external_reference,
                }}
                candidatas={c.clientes.flatMap((cl) =>
                  cl.parcelas
                    .filter((p) => !p.cancelada_em && p.recebido < p.valor)
                    .map((p) => ({
                      id: p.id,
                      rotulo: `${cl.lead?.nome ?? "?"} · ${p.rotulo} · ${dinheiroExato(p.valor)}`,
                    })),
                )}
              />
            ))}
          </section>
        </>
      ) : null}

      {/* ============================================================
          A RECEBER — a lista que faltava

          Até 20/08 "a receber" era um número solto na folha, e a única
          lista longa da tela era a de contratos. Com vinte contratos ela
          vira duas telas de barras quase idênticas, metade delas verdes
          dizendo "quitado", que é a informação com menos trabalho dentro do
          CRM inteiro: um livro-razão, não um instrumento.

          Estas duas seções são limitadas pelo HORIZONTE e não pelo
          histórico, então não crescem com o tempo: seis colunas de altura
          fixa, e a lista do que vence nos próximos 30 dias.
          ============================================================ */}
      {c.aReceber > 0 ? (
        <>
          <h2 className={s.rotulo}>
            A receber
            <span className={s.rotuloCont}>
              {dinheiroExato(c.aReceber)} em {c.aReceberN}{" "}
              {c.aReceberN === 1 ? "parcela" : "parcelas"}
            </span>
          </h2>
          <section className={s.bloco}>
            <Previsao previsao={c.previsao} depois={c.depois} />
          </section>
        </>
      ) : null}

      {c.aVencer.length ? (
        <>
          <h2 className={s.rotulo}>
            Vence em 30 dias
            <span className={s.rotuloCont}>{c.aVencer.length}</span>
          </h2>
          <section className={s.bloco}>
            <div className={s.dividas}>
              {c.aVencer.map(({ parcela, s: sit }) => (
                <div key={parcela.id} className={s.divida}>
                  <div className={s.dividaQuem}>
                    <Link href={`/crm/lead/${parcela.lead_id}`} className={s.dividaNome}>
                      {parcela.lead_nome}
                    </Link>
                    <span className={s.dividaCtx}>
                      {parcela.rotulo}
                      {parcela.contrato_titulo ? ` · ${parcela.contrato_titulo}` : ""}
                    </span>
                  </div>
                  <b className={s.dividaValor}>{dinheiroExato(sit.saldo)}</b>
                  {/* Voz calma: estas não estão atrasadas, e o rosa da linha
                      de cima existe justamente para separar as duas. */}
                  <span className={`${s.dividaSinal} ${s.dividaSinalCalmo}`}>
                    {nomeDaSituacao(sit)}
                  </span>
                  <div className={s.dividaAcoes}>
                    <BaixaRapida
                      parcelaId={parcela.id}
                      saldo={sit.saldo}
                      hoje={c.hoje}
                      metodoPrevisto={parcela.metodo_previsto}
                      compacto
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {/* ---------- os contratos, recolhidos ----------
          Eles saíram da posição de lista e viraram arquivo. "Quanto o
          Baummer já pagou" é uma pergunta que se faz sobre UM cliente, e ela
          já está respondida na ficha dele, que é onde ela pertence. Aqui ela
          custava uma tela inteira todo dia para responder uma pergunta que
          ninguém fez.

          `<details>` nativo: sem estado, sem client component, sem
          biblioteca. É o mesmo padrão da placa de Ganho e Perdido no quadro,
          que também guarda a lista atrás de um clique. */}
      {c.clientes.length ? (
        <details className={s.arquivo}>
          <summary className={s.arquivoPuxador}>
            <span>
              {c.clientes.length} {c.clientes.length === 1 ? "contrato" : "contratos"}
              {c.quitados ? ` · ${c.quitados} ${c.quitados === 1 ? "quitado" : "quitados"}` : ""}
              {c.quitadoTotal ? ` · ${dinheiroExato(c.quitadoTotal)} já pagos` : ""}
            </span>
            <i className={s.arquivoAbre}>ver todos</i>
          </summary>
          <section className={s.bloco}>
            <div className={s.funil}>
              {c.clientes.map(({ contrato, lead, q }) => (
                <div key={contrato.id} className={s.funilEtapa}>
                  <span className={s.funilNome}>
                    <Link href={`/crm/lead/${contrato.lead_id}`}>
                      {lead?.nome ?? contrato.titulo}
                    </Link>
                  </span>
                  <span className={s.funilTrilho}>
                    <i
                      className={`${s.funilFill} ${q.quitado ? s.funilGanho : ""}`}
                      style={{ width: q.pago ? `max(3px, ${q.pct}%)` : 0 }}
                      aria-hidden
                    />
                  </span>
                  <b className={s.funilNum}>{dinheiroExato(q.pago)}</b>
                  <span className={`${s.funilPct} ${q.quitado ? "" : s.funilQueda}`}>
                    {q.quitado ? "quitado" : `de ${dinheiroExato(q.total)}`}
                  </span>
                </div>
              ))}
            </div>

            {/* O plano que não fecha. Não é erro de banco, é furo do plano
                de pagamento, e ele fica visível pela mesma regra do dossiê
                da carta: some da tela, some da cabeça. */}
            {c.desencontros.length ? (
              <p className={`${s.blocoNota} ${s.notaAlerta}`}>
                {c.desencontros.map((d) => (
                  <span key={d.contrato.id}>
                    {d.lead?.nome ?? d.contrato.titulo}: faltam {dinheiroExato(d.q.semParcela)} sem
                    parcela nenhuma cobrindo.{" "}
                  </span>
                ))}
              </p>
            ) : null}
          </section>
        </details>
      ) : null}

      {/* ---------- o ano ----------
          Só quando entrou dinheiro no ano. Doze colunas de zero ocupando
          250px de altura é o retrato de uma ferramenta que não sabe que
          está vazia. */}
      {noAno > 0 ? (
        <>
          <h2 className={s.rotulo}>
            O ano, mês a mês
            <span className={s.rotuloCont}>
              {dinheiroExato(noAno)} em {ano}
            </span>
          </h2>
          <section className={s.bloco}>
            <div className={s.blocoCab}>
              <span className={s.blocoNota}>
                O que entrou na conta, pela data do pagamento. Estorno não conta.
              </span>
            </div>
            <GraficoDoAno meses={c.meses} mesAtual={c.mesAtual} />
          </section>
        </>
      ) : null}
    </div>
  );
}

/* Doze colunas na máquina das barras de semana das métricas. Os meses
   vazios continuam desenhados como coluna sem altura: é o vazio que dá
   escala ao cheio, a mesma lição já registrada para a régua de carga do
   quadro e para a linha do horizonte. */
function GraficoDoAno({
  meses,
  mesAtual,
}: {
  meses: { mes: string; valor: number }[];
  mesAtual: string;
}) {
  const teto = Math.max(1, ...meses.map((m) => m.valor));
  const comDinheiro = meses.filter((m) => m.valor > 0);
  const media = comDinheiro.length
    ? comDinheiro.reduce((t, m) => t + m.valor, 0) / comDinheiro.length
    : 0;

  /* Forma curta para o rótulo do topo da coluna: "R$ 1.398" não cabe em
     56px de largura, e "1,4k" cabe e diz a mesma coisa de relance. */
  const curto = (v: number) =>
    v >= 1000 ? `${(Math.round(v / 100) / 10).toLocaleString("pt-BR")}k` : String(Math.round(v));

  return (
    <div className={s.semanas}>
      {media > 0 ? (
        <div className={s.semanasPlano} aria-hidden>
          <div
            className={`${s.linhaMeta} ${s.linhaMedia}`}
            style={{ bottom: `${(media / teto) * 100}%` }}
          >
            <b>média {curto(media)}</b>
          </div>
        </div>
      ) : null}

      {meses.map(({ mes, valor }) => {
        const emCurso = mes === mesAtual;
        return (
          <div key={mes} className={s.semana}>
            <div className={s.semanaArea}>
              {valor > 0 ? <span className={s.semanaNum}>{curto(valor)}</span> : null}
              {valor > 0 ? (
                <i
                  className={`${s.semanaSeg} ${emCurso ? s.semanaAndamento : s.semanaBateu}`}
                  style={{ height: `${(valor / teto) * 100}%` }}
                  aria-hidden
                />
              ) : null}
            </div>
            <span className={s.semanaRot}>{rotuloMes(mes)}</span>
          </div>
        );
      })}
    </div>
  );
}
/* ============================================================
   A TELA VESTIDA, ANTES DE HAVER DADO

   O mesmo `?exemplo=1` que a tela de métricas já tem, e aqui ele importa
   mais: um CRM de prospecção enche de leads na primeira semana, mas o caixa
   só enche quando alguém PAGA, e até lá esta tela fica vazia por semanas.
   Sem isto não haveria como olhar para ela e decidir se ela está boa.

   Números plausíveis do estúdio de verdade: a vitrine é R$ 999 (entrada
   R$ 199 mais saldo em até 4x), o e-commerce da Pisada é R$ 2.990, e a
   campanha da Baixudos é R$ 6.500. O Supabase não é chamado.
   ============================================================ */
function exemploDoCaixa(ano: number, hoje: string): Caixa {
  const mesAtual = hoje.slice(0, 7);
  const dia = (d: string) => `${mesAtual}-${d}`;

  const parcela = (
    id: string,
    lead_id: string,
    lead_nome: string,
    contrato_id: string,
    contrato_titulo: string,
    rotulo: string,
    valor: number,
    vence_em: string,
    recebido: number,
  ): ParcelaPainel => ({
    id,
    owner_id: "exemplo",
    contrato_id,
    lead_id,
    numero: 1,
    de: 2,
    rotulo,
    valor,
    vence_em,
    item_slug: null,
    metodo_previsto: "pix",
    cobrar_em: null,
    cancelada_em: null,
    created_at: `${vence_em}T12:00:00Z`,
    updated_at: `${vence_em}T12:00:00Z`,
    recebido,
    contrato_titulo,
    lead_nome,
    lead_whatsapp: null,
    lead_instagram: null,
  });

  const contrato = (
    id: string,
    lead_id: string,
    titulo: string,
    valor_total: number,
  ): Contrato => ({
    id,
    owner_id: "exemplo",
    lead_id,
    titulo,
    proposta_slug: null,
    tipo: "projeto",
    valor_total,
    valor_ciclo: null,
    ciclo: null,
    dia_vencimento: null,
    vigente_ate: null,
    status: "ativo",
    assinado_em: null,
    notas: null,
    created_at: `${ano}-01-01T12:00:00Z`,
    updated_at: `${ano}-01-01T12:00:00Z`,
  });

  const p1 = parcela("p1", "l1", "ArraZou Semijoias", "c1", "Vitrine Digital", "2ª parcela", 499, dia("12"), 0);
  const p2 = parcela("p2", "l2", "Dolce Amore", "c2", "Vitrine Digital", "Saldo na entrega", 800, dia("05"), 0);
  const p3 = parcela("p3", "l3", "Pisada de Ouro", "c3", "E-commerce", "Saldo na entrega", 1495, dia("26"), 0);
  const p4 = parcela("p4", "l1", "ArraZou Semijoias", "c1", "Vitrine Digital", "Entrada", 500, dia("02"), 500);
  const p5 = parcela("p5", "l2", "Dolce Amore", "c2", "Vitrine Digital", "Entrada", 199, dia("01"), 199);
  const p6 = parcela("p6", "l3", "Pisada de Ouro", "c3", "E-commerce", "Entrada", 1495, dia("03"), 1495);

  const cli = (id: string, lead_id: string, nome: string, titulo: string, total: number, ps: ParcelaPainel[]) => ({
    contrato: contrato(id, lead_id, titulo, total),
    lead: { id: lead_id, nome, empresa: nome, whatsapp: null, instagram: null } as Caixa["clientes"][number]["lead"],
    parcelas: ps,
    q: quitacaoDoContrato({ valor_total: total }, ps),
  });

  return {
    ano,
    hoje,
    mesAtual,
    previstoNoMes: 4988,
    recebidoNoMes: 2194,
    parcelasDoMes: 6,
    recebimentosDoMes: 3,
    emAtraso: 1299,
    aReceber: 2794,
    aReceberN: 3,
    contratado: 4988,
    devendo: [
      { parcela: p2, s: situacaoDaParcela(p2, hoje) },
      { parcela: p1, s: situacaoDaParcela(p1, hoje) },
    ].filter((x) => x.s.situacao === "atrasada"),
    aVencer: [{ parcela: p3, s: situacaoDaParcela(p3, hoje) }].filter(
      (x) => x.s.situacao !== "atrasada" && x.s.situacao !== "paga",
    ),
    previsao: mesesAFrente(mesAtual, 6).map((mes, i) => ({
      mes,
      total: [2794, 1800, 1400, 900, 400, 0][i] ?? 0,
      vencido: i === 0 ? 1299 : 0,
    })),
    depois: 600,
    quitados: 0,
    quitadoTotal: 0,
    clientes: [
      cli("c1", "l1", "ArraZou Semijoias", "Vitrine Digital", 999, [p4, p1]),
      cli("c2", "l2", "Dolce Amore", "Vitrine Digital", 999, [p5, p2]),
      cli("c3", "l3", "Pisada de Ouro", "E-commerce", 2990, [p6, p3]),
    ],
    meses: mesesDoAno(ano).map((mes, i) => ({
      mes,
      valor: [0, 0, 999, 1498, 999, 2497, 1998, 2194, 0, 0, 0, 0][i] ?? 0,
    })),
    semDono: [],
    desencontros: [],
    anos: [ano],
  };
}

/* ============================================================
   A PREVISÃO — seis meses, e um balde para o resto

   Altura FIXA, sempre. É a diferença entre esta seção e a lista de
   contratos que ela substituiu: aquela crescia uma linha por cliente para
   sempre, esta desenha seis colunas com um contrato ou com cinquenta.

   O vencido aparece em hachura rosa DENTRO da coluna do mês corrente, e não
   como uma coluna própria no passado: a pergunta desta barra é "quanto
   ainda pode entrar daqui para frente", e dívida velha continua sendo
   dinheiro de agora. É a mesma hachura do gráfico de metas, e o
   reaproveitamento é de propósito: nesta casa ela quer dizer "isto está
   faltando".
   ============================================================ */
function Previsao({
  previsao,
  depois,
}: {
  previsao: { mes: string; total: number; vencido: number }[];
  depois: number;
}) {
  const colunas = [
    ...previsao.map((p) => ({ ...p, rotulo: rotuloMes(p.mes) })),
    /* O "depois" só ganha coluna quando existe: uma coluna vazia no fim
       seria a tela dizendo que há um futuro que não há. */
    ...(depois > 0
      ? [{ mes: "depois", total: depois, vencido: 0, rotulo: "depois" }]
      : []),
  ];
  const teto = Math.max(1, ...colunas.map((x) => x.total));
  const curto = (v: number) =>
    v >= 1000 ? `${(Math.round(v / 100) / 10).toLocaleString("pt-BR")}k` : String(Math.round(v));

  return (
    <div className={s.semanas}>
      {colunas.map((x) => (
        <div key={x.mes} className={s.semana}>
          <div className={s.semanaArea}>
            {x.total > 0 ? <span className={s.semanaNum}>{curto(x.total)}</span> : null}
            {x.vencido > 0 ? (
              <i
                className={`${s.semanaSeg} ${s.semanaFalta}`}
                style={{ height: `${(x.vencido / teto) * 100}%` }}
                aria-hidden
              />
            ) : null}
            {/* Tinta cheia em TODOS os meses, inclusive o corrente. A
                hachura de tinta do gráfico de metas não serve aqui: lá ela
                quer dizer "a semana ainda corre e não deve nada"; aqui, ao
                lado da hachura rosa do vencido, viravam dois padrões
                diagonais colados na mesma coluna, e duas texturas
                adjacentes não são duas informações, são um borrão. */}
            {x.total - x.vencido > 0 ? (
              <i
                className={`${s.semanaSeg} ${s.semanaCheio}`}
                style={{ height: `${((x.total - x.vencido) / teto) * 100}%` }}
                aria-hidden
              />
            ) : null}
          </div>
          <span className={s.semanaRot}>{x.rotulo}</span>
        </div>
      ))}
    </div>
  );
}
