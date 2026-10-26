# Estoque e pedidos para a vitrine de WhatsApp

**Plano mestre vigente (19/10/2026, tarde):** [A gamificação que roda](PLANO-MESTRE-MOLDE-PERFORMANCE-GAMIFICACAO-PLACAS.md). Sem XP nem recebimentos estruturados: notas de atenção com Feito, a faixa que se perde, o selo na vitrine, placas medidas pelo central e, só se as lojistas disserem que fariam, o Vendi com valor. A fila de interesses deste plano continua, com três estados (novo, atendido, virou venda).

**Unificação planejada em 19/10/2026:** o [plano integrado de molde, Performance e placas](plano-unificacao-vitrine-performance-placas.md) parte desta gestão e define a fila de solicitações, recebimentos estruturados e integração das conquistas. Os novos recursos continuam planejados; o status da entrega operacional abaixo não comprova sua implantação.

Proposta de produto e execução — 11/10/2026. Etapas 1–4 implementadas e verificadas na prévia local. A publicação do pacote compartilhado e a ativação da migração nos bancos de clientes são etapas de implantação; as integrações avançadas da etapa 5 permanecem futuras. Os detalhes de persistência e ativação estão em `_molde/docs/estoque-pedidos.md`.

## 1. Direção recomendada

Criar **Estoque** e **Pedidos** como áreas próprias no painel. Peças cuida da apresentação do catálogo; Estoque cuida das unidades e separações; Pedidos acompanha o atendimento, o pagamento confirmado pela loja e a entrega. Desempenho interpreta resultados e oportunidades, com acesso às ações operacionais.

Objetivo: a dona da loja consegue responder rapidamente “o que posso vender?”, “o que está separado?” e “qual atendimento precisa de mim?”. A primeira entrega deve atender uma loja pequena que fecha vendas pelo WhatsApp e pode também vender presencialmente. Integrações externas são uma evolução conforme a operação da loja piloto.

## 2. O que a pesquisa sustenta

