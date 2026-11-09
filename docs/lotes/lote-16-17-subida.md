# Lotes 16 e 17: a subida na Meta (09/11/2026)

## As decisões do Rafael (09/11)

- **Sobe tudo, inclusive a v2 como está.** A `/loja-online-v2` mostra resultados de exemplo (+38%,
  R$ 18.420, 2,4x), marcados como ilustrativos. O aviso foi dado: o próprio `page.tsx` pede para
  não apontar anúncio para lá assim, e a revisão da Meta pode reprovar por promessa de resultado.
  O Rafael escolheu "subir assim mesmo".
- **As duas lojas autorizaram aparecer:** a Iconic (Luciano) e a JS Imports.
- **Um conjunto por página:**
  - um conjunto novo para a /loja-online;
  - outro conjunto novo para a /loja-online-v2 (a Loja online é oferta nova);
  - o iPhone entra no conjunto da vitrine que já roda (o nicho fica no criativo).
- **A verba de cada conjunto é o Rafael que digita.**

## Os anúncios

**Todos:**
- **Vídeo:** 9:16 + 4:5. Os arquivos para subir estão no scratchpad, em `subir/`; os originais em `montados-9x16/` e `montados-4x5/`.
- **Botão:** "Saiba mais".
- **UTM:** `utm_source=facebook&utm_medium=paid&utm_campaign=<campanha>&utm_content=<nome do anúncio em minúsculas>`.

### /loja-online: L16-LO-A, L16-LO-B1, L16-LO-C1

- **Texto principal:**
  > Para quem vende roupa e tênis pelo Instagram: eu faço a sua loja online. O cliente escolhe o tamanho, paga no Pix ou no cartão e o pedido chega pago.
  >
  > Antes de você pagar qualquer coisa, eu monto uma amostra com as suas peças. Manda o @ da sua loja e em até 24h ela chega no seu WhatsApp.
- **Título:** A sua loja online, com as suas peças
- **Descrição:** Veja a amostra antes de pagar
- **Link:** https://rafaelrazeira.com.br/loja-online

### /loja-online-v2: L16-V2-A, L16-V2-B2, L16-V2-C2

- **Texto principal:**
  > Faça a sua loja vender mais com o e-commerce. O cliente escolhe o tamanho, calcula o frete e paga no Pix ou no cartão, sem esperar você responder o direct.
  >
  > Antes de você pagar qualquer coisa, eu monto uma amostra do seu e-commerce com as suas peças. Em até 24h ela chega no seu WhatsApp.
- **Título:** Veja o seu e-commerce antes de pagar
- **Descrição:** Amostra com as suas peças em até 24h
- **Link:** https://rafaelrazeira.com.br/loja-online-v2

### /vitrine/iphone: L17-IP-I1, L17-IP-I2, L17-IP-I3

- **Texto principal:**
  > Para quem vende iPhone pelo Instagram: eu faço a vitrine da sua loja. O cliente vê a memória, a cor e as fotos de cada aparelho, e o pedido chega pronto no seu WhatsApp.
  >
  > Antes de você pagar qualquer coisa, eu monto uma amostra com os seus aparelhos. R$ 999, sem mensalidade.
- **Título:** A amostra da sua vitrine é por minha conta
- **Descrição:** Manda o @ da sua loja
- **Link:** https://rafaelrazeira.com.br/vitrine/iphone

**Fica fora dos textos:**
- **Número de resultado nenhum.**
- **"Vê o preço" no texto do iPhone,** porque a amostra da JS Imports mostra "Perguntar o valor".
- **"Sem juros",** porque o 12x é com os juros do cartão.

## As conversões personalizadas (criadas em 09/11/2026)

A "Vitrine: formulário enviado" (1540256587095933) só conta `Contact` em URL com `/vitrine-digital`.
Os leads das três páginas novas **nunca entravam nela**. Por isso foram criadas três conversões, no
pixel Rafael Razeira Estúdio (2445872572575348):

| Conversão | ID | Regra |
|---|---|---|
| Loja online: formulário enviado | 1902742867769361 | Contact, URL contém `/loja-online` e não contém `loja-online-v2` |
| Loja online v2: formulário enviado | 1031840636610929 | Contact, URL contém `/loja-online-v2` |
| Vitrine iPhone: formulário enviado | 28952030754467626 | Contact, URL contém `/vitrine/iphone` |

**O iPhone ganhou um conjunto próprio,** contra a regra de "nicho só no criativo". No conjunto da
vitrine, ele otimizaria por uma conversão que nunca dispara.

