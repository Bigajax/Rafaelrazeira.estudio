# Performance 1.4 — experimento separado

**Plano mestre vigente (19/10/2026, tarde):** [A gamificação que roda](../../docs/PLANO-MESTRE-MOLDE-PERFORMANCE-GAMIFICACAO-PLACAS.md). O motor de XP, os níveis e os emblemas deste experimento ficam como exploração: o plano usa as notas de atenção com Feito, uma faixa que se perde, o selo na vitrine e placas medidas pelo central. A integração real permanece planejada.

**Revisão de experiência — 19/10/2026:** [Plano de simplificação do painel](../../docs/plano-simplificacao-painel.md). Reduz o menu principal, traz melhorias para o Início e reúne conquistas em Resultados, preservando as regras de XP, placas e a integração operacional planejada.

**Plano de unificação — 19/10/2026:** [Molde, Performance e placas](../../docs/plano-unificacao-vitrine-performance-placas.md). Consolida a entrada de solicitações, pedidos, recebimentos registrados pela loja, missões/XP e seis placas em um painel. Prevalece nos critérios alterados: a primeira versão funciona sem checkout, e as placas usam “em vendas registradas”. É planejamento; o aplicativo continua experimental.

Próxima etapa planejada: **1.5 — utilidade comercial, revisão 3**. [Plano atualizado](./documentacao/PLANO-1.5-UTILIDADE-COMERCIAL.md), [PDF](./documentacao/PLANO-1.5-UTILIDADE-COMERCIAL.pdf), [kit da Etapa A](./documentacao/VALIDACAO-1.5-ETAPA-A.pdf) e [ficha atual de validação](./documentacao/FICHA-PILOTO-1.5.md). Seis frentes do Performance, em quatro etapas: validação, leitura real, ações confirmadas e orientação contextual. A pesquisa começa pelo caminho completo e pela utilidade percebida. O aplicativo continua 1.4 A/B simulado. Os planos anteriores ficam em arquivos com sufixos `REVISAO-1` e `REVISAO-2`.

Entrega atual: **1.4 — inteligência comercial, Entregas A e B**. [Relatório](./documentacao/PERFORMANCE-1.4-INTELIGENCIA-COMERCIAL.md) e [PDF](./documentacao/PERFORMANCE-1.4-INTELIGENCIA-COMERCIAL.pdf). Mapa, três níveis de leitura, consulta e declaração por tamanho, diagnóstico determinístico e 32 cenários fictícios. Assistente segue simulado; validação com lojistas ainda pendente.

**Documento completo atualizado:** [PDF consolidado](./documentacao/PERFORMANCE-1.4-DOCUMENTO-CONSOLIDADO.pdf), [HTML com índice](./documentacao/PERFORMANCE-1.4-DOCUMENTO-CONSOLIDADO.html) e [Markdown editável](./documentacao/PERFORMANCE-1.4-DOCUMENTO-CONSOLIDADO.md). Reúne 25 capítulos, 12 figuras atuais, todas as entregas e os emblemas até 100. Os relatórios anteriores continuam preservados como histórico.

Direção e planejamento preservados após autorização para aplicar a simulação da 1.4. [Plano da 1.4 — revisão 2](./documentacao/PLANO-1.4-REVISAO-2.md), [PDF atualizado](./documentacao/PLANO-1.4-REVISAO-2.pdf), [ficha do piloto](./documentacao/FICHA-PILOTO-1.3.md) e [preparação da 1.5](./documentacao/PREPARACAO-1.5.md). A 1.4 passa a tratar mapa, variações e diagnóstico comercial; a IA real fica na 1.5. A versão implementada agora é 1.4 A/B; os cenários da 1.3 permanecem disponíveis.

Status: aplicativo React/Next.js independente, com API, banco local e dados fictícios. A integração com clientes reais está preparada por contrato, sem ativação.

A atualização de UX está em [Performance 1.2 — PDF](./documentacao/PERFORMANCE-1.2-REFINAMENTO-DA-EXPERIENCIA.pdf) e [versão editável](./documentacao/PERFORMANCE-1.2-REFINAMENTO-DA-EXPERIENCIA.md). O Início destaca a ação na primeira área visível, Missões usa linhas compactas e Evolução reúne nível e coleção.