- A Shopify diferencia estoque disponível, comprometido e indisponível. Isso inspira uma separação entre unidades livres e unidades ligadas a um atendimento ou pedido. [Estados de estoque](https://help.shopify.com/pt-BR/manual/products/inventory/fundamentals/inventory-states).
- Os rascunhos da Shopify permitem reservar unidades com vencimento e manter preços negociados. Para nossa operação, isso inspira uma separação voluntária durante o atendimento. [Pedidos em rascunho](https://help.shopify.com/pt-BR/manual/fulfillment/managing-orders/create-orders/create-draft).
- A Nuvemshop oferece histórico por produto e variação, com momento, origem, movimento e motivo. Também esclarece que um carrinho abandonado não reserva estoque. [Histórico de estoque](https://atendimento.nuvemshop.com.br/pt_BR/gestao-inventario/como-visualizar-o-historico-de-estoque-dos-meus-produtos), [Carrinhos abandonados](https://atendimento.nuvemshop.com.br/pt_BR/carrinhos-abandonados/quando-e-gerado-o-carrinho-abandonado-na-loja-da-nuvemshop).
- O Bling distingue reserva, lançamento da saída e sincronização com canais de venda. Isso inspira uma única origem confiável para os saldos e evita descontar duas vezes a mesma venda. [Gestão de estoque](https://ajuda.bling.com.br/hc/pt-br/articles/10448300263575-Gest%C3%A3o-de-estoque-completa).

Estas são referências de organização e consistência. As escolhas abaixo são recomendações para nosso molde; a documentação consultada não demonstra aumento de conversão para nossa operação.

## 3. Base encontrada no código

Na plataforma, já existem estoque numérico por tamanho, operações Vendi/Chegou, separações de uma unidade com nome e WhatsApp opcional, vencimento, liberação, histórico e desfazer de algumas movimentações. As separações ficam na tela Peças. A disponibilidade pública deriva do estoque; as quantidades internas não são expostas no catálogo público.

Arquivos relevantes:

- `_plataforma/lib/tipos.ts`: estoque agregado por tamanho e tipos de reserva/movimento.
- `_plataforma/painel/AjustarEstoque.tsx`: entradas, saídas e separação.
- `_plataforma/painel/Separadas.tsx`: fechamento da separação.
- `_plataforma/lib/acoes-estoque.ts` e `lib/historico.ts`: persistência, movimentos e liberação de reservas.
- `_molde/components/ListaEscolhas.tsx`: conferência dos itens antes do WhatsApp, sem reserva automática.

Limites para a evolução: a contagem não discrimina cor; a separação atual não reúne vários itens em um pedido; movimentação de venda não equivale a registro completo de receita, pagamento ou entrega. Esses pontos precisam de modelo de dados, não apenas de uma nova tela.

## 4. Organização do painel

| Área | Responsabilidade | Ação principal |
| --- | --- | --- |
| Peças | Fotos, descrição, preço, variações e publicação | Cadastrar/editar peça |
| Estoque | Unidades disponíveis, separadas, entradas e ajustes | Registrar entrada |
| Pedidos | Atendimentos registrados, pagamento e entrega | Novo pedido |
| Clientes | Contatos fornecidos à loja e avisos solicitados | Abrir contato |
| Desempenho | Interesse, divulgação e resultados registrados | Identificar próximo ajuste |

Estoque e Pedidos entram juntos no grupo Gestão. Banners e Textos permanecem na organização da vitrine. A análise atual “Procura e estoque” passa a “Procura e reposição”, com links para o item correto em Estoque. Ela interpreta demanda; a contagem é operada em Estoque.

Na página inicial, apresentar até três pendências reais: separações que vencem, pedidos a entregar e variações com estoque baixo. Cada aviso abre uma lista já filtrada. Quando não há pendências, mostrar um estado tranquilo, sem fabricar urgência.

## 5. Tela Estoque

Cabeçalho com título, uma frase curta, busca por peça/código e botão Registrar entrada. A lista é o elemento principal. Filtros: Todos, Estoque baixo, Esgotados, Separadas e Sem contagem. Reservas e movimentações têm visualizações próprias dentro desta área.

Resumo superior: unidades disponíveis, unidades separadas e variações que precisam de reposição. Todos os números deixam claro se representam unidades, variações ou pedidos; produtos sem contagem não entram como zero.

Cada linha mostra foto pequena, nome, código, tamanho/cor, quantidade disponível, quantidade separada e estado. Expandir uma peça mostra sua grade; no celular, a mesma informação vira uma lista de linhas curtas. Ao selecionar uma variação, abrir um painel lateral com os saldos, entradas/saídas, separações relacionadas e histórico.

Ações: Registrar entrada; Registrar venda rápida; Separar para cliente; Corrigir contagem. Entrada aceita quantidade e observação opcional. Ajuste absoluto mostra saldo anterior, novo saldo e motivo antes de salvar. Venda rápida registra o canal e permite preencher valor/cliente, sem obrigar um cadastro completo. Um registro sem valor não entra nas métricas monetárias.

Usar estoque mínimo configurável por variação. “Última unidade” depende da quantidade disponível real. “Esgotado” significa indisponível para venda, enquanto “Sem contagem” significa que a loja confirma a disponibilidade. Quantidades pequenas não ficam todas vermelhas; alertas pedem decisões específicas.

## 6. Regras dos saldos

No detalhe interno, separar:

- **Na loja:** unidades fisicamente em mãos.
- **Reservadas:** unidades separadas em atendimentos ainda não pagos, dentro do prazo.
- **Vendidas a entregar:** unidades de pedidos confirmados que ainda não saíram.
- **Indisponíveis:** avarias ou outros bloqueios registrados.
- **Disponíveis:** na loja menos reservas, vendas a entregar e indisponíveis.

Na lista diária, “Separadas” reúne reservas e vendas a entregar, com o detalhamento no painel lateral. Isso mantém a leitura curta sem perder a precisão.

| Evento | Efeito operacional |
| --- | --- |
| Favoritar ou adicionar à sacola | Nenhuma alteração de saldo |
| Abrir WhatsApp | Nenhuma alteração de saldo |
| Registrar atendimento | Nenhuma alteração até a loja separar ou confirmar a venda |
| Separar com prazo | Reduz disponível e aumenta reservado |
| Confirmar pagamento de uma reserva | Converte reservado em vendido a entregar; disponível não cai novamente |
| Confirmar venda sem reserva | Confere e compromete o disponível na mesma operação |
| Marcar enviado ou entregue na retirada | Registra saída física e libera o compromisso correspondente, sem outra baixa do disponível |
| Cancelar antes da saída | Libera unidades comprometidas; situação do reembolso é registrada separadamente |
| Expirar reserva não paga | Libera a reserva uma única vez |
| Registrar devolução | Só devolve saldo após recebimento e avaliação da peça |

Exemplo: três unidades na loja; uma separada deixa duas disponíveis. O pagamento mantém duas disponíveis. A entrega deixa duas na loja e duas disponíveis. A mesma unidade não é descontada na separação, no pagamento e na entrega como três vendas diferentes.

A loja escolhe um prazo de separação, com atalhos como Hoje ou Até amanhã e opção de horário próprio. Após pagamento confirmado, a unidade sai da rotina de expiração. Pagamento informado depois de uma reserva vencer exige nova conferência; nunca confirmar estoque que já foi usado em outro pedido. Vencimentos usam o fuso da loja e precisam de liberação confiável no servidor, com reconciliação nas leituras.

Uma peça não precisa adotar contagem numérica. O modo Sem contagem preserva o pedido pelo WhatsApp, mas não oferece garantia numérica ou uma reserva técnica de unidade.

## 7. Tela Pedidos

Começar com lista e filtros por etapa, data, cliente e código. Detalhes abrem à direita; no celular, ocupam a tela. Visão em quadro pode ser uma opção posterior, se a loja piloto preferir trabalhar assim.

Quatro filtros principais: **Em atendimento**, **Aguardando pagamento**, **A entregar**, **Concluídos**. Cancelados ficam acessíveis em um filtro adicional. Pagamento e entrega são estados separados: um pedido pago pode continuar aguardando retirada ou envio.

O pedido reúne referência curta, cliente quando conhecido, contato opcional, canal, itens com variação/quantidade, valores combinados, desconto, entrega/frete, observação, situação financeira, situação de entrega, prazo da reserva e histórico. Endereço só é solicitado quando a entrega exige. Não pedir CPF, e-mail ou cadastro à cliente apenas para abrir a conversa.

Mostrar uma ação principal conforme a etapa: Separar peças, Confirmar pagamento, Marcar enviado ou Confirmar retirada/entrega. Ações alternativas ficam próximas, com consequências claras. O botão WhatsApp abre a conversa para a pessoa enviar; não dispara mensagens automaticamente.

Na primeira entrega, pagamento é confirmado pela loja. O texto indica essa origem. Anexar comprovante não confirma automaticamente a liquidação. Não apresentar processamento de Pix/cartão sem uma integração real.

O pedido guarda o preço negociado e seus itens como um registro próprio. Mudar o preço do catálogo não reescreve pedidos existentes. Devoluções, cancelamentos e alterações preservam histórico; registros financeiros não desaparecem ao apagar uma peça.

## 8. Como o pedido entra no painel

**Primeira entrega:** a loja cria um pedido simples durante o atendimento, escolhendo os itens. Isso já permite acompanhar separações, pagamento e entrega. A venda presencial também entra por este caminho ou pela ação rápida.

**Segunda entrega:** a mensagem montada pela vitrine inclui uma referência curta, como Solicitação VT-1042. A loja encontra a referência no painel e confirma que recebeu o atendimento, aproveitando os itens sem redigitar.

A solicitação gerada na saída para WhatsApp é uma lista de interesse identificada por código. Ela fica separada dos pedidos confirmados, não reserva estoque e não comprova mensagem enviada. Nome e telefone não são inferidos do navegador; são informados no atendimento. Referências devem ser difíceis de enumerar no acesso público, com limites e validade, e a consulta completa fica autenticada.

Não colocar todos os cliques anônimos na lista principal de Pedidos. Integração oficial para receber mensagens pode ser avaliada depois, com escopo e custo próprios. O MVP não depende dela.

## 9. Valor para o Performance

Preservar duas camadas: interesse medido na vitrine e vendas registradas pela loja. Acrescentar peças/variações vendidas, receita registrada, ticket de pedidos com valor conhecido, reservas que viraram venda, cancelamentos e devoluções registrados.

Recomendações combinam interesse e disponibilidade: uma variação procurada e esgotada merece atenção; uma peça com vendas registradas e poucas unidades disponíveis merece revisão de reposição. A primeira versão explica os sinais usados. Quantidade ideal de compra, dias de cobertura e curva ABC exigem vendas históricas, dias efetivamente disponíveis, custos e prazos de reposição suficientes.

Uma taxa de solicitação para venda só é calculada para solicitações vinculadas e uma janela declarada. Vendas presenciais ou de outros períodos não entram no numerador de cliques da vitrine. Sem cobertura suficiente, mostrar os volumes e a incompletude, sem inventar taxa, lucro ou venda perdida. Pagamentos e reembolsos confirmados são distinguíveis para não inflar receita.

Controle operacional básico de estoque/pedidos deve funcionar independentemente da análise paga. Performance agrega interpretação e acompanhamento. No e-commerce futuro, pagamentos integrados podem alimentar o mesmo modelo de pedidos. Preços e condições comerciais dos planos não são alterados por este planejamento.

## 10. Design e usabilidade

Manter papel claro, tipografia e espaçamento do painel, verde nas ações principais e rosa forte em pequenos acentos de identidade. Texto e ícones identificam estados mesmo sem cor. Uma ação principal por contexto, campos secundários sob demanda e listas filtráveis.

Detalhes laterais preservam busca, filtros e posição. Foco é controlado e devolvido ao fechar; teclado, toque e movimento reduzido são atendidos. Mudanças rápidas têm confirmação próxima da ação. Operações em lote mostram uma revisão antes de salvar. Repetir uma requisição não repete a venda. Falhas mantêm o preenchimento e explicam como tentar novamente.

## 11. Modelo técnico e migração

Criar variações com identidade estável e código próprio, pedidos/itens, reservas vinculadas aos itens e movimentações relacionadas às operações. Valores monetários são gravados em centavos; itens guardam descrição, variação e preço negociados. Alterações importantes têm momento, origem e operação relacionada. A identificação individual do responsável depende de contas individuais; a senha compartilhada atual não permite afirmar qual funcionário agiu.

Continuar o modo agregado por tamanho quando a loja não distingue cor. Ao adotar tamanho + cor, solicitar conferência da distribuição: cinco unidades de M não viram automaticamente cinco de M preto e cinco de M rosa.

Na migração, o saldo atual já foi reduzido pelas separações. Reconstruir saldos e converter reservas abertas com reconciliação, sem baixar novamente ou aumentar disponibilidade indevidamente. Preservar histórico e os links existentes. Não adotar o novo controle de saldo como substituição silenciosa da regra antiga.

No ambiente de produção, reserva, confirmação, cancelamento e expiração precisam ser transações com validação de saldo e proteção contra operações repetidas. Usar a persistência de servidor e isolamento entre lojas; arquivos locais ficam para prévia/testes. Invalidar o catálogo e revalidar a sacola após alterações.

Se a loja já utiliza ERP, definir se ele será a autoridade dos saldos antes da integração. Não manter dois controles independentes prometendo sincronização. Integração começa com vínculo das variações, direção dos ajustes, tratamento de falhas e reconciliação.

## 12. Ordem de execução e critérios de aceite

1. **Estoque dedicado:** nova navegação, lista/grade, filtros, entradas, ajustes, separações e histórico. Reaproveitar o que já existe, sem prometer pedidos completos nesta etapa.
2. **Pedidos e saldos coerentes:** modelo e migração validados; vários itens, reserva com prazo, pagamento manual, entrega, cancelamento e venda presencial. Lançar esta etapa junto das regras transacionais que a sustentam.
3. **Referência da vitrine:** recuperar itens pelo código da solicitação, preservar pedido direto e coletar dados pessoais apenas no atendimento.
4. **Performance:** leituras de vendas registradas, reservas, disponibilidade e reposição, com origem e limites explícitos.
5. **Evoluções conforme uso:** importação CSV com prévia, exportação, trocas parciais, equipe, ERP, pagamentos e logística integrados. Conferência e reversão básica de uma operação errada existem desde a primeira entrega; casos parciais avançados podem esperar.

Validar: dois atendentes tentando reservar a última unidade; pedido com várias variações; repetição de confirmação; vencimento concorrente com pagamento; pagamento tardio; cancelamento antes/depois da saída; devolução parcial; produto sem contagem ou sem preço; alteração do catálogo após negociação; preservação das reservas antigas; falha e retomada; isolamento entre lojas; comportamento em 320–1440 px, teclado e leitores de tela.

Na loja piloto, acompanhar tempo para registrar uma venda, divergências entre estoque contado e registrado, pedidos com registro de pagamento/entrega completo, reservas vencidas e utilidade das sugestões. O sucesso inicial é reduzir trabalho e divergências, com resultados observados, não uma promessa antecipada de aumento de vendas.
