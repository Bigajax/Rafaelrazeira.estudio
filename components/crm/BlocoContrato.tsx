"use client";

/* ============================================================
   O DINHEIRO NA FICHA DO LEAD

   Ele fica ENTRE a decisão (estágio e próximo passo) e a linha do tempo, e
   a posição não é arbitrária: dinheiro é fato do negócio, e a timeline é
   história. Quem abre a ficha para mandar mensagem precisa saber que a
   pessoa deve R$ 499 ANTES de escrever, não depois de rolar até o fim.

   ---------- o que ele mostra quando não há nada ----------
   Um botão, e só para lead ganho. Oferecer "montar contrato" num lead que
   está na Lista seria oferecer cobrar quem ainda não disse sim; e esconder
   o botão de um lead ganho sem contrato faria a descoberta depender de
   alguém adivinhar que a aba Caixa existe.
   ============================================================ */

import { useState, useTransition } from "react";
import {
  adiarCobranca,
  apagarRecebimento,
  cancelarContrato,
  cancelarParcela,
  estornarRecebimento,
  gerarProximasMensalidades,
  reativarParcela,
} from "@/app/(pt)/crm/acoes";
import { BaixaRapida } from "./BaixaRapida";
import { ModalContrato } from "./ModalContrato";
import {
  dinheiroExato,
  nomeDaSituacao,
  quitacaoDoContrato,
  situacaoDaParcela,
} from "@/lib/crm/financeiro";
import { dataCurta } from "@/lib/crm/regras";
import { NOME_METODO, type LeadPainel, type Metodo, type Recebimento } from "@/lib/crm/tipos";
import type { ContratoPainel } from "@/lib/crm/dados";
import s from "@/app/(pt)/crm/crm.module.css";

export function BlocoContrato({
  lead,
  contratos,
  hoje,
}: {
  lead: LeadPainel;
  contratos: ContratoPainel[];
  hoje: string;
}) {
  const [montando, setMontando] = useState(false);

  if (!contratos.length) {
    /* Sem contrato e fora do ganho a seção inteira some. Um bloco vazio
       dizendo "nenhum contrato" em toda ficha da Lista seria ruído em 258
       telas para servir a três. */
    if (lead.estagio !== "ganho") return null;
    return (
      <section className={s.bloco}>
        <div className={s.blocoCab}>
          <h2>O dinheiro</h2>
        </div>
        <p className={s.blocoNota}>
          Este projeto foi ganho e ainda não tem plano de pagamento. Sem ele, o sistema sabe que você
          vendeu e não sabe se recebeu.
        </p>
        <button type="button" className={s.btnAcao} onClick={() => setMontando(true)}>
          Montar contrato
        </button>
        {montando ? (
          <ModalContrato lead={lead} hoje={hoje} ganhar aoFechar={() => setMontando(false)} />
        ) : null}
      </section>
    );
  }

  return (
    <>
      {contratos.map((c) => (
        <Contrato key={c.id} contrato={c} hoje={hoje} />
      ))}
      {montando ? (
        <ModalContrato lead={lead} hoje={hoje} aoFechar={() => setMontando(false)} />
      ) : null}
      <section className={s.bloco}>
        <button type="button" className={s.btnMini} onClick={() => setMontando(true)}>
          Montar outro contrato
        </button>
      </section>
    </>
  );
}

