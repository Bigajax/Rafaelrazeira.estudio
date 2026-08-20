/* ============================================================
   AS REGRAS DO DINHEIRO, EM FUNÇÕES PURAS

   Mesmo contrato do lib/crm/regras.ts: nada aqui toca banco, rede ou React,
   porque as mesmas respostas precisam valer no servidor (que decide se a
   baixa persiste) e no navegador (que decide o que desenhar). Arquivo
   próprio e não mais um bloco no regras.ts por uma razão de assunto: aquele
   responde perguntas sobre o FUNIL (quando eu falo com esta pessoa, que
   etapa é esta, o que falta para mover), e este responde sobre CAIXA. São
   dois vocabulários, e o regras.ts já tem setecentas linhas.

   As datas e o formato de moeda continuam vindo de lá: fuso é fuso, e duas
   noções de "hoje" no mesmo CRM seria a pior coisa que este arquivo poderia
   inventar.
   ============================================================ */

import { dataCurta, diasEntre, hojeSP } from "./regras";
import type { Contrato, ParcelaPainel, Recebimento } from "./tipos";

/* ============================================================
   CENTAVOS

   `numeric` volta do PostgREST como número JSON, então 899.10 + 499.50 dá
   1398.6000000000001. Isso não é curiosidade: é a diferença entre um
   contrato aparecer como quitado e aparecer devendo um milésimo de centavo
   para sempre, e a segunda opção é a que acontece se ninguém escrever esta
   função.

   A saída NÃO é migrar tudo para centavos inteiros: `ticket_estimado` e
   `valor_fechado` já são `numeric` em toda a casa, e `dinheiro()` já
   formata reais. A saída é arredondar na borda de cada soma e nunca
   comparar dinheiro com igualdade exata.
   ============================================================ */

/** Arredonda para centavos. Toda soma de dinheiro sai por aqui. */
export const centavos = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Soma uma lista de valores já arredondando o resultado. */
export const somar = (valores: number[]) => centavos(valores.reduce((t, v) => t + (Number(v) || 0), 0));

/* Meio centavo de folga. `saldo === 0` é a comparação que parece certa e
   deixa contratos eternamente devendo 0,0000000001. */
export const quitado = (saldo: number) => saldo <= 0.005;

/* ---------- a moeda com centavos ----------
   `dinheiro()` do regras.ts é `maximumFractionDigits: 0`, e isso é uma
   decisão correta lá: ticket estimado e valor de pipeline são números
   redondos, e "R$ 2.500,00" num card de 210px gasta três caracteres para
   dizer nada.

   Aqui não serve. A proposta da ws-style-mens cobra R$ 899,10 no Pix à
   vista e R$ 499,50 na entrada, e mostrar "R$ 899" numa tela de caixa é
   errar dez centavos em toda conferência de extrato. Quando o valor é
   redondo, os centavos somem sozinhos: R$ 999 continua sendo R$ 999. */
const BRL_EXATO = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function dinheiroExato(v: number | null | undefined): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "R$ 0";
  return Number.isInteger(n) ? `R$ ${n.toLocaleString("pt-BR")}` : BRL_EXATO.format(n);
}

/* ============================================================
   A SITUAÇÃO DE UMA PARCELA

   Derivada, nunca coluna, pela mesma regra de `urgencia()` e
   `temperatura()` no regras.ts. Cinco respostas, e a ordem é a ordem em que
   elas mudam o que fazer:

     cancelada .. deixou de ser devida; não é dívida nem receita
     paga ....... entrou tudo
     parcial .... entrou parte (permuta cobrindo metade, desconto na hora)
     atrasada ... venceu e não entrou
     hoje ....... vence agora
     aberta ..... vence adiante, e por isso é a única que não pede nada

   A data que decide "atrasada" é `cobrar_em` quando existe, e não
   `vence_em`: adiar a cobrança é uma decisão minha, e o vencimento é um
   fato combinado com o cliente. Empurrar o vencimento para calar a tela
   seria reescrever o combinado.
   ============================================================ */
export type SituacaoParcela = "cancelada" | "paga" | "parcial" | "atrasada" | "hoje" | "aberta";

export type Situacao = {
  situacao: SituacaoParcela;
  /* Quanto ainda falta entrar. Zero em paga e cancelada. */
  saldo: number;
  /* Dias de atraso; zero quando não está atrasada. */
  atraso: number;
  /* A data em que ela pede atenção: `cobrar_em` ou, na falta, `vence_em`. */
  quando: string;
};

