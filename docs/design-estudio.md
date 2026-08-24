# O novo design da /estudio

Gramática **papel e tinta**, com a `/vitrine-digital` como referência.
Escrito em 21/08/2026, depois da virada de 14/08 que trocou o sistema de
cor da página inteira.

A /estudio é a home do estúdio (destino do redirect de `/`) e é a página
que ASSINA as outras. Ela era a única que ainda falava outra língua:
quase-branco `#FAFAF7`, esmeralda vivo `#10B981`, preto `#0A0A0A`, vidro
fosco no formulário. As outras três (`/vitrine-digital`, `/e-commerce`,
`/portfolio`) já eram papel, grafite, esmeralda em três tons e rosa de
ação. Quatro páginas do mesmo estúdio, dois sistemas.

Este documento é a régua: o que a página é hoje, por que cada peça é
assim, o que ainda falta e o que nunca entra.

---

## 1. A decisão de fundo

**A /estudio herda a GRAMÁTICA da vitrine, não o ARGUMENTO dela.**

A vitrine é o laboratório: ela recebe tráfego pago frio, mede tudo e
paga o custo de descobrir o que funciona. Cada coisa que sobrevive lá
(a sombra dura, o botão que afunda como carimbo, as duas larguras de
Archivo, a guarda de toque no hover, o campo de linha em vez de campo
de caixa) vira padrão da casa e sobe para cá.

O que NÃO sobe é a metáfora. A etiqueta alfinetada, o furo do ilhó, o
picote do canhoto, o fio de conversa do WhatsApp e o preço de loja
existem porque aquela página vende para dona de loja de roupa e o
objeto mais banal do balcão dela é a prova do produto. Copiar a
etiqueta para cá seria pegar a resposta de outra pergunta.

**O objeto da /estudio é outro: o CARTAZ e a FICHA.** A manchete é
cartaz (lockup de tipo que ocupa a tela e sangra até a borda). O lugar
onde a pessoa age é ficha (papel com filete de tinta, sombra dura,
carimbo na quina, campos em linha). Cartaz convence, ficha coleta. A
página inteira é a costura entre esses dois objetos.

---

## 2. A paleta, em 60/30/10

Tokens em `public/estudio/css/base.css`.

| Token | Valor | Trabalho |
|---|---|---|
| `--paper` | `#F2EFE6` | o chão da página |
| `--paper-2` | `#EAE6D9` | a caixa atrás da sombra dura |
| `--ink` | `#14181A` | tinta: filete, tipo, seção escura |
| `--ink-soft` | `#3A4144` | corpo de texto sobre papel |
| `--green` | `#0C9159` | traço, moldura, grifo grande |
| `--green-dark` | `#076B42` | só texto miúdo sobre papel |
| `--green-live` | `#1FBF7A` | só sobre grafite |
| `--rosa` | `#E31B62` | a ação |
| `--rosa-dark` | `#B81250` | hover e sombra do próprio rosa |
| `--rosa-live` | `#FF5C8A` | só texto miúdo rosa sobre grafite |
| `--linha` | `#D8D3C4` | filete claro sobre papel |
| `--linha-dark` | `#2A3134` | filete dentro do grafite |

A divisão de trabalho:

- **60% papel**: o chão. A página é majoritariamente clara.
- **30% tinta e marca**: grafite estrutura (cabeçalho, seções escuras,
  filetes, tipo) e esmeralda assina (moldura, sinal, grifo, ✓, carimbo).
- **10% rosa**: a AÇÃO. Botão do cartão do hero, botão do briefing,
  pill flutuante e as duas tiras de marquee.

### Por que o esmeralda são três

Porque um esmeralda só não faz os dois trabalhos. O verde vivo da
identidade dá 2,2:1 sobre papel, ilegível como texto.

- `--green` `#0C9159`: 3,5:1 sobre papel. Linha, moldura, ✓, grifo
  grande. Passa nos 3:1 que elemento gráfico e texto grande pedem.
- `--green-dark` `#076B42`: 5,7:1. SÓ texto miúdo sobre papel (rótulo
  de campo, dado em mono).
- `--green-live` `#1FBF7A`: 7,7:1 contra o grafite. SÓ dentro de seção
  escura, onde os dois de cima somem.

**Regra prática:** menos de 18px sobre papel usa `--green-dark`;
qualquer coisa maior, ou que seja linha e não letra, usa `--green`;
dentro de seção escura, `--green-live`.

