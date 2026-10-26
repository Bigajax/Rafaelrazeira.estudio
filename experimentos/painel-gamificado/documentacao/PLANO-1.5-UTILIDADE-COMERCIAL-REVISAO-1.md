# Plano Performance 1.5 — utilidade comercial

**Estúdio Rafael Razeira · 13/10/2026 · Planejamento a partir da análise do documento consolidado**

A próxima evolução deve transformar a experiência construída em orientação útil para a operação da loja. As quatro perguntas centrais são: o que aconteceu, o que merece atenção, o que posso fazer agora e o que aconteceu depois.

Este plano incorpora as sete melhorias propostas por Rafael, confrontadas com o código e a documentação atuais. O aplicativo ativo continua sendo o experimento 1.4 A/B, com dados fictícios e emblemas até 100. O documento não registra entrevistas realizadas, conexão de bancos de clientes, ativação de IA paga ou publicação.

## 1. A prioridade muda para utilidade

A 1.5 terá como eixo validação com lojistas, qualidade dos dados e decisões acompanhadas. IA generativa entra como ferramenta de interpretação após esses fundamentos. O desenho dos emblemas e os nove modelos de missão constituem uma base suficiente para esta etapa.

Abrir o painel diariamente não será uma missão nem uma medida isolada de sucesso. O valor deve aparecer quando houver algo útil para conferir ou uma evidência nova para consultar. Uma loja em dia precisa poder reconhecer isso e sair sem pendências artificiais.

| Produto | Papel a validar |
| --- | --- |
| Vitrine Digital | Apresentar produtos, organizar escolhas e facilitar contato pelo WhatsApp |
| Performance | Interpretar sinais, sugerir o próximo cuidado e acompanhar decisões |
| Intelligence | Explicar uma evidência e ajudar a preparar uma ação revisável |
| AI Studio | Produzir ou ajustar conteúdo visual com referência e aprovação |

A recorrência comercial do Performance dependerá de utilidade demonstrada, qualidade de orientação e acompanhamento. Quantidade de níveis ou presença de IA não comprovam disposição para assinar. Preços e ofertas publicadas não são alterados por este plano.

## 2. As sete melhorias: o que existe e o que falta

| Proposta | Base já existente | Próxima entrega necessária |
| --- | --- | --- |
| Assistente de prioridades | Diagnóstico determinístico e uma recomendação principal | Adaptar à cobertura real, explicar desempates e revalidar o destino |
| Missões por atividade | Ocorrências, eventos, janelas e recompensa única | Adaptador de fontes reais e recorrência persistida por loja |
| Acompanhamento posterior | Declarações e comparação de períodos compatíveis | Receber evidências reais e simplificar os estados do ciclo |
| Integração com AI Studio | Código de imagens, projetos, edição e custos no CRM | Autorização loja/operador, vínculo com a peça e retorno revisável |
| Experiência adaptativa | Três profundidades de leitura no mapa | Aplicar a cobertura de dados ao Início e à orientação |
| Retrospectiva mensal | Histórico e reconhecimento distinguem decisão de melhoria | Síntese mensal com indicadores separados e fontes explícitas |
| Intelligence real | Contexto, interface, provedor simulado e limites | Contrato generativo, avaliação, custo e piloto de leitura |

Os primeiros três pontos precisam de integração e refinamento, não de outro motor paralelo. A validação deve ocorrer com a versão atual antes de ampliar significativamente o conjunto de funcionalidades.

## 3. Sequência de entrega e critérios de avanço

| Etapa | Entrega | Critério para avançar |
| --- | --- | --- |
| A — validar | Cinco sessões, registro de entendimento e utilidade | Corrigir confusões críticas e demonstrar ação compreensível |
| B — leitura real | Uma loja piloto, adaptador autorizado e fontes reconciliadas | Dados rastreáveis, isolamento comprovado e recomendações revisáveis |
| C — ações confirmadas | Cuidados reais, transação ou outbox e acompanhamento | Operação/recompensa única, rollback e destinos corretos |
| D — ampliar orientação | Retrospectiva, adaptação e IA contextual avaliada | Fatos corretos, respostas úteis, custo e falhas controlados |
| E — conteúdo visual | Integração assistida com AI Studio | Referência real, revisão, autorização e retorno sem publicação automática |

