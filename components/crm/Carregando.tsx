/* ============================================================
   O CARREGANDO — a manchete chegando

   Nenhuma roda girando, nenhum esqueleto cinza pulsando. A palavra do
   gerúndio ("Puxando a fila", "Montando o quadro", "Fazendo as contas")
   sai na VOZ DE MANCHETE da casa, no mesmo corpo e no mesmo lugar do h1
   da tela que está vindo: a troca do carregando pela página é um
   preenchimento, não um pulo. O ponto final rosa pulsa no ritmo da régua,
   que corre logo abaixo sobre um trilho de hachura: o que a tinta ainda
   não alcançou está em rascunho, que é o estado da tela.

   A palavra não é enfeite nem frase genérica ("Carregando…", "Aguarde"):
   é a mesma pergunta que a tela responde, no gerúndio. Numa ferramenta de
   cinco telas que se abrem umas às outras o dia inteiro, saber QUAL delas
   está vindo é a diferença entre "travou" e "está buscando o quadro".

   ---------- por que ele existe ----------
   Sem `loading.tsx`, o Next segura a tela ANTIGA inteira enquanto o
   servidor busca a nova, e o clique fica sem resposta: nada acontece, e a
   sensação é de botão quebrado. Com ele, a troca é instantânea e a espera
   passa a ter forma.

   ---------- e sob movimento reduzido ----------
   O filete não corre (fica cheio, de ponta a ponta) e o ponto não pulsa.
   Uma manchete com um filete de tinta inteiro embaixo continua dizendo a
   mesma coisa parada, e é por isso que a informação foi posta na PALAVRA
   e não no movimento.
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
      <span className={s.carregandoPalavra}>
        {palavra}
        <i className={`${s.ponto} ${s.carregandoPonto}`} aria-hidden="true">
          .
        </i>
      </span>
      <span className={s.carregandoRegua} aria-hidden="true">
        <i className={s.carregandoCorre} />
      </span>
    </div>
  );
}