### Por que o rosa são dois

Mesma história. O `--rosa` foi desenhado para ser lido em BRANCO POR
CIMA (4,57:1 de branco sobre ele). Como texto sobre grafite ele dá
3,5:1, que não passa nos 10px que os rótulos desta casa usam. O
`--rosa-live` existe só para isso (6,1:1 contra o `--ink`) e não serve
em botão cheio nem sobre papel.

**O rosa nunca é a solução de um destaque novo.** Ele já está no botão
do hero, no botão do briefing, no pill e em duas tiras. Destaque novo
se resolve com ESCALA e POSIÇÃO, não pintando mais uma coisa de rosa.

### Os apelidos antigos

`--emerald`, `--off-white`, `--black`, `--line` continuam existindo
como apelidos dos novos, porque são dezoito arquivos de seção
apontando para eles. **CSS novo usa os nomes novos.** Os antigos ficam
para o que já existe e vão saindo quando o arquivo for tocado por
outro motivo.

---

## 3. A tipografia

Três famílias, e cada uma tem um trabalho fechado.

- **Archivo** (`--font-display`), eixo `wdth 62..100` e `wght 400..900`:
  manchete, logo, nome de seção grande, número de passo, assinatura.
- **Inter** (`--font-body`): corpo de texto, e só.
- **JetBrains Mono** (`--font-mono`): rótulo, dado, prova, legenda de
  ficha. Sempre em caixa alta e com entreletra aberta (`.16em` a
  `.24em`), com uma exceção declarada por página no máximo: nota à
  margem em caixa baixa, dita numa voz mais baixa que a do título ao
  lado.

### As duas larguras, e por que isso importa

A Archivo entra com o eixo de LARGURA carregado, não só o de peso. A
página usa **duas larguras e nenhuma outra**:

- **62%** (o extremo condensado): o preparo da frase. Cabe mais palavra
  por linha e é a voz padrão da manchete e da logo.
- **100%** (largura natural), com corpo 16 a 18% maior: a batida final,
  onde a promessa acontece.

No hero isso é literal: `SUA MARCA VENDENDO ONLINE EM ATÉ` a 62%,
`7 DIAS ÚTEIS.` a 100% e 1,18em. É a mesma frase lida em voz alta, com
a ênfase caindo onde cairia. O gancho no código é o `<em>` do config,
que carrega cor, largura e corpo de uma vez.

Duas larguras da MESMA família, e não duas famílias: é exatamente para
isso que existe um eixo variável, e é o que quase nenhuma landing usa.

### A escala

| Papel | Regra |
|---|---|
| Manchete do hero | `min(clamp(3.4rem, 18.5vw, 11rem), 16vh)`, `wdth 62`, `wght 900`, caixa alta, `line-height .9`, `letter-spacing -.04em` |
| Manchete de seção | `clamp(1.9rem, 7.5vw, 4rem)`, condensada, com `<em>` a 100% na batida |
| Palavra gigante (valores, assinatura) | até `11rem`, `wght 800` a `900` |
| Subtítulo (lead) | `clamp(16.5px, 1.35vw, 19px)`, `line-height 1.45`, máx. 40ch, com espinha: o trecho que importa em tinta cheia e peso 600, o resto em `--ink-soft` |
| Corpo | Inter, `line-height 1.5` a `1.6`, `--ink-soft` |
| Rótulo | mono `9.5px` a `10.5px`, `letter-spacing .16em` a `.24em`, caixa alta |
| Campo de formulário | `16px` sempre: abaixo disso o iOS dá zoom sozinho |

Largura de leitura: `--maxw: 1360px` (a mesma das outras três páginas)
e `--pad: clamp(20px, 5vw, 64px)`.

---

## 4. Os nove objetos da casa

Isto é o léxico. Uma peça nova só entra se puder ser descrita com estes
nove; se ela precisar de um décimo, ou o décimo vale para a casa
inteira ou a peça está errada.

**1. O filete de tinta.** `1.5px solid var(--ink)`, nunca 1px, nunca
translúcido. 1px translúcido é hairline de interface; 1,5px de tinta é
traço de caneta. Sobre grafite o filete vira `--linha-dark` ou um véu
de branco a 10 a 18%.

**2. A sombra dura deslocada.** Sempre sólida, sempre para baixo e à
direita (a luz da casa vem de cima à esquerda), nunca desfocada. A
distância diz o tamanho do objeto:

