/**
 * OS PLANOS DO PERFORMANCE: A AUTORIDADE SOBRE O PREÇO (07/10/2026).
 *
 * Decisão do Rafael em 07/10: R$ 197 por mês, sem fidelidade, de três jeitos.
 *  - Pix mês a mês: cada Pix aprovado soma 30 dias. Sem renovação sozinha:
 *    o painel conta os dias e avisa antes de acabar.
 *  - Cartão mensal: assinatura do Mercado Pago (preapproval), cobra sozinha
 *    todo mês; cada cobrança soma 35 dias (a folga para a próxima passar).
 *  - Cartão anual: R$ 1.970 em até 12x ("pague 10 meses, leve 12"); soma 365.
 *
 * Como em lib/propostas.ts, o valor NUNCA vem do browser: a rota
 * pages/api/performance-pagamento.js lê daqui. O painel da vitrine exibe os
 * mesmos números em _molde/lib/oferta-performance.ts: mudou aqui, muda lá e
 * na nota do cofre (4 Máquina/performance.md).
 */
import { TURBINAR } from "./oferta";

export type PlanoPerformance = "pix_mensal" | "cartao_mensal" | "cartao_anual";

export const PLANOS_PERFORMANCE: Record<
  PlanoPerformance,
  { rotulo: string; valor: number; dias: number; metodo: "pix" | "assinatura" | "cartao"; maxParcelas?: number; descricao: string }
> = {
  pix_mensal: { rotulo: "Pix, mês a mês", valor: 197, dias: 30, metodo: "pix", descricao: "Performance: 30 dias (Pix)" },
  cartao_mensal: { rotulo: "Cartão, todo mês", valor: 197, dias: 35, metodo: "assinatura", descricao: "Performance: assinatura mensal" },
  cartao_anual: { rotulo: "Cartão, o ano todo", valor: 1970, dias: 365, metodo: "cartao", maxParcelas: 12, descricao: "Performance: 12 meses" },
};

export const ehPlano = (v: unknown): v is PlanoPerformance => typeof v === "string" && v in PLANOS_PERFORMANCE;

/**
 * OS PLANOS DO TURBINAR (03/11/2026): o estúdio roda os anúncios da Meta da
 * loja, por mês, COM o Performance incluído (decisão do Rafael em 03/11: é
 * na parte paga da Desempenho que as campanhas aparecem). Pix soma 30 dias;
 * o cartão é assinatura do Mercado Pago, cada cobrança soma 35. O valor é o
 * TURBINAR.gestao de lib/oferta.ts, o mesmo que a página /turbinar mostra. O
 * piloto (R$ 397) não é plano: é contrato manual no CRM, ligado à loja em
 * perf_lojas.turbinar_contrato_id (supabase/turbinar.sql). Quem soma os dias
 * é a função perf_registrar_turbinar.
 */
export type PlanoTurbinar = "turbinar_pix" | "turbinar_cartao";

export const PLANOS_TURBINAR: Record<PlanoTurbinar, { rotulo: string; valor: number; dias: number; metodo: "pix" | "assinatura"; descricao: string }> = {
  turbinar_pix: { rotulo: "Pix, mês a mês", valor: TURBINAR.gestao, dias: 30, metodo: "pix", descricao: "Turbinar: 30 dias (Pix)" },
  turbinar_cartao: { rotulo: "Cartão, todo mês", valor: TURBINAR.gestao, dias: 35, metodo: "assinatura", descricao: "Turbinar: assinatura mensal" },
};

export const ehTurbinar = (v: unknown): v is PlanoTurbinar => typeof v === "string" && v in PLANOS_TURBINAR;

/**
 * O UPGRADE DA VITRINE: UM DEGRAU SÓ, A LOJA ONLINE (04/11/2026).
 *
 * Até 03/11 eram dois degraus (Vender pela vitrine R$ 1.990/991 sem
 * mensalidade; Loja online R$ 3.499/2.500 + R$ 249,90). Na venda à Iconic
 * o Luciano apontou que "o checkout é o mesmo para 1 ou 10 pares", e era:
 * nenhum recurso do motor depende do degrau, só o Melhor Envio. Decisão do
 * Rafael em 04/11: um produto só, "Loja online", R$ 1.990 cheio e R$ 991
 * para quem já tem a vitrine (a vitrine paga abate os R$ 999, regra de
 * 25/09 na proposta da Fardo), com o Melhor Envio incluso e a mensalidade
 * OBRIGATÓRIA de R$ 249,90 (banco pago que não pausa + Performance +
 * suporte). A Iconic (03/11, R$ 991 sem mensalidade) é a exceção registrada.
 *
 * As chaves "vender" e "vender_*" CONTINUAM existindo: o webhook do Mercado
 * Pago (lib/mercadopago/processar.js) resolve as referências dos pagamentos
 * antigos por elas, e o painel das lojas já entregues ainda monta o link
 * ?degrau=vender. Elas apontam para o mesmo degrau. Pix à vista ou cartão em
 * até 12x com os juros do Mercado Pago; não somam dias de acesso.
 */
export type Degrau = "vender" | "loja";
export type PlanoUpgrade = "vender_pix" | "vender_cartao" | "loja_pix" | "loja_cartao";

export const MENSALIDADE_ECOMMERCE = 249.9;

const LOJA_ONLINE = {
  nome: "Loja online",
  cheio: 1990,
  vitrine: 999,
  valor: 991,
  prazo: "até 15 dias úteis",
  mensal: `${MENSALIDADE_ECOMMERCE.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por mês depois da entrega, com o Performance e o suporte incluídos`,
  /* só o que o motor faz hoje. O aviso de pedido pago no WhatsApp ainda é
     e-mail (checkout-da-vitrine.md): não prometer. */
  inclui: [
    "Sacola com várias peças, Pix e cartão sem sair do site",
    "Estoque que baixa sozinho a cada venda",
    "Frete calculado para todo o Brasil, entrega na sua região ou retirada na loja",
    "A lista de pedidos pagos no seu painel",
  ],
};

export const DEGRAUS: Record<Degrau, { nome: string; cheio: number; vitrine: number; valor: number; prazo: string; mensal: string | null; inclui: string[] }> = {
  /* alias da fusão de 04/11: mesmo produto, mesmo preço */
  vender: LOJA_ONLINE,
  loja: LOJA_ONLINE,
};

export const UPGRADES: Record<PlanoUpgrade, { degrau: Degrau; rotulo: string; valor: number; metodo: "pix" | "cartao"; maxParcelas?: number; descricao: string }> = {
  vender_pix: { degrau: "vender", rotulo: "Pix, à vista", valor: 991, metodo: "pix", descricao: "Upgrade: loja online (Pix)" },
  vender_cartao: { degrau: "vender", rotulo: "Cartão, em até 12x", valor: 991, metodo: "cartao", maxParcelas: 12, descricao: "Upgrade: loja online" },
  loja_pix: { degrau: "loja", rotulo: "Pix, à vista", valor: 991, metodo: "pix", descricao: "Upgrade: loja online (Pix)" },
  loja_cartao: { degrau: "loja", rotulo: "Cartão, em até 12x", valor: 991, metodo: "cartao", maxParcelas: 12, descricao: "Upgrade: loja online" },
};

export const ehUpgrade = (v: unknown): v is PlanoUpgrade => typeof v === "string" && v in UPGRADES;
export const ehDegrau = (v: unknown): v is Degrau => v === "vender" || v === "loja";
