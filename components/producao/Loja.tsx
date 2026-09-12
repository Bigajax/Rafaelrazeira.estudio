"use client";

/* ============================================================
   A LOJA — o que o Google sabe, e as quatro coisas que só o dono sabe

   Duas metades com naturezas opostas, e por isso elas moram no mesmo bloco:
   a de cima é COLHIDA e não se edita aqui (endereço, horário, nota do
   Google); a de baixo é PERGUNTADA e só existe se você digitar.

   ---------- por que a nota do Google fica em destaque ----------
   Ela é a única prova social que ninguém consegue fabricar: não é
   depoimento escolhido a dedo nem selo comprado, é a média pública de quem
   foi na loja. Numa vitrine de loja pequena, "4,9 com 180 avaliações" vale
   mais que qualquer manchete que eu escreva.

   ---------- por que as quatro perguntas ----------
   Frete, pagamento, retirada e troca aparecem no topo de toda vitrine e
   mudam a decisão de compra. Nenhuma está no Instagram. Hoje elas são
   descobertas no meio da conversa e digitadas direto na página; aqui elas
   são perguntadas UMA vez e viajam no prompt.
   ============================================================ */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarCondicoes } from "@/app/(pt)/crm/acoes-producao";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/producao.module.css";
import type { Condicoes, Loja as TipoLoja } from "@/lib/producao/tipos";
import { Sugestoes } from "./Sugestoes";

/* ---------- as quatro, escritas como se pergunta ----------
   Elas eram rótulos de formulário ("Entrega", "Pagamento") com um exemplo
   no placeholder. O problema não era clareza, era origem: estas quatro
   coisas não são campos que você preenche, são PERGUNTAS que você faz ao
   cliente, quase sempre no WhatsApp, com essas palavras.

   Escritas como pergunta, elas podem ser copiadas direto para a conversa,
   e o exemplo abaixo já é a cara da resposta que vai voltar. */
/* ---------- as opções de cada pergunta ----------
   A resposta real é quase sempre uma COMBINAÇÃO das mesmas poucas coisas:
   entrega é cidade mais Correios mais retirada, pagamento é Pix mais
   cartão. Marcar duas ou três é mais rápido e mais completo que escrever
   uma frase do zero, e o campo continua livre para o caso que a lista não
   previu ("entrego de moto no mesmo dia até as 18h").

   As opções são escritas como a lojista falaria, e não como um formulário
   pediria: elas vão INTEIRAS para a página do cliente. */
const PERGUNTAS: { campo: keyof Condicoes; pergunta: string; exemplo: string; opcoes: string[] }[] = [
  {
    campo: "frete",
    pergunta: "Como você entrega?",
    exemplo: "Entrego na cidade, e mando pelos Correios para fora.",
    opcoes: [
      "Entrego na cidade",
      "Mando pelos Correios para todo o Brasil",
      "Entrego na região no mesmo dia",
      "Frete grátis acima de R$ 300",
      "Combino a entrega pelo WhatsApp",
    ],
  },
  {
    campo: "pagamento",
    pergunta: "Como o cliente paga?",
    exemplo: "Pix, ou cartão em até 3x sem juros.",
    opcoes: [
      "Pix",
      "Cartão em até 3x sem juros",
      "Cartão em até 6x",
      "Desconto no Pix à vista",
      "Dinheiro na retirada",
    ],
  },
  {
    campo: "retirada",
    pergunta: "Pode retirar na loja?",
    exemplo: "Pode retirar, de segunda a sábado.",
    opcoes: [
      "Pode retirar na loja",
      "De segunda a sábado",
      "Só com hora marcada",
      "Não tem retirada: só entrega",
    ],
  },
  {
    campo: "troca",
    pergunta: "E se precisar trocar?",
    exemplo: "Troca em até 7 dias com a etiqueta.",
    opcoes: [
      "Troca em até 7 dias",
      "Troca em até 30 dias",
      "Com a etiqueta e a nota",
      "Primeira troca por conta da loja",
      "Não faz troca de peça em promoção",
    ],
  },
];

