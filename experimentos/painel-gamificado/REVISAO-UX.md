# Revisão da experiência com o lojista

## Entrega 2 e distinção de reconhecimento

No cenário Intelligence, pedir ao participante para explicar a diferença entre registrar uma análise de esgotado e repor estoque. Observar se o recibo e o histórico tornam essa diferença clara, mantendo o reconhecimento do XP. No ciclo, conferir se entende “uma ação ou decisão em X das oportunidades encontradas”.

Abrir a ajuda a partir do Início e de uma missão. Pedir que explique uma oportunidade, compare opções e faça uma pergunta curta. Depois, na missão de descrição, informar somente características conhecidas, gerar texto, levá-lo ao formulário, desfazer e revisar antes de salvar. Observar se percebe que a sugestão não foi salva nem recebeu XP.

Repetir falha e resposta inválida, e fechar durante a espera. Verificar compreensão das ausências de dados, simulação e alternativas de mesma categoria. Esta sessão humana ainda não foi realizada; os testes técnicos não registram aprovação comercial.

## Primeira entrega da 1.3

Revisar o cenário **1.3 · Loja organizada, novas oportunidades** em `http://localhost:3405/?cenario=continua#inicio`. Verificar se o lojista identifica a ação principal, entende a evidência e diferencia registrar uma decisão de alterar estoque ou confirmar vendas.

Em esgotado, manter indisponível deve parecer uma decisão legítima. Em buscas, observar se o termo e o próximo passo estão claros. Na campanha, verificar se contagens ajudam sem sugerir causalidade ou sucesso. Em apresentação, confirmar que o usuário percebe a informação ausente. Na segunda divergência, conferir entendimento sobre outra ocorrência, mantendo o histórico anterior.

Revisar também **Sua semana**, insuficiência, acompanhamento e loja em dia: o usuário entende que as prioridades são opcionais, que o experimento não coleta dados e que não existe perda de XP? As Entregas 2 e 3 aguardam esta revisão; nenhuma aprovação humana foi registrada.

Estado: validação técnica implementada; sessão de uso com Rafael e lojistas ainda não realizada. Não registrar aprovação, conversão ou satisfação como resultado dos testes automatizados.

Abrir `http://localhost:3405`. Todos os cenários usam dados fictícios. A revisão pode durar cerca de 10–15 minutos, sem obrigar o participante a terminar tudo.

| Cenário | Tarefa | O que observar |
| --- | --- | --- |
| Loja nova | Encontrar a peça sem foto, escolher uma imagem e salvar | Entende o motivo, encontra o CTA e identifica que os 60 XP vieram da melhoria salva? |
| Loja nova | Conferir estoque com zero unidades | Entende que zero é válido e reconhece a confirmação? |
| Novas missões | Abrir Missões e resolver a divergência, informar detalhes e adicionar foto de acabamento | As necessidades parecem úteis? Sabe o que foi registrado? |
| Marco 5 / 10 | Salvar a foto, dispensar a animação e rever a conquista | Sente reconhecimento sem perder controle? Entende que os números vêm do histórico? |
| Impacto | Explicar a diferença entre antes/depois, pouca amostra e espera | Distingue clique de venda e descrição de causalidade? |
| Loja em dia | Procurar o próximo passo | Entende que não há trabalho artificial para gerar XP? |
| Missões | Filtrar por categoria e situação, adiar e retomar uma tarefa | Encontra o objetivo certo? Entende que retomar abre a peça e que adiar não reduz o XP? |
| Missões concluídas | Abrir a confirmação de uma melhoria salva | Reconhece a peça, a evidência e a recompensa? Distingue a confirmação da trajetória em Evolução? |
| Performance 1.1 | Expandir um grupo, concluir um cuidado, adiar outro e explicar o progresso | Entende o total fixo, a recompensa individual e a diferença entre Organizar, Cuidar e Evoluir? |
| Grupo finalizado | Concluir os cuidados de Evoluir e encontrar o marco na trajetória | Reconhece 4/4 e que os 340 XP vieram das ações, sem bônus adicional? |
| Performance 1.2 | Encontrar o próximo cuidado no Início e abrir a peça sem rolar o desktop | Entende imediatamente a peça e a ação? O destaque visual ajuda sem confundir a ilustração com uma foto salva? |
| Coleção de marcos | Identificar nível atual, alcançados e próximos, e rever um marco 5/10 | Distingue registro de conquista de uma notificação? Consegue acessar os próximos marcos no celular? |
| Duas abas | Salvar em uma aba e voltar à outra | Vê o mesmo progresso, sem duplicidade ou perda? |

