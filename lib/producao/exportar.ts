/* ============================================================
   A EXPORTAÇÃO — o que sai da oficina e entra no projeto do cliente

   A loja contratada continua com repo e Supabase próprios, duplicados como
   sempre. O que muda com a oficina é o que você leva para lá: em vez de
   digitar sessenta produtos, você leva três arquivos.

   QUATRO FORMATOS PORQUE SÃO QUATRO DESTINOS DIFERENTES:

   • CSV    → a tela de import do Supabase (Table Editor → Insert → Import
              data from CSV). É o caminho de menor atrito e o único que não
              exige saber o nome das colunas do projeto novo.
   • SQL    → o SQL Editor, quando a tabela de lá já tem forma própria e você
              prefere ajustar o insert do que renomear coluna no CSV.
   • JSON   → a ficha da marca, que não é dado de banco: é o que abastece o
              tema do template (paleta, fundo, tipografia).
   • PROMPT → o briefing inteiro, montado, para quem vai CONSTRUIR a vitrine.
              Ver a nota longa em `paraPrompt`.

   Tudo aqui é função pura, sem I/O, e roda no navegador: a tela gera o
   texto e entrega no clipboard ou como arquivo. Nada disso toca no banco.
   ============================================================ */

import type { Identidade, Loja, Produto } from "./tipos";

const COLUNAS = [
  "ordem", "nome", "marca", "cor", "preco", "preco_de", "tamanhos", "categoria", "descricao", "imagem",
] as const;

/* Aspas duplicadas e campo inteiro entre aspas quando houver vírgula, aspas
   ou quebra de linha. É o mínimo do RFC 4180, e é o que impede uma legenda
   com vírgula de virar duas colunas no import. */