| Objeto | Sombra |
|---|---|
| Botão, cue, item pequeno | `4px 4px 0` |
| Cartão do hero | `6px 6px 0 var(--ink)` |
| Ficha grande (briefing claro, card fundadores) | `8px 8px 0 var(--green)` |
| Aparelho e cartão grande | `14px 18px 0 var(--paper-2)` mais `14px 18px 0 1.5px var(--ink)`: a sombra ganha o próprio filete, é uma segunda folha de papel atrás |

A cor da sombra muda com o chão: sobre papel é tinta; sobre grafite,
tinta sobre tinta some, então vira esmeralda (estrutura, faixa dos
30%); sob objeto colorido, é o próprio tom mais fundo dele. O botão
rosa usa `--rosa-dark`, porque rosa com aresta verde lê como duas cores
brigando, não como profundidade.

**3. O carimbo que afunda.** Todo botão da casa tem a sombra dura, e
ela COLAPSA no clique: `:active { transform: translate(4px, 4px);
box-shadow: 0 0 0 }`. É o gesto de um carimbo sendo apertado contra o
papel. Aplicar em todos não é repetição: um gesto usado uma vez é
enfeite, usado em todos os botões é gramática.

**4. O selo redondo.** Dois anéis concêntricos, o nome do estúdio
curvado no arco de cima, o recado no miolo, a praça embaixo
(`MARINGÁ · PR`): a anatomia exata de um carimbo de cartório. Vive
pendurado na quina de cima à direita da ficha, MEIO PARA FORA
(`top:-16px; right:-14px`), girado uns 13 graus contra o cartão,
`mix-blend-mode: multiply` para a tinta SOMAR com o que está embaixo em
vez de tapar, e `pointer-events: none` porque passa por cima do canto e
não pode roubar toque. Selo que respeita a borda parece impresso junto;
selo que atravessa parece aplicado depois, que é o que ele é.

**5. A tira rosa.** O marquee. Ela aparece DUAS vezes na página (logo
depois do hero e antes do rodapé) e é isso que a torna estrutura em vez
de enfeite: ela fecha o parêntese que abriu. Tipo em Archivo condensada
peso 900 e letras em `--paper`, não em branco: o contraste interno mais
baixo faz a tira ler como campo de energia, não como chamada, e é isso
que impede que ela ganhe do botão. **Toda tira desta casa sobe para a
direita.** Se um dia uma delas for inclinada, é `-3.5deg`, o mesmo da
vitrine, nunca o oposto: duas diagonais em cruz brigam, duas iguais
viram regra.

**6. A régua de conferência.** Lista onde o item fica à esquerda, o ✓
vai para a MARGEM DIREITA e um filete separa linha por linha. É o gesto
de quem passa o dedo por uma lista dando baixa em cada item. Usada no
romaneio do que está incluso e na ficha de entrega de cada case. O ✓
nasce no `::after`; dentro de um flex ele vira item de flex e encosta
sozinho na direita, sem posicionamento absoluto e sem largura
reservada.

**7. A plaquinha gravada.** O fato dentro de seção escura: sem borda,
um véu de branco a 6 a 10%, um fio claro na aresta de cima
(`inset 0 1px 0 #ffffff26`) e um escuro embaixo (`0 1px 0 #00000045`).
Lê como coisa estampada no material em vez de desenhada por cima dele.
É o substituto do chip de contorno, que é o desenho mais genérico que
existe e o oposto do recado numa seção que argumenta "tem uma pessoa
aqui".

**8. O filete duplo do cabeçalho.** Um traço de tinta cheia com um
segundo mais claro logo abaixo (`box-shadow: 0 1.5px 0 var(--ink),
0 4px 0 var(--linha)`). É a régua de tipografia impressa, e é ela que
separa este cabeçalho de um hairline de interface. Vai por `box-shadow`
e não por `border-bottom` porque são duas linhas com um vão entre elas,
coisa que uma borda só não faz.

**9. O campo de linha.** Dentro de um objeto que já tem borda, campo
com caixa vira moldura dentro de moldura. Então o input é
`background: transparent; border: 0; border-bottom: 1.5px solid
var(--linha)`, e no foco o filete engrossa para 2,5px e vira rosa, com
o padding compensando para o texto não pular. O rótulo fica ACIMA, em
mono 8,5px `--green-dark`. Placeholder é exemplo, nunca rótulo.