As regras de produto da 1.1 estão em [Performance 1.1 — PDF](./documentacao/PERFORMANCE-1.1-MISSOES-E-PROGRESSAO.pdf) e [versão editável](./documentacao/PERFORMANCE-1.1-MISSOES-E-PROGRESSAO.md). Os grupos persistem objetivos fixos; as frentes são Organizar, Cuidar e Evoluir, e composição pertence a Vitrine.

A documentação da versão 1.0 está preservada em [Documento completo — PDF](./documentacao/PERFORMANCE-DOCUMENTO-COMPLETO.pdf) e [versão editável](./documentacao/PERFORMANCE-DOCUMENTO-COMPLETO.md), com 20 capítulos sobre produto, UX, regras, design, simulações e integração.

O [PLANO.md](./PLANO.md) define a direção de evolução da loja, inspirada nos textos enviados por Rafael em 11/10/2026 e revisada conforme sua avaliação posterior.

Esta pasta fica fora das rotas do site e do painel. O protótipo tem servidor próprio, dados fictícios e armazenamento separado. Sua criação não autoriza publicação, integração ao painel compartilhado ou migração de bancos de clientes.

## Executar

Dentro desta pasta:

```powershell
npm run build
npm start
```

Abrir `http://localhost:3405`. Requer Node.js 22.13 ou superior, React 19.1 e Next.js 15.5.20, versões já disponíveis neste workspace e declaradas no pacote independente. Em uma cópia fora do workspace, executar `npm install` antes de compilar. Para desenvolvimento local, usar `npm run dev`. Para encerrar o servidor iniciado nesse terminal, usar Ctrl+C.

O aplicativo é executado a partir desta pasta; não usar os comandos de compilação na raiz do site principal. O código ativo fica em `app/`, `components/`, `domain/`, `fixtures/` e `public/`. A exploração HTML anterior foi preservada em `referencias/html/`.

## Experiência implementada

- Início com nível compacto, um próximo passo e acesso à área dedicada de Missões.
- Missões com Disponíveis, Para depois e Concluídas; filtros de Organizar, Cuidar e Evoluir; grupos expansíveis com objetivos fixos, peças, contexto e progresso.
- Três frentes e nove modelos úteis: foto de capa, foto de detalhe, informações da peça, primeira contagem, revisão por divergência, composição com procura, análise de produto esgotado, busca sem resultado e campanha concluída.
- Painel lateral com salvamento validado pelo servidor, confirmação e XP concedido uma vez por objetivo.
- Evolução com linha do tempo editorial de melhorias, peças envolvidas e níveis alcançados. A execução e a retomada de tarefas ficam em Missões.
- Imagem local ou ilustração de exemplo, contagem zero válida e retomada após falha simulada.
- Nove cenários em Opções da demonstração: loja nova, oportunidades, poucos dados, loja em dia, novas missões, marcos 5 e 10, leitura de impacto e várias missões para explorar.
- Loja nova começa no nível 1, com 0 XP; salvar a primeira foto concede 60 XP automaticamente. Uma contagem de 80 XP leva ao nível 2 com 40 XP excedentes preservados.
- Progresso salvo no banco exclusivo `.data/experiment.sqlite`, com sessão HttpOnly e isolamento entre sessões. A chave `experimento-evolucao-atelier04-react-v2` guarda apenas uma cópia para inspeção; alterar esse cache não concede XP. O histórico anterior da exploração HTML continua separado.
- Missão com objetivo em andamento, carimbo de conclusão e recompensa integrada à confirmação do salvamento.
- Barra de XP verde, ponto que acompanha o preenchimento e rosa durante o reconhecimento; subida de nível com emblema geométrico da marca e número expressivo.
- Sequência `idle → xp_received → level_up → complete`, dispensável imediatamente. Fechar cancela a apresentação e preserva o que foi salvo. Recarregar a página não repete a celebração.
- Entradas de até 280 ms, preenchimento de XP em 600 ms e sequência de conquista em 1.600 ms e resultado estático imediato com preferência por redução de movimento. Sem som automático.
- Marcos 5 e 10 com emblemas próprios, retrospectiva de ações documentadas e botão para rever a conquista. Os cenários geram seu histórico pelo mesmo motor, sem bônus de XP para o marco.
- Brasões vetoriais compartilhados entre o indicador compacto e as conquistas: gema geométrica nos níveis 1–4, moldura facetada nos níveis 5–9 e estrutura adicional a partir do 10. A seta segue o desenho do selo Performance; os marcos ainda não alcançados têm acabamento neutro.
- Acompanhamento com comparação de períodos, contagens, denominadores, espera, referência indisponível e pouca amostra.
- Linha do tempo mostra oito registros inicialmente e permite carregar os demais. Abas da mesma sessão se atualizam após mudanças.

