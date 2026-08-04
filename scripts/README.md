# Funil da Vitrine Digital pela API da Mixpanel

`mixpanel-funil.mjs` puxa os eventos crus e imprime o funil já limpo:

    node scripts/mixpanel-funil.mjs                    # ontem e hoje
    node scripts/mixpanel-funil.mjs 2026-08-01 2026-08-05

Precisa de `MIXPANEL_API_SECRET` no `.env.local` (mixpanel.com → engrenagem →
Project Settings → Access Keys). Sem dependência nenhuma: é `fetch` puro.

Existe porque a exportação pela interface vem só com as colunas marcadas na
tela, e sem `page` e `$current_url` não dá para separar quem entrou pela
vitrine de quem entrou por outra página do site. A API devolve todas as
propriedades, sempre.

O script já separa **visitante real** de **bot/datacenter** (Prineville,
Luleå, Dublin e San Jose são servidores da Meta, não gente), de **você em
Maringá** e de **teste em localhost**. Sem essa separação a leitura infla
quase três vezes: numa análise de 66 perfis, só 26 eram pessoas de verdade.

Ele responde: quantos chegaram em cada etapa, **até onde rolaram**, mediana de
tempo na página, quantos chegaram ao formulário e quantos precisaram do botão
de reabrir o WhatsApp. O JSON cru fica salvo na raiz e está no `.gitignore`,
porque traz cidade e URL de visitantes reais.

# Gravação do vídeo do hero da Vitrine Digital

`record-xavier-hero.mjs` grava a jornada de compra da vitrine da Xavier's
(site no ar) em `public/assets/demo/xavier-hero.mp4`, com legendas por passo.
`record-xavier-poster.mjs` gera a imagem estática limpa do produto
(`xavier-hero-still.jpg`), usada como poster e no modo "reduzir movimento".

Dependências (não ficam no package.json; instale sob demanda):

    npm i --no-save puppeteer-core ffmpeg-static

Rode a partir da pasta onde instalou as deps e copie os arquivos de `out/`
para `public/assets/demo/`. Usa o Chrome do sistema em
`C:\Program Files\Google\Chrome\Application\chrome.exe`.

# Capas do portfólio

`capture-portfolio.mjs` fotografa a primeira dobra de cada projeto entregue
(1280×800, WebP) direto em `public/portfolio/{slug}.webp`, que a página
`/portfolio` usa como capa dos cards. Sem argumentos, captura todos os sites
no ar; com `slug=url` captura só os pedidos, útil para os projetos sem deploy
público, servidos de um dev server local:

    node scripts/capture-portfolio.mjs
    node scripts/capture-portfolio.mjs star-point=http://localhost:4001

Fecha banner de cookies (botão "Aceitar") antes da foto. Mesma dependência
sob demanda dos scripts de gravação: `npm i --no-save puppeteer-core`.
