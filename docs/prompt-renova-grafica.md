# VITRINE: Renova Gráfica

> Compilado à mão na gramática de `lib/producao/compilador.ts`, porque a oficina
> lê catálogo de loja de roupa (foto do Instagram, numeração, cor) e uma gráfica
> vende FORMATO e MEDIDA, não peça fotografada. As dez seções são as mesmas, na
> mesma ordem, com as mesmas travas.
>
> **O que ainda não foi respondido pelo cliente está na seção 7 como PROIBIÇÃO,
> nunca como lacuna.** Campo vazio em briefing é convite para inventar.

---

## 1. A loja

- Nome: Renova Gráfica
- Contato conhecido: castrocyran@gmail.com (consultor de vendas)
- Instagram: não informado. Não invente arroba, não coloque ícone de rede social
  apontando para lugar nenhum.
- Cidade: não informada. Não escreva cidade, bairro nem "atendemos toda a região".
- WhatsApp: não confirmado. Ver seção 9.
- O que ela faz, palavra por palavra do cartão do cliente: panfletos, cartão de
  visita, cardápios, cavalete, toldos, camisetas, wind banner, calendário,
  convites, adesivos e banners, imã de geladeira, fachada em ACM e lona, criação
  de logotipo, pastas, envelopes. O cliente acrescentou na conversa: placa de ACM,
  placa de PVC e lona.

## 2. Tokens

```css
:root {
  --tinta: #FEE205;        /* o amarelo do cartão, medido no arquivo */
  --apoio: #050505;        /* o preto da logo */
  --fundo: #050505;
  --texto: #EDEBE4;
  --texto-fraco: #9AA09C;
  --linha: #2A3134;
  --hero: #FEE205;         /* a faixa de abertura, e só ela */
  --hero-texto: #050505;
}
```

Superfície: **preto puro**. Use esta receita no body, e nenhuma imagem de fundo:

```css
background: #050505;
```

### Por que o fundo é preto se a referência é amarela

A referência que o cliente mandou é um cartão de visita: amarelo chapado, oito
palavras por coluna, lido em três segundos com o cartão na mão. Esta página é
lida com o olho parado, e ela tem tabela de medida, gramatura e quantidade
mínima. `#FEE205` como fundo de leitura longa não se lê.

O amarelo não perde espaço, ele muda de papel: **a faixa do hero é amarela de
borda a borda**, e o resto da página é preto com o amarelo como tinta de
manchete, de régua e de botão. Quem chega vê a mesma marca do cartão na primeira
tela, e consegue ler a segunda.

Onde o amarelo entra depois do hero: número de medida, filete acima do título de
seção, fundo do botão de orçamento. Em nenhum outro lugar. Amarelo em texto
corrido sobre preto vibra e cansa.

## 3. Tipografia

- Par: **Archivo + Inter**. A primeira família é a display (manchete, nome das
  seções, medida em destaque); a segunda é o corpo, e só.
- Display em caixa alta apenas nas manchetes, peso máximo da família, tracking
  negativo leve (-0.01em).
- Corpo em 15 a 16px, entrelinha 1.5, tracking zero.
- Rótulos e dados (medida, gramatura, material) em caixa alta, tracking 0.14em,
  corpo pequeno.
- A logo traz um serifado dentro dela ("RENOVA" em caixa alta com tracking
  largo). Não tente casar a display com esse serifado e não procure a fonte da
  logo: a logo entra como arquivo, e o contraste entre ela e a grotesca do resto
  é proposital.

## 4. A forma

- Catálogo curto: 17 itens.
- **Não existe foto de produto.** Nenhuma. O catálogo é tipográfico: cada item é
  uma ficha de especificação, não um card com imagem. Não use ícone genérico de
  banco de imagem, não use ilustração, não gere imagem para preencher card, não
  deixe caixa cinza de placeholder. Uma ficha bem composta em tipografia resolve
  melhor que dezessete ícones de linha iguais.
