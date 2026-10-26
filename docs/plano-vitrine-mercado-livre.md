# Evolução do molde da vitrine a partir do Mercado Livre

Plano de 10/10/2026, ajustado ao escopo confirmado pelo Rafael: vitrine direcionada exclusivamente ao WhatsApp, com home, catálogo, página da peça, painel e Performance. A negociação, o pagamento e a confirmação da venda acontecem com a loja pelo atendimento. As quatro landing pages de venda do estúdio permanecem separadas deste trabalho.

## Base da análise

Foram analisadas as capturas enviadas pelo Rafael, páginas oficiais encontradas na pesquisa e o código atual de `molde-vitrine` e `vitrine-plataforma`. Na primeira tentativa, a ferramenta de pesquisa e o Chrome sem janela retornaram HTTP 403. Em uma nova tentativa com o Chrome visível, a home e a página de ofertas abriram com HTTP 200. Foram inspecionados a busca com sugestões, os cards e filtros de ofertas, os controles das prateleiras, a mudança dos módulos após uma visita e a home em emulação de iPhone 13. Não houve acesso à conta do Rafael.

A listagem de tênis e o produto Kappa aberto a partir das ofertas direcionaram para uma verificação de segurança. Essas telas não foram inspecionadas além da barreira. O planejamento da página da peça continua fundamentado no código do molde e nas demais referências, não em observação direta da página de produto do Mercado Livre.

Os padrões observados são referências para hipóteses de melhoria. Não temos dados internos do Mercado Livre para atribuir aumento de conversão a um componente específico.

Referências oficiais:

