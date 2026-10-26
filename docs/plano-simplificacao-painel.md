# Plano de simplificação do painel do lojista

**Plano vigente (19/10/2026, tarde):** [A gamificação que roda](PLANO-MESTRE-MOLDE-PERFORMANCE-GAMIFICACAO-PLACAS.md). Preserva todos os acessos do painel e troca XP e níveis por faixa, sequência e placas medidas. As reduções de navegação descritas abaixo ficam como exploração anterior.

**Estúdio Rafael Razeira · 19/10/2026 · Revisão de experiência da unificação**

[Plano completo em HTML com design](plano-simplificacao-painel.html).

[Prévia de como a proposta se encaixa no painel existente do molde](previa-integracao-molde-painel.html).

Fazer o painel responder primeiro às necessidades da rotina: **quem precisa de atendimento, o que está disponível e o que foi recebido**. A gamificação acompanha esse trabalho com confirmações discretas e conquistas consultáveis.

Esta revisão substitui a organização de navegação e apresentação proposta no [plano de unificação](plano-unificacao-vitrine-performance-placas.md). Os contratos de dados, os critérios de XP e placas, a gestão de estoque e a confirmação de recebimentos continuam válidos. É planejamento; nenhuma interface de produção foi alterada.

## 1. O problema a resolver

A apresentação anterior coloca Início, Peças, Estoque, Pedidos, Missões, Desempenho e Evolução no mesmo nível. Também exibe XP, nível, recebimentos e placas juntos. Para começar a trabalhar, a lojista precisa entender conceitos que poderiam ser apresentados depois.

Essa é uma avaliação de projeto, ainda sem observação com lojistas. A hipótese a validar é que uma navegação menor, linguagem familiar e uma próxima ação clara reduzam o esforço para operar a loja.

**Direção:** manter a capacidade do produto e mostrar cada informação no momento em que ajuda a decidir.

## 2. Navegação proposta

### No computador

Cinco destinos principais:

| Destino | Pergunta que responde | Conteúdo principal |
| --- | --- | --- |
| **Início** | O que preciso fazer agora? | Pendências reais e uma melhoria sugerida, quando existir |
| **Peças** | O que está na minha vitrine? | Cadastro, fotos, informações e publicação |
| **Estoque** | O que posso vender ou separar? | Disponibilidade, contagens, entradas e separações |
| **Pedidos** | Como estão meus atendimentos e vendas? | Novos interesses, pedidos, recebimentos e entrega |
| **Resultados** | O que a loja registrou e conquistou? | Valores, origem, período e acesso a Minhas conquistas |

Usar **Mais** para Clientes, Personalizar vitrine, Configurações e Ajuda. Personalizar vitrine reúne Banners, Textos e páginas próprias habilitadas na loja. Preservar as opções de cada instalação: mover um acesso não altera sua permissão nem ativa um módulo indisponível.

### No celular

Manter o padrão existente de quatro destinos e Mais: **Início · Peças · Pedidos · Resultados · Mais**. Estoque fica no Mais e tem acesso direto pelas pendências do Início. O item ativo usa o mesmo peso visual dos demais; Resultados não precisa de um destaque que concorra com o atendimento.

Esse arranjo é uma hipótese para lojas com Gestão ativa. Nas lojas sem esse módulo, preservar o acesso direto ao WhatsApp e adaptar os destinos às capacidades habilitadas, sem apresentar Pedidos ou saldos fictícios.

**Missões e Evolução deixam de ser itens principais.** Os recursos são acessados como Melhorias sugeridas, no Início, e Minhas conquistas, dentro de Resultados.

## 3. Início: prioridade para o trabalho

Organizar a tela nesta ordem:

1. **Situação principal e próxima ação.** Exemplo: “2 pedidos aguardam entrega” → “Ver pedidos”. Se houver outras pendências, exibi-las em uma lista curta abaixo, com até três tipos e destinos específicos.
2. **Melhoria sugerida.** Uma necessidade concreta, com peça e benefício: “Adicione uma foto à Camisa Linho” → “Adicionar foto”. Mostrar depois das pendências, sem competir visualmente com elas.
3. **Acesso secundário a Resultados.** Um link ou resumo curto, sem duas barras de progresso ou coleção de emblemas na primeira área visível.

