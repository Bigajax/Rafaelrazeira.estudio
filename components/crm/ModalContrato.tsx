"use client";

/* ============================================================
   MONTAR O CONTRATO

   Dois caminhos, e o primeiro é o que fecha o circuito que o estúdio não
   tinha: a constante PROPOSTAS (lib/propostas.ts) guarda os planos de
   pagamento EXATOS de cada cliente, porque é ela quem cobra de verdade nos
   botões da página da proposta. Até 20/08 o CRM não sabia dela, e montar o
   contrato da vérít.lab significava redigitar R$ 199 e R$ 800 na mão,
   torcendo para bater com o que o botão cobra.

   ---------- por que caixas de marcar e não "importar tudo" ----------
   Os itens de uma proposta não somam: `avista_pix` é ALTERNATIVA a
   `entrada_pix + saldo_card`, não um terceiro pagamento. Importar todos
   criaria um contrato de R$ 1.998 para uma venda de R$ 999. Quem escolheu
   foi o cliente, então quem marca é o Rafael.

   ---------- e o item é UM recebimento, sempre ----------
   "No cartão, em até 4x" é UMA linha aqui. O Mercado Pago repassa de uma
   vez e quem parcela é o banco do cliente; `maxParcelas` descreve como ele
   paga, não o cronograma do que entra. Errar isso multiplicaria o plano por
   quatro, e é o erro mais fácil de cometer nesta tela.
   ============================================================ */

import { useEffect, useMemo, useState, useTransition } from "react";
import { fecharContrato } from "@/app/crm/acoes";
import { PROPOSTAS } from "@/lib/propostas";
import { centavos, dinheiroExato, gerarParcelas } from "@/lib/crm/financeiro";
import { somarDias } from "@/lib/crm/regras";
import type { LeadPainel } from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

type Modo = "proposta" | "manual";

const SLUGS = Object.keys(PROPOSTAS).sort();

