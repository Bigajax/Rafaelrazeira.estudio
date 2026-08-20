"use client";

/* ============================================================
   O MODAL DAS REGRAS 1 A 4

   Ele NÃO é um formulário de edição do lead. É a pergunta que a passagem de
   estágio faz, e por isso ele mostra só o que falta: mover para "proposta"
   um lead que já tem ticket e retorno marcado não abre modal nenhum; mover
   um lead cru para "perdido" abre um modal de um campo só.

   Essa foi a decisão mais importante da tela. Um modal fixo com os seis
   campos seria mais fácil de escrever e transformaria toda arrastada num
   formulário, que é exatamente o que faz gente parar de usar CRM.

   ---------- por que ele existe no meio de um arrasto ----------
   Interromper alguém que acabou de arrastar um card é caro, e vale a pena
   por um motivo só: a regra 1 é a coluna vertebral desta ferramenta. Um
   lead sem próximo passo não aparece em fila nenhuma no dia seguinte, e
   some. O modal é o preço de nunca perder um lead por esquecimento.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import {
  MOTIVOS_PERDA,
  NOME_ESTAGIO,
  NOME_MOTIVO,
  type Estagio,
  type MotivoPerda,
} from "@/lib/crm/tipos";
import {
  hojeSP,
  NOME_CAMPO,
  PADRAO_DO_DESTINO,
  somarDias,
  type CampoExigido,
  type Passagem,
} from "@/lib/crm/regras";
import s from "@/app/crm/crm.module.css";

/* A frase de abertura é diferente por destino porque o motivo de a tela ter
   parado é diferente. Genérico ("preencha os campos obrigatórios") faria o
   modal parecer burocracia; específico faz ele parecer o próprio trabalho. */
const CHAMADA: Partial<Record<Estagio, string>> = {
  perdido: "Perder faz parte, mas perder sem saber por quê custa o aprendizado inteiro.",
  ganho: "Fechou. Registre o valor para o faturamento do mês bater.",
  proposta: "Proposta sem ticket estimado deixa a soma do pipeline mentindo.",
  /* A geladeira sai do quadro e por isso a data é a única corda presa
     nela: sem ela, guardar um lead é o mesmo que perdê-lo. */
  geladeira: "Ele sai do quadro e volta sozinho na fila do dia, na data que você marcar.",
};
const CHAMADA_PADRAO = "Todo lead vivo sai daqui com um retorno marcado.";

