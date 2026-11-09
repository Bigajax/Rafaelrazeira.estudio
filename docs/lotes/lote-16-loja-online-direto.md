# Lote 16: a Loja online, direto (07/11/2026)

> **Descartado no mesmo dia (07/11):** o L16-01 de cartaz (texto gigante sobre a gravação da
> tela) ficou "bem ruim", nas palavras do Rafael, e não tinha referência. A pesquisa na
> Biblioteca da Meta (cofre, `6 Diário/referencias-anuncios-loja-online-2026-11-07`) mostrou
> que nenhum anúncio de loja virtual que roda há meses usa esse formato: todos são gente
> falando ou a tela do trabalho com a voz de quem fez. Os dois vídeos foram para
> `descartados/` na pasta da campanha. **O que gravar agora está em `lote-16-para-gravar.md`.**
> O resto deste arquivo fica de registro (o texto do anúncio e o "como subir" seguem valendo).

Dois criativos para a /loja-online. Pedido do Rafael: "algo mais direto, tipo fazemos sua
loja online", depois de recusar as versões com história e as provocações. Oferta na cara,
cortes secos, tipo grande.

## L16-01-tela (6 a 8 s, montado no PC, sem gravação)

A compra simulada da Iconic (`public/assets/demo/loja-online-compra*`) rodando atrás, regravada
em 9:16 pelo `scripts/loja-online-video/gravar.mjs`. Textos grandes, um por vez:

1. 0 s: **FAZEMOS SUA LOJA ONLINE.**
2. 1 a 4 s: **PIX. CARTÃO. FRETE.** (uma palavra por batida)
3. 4 a 6 s: **O CLIENTE COMPRA SOZINHO.**
4. fecho: **SEU @, SUA LOJA PRONTA EM 24H.**

Etiqueta "Demonstração" num canto o tempo todo. **Só sobe com o ok do Luciano** (a marca da
Iconic numa compra simulada).

**Montado em 07/11:** `Desktop/Estúdio/campanhas/L16 loja online/L16-01-tela-9x16.mp4`
(1080x1920) e `L16-01-tela-4x5.mp4` (1080x1350), 8 s, 30 fps, **sem som** (falta escolher a trilha
ou o som de notificação). Refazer: `node scripts/loja-online-video/gravar.mjs vertical|retrato <pasta>`
e `node scripts/loja-online-video/montar-anuncio.mjs vertical|retrato <pasta> [trechos]`; o texto
mora em `scripts/loja-online-video/anuncio.html`. Os trechos de cada gravação mudam a cada
regravação (o carrossel da home escolhe a peça): conferir numa folha antes de montar.
A compra escurecida a 42% o tempo todo: sem isso, o bloco branco sumia na página branca da loja.

## L16-02-rafael (8 a 10 s, o Rafael grava)

A compra na tela desde o primeiro segundo (nunca 3 s só de rosto: no h27u, 74% saíram ali).

**As falas:**

1. Eu faço a sua loja online.
2. O cliente escolhe, paga no Pix e o pedido chega pago.
3. Manda o @ da sua loja e eu monto uma amostra com as suas peças.

Celular em pé, olhando para a lente. Cada fala duas vezes, dois segundos parado no fim.

## O texto do anúncio (os dois)

> Fazemos sua loja online. Pix, cartão e frete no seu site, e o pedido chega pago no painel.
> Para quem vende roupa e tênis pelo Instagram. Manda o @ da sua loja e eu monto uma amostra
> com as suas peças.

Botão: Saiba mais. Destino: rafaelrazeira.com.br/loja-online.

## Como subir

- **Conjunto novo** na campanha atual (a regra da casa permite conjunto novo para oferta nova),
  link na /loja-online. A Audience Network já está excluída na conta.
- **9:16 e 4:5** dos dois: anúncio novo na Meta não publica só em 9:16 (armadilha de 22/10).
  Conferir "Related media: 0 of N selected" antes de publicar.
- **Julgar:** hook rate primeiro, depois custo por formulário, com 500 a 1.000 impressões cada.
  O custo por lead deve sair maior que o da vitrine (o valor é o dobro): não comparar pelo
  mesmo número.

## Antes de subir

1. A /loja-online no ar (commit junto com o `lib/oferta-performance.ts`, que tem os R$ 1.990).
2. O ok do Luciano para o L16-01.
3. O evento da Meta sai com `content_name: "vitrine-digital"`; o conjunto separado resolve a
   leitura.
