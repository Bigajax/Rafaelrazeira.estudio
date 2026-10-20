# Plano: os criativos dentro do Performance

Escrito em 19/10/2026, a pedido do Rafael: "na aba do CRM Performance, um plano para cobrir
tudo o que é sobre o marketing de criativos, desde dados de entrada na vitrine, gastos com
o criativo".

## A pergunta que a aba responde

**Cada real que entrou num criativo virou quanto?** E, por trás dela, as quatro decisões
que o estúdio toma toda semana com dinheiro em jogo:

| Decisão | O número que decide |
|---|---|
| Qual criativo corta e qual fica | hook rate (corta o pior terço do lote) e depois custo por lead ou por venda (a régua da `matriz-anuncios-vitrine.md`) |
| O que gravar no próximo lote | onde a curva de retenção cai, qual gancho e qual fecho ganharam |
| Quanto pôr de verba | quanto custa uma venda (CAC) contra quanto ela deixa (ticket + mensalidade) |
| Qual página recebe o tráfego | formulário (`/vitrine-digital`) contra compra direta (`/vitrine-v4`), pela venda e não pelo clique |

Hoje cada uma dessas respostas sai de uma leitura manual: o Gerenciador aberto no Chrome,
o `scripts/mixpanel-funil.mjs`, o CRM e a conta de cabeça. O diário mostra o custo disso:
a leitura do h27u (01/10) levou uma tarde, e a conta ficou em "Payment error" três vezes
sem ninguém ver.

## Onde fica

Uma subaba nova, **Criativos**, em `/crm/performance`, ao lado de Análise e Placas.

> [!warning] O Performance é o produto das lojas
> Tudo o que existe hoje em `/crm/performance` é sobre a vitrine dos clientes (`perf_lojas`,
> `perf_eventos`). A subaba Criativos é **do estúdio** e nunca aparece no painel do lojista.
> As tabelas novas têm prefixo próprio (`ads_`), longe do `perf_`, para nenhuma função da
> vitrine ler por engano.

## O caminho inteiro, etapa por etapa

O criativo atravessa seis etapas. Cada uma tem uma fonte de dado. A tabela diz o que já
existe e o que falta.

| Etapa | O que medir | Fonte | Hoje |
|---|---|---|---|
| 1. Produção | quanto custou fazer (Veo, imagem, ChatGPT), quem aparece, loja usada, permissão | `ai_videos` e `ai_imagens` (custo real pelo `usage.cost`), a pasta do lote | o custo existe no AI Studio, mas não está ligado ao criativo |
| 2. Veiculação | gasto, impressões, alcance, frequência, plays de 3 s (hook rate), ThruPlay (hold), a curva de retenção, CTR, CPC, visualização da página (LPV) | **Meta Marketing API** (insights por `ad_id`, por dia) | **não existe**: não há token com `ads_read` nem o `act_` no `.env.local`; o gasto do Financeiro é estimativa (`fin_custos`, "enquanto a Meta não é lida direto") |
| 3. Entrada na página | visitantes reais, rolou, viu a oferta, tocou no formulário ou no pagar, enviou, saiu, tempo e profundidade | Mixpanel (`page`, `utm_content` nas propriedades) | os eventos existem; a leitura é só pelo script local, à mão |
| 4. Lead | quem chegou, com @ válido ou não, em que etapa do funil está | `leads` (UTMs, `ref`, `distinct_id`) e `crm_leads.anuncio` | existe; já há "Leads por anúncio" em `/crm/metricas` |
| 5. Venda | contrato, entrada paga, saldo pago | `crm_recebimentos` → `lead_id` → `crm_leads.anuncio` | existe pelo formulário; **na `/vitrine-v4` não**: o checkout não leva a UTM, e o pagamento pode cair em "Entrou sem contrato" sem criativo |
| 6. Depois da venda | mensalidade do Performance, indicação | `crm_contratos` tipo recorrência, `perf_pagamentos` | existe, sem ligação com o criativo de origem |

**A chave que amarra tudo é o `utm_content`.** Já está no link de todo anúncio desde o
lote 03, já chega no Mixpanel e já é gravado no lead. Falta ela chegar à Meta (pelo
`ad_id`) e ao pagamento da v4.

## O modelo de dados

Três tabelas novas e uma visão (`supabase/ads-criativos.sql`).

**`ads_criativos`: o catálogo, uma linha por criativo.**
`utm_content` (único, é a chave), nome, lote (`L08`), gancho, corpo, fecho, formato
(longo, simples, pip, punch), duração, loja usada, página de destino, arquivo, permissão da
loja (sim, pendente), status (rascunho, no ar, pausado, morto), data de entrada e de saída,
e a decisão escrita quando morre ("perdeu no hook: 18% contra 26% do h27u"). Os `ad_id`
da Meta ficam em `ads_criativo_anuncios` (um criativo pode estar em mais de um conjunto: a
lição de 11/08 de nunca mapear por nome sem conferir o conjunto).

