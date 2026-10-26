# Integração preparada, sem ativação em clientes

## Intelligence — Entrega 2

A rota experimental adiciona uma consulta `assistant`, separada das mutações comerciais. Contexto vem da missão elegível no servidor. O provedor simulado só retorna dados; escolha e descrição são transferidas ao formulário por ação explícita. A revisão e o salvamento passam pelo comando transacional existente.

Há auditoria de metadados/custo zero, limite de 30 consultas por minuto por sessão e cache em memória de cinco minutos isolado por sessão/geração/revisão/contexto. Perguntas e características não são gravadas na auditoria. Resposta inválida, prazo de cinco segundos ou contexto modificado não concede recompensa.

O contrato de provedor está em `intelligence/service.mjs` e `simulated-provider.mjs`, com resposta validada por `validate.mjs`. Nenhum provedor real está conectado. Antes de produção, implementar autenticação/autorização por loja, eventos confiáveis, limite/cache compartilhados entre processos, medição do uso efetivo, política de retenção e avaliação de fidelidade. A heurística local de dados pessoais não substitui essa revisão.

A Entrega 1 da Performance 1.3 adiciona decisões e ocorrências somente na demonstração local. O contrato aceita `decision` e `note`; a identidade do evento, evidência, período e XP continuam definidos pelo estado autorizado do servidor. Não houve conexão desta fronteira com um banco de clientes.

Para uma fonte real, os eventos precisam de identidade estável e vínculo com a loja, contagens agregadas elegíveis e períodos concluídos. A proteção de recorrência usa o histórico transacional e exige nova fonte e janela posterior à decisão anterior. A revisão de estoque precisa de uma conferência nova com quantidades divergentes, identificada após a revisão anterior. Campos de apresentação premiados permanecem pontuais.

Persistir decisão, observação inicial, grupo e recompensa junto da alteração. Adicionar restrições únicas por origem/loja e objetivo no adaptador real; não aceitar eventos ou datas produzidos pelo navegador. O ciclo semanal apenas consulta evidências, não concede experiência. Os limites de amostra do protótipo devem ser validados antes do uso comercial.

