# Plano — placas de faturamento do Performance

**Plano vigente:** [Integração completa do molde, Performance, gamificação e placas](../../../docs/PLANO-MESTRE-MOLDE-PERFORMANCE-GAMIFICACAO-PLACAS.md). A coleção usa recebimentos de produtos registrados pela loja e o texto “em vendas registradas”, conforme a especificação consolidada.

**Estúdio Rafael Razeira · 18/10/2026 · Proposta para implementação**

> **Direção atualizada em 19/10/2026:** o [plano de unificação com o molde](../../../docs/plano-unificacao-vitrine-performance-placas.md) prevalece sobre os critérios deste conceito inicial. A primeira integração usa recebimentos confirmados pela loja em Pedidos, sem exigir checkout ou conciliação bancária automática; a coleção passa a usar “em vendas registradas” e abrange os canais registrados no painel. Este documento e sua apresentação visual ficam preservados como histórico.

Reconhecer marcos de vendas da loja com placas digitais colecionáveis: **R$ 10 mil, R$ 20 mil, R$ 50 mil, R$ 100 mil, R$ 300 mil e R$ 500 mil faturados com a plataforma**. A placa deve parecer um prêmio que o lojista queira guardar e compartilhar.

Este documento planeja uma nova frente. O experimento atual continua na versão 1.4 A/B, com dados fictícios; a 1.5 já possui seu planejamento de utilidade comercial. A demonstração das placas pode ser desenvolvida no experimento, enquanto a concessão real depende da integração de pedidos e pagamentos prevista para a frente 2.0.

## 1. Encaixe na gamificação

O Performance passa a reconhecer duas trajetórias na área de Evolução:

| Trajetória | O que representa | Reconhecimento |
| --- | --- | --- |
| Cuidados da loja | Melhorias e decisões validadas | XP, níveis e emblemas existentes |
| Marcos de faturamento | Vendas confirmadas, com origem rastreável na plataforma | Placas próprias, com valor e data |

As placas não concedem XP nem alteram a fórmula dos níveis. Uma loja pode conquistar uma placa sem estar em um nível específico. A coleção pertence à loja, mesmo quando há vários operadores.

## 2. Coleção inicial

| Marco acumulado | Texto principal | Direção visual proposta |
| --- | --- | --- |
| R$ 10 mil | 10 MIL | Verde profundo, marca central e moldura fina |
| R$ 20 mil | 20 MIL | Verde profundo e contorno metálico discreto |
| R$ 50 mil | 50 MIL | Acabamento bronze e moldura facetada |
| R$ 100 mil | 100 MIL | Metal acetinado, moldura simples e marca central |
| R$ 300 mil | 300 MIL | Acabamento prateado e moldura com mais presença |
| R$ 500 mil | 500 MIL | Acabamento dourado e composição mais imponente |

Cada placa contém o nome da loja, o valor do marco, a frase “Faturados com a plataforma”, a marca Performance e a data em que o marco foi atingido. Usar a identidade existente: verde profundo, superfície escura, tipografia editorial e detalhes em rosa.

O valor deve dominar a composição. A forma retangular e o acabamento de prêmio diferenciam a placa dos emblemas de nível. Implementar o desenho em SVG/CSS para preservar nitidez e permitir personalização e exportação.

Os seis marcos fazem parte da primeira coleção. R$ 10 mil, R$ 20 mil e R$ 50 mil reconhecem a evolução inicial e aproximam a primeira conquista de quem está começando. Todas as placas recebem o mesmo cuidado visual, com acabamento progressivo conforme o valor. R$ 1 milhão fica como expansão futura.

## 3. Experiência no painel

### Evolução

Adicionar a seção “Placas de faturamento”, mantendo níveis e sua coleção existentes. Exibir:

- Última placa conquistada, em destaque.
- Progresso para a próxima, com valor confirmado e valor restante.
- Coleção com os seis marcos, usando os estados conquistado, próximo e futuro.
- Acesso à explicação do cálculo, período coberto e última atualização.

