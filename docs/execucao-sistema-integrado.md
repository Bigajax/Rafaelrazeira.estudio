# Execução do sistema integrado — 14/10/2026

Implementação baseada no plano de evolução do estúdio, preservando a análise de vitrines da versão `83c63b3` e mantendo o AI Studio local fora do pacote.

## Entregas no código

- Hoje reúne vendas, cobrança, entregas, pendências de medição, renovações e inconsistências. A fila comercial continua em `/crm?modo=fila`.
- Financeiro separa recebimentos, contratações, despesas pagas, custos previstos e previsão. Cada mês do gráfico abre seus registros; há tabela dos valores e visual adaptado ao celular.
- Recebimentos sem líquido não geram taxa zero presumida. Câmbio ausente não zera custos; despesas realizadas em reais preservam seu valor histórico.
- Devoluções ficam na data em que ocorreram, incluindo devolução parcial seguida de estorno integral. Saldos contratuais usam o valor retido. Reenvios de estorno preservam a primeira data registrada.
- Clientes possuem ficha com negócios, contratos, entregas, lojas e histórico. Vínculos podem ser criados, associados ou corrigidos explicitamente.
- Entregas passam a ser identificadas por contrato de projeto. Mensalidades não geram uma nova entrega; os pagamentos de serviços diferentes não se misturam no checklist financeiro.
- Indicadores usam calendário local, valores por contratação, resposta posterior ao contato e histórico de etapas. A base anterior permanece identificada como aproximação.
- Plano mostra metas e decisões antes dos incentivos. As fontes automáticas abrem suas áreas de origem; há metas de despesas, entregas e saldo operacional, com direção de aumentar ou reduzir.
- Conteúdo publicado pode ser associado manualmente ao negócio. Marketing mostra negócios e valores atribuídos, sem calcular CAC ou ROAS sem dados suficientes.
- Consultas críticas preservam falhas como erros, e as leituras paginadas evitam truncamento silencioso. Mudanças nas áreas financeiras, de entregas e de metas revalidam o CRM integrado.

## Instalação no Supabase

Aplicar **o arquivo inteiro** [sistema-integrado.sql](../supabase/sistema-integrado.sql) no SQL Editor do projeto atual do CRM. Ele depende das estruturas já usadas pelas abas publicadas: CRM, financeiro, projetos, plano, marketing e Performance.

A migração executa em uma transação. Acrescenta tabelas, funções e vínculos, preservando as tabelas existentes. Checklists legados são copiados para a nova estrutura somente quando há um contrato de projeto ativo elegível; não há fusão de clientes por nome.

Foi escolhido aplicar o SQL manualmente no Supabase. Até a instalação, as telas identificam os recursos novos como pendentes e mantêm a compatibilidade com os registros anteriores. Não criar despesas pagas ou passagens históricas a partir de estimativas.

Para instalação pelo ambiente, caso essa preferência mude, o comando abaixo cria uma cópia local das tabelas afetadas antes de aplicar a migração. Exige `SUPABASE_ACCESS_TOKEN` configurado fora do código:

```powershell
node scripts/aplicar-sistema-integrado.cjs --aplicar
```

## Validação realizada

- TypeScript sem erros.
- Build de produção concluído com a base atualizada, incluindo `/crm/performance/analise`, sem rotas de demonstração nem AI Studio.
- Quinze telas/visões verificadas em 1440, 390 e 320 px: sem erros de navegador ou conteúdo alargando a página. Formulário de despesa verificado no celular.
- Testes de calendário na virada de mês/ano, dinheiro contratado versus recebido, taxas/câmbio desconhecidos, devoluções em períodos distintos, despesas realizadas, metas, histórico e contratos.
- Testes com dois projetos e uma recorrência do mesmo cliente confirmaram independência dos saldos de entrega.
- Migração aplicada e reaplicada em PostgreSQL temporário; fechamento transacional, rollback, idempotência, devoluções parciais/integrais e isolamento entre donos verificados.

Executar novamente as regras puras:

```powershell
node scripts/teste-sistema-integrado.cjs
```

Executar os testes SQL em banco temporário, sem conexão com produção:

```powershell
npm install --prefix .tmp/integracao-qa --no-audit --no-fund --ignore-scripts @electric-sql/pglite@0.5.9
node scripts/teste-sistema-sql.cjs
```

Os testes SQL usam o [PGlite](https://pglite.dev/docs/) para executar PostgreSQL localmente. A verificação de políticas segue o comportamento de [RLS do PostgreSQL](https://www.postgresql.org/docs/current/sql-createpolicy.html).

## Conferência após instalar

Confirmar a existência das sete novas tabelas e dos eventos iniciais. Abrir o CRM com a sessão habitual e conferir uma ficha, um recebimento, uma entrega e uma meta. Conferir no mesmo período os totais de Caixa, Financeiro e Plano, respeitando os rótulos de bruto, líquido e devoluções.

Os 15 recebimentos existentes estavam sem líquido informado na auditoria inicial. O novo sistema permite preencher os valores comprovados; a implementação não supõe taxas nem altera esses recebimentos automaticamente. As despesas previstas também não são convertidas em pagamentos históricos.
