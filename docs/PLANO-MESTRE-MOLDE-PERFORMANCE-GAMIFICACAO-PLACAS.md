# Plano mestre: a gamificação que roda (molde, Performance e placas)

**Estúdio Rafael Razeira · 19/10/2026 (tarde) · plano vigente**

[Versão em HTML](PLANO-MESTRE-MOLDE-PERFORMANCE-GAMIFICACAO-PLACAS.html).

Substitui a versão da manhã de 19/10 (24 seções, 8 etapas, XP, níveis até 100, recebimentos estruturados). O que daquela versão continua valendo está na seção 6, "O que se preserva". Tudo o mais que ela especificava fica como exploração, não como plano.

## A decisão

A gamificação do painel é **a rotina que a dona já tem**, com três coisas a mais: um "feito" nas notas de atenção que o Performance já calcula, uma faixa que se ganha e se perde e aparece na vitrine para a cliente, e placas que o estúdio emite a partir do que o central já conta. **Nada precisa ser digitado para começar.** Registrar o valor da venda é a família de cima das placas, entra só se as lojistas disserem que fariam isso, e nunca vira pré-requisito do resto.

**O caso que causou:** a versão da manhã dependia de a dona lançar recebimentos (parciais, frete, reembolso) para ter qualquer placa, enquanto a decisão do Performance de 06/10 é "contatos, nunca vendas", porque a loja não reporta venda. E o XP vinha só de missões de primeira vez (primeira foto, primeira contagem), com emblemas desenhados até o nível 100 e fonte de pontos que seca no primeiro mês. Não houve validação com nenhuma lojista.

## 1. Por que o desenho anterior não roda

- **A fonte de pontos acaba.** Nove missões, todas "primeira vez". Quando o catálogo fica completo, não há mais o que ganhar. O plano proibia XP por venda, entrega e recebimento, as únicas atividades recorrentes.
- **O nível não serve para nada fora do painel.** Ninguém vê, ninguém compra por causa dele. Enfeite.
- **A placa exige o gesto que ninguém faz.** Digitar valor de venda, parcial, frete e reembolso, antes de ganhar qualquer coisa em troca.
- **Era o quarto plano em nove dias.** Unificação, simplificação, estoque e pedidos, mestre. Planejar virou o produto.

## 2. O que faz gamificação funcionar para quem vende

O que o Mercado Livre (Mercado Líder), a Shopee, o iFood (Super Restaurante) e o YouTube (a placa de inscritos) fazem, e o que isso vira aqui:

| Mecanismo | Neles | Na vitrine |
|---|---|---|
| O jogo é a rotina | responder rápido, enviar no prazo, estoque certo | foto na peça, estoque conferido, link postado, interesse respondido |
| A recompensa é vista pelo comprador | a medalha aparece no anúncio | o selo aparece na vitrine, para a cliente |
| O status cai se parar | Mercado Líder perde a cor | "Loja em dia" é da semana, não para sempre |
| O marco é medido, não declarado | a placa do YouTube é o contador | pessoas, chamadas e aniversário vêm do central, sem digitar |
| O reconhecimento é humano | o YouTube manda a placa pelo correio | a mensagem mensal do Rafael, e a arte para postar |

## 3. As seis peças

### 3.1 A missão é a nota de atenção, com um "feito"

`estudio/lib/atencao.ts` já produz até três notas por loja a partir de dado real: a peça que mais leva ao WhatsApp, procuraram e não tem, número que acabou, olham e não chamam, a maior perda do caminho, o post que traz gente que não chama. **Isso é a lista de missões**, e é recorrente por natureza: toda semana a vitrine gera notas novas. Não há motor de XP, nem nove modelos, nem grupos.

O que muda: cada nota ganha um botão **"Feito"** (ou "Deixar para depois"), e o feito é gravado com a chave da nota. A Início mostra **uma** nota por vez, a de maior consequência, depois das pendências operacionais. Desempenho mostra as três. O que foi feito aparece no histórico da semana ("você resolveu 2 de 3").

Nunca: inventar missão sem dado (sem tráfego, sem nota; a loja em dia recebe "nada que precise de atenção agora"), nem premiar duas vezes a mesma chave.

### 3.2 A faixa: ganha-se e perde-se

Em vez de nível 1 a 100, **três faixas com nome**, calculadas a cada abertura do painel a partir do estado real da loja. Proposta inicial, a validar no piloto:

| Faixa | Critério (todos) |
|---|---|
| **Loja em dia** | toda peça publicada tem foto de capa e preço; estoque com movimento ou conferência nos últimos 14 dias (só nas lojas que contam estoque); visita vinda de um post nos últimos 7 dias (o link curto mede); nenhuma nota de atenção parada há mais de 7 dias |
| **Quase em dia** | falta um critério |
| **Precisa de você** | faltam dois ou mais |

A faixa **cai** se a loja parar. É o que faz voltar. O único número que cresce é a **sequência**: "5 semanas seguidas em dia", apurada no fechamento da semana que o central já tem (`perf_semana_de`, `perf_resumo_semana`). A sequência zera quando a semana fecha fora da faixa de cima, e isso é dito com calma, sem culpa.

Nunca: faixa derivada de pontos. Ela é derivada de fatos, e a frase embaixo dela diz qual fato falta ("2 peças sem foto de capa"), com link para resolver.

### 3.3 O selo na vitrine, para a cliente

É o que dá valor comercial à faixa. Um selo pequeno e honesto na vitrine, perto do rodapé ou do botão do WhatsApp, **só quando for verdade e só com fato**: "estoque conferido há 2 dias", "responde em até 1 hora" (quando houver a fila de interesses e o tempo medido). A dona cuida do painel porque a cliente vê o resultado.

O selo some sozinho quando o fato envelhece (conferência há mais de 7 dias, por exemplo). Nunca mostra faixa, sequência, pontos ou qualquer palavra do jogo: a cliente vê um fato da loja, não uma conquista.

### 3.4 Placas em duas famílias

**Medidas**, do que o central já conta por vitrine, sem a dona digitar nada:

| Placa | Marcos | Fonte |
|---|---|---|
| Pessoas na vitrine | 1.000 · 5.000 · 20.000 | visitantes distintos em `perf_eventos` (tipo `visita`) |
| Chamadas no WhatsApp | 100 · 500 · 2.000 | tipo `whatsapp` |
| Tempo no ar | 1 ano · 2 anos | criação da loja no central |

Toda loja ganha a primeira no primeiro ou segundo mês e aprende que a coleção existe. É a porta.

**Registradas**, a família de cima, com os seis marcos que já estavam desenhados (R$ 10 mil, 20, 50, 100, 300 e 500 mil), e o nome honesto, **"em vendas registradas"**. A fonte é o **Vendi com valor**: o modal "Vendi 1 / Chegou +1" ganha um campo de valor, opcional, e o Vendi manda ao central um evento `venda` com o valor em centavos, como manda uma visita. O Desfazer manda o estorno com a mesma referência; o central soma o líquido. Sem pedido, sem parcial, sem frete, sem reembolso: a placa é o que a dona registrou.

Regras das duas famílias: cada marco uma vez por loja, com a data em que foi atingido; a coleção não reinicia; uma passagem que cruza dois marcos celebra o maior; o acumulado de vendas pode cair com um Desfazer, e a placa já concedida fica. O critério fica escrito no detalhe de cada placa.

Nunca: "faturamento", "faturado com a plataforma" ou qualquer palavra que afirme o que o sistema não mediu. Nunca mostrar o total de vendas na arte pública, só o marco.

### 3.5 Tudo mora no central, não em cada loja

Faixa semanal, sequência, "feitos" e placas vivem no Supabase do estúdio, sobre `perf_eventos`, com duas tabelas novas (`perf_placas` e `perf_cuidados`) e dois tipos de evento novos (`cuidado` e `venda`). A vitrine lê tudo pelo `perf_painel`, como já lê a contagem. Isso evita migrar os bancos das 90 lojas, e faz da placa uma coisa que **o estúdio emite**, não que o painel concede sozinho. Combina com o posicionamento: o designer que mostra o número.

O que fica na loja: o catálogo (fotos, preço) e o estoque, que a camada do estúdio já lê para montar as notas. A faixa é calculada na vitrine (precisa do catálogo e do estoque) e reportada ao central uma vez por dia, como um evento `faixa`; o central fecha a semana.

### 3.6 O reconhecimento é humano e sai do app

**Uma mensagem sua por mês no WhatsApp da dona**, com o número da loja no mês e a placa quando houver. A regra da Japa já dizia: um número que só os dados dela dizem. O CRM lista, em `/crm/performance`, quem atingiu marco no mês, com o texto pronto.