As ilustrações de peças são SVGs criados para a loja fictícia Ateliê 04. A imagem escolhida fica nesta máquina, no servidor local e no cache da demonstração; nenhum arquivo é enviado a serviço externo.

## Verificação

```powershell
npm test
npm run build
```

Os testes de navegador `node tests/browser-react.cjs`, `node tests/browser-expanded.cjs` , `node tests/browser-missions.cjs` , `node tests/browser-journeys.cjs` e `node tests/browser-ux12.cjs` usam o `puppeteer-core` já instalado no workspace e Chrome local. Não é uma dependência de execução do protótipo. Capturas e resultado de QA ficam em `.tmp/painel-gamificado/` na raiz do workspace, fora dos arquivos do experimento.

Os testes cobrem as regras e a apresentação: início em 0 XP, foto ausente, salvamento com 60 XP, falha preservando a imagem, recompensa única, limite de 100 XP para nível 2, excedente de 40 XP, estoque zero, adiamento, dados insuficientes e marcos derivados do histórico. A verificação no navegador também cobre a sequência 60/100 → 100/100 → nível 2 com 40/150, persistência, teclado, movimento reduzido, fechamento durante a animação e telas entre 320 e 1440 px.

Última verificação: compilação, 31 testes automatizados e os cinco fluxos completos de navegador passaram. A ampliação cobre marcos 5/10, retrospectivas, novas missões, leitura de impacto, conexões concorrentes, cache adulterado, isolamento entre sessões e sincronização de abas. Os arquivos `verificacao-react.json`, `verificacao-expanded.json` , `verificacao-missoes.json` , `verificacao-journeys.json` e `verificacao-ux12.json` registram os resultados, com zero erros JavaScript.

## Integração e limites

O backend local usa transações para salvar a melhoria e a recompensa juntas, deduplicação por objetivo/operação, proteção de origem, limite de imagem, sessão por loja fictícia e geração de cenário para impedir gravações de abas antigas. O banco local usa o módulo SQLite nativo do Node, ainda experimental nesta versão; serve à demonstração local.

A [fronteira de integração](./integration/README.md) implementa a orquestração de autenticação e transação autorizada por loja. Antes da ativação real, mapear o login e o banco de produtos de cada vitrine, implementar o repositório com permissões por loja e validar em staging. Não há conexão com bancos reais, migrações aplicadas ou publicação no painel principal.

Os dados analíticos são fictícios. A leitura exige janelas concluídas e comparáveis de ao menos 14 dias e 100 visitantes elegíveis em cada período. Esse limite é uma hipótese de apresentação, não uma prova estatística ou causal. Clique no WhatsApp não confirma mensagem nem venda.

Não existem recompensas financeiras, pontos por vender ou contratar, ranking, IA ou missões periódicas sem necessidade. A revisão de estoque depende de uma divergência explícita, com identidade própria, e vale uma vez para aquele objetivo.

A validação técnica cobre regras, servidor, concorrência, UX móvel e teclado. A [revisão com lojistas](./REVISAO-UX.md) continua necessária para avaliar entendimento e utilidade; ela não foi substituída pelos testes automatizados.

## Direção visual revisada — 12/10/2026

A referência enviada por Rafael orienta dois estados: gestão clara em creme, verde profundo e tipografia editorial; conquista com superfície escura, emblema facetado, número em rosa e detalhes metálicos discretos. A seta do Performance permanece na gema. O componente vetorial mantém leitura nos tamanhos compactos e nas conquistas.

