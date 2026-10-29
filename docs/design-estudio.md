# O design do estúdio

A régua de todas as páginas do Rafael Razeira Estúdio. Definida em
29/10/2026: **o design da `/vitrine-digital` vira o design oficial**
(decisão do Rafael), e as outras páginas migram para ele, uma de cada vez.

A régua anterior, o "papel e tinta" (papel creme, Archivo condensada em
caixa alta, sombra dura, carimbo, campo em linha), está no histórico do
git deste arquivo (versão de 21/08). Ela continua valendo SÓ onde a
página ainda não migrou.

| Página | Situação |
|---|---|
| `/vitrine-digital` e `/en/vitrine-digital` | a origem do sistema (28/10) |
| `/onboarding/<cliente>` | no sistema desde 29/10 |
| `/estudio` (a home) | migrada em 29/10, por `public/estudio/css/novo.css` |
| `/landing-page` | **ainda papel e tinta**: recebe tráfego pago, migra com medição |
| `/proposta/*`, `/entrega/*` | ainda no sistema antigo |
| `/servicos`, `/e-commerce`, `/portfolio`, `/casos` | ainda no sistema antigo |

---

## 1. A ideia em uma frase

**Calmo, claro e com a prova no centro.** Fundo branco, tipo grande em
caixa normal, botões em pílula, cartões cinza de canto grande. O que
segura o genérico é o trabalho real (a vitrine na moldura, a loja no ar),
não a decoração. Foi a direção da velvetica.studio e do mobbin.com, que o
Rafael trouxe de referência em 28/10.

---

## 2. A cor

| Token | Valor | Trabalho |
|---|---|---|
| `--branco` | `#FFFFFF` | o chão da página |
| `--cartao` | `#F2F2F0` | o cartão cinza, a caixa de campo, o fundo do chip segmentado |
| `--papel` | `#F6F6F4` | o campo dentro do cartão branco |
| `--fio` | `#E6E6E3` | a borda de chip, campo e pílula clara |
| `--ink` | `#14181A` | o tipo, o botão preto, o chip marcado |
| `--texto` | `#4A4F52` | o corpo de texto |
| `--suave` | `#6B7072` | a ajuda, a legenda, o texto de link quieto |
| `--verde` | `#0C9159` | a BATIDA do título (a palavra em verde) e o sinal de feito |
| `--rosa` | `#E31B62` | a AÇÃO principal, e só ela |
| `--rosa-dark` | `#B81250` | o hover do rosa |

- **O verde é uma palavra, não uma área.** O título tem uma batida em verde
  (`<em>`): "antes de **decidir.**", "**à loja no ar.**". Nunca fundo verde,
  nunca bloco verde.
- **O rosa é o botão que vende.** Um por tela, no máximo dois (topo e corpo).
  Botão de "depois" é preto; botão de "olhar" é branco com fio.
- **Seção escura só onde a prova pede contraste** (ex.: a faixa de números).
  A página é clara.

---

## 3. O tipo

| Família | Onde |
|---|---|
| **Instrument Sans** | h1, h2, título de cartão. Caixa normal. |
| **Inter** | todo o resto: corpo, botão, rótulo, campo |
| mono do sistema (`ui-monospace`) | só número de passo ("01") e dado miúdo |

- **h1:** peso 400, `clamp(40px, 5.6vw, 76px)`, entreletra `-.035em`,
  entrelinha `1.02`. Fino de propósito: é a manchete grande.
- **h2:** peso 500 (abaixo de ~48px o 400 afina demais), entreletra `-.03em`,
  entrelinha `1.06`.
- **A batida em verde** é só cor: não cresce, não muda de peso.
- **Nada em caixa alta** no título nem no botão. Caixa alta com entreletra
  aberta era a voz do papel e tinta.
- A Archivo continua na logo (arquivo de imagem) e em número grande de marca.

---

## 4. Os componentes

**O topo em pílula.** Flutua a 10px do alto, largura `min(1120px, 100% - 20px)`,
altura 60px, `border-radius: 999px`, branco a 85% com `backdrop-filter: blur(14px)`,
sombra `0 10px 30px #0000000f, 0 1px 2px #0000000d`. A logo é o arquivo
(`/assets/marca/rr-monograma.webp` + `rr-nome.webp`), nunca texto.

**O botão.** Pílula (`border-radius: 980px`), `min-height` 46 a 50px,
Inter 600 em 15px, caixa de frase. Ao tocar encolhe 3% (`scale(.97)`), sem
sombra dura. Três cores: rosa (agir), preto (seguir), branco com fio
`#D4D4D1` (olhar). O rosa leva a sombra macia
`inset 0 1px 0 #ffffff47, 0 8px 18px -6px #e31b6273`.

**O selo de abertura.** Pílula pequena acima do h1: fio, fundo branco, Inter
500 em 14px, um ícone ou ponto verde à esquerda.

**O cartão.** Fundo `--cartao`, `border-radius: 28px` (22px no celular),
sem borda e sem sombra. Título de cartão em Instrument Sans 500.

**A moldura.** O trabalho real num aro cinza (`#E4E4E2`, raio 28px, padding
10px) com a barra de navegador e a sombra longa
`0 40px 80px #0000001f, 0 8px 24px #00000012`.

**O campo.** Caixa cinza arredondada (`#F3F3F1`, raio 14px), sem borda; no
foco fica branca com anel rosa (`box-shadow: 0 0 0 2px var(--rosa)`).

**O chip.** Pílula (ou raio 18px quando tem duas linhas) branca com fio;
marcado fica preto com texto branco.

**Os passos.** Três colunas com fio de 1px em cima, o número em mono verde
pequeno, o título em Inter 500 e uma linha cinza embaixo.

**A barra de progresso.** Trechos de 3px, cinza, enchendo em verde.

---

## 5. O movimento

- Entrada: `cubic-bezier(.2, .7, .2, 1)` entre .35s e .6s, subindo 14px.
- Toque: `scale(.97)` em .12s.
- A moldura sobe com o scroll (`animation-timeline: view()`) onde há suporte.
- Tudo respeita `prefers-reduced-motion`.

---

## 6. O que nunca entra

- Sombra dura deslocada, carimbo, etiqueta alfinetada, tracejado de cupom:
  eram o papel e tinta.
- Título em caixa alta condensada, rótulo em mono com entreletra aberta.
- Fundo creme.
- Cartão branco com borda grossa.
- Gradiente, vidro fosco fora do topo, emoji como ícone.
- Travessão em texto visível (regra da casa, vale sempre).

**Título centrado:** a regra da casa "nada de título centrado + grade de
cartões" (cofre, `2 Regras da casa/feedback-design-nao-generico`) tem uma
exceção aprovada pelo Rafael em 28/10: o hero centrado vale QUANDO o
trabalho real aparece logo embaixo (a moldura, as logos das lojas). Hero
centrado com grade de cartões genéricos embaixo continua proibido.

---

## 7. Como migrar uma página

1. Nunca mexer no CSS que outra página divide sem querer. A `/estudio`
   migrou por uma folha nova (`css/novo.css`) carregada SÓ no
   `estudio/index.html`, por cima das antigas; a `/landing-page`, que usa
   os mesmos `/css` e `/js`, ficou intacta.
2. Conferir em 360, 390, 768, 1024, 1280 e 1440, com `scrollWidth` igual à
   largura (a fonte grande do Android também: ver a armadilha no cofre).
3. Página de tráfego pago (`/landing-page`) só migra com a medição de antes
   anotada, para saber se a troca custou conversão.