export function Loja({ loja }: { loja: TipoLoja }) {
  const router = useRouter();
  const [condicoes, setCondicoes] = useState<Condicoes>(loja.condicoes ?? {});
  const [recado, setRecado] = useState("");
  const [salvando, comSalvamento] = useTransition();

  const lugar = loja.lugar;
  const respondidas = PERGUNTAS.filter(({ campo }) => (condicoes[campo] ?? "").trim()).length;

  return (
    <section className={p.bloco}>
      <div className={p.blocoCab}>
        <h2>
          A loja<i className={s.ponto}>.</i>
        </h2>
        <span className={p.blocoRot}>Google e cliente</span>
      </div>

      {lugar ? (
        <div className={p.lugar}>
          {/* A nota vem primeiro e maior: é o dado desta seção que mais
              trabalha na página final. O número de avaliações vai colado,
              porque 5,0 com duas avaliações não é a mesma coisa que 4,7
              com trezentas, e quem lê sabe disso. */}
          {lugar.nota != null && (
            <p className={p.nota}>
              <b>{String(lugar.nota).replace(".", ",")}</b>
              <span>
                ★ no Google
                {lugar.avaliacoes ? ` · ${lugar.avaliacoes} avaliações` : ""}
              </span>
            </p>
          )}
          <div className={p.lugarTxt}>
            {lugar.endereco && <p>{lugar.endereco}</p>}
            {lugar.telefone && <p>{lugar.telefone}</p>}
            {lugar.horario?.length ? (
              <ul className={p.horario}>
                {lugar.horario.map((linha) => (
                  <li key={linha}>{linha}</li>
                ))}
              </ul>
            ) : null}
            {lugar.maps && (
              <p>
                <a href={lugar.maps} target="_blank" rel="noopener">
                  ver no Google Maps ↗
                </a>
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Loja sem ponto físico é o caso NORMAL de quem vende no direct, e
           não uma falha: em bloco cinza de largura inteira, com peso de
           alerta, essa linha virava a maior coisa da seção para dizer que
           nada aconteceu. Vira nota de rodapé, em mono. */
        <p className={p.semLugar}>Sem ponto físico no Google. A vitrine não ganha a seção de endereço.</p>
      )}

      <p className={p.perguntasRot}>
        As quatro que só o cliente responde
        {/* O contador não cobra: ele conta. Quatro respostas viajam no
            prompt e o que falta vira instrução de não inventar, então
            saber quantas estão de pé muda o que a vitrine pode prometer. */}
        <b>
          {respondidas}/{PERGUNTAS.length}
        </b>
      </p>
      <div className={p.condicoes}>
        {PERGUNTAS.map(({ campo, pergunta, exemplo, opcoes }) => {
          const respondida = Boolean((condicoes[campo] ?? "").trim());
          return (
            <div key={campo} className={`${p.pergunta} ${respondida ? p.perguntaOk : ""}`}>
              <label>
                <span>{pergunta}</span>
                <input
                  value={condicoes[campo] ?? ""}
                  placeholder={exemplo}
                  onChange={(e) => setCondicoes((c) => ({ ...c, [campo]: e.target.value }))}
                />
              </label>
              <Sugestoes
                opcoes={opcoes}
                valor={condicoes[campo] ?? ""}
                aoEscolher={(novo) => setCondicoes((c) => ({ ...c, [campo]: novo }))}
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={s.btn}
        disabled={salvando}
        onClick={() =>
          comSalvamento(async () => {
            const r = await salvarCondicoes(loja.id, condicoes);
            setRecado(r.ok ? "Condições salvas." : r.erro);
            router.refresh();
          })
        }
      >
        {salvando ? "GUARDANDO…" : "GUARDAR AS RESPOSTAS"}
      </button>
      {recado && <p className={p.aviso}>{recado}</p>}
    </section>
  );
}
