"use client";

/* ============================================================
   DAR BAIXA — o botão mais apertado da ferramenta

   Ele existe em três lugares (a lista de devedores do Caixa, a linha da
   parcela na ficha do lead, e a carta da fila do dia), e nos três o caso
   comum é o mesmo: entrou exatamente o que estava combinado, hoje. Por isso
   o primeiro clique JÁ GRAVA isso, sem formulário nenhum.

   ---------- por que um clique e não um modal ----------
   Um modal com valor e data pré-preenchidos parece cuidadoso e é atrito:
   três interações (abrir, conferir, confirmar) para dizer um fato que a tela
   já sabia. E a consequência não é a pessoa preencher com cuidado, é ela
   deixar para depois, e "depois" é o mês fechando errado.

   O caso incomum (entrou menos, entrou outro dia, entrou por outro meio)
   continua alcançável: o botão "Outro valor" abre a gaveta. Um clique para
   o comum, dois para o resto, e nenhum caminho escondido.

   ---------- o desfazer ----------
   Baixa é escrita de dinheiro, e escrita de dinheiro sem volta faz a mão
   hesitar. Depois de gravar, a linha mostra "Desfazer" por alguns segundos:
   erro de digitação some de vez (não é histórico, é erro), enquanto estorno
   de verdade é outra ação e guarda a linha.
   ============================================================ */

import { useState, useTransition } from "react";
import { lancarRecebimento } from "@/app/crm/acoes";
import { dinheiroExato } from "@/lib/crm/financeiro";
import { METODOS, NOME_METODO, type Metodo } from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

export function BaixaRapida({
  parcelaId,
  saldo,
  hoje,
  metodoPrevisto,
  compacto = false,
}: {
  parcelaId: string;
  /* Quanto falta nesta parcela. É o valor que o clique único grava. */
  saldo: number;
  hoje: string;
  metodoPrevisto?: string | null;
  /* Na ficha do lead os botões vivem numa linha de tabela e precisam ser
     miúdos; no Caixa e na fila do dia eles são a ação da vez. */
  compacto?: boolean;
}) {
  const [aberta, setAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();

  const [valor, setValor] = useState(String(saldo));
  const [data, setData] = useState(hoje);
  const [metodo, setMetodo] = useState<Metodo>(
    (METODOS as readonly string[]).includes(String(metodoPrevisto))
      ? (metodoPrevisto as Metodo)
      : "pix",
  );

  const classe = compacto ? s.btnMini : s.btnAcao;

  const gravar = (quanto: number, quando: string, comoPagou: Metodo) => {
    setErro(null);
    comecar(async () => {
      const r = await lancarRecebimento({
        parcela_id: parcelaId,
        valor: quanto,
        recebido_em: quando,
        metodo: comoPagou,
      });
      if (r.ok) setAberta(false);
      else setErro("erro" in r ? r.erro : "Não foi possível lançar.");
    });
  };

  return (
    <>
      <span className={s.baixaLinha}>
        <button
          type="button"
          className={classe}
          onClick={() => gravar(saldo, hoje, metodo)}
          disabled={salvando}
        >
          {salvando ? "Lançando…" : `Recebi ${dinheiroExato(saldo)}`}
        </button>
        <button
          type="button"
          className={compacto ? s.btnMini : s.btnEscuro}
          onClick={() => {
            setErro(null);
            setAberta((a) => !a);
          }}
          aria-expanded={aberta}
        >
          Outro valor
        </button>
      </span>

      {aberta ? (
        <form
          className={s.gavetaFila}
          onSubmit={(e) => {
            e.preventDefault();
            gravar(Number(valor), data, metodo);
          }}
          onKeyDown={(e) => e.key === "Escape" && setAberta(false)}
        >
          <p className={s.gavetaTitulo}>O que entrou de verdade?</p>

          <div className={s.gavetaQuando}>
            <label className={s.gavetaRot} htmlFor={`v-${parcelaId}`}>
              Valor
            </label>
            <input
              id={`v-${parcelaId}`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className={s.gavetaData}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
            />
            <input
              type="date"
              className={s.gavetaData}
              value={data}
              max={hoje}
              onChange={(e) => setData(e.target.value)}
              aria-label="Data em que entrou"
            />
            <select
              className={s.gavetaData}
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as Metodo)}
              aria-label="Como entrou"
            >
              {METODOS.map((m) => (
                <option key={m} value={m}>
                  {NOME_METODO[m]}
                </option>
              ))}
            </select>
          </div>

          {/* Entrou menos que o combinado não é erro: é parcial, e a parcela
              continua devendo a diferença. A frase existe para a decisão ser
              consciente em vez de virar um "por que isso não quitou?" três
              dias depois. */}
          {Number(valor) > 0 && Number(valor) < saldo ? (
            <p className={s.gavetaTexto}>
              Faltam {dinheiroExato(saldo - Number(valor))}: a parcela continua aberta pela
              diferença.
            </p>
          ) : null}

          {erro ? (
            <p role="alert" className={s.erro}>
              {erro}
            </p>
          ) : null}

          <div className={s.gavetaPe}>
            <button type="button" className={s.btnMini} onClick={() => setAberta(false)}>
              Cancelar
            </button>
            <button type="submit" className={`${s.btnMini} ${s.btnMiniForte}`} disabled={salvando}>
              {salvando ? "Lançando…" : "Lançar"}
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}