- O item varia por **FORMATO e QUANTIDADE**: mostre os formatos disponíveis por
  extenso, com a medida em centímetros, e leve o formato escolhido para a
  mensagem de orçamento.
- **Nenhum item tem preço definido**: escreva "sob orçamento" no lugar do preço,
  em todos. Não invente valor, não escreva "a partir de", não escreva faixa.
- O clique no item abre a peça em **modal**, com a tabela de medidas inteira e o
  botão de orçamento dentro. Sem página própria: dezessete rotas para dezessete
  fichas é manutenção que ninguém vai fazer.
- O catálogo tem 5 categorias: agrupe por elas e use os nomes que vierem no JSON.

**Arquétipo: FICHA** (catálogo pequeno com muita informação por peça)

Lista vertical com uma peça por linha em telas pequenas e duas colunas acima de
900px. Cada peça mostra nome, material, acabamento, a lista de formatos por
extenso e a quantidade mínima, mais tabela de medidas quando houver. Sem filtro;
a informação por peça é o que a página vende.

Onde a descrição do arquétipo discordar das respostas acima, as RESPOSTAS mandam:
elas são desta loja, a descrição é um molde. Em particular: onde a Ficha pede
foto, aqui não tem foto, e o lugar dela é ocupado pela medida composta grande.

## 5. O hero

A primeira tela é tipográfica, dentro de uma faixa `--hero` de borda a borda: a
logo do leão coroado em preto, centralizada ou à esquerda, com altura entre 96 e
140px, e o nome RENOVA GRÁFICA composto na display, em caixa alta, ocupando de 70
a 90% da largura, em uma ou duas linhas. NENHUMA foto de fundo e nenhuma foto
sangrando. Sem foto nenhuma nesta tela. O texto de posicionamento fica sob o
nome, em corpo, em uma linha.

A faixa amarela termina, e o preto começa: o corte entre as duas é reto e sem
degradê.

### A marca na tela

Existe arquivo de logo em alta (PNG do leão coroado, preto sobre transparente).
Use ele. Não vetorize de novo, não redesenhe, não gire, não aplique sombra, não
aplique contorno e não coloque o leão dentro de círculo. Sobre a faixa amarela
ele vai em preto puro; se em algum outro lugar da página a logo aparecer sobre
preto, use a versão invertida em `--tinta`, nunca em branco.

Não use o leão como marca d'água de fundo, não amplie ele para além de 30% da
largura da tela e não repita ele em textura.

### O orçamento da dobra

Referência de viewport: 380 × 820. O hero, incluindo a faixa amarela inteira,
ocupa no máximo 520px de altura. Não use `100vh`, `100svh` nem `min-height` de
viewport no hero.

Ao menos 90px da primeira fileira do catálogo precisa aparecer sem rolagem: é ela
que avisa que tem catálogo embaixo. Sem essa fileira, muita gente não rola.

A logo é o LCP da página. Alvo de 2,5s. Sirva em WebP, com `priority`, largura
máxima de 800px, e não coloque texto sobre imagem que precise de fonte externa
carregada antes de aparecer.

### O que NÃO entra no hero

Sem tira de marcas: uma gráfica não revende marca, ela imprime. Sem contador de
clientes, sem "anos de mercado" e sem selo de qualidade: nada disso foi
confirmado (ver seção 7).

## 6. A voz

- Tom: **Técnica e precisa** (material, medida, uso).
- Como esta voz escreve: a frase é uma lista separada por ponto médio: material,
  medida, acabamento; o preço vem depois dos dados, nunca antes. Aqui não tem
  preço, então a frase termina no acabamento e o orçamento é o botão.
- A manchete de abertura, no modelo desta voz:
  "Panfleto 10 × 15 cm · couché fosco 115 g · frente e verso"
- Para quem: comércio de rua e pequeno negócio que precisa de material impresso e
  de fachada, e quer saber medida e formato antes de pedir orçamento.
- O que a página promete: ver formato, medida e material de cada peça sem
  precisar perguntar, e pedir orçamento já sabendo o que quer.
