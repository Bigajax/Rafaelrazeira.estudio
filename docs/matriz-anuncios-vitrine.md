# Matriz de anúncios da vitrine (método 15x3x3)

Guia operacional do teste de criativos da campanha da vitrine digital.
Base: método dos 135 anúncios (Alex Hormozi, via elcorvito) adaptado à
nossa realidade. Critério deste documento: em qualquer semana do teste,
dá pra saber o que matar, quando matar, o que nunca tocar e o que
precisa acontecer nos dados pra uma LP nova se justificar.

Campanha ativa otimiza pelo evento "Vitrine: formulário enviado"
(Contact), conjunto form-enviado. Espelho do funil na Mixpanel
(projeto 4043044, nomes em pt-BR).

---

## 1. O método

Todo anúncio em vídeo tem três blocos:

- **Hook**: primeiros 3 a 5 segundos, o que faz a pessoa parar o dedo.
- **Corpo**: o meio, onde mora a informação, o storytelling, a educação.
- **CTA**: o que a pessoa faz depois, na régua do Hormozi (o quê, por
  quê, quando, quão fácil, o que acontece depois).

Cada peça é gravada e renderizada separadamente e combinada como
quebra-cabeça: 15 hooks x 3 corpos x 3 CTAs = 135 combinações.

**135 é matemática, não meta.** O valor do método é a modularidade:
a matriz inteira fica escrita, mas sobe em lotes de 9 anúncios. Quando
um campeão morre, a variação seguinte já existe sem gravar nada de novo.

---

## 2. A matriz

### 2.1 Os 15 hooks

Falados ou como texto na tela nos 3 primeiros segundos. Todos nascem
de dores que a própria LP já valida.

| # | Hook |
|---|------|
| H01 | "Quantas vendas você perdeu essa semana no direct?" |
| H02 | "Se o cliente pergunta o preço e some, o problema não é o cliente." |
| H03 | "Sua loja responde as mesmas vinte perguntas todo dia." |
| H04 | "Pare de vender pelos stories." |
| H05 | "O cliente queria comprar. Desistiu antes de chamar." |
| H06 | "'Quanto custa?' 'Responde no privado.' É aí que a venda morre." |
| H07 | "Sua concorrente tem site. Você tem destaque de stories." |
| H08 | "Isso aqui é uma loja inteira dentro do Instagram." (sobre a demo rolando) |
| H09 | "Seu cliente não acha o produto. Ele não vai perguntar, ele vai embora." |
| H10 | "Foto, preço e tamanho: se o cliente precisa perguntar, você já perdeu." |
| H11 | "Eu montei uma loja completa em 7 dias úteis. Olha ela funcionando." |
| H12 | "Você não precisa de agência. Precisa de uma vitrine." |
| H13 | "O pedido chega pronto no seu WhatsApp. Sem vinte perguntas antes." |
| H14 | "R$ 999, sem mensalidade. Sim, projeto completo." |
| H15 | "Sua bio merece mais que um linktree." |

Slot nichado opcional (ver seção 4.2): um hook de joia pode entrar como
no máximo 1 dos 9 do lote, apontando pra mesma LP. Candidato:

| # | Hook |
|---|------|
| H16 | "Joia se vende pelo detalhe. E detalhe não cabe num story." |

### 2.2 Os 3 corpos

Gravados uma vez cada, reaproveitados nas 15 aberturas.

- **C1 Demo**: a vitrine da Sölo Urb ou da Xavier's rolando do topo ao
  rodapé, narrando o caminho: cliente toca no link da bio, vê foto,
  preço e tamanho, monta o pedido e cai no WhatsApp com tudo decidido.
- **C2 Educacional**: por que a venda morre no direct: produto
  espalhado entre stories e publicações antigas, atendimento que
  recomeça do zero a cada cliente, e como a vitrine inverte isso.
- **C3 História/quem faz**: o Rafael na mesa de trabalho: "sou eu que
  desenho, desenvolvo e publico, é comigo que você fala do primeiro oi
  até a loja no ar", com os projetos reais aparecendo.

### 2.3 Os 3 CTAs