---

## 5. Os botões: dois trabalhos, e só

| Classe | Cor | Trabalho |
|---|---|---|
| `.nav-cta`, `.cue a`, `.about__cta` | grafite ou contorno de tinta | **LEVA** até algum lugar |
| `.hero-form__btn`, `.btn-submit`, `.pill` | rosa cheio, texto branco | **FAZ** a única coisa que a página pede |
| `.founders__btn` | papel sobre grafite, sombra esmeralda | leva, dentro de seção escura |

Sobre grafite o botão de navegação INVERTE para papel: grafite sobre
grafite some.

**Guarda de toque, obrigatória.** Todo `:hover` da casa vive dentro de
`@media (hover: hover) and (pointer: fine)`. O tráfego é quase todo
celular, e no toque o navegador entrega o `:hover` junto com o toque e
só o solta quando a pessoa toca em outro lugar: o botão fica preso na
cor de hover depois de tocado, o que lê como "travou" bem no momento em
que ele precisa responder. O `:active` NÃO leva guarda: ele é o afundar
de 4px, e é justamente no celular que ele importa.

---

## 6. A página, dobra a dobra

Ordem em `public/estudio/js/main.js`, no array `page`. Para reordenar a
página, muda o array. Cada seção é um módulo em `js/sections/` com o
CSS irmão em `css/sections/`.

### 6.1 Cabeçalho (`header`)

Fixo, 64px, papel a 90% com desfoque atrás, filete duplo embaixo. Logo
em Archivo condensada 62% (a mesma largura do lockup) com `ESTÚDIO` em
mono esmeralda, que é o único ponto de cor de marca acima da dobra que
não é o grifo da manchete. À direita: `SERVIÇOS`, `VITRINE DIGITAL`,
`PORTFÓLIO` e o CTA.

Nada de carimbo, selo, fita ou clipe aqui em cima. Esses gestos moram
na ficha do hero, e repetir qualquer um no cabeçalho transformaria a
assinatura da página em padrão de fundo.

### 6.2 Hero

O ponto onde cartaz e ficha se encontram, e a única dobra que a maioria
vê inteira.

- **Eyebrow**: a tagline virou LISTA, não frase. Eram três categorias
  disfarçadas de frase com pontos no meio; agora são três itens com o
  filete que o `/portfolio` usa na linha de inventário. Quem separa é o
  traço, que é desenho, não pontuação.
- **Manchete**: lockup de cartaz. Cada linha é um bloco justo que o
  `js/lib/herofit.js` mede e escala para preencher a coluna. A ÚLTIMA
  linha mora dentro de uma faixa grafite que sangra até a borda
  esquerda da tela. A escolha da linha não é estética: as duas de cima
  DESCREVEM, a de baixo PROMETE. Dar material diferente para a promessa
  é separar o que a página garante do que ela descreve.
  - A conta do sangramento é `(100vw - largura do wrap) / 2 + respiro`,
    guardada em `--sangria`. O truque comum (`margin-left: calc(50% -
    50vw)`) não serve aqui porque no desktop a manchete é a coluna 1 de
    uma grade, não um bloco centrado.
  - Dentro da faixa o tipo inverte para papel e o grifo sobe para
    `--green-live`.
  - `.hero__line` continua sendo texto puro. Qualquer chip ou selo
    dentro dele entraria na conta de largura do herofit e o lockup
    deixaria de fechar com as linhas de cima.
- **A ficha** (`.hero__bottom`): fundo `#FBF9F3`, e não papel puro,
  porque ela precisa se levantar do chão e um branco de verdade
  brigaria com o grafite da manchete. Filete de 1,5px, sombra
  `6px 6px 0`. É o único objeto com sombra dura acima da dobra, e é
  isso que a destaca sem gastar mais cor: nesta página, sombra dura
  significa "isto é uma coisa, e dá para apertar".
  - Dentro: selo de agenda pendurado na quina, subtítulo com espinha,
    três campos (nome e WhatsApp dividindo a linha, Instagram embaixo),
    botão rosa e a linha de prova em mono.
  - O envio troca o miolo pela confirmação NO PRÓPRIO CARTÃO, com o
    botão de WhatsApp como segundo passo. A pessoa não é jogada para
    outro lugar depois de fazer o que a página pediu.
