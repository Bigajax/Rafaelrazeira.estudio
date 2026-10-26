# Performance — plano da 1.4 e validação

Planejamento revisado em 13/10/2026 após a análise sobre um copiloto de crescimento. Rafael escolheu preparar o plano e a validação primeiro. Este documento não implementa recursos novos no aplicativo. A versão atual continua sendo a 1.3 — Entrega 3, com nove modelos de missão, 23 cenários fictícios e 56 testes de regras e servidor.

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

A validação deve responder a três perguntas: as recomendações ajudam a escolher um próximo passo? O lojista consegue realizar a ação sem ajuda? Ele distingue visitas e cliques de atendimento, pedido e venda?

Primeira rodada proposta: cinco comerciantes, sessões individuais de 25–35 minutos no aparelho habitual. Buscar diversidade de experiência digital e segmento. Usar somente os cenários fictícios atuais; não solicitar acesso à loja real para a primeira rodada.

Três metas iniciais de projeto: pelo menos quatro de cinco identificam o próximo passo e concluem a tarefa principal sem ajuda; nenhum participante entende a decisão ou a nota como reposição efetiva; nenhum interpreta um clique como venda confirmada ou a comparação como prova de causa. São critérios preliminares, não resultados obtidos nem validação estatística de mercado.

Se aparecer confusão crítica, corrigir a 1.3 e repetir as tarefas afetadas antes de iniciar a interface da 1.4. Se a ferramenta for entendida, mas a oportunidade for considerada irrelevante, revisar a regra de negócio antes de melhorar sua apresentação visual.

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

**Entrega A — mapa e procura por variação.** Preparar contrato de dados, fixtures e regras determinísticas; apresentar o mapa de produtos e as variações com procura observada enquanto indisponíveis. Permitir entender a fonte e abrir o cuidado existente.

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
| Em observação | Falta volume, tempo, comparação ou cobertura para uma classificação | Mostrar números disponíveis e explicar o que falta |

Uma peça pode ter mais de um sinal. O cartão mostra a situação principal pela prioridade comercial e conserva os outros sinais no detalhe. Não somar as quatro situações como se fossem públicos distintos ou etapas obrigatórias.

Ao tocar em um produto, abrir painel lateral com foto, período, contagens, variações, evidência, limite e uma ação. Se já existe missão elegível, usar seu identificador. Se não existe, oferecer inspeção do produto e acompanhamento, sem fabricar tarefa ou recompensa.

## 6. Regras iniciais de classificação

Os limites abaixo são hipóteses de produto para a primeira simulação. Devem ser configuráveis e versionados no servidor. Não representam significância estatística, benchmark externo ou regra já implementada.

- Números absolutos podem ser mostrados mesmo com pouca amostra, desde que a fonte seja válida e a janela esteja identificada.
- Oportunidades existentes de apresentação preservam os limites atuais: janela de pelo menos 14 dias e 50 visitantes, além de informação realmente ausente. Não elevar esse limite só para classificar o mapa.
- Para rótulos comparativos de interesse, usar inicialmente pelo menos 100 visitantes elegíveis do produto por janela, duas janelas de 14 dias compatíveis e pelo menos cinco produtos comparáveis na própria loja. Sem essa base, mostrar ordenação descritiva por números, sem concluir que o contato é baixo.
- Uma ordenação “mais vistos” significa apenas posição por contagem no conjunto apresentado. Não equivale automaticamente a destaque comercial.
- Classificação de destaque combina volume e contatos qualificados relativamente ao catálogo comparável, sem incluir uma peça com disponibilidade desconhecida em uma recomendação automática de divulgação.
- “Muito visto” não causa automaticamente uma recomendação de mudar a descrição. Verificar foto, detalhe, composição ou descrição ausente. Com apresentação completa, o próximo passo pode ser investigar contexto, não editar por obrigação.
- “Pouco descoberto” exige medir exposição do card, pelo menos 14 dias de publicação e um conjunto comparável. Zero visitas sem coleta ou sem exposição conhecida significa informação insuficiente.
- Na simulação inicial, testar faixas relativas por quartis da própria loja, com tratamento explícito de empates. Evitar limites como “taxa ideal de 10%”. Se o catálogo comparável for pequeno ou não houver diferença útil entre os produtos, não forçar os quatro rótulos.

O exemplo de 83 visitas e 17 pessoas com clique pode ser mostrado com os números reais da fonte, mas não recebe automaticamente um rótulo comparativo pelo limite inicial acima. “17 pessoas clicaram” também não significa 17 vendas.

