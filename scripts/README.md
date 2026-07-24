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
