# Acompanhamento de melhorias da vitrine

O painel registra alterações de peças, estoque, textos e banners, além de guardar o estado das prioridades, a frequência das ofertas e os eventos dos fluxos de edição.

Para instalações existentes, aplique estas atualizações pelo SQL Editor:

1. No **banco da vitrine**, execute `supabase/migrations/0013_painel_crescimento.sql`, disponível no repositório `molde-vitrine`. A instalação precisa ter a autenticação da migração 0010. Os registros são privados e só o dono da loja pode consultar ou alterar.
2. No **banco da vitrine**, execute também `supabase/migrations/0014_frequencia_ofertas.sql`, depois da 0013. Ela guarda a frequência por conta e reserva a apresentação da oferta em uma operação atômica, para evitar duas janelas automáticas em aparelhos diferentes.
3. No **banco central do estúdio**, execute [performance-crescimento.sql](./performance-crescimento.sql), depois de `performance.sql`. A função utiliza a chave privada da loja e exige Performance liberado.

Os scripts podem ser executados novamente. Não alteram o catálogo, pagamentos ou permissões das tabelas existentes. O instalador completo do molde já inclui as migrações da vitrine.

Sem a 0013, as tarefas, a frequência e as últimas alterações permanecem apenas no navegador usado pelo dono, em cookie privado. Eventos aguardam essa migração. Com a 0013 e sem a 0014, a frequência utiliza a tabela, mas a garantia de reserva atômica entre aparelhos depende da 0014. Sem a função no central, o painel apresenta o histórico sem números de comparação.

A oferta automática aparece somente no Início, a partir de uma segunda sessão registrada, com peça publicada e movimento real da vitrine. A primeira abertura, inclusive manual, suspende a apresentação automática por 30 dias. Fechar ou escolher “Agora não” reinicia esse prazo. A oferta continua disponível pelo convite discreto do painel. Outra oferta não contorna a suspensão. Campos em edição, outra janela aberta e abas em segundo plano impedem a interrupção automática. A sessão do navegador expira após 30 minutos sem passagem pelo convite.

Os rascunhos de peças, textos e banners ficam no `sessionStorage` da aba por até 48 horas. A restauração depende da escolha do usuário. Não publicam alterações nem reservam estoque. Após um salvamento confirmado, o rascunho é removido; as verificações de concorrência do estoque continuam sendo feitas no servidor.

Uma comparação usa sete dias antes e sete dias depois da alteração. Precisa de contagem iniciada pelo menos sete dias antes do ajuste. Na análise de uma peça, a taxa considera os visitantes que viram essa peça na mesma janela e depois clicaram no WhatsApp. Cliques repetidos da mesma pessoa contam uma vez. Amostras pequenas recebem uma observação na interface.

Os eventos `visualizou`, `abriu`, `dispensou` e `aprovado` ficam em `painel_crescimento`, com serviço, local e data. `aprovado` é o aviso recebido do checkout pelo painel; a confirmação financeira continua sendo responsabilidade do backend de pagamentos.

Os eventos de edição usam `fluxo` (`peca`, `textos` ou `banner`), `evento` (`iniciou`, `salvou`, `falhou`, `abandonou` ou `restaurou`) e `duracao` em milissegundos, limitada a uma hora. Não incluem o conteúdo dos campos. Permitem avaliar conclusão, falhas e tempo dos fluxos sem expor dados de clientes. O evento `abandonou` indica saída antes de salvar; o usuário ainda pode ter um rascunho disponível.

Pedidos pagos, faturamento e abandono de checkout precisam dos eventos reais do e-commerce. O painel não deriva vendas a partir de cliques no WhatsApp.