## 7. Procura por tamanho indisponível

Este é o sinal prioritário da Entrega A. O evento precisa identificar loja, produto, variação estável, instante, visitante anônimo e disponibilidade no instante da interação. Tamanho e cor são rótulos de apresentação; a chave interna da variação é a referência.

Contar visitantes distintos por loja + produto + variação + janela. Repetir o toque na mesma numeração não multiplica pessoas. Não somar pessoas de tamanhos diferentes para obter um total do produto: alguém pode ter procurado duas numerações. O total por produto usa a união dos visitantes elegíveis.

Proposta inicial para destacar um sinal recorrente: pelo menos dez visitantes distintos em uma janela concluída de sete dias. Abaixo disso, mostrar a procura absoluta sem criar urgência nem missão de reposição. O limite deve ser avaliado com lojistas e segmentos.

Copy principal: **“14 visitantes procuraram o tamanho 41 enquanto ele estava indisponível.”**

A disponibilidade atual é consultada separadamente. Se continuar indisponível, a ação pode ser “Avaliar reposição”; se já estiver disponível, mostrar “Disponível agora” e permitir revisar o atendimento ou a divulgação. Se a disponibilidade atual for desconhecida ou houver divergência pendente, a ação é conferir antes de decidir.

Sem estado de estoque confiável no instante do evento, usar “Procura registrada pelo tamanho” e marcar a indisponibilidade como não confirmada. Visitas gerais a uma peça hoje esgotada não provam procura por tamanho indisponível no passado.

Não estimar vendas perdidas, receita desperdiçada ou quantidade ideal de compra. Esses cálculos exigem pedidos, vendas, margem, prazo e evidência de conversão que o protótipo ainda não possui.

## 8. Contrato de dados antes da interface

A futura camada deve normalizar as fontes existentes, preservando dados brutos e versão de regra. Não apontar o protótipo para tabelas reais diretamente.

| Campo ou conceito | Definição |
| --- | --- |
| Loja | Identidade estabelecida pelo servidor e autorização; nunca confiar apenas no identificador enviado pelo navegador |
| Evento e fonte | Identificador único, origem e versão; repetição não altera contagem |
| Produto e variação | Chaves estáveis vinculadas ao catálogo da loja; nome, tamanho e cor são rótulos |
| Visitante | Identificador anônimo com escopo definido; contagens são aproximações por navegador, não identidade civil |
| Tempo | Instante aceito no servidor, janela com começo inclusivo e fim exclusivo e fuso de apresentação explícito |
| Disponibilidade no evento | Disponível, indisponível ou desconhecida, com referência à versão do estoque ou catálogo |
| Exposição | Card efetivamente visto segundo regra de medição documentada; não é simples carregamento de HTML |
| Abertura da peça | Visita elegível à página da peça; não equivale a impressão do card |
| WhatsApp qualificado | Visitante com clique relacionado ao produto, pertencente à população da taxa no mesmo período |
| Cobertura | Estado da instrumentação, período coletado, fontes ausentes e alterações na medição |

A taxa de contato de uma peça será pessoas com clique qualificado pertencentes ao grupo de visitantes da peça / visitantes elegíveis da peça. Cliques gerais da loja e visitas do card não entram nesse denominador. Se não for possível formar a interseção, mostrar os totais separados e não calcular a taxa.

Favoritos, sacola e WhatsApp são sinais diferentes. Guardar peças ou selecionar tamanhos não confirma conversa, pedido ou venda. Não somar ações para produzir uma falsa contagem de clientes ou um escore opaco de intenção.

Janela encerrada não garante sozinha integridade: avaliar fonte, cobertura, atraso e mudança de versão. Uma coleta interrompida deve gerar estado de dados incompletos, não diagnóstico de queda de procura.

## 9. Diagnóstico no Início

O diagnóstico será uma síntese do mesmo motor do mapa, sem texto livre de IA na 1.4. Cada achado traz entidade, fonte, datas, critério e próxima ação. A primeira área visível continua destacando um único próximo movimento.

Ordem inicial: divergência de disponibilidade em item com procura; procura elegível por variação indisponível; apresentação incompleta em produto procurado; campanha concluída para analisar; exposição a investigar com evidência suficiente. Respeitar tarefas adiadas e evitar dois destaques para o mesmo problema.

Exemplo de copy sustentada por dados: **“Há procura pelo tamanho 41, que continua indisponível. Comece conferindo a disponibilidade.”**

Exemplo a evitar: “Sua vitrine atrai pessoas, mas converte mal.” As contagens isoladas não justificam esse diagnóstico. A recomendação “melhore os três mais vistos antes de anunciar” também depende de lacunas verificadas, não apenas de visitas.