export function situacaoDaParcela(
  parcela: Pick<ParcelaPainel, "valor" | "vence_em" | "cobrar_em" | "cancelada_em" | "recebido">,
  hoje = hojeSP(),
): Situacao {
  const quando = parcela.cobrar_em || parcela.vence_em;
  const saldo = centavos(parcela.valor - (parcela.recebido || 0));

  if (parcela.cancelada_em) return { situacao: "cancelada", saldo: 0, atraso: 0, quando };
  if (quitado(saldo)) return { situacao: "paga", saldo: 0, atraso: 0, quando };

  if (quando < hoje) {
    const atraso = diasEntre(quando, hoje);
    /* Parcial E atrasada existe, e a escolha aqui é dizer ATRASADA: o que
       muda o dia é a dívida vencida, não o fato de parte ter entrado. O
       valor parcial continua visível no saldo, ao lado. */
    return { situacao: "atrasada", saldo, atraso, quando };
  }

  if (parcela.recebido > 0) return { situacao: "parcial", saldo, atraso: 0, quando };
  if (quando === hoje) return { situacao: "hoje", saldo, atraso: 0, quando };
  return { situacao: "aberta", saldo, atraso: 0, quando };
}

/** Se esta parcela ainda deve dinheiro. Cancelada e paga não devem. */
export const deveAinda = (s: SituacaoParcela) =>
  s === "atrasada" || s === "hoje" || s === "aberta" || s === "parcial";

/* O rótulo curto da situação, para a etiqueta da linha. Frase e não palavra
   em "atrasada" porque o número de dias É a informação: "atrasada" sozinho
   não diz se é de ontem ou de três semanas. */
export function nomeDaSituacao(s: Situacao): string {
  if (s.situacao === "cancelada") return "Cancelada";
  if (s.situacao === "paga") return "Paga";
  if (s.situacao === "parcial") return `Falta ${dinheiroExato(s.saldo)}`;
  if (s.situacao === "atrasada")
    return `Venceu há ${s.atraso} ${s.atraso === 1 ? "dia" : "dias"}`;
  if (s.situacao === "hoje") return "Vence hoje";
  return `Vence ${dataCurta(s.quando).slice(0, 5)}`;
}

/* ============================================================
   A QUITAÇÃO DE UM CONTRATO

   Quanto entrou, quanto falta, e a régua de 0 a 100 que a tela desenha.

   ---------- o desencontro que NÃO vira erro ----------
   A soma das parcelas pode não bater com o `valor_total`, e isso é
   informação, não corrupção: quer dizer que o plano de pagamento está
   incompleto. Não vira trigger nem constraint, vira LINHA VISÍVEL na tela,
   pela mesma regra já escrita no dossiê da carta da vez: "sem estimativa
   num lead em proposta é um furo do pipeline, e ele fica visível justamente
   por não ter sumido".
   ============================================================ */
export type Quitacao = {
  total: number;
  pago: number;
  saldo: number;
  /* 0 a 100, para a largura da régua. */
  pct: number;
  quitado: boolean;
  /* Quanto do total ainda não tem parcela nenhuma cobrindo. Zero quando o
     plano fecha, que é o normal. */
  semParcela: number;
};

export function quitacaoDoContrato(
  contrato: Pick<Contrato, "valor_total">,
  parcelas: Pick<ParcelaPainel, "valor" | "cancelada_em" | "recebido">[],
): Quitacao {
  const vivas = parcelas.filter((p) => !p.cancelada_em);
  const total = centavos(contrato.valor_total ?? somar(vivas.map((p) => p.valor)));
  const pago = somar(vivas.map((p) => Math.min(p.recebido || 0, p.valor)));
  const saldo = centavos(total - pago);
  const emParcelas = somar(vivas.map((p) => p.valor));

  return {
    total,
    pago,
    saldo: Math.max(0, saldo),
    /* `Math.min(100)` porque pagar a mais acontece (arredondamento do
       cliente, gorjeta involuntária) e uma régua de 104% desenha para fora
       do próprio trilho. */
    pct: total > 0 ? Math.min(100, Math.round((pago / total) * 100)) : 0,
    quitado: quitado(saldo),
    semParcela: Math.max(0, centavos(total - emParcelas)),
  };
}

/* ============================================================
   O QUE FAZER COM ELA — a frase que a fila do dia mostra

   A mesma função do `proximo_passo` de um lead, e ela existe pelo mesmo
   motivo: a fila manda cobrar, então ela tem que dizer o que cobrar. "2 de
   4" não é uma instrução; "Cobrar a 2ª parcela da vitrine" é.
   ============================================================ */