function campoCsv(v: string | number | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function paraCsv(produtos: Produto[], urlDaImagem: (p: Produto) => string): string {
  const linhas = [COLUNAS.join(",")];
  for (const p of produtos) {
    linhas.push(
      [
        p.ordem,
        campoCsv(p.nome),
        campoCsv(p.marca),
        campoCsv(p.cor),
        p.preco ?? "",
        p.preco_de ?? "",
        campoCsv(p.tamanhos),
        campoCsv(p.categoria),
        campoCsv(p.descricao),
        campoCsv(urlDaImagem(p)),
      ].join(","),
    );
  }
  return linhas.join("\n");
}

/* Aspa simples dobrada, do jeito que o Postgres espera. Não é escapar por
   elegância: "Blusa D'Or" sem isso quebra o insert inteiro no meio, e o
   erro que aparece no SQL Editor aponta para a linha errada. */
const sqlTexto = (v: string | null) => (v === null || v === "" ? "null" : `'${v.replace(/'/g, "''")}'`);
const sqlNumero = (v: number | null) => (v === null || v === undefined ? "null" : String(v));

export function paraSql(
  produtos: Produto[],
  urlDaImagem: (p: Produto) => string,
  tabela = "produtos",
): string {
  if (!produtos.length) return `-- nenhum produto para exportar`;

  const valores = produtos
    .map((p) =>
      `  (${[
        p.ordem,
        sqlTexto(p.nome),
        sqlTexto(p.marca),
        sqlTexto(p.cor),
        sqlNumero(p.preco),
        sqlNumero(p.preco_de),
        sqlTexto(p.tamanhos),
        sqlTexto(p.categoria),
        sqlTexto(p.descricao),
        sqlTexto(urlDaImagem(p)),
      ].join(", ")})`,
    )
    .join(",\n");

  return [
    `-- ${produtos.length} produtos, exportados da oficina.`,
    `-- Confira os nomes das colunas antes de rodar: a tabela do projeto do`,
    `-- cliente pode chamar "imagem" de "foto" ou "imagem_url".`,
    `insert into public.${tabela} (ordem, nome, marca, cor, preco, preco_de, tamanhos, categoria, descricao, imagem) values`,
    valores + ";",
  ].join("\n");
}

/* O tema, do jeito que o template lê. A paleta sai nomeada e não como lista
   crua porque no template ela vira variável CSV: quem monta lá precisa
   saber qual é a cor da tinta e qual é a do fundo, e uma lista de cinco
   hex não responde isso. */
export function paraJson(loja: Loja, identidade: Identidade): string {
  const [tinta, apoio, ...resto] = identidade.paleta ?? [];
  return JSON.stringify(
    {
      marca: {
        arroba: loja.arroba,
        nome: loja.nome || loja.arroba,
        bio: loja.bio,
        site: loja.site,
        avatar: loja.avatar,
      },
      tema: {
        fundo: identidade.fundo ?? "claro",
        tinta: tinta ?? null,
        apoio: apoio ?? null,
        outras: resto,
        tipografia: identidade.tipografia ?? null,
      },
      observacoes: identidade.observacoes ?? null,
    },
    null,
    2,
  );
}

/* ============================================================
   O PROMPT — o briefing inteiro, montado

   Este é o formato que fecha a conta da oficina. Os três de cima entregam
   DADO para um projeto que já existe; este entrega a ORDEM DE SERVIÇO para
   quem ainda vai construir a vitrine, seja você com o Claude aberto no
   template, seja um gerador que monta do zero.

   ---------- por que ele funciona, e quando não funciona ----------
   Um prompt do tipo "faça uma loja bonita para a Kanton" devolve uma loja
   genérica: o gerador não sabe o preço da peça, não sabe a cor da marca e
   não conhece a régua da casa. Ele inventa as três coisas, e inventar é
   exatamente o que faz o resultado parecer template de revendedor.

   O que este arquivo monta é o contrário disso: um briefing onde quase nada
   é decisão do gerador. As fotos têm URL, os preços foram conferidos por
   você, a paleta saiu das fotos da própria marca, e as regras de desenho
   são as do estúdio, não as do gosto do modelo. O que sobra para o gerador
   é o trabalho dele: escrever o código.

   ---------- a régua vem por referência, não por cópia ----------
   As regras de desenho moram em docs/design-estudio.md, e este prompt
   APONTA para o arquivo em vez de copiar o texto dele. Copiar criaria uma
   segunda régua que envelhece sozinha: no dia em que a paleta da casa mudar
   lá, todo prompt já gerado continuaria ensinando a antiga. O resumo aqui é
   só o suficiente para o gerador saber o que ir ler.
   ============================================================ */

/* O catálogo entra como JSON e não como prosa: é o formato que o gerador
   consegue mapear direto para o componente de produto, e o que impede um
   preço virar frase no meio de um parágrafo. */
function catalogoJson(
  produtos: Produto[],
  urlDaImagem: (p: Produto) => string,
  urlDoId: (id: string) => string,
): string {
  return JSON.stringify(
    produtos.map((p) => ({
      nome: p.nome,
      marca: p.marca,
      cor: p.cor,
      preco: p.preco,
      preco_de: p.preco_de,
      tamanhos: p.tamanhos,
      categoria: p.categoria,
      descricao: p.descricao,
      imagem: urlDaImagem(p),
      /* Os outros ângulos DA MESMA peça, que vieram do carrossel. A
         vitrine usa na página do produto; sem eles, cada ângulo teria
         virado um produto repetido. */
      fotos: (p.fotos_extras ?? []).map(urlDoId).filter(Boolean),
    })),
    null,
    2,
  );
}

/* ---------- as superfícies, do lado da exportação ----------
   A tabela é a mesma de components/producao/Paleta.tsx, e a duplicação é
   consciente: a tela precisa do CSS para DESENHAR a amostra, e o briefing
   precisa dele para o gerador COLAR. Guardar o css no banco resolveria a
   duplicação e criaria outra pior: receita de textura congelada em cada
   loja, impossível de melhorar depois.

   Se um id novo aparecer aqui sem receita, o briefing diz o nome e manda
   o gerador usar cor chapada, que é o padrão seguro. */
/* `base` é o hex chapado por baixo da receita, e ele existe porque o token
   `--fundo` do compilado precisa de UM valor: gradiente não entra em
   variável de cor. A receita completa vai numa linha à parte. */
export const SUPERFICIES: Record<string, { nome: string; css: string; base: string }> = {
  papel: { nome: "papel liso", css: "#FBF9F3", base: "#FBF9F3" },
  "papel-grao": {
    nome: "papel com grão",
    css: "radial-gradient(#00000008 1px, transparent 1px) 0 0 / 3px 3px, #FBF9F3",
    base: "#FBF9F3",
  },
  linho: {
    nome: "linho",
    css: "repeating-linear-gradient(90deg, #00000007 0 1px, transparent 1px 4px), repeating-linear-gradient(0deg, #00000007 0 1px, transparent 1px 4px), #F5F2EA",
    base: "#F5F2EA",
  },
  creme: { nome: "creme quente", css: "#F7F1E4", base: "#F7F1E4" },
  concreto: {
    nome: "concreto",
    css: "radial-gradient(#00000010 1px, transparent 1px) 0 0 / 4px 4px, #E6E3DC",
    base: "#E6E3DC",
  },
  grafite: { nome: "grafite liso", css: "#14181A", base: "#14181A" },
  "grafite-grao": {
    nome: "grafite com grão",
    css: "radial-gradient(#ffffff0a 1px, transparent 1px) 0 0 / 3px 3px, #14181A",
    base: "#14181A",
  },
  preto: { nome: "preto puro", css: "#050505", base: "#050505" },
};

export function paraPrompt(
  loja: Loja,
  produtos: Produto[],
  urlDaImagem: (p: Produto) => string,
  urlDoId: (id: string) => string = () => "",
  material: string[] = [],
): string {
  const identidade = loja.identidade ?? {};
  const lugar = loja.lugar ?? null;
  const condicoes = loja.condicoes ?? {};
  const conceito = loja.conceito ?? {};

  /* ---------- o conceito, que é o que impede o texto genérico ----------
     Um briefing que descreve só o produto devolve uma página que descreve
     só o produto. As linhas abaixo são as únicas que dizem ao gerador
     COMO falar, e a negativa (o que a marca não é) trabalha mais que os
     adjetivos positivos, porque é ela que desvia o padrão de fábrica. */
  const linhasDoConceito = [
    conceito.personalidade?.length
      ? `- **Como esta marca fala**: ${conceito.personalidade.join(", ")}. Escreva a página nesse tom, inclusive os botões, os títulos de seção e as mensagens de WhatsApp. Quando duas vozes estiverem marcadas, a primeira manda no texto e a segunda tempera; elas não se dividem por seção.`
      : null,
    conceito.autoridade?.length
      ? `- **Por que confiar nela** (fatos conferidos, use na página): ${conceito.autoridade.join(" · ")}`
      : null,
    conceito.publico ? `- **Para quem é**: ${conceito.publico}` : null,
    conceito.promessa ? `- **O que a vitrine promete**: ${conceito.promessa}` : null,
    conceito.evitar ? `- **O que ela NÃO é** (respeite isto acima de qualquer referência): ${conceito.evitar}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const [tinta, apoio, ...outras] = identidade.paleta ?? [];
  const categorias = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))];
  /* As marcas saem das FOTOS (logo visível), e viram a faixa de marcas
     parceiras da vitrine: é uma seção que a concorrência não consegue
     preencher sem digitar loja por loja. */
  const marcas = [...new Set(produtos.map((p) => p.marca).filter(Boolean))];
  const semPreco = produtos.filter((p) => p.preco === null).length;
  const naoConferidos = produtos.filter((p) => !p.revisado).length;

  /* Só entra linha que tem conteúdo: campo vazio virava linha em branco no
     meio do briefing, e briefing esburacado lê como descuido justo na
     seção onde eu peço rigor. */
  const linhasDoTema = [
    tinta
      ? `- Tinta (a cor da marca, use nos destaques e no botão principal): \`${tinta}\``
      : "- Tinta: não definida. Use o grafite da régua da casa.",
    apoio ? `- Apoio: \`${apoio}\`` : null,
    outras.length ? `- Outras da paleta: ${outras.map((c) => `\`${c}\``).join(", ")}` : null,
    identidade.fundo === "escuro"
      ? "- Fundo: ESCURO. A vitrine nasce em fundo escuro e a foto do produto é a luz da tela."
      : "- Fundo: CLARO. A vitrine nasce em fundo claro e a foto do produto manda na tela.",
    /* A receita vai pronta: textura de vitrine é CSS, nunca imagem. Arquivo
       de fundo custa download em 4G, some quando o CDN falha e escala mal
       na tela grande. */
    identidade.superficie && SUPERFICIES[identidade.superficie]
      ? `- Superfície: ${SUPERFICIES[identidade.superficie].nome}. Use exatamente este CSS no body, e NÃO use imagem de fundo:\n  ` + "`" + "``css\n  background: " + SUPERFICIES[identidade.superficie].css + ";\n  " + "`" + "``"
      : identidade.superficie
        ? `- Superfície: ${identidade.superficie}. Use cor chapada, sem imagem de fundo.`
        : null,
    identidade.tipografia
      ? `- Tipografia: ${identidade.tipografia}`
      : "- Tipografia: escolha uma display condensada para as manchetes e uma sem serifa neutra para o corpo. Nunca mais de duas famílias.",
  ]
    .filter(Boolean)
    .join("\n");

  /* ---------- a loja física ----------
     O que o Google respondeu. A NOTA vem junto com o número de avaliações
     de propósito: 5,0 com duas avaliações não é a mesma coisa que 4,7 com
     trezentas, e um gerador que recebe só a nota escreve a frase errada.
     Sem ponto físico, o bloco inteiro some e a vitrine não ganha a seção
     de endereço, em vez de ganhar uma seção vazia. */
  /* ---------- as quatro respostas do cliente ----------
     O que não foi respondido vira uma INSTRUÇÃO de não inventar, e não um
     silêncio. Silêncio, num briefing, é convite para o gerador escrever
     'frete grátis para todo o Brasil' e transformar a prévia numa promessa
     que a loja não pode cumprir. */
  const RESPOSTAS: [keyof typeof condicoes, string][] = [
    ["frete", "Entrega"],
    ["pagamento", "Pagamento"],
    ["retirada", "Retirada na loja"],
    ["troca", "Troca"],
  ];
  const respondidas = RESPOSTAS.filter(([campo]) => (condicoes[campo] || "").trim());
  const condicoesEmTexto = respondidas.length
    ? respondidas.map(([campo, rotulo]) => `- **${rotulo}**: ${condicoes[campo]}`).join("\n") +
      (respondidas.length < RESPOSTAS.length
        ? `\n\nO que não está acima eu ainda não perguntei à loja: não escreva nada sobre isso na página.`
        : "")
    : "Ainda não perguntei nenhuma delas à loja. NÃO invente frete, prazo, parcelamento nem política de troca: deixe a página sem esse bloco e me avise que ele falta.";

  const linhasDaLoja = lugar
    ? [
        lugar.endereco ? `- Endereço: ${lugar.endereco}` : null,
        lugar.telefone ? `- Telefone da loja: ${lugar.telefone}` : null,
        lugar.nota != null
          ? `- No Google: ${String(lugar.nota).replace(".", ",")} estrelas${lugar.avaliacoes ? ` em ${lugar.avaliacoes} avaliações` : ""}. USE ISSO na página: é prova que a concorrência não tem.`
          : null,
        lugar.horario?.length ? `- Horário: ${lugar.horario.join(" | ")}` : null,
        lugar.maps ? `- Rota no Maps: ${lugar.maps}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "- Sem ponto físico no Google: NÃO invente endereço nem seção de loja.";

  /* O WhatsApp costuma estar na bio, e é o dado mais importante da vitrine
     inteira: sem ele, a loja não vende, ela informa. Puxo o primeiro número
     que aparecer no link ou no texto da bio e mando o gerador confirmar. */
  const doWhats = (loja.site || "") + " " + (loja.bio || "");
  const whats = doWhats.match(/(?:wa\.me\/|whatsapp\.com\/send\?phone=)?(\d{12,13})/)?.[1] ?? null;

  return `# Construir a vitrine digital da ${loja.nome || `@${loja.arroba}`}

Você vai construir uma VITRINE DIGITAL: um catálogo online que substitui o "chama no direct". O cliente da loja abre o link da bio, vê foto, preço e tamanho de cada peça, escolhe, e o pedido chega pronto no WhatsApp da loja. Não é e-commerce: não tem carrinho, não tem checkout, não tem cadastro.

## 1. A marca

- Nome: ${loja.nome || `@${loja.arroba}`}
- Instagram: @${loja.arroba} (https://instagram.com/${loja.arroba})
- Bio, palavra por palavra: ${loja.bio ? `"${loja.bio}"` : "(vazia)"}
- Link da bio: ${loja.site || "(nenhum)"}
- Tamanho: ${loja.seguidores ?? "?"} seguidores, ${loja.publicacoes ?? "?"} publicações
${whats ? `- WhatsApp: ${whats} (extraído da bio, CONFIRME antes de publicar)` : "- WhatsApp: NÃO ENCONTRADO na bio. Peça o número antes de construir: sem ele a vitrine não cumpre a função."}
${linhasDaLoja}
${identidade.observacoes ? `\n### O que eu sei desta marca\n\n${identidade.observacoes}\n` : ""}${
    loja.link_bio
      ? `\n### O que a loja já publica no link da bio\n\nTexto colhido de ${loja.site}. Serve para conferir preço, condição e nome de peça, e para NÃO contradizer o que ela já diz por lá:\n\n> ${loja.link_bio.slice(0, 1200).replace(/\n/g, " ")}\n`
      : ""
  }