**`ads_meta_dia`: o que a Meta diz, por anúncio e por dia (fuso da conta, BRT).**
`ad_id`, `adset_id`, `campaign_id`, data, gasto, impressões, alcance, plays de 3 s,
ThruPlay, p25, p50, p75 e p100 do vídeo, cliques no link, LPV, e as conversões que a Meta
atribui (Contact, InitiateCheckout, Purchase). A curva de retenção segundo a segundo
vai num `jsonb` à parte, lida uma vez por semana (ela é pesada e muda pouco).

**`ads_pagina_dia`: o que o Mixpanel diz, por `utm_content` e por dia BRT.**
Visitantes reais, rolou, viu a oferta, tocou no formulário, enviou, tocou em pagar, e a
mediana de segundos. Gravado já somado: nada de visitante, cidade ou URL no banco do CRM.

**`ads_criativo_painel` (visão):** junta as três com `crm_leads` (por `anuncio`) e
`crm_recebimentos` (por `lead_id`) e entrega, por criativo e por período: gasto, hook
rate, hold rate, CTR, custo por visitante, taxa da página, leads, leads com @ válido,
vendas, receita, **CPL, CAC e retorno** (receita ÷ gasto). E o custo de produção do
criativo somado ao gasto, para o retorno ser o de verdade.

## Como os dados entram

| Fonte | Como | Quando |
|---|---|---|
| Meta | `scripts/ler-meta.ts --gravar` (Marketing API, `/insights` com `level=ad`, `time_increment=1`, `action_attribution_windows` iguais aos do conjunto) | todo dia, ou na rodada semanal junto com `conferir-vitrines` e `analisar-vitrines`; depois, cron da Vercel |
| Mixpanel | o `scripts/mixpanel-funil.mjs` ganha `--gravar`: soma por `utm_content` e por dia BRT e grava em `ads_pagina_dia` | junto com a Meta |
| Produção | o AI Studio ganha o campo "para o criativo" (o `utm_content`) na geração; o custo soma sozinho | na hora de gerar |
| Catálogo | a subaba tem "Novo criativo" e o script da Meta acha anúncio sem catálogo e avisa | quando sobe um lote |

> [!warning] Fuso: o Mixpanel exporta em UTC, a Meta em BRT
> Em 14/08 isso inverteu uma conclusão (43 visitantes contra 21 LPV, que eram 23 contra 21).
> O `--gravar` reagrupa por `time - 3h` **antes** de somar o dia. Nunca guardar dia UTC.

## As telas

**1. A frase da semana**, no topo, no jeito da casa: "Esta semana saíram R$ 1.008 em 9
criativos; 31 pessoas preencheram, 2 compraram, e cada venda custou R$ 504." Sem juízo de
bom ou ruim quando o número é pequeno (a régua do Performance das lojas vale aqui também).

**2. A tabela dos criativos** do período, uma linha por criativo, na ordem do funil:
gasto, hook rate, hold rate, CTR, LPV, visitantes, taxa da página, leads (com @ válido),
vendas, CPL, CAC, retorno. Cada célula pinta pela régua da matriz: o pior terço do lote
em hook rate e o CPL acima de 1,5 a 2x o alvo sem lead. A coluna "o que fazer" diz uma
frase: cortar, manter, escalar, ou "ainda não deu 500 impressões".

**3. A ficha do criativo:** o vídeo, a curva de retenção com os quadros embaixo (a folha
do ffmpeg que já se faz à mão: `fps=1,tile=9x3`), o funil da página, os leads pelo nome
com a etapa de cada um, o custo de produção e o histórico de decisões.

**4. O lote:** os criativos do lote lado a lado, somando por componente quando houver 3 a
4 lotes (gancho contra gancho, fecho contra fecho). É onde o L08 responde "longo ou
simples".

**5. O mês:** gasto real da Meta contra a receita que veio de anúncio, e o que sobra no
Financeiro. O gasto real **substitui** a estimativa de tráfego do `fin_custos`.

**6. Os avisos** (em cima de tudo, vermelho só quando custa dinheiro):
- a conta de anúncios com pagamento recusado (a API diz o `account_status`; foram três
  vezes em setembro, e a mais longa deixou a campanha parada por dias);
- anúncio gastando sem nenhum visitante no Mixpanel (link quebrado ou UTM errada);
- anúncio no ar sem catálogo, e criativo de loja sem permissão.

## O que precisa existir antes (fase 0)

