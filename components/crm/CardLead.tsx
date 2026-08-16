"use client";

/* ============================================================
   O CARD DO KANBAN

   A mesma ficha do painel Hoje, num campo três vezes mais estreito. O que
   muda não é o desenho, é o que cabe: aqui não entram as quatro ações de
   linha, porque três botões numa coluna de 250px viram três botões
   ilegíveis. Entram as quatro linhas da ficha (ver components/crm/pecas.tsx):
   nome com o ticket na margem direita, empresa e tipo, o próximo passo, e
   UM sinal de estado.

   ---------- por que todo card tem um <select> de estágio ----------
   Ele é invisível no computador (CSS) e aparece no celular, onde arrastar
   entre oito colunas não existe. Mas ele não é só a versão móvel do
   arrasto: ele é também o caminho de TECLADO para mover um lead, e é o que
   faz esta tela continuar utilizável para quem não usa mouse. Arrastar é o
   atalho; o select é a função.
   ============================================================ */

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ESTAGIOS, NOME_ESTAGIO, type Estagio, type LeadPainel } from "@/lib/crm/tipos";
import { classesDaFicha, ContextoDaFicha, PassoDaFicha, SinalDaFicha, TopoDaFicha } from "./pecas";
import s from "@/app/crm/crm.module.css";

export function CardLead({
  lead,
  hoje,
  assentando,
  aoTrocarEstagio,
}: {
  lead: LeadPainel;
  hoje: string;
  /* Verdadeiro pelos 320ms seguintes ao soltar deste card. É o recibo do
     arrasto: o papel desce e a sombra fecha, o mesmo carimbo do botão de
     ação da casa. Vem de cima porque quem sabe que houve uma passagem é o
     quadro, não o card. */
  assentando: boolean;
  aoTrocarEstagio: (lead: LeadPainel, estagio: Estagio) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { estagio: lead.estagio },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`${classesDaFicha(lead, hoje)} ${s.arrastavel} ${isDragging ? s.cardArrastando : ""} ${assentando ? s.cardAssentando : ""}`}
      {...attributes}
      {...listeners}
      aria-label={`${lead.nome}, ${NOME_ESTAGIO[lead.estagio]}`}
    >
      {/* `fichaCheia` estica a área de clique deste link até as bordas do
          card: no quadro não há botão concorrendo, e o alvo de "quero ver
          este lead" tem que ser o card, não uma faixa de 16px no topo dele.
          O texto do link continua sendo só o nome e a empresa, que é o que
          um leitor de tela precisa ouvir. */}
      <Link href={`/crm/lead/${lead.id}`} className={`${s.fichaLink} ${s.fichaCheia}`}>
        <TopoDaFicha lead={lead} />
        <ContextoDaFicha lead={lead} />
      </Link>

      <PassoDaFicha lead={lead} />
      <SinalDaFicha lead={lead} hoje={hoje} />

      <label className={s.moverNoCelular}>
        <span className={s.campoRot}>Mover para</span>
        <select
          value={lead.estagio}
          onChange={(e) => aoTrocarEstagio(lead, e.target.value as Estagio)}
          /* O select vive dentro de um elemento arrastável: sem parar a
             propagação, tocar nele começaria um arrasto em vez de abrir a
             lista. */
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {ESTAGIOS.map((e) => (
            <option key={e} value={e}>
              {NOME_ESTAGIO[e]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/* O card que voa junto com o cursor durante o arrasto. É uma cópia sem
   comportamento: sem link, sem select, sem `useSortable`. Ele existe para
   que o card original possa ficar apagado no lugar de origem enquanto este
   mostra para onde a mão está indo. */
export function CardVoando({
  lead,
  hoje,
  falta,
}: {
  lead: LeadPainel;
  hoje: string;
  /* O que este lead vai ter que preencher em QUALQUER coluna do quadro,
     já em frase pronta ("Falta passo e data"). Vazio quando o lead está
     completo, e aí o card voa sem tarja. */
  falta: string;
}) {
  return (
    <div className={`${classesDaFicha(lead, hoje)} ${s.cardVoo}`}>
      <TopoDaFicha lead={lead} />
      <ContextoDaFicha lead={lead} />
      <PassoDaFicha lead={lead} />
      <SinalDaFicha lead={lead} hoje={hoje} />

      {/* A tarja de tinta no pé do card em voo. Tinta cheia é a voz do
          sistema nesta casa (a faixa de status, a placa da coluna, o
          carimbo da busca), e este é o sistema falando no meio de um gesto:
          "leve este card para onde quiser, ele vai te pedir isto". */}
      {falta ? <span className={s.vooFalta}>{falta}</span> : null}
    </div>
  );
}
