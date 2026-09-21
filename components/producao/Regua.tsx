/* ============================================================
   A RÉGUA DE PRODUÇÃO

   Quatro marcos ligados por um fio, e eles não são um enfeite de progresso:
   são a coluna `status` desenhada. Quem abre a bancada precisa responder
   "em que pé está esta loja" antes de qualquer outra coisa, e uma palavra
   solta num canto ("catalogo") nunca respondeu isso.

   ---------- por que quatro, e por que estes quatro ----------
   O banco tem seis status, e dois deles não são etapa: `colhendo` é um
   estado passageiro (a rota está rodando) e `erro` é uma parada, não um
   lugar do percurso. Desenhar os seis daria uma régua que às vezes anda
   para trás. Ficam os quatro marcos do trabalho de verdade:

     colhida    as fotos e o perfil estão aqui
     catálogo   as peças foram lidas
     conferida  você olhou linha por linha
     pronta     está pronta para virar prévia

   "Conferida" não existe como status: ela é derivada (todo produto
   revisado). É a única etapa que o banco não sabe sozinho, e é justamente a
   que mais importa, porque é a que separa o que a máquina fez do que você
   garantiu.

   O dispositivo (marcos ligados por fio) é da casa: é o mesmo do "como
   funciona" da /vitrine-digital. Usar de novo aqui é sistema, não
   repetição: sequência, nesta casa, se desenha assim.
   ============================================================ */

import s from "@/app/(pt)/crm/producao.module.css";
import type { Status } from "@/lib/producao/tipos";

export type Etapas = {
  colhida: boolean;
  catalogo: boolean;
  conferida: boolean;
  pronta: boolean;
};

/* A régua lê o status e a contagem de conferidos, e devolve o que já foi
   vencido. Uma função e não uma prop por marco: assim a regra de "o que
   conta como vencido" mora em um lugar só, e a lista e a ficha nunca
   discordam sobre onde a loja está. */
export function etapasDe(status: Status, produtos: number, revisados: number): Etapas {
  const catalogo = produtos > 0;
  return {
    colhida: status !== "nova",
    catalogo,
    conferida: catalogo && revisados === produtos,
    pronta: status === "pronta",
  };
}

const MARCOS: { chave: keyof Etapas; rotulo: string }[] = [
  { chave: "colhida", rotulo: "colhida" },
  { chave: "catalogo", rotulo: "catálogo" },
  { chave: "conferida", rotulo: "conferida" },
  { chave: "pronta", rotulo: "pronta" },
];

export function Regua({ etapas, className }: { etapas: Etapas; className?: string }) {
  /* O marco "da vez" é o primeiro que ainda não foi vencido, e é o único
     que recebe cor. Quando tudo está vencido não existe próximo, e a régua
     fica inteira em tinta cheia: é o desenho de "acabou". */
  const aVez = MARCOS.find((m) => !etapas[m.chave])?.chave ?? null;

  return (
    /* `reguaCompleta` (21/09): sem marco da vez, a régua inteira é tinta
       cheia e o único rótulo que aparece é o do fim, "pronta". */
    <ol className={`${s.regua} ${aVez === null ? s.reguaCompleta : ""} ${className ?? ""}`}>
      {MARCOS.map(({ chave, rotulo }) => (
        <li
          key={chave}
          className={`${s.marco} ${etapas[chave] ? s.marcoFeito : ""} ${aVez === chave ? s.marcoAtual : ""}`}
          aria-current={aVez === chave ? "step" : undefined}
        >
          <i aria-hidden />
          <span>{rotulo}</span>
        </li>
      ))}
    </ol>
  );
}