- [Página inicial, acessada no Chrome](https://www.mercadolivre.com.br/).
- [Ofertas, acessadas no Chrome](https://www.mercadolivre.com.br/ofertas).
- [Listagem e filtros](https://lista.mercadolivre.com.br/produtos-mais-vendidos).
- [Mais vendidos](https://www.mercadolivre.com.br/mais-vendidos).
- [Custos e promessas de entrega](https://vendedores.mercadolivre.com.br/aprender/nota/como-oferecer-custos-e-promessas-de-entrega-competitivas?guideKeyId=GE94).
- [Compra Garantida e suas condições](https://www.mercadolivre.com.br/compra-garantida).
- [Características e fotos dos anúncios](https://www.mercadolivre.com.br/ajuda/como-posso-anunciar-no-mercado-livre_25316).

### Achados da navegação direta

- A busca está exposta no cabeçalho. Digitar “tenis” abriu sugestões textuais como masculino, feminino, academia e corrida. Para o nosso catálogo, sugerir produtos disponíveis e categorias é uma adaptação proposta, não uma reprodução exata do autocomplete observado.
- Na página de ofertas, atalhos de categorias ficam acima dos resultados e filtros ficam à esquerda no desktop. Os cards se alinham em uma grade de três colunas na largura de 1440 px observada, com fotos de altura uniforme e blocos brancos sobre fundo cinza.
- Os cards de ofertas dão destaque ao preço total, identificam a condição do Pix e mostram o preço em outros meios e parcelas na linha seguinte. A mesma separação deve existir no molde quando os valores diferirem.
- Na sessão sem login, a primeira home apresentou atalhos para pagamento, localização e preço. Após a tentativa de abrir o tênis, a home passou a mostrar “Visto recentemente” e uma fileira “Inspirado no último visto”. É evidência de continuidade sem exigir login nessa sessão; não permite concluir como o histórico é armazenado ou como o ranking é calculado.
- As prateleiras apresentam setas circulares nas bordas e indicadores de páginas; a seta anterior fica desabilitada no início. O link para a lista completa aparece no título de módulos como ofertas.
- A home em emulação real de dispositivo abriu com viewport e largura do documento de 390 px. Apenas reduzir a janela com o navegador identificado como desktop serviu outra composição; por isso a captura inicial de janela estreita não foi usada como referência do comportamento mobile.

Impacto no plano: priorizar busca, card e organização da home; permitir que os módulos de continuidade apareçam conforme a navegação. Não tornar a home uma sequência fixa de todas as funções possíveis. Histórico e sugestões permanecem na segunda etapa, com dados atuais e regras simples adequadas a uma loja.

## Direção

Fazer a cliente encontrar uma peça disponível, entender quanto custa, escolher tamanho e abrir o WhatsApp com uma mensagem que identifique a peça e sua escolha. O objetivo é facilitar um atendimento com contexto suficiente para a loja dar continuidade à venda.

Percurso principal: encontrar peça → conferir fotos, preço e disponibilidade → escolher tamanho/cor quando aplicável → pedir no WhatsApp.

A composição deve manter logo, cores, fotografia e linguagem de cada loja. A densidade de informação do marketplace será adaptada ao tamanho do catálogo e à operação da loja. Favoritos guardam interesse; uma sacola reúne peças escolhidas para pedir pelo WhatsApp. Checkout, conta de cliente e pagamento online ficam fora deste plano. Pix e parcelas são condições comerciais informadas pela loja para o atendimento, não meios de pagamento processados pela vitrine.

## O que já existe no molde

- Busca no cabeçalho, aberta por uma lupa no desktop e disponível no menu no celular.
- Catálogo com marca, tamanho, faixa de preço, ordenação, filtros removíveis e estado na URL.
- O filtro de tamanho já exclui tamanhos esgotados.
- Cards com fotos, cores, grade, desconto real, parcelas, disponibilidade e acesso à peça.
- Prateleiras com setas, movimento automático com pausas e acesso à categoria completa.
- Páginas de ofertas e de mais vendidos. Os mais vendidos são indicados pela loja no painel, não calculados a partir de pedidos.
- Página da peça com galeria, seleção de tamanho, mensagem preenchida, produtos relacionados e dúvidas.
- Faixas de benefícios e garantias com conteúdo configurável.
- Medição de buscas, peças vistas, cliques no WhatsApp e interesse por tamanhos esgotados.

O trabalho deve aprimorar esses componentes antes de criar alternativas duplicadas.

## 1. Busca e navegação

Prioridade alta.

- Campo de busca permanentemente visível: ao lado da marca no desktop e em uma linha própria abaixo do cabeçalho no celular. Reservar altura no layout para evitar saltos.
- Sugestões de produtos e categorias baseadas no catálogo ativo, com foto e nome. Navegação por teclado, Escape para fechar e retorno de foco.
- Atalhos para categorias, novidades, ofertas e destaques. Mostrar apenas caminhos com conteúdo.
- Atalhos de preço opcionais, configurados pela loja e apresentados somente quando houver peças naquela faixa.
- Manter filtros aplicados, tamanho escolhido e posição ao voltar da peça. A ordenação por preço precisa explicar o valor comparado se houver preço diferente no Pix.
- Busca vazia: sugerir remoção de filtros, categorias e peças relacionadas; preservar o aviso de reposição já existente.

## 2. Card de produto

Prioridade alta. Mesma estrutura em home, ofertas, catálogo, favoritos e produtos relacionados.

Ordem proposta:

1. Foto com enquadramento consistente, sem cortar a peça ou a pessoa.
2. Nome em até duas linhas, mantendo o nome completo acessível.
3. Preço vigente total em destaque, com a condição ao lado: por exemplo, “no Pix”.
4. Preço anterior e desconto quando publicados e válidos.
5. Parcela como informação secundária, com preço total no cartão disponível quando diferente do Pix.
6. Tamanhos disponíveis e uma informação de estoque ou entrega relevante.
7. “Ver peça” como acesso aos detalhes; favorito como ação secundária, sem se sobrepor ao link principal. O pedido no WhatsApp acontece depois da escolha de tamanho/cor quando necessária.

No card atual, quando há parcelamento, a parcela vira o preço principal. Além disso, o Pix só é calculado no card quando existe parcela. A revisão deve manter o preço total claro e apresentar um desconto no Pix configurado mesmo quando a loja não parcela.

No máximo dois selos por card. Priorizar informações úteis como desconto e disponibilidade; “Últimas unidades” depende do estoque. Estrelas, contagem de vendas, prazo de entrega e frete grátis só entram com dados ou condições reais. Sem preço publicado, manter o comportamento atual de não inventar valor.

## 3. Estrutura da página inicial

Prioridade alta para organização; módulos adicionais na segunda etapa.

Sequência inicial sugerida:

1. Cabeçalho com busca e navegação.
2. Uma campanha principal, com banner menor no celular e CTA que leve ao catálogo correspondente.
3. Benefícios essenciais em uma faixa compacta.
4. Atalhos para categorias, novidades e ofertas.
5. Oferta em destaque e prateleira de ofertas, quando houver promoções válidas.
6. Destaques ou mais vendidos confirmados pela loja.
7. Novidades e categorias relevantes, sem repetir a mesma peça em todas as primeiras fileiras.
8. Vistos recentemente, quando houver histórico suficiente.
9. Faixa de pagamento, recebimento e trocas; rodapé com contato e informações da loja.

Com catálogo pequeno, juntar módulos e reduzir fileiras. Na primeira visita, não deixar espaço vazio para histórico. A oferta destacada pode ocupar uma coluna e a prateleira as demais no desktop; no celular, usar fluxo vertical. Um acesso geral ao WhatsApp pode oferecer ajuda, mas a ação principal de cada peça deve preservar o contexto do pedido.

Os títulos devem explicar o conteúdo: “Ofertas da loja”, “Chegou agora”, “Continue de onde parou”. Evitar “Oferta do dia” quando não existe prazo definido. Se houver data de término, a oferta precisa expirar também na regra de preço, não apenas na arte do banner.

## 4. Prateleiras e setas

- Manter setas visíveis, com contraste, área de toque confortável e nomes acessíveis. Reservar espaço para não cobrir fotos ou preços.
- Revelar discretamente a próxima peça no celular para indicar rolagem lateral.
- Indicar avanço quando houver mais de uma tela de produtos; remover controles quando todos couberem.
- Manter “Ver todas” junto ao título da fileira, além do acesso ao final.
- Preservar a pausa por interação e a preferência por movimento reduzido. Acrescentar controle explícito de pausa se o automático continuar disponível.
- Testar movimento automático versus manual antes de definir o padrão; não animar vários trilhos ao mesmo tempo durante a leitura.

## 5. Histórico, favoritos, sacola e sugestões

Segunda etapa.

- Vistos recentemente por dispositivo, sem exigir cadastro. Limitar o histórico, permitir limpeza e respeitar a política de armazenamento do site.
- Guardar referências às peças e consultar preço e disponibilidade atuais; não reutilizar um card com preço antigo salvo no navegador.
- Favoritos locais, com coração nos cards e na peça, estado selecionado claro, nome acessível e confirmação discreta. Permitir salvar sem escolher tamanho; a escolha é necessária para montar o pedido. Acesso à lista no cabeçalho, com contador e estado vazio útil. Levar à peça para conferir disponibilidade atual ou adicionar uma variação à sacola.
- Sacola local para reunir uma ou mais peças, com tamanho, cor e quantidade quando aplicáveis. Acesso no cabeçalho com contador. Na peça, manter “Pedir no WhatsApp” como caminho direto e “Adicionar à sacola” como alternativa para continuar escolhendo; guardar um favorito nunca adiciona automaticamente uma peça à sacola.
- Na sacola, permitir revisar variações, alterar quantidades, remover itens e continuar navegando. CTA principal: “Pedir pelo WhatsApp”, abrindo uma mensagem organizada com todas as escolhas e links das peças. Não exigir cadastro ou endereço para abrir o atendimento.
- Conferir preços e disponibilidade atuais ao abrir a sacola e antes de montar a mensagem. Mostrar mudanças e peças indisponíveis com orientação para substituir ou remover; não afirmar reserva de estoque. Limitar quantidades ao estoque conhecido; quando não houver controle numérico, explicar que a disponibilidade será confirmada pela loja.
- Apresentar um subtotal apenas quando todas as peças tiverem preço publicado, com a condição de pagamento usada e frete a combinar separado. Se alguma peça não tiver preço, informar que o total será confirmado no atendimento. Não somar descontos de Pix ou parcelas com regras incompatíveis.
- Histórico, favoritos e sacola pertencem ao navegador e à loja, com limite de armazenamento, validade definida e limpeza disponível. Não prometer continuidade em outro aparelho. Validar a lista antes do envio, limitar seu tamanho e testar a mensagem em Android, iPhone e WhatsApp Web para evitar truncamento.
- Sugestões iniciais por categoria, marca, faixa de preço e disponibilidade. Excluir a peça atual e evitar duplicações. Para catálogo pequeno, uma seleção manual pode ser mais útil que personalização automática.
- Não chamar peças mais clicadas de mais vendidas. Nesta vitrine, as vendas podem ser confirmadas pela loja; a medição automática registra interesse e cliques no atendimento.

Favoritar, adicionar à sacola e pedir diretamente são caminhos independentes. A cliente pode pedir uma única peça sem passar pelos favoritos ou pela sacola. A interface e a análise devem preservar esses caminhos.

## 6. Página da peça e passagem para o WhatsApp

Manter galeria grande, preço total e escolha de tamanho/cor perto da ação principal. CTA proposto: “Pedir no WhatsApp”, com ícone e texto identificando o destino. No celular, a barra de pedido aparece quando o comando principal sai da tela e não cobre a seleção nem as informações da peça.

- Exibir os tamanhos disponíveis e diferenciar os esgotados. Se faltar uma escolha obrigatória, orientar a cliente até o seletor e explicar o que falta, preservando as escolhas já feitas.
- Montar uma mensagem com nome/código da peça, tamanho, cor quando aplicável, preço e condição publicados e link da peça. Exemplo: “Olá! Tenho interesse no vestido Aurora, tamanho M, cor preta, anunciado por R$ 149. Pode confirmar a disponibilidade?” A mensagem deve refletir os dados atuais e não afirmar que uma reserva já foi feita.
- Caso a disponibilidade dependa de confirmação, explicar isso antes de abrir o atendimento. Para tamanho esgotado, manter a opção de aviso de reposição.
- Mostrar atendimento, formas de pagamento aceitas, retirada/entrega e troca em uma faixa curta perto da decisão, com detalhes acessíveis. Informações de frete são condições publicadas ou combinadas com a loja; sem cotação integrada, não prometer um custo ou prazo específico.
- Manter o acesso geral “Falar com a loja” para dúvidas. Na peça, a mensagem contextualizada é o caminho principal.
- Preservar filtros, posição no catálogo e escolhas ao voltar, para a cliente continuar comparando peças.

A faixa de confiança apresenta as condições próprias e verificadas da loja. O fechamento acontece no atendimento; o site não apresenta confirmação de pedido, pagamento ou proteção de compra do marketplace.

## 7. Controle no painel

- Ordem e ativação das fileiras da home, com prévia de desktop e celular.
- Escolha da oferta destacada, datas opcionais e acesso direto à edição do produto.
- Condições de pagamento e recebimento estruturadas, reutilizadas em card, peça e rodapé.
- Seleção manual de destaques, com distinção entre vendas confirmadas pela loja e interesse medido na vitrine.
- Resumo de publicação: fotos, preço, tamanhos disponíveis e condição de pagamento conferidos.
- Prévia da mensagem de WhatsApp com a peça e variação escolhidas; número de atendimento configurado e validado.
- Prévia de pedido com várias peças e explicação de como favoritos e sacola aparecem na vitrine. Os indicadores de interesse entram no Desempenho; os favoritos não são expostos como uma lista de clientes identificados.
- Esconder módulos sem produtos e condições comerciais não preenchidas, mantendo o percurso de pedido pelo WhatsApp.

## 8. Medição e validação

Registrar a origem da visita à peça: busca, oferta, categoria, relacionados ou histórico. Separar a impressão real do módulo de sua simples presença na página. Planejar novos eventos no backend e no esquema de dados antes de acrescentar emissores no navegador.

Indicadores para vitrine:

- Proporção de buscas sem resultado.
- Pessoas que abriram uma peça após usar busca, filtros ou uma fileira.
- Pessoas que clicaram no WhatsApp após ver uma peça; isso mede abertura do atendimento, não mensagem enviada nem venda concluída.
- Interesse em tamanhos esgotados e retorno a peças vistas.
- Visitantes que favoritaram uma peça, adicionaram uma variação à sacola e abriram o WhatsApp a partir de cada caminho.
- Peças com mais favoritos, adições à sacola e cliques no atendimento; tamanhos e cores escolhidos quando informados.
- Escolhas na sacola sem clique registrado no WhatsApp durante a janela analisada. Nomear como interesse sem continuidade registrada, sem presumir desistência ou venda perdida.

No Performance, apresentar o percurso visita → peça vista → clique no WhatsApp, com visitantes únicos estimados pelo identificador anônimo e período explícito. Acrescentar os caminhos opcionais por favoritos e sacola, sem exigir que todos passem por todas as etapas. Mostrar quais peças, buscas e tamanhos geraram interesse e onde deixou de haver continuidade registrada. Usar esses sinais para sugerir ajustes de fotos, descrição, disponibilidade e destaque. Vendas e receita só aparecem se forem confirmadas pela loja, com essa origem identificada. Respeitar a disponibilidade de consentimento para análises.

Sem identificação fornecida voluntariamente pela cliente, a análise acompanha um navegador anônimo, não revela nome ou telefone e não deve juntar dispositivos por inferência. Não criar mensagens de recuperação automática no WhatsApp a partir de favoritos ou da sacola. A passagem ao atendimento continua sendo uma ação da cliente.

Eventos propostos: favorito adicionado/removido, item adicionado/removido da sacola, quantidade alterada, sacola aberta e clique no WhatsApp com origem direta, favoritos ou sacola. Registrar mudanças reais de estado, não cada renderização ou restauração do navegador; deduplicar reenvios e distinguir volume de eventos de visitantes únicos. Associar produto, variação quando escolhida, origem e horário. Contar cliques da sacola uma vez por ação e atribuir suas peças como conteúdo do pedido, sem multiplicar o total de atendimentos pelo número de itens.

Exemplos de leitura no painel: “Esta peça teve 24 visitantes que a salvaram e 6 que clicaram no WhatsApp a partir dos favoritos”; “O tamanho M foi o mais escolhido na sacola”; “18 visitantes adicionaram peças, e 7 clicaram no WhatsApp pela sacola”. Os números são ilustrativos; favoritos indicam interesse e a sacola indica uma escolha mais concreta, mas a diferença de intenção é uma hipótese a validar com o comportamento e o atendimento da loja.

Comparar a versão atual e a nova com origem de tráfego, período e estoque comparáveis. O principal indicador automático é a proporção de visitantes que clicam no WhatsApp a partir de uma peça. Verificar com a loja se os contatos chegam com escolhas úteis ao atendimento. Usar métricas intermediárias para diagnosticar; não declarar um vencedor só pelo aumento de cliques em uma seta.

## Sequência de execução

1. Protótipo de home, card, catálogo, peça, favoritos e sacola em desktop e celular, com preço normal, promoção, Pix, esgotado e catálogo pequeno. Usar dados fictícios marcados no preview.
2. Implementar busca visível, card consistente, prateleiras e organização da home no molde, mantendo a identidade configurável por loja.
3. Acrescentar histórico, favoritos, sacola para pedidos pelo WhatsApp, configuração dos módulos e atribuição de origem no Performance, com suporte de dados antes de emitir novos eventos.
4. Refinar a página da peça e validar as mensagens de WhatsApp com uma ou várias peças, seleção de tamanho/cor, quantidade, disponibilidade, condições comerciais e retorno ao catálogo.
5. Validar com teclado, toque, movimento reduzido, conexão lenta e uma loja piloto antes de distribuir para outros clientes.

Primeira entrega recomendada: busca, card e primeira dobra da home. Ela melhora o percurso básico de compra e permite avaliar a direção visual antes de expandir funcionalidades. A entrega completa inclui favoritos, sacola e sua leitura no Desempenho, conforme o detalhamento a seguir.

## 9. Telas e comportamento definidos

| Tela ou componente | Entrega | Estado que precisa ser resolvido |
| --- | --- | --- |
| Cabeçalho | Marca, busca visível, categorias, favoritos e sacola com contadores | Mobile, lista vazia, armazenamento ainda não carregado, busca sem resultado. |
| Home | Campanha, atalhos, ofertas, destaques, categorias e continuidade contextual | Catálogo pequeno, sem promoção, sem histórico, produto inativo. |
| Catálogo | Grade consistente, filtros existentes, ordenação e favoritos | Filtros combinados, volta da peça, paginação, nenhum resultado. |
| Peça | Fotos, preço, variação, pedido direto, adição à sacola e favorito | Sem preço, tamanho esgotado, disponibilidade a confirmar, escolha incompleta. |
| Favoritos | Lista das peças salvas, remoção e caminho para escolher variação | Nenhum favorito, peça alterada ou removida, armazenamento indisponível. |
| Sacola | Revisão de peças, variações, quantidades e mensagem de WhatsApp | Mudança de preço, item esgotado, total incompleto, erro de atualização. |
| Desempenho | Interesse por peça e caminhos até o WhatsApp | Sem histórico anterior, contagem desligada, dados indisponíveis, pouco volume. |
| Textos e organização do site | Módulos, condições comerciais e prévias | Campos não preenchidos, publicação incompleta, configuração antiga. |

Favoritos e sacola terão páginas próprias (`/favoritos` e `/sacola`) para permitir voltar, atualizar e compartilhar o endereço da tela sem perder a navegação. O conteúdo pessoal permanece neste navegador; compartilhar a URL não compartilha a lista. Na primeira entrega, evitar um modal obrigatório para essas tarefas. Após adicionar uma peça, uma confirmação discreta oferece “Ver sacola” e permite continuar navegando.

O cabeçalho usa uma linha compacta para marca e ações no celular, seguida de busca em largura inteira. Filtros continuam em diálogo no celular, com fechamento por Escape, foco de retorno e aplicação claramente indicada. Na peça, detalhes de entrega e troca podem abrir sob demanda; preço, variação e ação principal permanecem expostos.

Na home, “Continue de onde parou” pode aparecer perto dos atalhos para quem já navegou. Na primeira visita, esse módulo some. Manter as primeiras fileiras distintas e concentrar o catálogo pequeno em menos módulos; a sequência de nove partes acima é uma organização possível, não nove blocos obrigatórios para toda loja.

## 10. Direção visual e linguagem

- Usar tokens de cor, tipo, borda, raio e espaçamento para repetir a mesma linguagem em home, catálogo, peça, favoritos e sacola. Logo, cores e fotografia continuam configuráveis por loja.
- Fundo neutro, áreas de produto bem definidas e contraste entre título, preço e informação secundária. A fotografia recebe mais espaço do que os selos ou o texto promocional.
- Manter uma cor principal para o pedido no WhatsApp. “Adicionar à sacola” recebe tratamento secundário; favorito tem coração com área de toque confortável e estado preenchido. Rosa forte pode entrar como acento quando fizer parte da identidade da loja, sem impor a paleta do estúdio a todos os clientes.
- Foto principal com proporção consistente; usar a apresentação apropriada para roupa no corpo e produto isolado, evitando corte que esconda características da peça.
- Títulos curtos, sem excesso de caixa alta e sem promessas genéricas. Controles de prateleira ficam nas bordas com espaço reservado. Uma indicação da próxima peça ajuda a descobrir o gesto lateral.
- Manter feedback próximo da ação: coração muda de estado; sacola atualiza contador; alteração de preço aparece junto ao item. Evitar popups de urgência e interrupções na primeira visita.
- Áreas de toque propostas de pelo menos 44 px, foco visível, contraste verificável, informação que não dependa só de cor e respeito a movimento reduzido. São critérios do projeto, a validar nas telas.

Copy proposta:

| Situação | Texto |
| --- | --- |
| Busca | “Busque uma peça, marca ou modelo” |
| Card | “Ver peça” |
| Peça, caminho principal | “Pedir no WhatsApp” |
| Peça, continuar escolhendo | “Adicionar à sacola” |
| Confirmação de adição | “Peça adicionada à sacola” |
| Favoritos vazios | “Guarde aqui as peças que você quer ver depois.” |
| Sacola vazia | “Escolha suas peças e envie tudo à loja pelo WhatsApp.” |
| Sacola, ação principal | “Pedir pelo WhatsApp” |
| Confirmação de disponibilidade | “A loja confirma a disponibilidade e combina o envio na conversa.” |
| Preço alterado | “O preço desta peça mudou. Confira antes de pedir.” |
| Valor não publicado | “Valor a confirmar com a loja” |

Preservar o comportamento de cards sem preço, sem inserir “R$ 0” ou um valor inventado. O texto de consulta de valor entra nos detalhes ou na sacola quando necessário.

## 11. Regras de favoritos e sacola

Padrões iniciais propostos para implementação: até 50 favoritos, 20 peças no histórico e 20 linhas distintas na sacola; validade de 90 dias para favoritos, 30 dias para histórico e 7 dias para a sacola desde sua última alteração. Esses limites são decisões de produto revisáveis após o piloto, não limites anunciados do WhatsApp.

Uma linha da sacola corresponde a produto + tamanho + cor escolhida quando aplicável. A mesma combinação incrementa quantidade; outra combinação cria uma linha. O contador do cabeçalho informa a quantidade total de peças, enquanto favoritos conta produtos. Restaurar dados não deve disparar uma nova adição nas métricas.

Guardar IDs estáveis, escolhas e datas em estrutura versionada e identificada por loja. Preços e disponibilidade apresentados vêm de consulta atual; um valor salvo pode apenas ajudar a informar que houve mudança. Erros de armazenamento não interrompem o pedido direto; explicar quando a lista só puder permanecer na aba atual.

O modelo atual contém cores descritivas e estoque por tamanho; não existe garantia de estoque por combinação de cor e tamanho. Tratar a cor como preferência a confirmar quando não houver variação estruturada. Não criar disponibilidade por cor a partir de uma lista de nomes. Produto sem grade publicada mantém a consulta de numeração existente, claramente marcada como disponibilidade a confirmar.

O catálogo público já remove o estoque numérico. A nova sacola não deve expor esse estoque. Uma consulta pública limitada às peças ativas valida escolhas e devolve preços, condições e status suficientes para revisar o pedido. Para quantidades incompatíveis com o saldo conhecido, orientar a correção ou a consulta à loja sem publicar saldos internos.

A abertura do WhatsApp não esvazia a sacola: a vitrine não consegue confirmar se a mensagem foi enviada. Permitir limpeza manual e remoção por item. Não reservar estoque nem registrar uma venda por adicionar à sacola ou clicar no atendimento.

Mensagem de várias peças: saudação, lista numerada com nome/código, tamanho, cor, quantidade, valor anunciado e link; subtotal quando aplicável; pedido de confirmação de disponibilidade e entrega. Usar endereço canônico da peça, sem carregar identificadores de visitante ou texto de análise para a conversa. Para listas longas, testar o link codificado e oferecer cópia do resumo quando necessário; uma nova infraestrutura de pedidos só deve ser considerada se o piloto demonstrar essa necessidade.

## 12. Leitura no Desempenho e valor do Performance

O objetivo do painel é responder: quais peças interessam, quais geram escolhas e quais levam ao atendimento? A experiência funcional de favoritos e sacola independe do contrato de Performance. Recursos de análise respeitam os acessos já existentes; não redefinir preços ou direitos de planos nesta mudança.

Organização proposta da aba:

1. Resumo do período: visitantes, visitantes que salvaram peças, visitantes que adicionaram à sacola e visitantes que clicaram no WhatsApp, com comparação quando houver dados equivalentes.
2. Caminho direto até o atendimento e caminhos opcionais por favoritos e sacola. Não transformar etapas opcionais em uma escada obrigatória que sugira queda inexistente.
3. Tabela por peça: vistas, favoritos adicionados por visitantes distintos, adições à sacola por visitantes distintos e cliques associados ao atendimento. Mostrar também o alcance da peça para contextualizar percentuais.
4. Preferências: tamanhos e cores escolhidos, buscas sem resultado e interesse em esgotados.
5. Ações sugeridas, com a evidência ao lado e acesso para editar a peça ou seu destaque.

Na tabela de interesse, manter as primeiras colunas essenciais visíveis e abrir detalhes da peça para o restante, especialmente no celular. Pouco movimento produz uma explicação simples, sem ranking conclusivo ou percentuais exagerados. Novos indicadores mostram “Contagem disponível desde...” e não inventam histórico.

Exemplos de recomendações condicionais: muitos favoritos e poucos contatos justificam conferir informação, preço e tamanhos; muitas adições sem atendimento justificam revisar disponibilidade e o caminho da sacola; buscas recorrentes sem resultado ajudam a planejar cadastro e seleção. São hipóteses orientadas pelos dados, sem afirmar a causa ou prometer vendas.

Definições iniciais:

| Indicador | Definição |
| --- | --- |
| Taxa de contato da vitrine | Visitantes com clique no WhatsApp a partir de peça ou sacola ÷ visitantes medidos no período. Atendimento geral aparece separado. |
| Interesse em favoritos por peça | Visitantes expostos ao card ou à página da peça que depois a favoritaram ÷ visitantes expostos à peça no período. |
| Escolha na sacola por peça | Visitantes expostos à peça que depois a adicionaram à sacola ÷ visitantes expostos à peça no período. |
| Continuidade da sacola | Visitantes com adição e clique posterior pela sacola dentro da janela ÷ visitantes com adição nessa janela. |
| Conteúdo dos pedidos abertos | Peças incluídas nas mensagens montadas, separadas da contagem de cliques de atendimento. |

Denominador zero mostra ausência de base, não uma taxa inventada. Um favorito restaurado de meses atrás seguido por contato deve aparecer como retorno de interesse anterior; não pode inflar uma taxa cujo denominador considera apenas novas adições da semana. Definir inicialmente uma janela de 7 dias entre ação e contato, com data de corte explícita e indicação quando a janela ainda não terminou.

Favoritar pelo card não exige abrir a página da peça. Portanto, registrar exposição visível dos cards com deduplicação antes de calcular a taxa de interesse por peça; contabilizar só páginas abertas produziria um denominador incompleto. Se essa medição não estiver disponível, apresentar volumes de visitantes que favoritaram e adicionaram, sem fabricar percentuais de exposição. Dados comparativos também devem indicar quando a cobertura de medição mudou.

O relatório do mês pode incorporar as peças que despertaram mais interesse, caminhos até o WhatsApp e ações executadas pelo estúdio. Preservar a comparação antes/depois existente e distinguir interesse, contato e vendas informadas pela loja.

## 13. Implementação nos repositórios e dados

| Local | Responsabilidade |
| --- | --- |
| `Desktop/vitrines/_molde` | Home, cabeçalho, cards, catálogo, peça, favoritos, sacola, estilos e revisão pública das escolhas. |
| `Desktop/vitrines/_plataforma` | Tipos e utilitários compartilhados, conteúdo editável, eventos, painel e leitura do Performance. |
| `rafael-razeira-estudio` | Migrações do Performance central, agregações, relatório e suporte à configuração de lojas. |

Não copiar o molde para lojas existentes durante o desenvolvimento. A instalação de referência usa a plataforma por uma versão publicada; apenas atualizar a branch principal da plataforma não atualiza automaticamente os clientes. A distribuição precisa de versão, compatibilidade e atualização controlada da referência no molde.

Achados técnicos que afetam o plano:

- `CompraProduto.tsx` já monta pedido direto, restaura tamanho e tem barra móvel. Reaproveitar essas capacidades, preservando a consulta de disponibilidade para produtos sem grade.
- O tipo `Produto` distingue dados internos de estoque de estados públicos. Validar a sacola no servidor sem enviar estoque privado ao navegador.
- `medir.ts` aceita hoje visita, peça, WhatsApp, busca e esgotado. A rota `evento.ts` permite somente esses tipos, campos conhecidos e corpo de até 1500 caracteres. Eventos de listas exigem contrato novo, validação e limites explícitos.
- `Medidor.tsx` intercepta cliques em links do WhatsApp. `lerPedido` extrai atualmente a primeira peça e um tamanho da mensagem. Pedido de várias peças deve carregar contexto estruturado, e o emissor novo deve impedir uma segunda contagem pelo interceptador existente.
- A gravação vai ao Performance central por uma chave de loja somente no servidor, com prazo limitado. Atualizar as funções centrais e as consultas antes dos emissores; preservar os eventos antigos e a exclusão do dono, robôs e ambientes de teste.

Contrato de eventos proposto: identificador único da ação, visitante anônimo, tipo, produto/variação quando aplicável, origem, versão do contrato e lista limitada de referências no pedido de sacola. O servidor confere tipos, comprimentos, catálogo, escolhas e origem; o central deduplica por loja + identificador da ação. Não tratar o conteúdo enviado pelo navegador como preço ou estoque oficial.

Uma ação de WhatsApp da sacola registra um atendimento aberto e uma associação de seus itens ao mesmo evento. As consultas de visitantes, contatos e peças precisam contar dimensões diferentes; somar os itens não pode aumentar o número de contatos.

Prever migração aditiva, índices para período/loja/produto e consultas com limites. Permitir que versões antigas continuem enviando o formato atual. Com análise desligada ou indisponível, a cliente continua podendo salvar, selecionar e pedir normalmente. O painel informa ausência de dados, sem transformar falha em zero.

## 14. Entregas e critérios de conclusão

| Etapa | Entrega concreta | Critério para seguir |
| --- | --- | --- |
| 1 — Desenho completo | Preview navegável de home, catálogo, peça, favoritos, sacola e leitura no painel com dados de exemplo | Percursos direto e com várias peças claros no desktop e celular; estados vazios e esgotados representados. |
| 2 — Base da vitrine | Busca visível, cards, prateleiras, home e detalhes refinados | Filtros e pedido atual preservados; preço, foto e tamanho claros; catálogo pequeno funciona. |
| 3 — Guardar e reunir escolhas | Favoritos, histórico, sacola e revisão atual dos itens | Persistência por loja, alterações de preço/estoque e mensagem com várias peças verificadas. |
| 4 — Análise e painel | Backend, novos eventos, indicadores, conteúdo editável e relatório | Eventos únicos, contagem sem duplicação, acessos preservados e dados antigos compatíveis. |
| 5 — Piloto e distribuição | Loja piloto, comparação com base anterior e versão distribuível | Qualidade de atendimento verificada com a loja, testes concluídos e atualização reversível. |

Favoritos e sacola só ativam seus eventos novos depois da entrega do contrato central. O preview pode mostrar as telas do painel desde a primeira etapa, identificando claramente os números fictícios. Desenvolver com recursos ativáveis para desligar sacola, personalização ou análise separadamente se aparecer uma regressão.

Testes necessários para esta mudança:

- Pedido direto com e sem grade publicada, seleção incompleta, esgotado e aviso de reposição.
- Favorito adicionado/removido, retorno à lista, dados expirados ou inválidos e troca de loja.
- Sacola com mesma peça em variações distintas, quantidades, preço alterado, produto inativo, subtotal indisponível e falha de atualização.
- Navegação de volta, filtros, busca por teclado, foco, leitor de tela, toque e barra móvel sem sobreposição.
- Mensagem legível e completa em WhatsApp Web e aparelhos Android/iPhone disponíveis para o piloto; emulação visual não substitui esse teste de integração.
- Clique único na sacola com várias peças, duplicação de eventos, versão antiga do emissor, dono/robôs, central ausente e respeitos aos acessos.
- TypeScript e build em diretório isolado, imagens adequadas, ausência de vazamento de estoque/chaves e nenhum aumento desnecessário do carregamento inicial.

O piloto registra a data da mudança, observa buscas, escolhas e contatos com estoque e tráfego contextualizados e recolhe a avaliação da loja sobre as mensagens recebidas. Com pouco tráfego, usar evidências de uso e acompanhamento por mais tempo; não declarar melhoria por uma oscilação curta. Testar hipóteses em sequência, como posição do módulo de continuidade, apresentação de preço e preferência entre pedido direto e sacola, sem mudar todos os fatores simultaneamente.

## 15. Decisões consolidadas

Vitrine exclusivamente para WhatsApp; pedido direto preservado; favoritos para guardar interesse; sacola para reunir escolhas; ausência de cadastro obrigatório; fechamento e pagamento com a loja; informações comerciais reais; identidade própria em todas as telas; análise de interesse e cliques com limites explícitos; execução no molde e plataforma antes de distribuir para clientes.

## 16. Implementação local — 11/10/2026

A implementação inclui busca com sugestões e teclado, favoritos e histórico por navegador/loja, sacola com variações e quantidades, revisão de preço e disponibilidade antes do WhatsApp, ofertas e destaques sem repetição inicial, controles das prateleiras e configuração em Site → Escolhas e organização da vitrine. O pedido direto continua disponível. A página inicial conserva a identidade e as condições publicadas por cada loja.

Favoritos e Sacola abrem primeiro em um resumo lateral à direita, preservando a página da peça ou do catálogo. Os favoritos mostram até cinco referências, com acesso à lista completa. A sacola permite ajustar quantidades, remover peças e pedir pelo WhatsApp com a mesma conferência de preço e disponibilidade da página completa. O painel mantém o subtotal e a ação de pedir visíveis, adapta-se ao celular e fecha por botão, clique fora ou Esc, com controle de foco e respeito à preferência por movimento reduzido. As páginas completas continuam disponíveis por link direto.

O Desempenho recebeu volumes de visitantes por ação e peça, preferências, recomendações com acesso à edição e continuidade da sacola em uma janela encerrada de sete dias. Percentuais de favoritos por exposição permanecem fora da interface inicial: a cobertura de exposição ainda precisa ser observada no piloto. Os números novos têm data inicial própria. O relatório incorpora interesse por peça com o mesmo token e limite de mês já existentes; um relatório anterior continua acessível pelo seu token, mesmo após o contrato terminar.

A migração aditiva está em `supabase/performance-interesse.sql` e deve ser aplicada depois de `performance.sql`. Os emissores novos verificam a existência do contrato central antes de enviar. Sem a migração, favoritos e sacola funcionam, o atendimento conserva a contagem antiga e o painel informa que a análise nova está indisponível. Nenhuma migração foi executada no banco de produção nesta etapa.

Para a distribuição, publicar uma nova versão da plataforma e atualizar a referência e o lockfile do molde juntos. O molde ainda aponta para a versão publicada `v1.0.2`; os testes locais usam a fonte atual da plataforma. Não publicar o molde com a dependência antiga: ela não contém os módulos novos. Não alterar as lojas existentes em lote; usar uma loja piloto e registrar a data de início.

Prévia isolada: `http://localhost:3390`, com produtos, preços e números fictícios. As imagens e os textos de exemplo do molde não representam uma loja real. O central usado na prévia é local e não grava dados no banco do estúdio.

Validação: TypeScript e builds isolados do estúdio e da vitrine; migração executada duas vezes em PostgreSQL local; isolamento entre lojas e permissões; evento único de sacola com duas peças e um atendimento; limites do mês pelo token; persistência, expiração, entradas inválidas, quantidade agregada por tamanho e subtotal em centavos; revisão antes do envio e falha de atualização; navegação por teclado e telas de 320 a 1440 px. O piloto ainda precisa conferir a mensagem em WhatsApp Web e aparelhos Android/iPhone reais e observar o resultado comercial.
