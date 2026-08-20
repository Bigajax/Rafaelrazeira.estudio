"use client";

/* ============================================================
   O DINHEIRO SEM DONO

   Uma linha por pagamento que chegou e não bateu com parcela nenhuma. Ela
   existe porque a alternativa é pior: um webhook que não acha a parcela e
   responde 200 sem gravar está descartando dinheiro em silêncio, e basta
   acontecer uma vez para o caixa nunca mais fechar.

   O caso normal que produz um órfão não é bug: o cliente recebe a proposta
   e paga a entrada no minuto seguinte, antes de o contrato existir aqui.
   Então esta tela não é uma tela de erro, é uma bandeja de entrada.

   ---------- por que um select e não uma busca ----------
   As candidatas são as parcelas que ainda devem, do CRM inteiro, e num
   estúdio solo isso é uma lista de dezenas, não de milhares. Um campo de
   busca aqui seria um formulário para escolher entre doze opções.
   ============================================================ */

import { useState, useTransition } from "react";
import { amarrarRecebimento, apagarRecebimento } from "@/app/crm/acoes";
import { dinheiroExato } from "@/lib/crm/financeiro";
import { NOME_METODO, type Metodo } from "@/lib/crm/tipos";
import { dataCurta } from "@/lib/crm/regras";
import s from "@/app/crm/crm.module.css";

export function AmarrarRecebimento({
  recebimento,
  candidatas,
}: {
  recebimento: {
    id: string;
    valor: number;
    recebido_em: string;
    metodo: string;
    origem: string;
    referencia: string | null;
  };
  candidatas: { id: string; rotulo: string }[];
}) {
  const [alvo, setAlvo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();

  const amarrar = () => {
    if (!alvo) return;
    setErro(null);
    comecar(async () => {
      const r = await amarrarRecebimento(recebimento.id, alvo);
      if (!r.ok) setErro("erro" in r ? r.erro : "Não foi possível amarrar.");
    });
  };

  const descartar = () => {
    setErro(null);
    comecar(async () => {
      const r = await apagarRecebimento(recebimento.id);
      if (!r.ok) setErro("erro" in r ? r.erro : "Não foi possível apagar.");
    });
  };

  return (
    <div className={s.orfao}>
      <div className={s.orfaoQuem}>
        <b className={s.orfaoValor}>{dinheiroExato(recebimento.valor)}</b>
        <span className={s.orfaoCtx}>
          {NOME_METODO[recebimento.metodo as Metodo] ?? recebimento.metodo} ·{" "}
          {dataCurta(recebimento.recebido_em)}
          {recebimento.origem === "mercadopago" ? " · Mercado Pago" : ""}
        </span>
        {/* A referência é o que o checkout mandou junto do pagamento
            (`crm:<proposta>:<item>:<uuid>`). Ela aparece porque é a única
            pista de qual proposta gerou este dinheiro quando o slug não
            existe mais no CRM. */}
        {recebimento.referencia ? (
          <code className={s.orfaoRef}>{recebimento.referencia}</code>
        ) : null}
      </div>

      <div className={s.orfaoAcoes}>
        <select
          value={alvo}
          onChange={(e) => setAlvo(e.target.value)}
          aria-label="Amarrar a qual parcela"
        >
          <option value="">Escolha a parcela…</option>
          {candidatas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.rotulo}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={s.btnMini}
          onClick={amarrar}
          disabled={!alvo || salvando}
        >
          {salvando ? "Amarrando…" : "Amarrar"}
        </button>
        {/* Apagar e não estornar: um órfão sem dono nenhum é um teste, uma
            duplicata ou um engano, e nenhum dos três é histórico. Estorno de
            verdade acontece na linha da parcela, depois de amarrada. */}
        <button type="button" className={s.btnMini} onClick={descartar} disabled={salvando}>
          Não é meu
        </button>
      </div>

      {erro ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}
