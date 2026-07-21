# Checkout nas propostas — Pix e cartão no modal

As propostas podem receber pagamento direto na página, sem redirecionar
para o Mercado Pago: Pix (QR code + copia-e-cola, com confirmação
automática na tela) e cartão de crédito parcelado (campos seguros do
próprio MP dentro do modal).

## Arquitetura

```
proposta/baixudos.html          botões [data-checkout-item] + <body data-proposta>
js/proposta-checkout.js         modal compartilhado (Pix + Brick de cartão)
css/proposta-checkout.css       estilos do modal
pages/api/proposta-pagamento.js       função Vercel: config, criação e status
```

- **O valor NUNCA está no HTML.** O browser só manda o id do item
  (`avista_pix`, `avista_card`, `entrada_pix`); o valor cobrado vem da
  tabela `PROPOSTAS` dentro de `pages/api/proposta-pagamento.js`. Os números
  impressos na página são só exibição.
- Cartão usa o **Brick CardPayment** do MP: os dados do cartão nunca
  passam pelo nosso servidor, só o token.
- Pix expira em 30 minutos; a tela faz polling a cada 4s e confirma
  sozinha quando o banco aprova.

## Ativação (uma vez)

1. Conta Mercado Pago (CPF ou CNPJ) — criada por você, no seu nome.
2. Em [Suas integrações](https://www.mercadopago.com.br/developers/panel/app)
   crie uma aplicação e copie as credenciais de **produção**:
   Access Token e Public Key.
3. Vercel → projeto do estúdio → Settings → Environment Variables:
   - `MP_ACCESS_TOKEN` = APP_USR-...
   - `MP_PUBLIC_KEY`  = APP_USR-...
4. Redeploy.

As notificações de venda chegam no app do Mercado Pago no celular —
não precisa de webhook para o fluxo das propostas.

## Adicionar checkout a uma proposta nova

1. `pages/api/proposta-pagamento.js` → adicione a entrada na tabela:

```js
nome-do-cliente: {
  titulo: "Rafael Razeira Estúdio — Projeto X",
  itens: {
    avista_pix:  { label: "À vista no Pix, com desconto", valor: 2690, metodo: "pix" },
    avista_card: { label: "No cartão, em até 12x", valor: 2990, metodo: "card", maxParcelas: 12 },
    entrada_pix: { label: "Entrada do modelo em 3 etapas", valor: 1190, metodo: "pix" },
  },
},
```

2. Na proposta HTML (o template já traz tudo):
   - `<body data-proposta="nome-do-cliente">`
   - preencha os valores de exibição no bloco FORMAS DE PAGAMENTO
   - confira os `<link>`/`<script>` do checkout no `<head>`

3. Deploy. Pronto — os três botões abrem o modal.

Proposta sem checkout: apague o bloco FORMAS DE PAGAMENTO, o
`data-proposta` do body e os includes do head.

## Política de pagamento (padrão do estúdio)

| Forma | Regra |
| --- | --- |
| Pix à vista | Total com ~10% de desconto — divide com o cliente a economia de taxa |
| Pix em etapas | Modelo 3 etapas sem desconto; o modal cobra só a entrada, as demais são cobradas manualmente a cada aprovação |
| Cartão | Total cheio em até 12x, **juros do parcelamento por conta do comprador** (padrão do MP quando você não configura parcelas sem juros) |

Taxas aproximadas do MP (confirme no app): Pix ~1%, cartão ~5%.
Cartão em serviço pode sofrer chargeback — mantenha a ordem
aceite → contrato assinado → pagamento.

## Testar antes de ir ao ar

1. Use as credenciais de **teste** da mesma aplicação nas env vars
   (local: arquivo `.env` + `vercel dev`, que roda site + funções).
2. Cartões de teste e contas de teste: painel do MP → Suas integrações
   → Contas de teste. O cartão `5031 4332 1540 6351` (Mastercard,
   qualquer CVV/validade futura, nome "APRO") aprova na hora.
3. Pix de teste não gera QR pagável — valide o fluxo visual e troque
   para produção para o teste real (pague R$ 1 pra você mesmo criando
   um item temporário de teste na tabela).

## Limitações conhecidas (v1)

- Sem webhook: a confirmação em tela usa polling; se o cliente fechar
  o modal antes de pagar o Pix, o pagamento ainda vale — você vê no
  app do MP. O comprovante chega no e-mail do cliente.
- As etapas 2 e 3 do modelo parcelado não têm cobrança automática:
  crie um link de pagamento no app do MP ou peça Pix manual a cada
  aprovação (roadmap: item por etapa na tabela).
