# Plano: evolução da loja

Registro do planejamento da versão 1.0. A atualização implementada está em [Performance 1.1 — Missões e progressão](./documentacao/PERFORMANCE-1.1-MISSOES-E-PROGRESSAO.md): frentes Organizar, Cuidar e Evoluir, composição em Vitrine e objetivos reunidos em conjuntos com total fixo. Essa especificação prevalece nos pontos alterados.

Referência de produto — 11/10/2026. Revisada a partir da avaliação enviada por Rafael. Desenvolvimento experimental em uma pasta separada, começando por uma experiência completa.

## 1. Direção de produto

Criar uma versão experimental do painel que responde: **“Qual é o próximo passo útil para minha loja?”**

A loja acumula experiência ao concluir melhorias verificáveis. Missões orientam o trabalho; nível e histórico reconhecem o progresso. A referência de RPG entra na descoberta e na evolução, mantendo a linguagem e a aparência profissionais do painel.

O objetivo de validação é ajudar o lojista a melhorar a vitrine com menos esforço. Tempo dentro do painel e quantidade de XP não serão medidas de sucesso do negócio.

Decisão recomendada entre os textos enviados: começar com **um nível geral, um próximo movimento no Início, uma área dedicada de Missões e três categorias** — Vitrine, Estoque e Conversão. As categorias organizam os objetivos; não têm níveis ou barras independentes no primeiro protótipo. Divulgação será acrescentada quando existirem missões dessa área, evitando uma categoria vazia.

## 2. Separação do painel atual

Pasta: `experimentos/painel-gamificado/`.

O protótipo é um aplicativo independente, iniciado por comando próprio e em porta própria. Nenhum menu, rota, importação, dependência ou estilo é acrescentado ao aplicativo atual para exibi-lo.

Estrutura da implementação experimental:

```text
experimentos/painel-gamificado/
  README.md
  PLANO.md
  app/                  telas do protótipo
  components/           elementos da versão experimental
  domain/               regras de missões, XP e prioridades
  fixtures/             lojas e situações fictícias
  adapters/             acesso aos dados simulados
  tests/                regras de progresso e isolamento
  package.json          execução independente
```

Na primeira entrega, usar somente dados fictícios. O armazenamento deve ter uma chave exclusiva do experimento e permitir reiniciar a demonstração sem alterar outros dados. Não copiar arquivos privados de clientes, credenciais, `.env` ou registros reais de pedidos.

O protótipo reutiliza a linguagem visual por componentes locais. Os botões levam a editores e listas simulados dentro dele; não levam aos formulários reais do painel.

Implementar a interface em **React e Next.js**, no aplicativo independente desta pasta. Separar componentes de interface das regras em `domain/` e dos dados fictícios em `fixtures/`. Isso permite aproveitar os componentes posteriormente, mediante revisão, sem integrar o experimento ao painel atual. A exploração HTML anterior fica preservada em `referencias/html/` e não é a versão ativa.

## 3. Primeira versão

| Parte | Entrega proposta |
| --- | --- |
| Início | Progresso compacto, próximo objetivo e acesso às demais missões; pendências urgentes têm precedência quando existirem |
| Evolução | Linha do tempo de melhorias, níveis alcançados, conquistas e leitura de impacto |
| Ação | Editor local de peça e revisão local de estoque ligados às missões |
| Missões | Área dedicada com seis modelos, filtros de situação e categoria, retomada e confirmações verificadas pelo servidor local |
| Progressão | Um nível geral, barra de XP com identidade e celebração de uma mudança real de nível |
| Desempenho | Contexto simulado dentro da oportunidade; sem nova tela analítica no primeiro protótipo |
| Cenários | Loja nova, loja com pendências, pouca informação e loja em dia |

A primeira entrega não inclui habilidades com níveis próprios, moedas, ranking, avatares, IA ou recompensas financeiras. Estoque e pedidos continuam acessíveis independentemente do nível. Ausência e tarefas adiadas não fazem perder pontos.

## 4. Telas e jornada

### Início

1. **Sua loja:** nível e barra compactos, junto ao nome da loja.
2. **Próximo passo:** uma missão prioritária, com a razão, a peça envolvida, progresso e uma ação específica.
3. **Ver todas as missões:** acesso à área dedicada; o Início mantém apenas uma ação principal.

Quando existirem pendências urgentes de atendimento, elas têm precedência operacional e não concedem XP. Os resultados comerciais continuam no Desempenho; nesta experiência, entram apenas como contexto da oportunidade. Não duplicar a página analítica no Início ou em Evolução.

