# Lote 11: a montagem do criativo gravado (prévia grátis, SneakerSpot)

Documento de montagem. O que o Rafael grava está em `lote-11-para-gravar.md`; ele não
precisa abrir este. Escrito em 22/10/2026, com o vídeo 1 montado no mesmo dia.

## O desenho

Três cenas, corte seco, 1080x1920 a 30 qps, 25,9 s. O Rafael em vídeo (não só voz),
e a vitrine real da SneakerSpot gravada quadro a quadro no celular. As três posições
do lote 09, mas **sem recorte de fundo**: a parede do estúdio é texturizada e em dois
tons, e o rembg quadro a quadro em 60 qps não cabe no PC. As posições saem só com
corte retangular e máscara de círculo, no ffmpeg.

| Cena | Clipe | Janela | Posição | Na tela |
|---|---|---|---|---|
| A · gancho | IMG_3578 | 0 a 6,55 s | **metade**: a tela em cima (1080x1152, o catálogo Corrida rolando, recortado de y 330), o Rafael embaixo (768 px, recorte de y 300 do bruto, o boné inteiro) | em 3,9 s a tela escurece 45% e entram os balões do direct, um por vez: "quanto tá?", "tem no 41?", "e no 42?" (avatar cinza, sem nome e sem foto). Legenda "PREÇO E TAMANHO / O DIA INTEIRO?" em y 1040 desde 0,9 s |
| B · meio | IMG_3584 | 0 a 12,1 s | **círculo**: a vitrine inteira; o rosto num círculo de 324 px no canto de cima à direita (716,120), recorte 660x660 de (204,330), aro branco de 8 px | 0 a 2,6 home (rola só até 110 px: a faixa de logos das marcas fica fora); 2,6 a 6,2 catálogo Corrida rolando; 6,2 a 7,6 a peça adidas Hyperboost preto com R$ 990,00; 7,6 a 9,2 o "41" digitado no "Qual o seu número?" (o botão vira "Tem o 41?"); 9,2 a 12,1 o WhatsApp com a mensagem pronta. Uma legenda por frase: OLHA A VITRINE, CONFERE AS PEÇAS, VÊ O PREÇO, ESCOLHE O TAMANHO, CHAMA NO WHATSAPP COM TUDO ESCOLHIDO |
| C · fecho | IMG_3586 | 0,9 a 8,1 s | **inteiro** | "QUER VER COMO FICA A SUA?" (0,1 a 2,2 s), "Toca no botão" em Caveat com a seta descendo (desde 2,3 s, no meio do corpo, nunca abaixo de y 1250), "PRÉVIA GRÁTIS" (desde 5,4 s) |

**A mensagem do WhatsApp é a real do link da vitrine** (lida do `href` do botão depois
de digitar o número): "Oi! Quero comprar este par da vitrine: *adidas Hyperboost preto*,
Valor: R$ 990,00 (R$ 940,50 no Pix), Número: 41, Tem no número 41 para pronta entrega?"
e o link da peça. Só a moldura do app (cabeçalho, balão, barra) é desenhada. Sem código.

