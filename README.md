# Rafael Razeira Estúdio — Landing Page

Landing page one-page de alta conversão. HTML + CSS + JS puro (sem build), pronta para deploy na Vercel.

## Rodar localmente

```bash
npm install   # só na primeira vez
npm run dev   # sobe em http://localhost:3000
```

(Precisa de servidor local porque a página usa módulos JS — não abra o `index.html` direto pelo `file://`.)

## Ordem das seções

Hero → Faixa rotativa → Conheça mais → Quem somos → Letreiro da marca →
Cases (vídeos em mockup de iPhone) → Para quem é → Valores (escura) →
Fundador (foto + nome) → Contato/Formulário → Faixa rotativa → Footer escuro

Para reordenar: array `page` em `js/main.js`.

## Estrutura das pastas

```
rafael-razeira-estudio/
├── index.html            → esqueleto da página (carrega CSS e JS)
├── css/
│   ├── base.css          → cores, tipografia, largura (--maxw), pill, componentes globais
│   └── sections/         → um arquivo de estilo por seção
│       ├── header  hero  marquee  cue  about  brandband  cases
│       ├── audience  values  founder  testimonials  contact
│       └── footer  pill
├── js/
│   ├── config.js         ⭐ CONTEÚDO — textos, cases, vídeos, footer, WhatsApp
│   ├── main.js           → monta as seções na ordem
│   ├── sections/         → estrutura (HTML) de cada seção
│   └── lib/              → reveal (animação), form (envio), pill (CTA), videos (cases)
└── assets/               → vídeos dos cases (case-1..3.mp4) e foto do fundador
```

### Onde mexer em cada coisa

| Quero mudar…                        | Abro…                                    |
|-------------------------------------|------------------------------------------|
| Textos, cases, footer, WhatsApp     | `js/config.js`                           |
| Cores / fontes / largura da página  | `css/base.css` (bloco `:root`)           |
| Estilo de uma seção (ex.: hero)     | `css/sections/hero.css`                  |
| Estrutura de uma seção              | `js/sections/hero.js`                    |
| Ordem das seções                    | `js/main.js` (array `page`)              |
| Vídeo de um case                    | troque o arquivo em `assets/` (vertical) |

## Detalhes de implementação

- **Cases**: vídeos verticais rodam em loop dentro de mockup de iPhone (CSS puro,
  com barra de status e dynamic island). Tocam só quando visíveis (`js/lib/videos.js`).
- **Faixas rotativas**: `CONFIG.marquee` aceita uma frase ou lista; o letreiro da marca
  (`brandband`) e o nome no footer usam `CONFIG.brand`/`CONFIG.footer.name`.
- **Hero desktop**: duas colunas; a headline é limitada também pela altura (`16vh`)
  para caber na primeira dobra em qualquer monitor.
- **Mobile**: header esconde o sufixo "ESTÚDIO" ≤460px; pill compacto ≤560px.

## Publicar na Vercel

1. Suba a pasta para um repositório no GitHub.
2. Em vercel.com → **Add New → Project** → importe o repositório.
3. Framework preset: **Other**. Sem build, sem output dir. Clique em **Deploy**.

## Pendências de conteúdo

- [ ] `FORM_ENDPOINT` em `js/config.js` — formulário está em modo demo (não envia leads)
- [ ] `footer.location` — trocar "ESTAMOS NO BRASIL" pela cidade real
- [ ] `footer.legal` — criar/apontar páginas de Termos de Uso e Política de Privacidade
- [ ] Depoimentos — `testimonials.enabled: true` quando tiver os vídeos

## Cor da marca

Verde **esmeralda** (`#10B981`) usada com disciplina: CTAs, status "agenda aberta",
categorias dos cases e o nome do fundador. Off-white (`#FAFAF7`) e preto (`#0A0A0A`)
são a base. Ajustes nas variáveis de `css/base.css`.