Exemplo do objetivo principal:

> **Mostre a peça para ajudar na escolha**  
> O Conjunto Linho ainda está sem foto.  
> Adicione uma imagem para a cliente conhecer a peça antes de chamar a loja.  
> **0 de 1 melhoria · +60 XP**  
> **Adicionar foto**

O bloco principal explica a utilidade antes da pontuação. Cada CTA abre a peça ou variação correta. No celular, a missão principal ocupa a largura disponível; as demais ficam na área dedicada.

### Evolução

Uma linha do tempo editorial que mostra o que foi melhorado, em qual peça e quando a loja alcançou um novo nível. A evidência da operação permanece disponível; XP aparece como informação secundária. As tarefas deixadas para depois são retomadas na área de Missões. As três categorias continuam sendo etiquetas. Marcos 5 e 10 têm emblemas próprios e retrospectivas documentadas. Novos marcos podem ser avaliados depois.

### Missões

Página dedicada à execução: situações Disponíveis, Para depois e Concluídas; filtros de Vitrine, Estoque e Conversão. Os cartões mostram peça, objetivo, motivo, ação e XP após salvar. Um objetivo prioritário por peça, sem limite de três itens na lista completa.

Retomar abre diretamente o editor da peça. Após salvar, Ver missão concluída leva à confirmação com data, evidência e recompensa única. A lista de Concluídas funciona como comprovante dos objetivos realizados; níveis, marcos e trajetória permanecem em Evolução. Os filtros de situação persistem no endereço e funcionam ao atualizar ou usar Voltar.

### Executar uma missão

Fluxo: **entender a necessidade → abrir o item certo → realizar a melhoria → salvar → validar → reconhecer o progresso**.

Salvar continua sendo a ação principal. A missão é concluída quando os dados salvos satisfazem sua regra, sem exigir outro clique em “Concluir missão”.

O retorno confirma primeiro a operação: **“Foto adicionada.”**, com um carimbo de melhoria realizada e **“Missão concluída · +60 XP”**. A barra incorpora a recompensa. Quando houver mudança real de nível, o mesmo diálogo se transforma em uma apresentação centralizada com emblema, número e progresso restante. Fechar, Escape e Continuar ficam disponíveis imediatamente, sem abrir diálogos adicionais.

Falhas de salvamento preservam o preenchimento e não concedem XP. Uma tarefa apenas aberta, um botão clicado ou uma edição sem alteração não contam como conclusão.

### Fluxo central de aceitação

1. A loja nova começa no nível 1, com **0 de 100 XP**.
2. O motor identifica o Conjunto Linho sem foto e sugere Adicionar foto, valendo 60 XP.
3. O lojista escolhe uma imagem, confere e salva.
4. A foto é persistida e o XP é concedido automaticamente: **60 de 100 XP**, ainda no nível 1.
5. Repetir a operação ou apagar e recolocar a foto não concede outra recompensa pelo mesmo objetivo.
6. O nível 2 começa exatamente em 100 XP acumulados. No cenário demonstrado, conferir o estoque soma 80 XP aos 60 anteriores: **140 XP totais**, nível 2 e **40 de 150 XP** dentro do novo nível.

Esse fluxo deve passar antes de ampliar a experiência. Novas categorias e recompensas periódicas permanecem futuras; as conquistas 5 e 10 e a celebração do nível geral fazem parte da experiência atual.

## 5. Missões e regras

| Modelo | Quando sugerir | O que valida a conclusão | XP inicial |
| --- | --- | --- | ---: |
| Completar a apresentação | Peça publicada com uma informação necessária ausente | A informação indicada foi preenchida e salva; a peça continua válida e publicada | 60 |
| Conferir a disponibilidade | Variação sem primeira contagem ou disponibilidade que exige revisão | Uma contagem ou revisão explícita foi salva com motivo; quantidade zero é válida | 80 |
| Mostrar o acabamento | A loja indica que a peça precisa de uma foto de detalhe e ela está ausente | Primeira foto de detalhe salva | 40 |
| Informar detalhes da peça | Características necessárias estão ausentes na apresentação | Primeiro texto objetivo salvo, com 20–800 caracteres | 60 |
| Conferir uma divergência | Uma necessidade explícita de conferência está pendente | Quantidade e motivo salvos; evento de divergência encerrado | 80 |
| Revisar uma peça procurada | Dados suficientes indicam uma oportunidade de melhorar a apresentação | A melhoria específica sugerida foi salva; efeito comercial será acompanhado separadamente | 100 |