O experimento agora usa uma API e um banco SQLite exclusivo em `.data/experiment.sqlite`. O servidor lê o estado atual, valida a missão e salva a alteração, recompensa e operação dentro de uma transação `BEGIN IMMEDIATE`. A escolha segue a [documentação de transações do SQLite](https://www.sqlite.org/lang_transaction.html). O runtime usa o módulo nativo documentado em [Node.js: SQLite](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html), disponível no Node 22.15 instalado neste workspace. Esta versão do módulo ainda é experimental.

O acesso local é uma sessão aleatória em cookie HttpOnly/SameSite, exclusiva do experimento. A API ignora o cache do navegador, não aceita XP, histórico, identidade de loja nem data de recompensa enviados pelo cliente. Repetir a operação retorna o estado salvo sem recompensar de novo. Operações concorrentes leem o estado após obter a transação. A revisão de cenário impede que uma aba antiga salve em um cenário reiniciado.

Essa sessão serve para a demonstração local. Ela não substitui o login de uma loja real. Não foram lidas credenciais, criados usuários reais, aplicadas migrações ou alterados dados de clientes.

## Fronteira implementada para produção

`authenticated-service.mjs` implementa a orquestração com autenticação obrigatória e um repositório autorizado por loja. A rota real deve fornecer:

| Contrato | Garantia exigida |
| --- | --- |
| `authenticate(request)` | Validar a sessão no servidor e retornar o usuário autenticado; não confiar em IDs do corpo da requisição |
| `withAuthorizedStoreTransaction(userId, storeId, callback)` | Conferir permissão do usuário nessa loja e travar o registro de progresso antes de ler ou escrever |
| `read()` | Montar o estado a partir das peças, variações e evidências salvas, mantendo ausências como ausências |
| `operation(id)` | Buscar a tentativa apenas nesta loja e comparar sua impressão digital |
| `saveImprovementAndAward(state, award)` | Persistir alteração e recompensa atomicamente; restrição única por loja e objetivo |
| `recordOperation(id, fingerprint)` | Registrar a tentativa na mesma transação; restrição única por loja e operação |

Os testes dessa fronteira exercitam usuário ausente, usuário de outra loja, duplicidade e rollback. O mecanismo de XP e os componentes podem ser reaproveitados; a demonstração não abre rotas no painel real.

## O que precisa ser mapeado no ambiente real

O CRM deste workspace usa Supabase com sessão validada por `auth.getUser()` e RLS por `owner_id`, em `lib/crm/supabase.ts`. As lojas de Performance têm vínculo próprio em `perf_lojas`; o dono no CRM não é automaticamente o usuário do painel da vitrine. O adaptador deve resolver explicitamente essa associação, sem usar a chave de rastreamento como login.

É necessário identificar o banco onde cada vitrine salva suas peças, variações, contagens e pedidos. A transação de recompensa deve viver junto da alteração confirmada. Se os dados comerciais e a pontuação estiverem em bancos diferentes, implementar um outbox de alterações confirmadas com consumo idempotente, em vez de afirmar que duas chamadas HTTP são uma transação.

Antes da ativação: mapear as tabelas de cada loja, implementar o repositório autorizado, revisar RLS e restrições únicas, executar os testes contra um banco de staging e validar a experiência com o lojista. Nenhum desses passos exige publicar este experimento no painel atual.

## Leitura de impacto

Comparar visitantes distintos elegíveis da mesma peça em duas janelas concluídas de 14 dias ou mais, com duração igual, sem sobreposição, posicionadas antes e depois da melhoria. A leitura inicial do protótipo exige ao menos 100 visitantes em cada janela. Isso é um limite de apresentação a validar, não um teste de significância estatística.

Antes de ligar uma fonte real, agregar visitantes e pessoas que clicaram com o mesmo critério de elegibilidade. Não misturar exposição de card com visita à peça nem eventos totais com pessoas distintas. Favoritos e sacola podem ter análises próprias, com seus denominadores. Clique no WhatsApp não confirma mensagem ou venda. O texto descreve o observado e não atribui causalidade.

As observações do cenário Impacto são fictícias e vinculadas a melhorias existentes no histórico. Os outros cenários mostram ausência de referência ou espera; não simulam coleta real nem resultados novos automaticamente.

## Grupos da versão 1.1

O estado inclui `journeys`, com identidade e lista fixa de objetivos. O repositório real deve persistir essa composição na mesma transação do progresso. Novas necessidades criam conjuntos próprios; objetivos retirados permanecem como indisponíveis, sem XP ou conclusão artificial. O navegador não pode definir esses campos.

A finalização visual do grupo é derivada das recompensas individuais existentes e não cria uma nova recompensa. Contexto de procura válido muda a explicação e a prioridade; o modelo de composição continua sendo uma melhoria de Vitrine. As referências por peça precisam de fonte e critério explícitos no ambiente real.

## Encaminhamentos e evidências — Entrega 3

`followup` salva declaração do lojista, com data do servidor e operação única, sem alterar catálogo ou XP. `demo-evidence` importa somente o conjunto histórico preparado no servidor do experimento. Não reutilizar esse endpoint na operação real. A integração real deve obter fontes autorizadas por loja e verificar entidade, população, métrica e versão antes de formar períodos. O comportamento legado sem proveniência completa existe apenas nos cenários antigos.

Declaração não comprova execução de estoque, anúncio, pedido ou venda. Para associar uma ação real será necessária sua operação e evidência verificável; esse vínculo não está conectado aqui. Ver `documentacao/PREPARACAO-1.4.md` antes de substituir o provedor simulado.

## Interesse por variação — 1.4 simulada

`variant-open` registra consulta e `variant-interest` exige consulta recente da versão da variação, revalidando sua disponibilidade. O servidor gera visitante e data a partir da sessão experimental; o cliente não envia métricas. Recibos em `variant_receipts` preservam o resultado da operação idempotente, inclusive disponibilidade alterada, sem falso sucesso. Reset limpa somente a sessão fictícia.

Esse modelo local une operador e visitante demonstrativo em uma sessão; não usar isso como autenticação da vitrine pública. A integração real exigirá coleta pública autorizada por loja, identidade anônima separada do operador, controle de origem e qualidade das fontes, sem expor dados de clientes. `demo-variant-stock` é exclusivo dos cenários fictícios, não uma API real de estoque.