Não há prazo fechado: a etapa B depende de escolher uma loja, identificar seu banco e conferir a coleta existente. A etapa D pode preparar avaliação sintética em paralelo, mas não depende de ativar uma API paga para validar a proposta.

## 4. Validação antes da integração

Usar a [ficha atual de validação](FICHA-PILOTO-1.5.md) com cinco lojistas, em sessões individuais de 25–35 minutos. Executar a 1.4 simulada no dispositivo habitual quando possível, sem solicitar credenciais ou dados pessoais de clientes.

Observar se o participante entende a evidência, identifica uma ação e explica o que ainda falta saber. Registrar a decisão anterior, a decisão depois da informação e o motivo. Separar descoberta nova, confirmação útil e informação que não muda o trabalho.

Critérios preliminares: quatro dos cinco explicam uma oportunidade e um próximo passo em menos de um minuto, sem ajuda; quatro concluem a ação central sem ajuda; nenhuma confusão persistente entre decisão e reposição, consulta e declaração, clique e venda ou diferença temporal e causa. Os números são critérios de projeto, não validação estatística.

Convidar e agendar participantes é uma etapa de organização do piloto. A ficha permanece em branco até a pesquisa. Depois da rodada, registrar evidências e decisões; corrigir e repetir as tarefas afetadas antes de ligar uma loja real.

## 5. Fontes reais: inventário e lacunas

O repositório principal contém código e SQL de coleta central. A inspeção desta tarefa foi local e de leitura: não conferiu migrações aplicadas, dados disponíveis em produção ou credenciais. A existência de um arquivo não comprova que a fonte está implantada ou completa.

| Fonte inspecionada | Uso potencial | Verificação ainda necessária |
| --- | --- | --- |
| `supabase/performance.sql` | Visitas, peça aberta, WhatsApp, buscas e esgotados | Implantação, identidade, janelas, fuso e critério de visitante |
| `supabase/performance-interesse.sql` | Exposição, favoritos, sacola e WhatsApp da sacola | Cobertura, versão e semântica de cada evento |
| `lib/performance/dados.ts` | Lojas e resumos no CRM | Vínculo com usuário autorizado do painel da loja |
| `lib/performance/relatorio.ts` | Leitura mensal e dados de interesse | Granularidade suficiente e mês encerrado/parcial |
| Banco de catálogo de cada vitrine | Produto, variação, publicação e disponibilidade | Identificação de tabelas, IDs estáveis e gravação autorizada |
| Histórico de missões do experimento | Modelo de objetivo, recompensa e grupos | Novo armazenamento por loja; não copiar XP fictício |
| Código do AI Studio no CRM | Projetos, referências, imagens e custos | Disponibilidade do serviço e permissão por loja/produto |

O dono do CRM não é automaticamente o usuário do painel do lojista. A chave de rastreamento da vitrine e o token do relatório têm finalidades próprias; não são credenciais para editar produtos ou conceder XP.

Favorito, sacola e consulta a um esgotado não são declaração explícita de interesse por tamanho. O SQL de interesse inspecionado não contém a ação equivalente à segunda confirmação da demonstração 1.4. Essa coleta precisa de contrato próprio antes de mostrar “pessoas declararam interesse”.

Contagens de pessoas que favoritaram durante um período não equivalem necessariamente à quantidade de favoritos ativos agora. Sacola sem clique posterior também não demonstra abandono de compra. Eventos anônimos de navegador não identificam uma pessoa em todos os dispositivos.

## 6. Contrato mínimo de dados

O adaptador deve traduzir fontes verificadas para o motor, sem inventar valores ausentes. Catálogo e eventos precisam de correspondência estável, independente de nomes e URLs que podem mudar.

| Campo | Regra de uso |
| --- | --- |
| Loja | Identidade autorizada, resolvida no servidor |
| Produto/variação | IDs estáveis e mapa de slugs antigos quando necessário |
| Fonte e evento | Origem verificável, identificador estável e versão |
| Tempo | Data do servidor, início/fim da janela e fuso da loja |
| População | Visitante da loja, da peça ou exposto ao card, explicitamente distinto |
| Métrica | Evento bruto ou pessoa distinta, sem misturar ambos |
| Qualidade | Cobertura, atraso, deduplicação e lacunas conhecidas |
| Disponibilidade | Estado atual, versão e histórico quando realmente coletado |