- **A palavra de TODO botão de pedido é: `PEDIR ORÇAMENTO`**. Literalmente essa,
  em todos eles, sem variação, sem sinônimo e sem reescrever para caber. Não use
  "Comprar", "Solicitar", "Ver mais", "Fale conosco" nem "Saiba mais" em lugar
  nenhum.
- Regra de escrita da medida, e ela vale na página inteira: número, espaço,
  `×` (sinal de multiplicação, não a letra x), espaço, número, espaço, `cm`.
  Assim: `10 × 15 cm`. Gramatura com espaço antes da unidade: `115 g`. Nunca
  `10x15cm`.

## 7. Fronteiras

- Não é gráfica online de upload: a arte passa por gente, e o pedido começa numa
  conversa.
- Sem tom de liquidação, sem contagem regressiva e sem urgência falsa.
- Não escreva prazo de entrega. Nenhum. Nem "entrega rápida", nem "pronto em 48h",
  nem "produção em 3 dias úteis". O prazo não foi informado, e prazo escrito numa
  página vira promessa cobrada no balcão.
- Não escreva preço, faixa de preço, "a partir de" nem "menor preço da região".
- Não escreva se a criação da arte está inclusa ou é cobrada à parte: não foi
  respondido. A página pode listar "criação de logotipo" como serviço, porque
  está no cartão, mas não pode dizer que a arte de um panfleto vem junto.
- Entrega, pagamento, retirada e troca não foram respondidos pela loja. Não crie
  seção de frete, forma de pagamento, prazo ou política de troca. Não escreva
  "frete grátis", "3x sem juros", "parcelamos" nem equivalente. Inventar uma
  condição comercial que a loja não pratica invalida a peça inteira.
- Não invente endereço, telefone, CNPJ, horário de funcionamento nem mapa. O
  único contato confirmado é o e-mail da seção 9.
- Não invente número de clientes, anos de mercado, quantidade impressa por mês,
  nome de cliente atendido nem depoimento. Não crie seção de depoimentos com
  texto de exemplo.
- **Nada de carrossel, slider ou banner rotativo** em nenhuma parte da página,
  nem no hero, nem em vitrine de destaques. Use seção estática. Uma mensagem, um
  CTA.
- **Nenhuma destas palavras pode aparecer na página**, nem flexionada, nem em
  título, botão, descrição ou microcopy: `imperdível`, `arrase`, `garanta já`,
  `clique aqui`, `corre que acaba`, `satisfação garantida`, `qualidade e preço`,
  `soluções em comunicação visual`, `parceiro do seu negócio`, `sua marca em destaque`.
- Não use travessão em nenhum texto visível da página. Onde a frase pedir
  travessão, use dois-pontos ou vírgula.

## 8. O catálogo (17 itens)

**Não há imagem hospedada.** Nenhum item tem foto, e isso é a forma da página, não
uma pendência: renderize cada item como ficha tipográfica. O campo `preco` é nulo
em todos, de propósito.

As medidas abaixo são os formatos padrão do mercado gráfico brasileiro. Elas vão
ser conferidas com a Renova antes da página ir ao ar; o que ela não fizer sai da
lista. Não acrescente formato que não esteja aqui.