Os valores são hipóteses para o protótipo. Não serão apresentados como pontuação calibrada com clientes.

**Critérios de cadastro:** respeitar o que cada tipo de produto e loja realmente precisa. Categoria, foto, tamanho e descrição devem ser avaliados conforme o contexto. Preço ausente não torna automaticamente um produto incompleto: o painel atual permite valor a combinar. Informações opcionais não viram obrigações só para gerar missões.

**Estoque:** “sem contagem” não significa zero. Não premiar aumentar quantidades nem comprar mercadoria. Uma revisão pode confirmar que o item continua esgotado, com registro explícito; o sistema verifica o registro, não a existência física da mercadoria.

**Apresentação:** mudanças verificáveis incluem adicionar a foto indicada ou preencher informações objetivas que faltavam. Não conceder XP por trocar espaços ou reescrever repetidamente o mesmo texto. Sem análise editorial, não afirmar que uma descrição se tornou melhor apenas porque mudou.

**Pedidos:** manter alertas operacionais úteis, sem XP por registrar vendas, marcar pagamento ou concluir entregas. Isso evita incentivar registros artificiais e preserva a prioridade das confirmações corretas.

## 6. Como escolher os próximos passos

Ordem recomendada:

1. Pendências de atendimento que precisam de decisão — fora da lista de missões.
2. Problemas que impedem compreender ou escolher a peça.
3. Disponibilidade que precisa ser conferida, sobretudo quando houver procura observada.
4. Oportunidades de apresentação apoiadas em dados suficientes.
5. Divulgação, em uma fase posterior.

Não oferecer duas missões para a mesma peça ao mesmo tempo. No Início, mostrar o próximo cuidado. Na área dedicada, listar os objetivos elegíveis com filtros, mantendo um objetivo prioritário por peça. O XP de um objetivo definido não aumenta porque o catálogo cresceu depois de sua criação.

O usuário pode **Deixar para depois**, **Não se aplica** ou indicar que precisa de ajuda. Esses caminhos registram o motivo e não concedem XP de conclusão. Tarefas urgentes podem continuar na lista operacional, sem penalizar o nível.

No primeiro protótipo, implementar somente Deixar para depois e Retomar. Os demais motivos permanecem como evolução planejada.

Se uma peça sair da vitrine ou a situação mudar, a missão pode ser retirada com explicação. Não premiar apagar a peça para remover o problema. Se tudo estiver em dia, mostrar **“Nenhuma melhoria prioritária por aqui”** e os resultados disponíveis.

## 7. Experiência e níveis

Adotar a fórmula simples do primeiro texto:

```text
XP para sair do nível L = 100 + 50 × (L − 1)
XP total para entrar no nível L = 25 × (L − 1) × (L + 2)
```

| Nível | XP total mínimo | XP dentro do nível para avançar |
| --- | ---: | ---: |
| 1 | 0 | 100 |
| 2 | 100 | 150 |
| 3 | 250 | 200 |
| 4 | 450 | 250 |
| 5 | 700 | 300 |

Com 140 XP acumulados, a loja está no nível 2, com **40 de 150 XP** e faltam 110 XP para o nível 3. Usar essa mesma matemática nas telas, no histórico e nas regras.

Guardar XP total e calcular o nível; evitar registros independentes que possam divergir. Não zerar XP ao avançar. Ao cruzar mais de um nível em uma operação, mostrar um único retorno com o nível final.

No começo, usar **“Nível 2 · Evolução da loja”**, sem títulos como “Mestre do comércio”, que podem sugerir competência ou sucesso não medidos. Explicação disponível: **“Seu nível registra melhorias concluídas no painel.”**

## 8. Recompensa consistente

Uma missão concede XP uma vez. Sua identidade deve incluir loja, modelo, versão da regra e objetivo concreto.

No MVP, objetivos de cadastro são únicos por peça e critério; a primeira contagem é única por variação. Apagar uma informação e recolocá-la não permite receber novamente. Trocar o período ou recriar o mesmo objetivo também não concede nova recompensa.

Registrar evidência da conclusão, instante, recompensa concedida e identidade do objetivo. O comando de conclusão precisa ser idempotente. Duas abas ou uma tentativa repetida após erro de rede não podem duplicar XP.

Missões periódicas ficam para uma fase seguinte. A revisão por divergência exige um evento explícito com identidade própria, encerrado pela conferência; não nasce apenas porque passou um período. Adiar, expirar, não se aplicar ou retirar a missão não conta como conclusão.

