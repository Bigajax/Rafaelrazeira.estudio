# Performance 1.4 — inteligência comercial: revisão 2

Planejamento revisado em 13/10/2026 após a avaliação do plano de 12 páginas. Esta revisão incorpora quatro ajustes: interesse explícito por variação indisponível, três níveis de leitura, recomendações com destino disponível e marcos comerciais futuros sem XP adicional. O plano anterior foi preservado em arquivo próprio. Rafael escolheu preparar o plano e a validação primeiro. Este documento não implementa recursos novos no aplicativo. A versão atual continua sendo a 1.3 — Entrega 3, com nove modelos de missão, 23 cenários fictícios e 56 testes de regras e servidor.

## 1. Decisão de produto

O Performance deve ajudar o lojista a identificar uma oportunidade, escolher uma ação e acompanhar o que aconteceu depois. Tempo no painel, número de tarefas e quantidade de consultas à IA não são objetivos comerciais do produto.

Proposta de valor para validar: **Sua loja tem dados. Descubra o que fazer com eles.**

A gamificação reconhece cuidados úteis; o diagnóstico organiza a evidência; a inteligência explica alternativas. A utilidade comercial precisa ser observada com comerciantes antes de ampliar a interface.

| Etapa | Direção | Situação |
| --- | --- | --- |
| 1.3 — Entrega 3 | Missão, decisão, ação declarada e acompanhamento | Protótipo implementado; dados e assistente simulados |
| Validação da 1.3 | Utilidade, conclusão de tarefas e compreensão de interesse versus venda | Roteiro e ficha preparados; pesquisa ainda não realizada |
| 1.4 — Inteligência comercial | Mapa de produtos, procura por variações indisponíveis e diagnóstico determinístico | Planejamento; primeiro demonstrar com dados fictícios |
| 1.5 — IA real | Explicação contextual, descrições e perguntas comerciais com lacunas explícitas | Avaliação e piloto futuros, com custo e fidelidade medidos |
| 2.0 — Gestão orientada a resultados | Interesse, atendimentos, pedidos, vendas confirmadas, estoque e campanhas | Integrações e atribuição comercial futuras |

A conexão com IA generativa passa da previsão anterior de 1.4 para 1.5. Os documentos da 1.3 permanecem históricos; esta sequência é a direção atual.

## 2. O que verificar antes de desenvolver

A validação deve responder a quatro perguntas: as recomendações ajudam a escolher um próximo passo? O lojista consegue realizar a ação sem ajuda? Ele distingue visitas e cliques de atendimento, pedido e venda? **Você tomaria alguma decisão diferente depois de ver essa informação?** Registrar o que faria antes, o que faria depois e por quê.

Primeira rodada proposta: cinco comerciantes, sessões individuais de 25–35 minutos no aparelho habitual. Buscar diversidade de experiência digital e segmento. Usar somente os cenários fictícios atuais; não solicitar acesso à loja real para a primeira rodada.

Metas iniciais de projeto: pelo menos quatro de cinco identificam uma oportunidade relevante, explicam seu significado e indicam o próximo passo em menos de um minuto, sem ajuda; pelo menos quatro de cinco concluem a tarefa principal sem ajuda; nenhum participante entende a decisão ou a nota como reposição efetiva; nenhum interpreta um clique como venda confirmada ou a comparação como prova de causa. São critérios preliminares, não resultados obtidos nem validação estatística de mercado.

A descoberta em menos de um minuto será medida na 1.3 como referência inicial e depois novamente no mapa e no diagnóstico simulados da 1.4. Ainda não há resultado observado. Entender a interface é necessário; elogiar a informação sem explicar como a usaria não comprova valor comercial. Se aparecer confusão crítica, corrigir a 1.3 e repetir as tarefas afetadas antes de iniciar a interface da 1.4. Se a ferramenta for entendida, mas a oportunidade for considerada irrelevante, revisar a regra de negócio antes de melhorar sua apresentação visual.

O roteiro operacional está em `VALIDACAO-COM-LOJISTAS.md`; a ficha em `FICHA-PILOTO-1.3.md`. Convites e sessões ainda precisam ser organizados. Nenhum contato ou pesquisa foi executado pelo protótipo.