Apresentar até três achados, uma ação principal e “Ver mapa”. Se não houver oportunidade elegível, mostrar que não há um cuidado prioritário identificado nesse período e conservar o acompanhamento. Não preencher a área com tarefas artificiais.

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

Emblemas futuros reconhecem conclusão verificável, não atingir uma taxa escolhida pelo sistema. Poucos dados não bloqueiam o cuidado básico nem retiram conquistas.

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

Preparar pelo menos estes casos após a validação da 1.3: produto popular com disponibilidade conferida; produto muito visto com descrição ausente; tamanho indisponível com dez ou mais visitantes elegíveis; tamanho já reposto; disponibilidade desconhecida; repetição do mesmo visitante em vários tamanhos; pouca amostra; catálogo pequeno sem base comparativa; produto recente; fonte interrompida; clique sem visita elegível; apresentação completa sem tarefa artificial.

Adicionar fixtures ao experimento separado, mantendo todos os 23 cenários anteriores. O servidor escolhe os conjuntos; o cliente não envia métricas ou XP para preencher o mapa. Nenhuma fixture deverá exigir chamada externa.

## 15. Backlog e critérios de aceite

| Ordem | Trabalho | Pronto quando |
| --- | --- | --- |
| 0 | Rodada de validação da 1.3 | Achados registrados, confusões críticas tratadas e tarefas afetadas revistas |
| A1 | Contrato e normalização das fontes | Unidade, população, janela, identidade de variação, cobertura e origem documentadas |
| A2 | Fixtures e regras do mapa | Casos normais, limites, empate, poucos dados e inconsistências têm resultados explícitos |
| A3 | Mapa e painel do produto | Produto, variação, evidência e ação são compreensíveis em celular e desktop |
| A4 | Vincular cuidados existentes | Não há nova recompensa pela abertura, classificação, coleta ou leitura |
| B1 | Síntese determinística no Início | Mesmos achados do mapa, até três oportunidades e uma ação principal |
| B2 | Validação da 1.4 simulada | Lojistas distinguem interesse, disponibilidade histórica e atual e próximo passo |
| Futuro | Piloto com coleta real | Contrato autorizado, qualidade e cobertura verificadas antes de inferências |

Testes essenciais da futura implementação: isolamento por loja; deduplicação; janelas concluídas; fonte adulterada; variação de outra loja; disponibilidade desconhecida; identidade repetida entre tamanhos; contato fora do denominador; empates; falta de referência própria; notas sem efeito no estoque; reaproveitamento de missão; preservação dos grupos e do XP; teclado e movimento reduzido; persistência e duas abas.

Os testes serão implementados junto com as regras e a interface da 1.4. Não adicionar testes que apenas verifiquem a existência deste documento.

## 16. Métricas de sucesso a acompanhar

Na pesquisa: conclusão sem ajuda, interpretação correta e utilidade percebida do próximo passo. Em um piloto futuro: proporção de oportunidades consideradas relevantes, ações úteis concluídas e decisões revisadas com dados posteriores, sempre com definição e denominador.

Quantidade de missões, tempo de sessão, cliques no assistente e XP acumulado são medidas de uso ou progresso, não evidência de crescimento comercial. Vendas e margem só serão indicadores do produto quando houver fontes confiáveis e comparação adequada.

## 17. Preparação da 1.5

A IA real receberá o contexto estruturado do motor da 1.4 e responderá com evidência e lacunas explícitas. Um modelo não escolherá uma classificação comercial sozinho nem alterará estoque, catálogo, pedidos ou XP.

Perguntas como “Tenho R$ 2.000; devo repor ou anunciar?” exigem custos, margem, disponibilidade, objetivo e orçamento conhecido. Sem isso, a resposta deve pedir informações e apresentar raciocínio condicional. Não produzir retorno previsto nem uma quantidade ideal de compra inventada.

Estilos Direto, Elegante, Comercial e Técnico serão opções de rascunho com fatos preservados. A escolha de um modelo dependerá de avaliação sintética, fidelidade, latência e custos medidos, conforme `PREPARACAO-1.5.md`.

## 18. Limite desta preparação

Entregues agora: direção atualizada, escopo da 1.4, regras propostas, leitura da base local, roteiro de validação e ficha de pesquisa. A 1.3 continua disponível para executar as sessões. Aplicativo, coleta real, preços, assinatura e bancos permanecem na situação anterior; esta rodada alterou apenas documentação do experimento.