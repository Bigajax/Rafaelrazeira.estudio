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
 * OS UPGRADES DA VITRINE (07/10/2026). Os valores são os que o Rafael
 * decidiu em 25/09 na proposta da loja online da Fardo, com a regra "a
 * vitrine paga abate": quem tem painel já pagou os R$ 999, então paga a
 * diferença. Vender pela vitrine: R$ 1.990 cheio, R$ 991 abatido. Loja
 * online: R$ 3.499 cheio, R$ 2.500 abatido, mais R$ 249,90 por mês depois da
 * entrega, COM o Performance incluído (decisão de 07/10). Pix à vista ou
 * cartão em até 12x com os juros do Mercado Pago; não somam dias de acesso.
 */
export type Degrau = "vender" | "loja";
export type PlanoUpgrade = "vender_pix" | "vender_cartao" | "loja_pix" | "loja_cartao";

export const DEGRAUS: Record<Degrau, { nome: string; cheio: number; vitrine: number; valor: number; prazo: string; mensal: string | null; inclui: string[] }> = {
  vender: {
    nome: "Vender pela vitrine",
    cheio: 1990,
    vitrine: 999,
    valor: 991,
    prazo: "até 10 dias úteis",
    mensal: null,
    inclui: [
      "Pix e cartão na página da peça: quem decidiu paga na hora",
      "Entrega na sua região, com a taxa por lugar, ou retirada na loja",
      "Os pedidos pagos chegam no seu WhatsApp, com a peça e o endereço",
    ],
  },
  loja: {
    nome: "Loja online",
    cheio: 3499,
    vitrine: 999,
    valor: 2500,
    prazo: "15 a 20 dias úteis",
    mensal: "R$ 249,90 por mês depois da entrega, com o Performance incluído",
    inclui: [
      "Sacola com várias peças e pagamento no Pix ou no cartão",
      "Estoque que baixa sozinho a cada venda",
      "Frete calculado para todo o Brasil",
      "A lista de pedidos no seu painel",
    ],
  },
};

export const UPGRADES: Record<PlanoUpgrade, { degrau: Degrau; rotulo: string; valor: number; metodo: "pix" | "cartao"; maxParcelas?: number; descricao: string }> = {
  vender_pix: { degrau: "vender", rotulo: "Pix, à vista", valor: 991, metodo: "pix", descricao: "Upgrade: vender pela vitrine (Pix)" },
  vender_cartao: { degrau: "vender", rotulo: "Cartão, em até 12x", valor: 991, metodo: "cartao", maxParcelas: 12, descricao: "Upgrade: vender pela vitrine" },
  loja_pix: { degrau: "loja", rotulo: "Pix, à vista", valor: 2500, metodo: "pix", descricao: "Upgrade: loja online (Pix)" },
  loja_cartao: { degrau: "loja", rotulo: "Cartão, em até 12x", valor: 2500, metodo: "cartao", maxParcelas: 12, descricao: "Upgrade: loja online" },
};

export const ehUpgrade = (v: unknown): v is PlanoUpgrade => typeof v === "string" && v in UPGRADES;
export const ehDegrau = (v: unknown): v is Degrau => v === "vender" || v === "loja";