- **Cue**: o convite para rolar é um OBJETO (quina reta, filete de
  1,5px, sombra dura que colapsa no clique), encostado na margem
  esquerda, no eixo em que a página se lê. Ele É um link, então merece
  dizer isso. A seta desce e volta sozinha, e é a única animação de
  laço da dobra.

### 6.3 Tira rosa (`marquee`), primeira aparição

Fecha o hero e anuncia mudança de assunto. Ver o objeto 5.

### 6.4 Quem somos (`about`)

Rótulo à esquerda, texto editorial grande à direita. O primeiro
parágrafo é a tese, em corpo de manchete; do segundo em diante o corpo
cai para 0,72em, que é o que impede a seção de ter duas manchetes. O
CTA é link com filete esmeralda de 2px embaixo, e no hover ele abre o
vão em vez de mudar de cor.

### 6.5 Assinatura (`brandband`)

O nome do estúdio rolando devagar em Archivo condensada peso 800. Peso
800 e não 900: aqui o nome é assinatura, e assinatura não precisa do
peso máximo. Em Inter 400 (como já foi) ele lia como texto ampliado,
não como marca.

### 6.6 Como funciona (`process`)

A única seção da página em que a ordem é informação de verdade, e por
isso a única que fica com números. A coluna da esquerda é o TRILHO DO
TEMPO: o número em corpo de manchete condensada e, embaixo dele, o
PRAZO daquele passo em mono. O prazo é opcional e só existe onde o dado
é real: ele não inventa promessa, ele desenterra a que já estava no
meio do parágrafo, que é justamente o que o cliente está tentando
descobrir enquanto lê.

Filete de tinta separando passo de passo, e o último fecha com filete
embaixo.

### 6.7 O que está incluso (`included`)

O romaneio: as entregas que saem do estúdio com todo projeto. Duas
colunas, régua de conferência (objeto 6): item à esquerda, ✓ na margem
direita, filete por linha.

**Sem numeração**, e isso é uma decisão: numerar promete sequência, e
esta lista não tem nenhuma. Numerar o que não é sequência é o enfeite
mais fácil de confundir com estrutura, e o "Como funciona" logo acima
TEM sequência de verdade. Dois blocos numerados seguidos apagariam essa
diferença. O dado do número segue no config e volta sem edição se for
preciso.

### 6.8 Trabalhos (`cases`)

Cada projeto num aparelho de verdade: moldura em gradiente de titânio
com brilho interno de 1,5px, barra de status, e a captura da página
rolando dentro. A sombra é a dupla de `14px 18px` com fio de tinta, a
mesma do aparelho da vitrine.

O canto arredondado do aparelho é a ÚNICA exceção à regra de quina reta
da casa, e ela se justifica porque é material autêntico: telefone tem
canto redondo.

Imagens em AVIF e WebP com JPEG de reserva (`scripts/webp-assets.mjs`),
porque cada captura de página inteira tem uns 760KB em JPEG.

### 6.9 Para quem é (`audience`)

Três tipos de cliente, com filete de tinta abrindo cada bloco. Sem
numeração pelo mesmo motivo do romaneio: são três tipos, não três
passos. Na `/landing-page` a mesma seção liga o marcador e vira
"VAZAMENTO 01" em rosa, e ali a numeração é honesta porque a própria
intro anuncia "os três vazamentos mais caros".

### 6.10 Valores (`values`)

Seção escura. Palavras gigantes em Archivo separadas por filete, em
branco a 42% no repouso, acendendo em `--green-live` no hover. O estado
parado precisa se sustentar sozinho: no celular não existe hover, e o
acender é prêmio do mouse, não a única forma de a seção existir.

### 6.11 Fundador (`founder`)

Retrato com o nome estourado por cima e letreiros gigantes ao fundo. É
a peça mais editorial da página, e a que mais precisa de disciplina
para não virar textura de site de agência (ver pendência 6).

### 6.12 Depoimentos (`testimonials`)

Dois vídeos, seção escura. Liga e desliga pelo `enabled` no config.

### 6.13 Projetos fundadores (`founders`)

Seção escura com um cartão central: filete esmeralda de 1,5px, sombra
dura esmeralda de `8px 8px`, ✓ nos benefícios e botão de papel. Tom de
acesso antecipado, nunca de promoção.

### 6.14 Contato (`contact`)

