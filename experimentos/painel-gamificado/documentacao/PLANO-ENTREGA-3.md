# Performance 1.3 — Entrega 3

Escopo autorizado pela revisão de 13/10/2026: completar o acompanhamento no experimento independente, simplificar a inteligência simulada e preparar a validação futura. Preservar as três páginas, os nove modelos de missão, o catálogo e o histórico de XP.

## Experiência

- Assistente: evidência breve, sugestão prática e uma ação. Explicação, fontes e limitações em “Por que essa sugestão?”. Uma ressalva curta permanece visível para decisões de reposição.
- Evolução: acompanhamento dedicado dentro da página existente. Separar decisão registrada, ação informada pelo lojista, alteração efetivamente salva e comparação disponível.
- Registrar um encaminhamento exige escolha e nota; não altera estoque nem concede XP. “Não realizar agora” não equivale a resultado comercial.
- Mostrar todos os acompanhamentos, com os anteriores recolhidos após os três mais recentes. Oferecer acesso direto a partir do início.
- Importar dados fictícios concluídos somente em um cenário histórico preparado no servidor. Não adiantar o relógio, inventar dados posteriores a uma ação feita hoje ou permitir digitação livre de métricas.

## Evidência e proteção

Comparar janelas concluídas de mesma duração, ao menos 14 dias, com pelo menos 100 visitantes elegíveis por período. Exigir mesma entidade, loja, população, métrica e versão de medição quando houver proveniência. Recusar fonte reutilizada, contagens incoerentes, sobreposição e datas anteriores à ação. Valores absolutos não são vendidos como vendas; diferenças percentuais não provam causalidade.

Acompanhamentos de decisões aguardam uma ação informada. A nota é declaração do lojista, não comprovação de reposição ou alteração de catálogo. Buscas sem resultados precisam de evidência própria; não transformar buscas em visitantes de produto.

API local com sessão, origem e geração verificadas, operação idempotente, transação e catálogo de evidências controlado no servidor. Repetição, leitura de resultados e novas evidências não concedem XP. Nova missão só nasce de nova ocorrência elegível e independente.

## Validação e documentação

Testar integridade das comparações, encaminhamentos, repetição, isolamento, falsificação e ciclo histórico completo. Verificar assistente recolhido, teclado, celular, persistência e regressões dos fluxos existentes. Exportar relatório separado da Entrega 3, preservando entregas anteriores. Preparar roteiro para pesquisa com comerciantes e critérios para avaliar modelos na 1.4; não afirmar pesquisa realizada e não conectar API.

## Revisão de movimento

| Elemento | Antes | Depois |
| --- | --- | --- |
| Assistente lateral | Entrada de 200 ms; quatro blocos expandidos | Mesma entrada; detalhes nativos sem animação adicional |
| Encaminhamento | Ausente | Mesmo diálogo lateral de 200 ms; foco, Escape e movimento reduzido |
| Dados posteriores | Estado estático | Confirmação textual persistente; sem celebração ou XP |
| XP e níveis | Sequência de conquista após salvamento válido | Preservada; encaminhamento e leitura não a acionam |