**A campanha principal estava com "Payment error" em 09/11.** O Rafael vai resolver o pagamento
depois. Até lá, tudo fica em rascunho.

## Rascunhos montados na Meta (09/11/2026)

Tudo dentro da campanha `[ESTUDIO] vitrine-digital · previa-gratis · br · 2026-08-27`, **em rascunho,
nada publicado.**

**Os conjuntos:**
- `loja-online · L16 · br` (id 120252065485920201), com a conversão Loja online;
- `loja-online-v2 · L16 · br` (id 120252065745900201), com a conversão Loja online v2;
- `vitrine-iphone · L17 · br` (id 120252066182320201), com a conversão iPhone, URL `/vitrine/iphone`.

**O que vale para os três:**
- local Website, meta "máximo de leads";
- Brasil, Advantage+;
- posicionamentos automáticos;
- regra de valor `audience-network -90`;
- verba no padrão de R$ 20/dia, **que o Rafael ajusta**.

**Os anúncios (9):** `L16-LO-A`, `L16-LO-B1`, `L16-LO-C1`, `L16-V2-A`, `L16-V2-B2`, `L16-V2-C2`,
`L17-IP-I1`, `L17-IP-I2`, `L17-IP-I3`. Todos conferidos no Review em 09/11. Em cada um:
- os vídeos 9:16 + 4:5;
- os textos da página;
- o botão "Saiba mais";
- a URL com UTM;
- o Advantage+ creative, os vários anunciantes, os aprimoramentos de IA e as imagens de IA, **tudo
  desligado**.

**A identidade é a da conta:** página "Eco" e Instagram "ecotopia.app", o único perfil ligado.
**Conferir com o Rafael se é isso mesmo.**

**As ciladas da subida:**
- O ESC no editor abre "Publish draft items?". **Nunca apertar ESC ali:** fechar pelo X.
- Na troca de mídia, a bandeja guarda os vídeos do anúncio duplicado (às vezes como grupo "2").
  Desmarcar na grade, tirar o grupo pelo X da bandeja e conferir "2 of 10 selected" com as bordas
  na grade.
- O botão Upload abre o seletor do Windows. Capturar o input sobrescrevendo
  `HTMLInputElement.prototype.click` e usar o `file_upload`, um arquivo por vez (<10 MB).
- Ctrl+A fora de um campo seleciona a página inteira e o texto digitado se perde. Conferir o
  valor depois.
- Às vezes o segundo `file_upload` cai no mesmo input enquanto a tela "Media upload" carrega e não
  sobe nada. Esperar o primeiro aparecer na grade, clicar Upload de novo e marcar o input NOVO.
- O único aviso que sobra em cada anúncio é "won't deliver to 1 placement": um posicionamento que
  não aceita o formato. Não impede nada.

**Antes de publicar (o Rafael):** resolver o pagamento; ajustar a verba dos três conjuntos; confirmar
a identidade Eco/ecotopia.app; as conversões personalizadas só ficam ativas depois do primeiro envio
de formulário em cada página. Os 3 rascunhos antigos da conta 1933157070314412 ficaram intocados.

## Ajustes antes de publicar (09/11/2026, à tarde)

- **Os três conjuntos otimizam pelo `Contact` padrão**, não mais pelas conversões personalizadas. A
  razão: as conversões nasceram hoje, com zero histórico, e o `Contact` tem o histórico do pixel
  inteiro. A separação por página continua, porque cada conjunto só leva à sua URL. As conversões
  personalizadas ficam como coluna de leitura. (A campanha antiga segue pela "Vitrine: formulário
  enviado", com filtro de URL, porque ali o Contact de outras páginas atrapalhava.)
- **Verba de R$ 25/dia em cada conjunto** (era o padrão de R$ 20). A verba está no conjunto, não na
  campanha: o conjunto antigo, com histórico, não puxa o dinheiro dos novos.
- **Velocidade (commit 23dd6b8):** capa do vídeo do topo com prioridade e o vídeo depois do `load`;
  a captura do topo da /vitrine/iphone sem lazy. No ar, com rede limitada de verdade, o LCP da
  /vitrine/iphone foi de 5,1 para 4,3 s; o da /loja-online e o da v2 quase não mudaram (4,5 a 5,0 s).
  O que pesa agora é a primeira pintura (4,2 s) e o JavaScript do React; a nota do Lighthouse
  simulado fica entre 80 e 87.
- **Pixel e Mixpanel conferidos no ar** com os pedidos barrados: o envio dispara Lead e Contact pelo
  navegador e pela API de conversões nas três; a v2 ganhou o ViewContent ("Viu a oferta").