Exemplo inicial: **“R$ 8 mil de R$ 10 mil”**, acompanhado de **“Faltam R$ 2 mil para sua primeira placa.”** Para uma loja com R$ 82 mil, mostrar **“Faltam R$ 18 mil para sua placa de R$ 100 mil”**, mantendo as placas de R$ 10 mil, R$ 20 mil e R$ 50 mil conquistadas na coleção.

O progresso representa o acumulado desde o início da cobertura, sem reinício mensal. As metas seguem a sequência **10 → 20 → 50 → 100 → 300 → 500 mil**; manter o texto explícito sobre o total acumulado.

Ao tocar em uma placa conquistada, abrir sua apresentação com nome da loja, data, critério e botão “Baixar minha placa”. Placas futuras mostram uma prévia neutra e o valor necessário, sem aparência de punição.

### Início

Apresentar um resumo compacto da última conquista e da próxima placa, abaixo da orientação principal. A tarefa útil da loja mantém prioridade. O resumo leva diretamente à coleção em Evolução.

### Conquista

Após a confirmação do servidor, apresentar a placa em um diálogo que possa ser fechado imediatamente. Registrar a apresentação para evitar repetição ao atualizar ou abrir outra aba. Reabrir pela coleção permanece possível.

Se uma atualização atravessar vários marcos, celebrar o maior e informar quais outras placas foram conquistadas. Não abrir uma sequência de diálogos. Na carga inicial de histórico, mostrar as placas já obtidas em um único resumo.

Prever apresentação estática com redução de movimento, foco de teclado correto, leitura por leitor de tela e ausência de som automático. Definir a animação na etapa visual, seguindo as convenções existentes.

## 4. Regra de faturamento proposta

Para a placa, “faturamento” significa o **valor acumulado dos produtos efetivamente pagos em pedidos originados na plataforma, após descontos e devoluções**. Não representa lucro nem saldo disponível para saque.

Regras para a primeira integração:

- Somar valores em reais e armazenar os cálculos em centavos.
- Considerar o valor dos produtos pago pelo cliente após descontos, sem somar frete. Não descontar taxas do processador desse indicador.
- Em pagamentos parciais, contar somente a parcela confirmada referente aos produtos. A integração precisa conseguir separar esses valores.
- Descontar estornos parciais, totais e contestações confirmadas, sem descontar duas vezes o mesmo ajuste.
- Excluir pedidos de teste, pendentes e valores não pagos. Cancelamentos sem pagamento não geram valor; valores já pagos seguem o ajuste financeiro confirmado.
- Usar identificadores estáveis de loja, pedido, pagamento e ajuste. Reenvios de eventos não podem duplicar o acumulado.
- Exigir vínculo verificável do pedido com a plataforma. Clique no WhatsApp, orçamento, carrinho e declaração manual de venda não comprovam pagamento.
- Mostrar a data inicial de cobertura. Importar histórico apenas quando sua origem, seus pagamentos e ajustes puderem ser conferidos.

A frase “Faturados com a plataforma” exige essa rastreabilidade. Se a futura fonte apenas registrar vendas externas declaradas, a apresentação e a regra deverão ser revistas antes de oferecer a placa.

**Sem integração:** mostrar “Conecte seus pagamentos para acompanhar suas placas”. Falha ou desatualização da fonte deve aparecer como tal, com a última informação confirmada quando disponível. Ausência de dados não vira faturamento zero.

### Ajustes depois de uma conquista

Registrar a primeira data em que o saldo confirmado atingiu o marco. Um estorno posterior atualiza o progresso atual, mas preserva a conquista histórica legítima e sua data. Explicar essa regra na coleção: a placa registra um marco alcançado, enquanto o acumulado pode mudar por ajustes posteriores.

Duplicidades, fraude ou correções de dados que invalidem o próprio marco exigem retificação auditável da concessão. Uma placa invalidada não fica disponível para nova exportação. Processar novamente o mesmo histórico não pode conceder ou celebrar a placa outra vez.

## 5. Compartilhamento

Entregar uma imagem vertical de 1080 × 1920 para stories, com loja, placa, marco, marca e data. Compartilhar é uma ação do lojista, iniciada pelo download ou pelo compartilhamento nativo quando disponível.