Começar pelo mínimo que sustenta as ações existentes. Caso só existam agregados mensais, mostrar fatos mensais; não reconstruir visitantes, janelas de 14 dias ou trajetórias individuais a partir deles.

Cada importação deve registrar fonte, instante, versão e período. Comparar amostras do adaptador com consultas de origem. Leitura incompleta aparece como indisponível ou parcial; zero só aparece quando a coleta válida realmente observou zero.

## 7. Prioridade comercial com justificativa

Manter uma recomendação principal. Antes de comparar relevância, descartar evidências inválidas e destinos sem ação disponível. O que restar usa critérios explícitos e revisáveis, evitando um número opaco de “impacto” sem calibração.

Ordem inicial proposta: necessidade operacional verificável com interesse explícito em variação indisponível; apresentação ausente com procura qualificada; cuidados estruturais de catálogo/disponibilidade; análise de campanhas e buscas encerradas; leitura informativa sem ação obrigatória. A ordem final deve ser testada com os lojistas.

Usar recência e consistência da fonte no desempate. Uma evidência vencida não deve continuar no topo indefinidamente. Registrar por que uma recomendação foi mostrada, guardada ou descartada, sem premiar a navegação.

Exemplo de copy, condicionado à fonte real: **“12 pessoas declararam interesse no tamanho 41 desta peça nos últimos sete dias. Confira a disponibilidade antes de avaliar reposição.”** O CTA abre a mesma peça e revalida o estado. Se já estiver disponível, a orientação muda.

Oito dezenas de visitas e poucos cliques podem ser apresentados como fatos. Isso não basta, sozinho, para diagnosticar “baixa conversão”. Campanha com poucos contatos também exige referência, população e contexto antes de receber julgamento.

## 8. Ocorrências e missões ao longo do tempo

Reaproveitar os nove modelos e as regras de recorrência. Uma ocorrência identifica loja, entidade, necessidade, versão da regra, fonte e janela. Novos dados podem gerar uma oportunidade; a mesma necessidade resolvida não volta como outra recompensa apenas porque recebeu mais visitas.

Fotos e informações estruturais continuam pontuais. Uma divergência posterior genuína pode criar revisão própria. Nova campanha concluída ou nova janela elegível pode gerar análise quando não reutiliza a fonte anterior. A composição dos grupos anteriores permanece fixa.

As fontes reais não podem ser enviadas pelo navegador como autoridade. Processar eventos no servidor, persistir deduplicação e registrar a operação. Em leitura piloto, a recomendação não cria XP. Quando habilitada a execução real, salvar a alteração confirmada junto da recompensa.

Se catálogo e progresso estiverem no mesmo banco, usar transação autorizada. Se estiverem separados, registrar evento de alteração confirmada em outbox e consumir idempotentemente. Duas requisições HTTP não constituem uma transação única. Mensagens atrasadas, repetidas ou de outra loja precisam de casos de teste.

## 9. O ciclo depois da ação

A apresentação terá três leituras: **cuidado registrado**, **aguardando dados compatíveis** e **o que observamos depois**. Manter justificativas de ausência disponíveis sob demanda. A data estimada de uma janela não promete que haverá amostra suficiente naquele dia.

Exemplo condicionado à coleta: uma informação da peça é salva; depois, duas janelas de pelo menos 14 dias e 100 visitantes cada passam pelos critérios. A leitura informa **“Pessoas com clique no WhatsApp: 4% antes e 7% depois”**, acompanhada de datas e denominadores.

Preferir **“A proporção de visitantes com clique aumentou neste período”** a “Os contatos aumentaram” quando o que cresceu foi a taxa. As contagens podem ter diminuído apesar da taxa maior. A ressalva informa que outros fatores podem explicar a diferença.

As janelas devem ter entidade, população, métrica e versão compatíveis, fontes distintas, duração equivalente e posição anterior/posterior correta. Cliques não são mensagens confirmadas; comparação temporal não demonstra causa. Dados ausentes ou incompatíveis continuam sem percentual comparativo.