Perguntas ao final: “O que o nível representa?”, “Qual melhoria faria primeiro?”, “O que ficou confuso?”, “A conquista ajudou ou atrapalhou?”. Registrar a resposta original e o cenário; não sugerir que a animação deveria agradar.

Priorizar os ajustes por: impedir a tarefa → causar entendimento incorreto → exigir esforço desnecessário → acabamento visual. Uma animação agradável não compensa uma missão irrelevante.

## Evidências técnicas

`npm test` cobre matemática, recompensas únicas, marcos, novas missões, comparabilidade de períodos, autenticação da fronteira real, rollback e conexões concorrentes. Os cinco testes de navegador cobrem o fluxo completo, teclado, Escape, movimento reduzido, telas estreitas, API, cache adulterado, isolamento de sessões e atualização entre abas.

Os registros e capturas ficam em `.tmp/painel-gamificado/`, fora dos arquivos de publicação. Este checklist prepara a revisão humana; não a substitui.

## Entrega 3 — acompanhamento comercial

A pesquisa humana continua pendente. O roteiro completo está em [Validação com lojistas](./documentacao/VALIDACAO-COM-LOJISTAS.md). Observar especialmente se nota de encaminhamento é confundida com reposição, se não agir parece escolha válida e se comparação de cliques é confundida com venda ou causa.

A verificação técnica acrescenta `tests/browser-followup.cjs`: justificativa recolhida, falha e nova tentativa, ciclo histórico, fonte posterior sem XP, nova ocorrência, pouca amostra, fontes incompatíveis, persistência, teclado e telas de 320–1440 px. Não atribuir resultados de pesquisa a esses testes.

## Rodada anterior à 1.4 — plano escolhido em 13/10/2026

Usar [Ficha do piloto](./documentacao/FICHA-PILOTO-1.3.md) para registrar quatro tarefas centrais e tarefas opcionais, com tempos, ajuda, utilidade e interpretação. Não apresentar mapa ou diagnóstico novos como já implementados. A pesquisa ainda não foi realizada. A direção está em [Plano da 1.4](./documentacao/PLANO-1.4-INTELIGENCIA-COMERCIAL.md); conexão com IA real passa para a 1.5.

## Ajustes ao plano 1.4 — revisão 2

A [revisão atual](./documentacao/PLANO-1.4-REVISAO-2.md) especifica a diferença entre toque exploratório e interesse explícito, níveis 1/2 úteis mesmo com poucas visitas, destinos disponíveis e revalidados e reconhecimento comercial posterior sem XP. A [ficha](./documentacao/FICHA-PILOTO-1.3.md) agora mede descoberta em menos de um minuto e decisão antes/depois. Os novos casos serão avaliados depois que a 1.4 for simulada; a 1.3 não possui esses recursos. Pesquisa ainda não executada.

## 1.4 A/B implementada — pesquisa pendente

`tests/browser-commercial.cjs` verificou os destinos do mapa, diagnóstico, declaração anônima, consulta sem declaração, retry, deduplicação, disponibilidade alterada, persistência, comparação e telas de 320–1440 px. A implementação mantém os nove modelos de missão e as recompensas originais; o teste da foto mostrou 60 XP uma única vez. O bloqueio de rolagem de diálogos sobrepostos é compartilhado.

A ficha inclui a segunda rodada com os cenários novos. Medir oportunidade relevante em menos de um minuto e qual decisão mudaria; ainda não há respostas coletadas. Marcos novos permanecem posteriores à primeira validação da 1.4.