Se não houver pendência nem melhoria elegível, mostrar “Tudo em dia por aqui”, com os acessos usuais. Não inventar tarefa, meta diária ou urgência para manter a pessoa no painel.

Priorizar prazos operacionais verificáveis: separação prestes a vencer e entrega pendente antes de melhoria de apresentação. Novos interesses aparecem como interesses a conferir, sem serem chamados de mensagens recebidas. A precedência final deve ser ajustada na validação.

O nível, o XP e a próxima placa ficam fora do destaque inicial. A lojista consegue concluir o trabalho sem conhecer a fórmula de progressão.

## 4. Pedidos: perguntas simples, estados preservados

Dentro de Pedidos, manter duas entradas visíveis:

- **Novos interesses:** seleções da vitrine que precisam de conferência. Não são pedidos confirmados.
- **Meus pedidos:** atendimentos registrados, pagamento, entrega e concluídos.

### Percurso de um interesse da vitrine

1. A seleção chega com itens e referência. Mostrar “Novo interesse da vitrine” e a observação “A cliente abriu o WhatsApp; o envio da mensagem ainda não foi confirmado”.
2. A loja abre as escolhas. Ações: **Registrar atendimento**, **Registrar venda** e **Encerrar sem venda**.
3. Registrar atendimento aproveita os itens em um pedido; registrar venda permite conferir os itens e o valor negociado e prosseguir para a situação de pagamento na mesma sequência. Ambos preservam o vínculo e impedem outro pedido para a mesma referência.
4. Na venda, perguntar **“Já recebeu?”**, com escolha explícita, sem marcar recebimento por padrão. Se sim, informar quanto foi recebido dos produtos e do frete. Se não, salvar como aguardando pagamento.
5. Apresentar confirmação objetiva: “Venda registrada. Pagamento pendente” ou “Recebimento registrado. Pedido a entregar”. Entrega tem confirmação própria.

Não obrigar cadastro de cliente para registrar o interesse. Contato e endereço aparecem quando necessários à operação. Encerrar sem venda não exige justificativa; o motivo pode ser opcional.

Valores parciais, descontos, frete e reembolsos continuam disponíveis em campos contextuais ou “Mais detalhes”. A pergunta simples não pode transformar pagamento parcial em quitação nem retirar informações necessárias ao cálculo.

### Vocabulário da interface

| Conceito de implementação | Texto para a lojista |
| --- | --- |
| Solicitação anônima | Novo interesse da vitrine |
| Conversão de solicitação | Registrar atendimento ou Registrar venda |
| Conclusão de missão | Melhoria concluída |
| Motor de XP | Evolução da loja, quando a pessoa abrir os detalhes |
| Desempenho | Resultados |
| Coleção de marcos | Minhas conquistas |

A referência técnica pode ficar nos detalhes para localizar o atendimento. Não usar “venda automática”, “cliente enviou” ou “pagamento verificado” quando a fonte não comprovar essas afirmações.

## 5. Gamificação discreta e contextual

### Melhorias sugeridas

Mostrar uma sugestão no Início. “Ver outras melhorias” abre a lista na própria área, preservando disponíveis, para depois e concluídas. A lista detalhada pode ter busca e filtros quando o volume justificar; a primeira visão não exige aprender grupos, frentes e modelos.

O botão abre o editor existente da peça ou a operação de estoque. Ao salvar, apresentar primeiro a confirmação do trabalho: **“Foto salva.”** O reconhecimento aparece junto, em segundo plano: **“Melhoria concluída · +60 XP.”** Concluir pelo editor comum funciona da mesma forma.

Receber XP não abre um diálogo obrigatório. A subida de nível pode aparecer como confirmação complementar, consultável em Minhas conquistas. A fórmula, o excedente, os emblemas e a recompensa única continuam iguais. Não premiar apagar uma foto e recolocá-la.

### Minhas conquistas

