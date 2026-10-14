# Execução da revisão integrada — 14/10/2026

Implementação do [plano de revisão](plano-revisao-pos-integracao.md), sobre a versão `41614f5` do CRM. Mantém a linguagem do painel da loja e os caminhos publicados. AI Studio e os trabalhos locais de relatórios permanecem fora do pacote.

## O que foi entregue

| Área | Resultado |
| --- | --- |
| Devoluções | Operação de banco com bloqueio do recebimento, limite acumulado, identificação dos movimentos do provedor e proteção contra formulário antigo após estorno integral. A importação preserva as datas das devoluções aprovadas. |
| Conciliação | Nova tela com efeitos pendentes, tentativas e atualização a partir da origem. Reenvios recuperam a gravação no Caixa sem duplicar o acesso de Performance. Pagamento identificado sem parcela é separado de recebimento sem identificação. |
| Contratos | Cancelamento transacional, repetível e com reversão integral em caso de falha. Recebimentos e histórico de entregas são preservados. |
| Metas | Hoje e Plano compartilham a vigência das fontes automáticas. A evolução mostra realizado e alvo/ritmo; o alvo anual mantém a referência do ano civil, descrita na tela. |
| Financeiro | Agenda de vencimentos reais por compromisso; geração de ocorrências mensais, semanais, anuais ou únicas; pagamentos parciais vinculados; correção com motivo e histórico; filtros e exportação CSV dos recebimentos/despesas selecionados. |
| Previsão | Entradas futuras e saídas agendadas em seis meses, com escolha do mês e detalhamento. Pagamentos vinculados reduzem o saldo previsto. Custos sem agenda e conversão ausente ficam identificados. Rateio anual continua separado do desembolso. |
| Clientes | Pesquisa, filtros de saldo/entrega, fila de contratos sem ficha, edição do contato central e timeline de etapas, contratos, recebimentos, devoluções e conclusões, com filtro e paginação. |
| Entregas | Edição de prazo, bloqueio, próxima ação e vínculos da prévia/loja por contrato. Esses dados aparecem na prioridade de Hoje e na ficha do cliente. Contratos cancelados com entrega registrada mantêm acesso ao histórico. |
| Gráficos | Entradas, despesas e devoluções separadas; atraso por vencimento contratual com detalhamento; etapas de entrega com links; evolução das metas e previsão. O funil histórico e a atribuição manual de conteúdo já existentes foram preservados. |
| Design e consultas | Menu fixável no computador; controles financeiros bloqueados durante a gravação; feedback de conclusão; erros de Marketing localizados em Hoje; leitura por negócios na ficha; reutilização financeira/de projetos dentro da requisição. |

A identificação dos movimentos usa o [GET de devoluções do Mercado Pago](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api-payments/get-refunds/get). A aplicação consulta a origem; não efetua uma cobrança nem solicita um reembolso. Data ausente e conflito com devolução manual/legada geram pendência para conferência. Um chargeback sem movimento datado exige confirmação da data comprovada no extrato. Não inferir a data financeira pelo horário de chegada do aviso.

## Banco

O complemento é [sistema-integrado-revisao.sql](../supabase/sistema-integrado-revisao.sql). Foi aplicado manualmente no Supabase pelo usuário e conferido em modo somente leitura.

- Novas tabelas de acompanhamento de integração, ocorrências financeiras e histórico de retificação disponíveis.
- Funções de cancelamento, sincronização de devoluções, acompanhamento e retificação disponíveis.
- Novos campos de entrega, vínculos financeiros e identificação de devoluções disponíveis.
- Comparação com a cópia anterior: nove contratos, 19 parcelas, 15 recebimentos e três entregas, sem perda de registros ou alteração dos campos anteriores auditados.
- Uma cópia privada dos registros afetados foi salva em `.tmp` antes da aplicação. Ela não faz parte do repositório nem da publicação e não substitui um backup completo do projeto Supabase.

Não reaplicar o SQL antigo para instalar este complemento: isso substituiria funções corrigidas pelas versões anteriores. Migrações futuras devem preservar a ordem original → complemento.

## Validação

Os testes abaixo foram executados com fixtures e PostgreSQL temporário, sem criar movimentos reais:

```powershell
node scripts/teste-sistema-integrado.cjs
node scripts/teste-sistema-sql.cjs
node scripts/teste-conciliacao.cjs
```

- Vigência compartilhada de metas e datas mensais/anuais/semanais, incluindo 31 de janeiro e ano bissexto.
- Pagamentos parciais, conversão desconhecida, classificação de atraso e paginação do histórico.
- Aplicação/reaplicação do SQL, bloqueio de devolução após estorno integral, parcial/integral do provedor, repetição e aviso antigo.
- Cancelamento com falha simulada após a alteração das parcelas: rollback mantém o contrato e as parcelas intactos. Repetição após sucesso permanece segura.
- Retificação exige motivo e guarda o histórico; isolamento entre donos e restrição das funções de integração ao serviço.
- Falha financeira depois da liberação de Performance: nova tentativa registra o recebimento sem nova extensão do acesso.
- TypeScript e build isolado de produção; conferência visual com dados fictícios em 1440/390/320 px e testes de abertura dos formulários, retificação e menu fixo.

Os testes de navegador com fixtures verificam apresentação e interação dos controles. Não representam uma jornada com gravações autenticadas no banco real. A verificação real do banco foi de esquema, vínculos e preservação dos dados. Não foi atribuído um ganho numérico de desempenho sem medição comparável; as consultas passaram a reutilizar leituras e filtrar registros da ficha na origem.

## Uso inicial

1. Revisar os líquidos ainda não informados a partir dos comprovantes. Nenhuma taxa foi preenchida por suposição.
2. Em Custos previstos, agendar os vencimentos conhecidos e registrar os pagamentos pela ocorrência correspondente. O cadastro anterior não cria pagamentos nem vencimentos retroativos.
3. Revisar os contratos sem ficha de cliente e escolher os vínculos explicitamente.
4. Definir prazos, bloqueios e lojas dos serviços em andamento.
5. Usar Conciliação para consultar a origem de pagamentos ou retomar efeitos pendentes. Um conflito de devolução legada permanece identificado para revisão; não há associação automática baseada apenas em valor ou nome.

O acabamento de CSS foi feito nas telas alteradas. A remoção de todos os estilos antigos e expansões como estoque, pedidos/WhatsApp e Mercado Livre não integram esta publicação.
