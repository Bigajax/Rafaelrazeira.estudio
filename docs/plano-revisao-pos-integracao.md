# Revisão após a integração — 14/10/2026

Plano complementar à primeira entrega do sistema integrado. Referência publicada: `41614f50acc44751127104e877996ed7d753acab`.

A base está instalada e já conecta vendas, contratos, parcelas, recebimentos, entregas, indicadores e metas. A próxima etapa deve corrigir os casos de falha que restaram e tornar o uso diário mais direto. Preservar a identidade clara, creme e verde do painel da vitrine.

Este documento é um plano. Nesta revisão não foram alteradas telas, funções de produção ou dados reais, nem feita uma nova publicação. AI Studio e os demais trabalhos locais continuam fora do escopo.

## Base da revisão

- Leitura dos componentes, consultas, ações e SQL da versão publicada; diferenças locais identificadas e preservadas.
- Conferência de instalação feita após a execução manual do SQL: sete tabelas e quatro funções disponíveis; 553 registros iniciais de etapas; três entregas migradas com contratos e checklists compatíveis.
- Comparação dos campos auditados: nove contratos, 19 parcelas e 15 recebimentos preservados. Os 15 recebimentos ainda estavam sem valor líquido na última conferência; clientes e origens de conteúdo ainda não tinham vínculos cadastrados. Estes são retratos da conferência, não contadores permanentes.
- Testes existentes de regras e migração executados novamente, com sucesso.
- Cenários adicionais locais confirmaram a divergência de metas e o conflito entre estorno do webhook e devolução manual descritos abaixo. Nenhum desses testes criou movimentos financeiros reais.
- A disponibilidade pública e a proteção das rotas foram verificadas anteriormente. A revisão atual não equivale a uma jornada autenticada completa em produção nem a uma nova avaliação visual de todas as telas.

## Achados e prioridades

P0: risco de alterar incorretamente um movimento financeiro. P1: consistência e uso diário. P2: clareza, produtividade e manutenção. Riscos de código não significam que já tenham ocorrido nos dados reais.

| ID | Prioridade | Evidência | Alteração proposta |
| --- | --- | --- | --- |
| R01 | P0 | O webhook marca o estorno integral em `estornado_em`, sem inserir o movimento correspondente em `crm_devolucoes`. A função manual calcula o limite pela soma dessa tabela e pode limpar a marca integral. | Unificar as gravações de devolução em uma operação transacional, que considere o estado integral e impeça reabrir um recebimento já integralmente devolvido. |
| R02 | P1 | O webhook trata estados integrais, mas não lê devoluções parciais do pagamento. Grava a data de processamento do aviso para o estorno. | Importar movimentos parciais/integrais com identificador e data comprovados na origem; manter pendência explícita quando a data não estiver disponível. |
| R03 | P1 | `Inicio` calcula a meta desde janeiro; `plano` exclui meses anteriores à criação. | Compartilhar a leitura da meta, incluindo início de vigência, período, direção e disponibilidade da fonte. |
| R04 | P1 | `cancelarContrato` atualiza parcelas, contrato e espelho do negócio em chamadas separadas; há leituras sem tratamento de erro nessa operação. | Cancelamento transacional e repetível, com bloqueio do contrato e preservação de recebimentos e entregas históricas. |
| R05 | P1 | Pagamentos de Performance entram legitimamente sem parcela, mas `semDono` classifica todo recebimento sem parcela como pendência. `supabaseSelect` também transforma falhas auxiliares em lista vazia. | Distinguir pagamento avulso identificado, pagamento de Performance e recebimento sem identificação; conservar falhas como pendências recuperáveis. |
| R06 | P1 | Performance e Caixa são gravados em passos separados. A falha financeira já devolve erro para permitir repetição, mas não há uma fila persistente de acompanhamento no CRM. | Mostrar conciliação pendente e permitir reprocessar somente os efeitos ausentes, sem duplicar acesso, recebimento ou histórico. |
| R07 | P1 | `fin_despesas` tem `custo_id`, mas o formulário e a ação não oferecem esse vínculo. Há cadastro e listagem de pagamentos, sem fluxo de retificação. | Lançar pagamento a partir do compromisso, corrigir com motivo e histórico, e comparar previsto/pago/pendente. |
| R08 | P1 | `crm_entregas.prazo` já é lido na prioridade de Hoje, mas não pode ser editado nos campos do projeto. As associações de prévia/Performance ainda são lidas por negócio. | Editar prazo, registrar bloqueio e escolher a prévia/loja correspondente a cada entrega. |
| R09 | P2 | A ficha integrada mostra contratos e entregas, mas a linha do tempo contém somente mudanças comerciais, limitadas a 50 itens. A lista de clientes não possui busca ou edição cadastral. | Completar a ficha e a navegação: pesquisa, edição de contato, histórico paginado e eventos financeiros/de entrega. |
| R10 | P2 | Links da previsão abrem o Caixa sem o mês. O gráfico anual do Caixa ainda usa o texto “Estorno não conta”, embora as devoluções sejam descontadas nas respectivas datas. | Revisar rótulos e fazer cada número abrir os registros com a mesma definição e período. |
| R11 | P2 | Hoje, Plano, Financeiro e ficha de cliente repetem leituras de conjuntos completos, inclusive ao abrir um único cliente. | Reutilizar consultas dentro da requisição e aplicar filtros/agregações no banco conforme medição, sem perder pagamentos antigos necessários aos saldos. |
| R12 | P2 | Componentes comuns convivem com módulos antigos e camadas de sobrescrita no CSS. | Consolidar componentes e remover as regras substituídas por tela, com comparação visual. |