```json
[
  { "nome": "Panfleto", "categoria": "Papel", "formatos": ["A6, 10 × 15 cm", "A5, 15 × 21 cm", "A4, 21 × 29,7 cm"], "material": "couché fosco 115 g ou 150 g", "acabamento": "frente, ou frente e verso", "minimo": "1.000 unidades", "preco": null },
  { "nome": "Cartão de visita", "categoria": "Papel", "formatos": ["9 × 5 cm"], "material": "couché fosco 300 g", "acabamento": "laminação fosca, verniz localizado opcional", "minimo": "1.000 unidades", "preco": null },
  { "nome": "Cardápio", "categoria": "Papel", "formatos": ["A4, 21 × 29,7 cm", "A3 dobrado, 29,7 × 42 cm"], "material": "couché fosco 250 g", "acabamento": "laminação nas duas faces, para limpar com pano", "minimo": "sob orçamento", "preco": null },
  { "nome": "Convite", "categoria": "Papel", "formatos": ["10 × 15 cm", "15 × 21 cm"], "material": "couché fosco 250 g ou papel com textura", "acabamento": "corte reto ou corte especial", "minimo": "50 unidades", "preco": null },
  { "nome": "Calendário", "categoria": "Papel", "formatos": ["parede, 21 × 29,7 cm", "mesa, 15 × 21 cm", "bolso, 6,5 × 9,5 cm"], "material": "couché fosco 250 g", "acabamento": "wire-o ou base de mesa", "minimo": "sob orçamento", "preco": null },
  { "nome": "Pasta com bolso", "categoria": "Papel", "formatos": ["fechada, 22 × 31 cm"], "material": "cartão 300 g", "acabamento": "laminação fosca, faca de bolso e porta-cartão", "minimo": "100 unidades", "preco": null },
  { "nome": "Envelope", "categoria": "Papel", "formatos": ["ofício, 11,4 × 22,9 cm", "saco A4, 24 × 34 cm"], "material": "offset 90 g", "acabamento": "impressão frente", "minimo": "500 unidades", "preco": null },
  { "nome": "Imã de geladeira", "categoria": "Papel", "formatos": ["6 × 9 cm", "7 × 10 cm"], "material": "manta magnética", "acabamento": "corte reto ou corte especial", "minimo": "100 unidades", "preco": null },
  { "nome": "Banner em lona", "categoria": "Grande formato", "formatos": ["60 × 90 cm", "80 × 120 cm", "100 × 150 cm", "sob medida"], "material": "lona 440 g", "acabamento": "bastão e corda, ou ilhós", "minimo": "1 unidade", "preco": null },
  { "nome": "Wind banner", "categoria": "Grande formato", "formatos": ["2,80 m de altura", "4,00 m de altura"], "material": "tecido com estrutura e base", "acabamento": "base de cruz, de estaca ou de água", "minimo": "1 unidade", "preco": null },
  { "nome": "Adesivo", "categoria": "Grande formato", "formatos": ["sob medida", "recorte eletrônico", "impresso com laminação"], "material": "vinil branco ou transparente", "acabamento": "corte de contorno", "minimo": "sob orçamento", "preco": null },
  { "nome": "Cavalete", "categoria": "Grande formato", "formatos": ["90 × 60 cm", "A1, 59,4 × 84,1 cm"], "material": "chapa impressa em estrutura dobrável", "acabamento": "dupla face opcional", "minimo": "1 unidade", "preco": null },
  { "nome": "Placa em PVC", "categoria": "Comunicação visual", "formatos": ["sob medida", "chapa inteira, 1,00 × 2,00 m"], "material": "PVC expandido 2 mm ou 3 mm", "acabamento": "adesivo impresso aplicado, furação opcional", "minimo": "1 unidade", "preco": null },
  { "nome": "Fachada em ACM", "categoria": "Comunicação visual", "formatos": ["sob medida", "chapa inteira, 1,22 × 2,44 m"], "material": "ACM 3 mm", "acabamento": "estrutura metálica, adesivo aplicado, letra caixa opcional", "minimo": "sob orçamento", "preco": null },
  { "nome": "Toldo", "categoria": "Comunicação visual", "formatos": ["sob medida"], "material": "lona com estrutura metálica", "acabamento": "instalação no local", "minimo": "sob orçamento", "preco": null },
  { "nome": "Camiseta", "categoria": "Vestuário", "formatos": ["P", "M", "G", "GG"], "material": "malha, com estampa", "acabamento": "frente, costas ou manga", "minimo": "sob orçamento", "preco": null },
  { "nome": "Criação de logotipo", "categoria": "Criação", "formatos": ["arquivo aberto e versões para aplicação"], "material": "vetor", "acabamento": "entrega em PDF, PNG e vetor", "minimo": "1 projeto", "preco": null }
]
```