## 3. Base existente e lacunas concretas

A análise foi feita nos arquivos locais, sem consultar ou alterar bancos reais.

| Base observada | Como aproveitar | O que ainda precisa ser confirmado |
| --- | --- | --- |
| `supabase/performance.sql` prevê visita, peça, WhatsApp, busca e esgotado, incluindo produto e tamanho | Reutilizar semântica conhecida para uma futura camada normalizada | SQL presente não comprova migração aplicada, coleta ativa, cobertura ou qualidade |
| `supabase/performance-interesse.sql` prevê exposição, favorito, sacola e WhatsApp da sacola | Acrescentar sinais de interesse e distinguir exposição de abertura da peça | Essa migração está entre os arquivos locais pendentes; não foi aplicada nesta tarefa |
| Contagens de pessoas distintas por evento e período | Formar métricas descritivas por loja, produto e variação | O identificador é anônimo do navegador; não comprova identidade individual entre dispositivos |
| Produto e clique são agregados separadamente | Exibir seus totais absolutos de forma transparente | O clique não é necessariamente de alguém incluído nas visitas da peça; exige interseção para uma taxa válida |
| Evento de esgotado possui tamanho | Identificar procura registrada por variação | Falta vincular disponibilidade e versão de estoque confiáveis no instante do evento |
| `domain/opportunities.mjs` já cria oportunidades com fonte e janela encerrada | Reutilizar elegibilidade e ocorrência, sem outro motor de recompensas | Evidência por variação precisa de identidade estável, não apenas texto do tamanho |
| `domain/journeys.mjs` fixa grupos e objetivos | Evoluir para jornadas narrativas sem alterar denominadores concluídos | Jornada narrativa precisa de regras de entrada e conclusão próprias |
| `domain/impact.mjs` verifica períodos e proveniência | Apresentar observação e aprendizado | Sem ligação automática com uma operação real de estoque, anúncio ou pedido |

Não usar os totais 324 / 112 / 41 como um funil sequencial sem verificar que os grupos pertencem à mesma população. Eles podem representar ações opcionais e conjuntos que se sobrepõem. Na interface atual do protótipo, o resumo é fictício e usa campos cuja unidade precisa ser normalizada antes de qualquer diagnóstico novo.

## 4. Escopo da 1.4

A 1.4 será desenvolvida em duas entregas após a rodada de validação.

**Entrega A — inteligência dos produtos.** Definir a interação da vitrine para variações indisponíveis, separar toque de declaração de interesse, preparar contrato de dados, fixtures e três níveis de leitura; apresentar mapa e variações com fonte e ação disponível. A interação será demonstrada no experimento separado, sem alterar a vitrine de clientes.

**Entrega B — diagnóstico acionável.** Resumir as oportunidades elegíveis do mapa em até três achados, com uma prioridade principal, justificativa e acesso ao cuidado. Preservar acompanhamento, revisão explícita e estados de pouca evidência.

IA generativa, CRM adicional, vendas manuais, relatórios enviados por e-mail, jornadas com emblemas inéditos e testes A/B não entram nessas entregas. Eles têm posição no roteiro futuro abaixo e dependências próprias.

## 5. Mapa de oportunidades: simples antes de ser gráfico

A primeira versão deve ser uma lista visual de produtos com foto, nome, situação, números do período e próxima ação. No celular, cartões; no desktop, linhas com as mesmas informações. Filtros por situação e busca por nome. Um gráfico de dispersão não será a navegação obrigatória.

O mapa deve considerar todos os produtos publicados elegíveis do catálogo, não apenas os que já geraram missão. Produtos recentes, sem cobertura suficiente ou sem visitas aparecem com estado próprio e não são chamados de ruins.

| Situação pretendida | Leitura correta | Ação possível |
| --- | --- | --- |
| Destaques | Mais interesse relativo observado na própria loja, com evidência suficiente | Conferir disponibilidade e acompanhar |
| Muito vistos | Volume relevante de visitas; investigar apresentação somente se houver lacuna concreta ou comparação válida | Ver a peça e revisar a informação específica |
| Procura sem estoque | Evento elegível de procura por variação indisponível naquele instante | Analisar disponibilidade e possibilidade de reposição |
| Pouco descobertos | Pouca abertura apesar de exposição mensurada e tempo de publicação suficiente | Revisar exposição, posição ou divulgação |
| Leitura inicial | Existem fatos ou cuidados concretos, mas ainda falta base para comparação | Mostrar o que aconteceu e o cuidado possível; reservar “Em observação” à parte comparativa |