Separar dois grupos: **organização**, para resolver pendências concretas, e **evolução**, para aproveitar novas oportunidades verificáveis. Preparar identidade de ocorrência, versão da regra e evidência no modelo; no primeiro protótipo, cada objetivo concede XP uma única vez. Uma loja em dia pode ficar sem missões, sem fabricar trabalho para manter a barra avançando.

### Ciclo explícito do motor

1. **Verificar:** procurar necessidades nos dados disponíveis.
2. **Priorizar:** ordenar pelo benefício e pela urgência.
3. **Sugerir:** apresentar um próximo movimento no Início e os objetivos elegíveis na área dedicada de Missões, sem duplicação por peça.
4. **Acompanhar:** verificar a melhoria específica após o salvamento.
5. **Recompensar:** registrar uma concessão de XP por objetivo e calcular o nível.
6. **Atualizar:** retirar a missão concluída e procurar outra necessidade relevante.

## 9. Dados e Performance

O modelo atual já oferece peças, imagens, descrição, categoria, grade, variações, contagens, movimentos e etapas de pedidos. Esses dados sustentam as missões de organização e disponibilidade.

O rastreamento também contempla exposição de cards, favoritos, sacola e cliques no WhatsApp. A disponibilidade desses dados depende da integração e da contratação; não pressupor que toda loja já os possui.

Regras de leitura:

- Exposição de card, abertura da peça, favorito, sacola e clique no WhatsApp são eventos distintos.
- Os caminhos não são obrigatórios nem formam automaticamente um funil linear.
- Clique não confirma mensagem enviada ou venda. Venda registrada pela loja é outro indicador.
- Ausência de integração ou amostra insuficiente aparece como informação indisponível, nunca como zero ou desempenho ruim.
- Para comparar taxas, numerador e denominador devem usar visitantes elegíveis, a mesma peça e o mesmo período.

No protótipo, a oportunidade analítica usará um cenário simulado identificado. Para uma futura integração, a regra deve ser calibrada com dados reais. Não adotar automaticamente “30 visualizações e menos de 5%” como diagnóstico de baixa conversão.

Uma hipótese de teste é avaliar uma janela de 14 dias com ao menos 50 visitantes distintos elegíveis; essa hipótese pode ser insuficiente e exige validação antes de uso real. Quando houver comparação, mostrar contagens e amostra dos dois períodos, com configuração de referência documentada.

Após uma melhoria, mostrar o estado de acompanhamento. O protótipo demonstra comparação de 14 dias ou mais, janelas iguais, não sobrepostas e concluídas, com ao menos 100 visitantes elegíveis por janela. Esse limite é uma hipótese de apresentação, não significância estatística. Ausência de referência, espera, períodos incompatíveis e pouca amostra têm estados próprios. A comparação é descritiva, sem atribuição causal.

## 10. Design e personalidade

Manter a identidade construída no painel: fundo creme, verde profundo, texto escuro, tipografia firme e rosa marcante nos detalhes de evolução. Aplicar o rosa em aproximadamente 10% dos acentos visuais, sem usar rosa claro como grande superfície.

Dar personalidade com números de objetivo, símbolos geométricos, emblemas discretos e a seta da marca. A barra de progresso é um único elemento legível; os dados comerciais têm aparência própria, evitando confundir XP com resultado.

Usar verbos concretos: **Adicionar foto**, **Conferir tamanho 40**, **Revisar descrição**. Evitar botões genéricos como “Começar jornada” quando a ação já puder ser indicada.

Conquista de nível recebe uma experiência própria, somente após uma mudança real confirmada. Usar um emblema geométrico com a seta da marca, número expressivo e rosa nos detalhes de reconhecimento. Uma melhoria comum recebe feedback integrado, sem apresentação especial. Não reproduzir som automaticamente.

Os estados precisam funcionar com teclado e leitor de tela. A interface não depende só de cores. No celular, a operação e o botão de salvar permanecem acessíveis, preservando as melhorias feitas em Estoque e Pedidos.

## Experiência de conquista e progressão

Direção: **Editorial RPG** — fundo creme, verde profundo, números expressivos, símbolos próprios e rosa marcante como cor de conquista. Evitar confetes, escudos medievais, brilho permanente e linguagem que atribua sucesso comercial ao nível.