A imagem mostra o marco alcançado, sem expor pedidos, clientes ou o faturamento exato atual. Não publicar automaticamente. A primeira versão oferece placa digital; prêmio físico e envio ficam como possibilidades futuras.

## 6. Etapas de implementação

| Etapa | Trabalho | Condição para concluir |
| --- | --- | --- |
| A — Protótipo visual | Desenhar seis placas, coleção, detalhe, resumo no Início e arte de stories com dados fictícios | Revisar desktop e celular; compreender valor, estado e próxima meta sem explicação externa |
| B — Motor experimental | Criar cálculo separado do XP, histórico fictício de pagamentos/ajustes e concessão única por loja/marco | Cenários e testes de regras passam; atualizar e reabrir preservam as conquistas |
| C — Validação com lojistas | Testar entendimento, desejo de compartilhar, percepção dos marcos e leitura dos critérios | Registrar problemas e ajustar a proposta antes da integração real |
| D — Integração financeira | Mapear fonte autorizada, cobertura, pedidos, pagamentos, ajustes e importação; conferir totais em staging | Acumulado conciliado com a fonte e isolamento entre lojas verificado |
| E — Piloto | Ativar para um grupo restrito com fonte válida e acompanhar concessões, dúvidas e falhas | Critérios compreendidos, nenhuma concessão duplicada e valores conciliados |

As etapas A e B usam somente o ambiente experimental. O desenvolvimento real depende do contrato financeiro; não inferir pagamentos a partir dos sinais comerciais da versão atual.

## 7. Organização técnica prevista

- Criar um domínio próprio, como `domain/revenue-milestones.mjs`, sem alterar as regras de `domain/achievements.mjs` e do motor de XP.
- Integrar a coleção em `components/Evolution.jsx` e o resumo em `components/Home.jsx`, com componentes próprios para placa, coleção e apresentação da conquista.
- Calcular o acumulado e conceder placas no servidor. O navegador recebe valores e estados autorizados, sem poder declarar faturamento ou conquistas.
- Persistir eventos normalizados, versão da regra, cobertura da fonte, concessões e apresentação ao usuário. Garantir unicidade por loja/marco e por evento financeiro da fonte.
- Preservar referência ao instante financeiro original e ao recebimento do evento. Eventos atrasados devem recalcular a data do marco pelo histórico válido.
- Aplicar pagamento/ajuste e concessão em transação; quando a origem estiver em outro sistema, consumir eventos com deduplicação e reconciliação periódica.

O contrato da integração deve ser definido antes de criar tabelas de produção. O banco SQLite e as sessões atuais servem à demonstração.

## 8. Cenários e critérios de aceite

Validar lojas sem fonte, com fonte indisponível, com zero confirmado, com R$ 8 mil e com R$ 82 mil, imediatamente abaixo e exatamente em cada um dos seis marcos, além de uma carga que ultrapasse os seis. Conferir a transição da próxima meta em toda a sequência e a apresentação da coleção completa após R$ 500 mil.

Os testes precisam cobrir pagamento duplicado, pagamento parcial, estorno parcial/total, correção invalidando o marco, eventos fora de ordem, importação de histórico e isolamento entre lojas. Confirmar que um evento repetido e duas abas não criam duas concessões nem repetem a celebração.

Na interface, verificar coleção e download em celular e desktop, navegação por teclado, redução de movimento e nomes longos de lojas. Conferir que nenhuma placa aparece como real em um cenário demonstrativo e que XP e níveis preservam o comportamento existente.

Na validação com lojistas, observar se conseguem explicar o que conta para o marco, localizar a próxima placa e gerar uma arte para compartilhar. No piloto, acompanhar divergências do acumulado, duplicidades, abertura da coleção e exportações. Exportar uma imagem não comprova que ela foi publicada.

## 9. Entrega recomendada para começar

Construir primeiro **as seis placas e a coleção em Evolução, com progresso, detalhe e download em cenários fictícios**. Essa entrega torna a ideia revisável antes da conexão financeira. A concessão real entra quando a fonte de pedidos e pagamentos estiver pronta e conciliada.