A classificação comparativa é uma informação adicional do mapa. Com pouco tráfego, o produto continua mostrando contagens e cuidados concretos; a lista não vira uma parede de “Em observação”. Uma peça pode ter mais de um sinal. O cartão mostra a situação principal pela prioridade comercial e conserva os outros sinais no detalhe. Não somar as quatro situações como se fossem públicos distintos ou etapas obrigatórias.

Ao tocar em um produto, abrir painel lateral com foto, período, contagens, variações, evidência, limite e uma ação. Se já existe missão elegível, usar seu identificador. Se não existe, oferecer inspeção do produto e acompanhamento, sem fabricar tarefa ou recompensa.

## 6. Três níveis de leitura para lojas pequenas

O mapa deve continuar útil mesmo quando a loja recebe apenas algumas dezenas de visitantes por semana. Os níveis pertencem à leitura dos dados, não são níveis de XP, planos pagos ou uma progressão que o lojista precisa desbloquear.

| Nível | Quando aparece | Exemplo | Próximo passo |
| --- | --- | --- | --- |
| 1 — O que aconteceu | Fonte válida e contagem identificada, mesmo pequena | “18 visitantes abriram esta peça no período de 14 dias.” | Ver o produto e as datas |
| 2 — O que merece atenção | Fato concreto: foto ausente, divergência ou interesse explicitamente declarado | “A peça está sem foto de capa.” ou “7 visitantes demonstraram interesse pelo tamanho indisponível.” | Abrir o cuidado elegível ou conferir o sinal e a disponibilidade |
| 3 — O que podemos comparar | Volume, cobertura e referência comparável suficientes | “A taxa de contato desta peça está acima da referência de produtos comparáveis da sua loja.” | Ver períodos, população, denominadores e critério |

Os três níveis podem coexistir no mesmo cartão. Nível 1 e nível 2 não dependem do mínimo exigido para comparação. Uma ausência de foto continua relevante sem visitas suficientes. Pouca amostra limita a inferência, não esconde o fato nem transforma a peça em problema comercial.

Os limites abaixo são hipóteses de produto, configuráveis e versionadas no servidor. Não representam significância estatística, benchmark externo ou regras novas já implementadas.

- Mostrar contagens absolutas e suas datas sempre que a fonte estiver válida. Coleta incompleta precisa de aviso próprio; contagem ausente não vira zero.
- Cuidados básicos existentes, como foto ausente ou contagem ainda não informada, preservam sua elegibilidade. Não exigir 100 visitas para permitir que o lojista os conclua.
- Oportunidades existentes de apresentação com procura preservam seus critérios atuais de 14 dias e 50 visitantes. Uma necessidade básica pode continuar disponível fora desse modelo.
- Interesse declarado por uma variação pode ser mostrado no nível 2 com sete visitantes ou menos. Isso não cria urgência, previsão de venda ou missão de reposição obrigatória.
- O limite inicial de dez visitantes distintos em sete dias prioriza um sinal recorrente de interesse declarado; ele não bloqueia o acesso aos números menores nem à consulta da disponibilidade.
- Para rótulos comparativos, manter inicialmente 100 visitantes elegíveis do produto por janela, duas janelas de 14 dias compatíveis e cinco produtos comparáveis da própria loja. Sem isso, não avaliar taxa como boa ou ruim.
- A ordenação “entre os mais vistos neste período” é descritiva: informa posição por contagem, conjunto e datas. Pode ser usada no nível 1 sem afirmar que a taxa de contato é superior. Tratar empates e evitar uma falsa posição exclusiva.
- “Muito visto” não significa apresentação ruim. Uma sugestão de edição exige lacuna concreta ou investigação sustentada por dados.
- “Pouco descoberto” exige exposição mensurada, tempo de publicação suficiente e referência apropriada. Sem exposição conhecida, apresentar apenas poucas aberturas registradas.
- No nível 3, testar faixas relativas por quartis da própria loja, com tratamento de empates. Não forçar todos os rótulos em catálogos pequenos nem inventar uma taxa ideal.

