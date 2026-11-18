# Revisão de direção visual

Aplicação da skill frontend-design em 18/11/2026. Escopo: refinar a prévia local com o acervo já pesquisado.

## Diagnóstico

- A abertura reserva quase 400 pixels ao cabeçalho e ao texto antes da fotografia no desktop. A composição da foto só aparece por inteiro após rolar.
- A capa do estúdio transforma uma fotografia horizontal em um recorte quase quadrado ou vertical, escondendo a relação entre os móveis.
- No celular, nome do projeto e localização disputam a mesma linha; “Estúdio em Santa Fé” fica quebrado de forma pouco natural.
- Muitas seções usam título grande, rótulo pequeno e duas colunas semelhantes. A repetição enfraquece a hierarquia.
- Há fotografias reais disponíveis que só aparecem após abrir a galeria. A Casa Ville pode receber um tratamento próprio.

## Sistema e composição antes de implementar

Cores: papel #F7F6F2, grafite #34372F, texto secundário #595D53, pedra #E9E6DE, divisórias #CFCEC4. A paleta solicitada continua adequada às fotos reais; não será tratada como identidade oficial.

Tipografia: Bodoni Moda para abertura, nomes de projetos e títulos principais. Manrope para leitura, navegação e títulos de serviços. Corpo de 15 pixels no desktop e 14 no celular; metadados com contraste suficiente. O nome da Paula ganha presença na seção de apresentação.

Layout atual: abertura fotográfica; Casa Ville com fotografia à esquerda e contexto e ações à direita, dentro do mesmo fundo; dois projetos complementares com fotografias horizontais e textos em quadros consistentes; retrato e nome da Paula; serviços e assuntos da conversa inicial nas mesmas colunas. Conteúdo limitado a 1180 pixels, intervalo principal de 72 pixels e 44 no celular.

```text
fotografia real em toda a abertura
marca                         navegação / orçamento
título / apresentação / ações

Projetos selecionados                 contexto
Casa Ville: foto geral     nome / descrição / escolhas / ações
                          mesmo quadro de fundo

Estúdio, foto horizontal   Cozinha, render
descrição                 descrição

Retrato                    Paula Martins / bio
Serviços                   lista expansível
Conversa inicial           assuntos da conversa
Contato                    WhatsApp
```

Princípios: a Casa Ville orienta a composição, com as demais vistas acessíveis na abertura e na galeria; todos os recortes respeitam o ambiente e podem abrir exatamente a imagem selecionada; a seção de Paula identifica a profissional pelo nome; o rodapé concentra a chamada principal, com atalho de contato no cabeçalho móvel.

## Revisão do plano

Off-white e serifas são escolhas explícitas do briefing. O aspecto genérico vinha principalmente da repetição de títulos e divisões, não da paleta em si. A revisão mantém cores e fontes, mas cria uma hierarquia entre a matéria principal, os projetos complementares e as informações de serviço. Não acrescenta animações ou decoração.

Nenhuma nova informação profissional, etapa de atendimento ou imagem foi inventada. O processo permanece uma sugestão separada para validação.

## Resultado da revisão

### Formulário de orçamento

Os oito pontos de solicitação usam um modal nativo com a mesma paleta e tipografia do site. Nome, cidade/estado, serviço desejado e descrição compõem um resumo curto. O botão “Continuar no WhatsApp” descreve o próximo passo, preserva o projeto que motivou o contato e permite à pessoa revisar a mensagem antes de enviá-la.

O modal cabe no celular, recebe o foco no primeiro campo, mantém o teclado dentro dele e devolve o foco à origem ao fechar. Quando aberto sobre uma galeria, fechar o formulário preserva a fotografia e a galeria. Não foi acrescentado banco de dados ou armazenamento local para esses campos.

### Conteúdo e exploração dos projetos

A Casa Ville recebe três leituras curtas: pedido dos moradores, iluminação direta e indireta e ambientes para a rotina. São informações verificadas na matéria de origem e nas fotografias. O layout usa uma faixa de texto vinculada ao próprio projeto, preservando sua hierarquia e as famílias tipográficas.

Galerias: miniaturas com estado selecionado, legendas vinculadas a cada imagem, deslize horizontal com preservação do gesto vertical e contato contextual por projeto. As mensagens são apenas preparadas em links, sem envio automático.

A bio é uma redação editorial mais específica, apoiada nos trabalhos apresentados. A validação da Paula e os originais que não foram encontrados publicamente estão descritos em `MATERIAIS-PAULA.md`. A imagem da área social foi visualmente conferida e substituída pela versão pública de 2048 × 1366 pixels.

### Abertura fotográfica

O usuário identificou falta de impacto visual na abertura. A nova composição concentra a mudança na primeira tela: fotografia real em toda a área, cabeçalho integrado à imagem, título curto em escala maior e seleção manual de três ambientes da Casa Ville. A paleta de papel, grafite e pedra continua no corpo da página; na abertura, o texto usa o papel sobre a fotografia com contraste controlado. A seleção não avança sozinha e respeita a preferência de movimento reduzido.

```text
fotografia real em toda a abertura
marca branca                      navegação

O seu jeito
de viver.                         foto visível
apresentação / conhecer projetos

Casa Ville                 gourmet / suíte / social
crédito da fotógrafa
```

Essa composição permite comparar usos diferentes do mesmo imóvel sem recorrer a novas imagens, referências alheias ao portfólio ou elementos gráficos decorativos. O título é uma proposta editorial, sem atribuição como fala da profissional.

### Coesão entre as seções

O usuário identificou que a página parecia solta. A revisão agrupa foto, descrição e ações por projeto, incorpora as escolhas da Casa Ville à sua coluna de texto e retira a imagem menor avulsa da suíte da página principal. Todas as fotografias permanecem acessíveis na galeria.

Os dois projetos complementares compartilham proporções, bordas, preenchimento e posição das ações. Serviços e conversa inicial seguem as mesmas colunas da apresentação; o contato final reúne o convite e o orçamento em duas colunas próximas. No celular, cada conjunto se empilha mantendo seus elementos unidos.

As capturas de 1440 e 390 pixels foram examinadas após a mudança. Foram preservados os materiais reais, a curadoria de 12 imagens, as fontes e o modal de orçamento. O fechamento do modal originado no menu móvel devolve o foco ao botão Menu após concluir o evento nativo de fechamento.
