# rafael-razeira-estudio

O site do estúdio, o CRM e a oficina de produção de vitrines, num Next.js 15 só.
As regras de trabalho do estúdio estão no `CLAUDE.md` de usuário e no cofre
`~/Desktop/rafaelrazeira.estúdio/`. Aqui fica o que é deste repositório.

## O que é o quê

| Caminho | O que é |
|---|---|
| `app/(pt)/` e `app/(en)/` | o site em dois idiomas; a URL decide (`middleware.ts`) |
| `public/estudio/` | a home é **HTML/CSS/JS estático**, não Next; `/` redireciona para lá |
| `public/proposta/` | uma proposta por cliente, com checkout real do Mercado Pago |
| `public/entrega/` | as cartilhas de entrega, por link |
| `app/(pt)/crm/` | o CRM: funil, produção (a oficina), caixa |
| `lib/producao/` | a oficina: do @ do Instagram ao prompt compilado |
| `lib/crm/regras.ts` | funções puras do funil, incluindo a escada do silêncio |
| `lib/propostas.ts` | **a autoridade sobre preço**; o valor nunca vem do browser |
| `scripts/` | a linha de comando da oficina e da prospecção |
| `docs/` | a régua de design (`design-estudio.md`), o 15x3x3, os lotes de anúncio |

## Antes de mexer

- **Preço de proposta** só muda em `lib/propostas.ts`. O HTML só exibe.
- **A oferta** (R$ 999 / entrada R$ 199) está em `lib/oferta.ts` **e** duplicada em
  `public/estudio/js/config.js`. Mudou aqui, muda lá.
- **Páginas por link** (`/proposta`, `/entrega`) levam `noindex` e estão no disallow do
  `app/robots.ts`. Isso impede o Google, **não** torna a página privada: as de entrega
  carregam a senha inicial do painel do cliente.
- **`/estudio` e `/landing-page` são irmãs** e dividem CSS e módulos. Mexer numa mexe na
  outra.
- Os scripts da oficina precisam de `.env.local` e rodam com
  `unset ANTHROPIC_API_KEY` na frente, senão a chave da sessão vaza por cima.

## Conferir

    npx tsc --noEmit
    npx next build      # e LER o exit code

Outra sessão pode estar com o dev server de pé na 3000. Build por cima dele derruba o CSS
do dev: avisar em vez de quebrar o trabalho alheio.
