# Molde de placas do Performance

Abra **molde.html** no Chrome ou Edge. É um arquivo portátil: a arte, a seta original, as fontes e o exportador estão embutidos, e a edição funciona sem internet.

1. Preencha o nome da loja, o tipo de conquista, o marco e a data.
2. Escolha o acabamento. Em “Ajustar os textos da placa”, personalize número, unidade, descrição e frases.
3. Use **Baixar arte em PNG** para gerar a imagem de 1080 × 1920 px.
4. Use **Salvar meu molde editável** para baixar um novo HTML com os campos preenchidos. Abra essa cópia para continuar depois; alterações não são salvas automaticamente.

Os marcos de vendas disponíveis são R$ 10, 20, 50, 100, 300 e 500 mil. Há também modelos para pessoas na vitrine, chamadas no WhatsApp, tempo no ar e textos personalizados.

## No CRM

O editor fica em **Performance → Placas de conquista** (`/crm/performance/placas`), com acesso no cabeçalho do Performance e no botão **Criar placa** de cada loja. Também pode ser aberto a partir dos relatórios da loja.

A seleção usa os cadastros de `perf_lojas` visíveis à sessão e preenche o nome da loja. A data começa no dia atual em São Paulo. Marcos e valores continuam manuais, e gerar uma imagem não grava uma conquista. O HTML salvo volta a abrir como editor independente, sem o menu do CRM.

O arquivo é lido no servidor e incorporado à página autenticada; não é publicado na pasta de arquivos públicos. `outputFileTracingIncludes` em `next.config.ts` inclui o molde no pacote de produção.

O editor é uma ferramenta local do estúdio. Não consulta nem altera o painel, não valida conquistas e não envia a placa. Os textos distinguem vendas registradas de pagamentos verificados.

## Arte digital e fabricação

O PNG é uma apresentação para Status e Stories, com perspectiva, sombra e moldura simuladas. Para fabricar a placa física, ainda é necessário definir dimensões, material, espessura, fixação, cores e processo de gravação com o fornecedor e preparar um arquivo técnico adequado. Este molde não é um desenho de corte.

## Manutenção

- `placa.html`: fonte da arte aprovada, com a geometria de `components/performance/Selo.tsx`. A função `window.atualizarPlaca(dados)` atualiza a arte; os mesmos campos também podem ser informados na URL.
- `editor-base.html` e `editor.js`: interface e comportamento do editor.
- `fontes/`: subconjuntos latinos das fontes usadas na arte.
- `molde.html`: distribuição gerada; não editar manualmente.

Após alterar a arte ou o editor, execute na raiz do projeto:

```sh
node scripts/gerar-molde-placas.mjs
```

O script usa `html-to-image` já instalado no projeto. O gerador antigo `scripts/render-placas.mjs` continua disponível para renderizar as duas famílias em PNG e WebP pelo Chrome.

## Créditos

Design e marca: Performance, por Rafael Razeira Estúdio. Fontes: Cormorant Garamond e Inter, distribuídas pelo Google Fonts sob a SIL Open Font License 1.1; licenças em `fontes/`. Exportador: html-to-image, copyright © 2017–2025 W.Y., licença MIT em `fontes/html-to-image-LICENSE`. As licenças também acompanham o HTML portátil.