O Início separa evolução de resultados e destaca somente o próximo movimento. A página Missões reúne os demais objetivos. No celular, a tarefa vem antes do resumo de resultados. Somente os destinos existentes aparecem no menu. Os números 324/112/41 são um agregado fictício de sete dias nos cenários Oportunidades, Loja em dia e Impacto; não vêm do indicador de uma peça nem de uma fonte real. Loja nova e Poucos dados exibem ausência de informação. Não há percentuais de crescimento sem referência anterior.

A conquista inicia o preenchimento em 300 ms, completa a barra em 900 ms, apresenta o novo nível em 1.200 ms e conclui a sequência em 1.600 ms. É dispensável desde o primeiro instante e estática com movimento reduzido. Não há som automático ou partículas permanentes.

## Área dedicada de Missões — 12/10/2026

Abrir `http://localhost:3405/#missoes`. Os filtros de situação ficam no endereço: `#missoes?status=adiadas` e `#missoes?status=concluidas`, preservados ao atualizar ou usar Voltar. Os filtros de frente (Organizar, Cuidar e Evoluir) também ficam no endereço e não alteram o progresso.

A área mostra todos os objetivos elegíveis, mantendo uma missão por peça. Adiar esse objetivo não revela uma segunda tarefa da mesma peça. Retomar abre diretamente o editor correspondente. Salvar conclui automaticamente a missão e permite abrir sua confirmação na lista de Concluídas, com peça, data, evidência e XP recebido. A preparação inicial dos cenários não é contada como missão concluída.

O Início mostra um próximo cuidado e o botão Ver todas as missões. Evolução permanece dedicada à trajetória, aos níveis e à leitura de impacto. Testes verificam execução além dos três objetivos inicialmente sugeridos, filtros, retomada, confirmação pelo teclado, persistência e telas de 320 a 1440 px. As capturas `missoes-1440.png` e `missoes-375.png` estão em `.tmp/painel-gamificado/`.

## Simular várias missões

Abrir `http://localhost:3405/?cenario=varias-missoes#missoes` para carregar o cenário Várias missões para explorar. Há 12 disponíveis (oito de Vitrine e quatro de Estoque), três para depois e quatro concluídas, em 19 peças fictícias. Os seis modelos de objetivo estão representados; as quatro conclusões usam o mesmo motor de salvamento e somam 280 XP, nível 3.

O link carrega o cenário quando ele é diferente do atual e remove o parâmetro após carregar. Atualizar ou reabrir o mesmo cenário preserva as melhorias feitas na demonstração. Para começar novamente, usar Reiniciar este cenário em Opções da demonstração. Também é possível escolher o cenário pelo seletor existente. O teste de navegador dedicado cobre esse acesso, a lista com vários itens, os filtros, uma edição além das três primeiras sugestões e a persistência após atualizar.

## Exportar o documento

A versão editável está em `documentacao/PERFORMANCE-DOCUMENTO-COMPLETO.md`. Para atualizar a exportação local em HTML e PDF, executar `node scripts/export-document.cjs`. Com `--capture`, o script atualiza a figura de Missões usando uma sessão fictícia própria no servidor local. A exportação usa Chrome e fontes do sistema, sem enviar o conteúdo a serviços externos.

## Versão 1.1 — execução e regras de grupos

O servidor grava a composição do grupo antes de validar uma mudança. Novos objetivos criam outro conjunto; adiar e retomar não alteram seu total. A conclusão e o XP vêm das recompensas existentes, sem bônus de grupo. Uma necessidade retirada fica indisponível e não é marcada como concluída.

Procura válida (ao menos 50 pessoas em 14 dias e contagens compatíveis) contextualiza e prioriza a tarefa. Sem referência válida, a ordem usa o problema operacional. Composição é Vitrine; Evoluir pode reunir uma melhoria de Vitrine ou Estoque com procura observada. O Início mantém o resumo de resultados recolhido. Evolução apresenta o emblema, os conjuntos e os marcos derivados.

