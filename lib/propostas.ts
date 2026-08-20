/* ============================================================
   OS PLANOS DE PAGAMENTO DAS PROPOSTAS

   Ela morava dentro de pages/api/proposta-pagamento.js e saiu para cá em
   20/08 sem mudar de forma. A razão é o CRM: até aqui o estúdio tinha os
   planos de pagamento exatos de cada cliente escritos num lugar e um Caixa
   que não sabia deles em outro, e montar o contrato da vérít.lab significava
   redigitar R$ 199 e R$ 800 na mão, torcendo para bater com o que o botão
   da proposta cobra de verdade.

   Agora as duas pontas leem o MESMO objeto. Ele continua sendo a autoridade
   sobre preço, e continua sendo a única: a REGRA DE OURO da rota de
   pagamento não mudou, o valor nunca vem do browser, o client só manda o id
   do item.

   ---------- por que continua em código e não virou tabela ----------
   O checkout é público e roda em toda abertura de proposta: virar tabela
   significaria ler banco com service role a cada carga de página, e trocar
   um preço revisado em revisão de código por uma linha que alguém digita
   errado às onze da noite. O plano é escrito uma vez por cliente e nunca
   editado. O CRM precisa LER isto, não possuir.

   ---------- a armadilha que ele esconde ----------
   `maxParcelas` NÃO é cronograma de recebimento. Quando o cliente paga
   R$ 800 em 4x no cartão, o Mercado Pago repassa de uma vez e quem parcela é
   o banco dele. Cada ITEM aqui é um recebimento; as vezes do cartão são
   problema do cliente. Ver a nota longa na migração de 20/08 do crm.sql.

   Para criar uma proposta nova com checkout: acrescente a entrada aqui e os
   botões no HTML (ver proposta/CHECKOUT.md).
   ============================================================ */

export type ItemProposta = {
  label: string;
  valor: number;
  metodo: "pix" | "card";
  maxParcelas?: number;
};

export type Proposta = {
  titulo: string;
  whatsapp?: string;
  itens: Record<string, ItemProposta>;
};

export const PROPOSTAS: Record<string, Proposta> = {
  baixudos: {
    titulo: "Rafael Razeira Estúdio — Projeto Baixudos.PR",
    itens: {
      avista_pix: { label: "À vista no Pix, com desconto", valor: 1790, metodo: "pix" },
      avista_card: { label: "No cartão, em até 12x", valor: 1990, metodo: "card", maxParcelas: 12 },
      entrada_pix: { label: "Entrada do modelo em 3 etapas", valor: 790, metodo: "pix" },
    },
  },
  "pr-grife": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital PR Grife",
    itens: {
      avista_pix: { label: "À vista no Pix, com desconto", valor: 2690, metodo: "pix" },
      avista_card: { label: "No cartão, em até 6x", valor: 2990, metodo: "card", maxParcelas: 6 },
      entrada_pix: { label: "Entrada do modelo em 3 etapas", valor: 1190, metodo: "pix" },
      painel_pix: { label: "Módulo painel da vitrine (contratação junto)", valor: 1290, metodo: "pix" },
      /* Cobrado na página de entrega (/entrega/pr-grife.html), não na proposta. */
      saldo_pix: { label: "Saldo final da entrega", valor: 700, metodo: "pix" },
    },
  },
  "xavier-sports": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital Xavier's Sports",
    whatsapp: "5544999997219",
    itens: {
      entrada_pix: { label: "Entrada para início do projeto", valor: 200, metodo: "pix" },
      saldo_card: { label: "Saldo do projeto no cartão, em 4x", valor: 800, metodo: "card", maxParcelas: 4 },
    },
  },
  arrazou: {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital ArraZou Semijoias",
    whatsapp: "5544999997219",
    /* Duas parcelas iguais, e cada uma paga uma etapa: a primeira o
       desenho, a segunda a entrega. Diferente do modelo de entrada
       simbólica das propostas antigas (199 + 800), aqui a metade da
       frente cobre o trabalho que acontece antes de existir site. */
    itens: {
      entrada_pix: { label: "1ª parcela: design do projeto", valor: 500, metodo: "pix" },
      saldo_pix: { label: "2ª parcela: na entrega", valor: 499, metodo: "pix" },
    },
  },
  "verit-lab": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital vérít.lab",
    whatsapp: "5544999997219",
    itens: {
      avista_pix: { label: "À vista no Pix", valor: 999, metodo: "pix" },
      entrada_pix: { label: "Entrada para início do projeto", valor: 199, metodo: "pix" },
      saldo_card: { label: "Saldo do projeto no cartão, em 4x", valor: 800, metodo: "card", maxParcelas: 4 },
    },
  },
  "ws-style-mens": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital WS Style Mens",
    whatsapp: "5544999997219",
    itens: {
      avista_pix: { label: "À vista no Pix, com 10% de desconto", valor: 899.1, metodo: "pix" },
      entrada_pix: { label: "Entrada no Pix (mais R$ 499,50 na entrega)", valor: 499.5, metodo: "pix" },
      avista_card: { label: "No cartão, em até 6x", valor: 999, metodo: "card", maxParcelas: 6 },
    },
  },
  "pisada-de-ouro": {
    titulo: "Rafael Razeira Estúdio — E-commerce Pisada de Ouro",
    whatsapp: "5544999997219",
    itens: {
      avista_pix: { label: "À vista no Pix, com 10% de desconto", valor: 2691, metodo: "pix" },
      entrada_pix: { label: "Entrada no Pix (mais R$ 1.495 na entrega)", valor: 1495, metodo: "pix" },
      avista_card: { label: "No cartão, em até 6x", valor: 2990, metodo: "card", maxParcelas: 6 },
    },
  },
  /* Campanha Gol Vermelho. NÃO confundir com a entrada "baixudos" acima,
     que pertence à proposta antiga em /proposta/baixudos.html e segue viva
     com os valores dela. */
  "baixudos-pr": {
    titulo: "Rafael Razeira Estúdio — Campanha Gol Vermelho Baixudos.PR",
    whatsapp: "5544999997219",
    itens: {
      avista_pix: { label: "À vista no Pix, com 10% de desconto", valor: 5850, metodo: "pix" },
      entrada_pix: { label: "Entrada no Pix (mais 2x R$ 1.950 na entrega)", valor: 2600, metodo: "pix" },
      avista_card: { label: "No cartão, em até 12x", valor: 6500, metodo: "card", maxParcelas: 12 },
    },
  },
};
