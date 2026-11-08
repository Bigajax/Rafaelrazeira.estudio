# Os vídeos da /loja-online (07/11/2026)

Os dois vídeos do hero e o do painel são **simulações**: o checkout ainda não está no ar em loja
nenhuma. Pedido do Rafael, que escolheu a simulação no visual da Iconic.

- `gravar.mjs` + `sim.js`: abre o site REAL da Iconic, rola até a peça, escolhe o 41 e toca no
  botão "Adicionar à sacola", renomeado para "Comprar agora". Daí em diante, as telas do pagamento
  (entrega, Pix, aprovado) são desenhadas pelo `sim.js`, só no navegador da gravação. A medição
  da loja (`/api`, pixel, Mixpanel) fica bloqueada: nenhuma visita ou evento sai daqui.
  `node gravar.mjs desktop <saída>` (1280x800, a moldura 16:10) e `node gravar.mjs celular <saída>`
  (400x500 a 2x, a moldura 4:5).
- `painel.html` + `painel-render.mjs`: o painel desenhado por tempo (`render(t)`), quadro a quadro.
  `node painel-render.mjs medir` mede onde o cursor tem de parar; `gravar` monta o vídeo.

Os arquivos vão para `public/assets/demo/loja-online-*` (capas convertidas para WebP).

**Ciladas:** no celular a fileira da home é um carrossel que anda sozinho (o roteiro toca no card
que estiver inteiro na tela e lê o nome e o preço da peça aberta); o convite do Grupo VIP abre
sozinho e é escondido pelo botão "Entrar no Grupo VIP"; tocar na foto do card só a vira (o alvo é o
"Mais detalhes"). Barra invertida escrita pelo bash some: editar estes arquivos pelo editor.
