/* ============================================================
   O CARREGANDO

   Nenhuma roda girando, nenhum esqueleto cinza pulsando. Esta casa tem um
   instrumento próprio para dizer "quanto", e ele aparece em três telas: a
   régua da meta na faixa, a régua de carga no pé das placas do quadro, a
   régua do dia no painel Hoje. Um filete de tinta correndo sobre um filete
   claro é o MESMO objeto, agora dizendo "espera".

   ---------- e a palavra ----------
   Ela é a metade que dá caráter, e ela é informação: cada tela diz o que
   está sendo buscado, na voz de quem trabalha ali. "Puxando a fila",
   "Montando o quadro", "Fazendo as contas". Não é enfeite nem é uma frase
   de espera genérica ("Carregando…", "Aguarde"): é a mesma pergunta que a
   tela responde, no gerúndio.

   O ganho não é só de charme. Numa ferramenta de cinco telas que se abrem
   umas às outras o dia inteiro, saber QUAL delas está vindo é a diferença
   entre "travou" e "está buscando o quadro".

   ---------- por que ele existe ----------
   Sem `loading.tsx`, o Next segura a tela ANTIGA inteira enquanto o
   servidor busca a nova, e o clique fica sem resposta: nada acontece, e a
   sensação é de botão quebrado. Com ele, a troca é instantânea e a espera
   passa a ter forma.

   ---------- e sob movimento reduzido ----------
   O filete não corre: ele fica cheio, de ponta a ponta. Um filete de tinta
   inteiro com uma palavra embaixo continua dizendo a mesma coisa parado, e
   é por isso que a informação foi posta na PALAVRA e não no movimento.
   ============================================================ */

import s from "@/app/crm/crm.module.css";

export function Carregando({
  palavra,
  /* Verdadeiro quando o carregando ocupa a página: aí a régua sangra até as
     bordas da janela, como a faixa de status faz. Falso dentro de um casco
     (o modal da ficha), onde sangrar seria estourar a moldura. */
  sangra = false,
}: {
  palavra: string;
  sangra?: boolean;
}) {
  return (
    <div
      className={`${s.carregando} ${sangra ? s.carregandoSangra : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className={s.carregandoRegua} aria-hidden="true">
        <i className={s.carregandoCorre} />
      </span>
      <span className={s.carregandoPalavra}>{palavra}</span>
    </div>
  );
}