O documento completo 1.0 foi preservado como referência histórica; a especificação 1.1 prevalece nos pontos alterados. Para exportar a atualização, usar `node scripts/export-document.cjs --document=PERFORMANCE-1.1-MISSOES-E-PROGRESSAO --capture`. O cenário pode ser reiniciado pelas opções existentes para revisar exatamente as referências novas.

## Versão 1.2 — primeira área visível e ritmo

A ação principal foi medida inteira em 1280×720, 1366×768 e 1440×900. As 12 linhas do cenário medem 110 px no desktop e mantêm ações de 44 px; a altura pode crescer conforme o conteúdo. O menu não usa contagens em bolinhas. Em Evolução, a coleção distingue o começo, níveis recentes, atual, próximo e marcos 5/10, com consulta somente aos marcos já alcançados.

A atualização modifica componentes e estilos, preservando motor, fórmula e composição dos grupos da 1.1. A especificação de UX atual está no documento 1.2. As capturas usam `performance-12-` e a medição completa está em `verificacao-ux12.json`. Para exportar o documento: `node scripts/export-document.cjs --document=PERFORMANCE-1.2-REFINAMENTO-DA-EXPERIENCIA --capture`. A exportação confere a versão da tela antes de atualizar uma figura histórica.

## Versão 1.3 — novas ocorrências

Abrir `http://localhost:3405/?cenario=continua#inicio`. A loja organizada recebe cinco cuidados concretos, mantendo uma recomendação principal e o resumo Sua semana. Os três modelos de decisão exigem justificativa e não alteram estoque ou criam vendas. Apresentação e divergência usam os modelos anteriores. Todos os dezoito cenários podem ser reiniciados nas opções da demonstração.

O motor valida origem da loja, evento, janela concluída, amostra, necessidade e recorrência. Eventos rebatizados ou janelas reutilizadas não dão XP; o servidor salva decisão e recompensa na mesma transação. Depois de salvar, a observação possui referência disponível e período posterior vazio. Não há coleta real.

Verificar com `npm test`, `npm run build` e `node tests/browser-continuous.cjs`, além dos cinco fluxos anteriores. Exportar este relatório com `node scripts/export-document.cjs --document=PERFORMANCE-1.3-EVOLUCAO-CONTINUA --capture`. As capturas são da 1.3 e não substituem figuras históricas.

## Entrega 2 — Intelligence contextual

Abrir `http://localhost:3405/?cenario=intelligence#inicio`. Usar Entender este cuidado no Início ou Analisar com IA no formulário. O painel oferece Entender, Decidir e Executar, com pergunta complementar curta. Descrição usa características informadas e exige transferência ao formulário, revisão e salvamento separados. Desfazer recupera o rascunho anterior.

O reconhecimento agora distingue decisões de melhorias e o ciclo conta registros dentro do mesmo conjunto de oportunidades. O XP e os IDs originais foram preservados. Nas opções da demonstração, simular resposta inválida, indisponível ou lenta; a simulação afeta a próxima consulta. Os 18 cenários anteriores continuam no seletor, além do novo Intelligence.

As consultas são autenticadas pela sessão local, limitadas a 30/minuto e armazenadas em cache isolado por cinco minutos. A auditoria registra metadados e custo zero, sem perguntas ou características. Não existe provedor externo ativado. Validar com `npm test`, os sete scripts de navegador e `npm run build`. Exportar com `node scripts/export-document.cjs --document=PERFORMANCE-1.3-INTELIGENCIA-ASSISTIDA --capture`; as figuras usam prefixo de entrega próprio.

## Revisão da Entrega 3

[Validação com comerciantes](./documentacao/VALIDACAO-COM-LOJISTAS.md) preparada, ainda não realizada. [Preparação da 1.5](./documentacao/PREPARACAO-1.5.md) define avaliação de modelos, estilos futuros e custos sem conectar API. A preparação anterior da 1.4 fica preservada como documento histórico. A [Entrega 2](./documentacao/PERFORMANCE-1.3-INTELIGENCIA-ASSISTIDA.pdf) e seus arquivos históricos estão preservados.

Para explorar: `http://localhost:3405/?cenario=acompanhamento-comercial#evolucao`. Carregar dados fictícios no acompanhamento; depois abrir Início para ver a nova ocorrência independente. Encaminhamentos são declarações do lojista e não repõem estoque nem concedem XP.