O exemplo de 83 visitas e 17 pessoas com clique pode mostrar contagens e uma posição descritiva entre os mais vistos. Não recebe automaticamente uma classificação comparativa de destaque. Mesmo com 18 visitas, o mapa pode apontar uma foto ausente e levar à ação correspondente.

Aceite específico: em uma fixture de loja com 40 produtos e 300 visitantes no mês, as peças com fonte válida exibem fatos e os cuidados concretos continuam acessíveis. A falta de nível 3 não impede o uso do mapa nem gera perda de XP.

## 7. Como registrar interesse por tamanho indisponível

A variação esgotada permanece identificada como “41 · Esgotado” e pode ser acionada para informação. Ela não pode ser selecionada como item disponível da sacola. Usar controle acessível com estado explícito; não bloquear a única interação que poderia revelar interesse.

Fluxo proposto na própria peça:

1. O visitante toca no tamanho esgotado.
2. A vitrine abre uma mensagem contextual: **“Este tamanho está indisponível no momento.”**
3. Apresenta a ação **“Tenho interesse neste tamanho”** e a opção de voltar aos tamanhos disponíveis.
4. Somente ao confirmar essa ação, registra interesse declarado anônimo.
5. Após confirmação do servidor, mostra **“Interesse registrado. A loja poderá considerar essa procura.”**

A mensagem de sucesso não promete aviso de reposição, reserva, encomenda, contato futuro ou disponibilidade. Não pede CPF, e-mail, telefone, login ou acesso ao WhatsApp. Falar com a loja, favoritar e adicionar outro tamanho à sacola continuam ações separadas.

| Sinal | Momento | Leitura permitida |
| --- | --- | --- |
| Toque exploratório | Abrir a informação de uma variação esgotada | “Consultou o tamanho indisponível”; não declarou interesse |
| Interesse declarado | Confirmar “Tenho interesse neste tamanho” | “Demonstrou interesse pelo tamanho”; não confirmou compra |
| Evento legado de esgotado | Coleta anterior sem confirmação explícita | Conservar a semântica da fonte; nunca renomear como interesse declarado |

Não somar os dois sinais como visitantes diferentes. Mostrar separadamente quantos consultaram e quantos declararam interesse; formar sua união apenas quando houver necessidade de totalizar pessoas elegíveis. Não inferir que todos os interessados clicaram no WhatsApp.

Estados necessários: enviando, registrado, já registrado neste período, falha com nova tentativa e disponibilidade alterada. Uma falha não mostra sucesso; a nova tentativa mantém a variação e a operação. Repetir clique ou reenviar a mesma operação não duplica evento. O servidor rejeita variação de outra loja, identifica o estoque ou catálogo usado na leitura e estabelece a data aceita.

Se a disponibilidade mudar entre abrir e confirmar, revalidar. Se agora estiver disponível, atualizar a mensagem e oferecer escolher a variação. Se não houver referência confiável de disponibilidade no instante aceito, registrar interesse pela variação com estado desconhecido e não afirmar que estava esgotada. A fonte deve explicitar se o fato observado foi a disponibilidade apresentada ao visitante ou o estoque validado no servidor; divergências ficam identificadas.

A chave interna da variação é estável; tamanho e cor são rótulos. Deduplicar evento por operação e contar visitantes anônimos distintos por loja + produto + variação + janela. Vários toques do mesmo visitante no 41 contam uma consulta; múltiplas confirmações contam um interessado naquele período. Quem se interessa por 40 e 41 pode aparecer em ambas as linhas, mas o total por produto usa a união, sem somar as linhas.

A declaração é vinculada à interação específica da variação e sua fonte. A janela de contagem tem início inclusivo, fim exclusivo e versão. A janela de deduplicação será política do servidor e não permitirá repetir o registro a cada atualização de página.

Copy principal com fonte explícita: **“14 visitantes demonstraram interesse pelo tamanho 41 enquanto ele estava indisponível.”** Para toque simples, usar **“14 visitantes consultaram o tamanho 41 indisponível.”** Não misturar as frases.