Em Resultados, mostrar o acesso **Minhas conquistas**. Ao abrir:

1. Última placa conquistada e progresso para a próxima, se os recebimentos estiverem disponíveis.
2. Coleção das seis placas, com prévia e detalhe sob demanda.
3. Seção **Evolução da loja**, inicialmente recolhida, com nível, XP, emblemas e histórico dos cuidados.

As barras de XP e de recebimentos não aparecem lado a lado por padrão. Cada seção identifica seu critério. Sem placa ainda, mostrar uma primeira meta tranquila; ausência de integração ou de cobertura tem explicação própria.

Ao atingir um marco novo, usar uma apresentação breve e dispensável, após confirmar a operação. Mostrar uma vez, permitir rever na coleção, respeitar redução de movimento e evitar interromper um formulário aberto. A exportação da arte é voluntária.

## 6. Resultados com informação suficiente

A primeira visão deve começar pelos registros de vendas, com período claro, cobertura e a indicação **“Recebimentos registrados pela loja”**. Mostrar o valor elegível dos produtos e a quantidade de pedidos com recebimento conhecido, com rótulos compatíveis com pagamentos parciais.

O filtro de período não muda a coleção de placas, que é acumulada desde o início da cobertura. “Ver origem das vendas” e “Interesse na vitrine” abrem detalhes. Manter esses indicadores distinguíveis; não calcular conversão misturando cliques com vendas presenciais.

Minhas conquistas é um acesso secundário, não substitui a leitura operacional. A lojista pode consultar o resultado e sair sem abrir emblemas ou XP.

As placas continuam em **R$ 10 mil, R$ 20 mil, R$ 50 mil, R$ 100 mil, R$ 300 mil e R$ 500 mil**, com “em vendas registradas”. Somar os produtos efetivamente recebidos após descontos e reembolsos registrados, separar frete e preservar a origem manual. Venda, recebimento e entrega não concedem XP.

## 7. O que fica aparente e o que aparece sob demanda

| Momento | Mostrar primeiro | Abrir quando necessário |
| --- | --- | --- |
| Entrou no painel | Próxima ação e pendências | Outras melhorias e detalhes da orientação |
| Abriu um interesse | Peças e resultado do atendimento | Referência técnica e histórico |
| Registrou uma venda | Itens finais, valor e situação do recebimento | Frete, desconto, parciais e demais campos pertinentes |
| Salvou uma melhoria | Confirmação do salvamento | Evolução e histórico de XP |
| Consultou Resultados | Valores, período e cobertura | Origem, sinais da vitrine e conquistas |
| Abriu conquistas | Placa e próxima meta | Nível, fórmula, emblemas e demais detalhes |

“Sob demanda” significa menos informação inicial, com acesso claro. Não esconder erro de salvamento, limitação da fonte, valor desconhecido ou informação indispensável para confirmar corretamente uma operação.

## 8. Ajustes técnicos sobre o plano anterior

- Reaproveitar `/painel`, Peças, Estoque e Pedidos. Manter `/painel/desempenho` e mudar o rótulo visível para **Resultados**, evitando quebrar links existentes.
- Tratar melhorias e conquistas como visualizações internas com URL recuperável, por exemplo `/painel?visao=melhorias` e `/painel/desempenho?visao=conquistas`. Os parâmetros finais devem ser conferidos com as rotas atuais antes da implementação.
- As rotas independentes Missões/Evolução eram propostas, não um requisito de navegação publicado. Não criá-las apenas para sustentar o menu anterior. Se algum link de teste já existir, direcioná-lo à nova visualização equivalente.
- Aproveitar o Mais existente, respeitando opções e páginas extras de cada loja, foco, retorno de navegação e indicação da tela atual.
- Manter motor, autorização, eventos, transações e concessões únicas definidos no plano de unificação. A simplificação não altera fonte de verdade nem transporta a autoridade do servidor para o navegador.
- Acrescentar preferências de expansão apenas quando úteis; o padrão inicial já precisa ser compreensível. Não criar configuração obrigatória para “modo simples”.

## 9. Plano de execução

