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

## O webhook (20/08/2026)

Antes desta data, um pagamento aprovado existia em **um lugar só: o
painel do Mercado Pago**. O `external_reference` era montado com toda a
informação certa e jogado fora, não havia `notification_url`, e o
`showSuccess()` desenhava um "✓" sem gravar nada. O CRM sabia que o
cliente tinha fechado e não sabia se ele havia pagado.

Agora `POST /api/mp-webhook` recebe a notificação, confere a assinatura,
consulta o pagamento na API do MP (o corpo da notificação é um aviso, não
um extrato) e grava em `crm_recebimentos`. Se ele bate com uma parcela em
aberto, ela é dada como recebida; se for a primeira parcela do contrato, o
lead ainda vai para **Ganho** sozinho e o pagamento aparece na linha do
tempo dele.

**Para ligar, três coisas:**

1. `MP_WEBHOOK_SECRET` na Vercel, com a chave secreta que o painel do MP
   mostra ao cadastrar a URL. **Sem ela a rota recusa tudo com 401 e a
   baixa volta a ser manual em silêncio.**
2. A URL cadastrada em Mercado Pago → Suas integrações → sua aplicação →
   Webhooks, evento **Pagamentos**. O `notification_url` que a rota de
   criação manda não substitui o cadastro: é do cadastro que sai o segredo.
3. `SUPABASE_SERVICE_ROLE_KEY` e `CRM_OWNER_ID`, que a rota já usa por não
   ter sessão de usuário (mesma postura de `/api/lead`).

**Teste antes de contar com ele:** o simulador do painel do MP assina de
verdade. Dispare o mesmo evento cinco vezes — tem que criar **uma** linha
só, porque a idempotência é o índice único `crm_receb_mp_uniq`, não uma
checagem na aplicação.

## O que continua manual

- Pagamento que chega sem contrato montado (o cliente paga a entrada no
  minuto seguinte a receber a proposta) entra como **órfão** e aparece na
  bandeja "Entrou sem contrato" do `/crm/caixa`, para amarrar em dois
  cliques. Ele nunca é descartado.
- As etapas 2 e 3 do modelo parcelado continuam sem cobrança automática:
  crie um link de pagamento no app do MP ou peça Pix manual. O que mudou é
  que o CRM agora **sabe que elas existem e quando vencem**, e põe o
  cliente na fila do dia para você cobrar.