function Contrato({ contrato, hoje }: { contrato: ContratoPainel; hoje: string }) {
  const q = quitacaoDoContrato(contrato, contrato.parcelas);
  const vivas = contrato.parcelas.filter((p) => !p.cancelada_em);
  const cancelado = contrato.status === "cancelado";

  return (
    <section className={s.bloco}>
      <div className={s.contratoCab}>
        <h2>
          {contrato.titulo}
          {cancelado ? <span className={s.parcelaSinal}> · cancelado</span> : null}
        </h2>
        <b className={s.contratoTotal}>{dinheiroExato(q.total)}</b>
      </div>

      <span className={s.reguaQuita} aria-hidden>
        <i
          className={`${s.reguaQuitaFill} ${q.quitado ? s.reguaQuitaCheia : ""}`}
          style={{ width: `${q.pct}%` }}
        />
      </span>
      <p className={s.blocoNota}>
        {cancelado
          ? /* contrato morto não deve, não cobra e não tem "furo no plano":
               as parcelas que deviam foram canceladas junto */
            `Cancelado. Entraram ${dinheiroExato(q.pago)} antes de cancelar, e isso fica no histórico.`
          : q.quitado
            ? `Quitado: entraram ${dinheiroExato(q.pago)}.`
            : `Entraram ${dinheiroExato(q.pago)} de ${dinheiroExato(q.total)}. Faltam ${dinheiroExato(q.saldo)}.`}
        {!cancelado && q.semParcela > 0.005
          ? ` Atenção: ${dinheiroExato(q.semParcela)} do total não têm parcela nenhuma cobrindo.`
          : ""}
      </p>

      <div className={s.parcelas}>
        {contrato.parcelas.map((p) => (
          <Parcela key={p.id} parcela={p} hoje={hoje} />
        ))}
      </div>

      {vivas.length === 0 ? (
        <p className={s.blocoNota}>Todas as parcelas deste contrato foram canceladas.</p>
      ) : null}

      {contrato.tipo === "recorrencia" && !cancelado ? <MaisMensalidades contratoId={contrato.id} /> : null}

      {/* CANCELAR (06/10): a venda que não aconteceu. Deixa o histórico, tira
          as parcelas que ainda deviam da cobrança e refaz o valor do lead.
          Só aparece com dívida de pé: cancelar contrato quitado não quer
          dizer nada. */}
      {!cancelado && !q.quitado ? <CancelarContrato contratoId={contrato.id} titulo={contrato.titulo} saldo={q.saldo} /> : null}

      {contrato.avulsos.length ? (
        <>
          <p className={`${s.blocoNota} ${s.notaAlerta}`}>
            Recebimentos deste cliente que não estão em parcela nenhuma:
          </p>
          {contrato.avulsos.map((r) => (
            <Avulso key={r.id} recebimento={r} />
          ))}
        </>
      ) : null}
    </section>
  );
}