Como cada ficha se desenha:

- O nome do item na display, caixa alta.
- Os formatos logo abaixo, um por linha, com a medida composta grande e em
  `--tinta`. A medida é a informação que a pessoa veio buscar: ela é o maior
  elemento da ficha depois do nome.
- Material e acabamento em corpo, caixa baixa, `--texto-fraco`.
- A quantidade mínima em rótulo, caixa alta, tracking 0.14em.
- No lugar do preço: `SOB ORÇAMENTO`, em rótulo, e nunca em corpo grande.
- O botão de orçamento em cada ficha, com `--tinta` de fundo e `--apoio` de texto.

## 9. A conversão

O número de WhatsApp ainda não foi confirmado: deixe o botão pronto e marque no
código onde o número entra, numa constante única no topo do arquivo. Não invente
número.

Enquanto o número não entra, o botão abre o e-mail confirmado, com o assunto e o
corpo preenchidos:

```
mailto:castrocyran@gmail.com?subject={assunto}&body={mensagem}
```

Modelo da mensagem, e ela vale igual para o WhatsApp quando o número chegar:

```
Oi! Vim pelo site e queria orçamento:

{nome}
{formato}
{material}
Quantidade: {quantidade}

Consegue me passar o valor?
```

Regras da interpolação: campo nulo some da mensagem junto com a linha dele, e
nada vira "null" nem "undefined". O nome do item é sempre o do JSON, sem
reescrever. Tudo codificado com `encodeURIComponent`.

O campo `{quantidade}` é o único que a pessoa digita: um input numérico dentro do
modal, com a quantidade mínima do item como valor inicial. Sem formulário de
cadastro, sem e-mail, sem nome, sem telefone. Um campo e um botão.

## 10. Vitrine completa

Esta é a vitrine contratada. Vale o catálogo inteiro do JSON, agrupado nas cinco
categorias, e o modal de ficha que o arquétipo pede.

- Mobile primeiro (390px), uma página só.
- Sem painel e sem login.
- OG image gerada na hora: a logo em preto sobre a faixa `#FEE205`.
- Assinatura discreta do estúdio no rodapé.

## 11. As imagens que ainda não existem

A página acima não depende de foto nenhuma, e é assim que ela deve ir ao ar na
primeira versão. Quando as fotos entrarem, elas entram como um bloco depois do
catálogo, e não dentro das fichas.

Direção de imagem, para quando forem produzidas ou geradas:

- **Papel fosco, sempre.** Couché fosco, sem verniz brilhante, sem reflexo
  especular. A superfície absorve a luz, ela não devolve.
- **Luz rasante**: uma fonte só, vindo de lado e bem baixa, quase paralela à
  mesa. É ela que revela o grão do papel, o relevo do corte e a espessura da
  pilha. Sombra longa e macia, caindo para o lado oposto ao da luz.
- Sem luz de preenchimento forte do outro lado: a sombra é metade da foto.
- Fundo: superfície neutra e opaca, cinza escuro ou preto fosco. Nunca fundo
  branco de estúdio, nunca mármore, nunca madeira rústica.
- A logo do leão coroado aparece impressa na peça, em preto sobre o amarelo
  `#FEE205`, na proporção e na posição em que ela viria de fábrica: não flutuando
  sobre a foto, não em transparência, não como marca d'água.
- Enquadramento dos panfletos: pilha ligeiramente desalinhada, vista de cima em
  ângulo de 30 a 45 graus, com uma folha destacada à frente mostrando a frente
  inteira. A medida do formato aparece na legenda, em texto, e nunca desenhada
  como cota sobre a foto.
- Para ACM, PVC e lona: a peça aplicada, e não a chapa solta. ACM em fachada de
  loja, PVC em parede interna, lona em banner com bastão. Mesma luz rasante,
  mesmo fosco.