Fontes principais: [webhook](../pages/api/mp-webhook.js), [SQL integrado](../supabase/sistema-integrado.sql), [ações do CRM](../app/(pt)/crm/acoes.ts), [ações financeiras](../app/(pt)/crm/acoes-financeiro.ts), [Hoje](../components/sistema/Inicio.tsx), [fontes do Plano](../lib/plano/dados.ts), [projetos](../lib/projetos/dados.ts), [Financeiro](../components/financeiro/Financeiro.tsx) e [leitura auxiliar das APIs](../lib/supabase-rest.js).

### Dois casos confirmados em simulação

**Meta criada em outubro:** meta anual de R$ 12.000, com R$ 1.000 recebidos em agosto, setembro e outubro. Pelas leituras atuais, Hoje chega a 30% do ritmo até outubro e Plano a 10%, pois considera somente outubro. Compartilhar a regra e apresentar a vigência resolve a diferença. A definição do alvo anual deve ser explícita: ano inteiro ou período de vigência, sem ajustar o denominador silenciosamente.

**Devolução depois de estorno integral:** recebimento de R$ 100 marcado como integralmente estornado pelo webhook. Uma chamada manual de R$ 20, como a de um formulário aberto antes da atualização, passa pelo limite da função, deixa `valor_estornado = 20` e remove `estornado_em`. O saldo passa a interpretar R$ 80 retidos. A correção precisa estar no banco, além da atualização da tela.

O gráfico do Caixa já representa meses negativos em uma segunda série de devoluções excedentes. Preservar esse comportamento; a revisão identificou necessidade de melhorar a explicação, sem tratar esse caso como barra desaparecida.

## Pacote 1 — Confiabilidade dos movimentos e das metas

Executar R01–R06 antes de ampliar os painéis.

1. Criar migração complementar com a gravação consistente de devoluções. Reutilizar o índice único de pagamentos e a identificação dos movimentos do provedor; proteger valores acumulados com bloqueio de linha. Distinguir eventos manuais de eventos recebidos da integração e evitar registrar duas vezes uma devolução já conciliada.
2. Adaptar o webhook para a função própria de integração, com acesso restrito ao serviço. Tratar a ordem dos avisos, os reenvios e a data real disponível. Chargeback, cancelamento e devolução devem ter efeitos financeiros definidos, preservando a origem do evento.
3. Tornar o cancelamento de contrato transacional. O histórico da entrega continua consultável mesmo quando o contrato deixa de estar ativo. Cancelamento não deve inventar uma devolução nem suspender acesso sem regra própria.
4. Extrair o cálculo e a leitura de metas para uso por Hoje e Plano. Incluir metas anuais criadas durante o ano e fontes incompletas nos cenários de comparação.
5. Ajustar a classificação dos recebimentos sem parcela. Pagamento identificado de Performance não deve ser apresentado automaticamente como erro de vínculo.
6. Adicionar acompanhamento persistente de efeitos pendentes de pagamento. Reprocessamento fica restrito ao necessário, com status, última tentativa e resultado visíveis.