## 10. Experiência adaptativa

Adaptar a orientação à disponibilidade e qualidade de dados, não ao nível de XP ou ao plano contratado. Uma loja pode ter boa coleta em uma peça e insuficiente em outra; a experiência não deve impor uma classificação única que esconda isso.

| Contexto | Foco do Início | Orientação |
| --- | --- | --- |
| Organização inicial | Foto, informação e disponibilidade | Um próximo cuidado sem exigir métricas |
| Atividade observada | Fatos e sinais explícitos | Evidência, situação atual e ação possível |
| Base comparável | Leituras da própria loja | Diferença, referência, denominadores e próximo passo |
| Fonte indisponível ou atrasada | Cuidado estrutural ainda elegível | Estado de coleta claro, sem zero inventado |

Usar as mesmas três áreas e aprofundamento sob demanda. Não criar outra navegação para “loja avançada”. Uma fonte que falhou não faz a loja perder XP nem volta o lojista à categoria de iniciante.

## 11. Retrospectiva mensal sem misturar trabalho e resultado

Criar uma síntese mensal dentro de Evolução. Começar pelo trabalho confirmado, depois encaminhamentos declarados e, por último, indicadores que possuam fontes comparáveis.

Corrigir a contagem do exemplo proposto: três fotos e duas descrições são **cinco melhorias**; três análises são **três decisões**. O conjunto representa oito registros de trabalho, não oito melhorias. A interface atual já distingue esses tipos e deve preservar isso.

| Bloco | Conteúdo |
| --- | --- |
| Trabalho confirmado | Quantidades por tipo, peças e evidências |
| Decisões registradas | Análises e justificativas, separadas das melhorias |
| Próximos passos | Declarações e observações aguardando evidência |
| Indicadores | Contagens/taxas qualificadas, período e limites |
| Próximo cuidado | Uma recomendação elegível ou loja em dia |

Usar fuso da loja e marcar mês atual como parcial. Não comparar um mês parcial ao mês anterior completo como se fossem equivalentes. Retrospectiva, leitura de mês e abertura do relatório não geram bônus.

## 12. Intelligence real como camada de explicação

O motor e o adaptador calculam fatos e elegibilidade. A IA explica um contexto mínimo autorizado, com fontes, datas e lacunas. Ela não decide a pontuação, produz indicadores a partir de texto livre nem escreve na operação.

Perguntas iniciais: “Quais peças merecem atenção?”, “O que foi buscado e não encontrado?” e “Qual foi a principal mudança registrada neste mês?”. Respostas devem apontar a evidência e um destino disponível. Quando falta coleta, responder o que falta e oferecer um cuidado útil possível.

A [preparação técnica da IA](PREPARACAO-1.5.md) continua válida: contrato generativo próprio, avaliação sintética repetida, revisão humana dos casos críticos, medição de custo/latência e limites por loja. O validador canônico da simulação não deve ser tratado como autorização automática para texto generativo.

Primeiro habilitar leitura e interpretação em piloto. Depois permitir rascunhos com revisão e salvamento explícito. Selecionar modelo e teto de custo após avaliação; nenhum provedor é ativado neste planejamento.

## 13. Integração futura com AI Studio

O código inspecionado contém projetos, imagens, referências, edição, versões, custos e uma rota de geração. Ele usa autenticação do CRM e integração prevista com provedor externo. Não foi verificada a disponibilidade operacional desse serviço nem sua permissão para um lojista.

O caminho proposto é: missão/peça → autorização de recurso → referência original → ajuste solicitado → resultado como rascunho → comparação original/resultado → editor da peça → aprovação e salvamento.

Há uma dependência importante: **uma peça sem foto precisa de uma fotografia real antes de usar IA para apresentação fiel**. Nesse caso, oferecer “Adicionar foto” primeiro. Não fabricar uma imagem de um produto inexistente para cumprir uma missão.

Com referência disponível, começar por iluminação, enquadramento e fundo. Preservar cor, estampa, formato, textura, marca e acessórios reais. Instruções não garantem fidelidade; revisão humana e reprovação do resultado continuam necessárias.