A disponibilidade atual é uma leitura separada. Se continuar indisponível, oferecer análise de disponibilidade e possibilidade de reposição; se foi reposto, mostrar “Disponível agora”. Se a informação atual estiver desconhecida ou divergente, priorizar conferência. Reposição depende de margem, custo, fornecedor e contexto, não apenas da contagem.

Sete declarações válidas já podem aparecer como fato concreto do nível 2. O critério inicial de dez em sete dias serve para priorização recorrente; não oculta os menores sinais. Uma interação isolada não recebe selo de urgência, XP ou estimativa de venda perdida.

## 8. Contrato de dados antes da interface

A futura camada deve normalizar as fontes existentes, preservando dados brutos e versão de regra. Não apontar o protótipo para tabelas reais diretamente.

| Campo ou conceito | Definição |
| --- | --- |
| Loja | Identidade estabelecida pelo servidor e autorização; nunca confiar apenas no identificador enviado pelo navegador |
| Evento e fonte | Identificador único, origem e versão; repetição não altera contagem |
| Produto e variação | Chaves estáveis vinculadas ao catálogo da loja; nome, tamanho e cor são rótulos |
| Visitante | Identificador anônimo com escopo definido; contagens são aproximações por navegador, não identidade civil |
| Tempo | Instante aceito no servidor, janela com começo inclusivo e fim exclusivo e fuso de apresentação explícito |
| Disponibilidade no evento | Disponível, indisponível ou desconhecida; referência ao estado apresentado e/ou estoque validado, versão e divergência explícitas |
| Natureza do interesse | Toque exploratório ou declaração explícita; preservar a semântica de eventos legados |
| Vínculo da declaração | Operação, interação e variação; confirmação idempotente, sem dados de contato |
| Exposição | Card efetivamente visto segundo regra de medição documentada; não é simples carregamento de HTML |
| Abertura da peça | Visita elegível à página da peça; não equivale a impressão do card |
| WhatsApp qualificado | Visitante com clique relacionado ao produto, pertencente à população da taxa no mesmo período |
| Cobertura | Estado da instrumentação, período coletado, fontes ausentes e alterações na medição |

A taxa de contato de uma peça será pessoas com clique qualificado pertencentes ao grupo de visitantes da peça / visitantes elegíveis da peça. Cliques gerais da loja e visitas do card não entram nesse denominador. Se não for possível formar a interseção, mostrar os totais separados e não calcular a taxa.

Favoritos, sacola e WhatsApp são sinais diferentes. Guardar peças ou selecionar tamanhos não confirma conversa, pedido ou venda. Não somar ações para produzir uma falsa contagem de clientes ou um escore opaco de intenção.

Janela encerrada não garante sozinha integridade: avaliar fonte, cobertura, atraso e mudança de versão. Uma coleta interrompida deve gerar estado de dados incompletos, não diagnóstico de queda de procura.

## 9. Diagnóstico simples e recomendações com destino

O diagnóstico resume o mesmo motor do mapa, sem texto livre de IA na 1.4. A primeira área visível apresenta uma situação, uma evidência breve, uma recomendação e uma ação principal. Não exibir uma grade de indicadores antes do próximo passo.

Exemplo com declaração e fonte verificadas:

**PERFORMANCE INTELLIGENCE**

**“Uma numeração merece sua atenção.”**

“14 visitantes demonstraram interesse pelo tamanho 41 enquanto ele estava indisponível.”

**“Confira a disponibilidade atual e avalie se a reposição faz sentido.”**

**Analisar oportunidade →**

Não chamar o item de “mais procurado” sem ordenação válida de procura no conjunto e no período exibidos. Em pouco tráfego, uma foto ausente pode ser o destaque principal mesmo sem classificação comparativa.

As outras oportunidades ficam secundárias, com contagens derivadas do mesmo conjunto: “2 peças precisam de apresentação” e “1 campanha está pronta para análise”, seguidas de “Ver todas”. São exemplos de copy condicionados aos dados; não números fixos do layout. Até três achados no total, com uma prioridade principal.

Ordem inicial: divergência em item com procura; declaração por variação indisponível; apresentação incompleta; campanha encerrada para analisar; exposição a investigar quando houver referência suficiente. Respeitar adiamentos, capacidades disponíveis e a identidade da necessidade; não destacar duas vezes o mesmo problema.