## 2. O tema

${linhasDoTema}

${tinta ? "As cores acima foram extraídas das FOTOS REAIS da marca e conferidas à mão. Elas não são sugestão: são a paleta da loja." : "A ficha da marca ainda não foi preenchida: escolha as cores a partir das fotos do catálogo abaixo, sem inventar cor que a marca não usa."}

${linhasDoConceito ? `## 2.1 O conceito da marca\n\n${linhasDoConceito}\n\n` : ""}## 3. As regras de desenho da casa

Esta vitrine sai do Rafael Razeira Estúdio, e o estúdio tem régua escrita. Leia \`docs/design-estudio.md\` antes de desenhar qualquer coisa. O que mais importa aqui:

- **60/30/10**: 60% do fundo, 30% da estrutura e do texto, 10% de cor de ação. A cor da marca é os 10%, e ela marca AÇÃO, não decoração.
- **Papel e tinta**: bordas de filete, sombra dura quando houver, nada de gradiente de fundo, nada de sombra suave de card genérico.
- **A foto do produto é a peça**: ela nunca é cortada em círculo, nunca ganha filtro, nunca divide espaço com selo colorido.
- **Movimento discreto**: entrada curta, nada que balance ou pulse. Respeite \`prefers-reduced-motion\`.
- **Mobile primeiro, de verdade**: quase todo o tráfego chega pelo navegador interno do Instagram, em tela de 390px. Se quebrar lá, quebrou.
- **O que NÃO entra**: carrossel automático, contador regressivo, pop-up de saída, "compre agora" piscando, ícone de carrinho.

## 4. A página, dobra a dobra

1. **Topo**: nome da loja, e as três coisas que tiram dúvida antes da primeira pergunta (frete, parcelamento, retirada, o que for verdade para esta loja).
2. **Primeira dobra**: o que a loja vende, em uma frase, e o caminho para o catálogo. Sem manchete inventada de agência.
3. **Catálogo por categoria**: ${categorias.length ? `as categorias reais desta loja são ${categorias.map((c) => `**${c}**`).join(", ")}.` : "agrupe pelos campos `categoria` do catálogo."}${
    marcas.length
      ? `\n\n   **A faixa rotativa de marcas.** Esta loja trabalha com ${marcas.join(", ")}. Monte uma faixa horizontal que rola sozinha, com esses nomes, seguindo estas regras:\n\n   - **Nome em TEXTO, nunca logo.** Nome de marca para dizer que a loja revende é uso nominativo e é aceito; logo é marca figurativa registrada, e várias marcas restringem o uso por quem não é revendedor autorizado. Além disso, cinco logos coloridos destroem a paleta da página, porque cada um traz a cor da marca dele.\n   - **Tipografia da casa**, caixa alta, entreletra aberta (0.16em a 0.2em), tamanho pequeno. Separador entre os nomes: um ponto médio (·) ou uma barra fina, sempre o mesmo.\n   - **Rotação contínua**, da direita para a esquerda, sem botão e sem parar em cada item. Uma volta completa entre 30 e 45 segundos: mais rápido que isso vira ruído ao lado da foto do produto.\n   - **A trilha precisa conter a lista DUAS VEZES**, e a animação anda até translateX(-50%). É isso que faz o laço fechar sem emenda; com uma cópia só, aparece um vão branco a cada volta.\n   - **Pausa no hover** (animation-play-state: paused), para quem quiser ler.\n   - **prefers-reduced-motion: reduce** desliga a animação e mostra os nomes parados, em linha. A faixa é informação, não efeito: ela não pode sumir para quem pede menos movimento.\n   - Se as marcas couberem sem rolar na largura da tela, deixe estática: faixa que rola sem precisar é movimento gratuito.`
      : ""
  }
4. **A peça**: foto, nome, preço e tamanhos. Preço riscado só quando existir \`preco_de\`.
5. **O pedido**: cada peça tem um botão que abre o WhatsApp da loja com a mensagem JÁ ESCRITA, nomeando a peça. Exemplo: "Oi! Tenho interesse na [nome da peça] ([tamanho]). Ainda tem?".
6. **A loja**: endereço, horário e rota, se a loja for física.
7. **Rodapé**: Instagram, WhatsApp, e nada mais.

## 5. As condições comerciais

${condicoesEmTexto}

## 6. O catálogo (${produtos.length} ${produtos.length === 1 ? "peça" : "peças"})

As imagens já estão hospedadas e são de uso direto: use as URLs como estão.

A ORDEM DA LISTA NÃO É ALEATÓRIA e não é cronológica: ela é o ranking de curtidas dos posts originais. A primeira peça é a que o público desta loja mais curtiu. Respeite essa ordem na vitrine e destaque as primeiras.

\`\`\`json
${catalogoJson(produtos, urlDaImagem, urlDoId)}
\`\`\`

${semPreco ? `ATENÇÃO: ${semPreco} ${semPreco === 1 ? "peça está" : "peças estão"} sem preço. Mostre "consulte no WhatsApp" nelas, nunca invente valor.\n` : ""}${naoConferidos ? `ATENÇÃO: ${naoConferidos} ${naoConferidos === 1 ? "peça ainda não foi conferida" : "peças ainda não foram conferidas"} por mim. Trate esses dados como provisórios.\n` : ""}
${material.length ? `## 6.1 Material que a loja mandou\n\nSão arquivos que o dono da loja enviou (logo, fachada, tabela). Use o que fizer sentido, principalmente o logo:\n\n${material.map((u) => `- ${u}`).join("\n")}\n\n` : ""}## 7. Regras técnicas

- Next.js com App Router, TypeScript, CSS Modules. Sem Tailwind, sem biblioteca de componentes.
- Sem banco de dados: o catálogo acima entra como dado no projeto. A loja edita depois pelo painel, que não é escopo deste prompt.
- Imagens com \`loading="lazy"\`, dimensão declarada e \`alt\` que descreve a peça.
- A página inteira tem que abrir em menos de dois segundos num 4G comum.
- Nada de dependência que exija chave de API para a página funcionar.

## 8. Critérios de aceite

Antes de me entregar, confira:

1. Abri em 390px de largura e nada estoura para fora da tela.
2. Todo botão de pedido abre o WhatsApp certo, com a mensagem preenchida e o nome da peça correto.
3. Nenhum preço foi inventado: o que estava nulo aparece como "consulte", e nenhum valor difere do JSON acima.
4. A cor de ação aparece em no máximo 10% da tela, e sempre em coisa clicável.
5. O nome da marca aparece escrito como está no item 1, sem abreviação criativa.
6. Nada da lista "o que NÃO entra" apareceu no resultado.

Comece pela estrutura e pelo catálogo. Deixe o acabamento visual para o fim.`;
}