| Momento | Comportamento | Tempo e acessibilidade |
| --- | --- | --- |
| Missão concluída | A operação salva vem primeiro; o objetivo passa de 0 de 1 a 1 de 1, recebe carimbo e evidencia a mudança | Entrada de 200 ms; título recebe foco, confirmação legível e fechamento disponível |
| Ganho de XP | A barra parte do progresso anterior, avança em verde e recebe rosa apenas durante a recompensa; um ponto acompanha o preenchimento | Começa após 300 ms, movimento de 600 ms; valores disponíveis por texto e `progressbar` |
| Mudança de nível | Barra completa, emblema com seta, número grande, nível anterior → final, XP conquistado e excedente preservado | Apresentação a partir de 1.200 ms, entradas de 200–280 ms, sequência termina em 1.600 ms; permanece até Continuar, Escape ou fechar, sem espera obrigatória |
| Marco importante | Níveis 5 e 10 com camadas próprias de emblema, retrospectiva baseada no histórico e acesso para rever | Mesma sequência dispensável de 1.600 ms; resultado estático com movimento reduzido; revisão disponível em Evolução |
| Consulta ao histórico | Linha do tempo com ações documentadas, peças envolvidas e níveis derivados do histórico de recompensas | Sem repetição automática das celebrações; leitura por teclado, datas e texto equivalentes |

Componentes: `XPProgress`, `MissionComplete`, `LevelUpCelebration` e `EvolutionTimeline`. Estados de apresentação: `idle → xp_received → level_up → complete`; sem mudança de nível, pular `level_up`. A preferência por movimento reduzido leva diretamente ao resultado estático, sem temporizadores de apresentação.

Persistir a melhoria e a recompensa antes de iniciar qualquer animação. A camada visual nunca concede XP nem altera a matemática. Falha, abertura de tarefa, adiamento, recompensa duplicada e carregamento de histórico não disparam conquista. Ao cruzar vários níveis em uma operação, celebrar somente o nível final. Fechar durante a sequência cancela os temporizadores, preservando a operação já salva.

Começar com a identidade de nível geral e preparar poucas camadas de emblema (1, 5 e 10); os marcos de 20 e 30 ficam para depois. Não acrescentar missões ou pontos fictícios para alcançar esses marcos na demonstração. Contagens de produtos aprimorados e revisões precisam de evidência específica antes de aparecerem em uma retrospectiva.

Comparações de impacto estão demonstradas em cenário fictício e exigem, para uma fonte real: períodos comparáveis, amostra adequada, contagens e visitantes elegíveis. O texto descreve o observado e não afirma que a missão causou aumento de contatos ou vendas. A prioridade desta revisão é a animação de nível, a barra e a transformação da missão concluída.

## 11. Papel comercial

Hipótese: organização básica, progresso geral e histórico de melhorias podem acompanhar a vitrine; análise de procura, recomendações por dados e acompanhamento posterior podem agregar valor ao Performance.

Não cobrar para subir de nível nem dar XP por contratar. Não criar uma missão bloqueada que pressione o usuário a comprar para concluir sua rotina. Uma oferta contextual deve explicar o recurso analítico disponível, respeitando dispensas e sem interromper o salvamento.

Não alterar preços, ofertas ou benefícios atuais neste experimento. Os valores citados nos textos enviados são hipóteses anteriores, não definições comerciais para esta entrega.

Apresentar a experiência como evolução da loja. A inspiração em RPG é uma referência interna de mecânicas, não a promessa comercial. Validar o ritmo de progressão observando quando as pessoas concluem melhorias úteis, sem ajustar a experiência para maximizar pontos.

## 12. Construção por etapas

**Entrega 1 — Experiência.** Aplicativo React separado, Início, missão de foto, XP e nível. Validar primeiro o fluxo de 0 a 60 XP, persistência, falha sem recompensa e duplicidade. Refinar a conquista com os quatro componentes visuais, sem acrescentar novos blocos de produto ou mudar as regras.

**Entrega 2 — Motor.** Validar os seis modelos nas categorias Vitrine, Estoque e Conversão; prioridade, conclusão verificável, estoque zero, adiamento e estado de loja em dia. Demonstrar a passagem ao nível 2 ao cruzar 100 XP, preservando o excedente, e os marcos 5 e 10. As duas primeiras entregas usam dados fictícios e estão sujeitas à revisão de Rafael.

**Entrega 3 — Integração, após aprovação das duas primeiras.** Conectar dados reais com acesso por loja, conclusão verificada no backend e registro de recompensas em transação segura. Preparar migração separadamente e revisar antes de aplicar. Não conectar nem alterar bancos ou painéis de clientes durante a experiência experimental.