O briefing completo, seção escura. É o caminho de quem quer contar o
projeto inteiro; o cartão do hero é o de quem decidiu na primeira tela
e não vai rolar dez mil pixels. **Os dois gravam na mesma tabela e
disparam o mesmo Lead.**

Esta é a seção que ainda não fala a língua da casa. Ver a pendência 1,
que é a primeira da fila.

### 6.15 Tira rosa, segunda aparição

Fecha o parêntese aberto depois do hero.

### 6.16 Rodapé (`footer`)

Grafite. Redes em mono no topo, praça, barra legal, e o nome da marca
gigante cortado na base, rolando.

### 6.17 Pill flutuante

O CTA fixo. Rosa cheio, sombra dura de tinta, carimbo que afunda. No
celular ocupa 64vw centrado na base; no desktop ancora no canto
inferior direito. Some ao chegar no formulário. O tracking o reporta
como `sticky_mobile` abaixo de 1024px.

---

## 7. Movimento

- **Entrada**: `js/lib/reveal.js` sobe os blocos conforme entram na
  tela. Nada além disso.
- **Regra do estado final**: nenhuma animação define o repouso. O
  estado visível é sempre o CSS base, e as keyframes só descrevem DE
  ONDE a peça vem. Isso não é preciosismo: o bloco de
  `prefers-reduced-motion` mata `animation` com `!important`, e se o
  estado visível dependesse da animação terminar, quem tem "reduzir
  movimento" ligado veria a peça invisível ou torta para sempre.
- **Orçamento de tempo acima da dobra**: se um dia a ficha do hero
  ganhar uma entrada orquestrada (como a etiqueta da vitrine, que cai,
  é alfinetada e carimbada nessa ordem), ela fecha em menos de 0,9s no
  total. A ficha É o formulário: alvo de toque que fica se mexendo por
  um segundo faz quem chegou decidido errar o campo.
- **Laços contínuos**: as duas tiras e a assinatura. Nenhum outro.
- **Hover**: sempre dentro da guarda de toque (seção 5).
- **`prefers-reduced-motion`**: laços param, entradas somem, a página
  continua inteira e clicável.

---

## 8. Acessibilidade

- Contraste conferido, com os números na seção 2. A regra dos três
  esmeraldas existe por causa disso, não por gosto.
- Branco sobre rosa: 4,57:1. O rosa NÃO passa com texto grafite
  (4,0:1), então o botão é branco sobre rosa, nunca o contrário.
- `:focus-visible` com contorno esmeralda de 2px e 3px de folga, na
  página inteira.
- Campo de formulário sempre com rótulo visível acima.
- Input em 16px: abaixo disso o iOS dá zoom sozinho ao focar.
- Peça decorativa que passa por cima de outra leva
  `pointer-events: none` (selo, tiras, letreiros de fundo).
- Alvo de toque mínimo de 44px de altura nos botões e links de ação.

---

## 9. O que não entra

Regras negativas, e elas valem tanto quanto as positivas.

1. **Vidro.** Nada de `backdrop-filter` com borda translúcida de 1px e
   sombra desfocada. Isso é interface de tela; a casa é papel e tinta.
2. **Sombra desfocada.** Sombra aqui é sólida e deslocada. Se precisar
   de profundidade, é sombra dura.
3. **Borrão de gradiente colorido** atrás de seção escura. Já saiu uma
   vez (`.contact__glow`), não volta.
4. **Canto arredondado**, exceto o aparelho dos cases e os 3px de uma
   fita de rótulo. Quina reta é a regra.
5. **Linhas de grid decorativas.** Saíram em 14/08: cinco fios fixos
   que não marcavam coluna nenhuma, competindo com os filetes que
   carregam informação de verdade.
6. **Rosa novo para resolver destaque.** Ele já está em cinco lugares.
   Hierarquia nova se resolve com escala e posição.
7. **Chip de contorno** para fato dentro do escuro. Usa a plaquinha
   gravada (objeto 7).
8. **Glifo de fábrica** (`▶`, `✕`, emoji) em elemento de destaque. Se a
   peça merece existir, ela merece um SVG desenhado.
9. **Numeração em lista que não é sequência.**
10. **Travessão na copy.** Nada de `—` em texto visível: reescreve com
    dois-pontos e vírgulas. Vale para toda a casa.
11. **Uma terceira largura de Archivo.** São duas: 62 e 100. O 78% que
    ainda aparece em manchete de seção e assinatura é herança e deve
    convergir (pendência 7).