**A arte**, 1080 × 1920, com a logo da loja, o marco, a data e "Performance, por Rafael Razeira Estúdio", gerada pela mesma rota de imagem do "Compartilhar no Status" (`app/painel/compartilhar/[id]`, que já tem a logo real e a fonte da loja). Cada placa postada no Instagram da loja é um anúncio do estúdio: **é aqui que a gamificação paga a própria conta.** O desenho das duas placas está em `docs/placas/placa.html`: o prêmio do experimento, que o Rafael preferiu em 19/10 (moldura metálica em degradê, miolo verde profundo, número em serifa, o nome da loja embaixo), com a flecha para cima do Performance no alto (o Rafael preferiu a flecha à logo RR) e os acabamentos progressivos: verdes para a família medida, champanhe a ouro para a registrada. O PNG 1080 × 1920 sai pelo `scripts/render-placas.mjs`, com `--loja "Nome"` para personalizar.

No painel, a celebração é discreta: uma faixa no topo da Início, uma vez, sem som, respeitando redução de movimento. A placa física e o marco de R$ 1 milhão continuam evolução futura.

## 4. O que fica de fora

XP, nível 1 a 100, nove modelos de missão, grupos de missão, retrospectiva de nível, recebimentos estruturados (parcial, frete, reembolso, correção), fila de integração com consumidor, reconciliação periódica, retificação auditável de placa, a "prévia completa" com dados fictícios (já existem três HTMLs em `docs/` e em `experimentos/`).

A **fila de interesses da vitrine** (quem escolheu o quê na sacola) não é gamificação e continua valendo, no [plano de estoque e pedidos](plano-estoque-pedidos-whatsapp.md), com **três estados** (novo, atendido, virou venda), não cinco. Quando ela existir, alimenta o selo "responde em até N" e o critério de nota parada.

## 5. Onde mora cada coisa

| Peça | Onde | Trabalho |
|---|---|---|
| Notas de atenção e o "feito" | `_plataforma/estudio/lib/atencao.ts`, `estudio/rotas/desempenho`, a Início do molde | chave estável por nota; botão Feito; evento `cuidado` ao central |
| A faixa e a sequência | nova `estudio/lib/faixa.ts` (lê catálogo, estoque e `perf_painel`); `supabase/performance.sql` (`perf_semana_de`, `perf_resumo_semana`) | calcular na vitrine, reportar `faixa` por dia, fechar a semana no central |
| O selo na vitrine | o rodapé ou o botão do WhatsApp do molde | só fato, some sozinho |
| Placas medidas | `supabase/performance.sql`: `perf_placas`, cálculo dentro de `perf_painel` | marcos, data atingida, concessão única |
| Vendi com valor | `_plataforma/painel/AjustarEstoque.tsx`, `lib/acoes-estoque.ts`, `estudio/lib/medir.ts` | campo opcional; evento `venda` e estorno |
| A arte | `docs/placas/placa.html` hoje; `app/painel/compartilhar/[id]` do molde na entrega 1 | um modelo de placa por marco, logo e fonte da loja |
| A mensagem mensal | `app/(pt)/crm/(painel)/performance`, `lib/performance/dados.ts` | quem atingiu marco no mês, texto pronto |
| A distribuição | o processo "levar a camada do estúdio" (a pasta `estudio/` é copiada) | nenhuma migração no banco da loja nas entregas 1 e 2 |

## 6. O que se preserva

A matriz de preservação da versão anterior vale como contrato: nenhum acesso do painel (Início, Peças, Banners, Textos, Estoque, Pedidos, Desempenho, Clientes, Mais) sai, nem muda de lugar, por causa disto. Estoque, Pedidos e catálogo nunca dependem de faixa ou placa. A rota continua `/painel/desempenho` e a visão atual continua inteira; o que entra são a seção "Sua semana" (nota, faixa, sequência) e "Suas conquistas" (placas). Loja sem Performance pago vê tudo isto: faixa, notas grátis e placas são do básico, não do plano mensal.

## 7. As entregas