A revisão atual acrescenta marcos 5 e 10, novas necessidades verificáveis, leitura de impacto simulada e backend local. Divulgação, marcos adicionais, missões periódicas e IA permanecem posteriores, condicionados à utilidade.

## 13. Como validar

No protótipo, pedir a pessoas do público-alvo que encontrem o próximo passo, realizem uma melhoria e expliquem o que o nível representa. Observar erros e tempo para completar a tarefa; não exigir uma meta de cliques para parecer eficaz.

Em eventual piloto com 5–10 lojas durante 30 dias, acompanhar:

| Indicador | Pergunta |
| --- | --- |
| Compreensão | Entendem que XP reconhece ações e não vendas? |
| Ativação | Concluem uma primeira melhoria relevante? |
| Utilidade | Os problemas sugeridos são válidos ou frequentemente descartados? |
| Gestão | As informações e a disponibilidade ficam mais bem registradas? |
| Esforço | Realizam a melhoria com menos dúvida e sem passos adicionais? |
| Resultado | Os indicadores observados mudam, com período e amostra suficientes? |

Uma comparação pequena e sem controle não prova que a gamificação aumenta vendas. Se os usuários acumulam XP, mas as tarefas não ajudam, revisar o modelo de missões.

Critérios para considerar o protótipo pronto: destinos funcionais, progresso matematicamente consistente, uma recompensa por objetivo, retorno após salvar, tratamento de falha, estado de loja em dia, navegação móvel e por teclado, e nenhum acesso ou alteração em dados do painel atual.

## 14. Experiência pronta para revisão

O protótipo separado tem **um nível geral, uma área dedicada de Missões com seis modelos úteis e uma linha do tempo de evolução**. A revisão pode seguir uma sessão completa: identificar uma foto ausente, adicionar a foto, salvar, receber 60 XP e ver a barra avançar; depois conferir o estoque, somar 80 XP e alcançar o nível 2 com 40 XP restantes.

Essa sessão demonstra a transformação da missão, a barra e a conquista com emblema da marca. Também permite testar fechamento imediato, falha sem recompensa, persistência e movimento reduzido. O próximo passo é revisar com Rafael a utilidade, clareza e personalidade da experiência. Os marcos e as comparações de impacto já podem ser revisados nos cenários fictícios. A ativação em clientes reais depende do mapeamento de autenticação e armazenamento descrito em integration/README.md.

## 15. Ampliação implementada após autorização

- Servidor local com transação para alteração, recompensa e operação, uma concessão por objetivo, cookie de sessão, proteção de origem e isolamento entre sessões. O cache do navegador não é fonte de XP.
- Seis modelos úteis nas mesmas três categorias, com um próximo movimento no Início e uma lista completa na área dedicada, mantendo uma missão por peça. Conferência por divergência usa evento explícito; campos opcionais não são obrigações universais.
- Marcos 5 e 10 com retrospectivas verificáveis e consulta posterior. Cenários de marco geram o histórico pelo próprio motor, sem bônus de pontuação.
- Impacto com períodos comparáveis, contagens, visitantes elegíveis, espera, referência ausente e pouca amostra. Todos os indicadores são fictícios.
- Histórico em grupos de oito registros e sincronização entre abas; a revisão humana fica preparada em REVISAO-UX.md.
- Fronteira de autenticação e transação por loja implementada e testada para integração posterior. O repositório do ambiente real deve mapear usuários e dados, respeitando permissões e atomicidade. Não houve conexão com clientes, migração aplicada ou publicação.

## 16. Referência visual — 12/10/2026

Separar gestão e conquista: o trabalho usa superfícies claras e controles objetivos; subir de nível usa uma apresentação escura com gema geométrica, moldura facetada, seta da marca, número em rosa e tipografia editorial. Essa mudança é visual; não atribui competência, faturamento ou sucesso comercial ao nível.

A página inicial separa XP dos dados da vitrine. Os agregados fictícios têm escopo próprio de sete dias, sem transformar as 76 pessoas de uma peça em contagem da loja inteira. Dados ausentes continuam indisponíveis. Não reproduzir percentuais de crescimento da imagem sem baseline, nem acrescentar itens de menu sem destino funcional. No celular, priorizar a missão e depois os resultados.

A sequência de conquista passa a 300 ms para o ganho, 900 ms para completar o preenchimento, 1.200 ms para apresentar o novo nível e 1.600 ms para encerrar a apresentação. Fechar e Continuar permanecem ativos; movimento reduzido pula diretamente ao resultado estático.
