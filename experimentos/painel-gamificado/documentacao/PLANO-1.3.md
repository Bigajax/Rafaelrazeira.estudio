# Performance 1.3 — plano técnico

13/10/2026. Escopo autorizado: implementar somente a Entrega 1 e aguardar revisão.

## Base inspecionada e reaproveitamento

A aplicação Next/React separada possui seis modelos no motor, grupos com objetivos congelados, progressão por histórico, confirmação acessível, marcos, comparação descritiva de períodos e SQLite local. O salvamento usa transação, identidade única por missão e impressão digital por operação. O navegador não define XP, datas ou evidência. A suíte existente tem 31 testes de domínio/servidor e cinco fluxos de navegador.

Reutilizar motor, seis modelos, grupos, adiamento, diálogo, recibo, histórico, níveis, emblemas e animações. Não reconstruir telas, nem conectar o painel principal. Manter os nove cenários anteriores e documentos históricos.

## Arquitetura da primeira entrega

1. Acrescentar `domain/opportunities.mjs`: regras determinísticas configuráveis, validação de período concluído, amostra e origem por loja; identidade de ocorrência e evidência. Fontes são eventos fictícios previamente registrados no servidor.
2. Integrar ao motor três modelos de decisão: procura indisponível (80 XP), buscas sem resultado (60 XP) e campanha concluída (80 XP). Exigir decisão permitida e justificativa/próximo passo de 20 a 600 caracteres. Ler um relatório não concede XP. A ação não altera estoque ou confirma vendas.
3. Apresentação reaproveita foto, detalhe, descrição ou composição, com os mesmos IDs e XP. Divergência reaproveita revisão de estoque de 80 XP, associada a evento identificável. Não existe prêmio adicional por reconhecer uma oportunidade.
4. Recorrência exige nova fonte, contexto verificável e janela concluída posterior à anterior. Bloquear repetição de evento, mesma janela com ID renomeado e sobreposição com uma ocorrência já reconhecida. Campos de apresentação continuam pontuais. Uma nova divergência precisa de evento novo e identificação posterior à revisão anterior.
5. Amostras iniciais de demonstração: 50 visitantes distintos da peça em 14 dias; 10 buscas distintas sem resultado em 7 dias; 50 visitantes de campanha rastreada em 7 dias. Estes limites organizam sugestões e precisam de validação comercial. Não classificam baixa conversão e não são significância estatística.
6. Expandir grupos e formulário para entidades de busca e campanha, preservando o denominador dos conjuntos existentes. Decisões e recompensas persistem na mesma transação.
7. Criar projeção “Sua semana”: sete dias móveis, oportunidades identificadas, melhorias salvas, revisões e registros aguardando dados; até três prioridades, com uma única ação principal. Sem bônus semanal, reset ou penalização.
8. Registrar referência disponível e início da observação ao salvar uma oportunidade. Nenhum dado posterior é produzido pelo salvamento. Reaproveitar a leitura já existente; aprofundamento de comparações e histórico comercial pertence à Entrega 3.
9. Adicionar cenários independentes de oportunidades, esgotado, buscas, campanha, apresentação, divergência recorrente, acompanhamento, loja em dia e dados insuficientes.

## Validação e fronteiras

Testar criação, insuficiência, loja em dia, decisões verificadas, recorrência legítima e indevida, duplicidade, rollback, concorrência, isolamento, adiamento e retomada. Executar fluxos no Chrome, recarga, falha com preenchimento preservado, responsividade, teclado e movimento reduzido. Preservar os testes anteriores e registrar limitações.

Não implementar assistente nesta entrega. A Entrega 2 interpretará somente oportunidades aprovadas pelo motor, sem autoridade sobre XP ou comandos administrativos. A Entrega 3 aprofundará acompanhamento posterior. Ambas aguardam revisão de Rafael. Sem chamadas pagas, preços, CPF/CNPJ ou dados reais.