1. **O token da Meta com `ads_read`.** Um usuário do sistema no Business Manager, com a
   conta Eco (`act_1263674748563404`) e a permissão de leitura. **É com o Rafael**: criar o
   usuário e o token é configuração de conta. O token vai só no `.env.local` e na Vercel,
   como `META_ADS_TOKEN` e `META_AD_ACCOUNT_ID`.
   **Feito em 19/10:** usuário do sistema `leitor-crm` (Employee) no portfólio **Eco**, com a
   conta Eco em "View performance" e o app `rafaelrazeira.estudio` (1711831363446498).
   Leitura conferida: conta, gasto na vida (R$ 3.011,62) e insights por anúncio em 90 dias.
   O campo `funding_source_details` dá `(#10) Permission Denied` com `ads_read`: não pedir.

   > [!warning] "No permissions available" ao gerar o token
   > O usuário do sistema precisa de um papel **no app**, não só na conta de anúncios
   > (Apps → rafaelrazeira.estudio → Assign people → leitor-crm). Com o papel dado, a
   > janela do token ainda mostrava a lista vazia até recarregar a página. E o portfólio
   > certo é o **Eco**, não o "Rafael Razeira" (sem conta de anúncios, botão Add cinza).
2. **`utm_content` fixo e único por criativo**, escrito à mão como no L08
   (`l08-01-longo-japa`), nunca `{{ad.id}}` dinâmico: o dinâmico de agosto obrigou a cruzar
   IDs à mão. Lotes antigos entram pelo `ad_id`.
3. **A UTM até o pagamento da v4.** O botão de pagar leva o `utm_content` e o `ref` da
   visita no `external_reference` (ou o webhook acha o lead pelo `ref`), e o pagamento
   aprovado vira `Purchase` na CAPI pelo servidor, com o mesmo `external_id`. Sem isso o
   L08 mede clique e não venda, e o conjunto otimiza por `InitiateCheckout` para sempre.
   **Feito em 19/10 (a metade da UTM):** a `/vitrine-v4` guarda as UTMs na chegada
   (`MontagemV4` chama `utmsDaSessao()`), o `proposta-checkout.js` manda as UTMs e o
   `visita_ref` no campo `rastro`, e o `/api/proposta-pagamento` filtra e grava no
   `metadata` do Mercado Pago, que volta no aviso e fica em `crm_recebimentos.bruto`
   (`bruto->'metadata'->>'utm_content'`). Falta: conferir num Pix real e o `Purchase`
   pelo servidor.

## As fases

| Fase | O que entra | Pronto quando |
|---|---|---|
| **0. Encanamento** | token da Meta, padrão de `utm_content`, UTM e Purchase na v4 | um Pix de teste na v4 aparece no CRM com o criativo de origem |
| **1. Gasto e veiculação** | `ads_criativos`, `ads_meta_dia`, `ler-meta.ts`, a tabela com as colunas da Meta, o aviso de pagamento | a tabela bate com o Gerenciador num dia escolhido, centavo por centavo |
| **2. Do clique à venda** | `ads_pagina_dia`, a visão, as colunas de página, lead e venda, CPL, CAC e retorno; o mês contra o Financeiro | o CAC de setembro sai pela tela igual à conta feita à mão |
| **3. A ficha e a produção** | curva de retenção com os quadros, custo do AI Studio ligado ao criativo, histórico de decisões | a leitura do h27u de 01/10 sai inteira da ficha, sem abrir o Gerenciador |
| **4. A leitura** | a frase da semana, o "o que fazer" por criativo, a soma por componente do lote | a segunda-feira começa pela subaba, não pelo Gerenciador |

## A fase 1, construída (19/10/2026)

| Peça | Arquivo |
|---|---|
| As tabelas | `supabase/ads-criativos.sql`: `ads_conta`, `ads_anuncios`, `ads_meta_dia` (o dono lê, só o script grava) |
| A leitura | `scripts/ler-meta.ts` (`--gravar`, `--desde AAAA-MM-DD`; a leitura crua também vai para `tmp/ler-meta.json`) |
| As contas | `lib/performance/criativos.ts` (agrupar por `utm_content`, as réguas, os avisos) |
| A tela | `/crm/performance/criativos`, com 7, 30 e 90 dias; botão "Criativos" no topo do Performance |

O que a leitura ensinou:
- **O formulário enviado não vem como `contact`.** A Meta devolve em `conversions`
  (`contact_website`) e como `offsite_conversion.custom.1540256587095933`. Lido assim, o h27u
  dá 94 formulários e R$ 10,36 cada, igual ao diário de 01/10.
- **O `InitiateCheckout` muda de sentido por página:** na `/vitrine-digital` é o primeiro
  toque no formulário, na `/vitrine-v4` é o toque em pagar. A régua usa o formulário numa e
  o toque em pagar na outra.
- **43 dos 63 anúncios não têm `utm_content`** (os de agosto e os `lp-`): entram pelo nome.
- **A conta não gasta desde 28/09** com 2 anúncios ligados: o aviso vermelho do topo.