- Nada de mockup com perspectiva exagerada, nada de peça flutuando com sombra
  falsa, nada de mão segurando produto contra o céu.

---

# Apêndice A: o que digitar na oficina

Para a ficha existir em `/crm/producao` e o prompt sair do compilador em vez de
sair daqui, é isto:

| Campo | Valor |
|---|---|
| Arroba | falta. A loja pode não ter Instagram, e a oficina exige arroba para criar. |
| Paleta | `#FEE205` na primeira caixa, `#050505` na segunda |
| Superfície | Preto puro |
| Tipografia | Archivo + Inter |
| Quantas peças entram | 17, sem faixa |
| Como são as fotos | nenhuma das quatro serve: não há foto |
| A peça varia em quê | nenhuma das quatro serve: varia por formato |
| O preço aparece | Sob consulta |
| O que acontece no clique | Abre a peça em modal |
| Tem categoria | Sim |
| Hero | Letreiro |
| Tira de marcas | Não |
| Texto do hero | Frase do conceito |
| Acima da dobra | Hero e a primeira fileira do catálogo espiando |
| Layout | Ficha |
| Como esta marca fala | Técnica e precisa |
| A palavra do botão | PEDIR ORÇAMENTO |
| Para quem é | comércio de rua e pequeno negócio |
| O que a vitrine promete | ver formato, medida e material sem precisar perguntar |
| O que ela NÃO é | não é gráfica online de upload; sem tom de liquidação |
| Palavras proibidas | imperdível, arrase, garanta já, clique aqui, satisfação garantida |
| Material do cliente | subir o PNG do leão coroado e o JPEG do cartão amarelo |

## Onde a oficina não cabe numa gráfica

Três campos da ficha não têm opção que sirva, e por isso o compilado desta vez
saiu à mão:

1. **"Como são as fotos"** pressupõe que existem fotos. Numa gráfica que ainda
   não fotografou nada, o catálogo é tipográfico, e a oficina não sabe dizer
   isso: qualquer das quatro respostas faz o compilado pedir card com imagem.
2. **"A peça varia em quê"** oferece numeração, grade P/M/G, cor e nada. A
   variação de uma gráfica é formato e tiragem, que é outra natureza: `10 × 15` e
   `15 × 21` não são tamanhos do mesmo item, são produtos com preço diferente.
3. **O catálogo** vem de legenda de Instagram pela Business Discovery. Aqui ele
   vem de uma lista de serviços num cartão de visita.

Se a Renova virar cliente e aparecerem outras gráficas, vale um quarto arquétipo
de forma na oficina: catálogo sem foto, variação por formato, preço sob
orçamento. É pouca coisa em `lib/producao/forma.ts` e resolve a categoria
inteira.

# Apêndice B: o que perguntar ao cliente antes de gerar

Cada linha aqui é uma proibição na seção 7 que vira conteúdo quando for
respondida:

1. Qual é o WhatsApp de atendimento. É a conversão inteira da página.
2. Cidade e endereço, se tem loja física. Sem isso a página não tem onde dizer
   que existe.
3. Instagram, se tiver.
4. Prazo de produção por tipo de peça, ou pelo menos o mais comum.
5. A criação da arte está inclusa ou é cobrada à parte.
6. Formas de pagamento, e se parcela.
7. Entrega, retirada, ou os dois.
8. Confirmar a lista de formatos da seção 8: quais desses ela faz de verdade, e
   quais faltaram.
9. Quantidade mínima real de cada peça. As do JSON são padrão de mercado, não
   dela.
10. Algum fato conferível que sirva de autoridade: anos de casa, maquinário
    próprio, se imprime ou terceiriza o grande formato.

E uma decisão que é sua, não dele: **o fundo preto**. A referência que ele mandou
é amarela chapada, e a página vai ser preta com faixa amarela. O motivo está na
seção 2, e ele se defende em uma frase: cartão de visita se lê em três segundos,
página de gráfica se lê com tabela de medida na frente. Mostre a primeira tela
antes de mostrar o resto.