Todos apontam para o formulário do hero (#hero-form), que é o evento
pelo qual a campanha otimiza.

- **CTA1 Facilidade**: "Deixa seu nome e WhatsApp no formulário que eu
  te chamo. Dois campos, dez segundos, e você recebe a proposta sem
  compromisso."
- **CTA2 Risco invertido**: "Projeto completo por R$ 999. Você começa
  com R$ 500 e o saldo só depois de aprovar. Toca no link e me deixa te
  mostrar como ficaria a sua."
- **CTA3 Urgência real**: "Sou uma pessoa, não uma agência: pego poucos
  projetos por mês. Preenche o formulário hoje e garante a próxima vaga
  da agenda."

---

## 3. Estrutura de campanha

Arquitetura fixa do experimento:

- **1 campanha**: a atual, otimizando "Vitrine: formulário enviado".
- **1 conjunto**: único, público aberto (form-enviado).
- **9 anúncios** girando dentro dele.

Rotação semanal acontece **só no nível de anúncio**. Campanha e
conjunto nunca se tocam: o aprendizado acumulado deles é o ativo mais
caro do experimento.

**Proibido:**

- Campanha de teste separada (tráfego, ThruPlay ou similar).
- Conjunto por nicho.
- Duplicar conjunto.

**Conjunto novo só em dois cenários futuros:**

1. Remarketing de visitante da LP.
2. Produto ou oferta nova.

Qualquer outra vontade de mexer em campanha ou conjunto é resolvida
trocando anúncio.

---

## 4. Medição e julgamento

### 4.1 Métrica de hook

Métrica personalizada no Gerenciador: **hook rate** = reproduções de
3 segundos ÷ impressões, em porcentagem.

- **Não existe corte absoluto.** A regra é relativa: mata o pior terço
  do lote.
- O lote 1 define o baseline real. Faixa esperada: 25 a 40%.
- 50% é teto aspiracional, não linha de corte.

### 4.2 Duas fases, um conjunto

Tudo dentro do mesmo conjunto de conversão:

- **Fase 1 (hook rate corta primeiro)**: ao fechar o lote, o pior terço
  por hook rate morre.
- **Fase 2 (CPL decide no final)**: os sobreviventes respondem por CPL.
  **Kill-line de CPL manda no final**: gastou 1,5 a 2x o CPL alvo sem
  gerar lead, morre, mesmo com hook rate bonito.

Segmentação por nicho acontece **no criativo, não no conjunto**. Hook
nichado (joia) entra no máximo como 1 dos 9 do lote, apontando pra
mesma LP.

### 4.3 Piso de julgamento

**500 a 1000 impressões por anúncio.** Abaixo disso o anúncio não
perdeu, foi ignorado pelo leilão: volta no lote seguinte sem
penalidade e não conta pro pior terço.

### 4.4 Leitura por componente

Descobrir qual hook, corpo ou CTA vence isoladamente exige **3 a 4
lotes acumulados** na nomenclatura H-C-CTA. O lote 1 elege anúncios
inteiros, não componentes. Antes desse acúmulo, nenhuma conclusão do
tipo "o corpo demo é o melhor" é válida.

---

## 5. Operacional e cadência

- **Nomenclatura**: todo anúncio nomeado `H03-C1-CTA2`. É ela que
  permite a leitura por componente da seção 4.4 e o espelho na
  Mixpanel.
- **Lote**: 9 anúncios por vez. Cada lote vive em arquivo próprio em
  `docs/lotes/` (lote-01.md, lote-02.md, ...), com as combinações, os
  roteiros e a tabela de resultados preenchida ao fechar a semana.
  Composição de referência: 3 hooks de dor + 3 de demo + 3 de
  preço/oferta, cruzados com os corpos; no máximo 1 slot para hook
  nichado.
- **Rotação semanal**: fecha a leitura do lote, aplica as duas fases
  (seção 4.2), e as vagas abertas recebem combinações novas da matriz.
  Rotação **não cria conjunto nem campanha nova**; é troca de anúncio
  dentro do conjunto único.
- **Produção**: cada hook, corpo e CTA renderizado em arquivo próprio,
  organizado em pastas (hooks/, corpos/, ctas/). Combinar é edição de
  montagem, não gravação.
- **Mineração**: Biblioteca de Anúncios da Meta para renovar hooks:
  quem vende site/loja para pequenos negócios, ofertas similares e
  ofertas escaladas de outros nichos (a estrutura do gancho viaja
  entre nichos).

---

## 6. Política de LP

- **LP única**: a atual (duas portas, #hero-form) é a **constante do
  experimento**. Todos os anúncios do teste apontam pra ela.
- **LP nichada de joias só nasce de dado**: ângulo de joia vencendo de
  forma consistente por 3 a 4 lotes, com PR Grife e PR Gold como
  prova. Antes disso, não existe.
- **Variação de headline via parâmetro de URL**: registrada como fase
  2 do experimento, fora do lote 1.

---

## 7. Resumo executável da semana

1. Anúncio com menos de 500 impressões: não julga, volta no próximo
   lote.
2. Entre os julgáveis, pior terço por hook rate: morre.
3. Sobrevivente que gastou 1,5 a 2x o CPL alvo sem lead: morre,
   independente do hook rate.
4. Vagas abertas: combinações novas da matriz, nomeadas H-C-CTA.
5. Nunca tocar: campanha, conjunto, LP, os 3 corpos e os 3 CTAs
   escritos.
6. LP nova só se o ângulo de joia vencer por 3 a 4 lotes seguidos.