**Aceite:** uma devolução integral não pode ser desfeita por formulário desatualizado; movimentos manuais e do provedor não ultrapassam o recebido nem duplicam a mesma devolução; falha no cancelamento não deixa metade dos registros alterados; Hoje e Plano mostram o mesmo percentual para a mesma meta; repetir pagamento mantém um único efeito financeiro e de acesso.

## Pacote 2 — Financeiro completo para o uso diário

Executar R07 e a parte financeira de R10.

- Criar a ação “Registrar pagamento” no custo previsto, preenchendo descrição, categoria e moeda. O usuário confirma data e valor efetivamente pagos; manter também a despesa avulsa.
- Definir a ocorrência prevista: mensal, semanal, anual ou única. Relacionar pagamentos à ocorrência correta, permitindo pagamento parcial. O cadastro atual de custos não possui vencimentos completos; não presumir uma agenda de caixa a partir de rateio anual.
- Separar “equivalente mensal” de “desembolso previsto”. Preservar o equivalente como visão de custo; a previsão de caixa depende de vencimentos reais.
- Oferecer retificação de despesa com motivo, antes/depois e data da alteração. Evitar exclusão sem histórico de um movimento já usado nos relatórios.
- Criar uma fila de conferência de líquidos por mês. Mostrar bruto, líquido confirmado e taxa derivada; só permitir confirmação a partir de valor comprovado. Os 15 recebimentos identificados precisam de conferência humana, não de preenchimento presumido.
- Adicionar filtros por cliente, categoria, situação e período, além de exportação dos registros filtrados. Valores em reais e datas seguem o mesmo padrão das telas.

**Aceite:** um compromisso pode ser encontrado a partir do pagamento e vice-versa; despesas pagas não são somadas novamente como saídas futuras da mesma ocorrência; correções recalculam Financeiro e Plano; líquido desconhecido continua identificado; a exportação corresponde à tabela filtrada.

## Pacote 3 — Cliente, entrega e acompanhamento

Executar R08–R09.

- Na lista de clientes, adicionar pesquisa por nome/contato e filtros simples de entrega aberta ou saldo pendente. Oferecer uma fila de negócios a revisar para criação/vínculo de ficha, começando pelos contratos ativos. Não fundir pessoas por semelhança de nome.
- Editar nome e contato na ficha e deixar clara a relação entre contato central e os dados particulares de cada negócio. Não sobrescrever todas as fichas vinculadas implicitamente.
- Reunir etapas, assinaturas, recebimentos, devoluções e conclusões na linha do tempo, com data, origem e link. Paginar o histórico e permitir filtrar por tipo.
- Editar o prazo de entrega e registrar bloqueio, motivo e próxima ação. Mostrar essas informações em Projetos, ficha e Hoje.
- Vincular explicitamente a prévia de Produção e a loja/Performance ao serviço correspondente. Sugerir apenas associações inequívocas; quando houver dois projetos ou lojas, pedir a seleção no próprio fluxo.
- Mostrar acesso vigente, expirado ou permanente usando a regra de Performance, sem resumir o acesso apenas pelo cadastro `ativa` da loja.

**Aceite:** um cliente com dois projetos e uma recorrência tem prazos, materiais, pagamentos e lojas identificáveis por serviço; alterar o prazo muda a prioridade em Hoje; a timeline explica o saldo e a entrega; contratos cancelados mantêm histórico acessível.

## Pacote 4 — Gráficos e filtros que ajudam a decidir

Entregar os gráficos depois das respectivas fontes. Toda visualização deve ter tabela acessível, período visível e acesso aos registros que formam o total.

| Pergunta | Visualização | Definição e destino |
| --- | --- | --- |
| Quanto entrou, saiu e sobrou? | Colunas mensais de entradas, despesas pagas e devoluções; resumo de saldo | Informar bruto/líquido explicitamente. Saldo permanece incompleto se faltar taxa. Abrir o extrato do mês. |
| Quanto preciso cobrar? | Barras por atraso: 1–7, 8–30, 31–60 e mais de 60 dias | Saldo aberto pela data de vencimento, separado do lembrete de cobrança. Abrir parcelas daquela faixa. |
| Qual desembolso vem pela frente? | Entradas e saídas previstas nos próximos seis meses | Usar ocorrências com vencimentos. Custos sem vencimento ficam como estimativa separada. Abrir o mês selecionado. |
| Estou no ritmo da meta? | Realizado acumulado e alvo no período de vigência | Mesma leitura em Hoje e Plano. Metas de reduzir usam limite e direção explícitos. Abrir a fonte e as iniciativas relacionadas. |
| Onde as entregas param? | Barras por etapa e lista de prazo/bloqueio | Entregas por contrato, excluindo recorrência sem novo projeto. Abrir a lista filtrada. |
| Onde perco negócios? | Barras por etapa e conversão da coorte | Separar histórico observado após a instalação da base inicial aproximada. Exibir data de corte e abrir os negócios da coorte. |
| Qual conteúdo trouxe oportunidades? | Tabela ordenada de negócios, contratos e recebimentos atribuídos | Mostrar cobertura dos vínculos manuais e origem desconhecida. Sem CAC/ROAS a partir de gasto agregado. |

