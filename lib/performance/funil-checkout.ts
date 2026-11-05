/* ============================================================
   O FUNIL DA LOJA ONLINE (05/11/2026, pedido do Rafael)

   Os passos da compra paga no site, em PESSOAS (visitantes distintos), pela
   perf_funil_checkout do supabase/performance-checkout.sql. A função é só da
   chave de serviço (a contagem de toda loja não abre para o navegador), então
   esta leitura roda só no servidor, depois do login do CRM.

   As taxas que o Rafael pediu saem daqui, cada uma sobre a base certa:
     adição à sacola      sacola / abriram a peça (a página, não o cartão visto)
     preenchimento        preencheram os dados / começaram o checkout
     abandono do checkout 1 - pagaram / começaram o checkout
     conversão            pagaram / visitantes
   O pago conta pelo servidor da loja, quando o banco confirma: nunca porque a
   tela do comprador disse. Com menos de 30 pessoas na base, a taxa aparece com
   o aviso de poucos dados: número de 5 pessoas não é tendência.
   ============================================================ */

import { createClient } from "@supabase/supabase-js";

export type FunilCheckout = {
  dias: number;
  visitantes: number;
  viram_peca: number;
  abriram_peca: number;
  sacola: number;
  iniciado: number;
  dados: number;
  entrega: number;
  pagar: number;
  pago: number;
};

export const BASE_MINIMA = 30;
export const PERIODOS = [7, 30, 90] as const;

/** null quando a chave de serviço falta ou a função não existe (o SQL não rodou) */
export async function lerFunilCheckout(lojaId: string, dias: number): Promise<FunilCheckout | null> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  const { data, error } = await createClient(url, chave, { auth: { persistSession: false } }).rpc("perf_funil_checkout", { p_loja: lojaId, dias });
  if (error || !data) return null;
  return data as FunilCheckout;
}

export type Taxa = { nome: string; valor: number | null; base: number; poucos: boolean; explica: string };

const razao = (a: number, b: number) => (b > 0 ? a / b : null);

/** as quatro taxas, cada uma com a base que a sustenta */
export function taxasDoFunil(f: FunilCheckout): Taxa[] {
  const t = (nome: string, valor: number | null, base: number, explica: string): Taxa => ({ nome, valor, base, poucos: base < BASE_MINIMA, explica });
  const pagos = razao(f.pago, f.iniciado);
  return [
    t("Adição à sacola", razao(f.sacola, f.abriram_peca), f.abriram_peca, "de quem abriu uma peça, quantos puseram na sacola"),
    t("Preenchimento do checkout", razao(f.dados, f.iniciado), f.iniciado, "de quem começou a pagar, quantos preencheram os dados"),
    t("Abandono do checkout", pagos === null ? null : 1 - pagos, f.iniciado, "de quem começou a pagar, quantos não pagaram"),
    t("Conversão", razao(f.pago, f.visitantes), f.visitantes, "de quem entrou na loja, quantos pagaram"),
  ];
}

/** os degraus na ordem da compra, cada um com a parte que seguiu do degrau anterior */
export function degrausDoFunil(f: FunilCheckout) {
  const passos: [string, number][] = [
    ["Entraram na loja", f.visitantes],
    ["Abriram uma peça", f.abriram_peca],
    ["Puseram na sacola", f.sacola],
    ["Começaram a pagar", f.iniciado],
    ["Preencheram os dados", f.dados],
    ["Escolheram a entrega", f.entrega],
    ["Foram pagar", f.pagar],
    ["Pagaram", f.pago],
  ];
  return passos.map(([nome, n], i) => ({ nome, n, doAnterior: i === 0 ? null : razao(n, passos[i - 1][1]) }));
}