Cada achado deverá resolver seu destino a partir do estado atual do servidor. Produto, variação, missão e fonte precisam pertencer à loja. Um texto de recomendação só entra no destaque quando existe um próximo passo executável.

| Recomendação | Destino previsto na entrega | Quando a ação não está disponível |
| --- | --- | --- |
| Adicionar foto ou informação | Formulário da missão existente e elegível, com peça identificada | Abrir os dados atuais; se o cuidado já foi concluído, retirar a recomendação antiga |
| Conferir divergência | Formulário de revisão existente e elegível | Ver disponibilidade; edição que exigir ferramenta ausente vira pré-requisito da entrega |
| Analisar procura por tamanho | Painel do produto na variação e fonte corretas; abrir decisão existente apenas se elegível | Mostrar a declaração e a disponibilidade, sem criar missão ou XP |
| Analisar campanha | Formulário da ocorrência elegível da campanha | Abrir a leitura histórica sem convidar a salvar análise já concluída |
| Ver todas | Seção do mapa ou dos cuidados com filtro equivalente à contagem exibida | Estado vazio com acesso para retornar ao mapa completo |
| Ver acompanhamento | Observação existente na Evolução | Explicar a ausência de referência e apresentar os cuidados disponíveis |

Nenhum CTA será placeholder, âncora sem alvo ou link para uma tela inexistente. O painel de produto/variação planejado na Entrega A deverá estar disponível antes de expor sua recomendação na Entrega B. Esta especificação não afirma que esses destinos novos já existem na 1.3.

Se o estado mudar entre renderizar e clicar, revalidar o destino e oferecer a informação atual com mensagem curta. Não abrir peça errada, usar outra variação ou recriar uma tarefa concluída. Os campos do lojista precisam ser preservados em falha; botões de leitura nunca acionam operação de estoque ou recompensa.

Sem recomendação elegível, mostrar os fatos e o acompanhamento disponíveis. Manter a utilidade dos níveis 1 e 2 sem forçar conclusão de desempenho.

## 10. Experiência e personalidade

Preservar creme, verde profundo, tipografia editorial e rosa marcante como acento. Rosa identifica foco e evolução; não representa falha, prejuízo ou alerta financeiro. As situações comerciais usam ícone e texto, além da cor.

Uma linha do mapa deve permitir entender peça, período, evidência e ação sem abrir um gráfico. O painel lateral revela detalhes sem retirar o lojista do contexto. As fontes e critérios ficam em uma seção recolhida, mantendo uma ressalva curta quando a decisão depende de margem ou fornecedor.

Não adicionar três entradas ao menu para diagnóstico, mapa e tamanhos. O Início sintetiza; Missões organiza os cuidados e oferece o mapa em uma seção interna; o painel do produto apresenta suas variações; Evolução mantém as ações e observações.

No celular, filtros acessíveis, ações de pelo menos 44 px, ausência de rolagem horizontal obrigatória, foco restaurado após fechar o painel e estados claros de carregamento, erro, pouca amostra e fonte ausente.

## 11. Missões, jornadas e experiências comerciais

Mapa e diagnóstico não concedem XP. Uma ação que corresponde a uma missão usa o identificador e a recompensa originais. Uma nova janela só gera outra ocorrência quando passa pelas regras atuais de fonte independente, período posterior e necessidade concreta.

As jornadas maiores ficam para uma evolução posterior à 1.4 inicial. Elas poderão agrupar os cuidados existentes sem acrescentar bônus de XP nem aumentar um denominador depois que o lojista avançou.

| Jornada futura | Entrada | Conclusão possível |
| --- | --- | --- |
| Sua primeira vitrine | Catálogo publicado com necessidades básicas verificadas | Essenciais específicos do grupo salvos e verificados |
| Conheça seus clientes | Fontes e volume suficientes para leitura | Análises legítimas de produtos, buscas ou variações registradas |
| Melhore seus resultados | Oportunidade escolhida e evidência anterior utilizável | Ação registrada e leitura posterior elegível revisada, sem exigir aumento de vendas |