Implementar primeiro atrasos, meta e previsão com mês preservado. Depois, entrega e evolução comercial. Evitar acrescentar vários gráficos a Hoje: manter até quatro resumos, ações prioritárias e acesso aos detalhes nas áreas correspondentes.

## Pacote 5 — Design consistente e consultas mais leves

Executar R11–R12 progressivamente, junto às telas anteriores.

- Padronizar cabeçalho, filtros, tabelas, valores monetários, campos e estados de vazio/erro. Trocar “Estorno não conta” por uma descrição compatível com os movimentos datados.
- Permitir manter o menu aberto no computador. Preservar foco por teclado, identificação da seção e os atalhos do celular.
- Nos formulários financeiros, impedir novos envios enquanto a gravação está pendente, mostrar conclusão e conservar os dados após uma falha. Isso complementa a proteção contra duplicação no banco.
- Preservar filtros ao abrir e voltar de cliente, contrato, gráfico ou parcela; mostrar nome do cliente nos extratos, além do link “Abrir ficha”.
- Medir requisições e tempo das telas Hoje, cliente e Plano antes de otimizar. Filtrar a ficha por seus negócios no banco, compartilhar leituras na mesma requisição e agregar séries quando necessário. Não usar cache global de dados privados entre donos.
- Avaliar carregamento independente dos blocos: falha de Marketing pode deixar seu bloco indisponível sem transformar dados em zero nem impedir as ações financeiras carregadas.
- Consolidar o CSS apenas à medida que o componente antigo for substituído. Verificar desktop, celular e teclado com os mesmos cenários.

**Aceite:** a tabela e o gráfico mantêm os mesmos filtros e totais; navegação em 320/390 px e desktop preserva ações e legibilidade; erros são localizados e acionáveis; a otimização mantém os totais completos e o isolamento por dono.

## Ordem recomendada e publicação

| Ordem | Entrega revisável | Dependência |
| --- | --- | --- |
| 1 | Devoluções consistentes, metas iguais e cancelamento atômico | Migração complementar e testes dos casos reproduzidos |
| 2 | Conciliação de Performance e recuperação de efeitos pendentes | Identificação dos movimentos e integração revisada |
| 3 | Compromissos vinculados a pagamentos, retificação e conferência de líquidos | Modelo de ocorrência/vencimento e histórico de correção |
| 4 | Cliente completo, prazo/bloqueio e vínculo de loja por entrega | Seleção explícita e migração só de casos inequívocos |
| 5 | Atrasos, previsão, metas e demais gráficos | Fontes dos pacotes anteriores e filtros comuns |
| Contínua | Componentes visuais e otimização medida | Verificação de regressão a cada tela |

Preparar SQL novo e versionado; não pedir para reaplicar indiscriminadamente o arquivo já instalado. Manter a preferência de aplicação manual no Supabase. Antes de migração com correção de dados, obter cópia recuperável das tabelas afetadas e comparar antes/depois. Após a aplicação, conferir esquema, vínculos e totais.

Testar em ambiente temporário: reenvios e ordem invertida de avisos; parcial seguida de integral; formulário manual antigo depois de estorno; falha no meio do cancelamento; meta criada durante o ano; compromisso pago parcialmente; dois projetos e recorrência do mesmo cliente; isolamento entre donos.

Executar TypeScript, build separado do servidor de desenvolvimento e validação das telas alteradas. Completar uma jornada autenticada com dados de teste: negócio → contrato → pagamento parcial → entrega → renovação → devolução → financeiro → meta. Publicar cada pacote validado, sem incluir trabalhos locais de outras funcionalidades.

O primeiro avanço recomendado é o pacote de confiabilidade. Depois dele, o maior ganho diário vem de conectar compromissos aos pagamentos e permitir trabalhar prazo, bloqueio e histórico diretamente na ficha do cliente.