**A peça é o Hyperboost preto de propósito:** modelo comum, com preço publicado e
"pronta entrega". Nenhum colab (Travis, KAWS, Ben & Jerry's) e nenhuma faixa de logo
entra no vídeo: anúncio com produto de grife suspeito cai na revisão da Meta.

## A segunda versão (22/10, "mais personalidade")

O Rafael viu a primeira e pediu três coisas: o gancho só com ele e a legenda (saiu a
tela dividida), mais personalidade nas legendas e no círculo, e áudio melhor.

- **Gancho:** o Rafael inteiro, e a legenda **palavra por palavra** no tempo da fala
  (tempo do Whisper no bruto): cada frase entra com impacto (escala 1,35 → 1 em 4
  quadros), a palavra que está sendo dita fica verde e volta a branca; "preço" e
  "tamanho" ficam verdes. Bloco levemente torto (−3°) em y 1330, e uma anotação à mão em
  Caveat numa etiqueta escura por baixo ("todo santo dia", "no direct, um por um").
- **Meio:** uma legenda por frase, com a mesma entrada de impacto, torta (−2°), em y 1400,
  e a anotação à mão ("da SneakerSpot", "no celular dele", "sem perguntar", "o número
  dele", "pedido pronto"). A do WhatsApp fica em y 1590 para não cobrir a mensagem real.
- **A figurinha:** círculo de 380 px (recorte 600x600 de 234,405), aro verde de 12 px com
  fio branco por dentro e sombra, e a etiqueta "Rafael, designer" em Caveat, torta, numa
  pílula escura (branca pura sumia sobre a página da vitrine).
- **As legendas de cada cena entram como uma trilha** (ffconcat de PNG com um PNG vazio
  nos buracos), não um `-i` por PNG: 32 estados no gancho.
- **A voz:** highpass 90, lowpass 12k, gate leve (2,5:1, release 180 ms), afftdn mais
  forte (nr 18, nf −36), −3,5 dB em 250 Hz, +1,5 em 1,8 kHz, +3 em 4 kHz, shelf +2 em
  8 kHz, de-esser, compressor 4:1, loudnorm **−14 LUFS**. Medido no buraco entre frases
  do meio (2,3 a 2,95 s): o ruído caiu de −76 para −94 dB, e a fala subiu 1,7 dB.

Conferido executando, de novo: transcrição do final inteira, 25,87 s, −14,0 LUFS,
pranchas das três cenas (pegaram a palavra verde cumulativa e a etiqueta branca sumindo).

**Terceira passada (22/10):** o Rafael pediu "uma versão em moldura quadrada" e "10% de
rosa no vídeo". A figurinha ganhou a variante de cantos arredondados (`MOLDURA=quadrada
node montar.mjs`, sai `l11-01-repetitivo-sneakerspot-quadrada.mp4`; a redonda continua),
e o rosa entrou nas anotações à mão (o `#ff4fa3`, o rosa do boné dele), que são a parte
pequena da cor em tela; as legendas grandes e o aro seguem verdes.

## O áudio "dentro de uma garrafa" (22/10, quarta passada)

O Rafael: "está muito tipo falando dentro de uma garrafa". A medição por banda dos
brutos (RMS em 100-300, 300-700, 0,7-2k, 2-4k, 4-7k, 7-12k) mostrou a causa: o grave
de sala é a banda mais forte (−26 dB em 100-300) e a energia cai 13 a 17 dB de 2-4 kHz
para 4-7 kHz (voz natural cai uns 8). É o microfone do iPhone longe da boca numa sala
que ressoa; o perfil é o mesmo no clipe estéreo e nos mono, então não foi o AirPod.
A cadeia da segunda versão levantou tudo junto e manteve a proporção errada.

A cadeia nova (`voz3`): highpass 110 em dois estágios, −4 dB em 200, −3 em 420, +3 em
3 k, +4 em 5 k, shelf +2 em 8 k, **`aexciter`** (harmônicos de 4 a 10 kHz, que o
microfone não captou), afftdn leve (nr 8), de-esser, compressor 3:1, loudnorm −14.
A primeira tentativa (shelf +4, aexciter 2,5 até 12 k) deixou 7-12k igual a 4-7k, chiado
na certa; a entregue é mais contida. Por banda, o B.wav ficou: 100-300 −25,2 / 2-4k −33,6
/ 4-7k −40,6 / 7-12k −40,8, contra
−23,7 / −37,1 / −50,2 / −53,9 da crua. Duas cópias para o Rafael comparar, só com o
áudio trocado (`-c:v copy`): `-voz-b.mp4` (a cadeia nova) e `-voz-crua.mp4` (só
highpass 80 e nível). **O que resolve de verdade é gravar perto da boca** (lapela, ou o
iPhone a 30 cm) numa sala com pano: tratamento não tira reverberação.

## A quinta passada (22/10): a voz crua, a travada e a polaroide

- **O Rafael escolheu a `-voz-crua`** (só highpass 80 e loudnorm −14): as cadeias com
  redução de ruído, gate e excitador soavam "dentro de uma garrafa". **A regra passa a
  ser: áudio de câmera quase cru**; o que melhora é a gravação, não o filtro.
- **A travada:** "em alguns momentos dá uma travada". Medido pela diferença entre quadros
  (`tblend=difference` + `signalstats`): nos extremos de cada rolagem da tela, a
  suavização (ease in/out) virava passos de 0 e 3 px alternados a 3x (4,6 → 4,6 → 0,1 →
  44). A rolagem agora é **linear, em px inteiros**, e a página é pré-rolada antes de
  gravar (fotos já carregadas). Depois: diferença estável em ~20 do começo ao fim.
- **A moldura quadrada ganhou personalidade: uma polaroide.** Moldura branca torta (−5°)
  só de borda (a foto fica vazada), margem larga embaixo com "Rafael, designer" escrito em
  Caveat, fita rosa no canto (o rosa do boné), sombra. A foto do Rafael entra por baixo,
  380 px, girada −5° num canvas de 520 e centrada no centro da janela (851,304). Sai com
  `MOLDURA=quadrada node montar.mjs`. A redonda continua no script, mas a entregue é a
  polaroide: `l11-01-repetitivo-sneakerspot-quadrada.mp4`.

## O vídeo 2 e a configuração por vídeo (22/10, à tarde)

O Rafael regravou as três partes do vídeo 2. Os scripts passaram a aceitar um JSON por
vídeo: `camadas.mjs <saida> camadas-02.json` (as frases, os tempos das palavras, o texto
da seta) e `CFG=montar-02.json MOLDURA=quadrada node montar.mjs` (clipes, janelas,
pastas, o recorte da foto, o nome). A tela do meio se grava com os tempos por variável
(`CENAS=B PASTA_B=../b2/B T_HOME=1.3 T_HOME_ROL=1.2 T_CAT=2.6 T_PECA_ROL=0.9
T_PECA_HOLD=0.5 T_NUM_ROL=0.4 T_TYPE=0.25 T_WA=1.9`), somando a duração da fala do meio.

> [!warning] Fala rente ao fim do bruto
> No IMG_3604 a fala acaba a 0,02 s do fim do arquivo. Cortado ali, o "p" de WhatsApp
> engasga. O meio ganhou 0,4 s de cauda: `apad` na voz, e `tpad=stop_mode=clone` na tela
> e no rosto (está no `montar.mjs` para toda cena B). E o Whisper inventa um "Com tudo"
> na emenda silêncio seco → fala do fecho: transcrever as partes separadas antes de
> procurar defeito.

## A revisão do vídeo 2 (22/10, meio-dia): a travada do iPhone, a moldura leve e os efeitos

"Está travando uma parte." A medição quadro a quadro achou duas coisas distintas da
travada do vídeo 1:

1. **O iPhone perde quadros ao gravar.** A cadência do bruto (`showinfo`) mostra buracos
   de 66,7 ms (4 quadros) no IMG_3602, em "fica a sua?" e no fim; o IMG_3604 tem outro
   no começo. Isso vem do arquivo. `mpdecimate` + `minterpolate` sobre o SDR já em 30 qps
   **não resolve** (os quadros repetidos têm ruído de câmera e não são descartados). O que
   resolve é interpolar **sobre os tempos reais do bruto**: a cadeia HDR → SDR com
   `minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1` no lugar do
   `fps=30` (lento: minutos por clipe de 8 s, em segundo plano, um por vez).
2. **A tela parada nas esperas** (home, peça, digitação, WhatsApp) lê como congelada. A
   home e a peça agora rolam o tempo inteiro, devagar (`T_HOME=0.3 T_HOME_ROL=2.2
   T_PECA_ROL=1.4 T_PECA_HOLD=0`), e a tela leva um empurrão lento de câmera (4,5% ao
   longo da cena, `scale` com `eval=frame` + `crop`). A métrica "quase iguais" (YAVG < 0,6)
   ainda marca as esperas, porque o empurrão é sub-pixel: ler a lista **fora** delas.

**A moldura leve** (pedido: "quero algo mais leve"): fio branco de 10 px com cantos
arredondados (raio 30), torta −4°, sombra suave, a fita rosa pequena centrada em cima,
e "Rafael, designer" numa pílula escura embaixo. A foto leva uma máscara de cantos
arredondados (`mascara-leve.png`, 520x520) **antes** de girar, senão os cantos vivos
passam da borda redonda. Centro da moldura em (878,302); a foto girada entra em (618,42).

**Os efeitos sonoros** (`sfx.mjs <video> <eventos.json> <saida>`): sintetizados no
ffmpeg, nada baixado. pop (a legenda entrando, 520 Hz), whoosh (corte de cena, ruído
rosa com bandpass), tecla (o "41"), enviado (o WhatsApp, 1320 Hz), toque ("clica no
botão"), brilho ("prévia grátis"). Cada um nivelado por pico a um alvo (−17 a −22 dB)
medido com `astats` **no stderr**; os geradores saem em níveis muito diferentes
(o whoosh nascia a −64 dB). Envelopes só com `afade ... curve=exp`: o `aeval` dá
violação de acesso neste build do ffmpeg-static. Os tempos estão em `sfx-02.json`.

## A voz (primeira versão)

Cadeia da `1 Processos/voz-nos-criativos`: highpass 80, afftdn leve, −2,5 dB em 220 Hz,
+2,5 dB em 3,5 kHz, de-esser, compressor 3:1, loudnorm −15 LUFS. As três cenas saíram
entre −15,0 e −15,4; o final mede −15,1 LUFS. Sem trilha: se entrar, pela biblioteca de
sons da Meta.

As fronteiras da fala vieram da energia (RMS por 20 ms, −42 dB), não do Whisper: no
IMG_3586 o Whisper põe "Quer" em 0,0 s e a fala começa em 1,15 s.

## Conferido executando (22/10)

- Transcrição do MP4 final pelo whisper-cli: as cinco falas inteiras, nenhuma palavra
  cortada.
- 25,89 s, 1080x1920, 30 qps, −15,1 LUFS.
- Quadros em 2, 4,7, 8,6, 13,7 e 20,7 s conferidos numa prancha.

## Os anúncios

| Anúncio | Começo | utm_content | Situação |
|---|---|---|---|
| L11 · 01 · repetitivo · sneakerspot | "Tem loja de roupa ou streetwear e passa o dia respondendo preço e tamanho no Instagram?" | `l11-01-repetitivo-sneakerspot` | **montado** |
| L11 · 02 · fisica · sneakerspot | "Você tem loja física de tênis ou streetwear e vende pelo Instagram?" | `l11-02-fisica-sneakerspot` | **montado** (22/10, regravado inteiro: IMG_3606 / 3604 / 3602; 23,0 s; o meio sem o "com tudo escolhido" e o fecho com "clica no botão") |
| L11 · 03 · previa · sneakerspot | "Tem loja de roupa ou streetwear? Eu monto uma prévia grátis da sua loja online." | `l11-03-previa-sneakerspot` | falta gravar o começo |

Os vídeos 2 e 3 reaproveitam as cenas B e C: só o clipe do começo muda.

Conjunto `previa-gratis · br · 13 criativos`, duplicando o 15 (h27u) com o Advantage+
creative desmarcado e as melhorias de IA desligadas; mudam o nome, o vídeo e a
`utm_content`. Texto, título, botão e pixel são os do 15. O h27u fica no ar como controle.

**Antes de publicar:** o OK do dono da SneakerSpot para a loja aparecer no anúncio.

## Os scripts

Em `4 Máquina/scripts/lote-11/` no cofre: `gravar-tela.mjs` (a vitrine no celular, quadro
a quadro, com a digitação do número e a leitura do link do WhatsApp), `camadas.mjs` (as
legendas, os balões, a máscara e o aro do círculo, a seta), `montar.mjs` (as três cenas e
o concat). Os caminhos apontam para o scratchpad da sessão: trocar.

## Revisão 3 do vídeo 2 (22/10, 14h40): "no 0:13 buga e não termina a fala"

**A causa:** o bruto do meio (IMG_3604) para antes da última palavra. A fala do Rafael vai
"...e te chama no WhatsApp" (acaba em 10,07 s do bruto), pausa de meio segundo, e o
"com tudo" começa em 10,62 s e o arquivo termina em 10,91 s com o som ainda a −19 dB: o
iPhone parou de gravar no meio da palavra, e o "escolhido" nunca existiu. Na montagem,
isso virava três coisas em 0:13: a tela do WhatsApp parada, a foto do Rafael congelada
pelo `tpad` no último quadro e uma sílaba solta antes do corte.

**A saída:** a frase fecha em "WhatsApp" (ponto final limpo): a voz B leva fade de
0,12 s em 9,10 s do B.wav e silêncio depois (o original está em `b2/voz/B-cheia.wav`);
a cena B passou de 10,05 para 9,6 s (o WhatsApp fica 1,5 s na tela, a foto segue viva
até o corte); os efeitos depois do corte andaram 0,45 s para trás. Final: 22,24 s,
−14,7 LUFS, transcrição "te chama no WhatsApp. Quer ver como fica a sua?".

**A primeira tentativa cortou errado** (em 8,56 s, ficou "te chama no A..."): a energia
mostrava dois blocos de fala com uma pausa curta entre eles e eu chamei o primeiro de
"WhatsApp". Transcrever cada bloco antes de decidir onde cortar; o Whisper serve para
isso, mesmo não servindo para o tempo.

**Para o vídeo 3 e os próximos:** antes de montar, medir a energia dos últimos 0,5 s de
cada bruto. Se a fala vai até o fim do arquivo, a última palavra está cortada, e a
decisão é regravar ou fechar a frase antes. Vídeo 1 está íntegro ("com tudo
escolhido" fecha 0,6 s antes do fim do IMG_3584).
