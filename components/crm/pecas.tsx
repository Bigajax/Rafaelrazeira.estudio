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

import { Fragment } from "react";
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
      {/* A chama do quente, a mesma da carta do Hoje, aqui PARADA e no
          verde de papel: trinta cards com fogo tremulando seria parque
          de diversões, e a silhueta sozinha já responde "quem desta
          coluna eu atendo primeiro". Sem miolo vazado: em 10px ele só
          sujaria a forma. */}
      {lead.dossie?.status === "ok" && lead.dossie.veredito === "quente" ? (
        <svg className={s.fichaChama} viewBox="0 0 14 16" role="img" aria-label="Lead quente">
          <path d="M9.6 0 C10.6 2.6 9.8 4.2 7.6 6 C5.4 7.8 3.4 9 3.4 11 A4.9 4.9 0 0 0 13 11.6 C13.4 8.4 11 7.2 10.6 4.6 C10.4 3.2 10.2 1.4 9.6 0 Z M5 2.6 C5.6 4 5 5 3.8 6.4 C2.6 7.8 1.6 9 1.6 10.6 C1.6 11.4 1.8 12 2.2 12.8 C.8 11.6 0 10.2 0 8.6 C0 6 3.2 4.6 5 2.6 Z" />
        </svg>
      ) : null}
      <b className={s.fichaNome}>{lead.nome}</b>
      {valor ? <span className={s.fichaValor}>{dinheiro(valor)}</span> : null}
    </span>
  );
}

/* ---------- linha 2: de quem é, e do que se trata ----------
   Partes separadas pelo ponto médio esmeralda, e a linha SÓ DIZ O QUE
   VARIA: empresa igual ao nome não repete (prospecção local é cheia de
   "Padaria do Zé" duas vezes, a mesma regra da carta do Hoje), e o nicho
   fala no lugar do tipo de projeto quando existe: num quadro em que 90%
   é vitrine, "Vitrine digital" carimbado em todo card é ruído, enquanto
   "tatuagem · Sarandi" é o que diferencia um card do vizinho. */
export function ContextoDaFicha({ lead }: { lead: LeadPainel }) {
  const mesmoNome =
    lead.empresa?.trim().toLocaleLowerCase("pt-BR") === lead.nome.trim().toLocaleLowerCase("pt-BR");
  const partes = [
    mesmoNome ? null : lead.empresa,
    lead.nicho || (lead.tipo_projeto ? NOME_TIPO[lead.tipo_projeto] : null),
    lead.cidade,
  ].filter((p): p is string => Boolean(p));
  if (!partes.length) return null;

  return (
    <span className={s.fichaContexto}>
      {partes.map((p, i) => (
        <Fragment key={i}>
          {i ? <i className={s.pontoVerde}>·</i> : null}
          {p}
        </Fragment>
      ))}
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