---

## 10. Pendências, em ordem

**1. O briefing do contato ainda é vidro.** É a maior dívida e a mais
cara: é a seção que converte. Hoje ela tem `backdrop-filter: blur(24px)`
no cartão, bordas de `1px rgba(255,255,255,.22)`, sombra
`0 24px 60px -24px` e campos com fundo translúcido. Tudo o que a seção
9 proíbe, num lugar só.

O molde já existe: `.form-card--claro` (papel `#FBF9F3`, filete de
1,5px, sombra dura esmeralda de `8px 8px`, campo de linha, rótulo em
mono esmeralda, foco em rosa). Ele está escopado só para o formulário
de um passo, que é o da `/landing-page`. Faltam quatro peças para o
briefing de dois passos caber nele:

- o dropdown customizado (`.dd`), hoje painel de vidro;
- o radio em pílula;
- o `textarea`;
- o stepper de dois passos.

**2. Depoimentos.** O `▶` é glifo de fábrica e o cartão do vídeo não
tem material nenhum: é um retângulo com `overflow: hidden`. A seção
inteira entra na gramática (ficha com filete, sombra dura, nome em
Archivo, função em mono) ou continua desligada até merecer.

**3. Elementos mortos no HTML.** `.grid-lines` e `.contact__glow`, os
dois com `display: none`. Ficaram para não quebrar nada que os
consultasse. Ninguém consulta. Saem.

**4. Os apelidos de token.** `--emerald`, `--off-white`, `--black`,
`--line` ainda aparecem nos arquivos de seção. Trocar todos de uma vez
transformaria uma mudança de cor num diff ilegível, então a troca vai
acontecendo por arquivo, quando ele for tocado por outro motivo.

**5. O loader.** A `/vitrine-digital` tirou o dela em 05/08 e o motivo
está documentado lá: piso de uns 2s em conexão boa e 3,5s no 4G, contra
uma sessão mediana de 8,6s. A /estudio mantém o dela, com a
justificativa de que aqui o visitante já conhece a marca ou chegou por
vontade própria. A justificativa é razoável e o custo é real: vale
medir a sessão mediana desta página antes de decidir de novo, e não
decidir por analogia com a vitrine.

**6. Fundador.** Os letreiros gigantes ao fundo são a peça que mais se
parece com textura de site de agência, que é exatamente o que as linhas
de grid eram quando saíram. Ou eles ganham função (dizer algo que a
seção precisa dizer) ou viram um objeto do léxico.

**7. A terceira largura.** Manchete de seção e assinatura ainda usam
`wdth 78`. Convergir para o par 62 e 100 fecha a regra da seção 3.

---

## 11. Mapa de arquivos

```
public/estudio/
  index.html                    fontes, ordem dos CSS, loader, ponto de entrada
  css/base.css                  TOKENS, reset, botões globais, pill, animações
  css/sections/<nome>.css       um arquivo por seção
  js/config.js                  TODA a copy, cases, depoimentos, WhatsApp
  js/main.js                    a ORDEM das seções (array `page`)
  js/sections/<nome>.js         o HTML de cada seção
  js/lib/herofit.js             mede e escala cada linha do lockup
  js/lib/reveal.js              entrada dos blocos
  js/lib/hero-form.js           captura do cartão do hero
  js/lib/form.js                briefing completo
  js/lib/tracking.js            Meta e Mixpanel
```

Mudança de cor ou de tipo: `base.css`. Mudança de texto: `config.js`.
Mudança de ordem: `main.js`. Mudança de desenho de uma seção: o CSS
irmão dela.

A página é ESTÁTICA, montada por JS no cliente. Não é Next. A rota Next
só faz o redirect de `/`.

Referência viva da gramática: `app/vitrine-digital/vitrine.module.css`,
que carrega o registro de cada decisão e de cada tentativa que caiu.

---

## 12. Como conferir uma mudança

1. `npm run dev` e abrir `/estudio`. Um dev server por vez: dois juntos
   quebram o build.
2. Conferir na largura de 390px antes da de 1440px. O tráfego é
   celular.
3. Tocar em cada botão no celular de verdade e ver se algum fica preso
   na cor de hover. Se ficar, faltou a guarda.
4. Ligar "reduzir movimento" e recarregar: nada pode sumir nem ficar
   torto.
5. `npm run build` e **ler o exit code**, não o texto do pipe.