Após a primeira validação da 1.4, preparar um marco visual **“Sua primeira descoberta comercial”**. Ele registra a primeira análise explícita salva de uma fonte elegível de interesse por variação; abrir o mapa ou o painel não conclui a descoberta. A conclusão reaproveita o registro autorizado da análise, não concede XP extra, não cria nível, moeda ou tarefa adicional e não confirma reposição ou venda.

Identidade proposta: loja + tipo do marco + versão, com registro único, data e referência à análise e fonte. Reabrir a trajetória permite rever a descoberta; uma nova consulta ou a mesma fonte renomeada não dispara o marco novamente. O símbolo pode usar o brasão e o rosa existentes em uma confirmação breve, sem modal obrigatório; movimento reduzido mantém a leitura estática.

Esse marco é um reconhecimento na trajetória, separado do nível 1/2/3 de leitura de dados. Sua implementação fica posterior à validação do mapa e do diagnóstico, como as jornadas maiores. Emblemas futuros reconhecem conclusão verificável, não atingir uma taxa escolhida pelo sistema. Poucos dados não bloqueiam o cuidado básico nem retiram conquistas.

A experiência comercial poderá apresentar hipótese → alteração → observação → aprendizado usando o acompanhamento da 1.3. Comparação antes/depois continuará descritiva. Testes A/B reais exigem divisão de visitantes, condições controladas e tráfego suficiente; não são simulados como experimento causal nesta fase.

## 12. Interesse, atendimento, pedido e venda

Para a 2.0, aproveitar a gestão de pedidos já planejada, em vez de pedir que o lojista alimente outro CRM. Uma confirmação comercial exige origem, produto ou variação, quantidade, status e data; deve permitir cancelamento e correção com histórico.

Visita, favorito, sacola, clique, atendimento, pedido e venda são acontecimentos diferentes. Um pedido pode incluir vários produtos, e uma venda pode ocorrer dias depois. Não vincular pessoas ou vendas por coincidência de nome, tamanho ou horário.

Um registro opcional informado pelo lojista será apresentado como declarado. Um pedido confirmado por sistema autorizado pode ser vinculado por referência estável. Receita só entra quando valor, descontos, devoluções e status forem confiáveis. Atribuição de campanha terá modelo e janela explícitos; não presumir que o último clique causou a venda.

WhatsApp Business e integrações de pedidos ficam para contrato próprio de acesso, autorização e infraestrutura. Nenhuma conexão com conversas reais foi feita neste plano.

## 13. Relatório mensal e prioridades posteriores

O relatório mensal fica depois da validação do mapa e do diagnóstico. Ele usará os mesmos fatos e regras, evitando outra interpretação independente dos números. Separar melhorias salvas, decisões registradas, encaminhamentos declarados e resultados observados.

O resumo deverá trazer período, cobertura, pessoas e contatos elegíveis, produtos com sinais de interesse, variações com procura não atendida e até três prioridades. Não somar visitantes dos produtos como se fossem visitantes únicos da loja.

Consultar na plataforma vem antes de enviar automaticamente. E-mail e outras notificações dependem de preferência explícita do lojista; nenhuma mensagem foi enviada ou agendada.

## 14. Cenários para a primeira simulação da 1.4

Preparar, após a validação da 1.3, toque sem declaração, declaração explícita, tentativa repetida, falha e nova tentativa, estoque alterado durante a confirmação, sete declarações visíveis sem comparação, loja pequena com 40 produtos e 300 visitantes mensais, destino desatualizado ou missão concluída; além dos casos anteriores: produto popular com disponibilidade conferida; produto muito visto com descrição ausente; tamanho indisponível com dez ou mais visitantes elegíveis; tamanho já reposto; disponibilidade desconhecida; repetição do mesmo visitante em vários tamanhos; pouca amostra; catálogo pequeno sem base comparativa; produto recente; fonte interrompida; clique sem visita elegível; apresentação completa sem tarefa artificial.

Adicionar fixtures ao experimento separado, mantendo todos os 23 cenários anteriores. O servidor escolhe os conjuntos; o cliente não envia métricas ou XP para preencher o mapa. Nenhuma fixture deverá exigir chamada externa.

## 15. Backlog e critérios de aceite

