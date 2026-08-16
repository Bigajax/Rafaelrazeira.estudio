/* ============================================================
   AS PEÇAS DA FICHA

   Pedaços sem estado, usados pela linha do painel Hoje e pelo card do
   kanban. Eles existem para que as duas telas leiam o MESMO lead do mesmo
   jeito: se o card diz uma coisa e a linha diz outra, o Rafael passa a
   confiar em uma tela só, e a outra vira enfeite.

   ------------------------------------------------------------
   A FICHA TEM QUATRO LINHAS, E CADA UMA TEM UMA VOZ

     1. NOME .................. display condensada, e o TICKET na mesma
                                linha, alinhado à direita. Duas coisas
                                grandes, uma de cada lado.
     2. EMPRESA · TIPO ........ corpo miúdo. Contexto, não decisão.
     3. PRÓXIMO PASSO ......... corpo. É a frase que faz a pessoa agir, e
                                por isso é a única em tamanho de leitura.
     4. O SINAL ............... mono, UM só, escolhido pela escada em
                                lib/crm/regras.ts.

   Antes eram sete linhas com quatro delas em mono maiúscula do mesmo
   tamanho. O card sabia tudo e não dizia nada.

   Sem "use client" de propósito: são funções que devolvem marcação, sem
   gancho nenhum. Assim elas rodam no servidor quando quem chama é servidor,
   e no cliente quando quem chama é cliente.
   ============================================================ */

import {
  dinheiro,
  doisRetornos,
  sinalDaFicha,
  temperatura,
  urgencia,
} from "@/lib/crm/regras";
import { NOME_TIPO, type LeadPainel } from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

/* ---------- as duas classes de estado ----------
   Uma para a urgência (o filete de margem) e uma para a temperatura (o chão
   da ficha). Elas nunca se sobrepõem: uma mexe em `border-left-color`, a
   outra em `background`. É por isso que dá para ler as duas ao mesmo tempo
   sem que uma apague a outra, e é por isso que o SINAL pode ser um só: a
   temperatura já está dita pelo papel, sem gastar linha. */
export function classesDaFicha(lead: LeadPainel, hoje: string): string {
  const urg = urgencia(lead, hoje);
  const { estado } = temperatura(lead, hoje);

  const doFilete =
    lead.estagio === "ganho"
      ? s.urgGanho
      : urg === "atrasado"
        ? s.urgAtrasado
        : urg === "hoje"
          ? s.urgHoje
          : urg === "sem_passo"
            ? s.urgSemPasso
            : s.urgAgendado;

  const doChao =
    lead.estagio === "perdido"
      ? s.fechadoPerdido
      : estado === "frio"
        ? s.tempFrio
        : estado === "esfriando"
          ? s.tempEsfriando
          : "";

  return `${s.ficha} ${doFilete} ${doChao}`.trim();
}

/* ---------- linha 1: o nome, e o número do lado direito ----------
   O ticket sai da fileira de etiquetas em mono e vira número na voz de
   display. Não é ênfase gratuita: é o mesmo valor que o cabeçalho da coluna
   soma, e dar a ele a mesma voz do nome é o que permite varrer uma coluna
   lendo só a margem direita. */
export function TopoDaFicha({ lead }: { lead: LeadPainel }) {
  const valor = lead.valor_fechado ?? lead.ticket_estimado;
  return (
    <span className={s.fichaTopo}>
      <b className={s.fichaNome}>{lead.nome}</b>
      {valor ? <span className={s.fichaValor}>{dinheiro(valor)}</span> : null}
    </span>
  );
}

/* ---------- linha 2: de quem é, e do que se trata ----------
   Empresa e tipo de projeto numa linha só, separados por um ponto médio
   esmeralda. O ponto é o que sobrou da etiqueta de mono que ocupava uma
   linha inteira para dizer sete caracteres, e ele mantém a cor da marca
   dentro da grade, que é onde ela sumia. */
export function ContextoDaFicha({ lead }: { lead: LeadPainel }) {
  const tipo = lead.tipo_projeto ? NOME_TIPO[lead.tipo_projeto] : null;
  if (!lead.empresa && !tipo) return null;

  return (
    <span className={s.fichaContexto}>
      {lead.empresa}
      {lead.empresa && tipo ? <i className={s.pontoVerde}>·</i> : null}
      {tipo}
    </span>
  );
}

/* ---------- linha 3: o que fazer ----------
   A frase da ausência é instrução, não diagnóstico: "sem próximo passo"
   descreveria o problema e pararia aí. "Decida o próximo passo" diz o que
   fazer, que é o único motivo de a ficha estar na tela. */
export function PassoDaFicha({ lead }: { lead: LeadPainel }) {
  if (!lead.proximo_passo) {
    return <span className={`${s.fichaPasso} ${s.fichaSemPasso}`}>Decida o próximo passo</span>;
  }
  return <span className={s.fichaPasso}>{lead.proximo_passo}</span>;
}

/* ---------- linha 4: o sinal ----------
   Um por ficha. A escada que escolhe está em lib/crm/regras.ts, com a
   explicação de por que a ordem é aquela. */
const TOM: Record<string, string> = {
  alerta: s.sinalAlerta,
  agora: s.sinalAgora,
  morno: s.sinalMorno,
  quieto: s.sinalQuieto,
};

export function SinalDaFicha({ lead, hoje }: { lead: LeadPainel; hoje: string }) {
  const { texto, tom } = sinalDaFicha(lead, hoje);
  return <span className={`${s.sinal} ${TOM[tom]}`}>{texto}</span>;
}

/* ---------- REGRA 5, por extenso ----------
   O card e a linha já dizem "2 toques sem resposta" pelo sinal. Este bloco
   é a SUGESTÃO, e ele mora só na ficha do lead, que é a tela onde a decisão
   é tomada e onde há espaço para uma frase inteira.

   Sugestão visual, nunca ação: nenhum botão faz a escolha. Um lead que não
   respondeu duas vezes pode estar de férias, e mover sozinho para perdido
   seria o CRM inventando um fato. */
export function AvisoDoisRetornos({ lead }: { lead: LeadPainel }) {
  if (!doisRetornos(lead)) return null;
  return (
    <span className={s.aviso}>
      <b>{lead.saidas_seguidas} retornos</b>
      <span>
        Você falou {lead.saidas_seguidas} vezes seguidas sem resposta. Costuma ser hora de espaçar
        para follow-up longo, ou de encerrar como &quot;sumiu, sem resposta&quot;.
      </span>
    </span>
  );
}