Para ligar: rodar o `supabase/ads-criativos.sql` no SQL Editor do Supabase do estúdio e
depois `npx tsx scripts/ler-meta.ts --desde 2026-07-21 --gravar`.

## A fase 2, construída (19/10/2026)

| Peça | Arquivo |
|---|---|
| A página | `ads_pagina_dia` (fim do `supabase/ads-criativos.sql`) e `scripts/ler-pagina.ts --gravar`: visitantes reais, interagiram, rolaram, viram a oferta, começaram e enviaram, por `utm_content`, página e dia BRT |
| Lead e venda | sem tabela: `crm_leads.anuncio` e `crm_recebimentos` (com a utm da v4 em `bruto->metadata`), lidos na hora |
| As contas | `ligarCRM` e `mesAMes` em `lib/performance/criativos.ts` |
| A tela | os cartões de cliente, custo por cliente e retorno; a tabela "Virou cliente?"; a coluna "Pessoas" (Mixpanel) ao lado do "Na página" (Meta); o "Mês a mês"; o aviso de link quebrado |

O que a ligação mostrou (21/07 a 19/10): o h27u gastou R$ 974, trouxe 115 leads e 6
clientes, R$ 4.054 recebidos: **R$ 162 por cliente e R$ 4,16 de volta para cada R$ 1**. O
h17u gastou R$ 656 para 33 leads e nenhum cliente. Lead e venda contam por **coorte**:
os leads que chegaram no período e tudo o que eles pagaram depois.

> [!warning] A utm de agosto é o número do anúncio
> A campanha de agosto usava `{{ad.id}}` no `utm_content`: o lead e o Mixpanel guardaram
> `120250180921710201`, não um nome. `chaveDaUtm` traduz o número para o criativo daquele
> anúncio. E os `lp-` de setembro guardaram o **nome** do anúncio: também traduzido.

## As fases 3 e 4, construídas (19/10/2026)

| Peça | Arquivo |
|---|---|
| A curva e os quadros | `ads_curvas` e `scripts/ler-curvas.ts --gravar`: o `video_play_curve_actions` da Meta e uma faixa de 1 quadro por segundo (ffmpeg do projeto, JPEG em data URI, uns 60 KB) |
| A ficha | `/crm/performance/criativos/[chave]`: números da vida inteira, a curva com a maior queda marcada e os quadros embaixo, o caminho na página, os leads pelo nome, o custo de produção e as decisões |
| O que se anota | `ads_criativos` (custo em reais, o projeto do AI Studio, decisões com data), por `app/(pt)/crm/acoes-criativos.ts` e `components/performance/FichaCriativo.tsx` |
| A leitura | na tela, "a semana contra a anterior" e "os lotes" (soma por formato e por loja, do L08 em diante pelo nome `lNN-NN-formato-loja`) |
| A segunda-feira | `npx tsx scripts/semana-criativos.ts`: as três leituras gravando e a leitura escrita; `--avisar` manda no Telegram |

A curva conferida contra a leitura manual de 01/10: o h27u dá 100, 70, 37, 26, 20... e a
faixa mostra o rosto até o 4º segundo e o celular entrando no 5º, o mesmo achado.

## O que nunca fazer

- **Nunca chutar gasto.** Sem token, a coluna diz "a Meta não foi lida", como o Financeiro
  faz com o dólar sem cotação.
- **Nunca mapear criativo pelo nome sem o conjunto** (11/08: o mesmo nome em três
  conjuntos com IDs diferentes).
- **Nunca guardar dado de visitante no CRM.** Só a soma por dia e por criativo.
- **Nunca pôr `Purchase` na lista pública da `/api/meta-capi`.** Venda falsa destrói a
  otimização; o Purchase sai só do servidor, do pagamento aprovado.
- **Nunca julgar um criativo antes de 500 impressões**, nem chamar de vitória o que tem 2
  leads (a regra das frases do Performance: com pouco dado, só dizer o que aconteceu).
- **Nunca mostrar esta subaba ao lojista** nem ler `ads_` de função da vitrine.

## O que o Rafael decide antes de começar

1. **Criar o usuário do sistema e o token `ads_read`** no Business Manager (fase 0, item 1).
2. **O alvo de CPL e de CAC.** A matriz pede um CPL alvo para a régua de corte; o
   Financeiro diz que 7 vitrines pagam o mês. Qual CAC ainda deixa margem?
3. **Se a curva de retenção entra na fase 3 ou fica fora.** Ela é o dado mais útil para
   gravar (o h27u mostrou 74% saindo nos 3 primeiros segundos) e o mais caro de ler.
4. **Se os lotes antigos (01 a 07) entram no catálogo** ou a subaba começa no L08.