function CancelarContrato({ contratoId, titulo, saldo }: { contratoId: string; titulo: string; saldo: number }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();
  const confirmar = () =>
    comecar(async () => {
      setErro(null);
      const r = await cancelarContrato(contratoId);
      if (r.ok) setAberto(false);
      else setErro("erro" in r ? r.erro : "Não deu para cancelar.");
    });
  return (
    <div className={s.acaoIsolada}>
      {aberto ? (
        <div className={`${s.gavetaFila} ${s.gavetaRisco}`}>
          <p className={s.gavetaTitulo}>Cancelar {titulo}?</p>
          <p className={s.gavetaTexto}>
            As parcelas que ainda deviam ({dinheiroExato(saldo)}) saem da cobrança. O que já entrou fica no histórico. O
            valor vendido do lead é refeito sem este contrato.
          </p>
          {erro ? (
            <p role="alert" className={s.erro}>
              {erro}
            </p>
          ) : null}
          <div className={s.gavetaPe}>
            <button type="button" className={s.btnMini} onClick={() => setAberto(false)}>
              Voltar
            </button>
            <button type="button" className={`${s.btnMini} ${s.btnMiniForte}`} onClick={confirmar} disabled={salvando}>
              {salvando ? "Cancelando…" : "Cancelar o contrato"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={s.btnMini} onClick={() => setAberto(true)} title="A venda não aconteceu">
          Cancelar contrato
        </button>
      )}
    </div>
  );
}

/* A mensalidade nasce com três parcelas e cresce daqui: mais três a partir
   da última, no mesmo dia e no mesmo valor. */
function MaisMensalidades({ contratoId }: { contratoId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();
  return (
    <div className={s.acaoIsolada}>
      <button
        type="button"
        className={s.btnMini}
        disabled={salvando}
        onClick={() => {
          setErro(null);
          comecar(async () => {
            const r = await gerarProximasMensalidades(contratoId, 3);
            if (!r.ok) setErro("erro" in r ? r.erro : "Não deu para gerar as mensalidades.");
          });
        }}
      >
        {salvando ? "Gerando…" : "Gerar mais 3 meses"}
      </button>
      {erro ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}

function Parcela({
  parcela,
  hoje,
}: {
  parcela: ContratoPainel["parcelas"][number];
  hoje: string;
}) {
  const [salvando, comecar] = useTransition();
  const sit = situacaoDaParcela(parcela, hoje);
  const paga = sit.situacao === "paga";
  const cancelada = sit.situacao === "cancelada";

  const tom =
    sit.situacao === "atrasada" ? s.parcelaVencida : paga ? s.parcelaPaga : "";

  return (
    <div className={`${s.parcela} ${paga || cancelada ? s.parcelaQuitada : ""}`}>
      <div>
        <span className={s.parcelaRot}>{parcela.rotulo}</span>
        <span className={s.parcelaCtx}>
          Vence {dataCurta(parcela.vence_em)}
          {parcela.cobrar_em && parcela.cobrar_em !== parcela.vence_em
            ? ` · cobrar em ${dataCurta(parcela.cobrar_em)}`
            : ""}
          {parcela.metodo_previsto
            ? ` · ${NOME_METODO[parcela.metodo_previsto as Metodo] ?? parcela.metodo_previsto}`
            : ""}
        </span>
      </div>
      <b className={s.parcelaValor}>{dinheiroExato(parcela.valor)}</b>
      <span className={`${s.parcelaSinal} ${tom}`}>{nomeDaSituacao(sit)}</span>

      {/* Parcela paga não ganha botão nenhum: ela terminou, e um "dar baixa"
          numa linha quitada é um alvo para errar. Cancelada ganha só o
          desfazer. */}
      <div className={s.parcelaAcoes}>
        {cancelada ? (
          <button
            type="button"
            className={s.btnMini}
            onClick={() => comecar(() => void reativarParcela(parcela.id))}
            disabled={salvando}
          >
            Voltar a cobrar
          </button>
        ) : paga ? null : (
          <>
            <BaixaRapida
              parcelaId={parcela.id}
              saldo={sit.saldo}
              hoje={hoje}
              metodoPrevisto={parcela.metodo_previsto}
              compacto
            />
            {[3, 7].map((d) => (
              <button
                key={d}
                type="button"
                className={s.btnMini}
                onClick={() => comecar(() => void adiarCobranca(parcela.id, d))}
                disabled={salvando}
                /* Adia a COBRANÇA e não o vencimento: o combinado com o
                   cliente é fato, e reescrevê-lo para calar a tela é o jeito
                   mais rápido de o caixa parar de valer. */
                title="Adia quando eu cobro, não a data que ele deve"
              >
                +{d}d
              </button>
            ))}
            <button
              type="button"
              className={s.btnMini}
              onClick={() => comecar(() => void cancelarParcela(parcela.id))}
              disabled={salvando}
            >
              Não é mais devida
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Avulso({ recebimento }: { recebimento: Recebimento }) {
  const [salvando, comecar] = useTransition();
  return (
    <div className={s.parcela}>
      <div>
        <span className={s.parcelaRot}>
          {NOME_METODO[recebimento.metodo] ?? recebimento.metodo}
          {recebimento.origem === "mercadopago" ? " · Mercado Pago" : ""}
        </span>
        <span className={s.parcelaCtx}>{dataCurta(recebimento.recebido_em)}</span>
      </div>
      <b className={s.parcelaValor}>{dinheiroExato(Number(recebimento.valor))}</b>
      <span className={`${s.parcelaSinal} ${recebimento.estornado_em ? s.parcelaVencida : ""}`}>
        {recebimento.estornado_em ? "Estornado" : "Sem parcela"}
      </span>
      <div className={s.parcelaAcoes}>
        {recebimento.estornado_em ? null : (
          <button
            type="button"
            className={s.btnMini}
            onClick={() => comecar(() => void estornarRecebimento(recebimento.id))}
            disabled={salvando}
            title="O dinheiro voltou: a linha fica no histórico e para de contar"
          >
            Estornar
          </button>
        )}
        <button
          type="button"
          className={s.btnMini}
          onClick={() => comecar(() => void apagarRecebimento(recebimento.id))}
          disabled={salvando}
          title="Lancei por engano"
        >
          Apagar
        </button>
      </div>
    </div>
  );
}