Verificação nova: `node tests/browser-followup.cjs`. Regras e servidor: `npm test`. Exportação do relatório atual: `node scripts/export-document.cjs --document=PERFORMANCE-1.3-ACOMPANHAMENTO-COMERCIAL --capture`. As capturas da Entrega 3 usam nomes próprios e o exportador recusa sobrescrever figuras das entregas anteriores com a interface atual.

Exportar o planejamento sem capturar a interface: `node scripts/export-document.cjs --document=PLANO-1.4-INTELIGENCIA-COMERCIAL --planning`.

## Plano 1.4 — revisão 2

Quatro ajustes integrados antes da implementação: fluxo de interesse explícito por tamanho esgotado; três níveis de leitura que mantêm utilidade em pouco tráfego; matriz de CTAs com destino revalidado; marco de primeira descoberta após validar a 1.4, sem XP extra. O [plano inicial de 12 páginas](./documentacao/PLANO-1.4-INTELIGENCIA-COMERCIAL.pdf) foi preservado. A ficha agora registra se a informação mudaria uma decisão e a descoberta compreendida em menos de um minuto. A pesquisa segue pendente e o aplicativo continua na 1.3.

Exportar a revisão: `node scripts/export-document.cjs --document=PLANO-1.4-REVISAO-2 --planning`.

## Explorar a 1.4 implementada

Abrir `http://localhost:3405/?cenario=mapa-comercial#inicio`. “Ver todas no mapa” leva às 40 peças. Analisar o Conjunto Linho permite adicionar sua foto pelo cuidado original. Analisar o Tênis Air Max e abrir a interação da vitrine permite consultar o 41 esgotado e declarar interesse separadamente. A declaração não reserva a peça nem gera XP.

Cenários novos: mapa-comercial, mapa-comparavel, mapa-poucos-dados, mapa-interesse, mapa-reposto, mapa-fontes-incompletas e mapa-toques.

Verificar: `npm test`, `node tests/browser-commercial.cjs` e as oito regressões anteriores. Exportar o relatório: `node scripts/export-document.cjs --document=PERFORMANCE-1.4-INTELIGENCIA-COMERCIAL --capture`. Relatórios e planos anteriores ficam preservados; capturas atuais não podem sobrescrever figuras da 1.3.

Marcos comerciais de descoberta ficam para depois da validação da 1.4. IA real continua planejada para 1.5, e pedidos/vendas reais para 2.0. A autorização para aplicar a simulação não significa que as entrevistas ocorreram.

## Ver o experimento no nível 10

Abrir `http://localhost:3405/?cenario=mapa-nivel-10#inicio`. O cenário mantém 40 produtos publicados e seus sinais comerciais, com 2.700 XP de histórico fictício, nível 10 e marcos 5/10 acessíveis. As peças usadas no histórico estão arquivadas, fora do mapa. O cenário pode ser retomado pelas opções da demonstração; os demais cenários preservam sua pontuação original.

Para visualizar o nível 25: `http://localhost:3405/?cenario=mapa-nivel-25#inicio`. A prévia usa 16.200 XP de histórico fictício, mantendo 40 produtos publicados e os dados comerciais do cenário.

## Evolução dos emblemas até o 25

As faixas 1, 5, 10, 15, 20 e 25 possuem formas próprias, incluindo as versões compactas. Em Evolução, usar **Ver evolução dos emblemas** para comparar os desenhos. [Detalhes visuais](./documentacao/EMBLEMAS-EVOLUCAO-25.md). A comparação não altera experiência, grupos ou conquistas.

## Coleção de emblemas até o 100

21 desenhos-base com novas formas a cada cinco níveis e joias de progresso entre as faixas individualizam os 100 níveis. Em **Evolução → Ver evolução dos emblemas**, a prévia abre no 100 e permite escolher qualquer nível, comparar a versão compacta e consultar a coleção completa. [Especificação da coleção](./documentacao/EMBLEMAS-EVOLUCAO-100.md). O nível atual, o XP e os marcos funcionais são preservados.