| Etapa | O que sai | Como se decide que acabou |
|---|---|---|
| **0 · Validar antes de codar** (uma semana) | A imagem de uma placa "1.000 pessoas" e uma "R$ 10 mil em vendas registradas" mandadas para a Japa, a Full Time e a Arena, com duas perguntas: "postaria isso no Instagram?" e "registraria o valor das vendas para ganhar a segunda?". E a contagem dos Vendi existentes nos bancos das lojas com a 0009 | A resposta das três decide se a entrega 3 entra agora ou nunca. Nenhuma linha de código antes disso |
| **1 · Placas medidas, arte e mensagem** | `perf_placas` no central, as três placas medidas no `perf_painel`, "Suas conquistas" no Desempenho, a arte pelo Compartilhar, a lista do mês no CRM | A Japa (para_sempre) recebe a primeira placa real; a arte sai com a logo dela; a mensagem é mandada à mão |
| **2 · Nota com Feito, faixa, sequência e selo** | o Feito nas notas, `faixa.ts`, o evento diário, o fechamento da semana, o selo na vitrine | Em duas lojas piloto, a faixa cai e volta conforme o fato; o selo some sozinho; a Início mostra uma nota por vez |
| **3 · Vendi com valor e placas registradas** (só se a etapa 0 disser sim) | o campo no modal, o evento `venda` e o estorno, os seis marcos | Uma loja de teste cruza R$ 10 mil pelo Vendi; o Desfazer reduz e a placa fica |

Cada entrega sai com o relatório curto: o que mudou, o que foi preservado, o que foi executado (não "testado": executado, pelo caminho do cliente no celular), e o que ficou de fora.

## 8. Como conferir

**Placa medida.** Loja de teste com 998 visitantes distintos. Duas visitas novas de aparelhos diferentes levam a 1.000: `perf_painel` devolve a placa com a data de hoje; abrir de novo não concede de novo; a arte sai com a logo e o marco, sem o número exato.

**Faixa.** Loja com todas as peças com foto e preço, estoque mexido há 3 dias, visita de post há 2 dias, nenhuma nota parada: "Loja em dia". Apagar a foto de capa de uma peça: na próxima abertura, "Quase em dia", com a frase "1 peça sem foto de capa" e o link para a peça. Recolocar: volta. Semana fechada fora da faixa: a sequência zera e a frase diz por quê.

**Selo.** Vitrine da loja mostra "estoque conferido há 3 dias". Simular 8 dias sem movimento: o selo some. Nenhuma palavra do jogo na vitrine.

**Nota com Feito.** A nota "3 pessoas procuraram 'vestido' e não acharam" na Início; Feito grava o evento `cuidado` com a chave; a Início passa à próxima nota; a mesma chave não volta a aparecer naquela semana; o Desempenho mostra "1 de 3 resolvidas".

**Vendi com valor** (entrega 3). Loja com R$ 9.900 registrados. Vendi 1 com R$ 150: R$ 10.050, placa de R$ 10 mil com a data. Desfazer: R$ 9.900, a placa fica, a próxima meta segue R$ 20 mil. Vendi sem valor: o estoque baixa, o acumulado não muda.

Em todos: no celular, pelo caminho da dona, e com o `scripts/teste-de-ponta-a-ponta.cjs` do molde estendido com esses passos.

## 9. O que nunca fazer

- Nunca inventar missão, nota ou número que o dado não sustente. Loja sem tráfego recebe silêncio, não tarefa.
- Nunca derivar faixa ou selo de pontos. Só de fato, com o fato escrito embaixo.
- Nunca pôr palavra do jogo na vitrine (faixa, sequência, conquista). A cliente vê um fato da loja.
- Nunca escrever "faturamento" ou "faturado com a plataforma". É "vendas registradas", e o critério está no detalhe.
- Nunca publicar a arte sozinho, nem pôr nela o total exato de vendas.
- Nunca tornar Estoque, Pedidos ou catálogo dependentes de faixa ou placa.
- Nunca exigir registro de valor para a dona ter a primeira placa. As medidas são a porta.
- Nunca cobrar por isto antes do piloto mostrar que a dona volta ao painel por causa disto. Faixa, notas e placas são do básico.
- Nunca começar a entrega 1 sem a etapa 0 respondida.

Materiais anteriores, agora só como exploração: [plano de unificação](plano-unificacao-vitrine-performance-placas.md), [plano de simplificação](plano-simplificacao-painel.md), [Performance 1.5](../experimentos/painel-gamificado/documentacao/PLANO-1.5-UTILIDADE-COMERCIAL.md), [placas de faturamento](../experimentos/painel-gamificado/documentacao/PLANO-PLACAS-DE-FATURAMENTO.md), [prévia parcial](previa-integracao-molde-painel.html).