| Ordem | Trabalho | Pronto quando |
| --- | --- | --- |
| 0 | Rodada de validação da 1.3 | Achados registrados, confusões críticas tratadas e tarefas afetadas revistas |
| A1 | Interação e contrato por variação | Toque e declaração separados; confirmação, repetição e disponibilidade alterada definidos |
| A2 | Contrato e normalização das fontes | Unidade, população, janela, identidade de variação, cobertura e origem documentadas |
| A3 | Fixtures e três níveis de leitura | Fatos e cuidados úteis em pouco tráfego; comparação reservada à evidência suficiente |
| A4 | Mapa e painel do produto | Produto, variação, natureza do interesse e ação são compreensíveis em celular e desktop |
| A5 | Resolver destinos e vincular cuidados | Todos os CTAs têm alvo disponível e revalidado; sem XP pela leitura ou coleta |
| B1 | Síntese determinística no Início | Mesmos achados do mapa, até três oportunidades e uma ação principal |
| B2 | Validação da 1.4 simulada | Oportunidade relevante compreendida em menos de um minuto; efeito na decisão registrado |
| Posterior | Marco de primeira descoberta | Referência única à análise salva; sem XP extra e somente após validar a 1.4 |
| Futuro | Piloto com coleta real | Contrato autorizado, qualidade e cobertura verificadas antes de inferências |

Testes essenciais da futura implementação: toque sem declaração não aparece como interesse explícito; estado esgotado acionável por teclado sem permitir compra; confirmação real antes do sucesso; retry idempotente; disponibilidade alterada; fato de sete interessados visível; foto ausente acionável sem 100 visitas; destino inválido, ausente ou já concluído; além das regras anteriores: isolamento por loja; deduplicação; janelas concluídas; fonte adulterada; variação de outra loja; disponibilidade desconhecida; identidade repetida entre tamanhos; contato fora do denominador; empates; falta de referência própria; notas sem efeito no estoque; reaproveitamento de missão; preservação dos grupos e do XP; teclado e movimento reduzido; persistência e duas abas.

Os testes serão implementados junto com as regras e a interface da 1.4. Não adicionar testes que apenas verifiquem a existência deste documento.

## 16. Métricas de sucesso a acompanhar

Na pesquisa: tempo para descobrir uma oportunidade, interpretação correta, próximo passo sem ajuda, utilidade percebida e diferença entre a decisão antes e depois da informação. Registrar “eu já sabia” separadamente de “eu mudaria a compra/divulgação/conferência por este motivo”. Não considerar aprovação estética ou interesse genérico como validação de assinatura. Em um piloto futuro: proporção de oportunidades consideradas relevantes, ações úteis concluídas e decisões revisadas com dados posteriores, sempre com definição e denominador.

Quantidade de missões, tempo de sessão, cliques no assistente e XP acumulado são medidas de uso ou progresso, não evidência de crescimento comercial. Vendas e margem só serão indicadores do produto quando houver fontes confiáveis e comparação adequada.

## 17. Preparação da 1.5

A IA real receberá o contexto estruturado do motor da 1.4 e responderá com evidência e lacunas explícitas. Um modelo não escolherá uma classificação comercial sozinho nem alterará estoque, catálogo, pedidos ou XP.

Perguntas como “Tenho R$ 2.000; devo repor ou anunciar?” exigem custos, margem, disponibilidade, objetivo e orçamento conhecido. Sem isso, a resposta deve pedir informações e apresentar raciocínio condicional. Não produzir retorno previsto nem uma quantidade ideal de compra inventada.

Estilos Direto, Elegante, Comercial e Técnico serão opções de rascunho com fatos preservados. A escolha de um modelo dependerá de avaliação sintética, fidelidade, latência e custos medidos, conforme `PREPARACAO-1.5.md`.

## 18. Limite desta preparação

Entregues agora: revisão dos quatro pontos, três níveis de leitura, interação explícita por variação, matriz de destinos, especificação do marco futuro e critérios de utilidade na pesquisa. O plano original e os relatórios da 1.3 foram preservados. A 1.3 continua disponível para executar as sessões. Aplicativo, coleta real, preços, assinatura e bancos permanecem na situação anterior; esta rodada alterou apenas documentação do experimento.