export function ModalContrato({
  lead,
  hoje,
  aoFechar,
}: {
  lead: LeadPainel;
  hoje: string;
  aoFechar: () => void;
}) {
  const [modo, setModo] = useState<Modo>("proposta");
  const [slug, setSlug] = useState("");
  const [marcados, setMarcados] = useState<string[]>([]);
  const [titulo, setTitulo] = useState("");

  /* O manual: total, entrada e em quantas vezes o SALDO se divide. É o
     caminho do Pix na chave direta e da venda que nunca passou por
     proposta nenhuma. */
  const [total, setTotal] = useState("999");
  const [entrada, setEntrada] = useState("199");
  const [vezes, setVezes] = useState("1");
  const [primeiro, setPrimeiro] = useState(hoje);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();

  const proposta = slug ? PROPOSTAS[slug] : null;

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  /* O título vem da proposta e continua editável: "Rafael Razeira Estúdio —
     Vitrine Digital ArraZou Semijoias" é o nome comercial do documento, e
     dentro do CRM o que se lê é o projeto. Corta o prefixo da casa, que é
     redundante numa ferramenta que só tem uma casa. */
  useEffect(() => {
    if (!proposta) return;
    setTitulo(proposta.titulo.replace(/^Rafael Razeira Est[úu]dio\s*[—-]\s*/, ""));
    setMarcados([]);
  }, [proposta]);

  /* As parcelas que vão ser gravadas, calculadas na tela e refeitas no
     servidor. Sempre visíveis antes de confirmar: um plano de pagamento é
     a coisa mais fácil de errar em silêncio nesta ferramenta. */
  const previa = useMemo(() => {
    if (modo === "proposta") {
      if (!proposta) return [];
      return marcados.map((id, i) => {
        const item = proposta.itens[id];
        return {
          numero: i + 1,
          de: marcados.length,
          rotulo: item.label,
          valor: centavos(item.valor),
          /* A primeira vence hoje (a entrada se paga na hora de aceitar), e
             cada seguinte trinta dias depois. Datas são chute honesto e
             editáveis depois, na ficha: o que não pode é a parcela nascer
             sem data e some da fila. */
          vence_em: somarDias(primeiro, 30 * i),
          item_slug: id,
          metodo_previsto: item.metodo === "card" ? "cartao" : "pix",
        };
      });
    }
    const t = Number(total) || 0;
    const e = Number(entrada) || 0;
    if (t <= 0) return [];
    return gerarParcelas({
      total: t,
      entrada: Math.min(e, t),
      vezes: Math.max(1, Number(vezes) || 1),
      primeiro,
      somarDias,
    });
  }, [modo, proposta, marcados, primeiro, total, entrada, vezes]);

  const somaPrevia = centavos(previa.reduce((acc, p) => acc + p.valor, 0));

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    setErro(null);
    comecar(async () => {
      const r = await fecharContrato(lead.id, {
        titulo: titulo.trim() || lead.nome,
        valor_total: modo === "proposta" ? somaPrevia : Number(total),
        proposta_slug: modo === "proposta" ? slug : null,
        parcelas: previa,
      });
      if (r.ok) aoFechar();
      else setErro(r.erro);
    });
  };

  return (
    <div className={s.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="contrato-titulo">
        <p className={s.modalRot}>Montar contrato</p>
        <h2 id="contrato-titulo">{lead.nome}</h2>
        <p>O plano de pagamento é o que faz o CRM saber se você recebeu, e não só se vendeu.</p>

        <form onSubmit={enviar}>
          <fieldset className={s.grupo}>
            <legend className={s.campoRot}>De onde vem o plano</legend>
            <div className={s.opcoes}>
              <button
                type="button"
                className={`${s.opcao} ${modo === "proposta" ? s.opcaoAtiva : ""}`}
                onClick={() => setModo("proposta")}
                aria-pressed={modo === "proposta"}
              >
                De uma proposta
              </button>
              <button
                type="button"
                className={`${s.opcao} ${modo === "manual" ? s.opcaoAtiva : ""}`}
                onClick={() => setModo("manual")}
                aria-pressed={modo === "manual"}
              >
                À mão
              </button>
            </div>
          </fieldset>

          {modo === "proposta" ? (
            <>
              <label className={s.campo}>
                <span className={s.campoRot}>Qual proposta</span>
                <select value={slug} onChange={(e) => setSlug(e.target.value)}>
                  <option value="">Escolha…</option>
                  {SLUGS.map((sl) => (
                    <option key={sl} value={sl}>
                      {sl}
                    </option>
                  ))}
                </select>
              </label>

              {proposta ? (
                <div className={s.blocoPergunta}>
                  <p className={s.perguntaTitulo}>O que ele escolheu pagar?</p>
                  {/* Os itens não somam: à vista é ALTERNATIVA a entrada mais
                      saldo. Marcar os dois criaria um contrato do dobro. */}
                  {Object.entries(proposta.itens).map(([id, item]) => (
                    <label key={id} className={s.itemPlano}>
                      <input
                        type="checkbox"
                        checked={marcados.includes(id)}
                        onChange={(e) =>
                          setMarcados((atual) =>
                            e.target.checked ? [...atual, id] : atual.filter((x) => x !== id),
                          )
                        }
                      />
                      <span className={s.itemPlanoRot}>
                        {item.label}
                        {item.maxParcelas ? (
                          <i className={s.itemPlanoNota}>
                            até {item.maxParcelas}x no cartão dele: entra de uma vez aqui
                          </i>
                        ) : null}
                      </span>
                      <b className={s.itemPlanoValor}>{dinheiroExato(item.valor)}</b>
                    </label>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className={s.dupla}>
              <label className={s.campo}>
                <span className={s.campoRot}>Valor total</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>Entrada</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>O saldo em quantas vezes</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={vezes}
                  onChange={(e) => setVezes(e.target.value)}
                />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>Primeira vence em</span>
                <input
                  type="date"
                  value={primeiro}
                  onChange={(e) => setPrimeiro(e.target.value)}
                />
              </label>
            </div>
          )}

          <label className={s.campo}>
            <span className={s.campoRot}>Nome do projeto</span>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Vitrine Digital"
            />
          </label>

          {/* ---------- a prévia ----------
              Ela não é enfeite: é a última chance de ver que a data ficou no
              passado ou que o total não é o que se combinou, e o custo de
              descobrir isso depois é cobrar o valor errado de um cliente. */}
          {previa.length ? (
            <div className={s.blocoPergunta}>
              <p className={s.perguntaTitulo}>
                Vão nascer {previa.length} {previa.length === 1 ? "parcela" : "parcelas"}, somando{" "}
                {dinheiroExato(somaPrevia)}
              </p>
              {previa.map((p) => (
                <p key={p.numero} className={s.previaLinha}>
                  <span>{p.rotulo}</span>
                  <i>{p.vence_em.split("-").reverse().slice(0, 2).join("/")}</i>
                  <b>{dinheiroExato(p.valor)}</b>
                </p>
              ))}
            </div>
          ) : null}

          {erro ? (
            <p role="alert" className={s.erro}>
              {erro}
            </p>
          ) : null}

          <div className={s.modalPe}>
            <button type="button" className={s.btn} onClick={aoFechar}>
              Cancelar
            </button>
            <button
              type="submit"
              className={s.btnAcao}
              disabled={salvando || !previa.length}
            >
              {salvando ? "Montando…" : "Montar contrato"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