export function ModalPassagem({
  nomeLead,
  estagio,
  falta,
  erro,
  salvando,
  aoCancelar,
  aoConfirmar,
}: {
  nomeLead: string;
  estagio: Estagio;
  falta: CampoExigido[];
  erro?: string | null;
  salvando?: boolean;
  aoCancelar: () => void;
  aoConfirmar: (passagem: Passagem) => void;
}) {
  const hoje = hojeSP();
  /* Guardar na geladeira já vem com o passo escrito: quem arrasta um card
     para lá está respondendo "não é a hora", e digitar de novo o que essa
     resposta significa é trabalho de escrivão. Nas outras etapas o passo é
     a decisão em si, e um padrão ali seria o CRM decidindo pelo Rafael. */
  const [passo, setPasso] = useState(
    estagio === "geladeira" ? (PADRAO_DO_DESTINO.geladeira?.passo ?? "") : "",
  );
  /* A data já vem preenchida com hoje, e isso não é atalho: o valor mais
     provável de "quando eu volto nisso" é hoje ou amanhã, e um campo de data
     vazio num modal é o lugar onde a pessoa desiste e cancela.

     Menos na geladeira, onde o valor mais provável é o contrário de hoje:
     "mais pra frente" quase nunca quer dizer "amanhã", e voltar cedo demais
     transforma a reativação num quarto follow-up. */
  const [data, setData] = useState(() =>
    estagio === "geladeira" ? somarDias(hoje, PADRAO_DO_DESTINO.geladeira?.dias ?? 60) : hoje,
  );
  const [ticket, setTicket] = useState("");
  const [motivo, setMotivo] = useState<MotivoPerda | "">("");
  const [valor, setValor] = useState("");
  const [fechado, setFechado] = useState(hoje);

  const caixa = useRef<HTMLDivElement>(null);
  const primeiro = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    primeiro.current?.focus();
  }, []);

  /* Escape cancela. Num modal que aparece no meio de um arrasto, a saída
     precisa ser a tecla que todo mundo já aperta sem pensar. */
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoCancelar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoCancelar]);

  const pede = (campo: CampoExigido) => falta.includes(campo);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const passagem: Passagem = {};
    if (pede("proximo_passo")) passagem.proximo_passo = passo.trim();
    if (pede("proxima_acao_em")) passagem.proxima_acao_em = data;
    if (pede("ticket_estimado")) passagem.ticket_estimado = ticket ? Number(ticket) : null;
    if (pede("motivo_perda")) passagem.motivo_perda = (motivo || null) as MotivoPerda | null;
    if (pede("valor_fechado")) passagem.valor_fechado = valor ? Number(valor) : null;
    if (pede("fechado_em")) passagem.fechado_em = fechado;
    aoConfirmar(passagem);
  };

  /* Clicar no fundo cancela, clicar no cartão não. A checagem é `e.target
     === e.currentTarget` e não um `stopPropagation` no cartão porque a
     segunda forma engole cliques de dentro do formulário em alguns
     navegadores quando o alvo é removido do DOM no meio do evento. */
  const clicarFundo = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) aoCancelar();
  };

  return (
    <div className={s.fundo} onMouseDown={clicarFundo}>
      <div
        ref={caixa}
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
      >
        <p className={s.modalRot}>Mover para {NOME_ESTAGIO[estagio]}</p>
        <h2 id="modal-titulo">{nomeLead}</h2>
        <p>{CHAMADA[estagio] ?? CHAMADA_PADRAO}</p>

        <form onSubmit={enviar}>
          {pede("proximo_passo") ? (
            <label className={s.campo}>
              <span className={s.campoRot}>{NOME_CAMPO.proximo_passo}</span>
              <input
                ref={primeiro as React.RefObject<HTMLInputElement>}
                type="text"
                value={passo}
                onChange={(e) => setPasso(e.target.value)}
                placeholder="Mandar o orçamento com os dois prazos"
                required
              />
            </label>
          ) : null}

          {pede("proxima_acao_em") ? (
            <label className={s.campo}>
              <span className={s.campoRot}>{NOME_CAMPO.proxima_acao_em}</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </label>
          ) : null}

          {pede("ticket_estimado") ? (
            <label className={s.campo}>
              <span className={s.campoRot}>{NOME_CAMPO.ticket_estimado}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={50}
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                placeholder="2500"
                required
              />
            </label>
          ) : null}

          {pede("motivo_perda") ? (
            <label className={s.campo}>
              <span className={s.campoRot}>{NOME_CAMPO.motivo_perda}</span>
              <select
                ref={primeiro as React.RefObject<HTMLSelectElement>}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as MotivoPerda)}
                required
              >
                <option value="">Escolha o motivo</option>
                {MOTIVOS_PERDA.map((m) => (
                  <option key={m} value={m}>
                    {NOME_MOTIVO[m]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {pede("valor_fechado") || pede("fechado_em") ? (
            <div className={s.dupla}>
              {pede("valor_fechado") ? (
                <label className={s.campo}>
                  <span className={s.campoRot}>{NOME_CAMPO.valor_fechado}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={50}
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="2500"
                    required
                  />
                </label>
              ) : null}
              {pede("fechado_em") ? (
                <label className={s.campo}>
                  <span className={s.campoRot}>{NOME_CAMPO.fechado_em}</span>
                  <input
                    type="date"
                    value={fechado}
                    onChange={(e) => setFechado(e.target.value)}
                    required
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {erro ? (
            <p role="alert" className={s.erro}>
              {erro}
            </p>
          ) : null}

          <div className={s.modalPe}>
            <button type="button" className={s.btn} onClick={aoCancelar}>
              Cancelar
            </button>
            <button type="submit" className={s.btnAcao} disabled={salvando}>
              {salvando ? "Salvando…" : `Mover para ${NOME_ESTAGIO[estagio]}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