| Etapa | Entrega | Critério para concluir |
| --- | --- | --- |
| **A — Desenhar a rotina** | Wireframes de Início, Pedidos e Resultados; menu reduzido e vocabulário revisto | Cada tela tem uma ação principal e finalidade identificável |
| **B — Preparar a prévia simples** | Protótipo com cinco destinos, Mais e fluxo de um interesse até recebimento; conquistas acessíveis | Tarefas podem ser feitas sem seguir um tutorial de sete etapas |
| **C — Observar lojistas** | Cinco sessões com tarefas reais de uso e dados fictícios, registrando primeiro clique, ajuda e confusões | Confusões críticas identificadas e corrigidas; decisão documentada sobre o menu |
| **D — Implementar a experiência** | Navegação, hierarquia, textos e abertura contextual sobre a base operacional da unificação | Links, capacidades, dados e operações preservados; celular e teclado revisados |
| **E — Integrar reconhecimento e pilotar** | XP discreto, placas e Minhas conquistas com dados autorizados; piloto em uma loja | Reconhecimento correto, operação sem duplicação e entendimento observado |

As etapas técnicas do plano de unificação continuam sendo dependências: solicitações persistidas, recebimentos estruturados e motor autorizado precisam existir antes da ativação real. A prévia simples pode ser avaliada com dados fictícios enquanto essa base é preparada.

## 10. Validação de entendimento

Propor quatro tarefas sem ensinar o vocabulário de gamificação:

1. **Atender:** “Uma pessoa escolheu duas peças. Onde você encontra essas escolhas e registra o resultado?”
2. **Receber:** “A venda foi fechada, mas o pagamento ainda não chegou. Registre isso; depois registre o recebimento.”
3. **Melhorar:** “Uma peça está sem foto. Faça essa melhoria.”
4. **Consultar:** “Veja o que recebeu no período e encontre sua primeira conquista.”

Observar primeiro clique, conclusão, pedidos de ajuda, erros e explicação espontânea. Perguntar o que significa o valor mostrado e se o clique no WhatsApp já conta como venda. Verificar se a pessoa encontra as conquistas sem precisar entender XP para registrar um pedido.

Critérios preliminares: quatro de cinco participantes concluem as tarefas operacionais sem ajuda; nenhuma confusão crítica persistente entre interesse, venda, recebimento e entrega. A conquista deve ser encontrável por quatro de cinco. São critérios de projeto, sem pretensão de prova estatística.

Se Resultados ou Estoque ficarem difíceis de encontrar no celular, ajustar os atalhos ou a ordem com base na observação. Não manter uma navegação apenas porque parece mais limpa na apresentação.

## 11. Critérios de aceite da experiência

- O primeiro uso permite trabalhar sem abrir explicação de XP, níveis ou placas.
- A primeira área visível do Início prioriza uma ação operacional e não uma coleção de conquistas.
- Uma melhoria abre o editor correto e retorna ao contexto; falha preserva o preenchimento e não concede XP.
- A loja distingue interesse de pedido e recebimento de entrega, inclusive com pagamentos parciais.
- O mesmo pedido alimenta Resultados e placas, sem novo lançamento financeiro.
- Conquistas são acessíveis, celebram uma vez e não bloqueiam trabalho em andamento.
- Menu e Mais preservam as capacidades habilitadas, páginas próprias e acessos de ajuda.
- Navegação, foco e conteúdo funcionam de 320 a 1440 px; alvos principais de toque têm pelo menos 44 px, e a informação não depende só de cor.
- Os testes de dados, concorrência, valores, isolamento e recuperação do plano de unificação continuam passando.

## 12. Próxima entrega recomendada

Criar uma **prévia da rotina simplificada**, começando no Início com um novo interesse e uma foto pendente. A pessoa escolhe o trabalho, registra a venda ou melhora a peça e consulta o resultado. Minhas conquistas aparece como uma descoberta acessível dentro de Resultados.

A apresentação anterior permanece como explicação da arquitetura. A próxima prévia deve representar o uso cotidiano: uma tarefa clara por vez, com as conquistas acompanhando o trabalho.