Geração não concede XP, não troca a capa e não publica. A recompensa, quando houver uma missão já elegível, pertence ao salvamento confirmado da melhoria original. Melhorar uma foto já existente pode ser uma ação útil sem XP; não criar um novo prêmio para justificar o botão.

No retorno, conferir novamente loja, produto, versão e direito de uso da imagem. Um resultado de outra loja ou de uma missão já resolvida não pode sobrescrever a peça. Preservar histórico visual, custo e opção de manter o original. Usar vínculo persistido de retorno; parâmetros de URL não são autorização.

## 14. Piloto técnico e critérios de aceitação

Começar com uma loja autorizada e modo de leitura, sem importar histórico fictício. Conferir mapeamento de catálogo, origem dos indicadores e identidade do usuário. Registrar divergências antes de liberar ações.

| Caso | Aceitação |
| --- | --- |
| Outra loja/usuário sem vínculo | Leitura e operação recusadas |
| Fonte ausente | Ausência informada, sem taxa ou zero fabricado |
| Evento repetido | Não duplica pessoas, ocorrências ou recompensas |
| URL/nome da peça mudou | Mapeamento estável ou leitura bloqueada com motivo |
| Produto já conferido/reposto | Destino e recomendação atualizados |
| Coleta parcial | Fatos qualificados e comparação recusada |
| Janela posterior insuficiente | Estado de espera ou amostra, sem conclusão de resultado |
| Falha de salvamento | Preenchimento preservado e nenhuma recompensa falsa |
| Falha entre catálogo e progresso | Rollback ou recuperação idempotente pelo outbox |
| IA lenta/inválida | Ação manual disponível e formulário preservado |
| Conteúdo visual rejeitado | Produto original preservado, sem XP |

A implantação deve ter uma opção de desabilitar a nova orientação sem remover catálogo e atendimento. Novas tabelas e permissões precisam de teste em staging e revisão do contexto da loja. O diagnóstico e os emblemas não justificam migrar dados antes dessas verificações.

## 15. Como medir utilidade e decidir sobre recorrência

| Pergunta | Evidência a coletar |
| --- | --- |
| A orientação foi compreendida? | Explicação e próximo passo em até um minuto, com ajuda registrada |
| O CTA resolveu o contexto? | Item correto, estado atual e operação concluída |
| A informação foi útil? | Mudança ou confirmação concreta de decisão, com motivo |
| O trabalho continuou? | Encaminhamento registrado e comparação compreendida quando elegível |
| Houve confiança indevida? | Confusões de interesse/venda, decisão/estoque e diferença/causa |
| A loja voltou por um motivo? | Uso associado a necessidade ou nova evidência, sem obrigação diária |
| Existe valor para assinatura? | Conversas de valor e disposição para pagar separadas do teste de interface |

Usar denominadores elegíveis: taxas de comparação se referem a observações com fontes suficientes, não a todas as lojas; conclusão se refere a ações abertas e ainda disponíveis. Pouco tráfego e coleta incompleta não devem parecer falta de esforço.

Definir uma janela inicial proposta de quatro semanas para acompanhamento do piloto, ajustada após conhecer volume e disponibilidade de dados. Essa duração não assegura que haverá duas janelas comparáveis. Relatar casos e contagens, sem generalizar resultados de uma loja.

## 16. Resultado deste planejamento

Este plano reorganiza a 1.5 em torno de dados, decisões e acompanhamento, preserva o sistema visual existente e transforma as sete propostas em entregas com dependências. O roteiro de pesquisa foi atualizado para a interface atual.

Próximo passo concreto: executar a rodada simulada e identificar a loja candidata ao piloto de leitura, seu banco de catálogo e a disponibilidade dos eventos. As integrações dependentes dessas informações ficam especificadas para implementação posterior.

Referências locais: [documento consolidado da 1.4](PERFORMANCE-1.4-DOCUMENTO-CONSOLIDADO.md), [ficha de validação atual](FICHA-PILOTO-1.5.md), [roteiro de validação](VALIDACAO-COM-LOJISTAS.md), [contrato de integração](../integration/README.md) e [preparação da IA](PREPARACAO-1.5.md). As tabelas e rotas do projeto principal citadas no inventário foram inspecionadas em leitura nesta tarefa; implantação e funcionamento em produção não foram auditados.
