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
    whatsapp: "5544991246187",
    itens: {
      entrada_pix: { label: "Entrada para início do projeto", valor: 200, metodo: "pix" },
      saldo_card: { label: "Saldo do projeto no cartão, em 4x", valor: 800, metodo: "card", maxParcelas: 4 },
    },
  },
  /* Duas parcelas iguais no molde da ArraZou, e cada uma paga uma etapa:
     a primeira o desenho, a segunda a entrega. O saldo é `saldo_pix` e
     não `saldo_card` de propósito: no cartão o Mercado Pago repassa de
     uma vez e o Caixa perderia a data da segunda cobrança, que aqui é o
     gatilho de "aprovou, agora paga". */
  "carina-melo": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital Carina Melo Shop",
    whatsapp: "5544991246187",
    itens: {
      entrada_pix: { label: "1ª parcela: design do projeto", valor: 500, metodo: "pix" },
      saldo_pix: { label: "2ª parcela: na entrega", valor: 499, metodo: "pix" },
    },
  },
  arrazou: {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital ArraZou Semijoias",
    whatsapp: "5544991246187",
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
    whatsapp: "5544991246187",
    itens: {
      avista_pix: { label: "À vista no Pix", valor: 999, metodo: "pix" },
      entrada_pix: { label: "Entrada para início do projeto", valor: 199, metodo: "pix" },
      saldo_card: { label: "Saldo do projeto no cartão, em 4x", valor: 800, metodo: "card", maxParcelas: 4 },
    },
  },
  "picorelli-premium": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital Picorelli Premium",
    whatsapp: "5544991246187",
    itens: {
      entrada_pix: { label: "Entrada para início do projeto", valor: 199, metodo: "pix" },
      saldo_pix: { label: "Saldo na entrega, no Pix", valor: 800, metodo: "pix" },
      saldo_card: { label: "Saldo na entrega, no cartão em até 4x", valor: 800, metodo: "card", maxParcelas: 4 },
    },
  },
  sacrazen: {
    titulo: "Rafael Razeira Estúdio — Portal SacraZen",
    whatsapp: "5544991246187",
    itens: {
      avista_pix: { label: "À vista no Pix, com 10% de desconto (até 18/09)", valor: 899.1, metodo: "pix" },
      entrada_pix: { label: "Entrada para início do projeto", valor: 199, metodo: "pix" },
      saldo_pix: { label: "Saldo na entrega, no Pix", valor: 800, metodo: "pix" },
      saldo_card: { label: "Saldo na entrega, no cartão em até 4x", valor: 800, metodo: "card", maxParcelas: 4 },
    },
  },
  fantoche: {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital Fantoche",
    whatsapp: "5544991246187",
    itens: {
      entrada_pix: { label: "Entrada para início do projeto", valor: 199, metodo: "pix" },
      saldo_pix: { label: "Saldo na entrega, no Pix", valor: 800, metodo: "pix" },
      saldo_card: { label: "Saldo na entrega, no cartão em até 4x", valor: 800, metodo: "card", maxParcelas: 4 },
    },
  },
  tshoes: {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital T-Shoes",
    whatsapp: "5544991246187",
    itens: {
      entrada_pix: { label: "Entrada para início do projeto", valor: 199, metodo: "pix" },
      saldo_pix: { label: "Saldo na entrega, no Pix", valor: 800, metodo: "pix" },
      saldo_card: { label: "Saldo na entrega, no cartão em até 4x", valor: 800, metodo: "card", maxParcelas: 4 },
    },
  },
  /* A LOJA ONLINE da Fardo (25/09), proposta separada da vitrine, com
     duas opções: "vender perto" (a vitrine com Pix e cartão, entrega em
     Erechim e região ou retirada) por R$ 1.990, e o e-commerce completo
     (sacola, estoque por tamanho, frete calculado) por R$ 3.499, o valor
     de tabela da /e-commerce. Metade de entrada e metade na entrega, as
     duas no Pix: a maior parte do trabalho acontece antes de existir loja,
     por isso aqui não cabe a entrada simbólica da vitrine. Os saldos são
     cobrados na entrega.
     SE A VITRINE DE R$ 999 JÁ ESTIVER PAGA, ela abate e a Valeria paga só a
     diferença: R$ 991 no "vender perto" e R$ 2.500 no e-commerce. Não dá
     para abater do saldo (no "vender perto" a diferença é MENOR que a
     entrada), então esse caso ganha itens próprios aqui quando acontecer. */
  "fardo-esportes-loja": {
    titulo: "Rafael Razeira Estúdio, loja online Fardo Esportes",
    whatsapp: "5544991246187",
    itens: {
      perto_entrada_pix: { label: "Vender perto: entrada, metade do projeto", valor: 995, metodo: "pix" },
      perto_saldo_pix: { label: "Vender perto: saldo na entrega", valor: 995, metodo: "pix" },
      ecommerce_entrada_pix: { label: "E-commerce: entrada, metade do projeto", valor: 1749.5, metodo: "pix" },
      ecommerce_saldo_pix: { label: "E-commerce: saldo na entrega", valor: 1749.5, metodo: "pix" },
    },
  },
  /* A Japa Modas fecha na condição padrão (25/09): R$ 199 de entrada no
     Pix e R$ 800 na entrega, no Pix ou no cartão em até 4x com os juros
     do Mercado Pago. Cada item é um recebimento: o saldo no cartão cai
     de uma vez, quem parcela é o banco do cliente. */
  "japa-modas": {
    titulo: "Rafael Razeira Estúdio, Vitrine Digital Japa Modas",
    whatsapp: "5544991246187",
    itens: {
      entrada_pix: { label: "Entrada para início do projeto", valor: 199, metodo: "pix" },
      saldo_pix: { label: "Saldo na entrega, no Pix", valor: 800, metodo: "pix" },
      saldo_card: { label: "Saldo na entrega, no cartão em até 4x", valor: 800, metodo: "card", maxParcelas: 4 },
    },
  },
  /* A Fardo fecha como a Minas: pagamento único no Pix, sem entrada e
     sem parcelar (condição passada à Valeria em 24/09). O domínio, R$ 40
     por 1 ano, é cobrado à parte e não tem botão aqui. */
  "fardo-esportes": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital Fardo Esportes",
    whatsapp: "5544991246187",
    itens: {
      avista_pix: { label: "Vitrine digital, pagamento único no Pix", valor: 999, metodo: "pix" },
    },
  },
  /* A Minas fecha SEM ENTRADA: um pagamento só, no Pix, no dia da
     publicação. Não existe item de entrada nem de cartão aqui de
     propósito, senão um botão antigo continuaria cobrando R$ 199. */
  "minas-decor": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital Minas Brasil Decor",
    whatsapp: "5544991246187",
    itens: {
      avista_pix: { label: "Vitrine digital, pagamento único no Pix", valor: 999, metodo: "pix" },
    },
  },
  /* A Arena disse que fecha no cartão. O valor é o mesmo do Pix (nada
     somado) e as parcelas são COM juros: o Brick do Mercado Pago
     calcula na hora, no padrão da conta, sem mexer em nada. Entrada 200
     e saldo 799 fecham os mesmos R$ 999 das outras propostas. */
  "arena-imports": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital Arena Imports Floripa",
    whatsapp: "5544991246187",
    itens: {
      entrada_pix: { label: "Entrada para início do projeto", valor: 200, metodo: "pix" },
      saldo_pix: { label: "Saldo na entrega, no Pix", valor: 799, metodo: "pix" },
      saldo_card: { label: "Saldo na entrega, no cartão em até 4x", valor: 799, metodo: "card", maxParcelas: 4 },
    },
  },
  "ortobom-aracaju": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital Ortobom Aracaju",
    whatsapp: "5544991246187",
    itens: {
      entrada_pix: { label: "Entrada para início do projeto", valor: 199, metodo: "pix" },
      saldo_pix: { label: "Saldo na entrega, no Pix", valor: 800, metodo: "pix" },
      saldo_card: { label: "Saldo na entrega, no cartão em até 4x", valor: 800, metodo: "card", maxParcelas: 4 },
    },
  },
  "ws-style-mens": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital WS Style Mens",
    whatsapp: "5544991246187",
    itens: {
      avista_pix: { label: "À vista no Pix, com 10% de desconto", valor: 899.1, metodo: "pix" },
      entrada_pix: { label: "Entrada no Pix (mais R$ 499,50 na entrega)", valor: 499.5, metodo: "pix" },
      avista_card: { label: "No cartão, em até 6x", valor: 999, metodo: "card", maxParcelas: 6 },
    },
  },
  "pisada-de-ouro": {
    titulo: "Rafael Razeira Estúdio — E-commerce Pisada de Ouro",
    whatsapp: "5544991246187",
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
    whatsapp: "5544991246187",
    itens: {
      avista_pix: { label: "À vista no Pix, com 10% de desconto", valor: 5850, metodo: "pix" },
      entrada_pix: { label: "Entrada no Pix (mais 2x R$ 1.950 na entrega)", valor: 2600, metodo: "pix" },
      avista_card: { label: "No cartão, em até 12x", valor: 6500, metodo: "card", maxParcelas: 12 },
    },
  },
  /* A Ivone fecha em R$ 499: metade do preço de tabela, combinado com o
     Rafael por WhatsApp em 22/09. A entrada segue a mesma de todas as
     outras (199), e o saldo cai para 300. */
  "ivone-calcados": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital Ivone Calçados SBC",
    whatsapp: "5544991246187",
    itens: {
      entrada_pix: { label: "Entrada para início do projeto", valor: 199, metodo: "pix" },
      saldo_pix: { label: "Saldo na entrega, no Pix", valor: 300, metodo: "pix" },
      saldo_card: { label: "Saldo na entrega, no cartão em até 4x", valor: 300, metodo: "card", maxParcelas: 4 },
    },
  },
  "narciso-store": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital Narciso Store",
    whatsapp: "5544991246187",
    itens: {
      entrada_pix: { label: "Entrada para início do projeto", valor: 199, metodo: "pix" },
      saldo_pix: { label: "Saldo na entrega, no Pix", valor: 800, metodo: "pix" },
      saldo_card: { label: "Saldo na entrega, no cartão em até 4x", valor: 800, metodo: "card", maxParcelas: 4 },
    },
  },
  /* A ÚNICA que não segue os R$ 999 de tabela. O Santana recuou do preço
     cheio no WhatsApp em 22/09 ("achei que era um valor mensal") e fechou
     em R$ 500, com a entrada menor para caber no mês. O desconto tem motivo
     amarrado a este caso na página: é a primeira loja de chuteira do
     portfólio. Não é tabela nova. */
  "jk-imports": {
    titulo: "Rafael Razeira Estúdio — Vitrine Digital JK Imports",
    whatsapp: "5544991246187",
    itens: {
      entrada_pix: { label: "Entrada para início do projeto", valor: 100, metodo: "pix" },
      saldo_pix: { label: "Saldo depois da entrega aprovada, no Pix", valor: 400, metodo: "pix" },
      saldo_card: { label: "Saldo depois da entrega aprovada, no cartão em até 4x", valor: 400, metodo: "card", maxParcelas: 4 },
    },
  },
  /* A segunda proposta da Arena (24/09/2026), só do tráfego pago: a
     vitrine já está paga. A tabela é a de referência do estúdio
     (497/697/997, aprovada na Ortobom em 15/09). Cada item é o PRIMEIRO
     mês de um plano, com a instalação da medição inclusa; os meses 2 e 3
     do mínimo de três são cobrados por fora, mês a mês. */
  "arena-imports-trafego": {
    titulo: "Rafael Razeira Estúdio · Tráfego pago Arena Imports Floripa",
    whatsapp: "5544991246187",
    itens: {
      mes1_inicio: { label: "Primeiro mês do plano Início, com a instalação da medição", valor: 497, metodo: "pix" },
      mes1_ritmo: { label: "Primeiro mês do plano Ritmo, com a instalação da medição", valor: 697, metodo: "pix" },
      mes1_escala: { label: "Primeiro mês do plano Escala, com a instalação da medição", valor: 997, metodo: "pix" },
    },
  },
};