export function passoDaCobranca(parcela: ParcelaPainel, hoje = hojeSP()): string {
  const s = situacaoDaParcela(parcela, hoje);
  const alvo = parcela.rotulo.trim() || `${parcela.numero}ª parcela`;
  /* Antes de vencer é lembrete, depois de vencer é cobrança. A palavra
     muda porque as duas conversas são diferentes, e mandar a segunda na
     véspera queima um cliente que ia pagar. */
  if (s.situacao === "aberta") return `Lembrar da ${alvo.toLowerCase()}`;
  if (s.situacao === "parcial") return `Cobrar o que falta da ${alvo.toLowerCase()}`;
  return `Cobrar a ${alvo.toLowerCase()}`;
}

/* ============================================================
   O MÊS

   Agrupamento por mês no fuso da casa. `slice(0, 7)` de uma data ISO e
   nunca `getMonth()`: a segunda forma lê o fuso do servidor, que é UTC na
   Vercel, e joga todo pagamento do dia 31 depois das 21h para o mês
   seguinte.
   ============================================================ */
export const mesDe = (iso: string) => iso.slice(0, 7);

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-08" vira "ago". O ano some: a tela já diz de que ano ela fala. */
export const rotuloMes = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1] ?? mes;

/** Os doze meses de um ano, em ordem, como chaves "2026-01". */
export const mesesDoAno = (ano: number) =>
  Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`);

/* ============================================================
   GERAR AS PARCELAS

   Duas formas de nascer, e as duas devolvem a mesma coisa, porque quem
   grava é uma server action só.
   ============================================================ */
export type NovaParcela = {
  numero: number;
  de: number | null;
  rotulo: string;
  valor: number;
  vence_em: string;
  item_slug: string | null;
  metodo_previsto: string | null;
};

/* ---------- o gerador manual ----------
   Entrada opcional mais N parcelas iguais. A ÚLTIMA absorve a sobra dos
   centavos: R$ 1.000 em 3 vezes é 333,33 + 333,33 + 333,34, e não três de
   333,33 que somam R$ 999,99 e deixam o contrato devendo um centavo para
   sempre. */
export function gerarParcelas({
  total,
  entrada = 0,
  vezes,
  primeiro,
  intervaloDias = 30,
  somarDias,
}: {
  total: number;
  entrada?: number;
  vezes: number;
  primeiro: string;
  intervaloDias?: number;
  /* Injetado em vez de importado para este arquivo não depender da ordem de
     avaliação dos módulos: `somarDias` mora no regras.ts, que já é importado
     aqui para datas. É o mesmo `somarDias`, passado por quem chama. */
  somarDias: (iso: string, dias: number) => string;
}): NovaParcela[] {
  const parcelas: NovaParcela[] = [];
  const temEntrada = entrada > 0;
  const quantas = Math.max(1, Math.floor(vezes));
  const saldo = centavos(total - entrada);
  const passos = temEntrada ? quantas + 1 : quantas;

  if (temEntrada) {
    parcelas.push({
      numero: 1,
      de: passos,
      rotulo: "Entrada",
      valor: centavos(entrada),
      vence_em: primeiro,
      item_slug: null,
      metodo_previsto: "pix",
    });
  }

  const fatia = centavos(Math.floor((saldo / quantas) * 100) / 100);
  for (let i = 0; i < quantas; i++) {
    const ultima = i === quantas - 1;
    const numero = temEntrada ? i + 2 : i + 1;
    parcelas.push({
      numero,
      de: passos,
      rotulo: quantas === 1 && temEntrada ? "Saldo na entrega" : `${numero}ª parcela`,
      valor: ultima ? centavos(saldo - fatia * (quantas - 1)) : fatia,
      vence_em: somarDias(primeiro, intervaloDias * (i + (temEntrada ? 1 : 0))),
      item_slug: null,
      metodo_previsto: "pix",
    });
  }

  return parcelas;
}

/* ============================================================
   O EXTRATO DE UM RECEBIMENTO — a linha da conferência
   ============================================================ */
export const contaNoCaixa = (r: Pick<Recebimento, "estornado_em">) => !r.estornado_em;

/** Os N meses a partir de um mês, inclusive ele: "2026-08" → ago, set, out… */
export function mesesAFrente(mes: string, quantos: number): string[] {
  const ano = Number(mes.slice(0, 4));
  const m = Number(mes.slice(5, 7));
  return Array.from({ length: quantos }, (_, i) => {
    const total = m - 1 + i;
    const a = ano + Math.floor(total / 12);
    return `${a}-${String((total % 12) + 1).padStart(2, "0")}`;
  });
}
