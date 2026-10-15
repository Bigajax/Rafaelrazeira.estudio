# Plano de melhoria do Caixa

Proposta ajustada em 15/10/2026 após o commit `218e481`, aplicada no código nesta mesma data. O foco é a operação do Caixa do CRM: recebimentos, parcelas, cobranças, pagamentos para identificar e previsão de entradas.

## Implementação

- `/crm/caixa` tem tela própria e acesso no menu e na barra do celular. Os indicadores separam recebimentos do período e posição financeira de hoje.
- A fila agrupa parcelas por cliente. Recebimentos, preparo de mensagem, registro de contato, lembretes e detalhe financeiro estão na própria tela. Abrir o WhatsApp não registra envio.
- Conferências reúnem identificação, líquido pendente, tentativas automáticas e planos incompletos. Uma entrada pode ser distribuída entre parcelas do mesmo cliente sem criar outros recebimentos.
- Correções e anulações manuais exigem motivo. A anulação preserva o valor original e retira o lançamento dos totais, sem gerar devolução. Pagamentos automáticos e entradas com devoluções não permitem reescrever valores ou anular.
- A agenda agrupa vencimentos dos próximos 7/30 dias. Histórico e CSV respeitam os filtros, e devoluções usam sua própria data, inclusive quando o recebimento ocorreu antes do intervalo.
- Os vínculos e o histórico usam campos existentes: `crm_interacoes` para contatos reais e metadados `caixa_alocacoes`, `caixa_historico`, `caixa_anulado` e `caixa_versao` no JSON do recebimento. A resposta original do provedor é preservada. Não é necessária instalação de tabela nova para estes fluxos; as devoluções usam o módulo financeiro já existente.
- A anulação é lógica, consultável no histórico. As telas antigas direcionam correções ao Caixa e a exclusão física de recebimentos foi desativada.

Validação: testes automatizados de regras e ações, regressão do CRM/Financeiro, build de produção e operação no navegador com dados fictícios, em 1440, 390 e 320 px. O teste no navegador cobre pagamento parcial, lembrete, contato, identificação, correção, devolução, CSV e anulação com conferência dos saldos no Financeiro.

As seções abaixo preservam os critérios usados na implementação.

## Objetivo

Ao abrir o Caixa, o operador deve conseguir responder rapidamente:

1. Quanto entrou no período?
2. Quem precisa ser cobrado agora?
3. O que está vencido e quanto ainda falta receber?
4. Quais pagamentos chegaram e precisam ser conferidos?
5. O que deve entrar nos próximos dias?

O resultado do mês e as despesas continuam no Financeiro. O Caixa usa os mesmos contratos, parcelas, recebimentos e devoluções para manter os números consistentes entre as telas.

## Situação atual

- `/crm/caixa` redireciona para Financeiro → A receber. A apresentação antiga permanece no modo de exemplo.
- A receber já tem filtros por situação, cliente, período e faixa de atraso; busca; saldo da seleção; registro de recebimento; acesso ao WhatsApp e contratos.
- Recebimentos parciais mostram o saldo restante. O formulário novo protege contra reenvio do mesmo pedido e alerta para pagamentos automáticos possivelmente repetidos.
- Pagamentos sem identificação podem ser vinculados à parcela correspondente.
- Existem vencimento contratual e data de lembrete de cobrança separados. A operação precisa tornar essa diferença mais visível.

O plano deve aproveitar essas funções e acrescentar a organização operacional que falta.

## 1. Entrada e resumo próprios do Caixa

Dar ao Caixa um acesso explícito no CRM e uma tela de trabalho em `/crm/caixa`, reaproveitando os componentes e cálculos já existentes. Manter um atalho para o Financeiro e preservar os links e filtros antigos.

O topo terá quatro números clicáveis:

| Número | Definição | Ação ao abrir |
| --- | --- | --- |
| Recebido no período | Pagamentos pela data em que entraram, com devoluções do período explicitadas | Abrir histórico dos recebimentos |
| Em atraso hoje | Saldo aberto de parcelas com vencimento contratual anterior a hoje | Abrir parcelas vencidas |
| Vence hoje | Saldo aberto das parcelas com vencimento hoje | Abrir vencimentos do dia |
| A vencer nos próximos 30 dias | Saldo das parcelas que vencem depois de hoje, dentro da janela | Abrir próximas entradas |

O seletor de período deve indicar que filtra recebimentos e histórico. Cobranças e saldos em aberto são a posição de hoje e precisam ser rotulados assim, mesmo quando o operador consulta um mês antigo.

Mostrar bruto, devolvido e líquido confirmado com explicações curtas. Se faltarem taxas, exibir o que já foi confirmado e a quantidade pendente, mantendo o total líquido incompleto identificado.

Não declarar que todas as parcelas do mês foram pagas apenas porque entrou um valor igual ou maior ao previsto. Pagamentos de parcelas antigas ou futuras podem ter entrado no mesmo mês.

## 2. Fila “Cobrar agora”

Abrir a operação com quem já chegou à data de cobrança. Agrupar por cliente para evitar contatar a mesma pessoa várias vezes por parcelas diferentes.

Cada item mostra cliente, contrato, parcelas envolvidas, vencimentos, valor combinado, valor recebido, saldo restante, último registro de cobrança e próximo lembrete.

A fila considera o próximo lembrete quando ele existe; caso contrário, considera o vencimento. Ordenar primeiro pelo lembrete mais antigo já devido, com o vencimento como desempate. A lista financeira de atrasados continua baseada no vencimento contratual.

Ações na própria linha:

- **Recebi:** abrir o registro com cliente e parcela preenchidos, permitindo pagamento parcial.
- **Cobrar:** preparar o texto com parcela, vencimento e saldo; permitir copiar e abrir o WhatsApp.
- **Registrar cobrança:** confirmar que a cobrança aconteceu e guardar data, canal e observação. Abrir o WhatsApp, sozinho, não comprova envio.
- **Lembrar depois:** escolher uma data sem alterar o vencimento combinado.
- **Ver detalhes:** abrir a história financeira do cliente.

Após receber o saldo integral, a parcela sai da fila. Após uma cobrança, o operador pode definir o próximo lembrete no mesmo fluxo.

## 3. Detalhe financeiro simples por cliente

Criar um detalhe acessível pelo Caixa, com os contratos e parcelas do cliente, sem obrigar a percorrer toda a ficha comercial.

Organizar a informação em uma sequência clara:

1. Valor combinado no contrato.
2. Plano de pagamento e vencimentos.
3. Recebimentos e devoluções registrados.
4. Saldo que falta receber.
5. Próxima cobrança e histórico dos contatos financeiros.

Usar rótulos completos: **Valor combinado**, **Já recebido**, **Devolvido** e **Falta receber**. Pagamento parcial deve aparecer junto do atraso quando os dois fatos existirem.

Separar corrigir um lançamento feito por engano de registrar uma devolução real. Correções e cancelamentos devem preservar o histórico e mostrar o efeito sobre o saldo antes da confirmação.

## 4. Bandeja de pagamentos para conferir

Reunir, com contagens e atalhos, quatro situações:

- Pagamento sem cliente ou parcela identificados.
- Recebimento com valor líquido ainda não confirmado.
- Pagamento automático com processamento pendente.
- Contrato cujo plano de parcelas não cobre o valor combinado.

Apresentar primeiro data, valor, origem e possível cliente. Identificadores técnicos ficam nos detalhes para consulta.

Ao identificar um pagamento existente, atualizar seu vínculo sem criar outro recebimento. Pagamentos que não se encaixem em uma parcela inteira devem permitir entender e registrar a alocação correta, sem supor quitação.

Uma exclusão por engano precisa ser distinguida de uma devolução, com confirmação clara e histórico. O operador deve conseguir conferir o registro de origem antes de qualquer ação que altere valores.

## 5. Próximas entradas e histórico

Mostrar uma agenda de recebimentos dos próximos 7 e 30 dias, agrupada por data. Cada valor abre as parcelas que o compõem.

Manter as parcelas já vencidas em uma seção separada. Mostrar previsões por vencimento, sem apresentar uma negociação aberta como recebimento garantido.

No histórico, permitir filtros por cliente, contrato, forma de pagamento, origem, data e status de conferência. Manter exportação da seleção com valores bruto, líquido conhecido e devoluções identificáveis.

Uma entrada atrasada pertence ao período em que foi recebida. Uma devolução pertence ao período em que ocorreu. Consultar o mês anterior não deve deslocar esses eventos de data.

## Ordem de entrega

| Etapa | Resultado |
| --- | --- |
| 1 | Acesso próprio ao Caixa, resumo com definições claras e fila Cobrar agora |
| 2 | Registro de cobrança, próximo lembrete e detalhe financeiro por cliente |
| 3 | Bandeja de conferências com identificação e correções claras |
| 4 | Agenda de entradas, histórico e exportação aperfeiçoados |

A primeira entrega deve ser resumo + fila + baixa de recebimento na mesma tela, reaproveitando os formulários e filtros atuais. O fluxo de cobrança e recebimento precisa funcionar bem no celular desde essa entrega.

## Regras e critérios de aceite

- Vencimento contratual, próximo lembrete e data de recebimento continuam sendo informações distintas.
- Adiar uma cobrança retira a parcela da fila de contato até a nova data, mas não apaga seu atraso financeiro.
- Receber parcialmente reduz somente o saldo correspondente; receber integralmente encerra a pendência.
- Vincular pagamento automático existente não cria uma nova entrada.
- Reenvios do mesmo pedido não duplicam recebimentos, devoluções ou registros de cobrança.
- Devoluções reabrem o saldo correspondente quando aplicável e ficam identificadas na história.
- Um contrato de R$ 1.000 com R$ 200 recebidos mostra R$ 800 restantes. Após receber mais R$ 300, mostra R$ 500. Esses valores são exemplos de teste.
- Uma parcela que venceu no mês anterior e foi paga neste mês permanece com o vencimento original, mas o dinheiro aparece nos recebimentos deste mês.
- Um pagamento de outra competência não marca automaticamente como quitadas as parcelas que vencem no mês selecionado.
- Caixa, Financeiro e ficha do cliente apresentam o mesmo saldo e os mesmos recebimentos para o mesmo conjunto de registros.
- Estados vazios explicam a próxima ação: cadastrar plano, identificar pagamento ou ajustar filtros. Ausência de dados não deve parecer uma falha da tela.
- As rotas e ações continuam protegidas por sessão e pelas regras de acesso do banco.
- As telas e os fluxos principais precisam passar por testes em computador e celular, incluindo pagamento parcial, reenvio, devolução, adiar cobrança e identificação de pagamento.

## Rotina esperada

**Ao começar o dia:** abrir Cobrar agora e conferir os pagamentos que chegaram.

**Durante o dia:** registrar recebimentos e cobranças; definir o próximo lembrete quando necessário.

**Ao encerrar o dia:** revisar pagamentos sem identificação e parcelas que continuam aguardando uma ação.

**Uma vez por semana:** conferir as próximas entradas, os atrasos mais antigos e os contratos com plano incompleto.
