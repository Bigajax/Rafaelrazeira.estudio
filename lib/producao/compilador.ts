/* ============================================================
   O COMPILADOR — a ficha inteira virando uma ordem de construção

   Cada bloco da ficha guardava e nada saía junto: cor num lugar, voz em
   outro, catálogo num terceiro. Este arquivo é onde as sete decisões viram
   UM artefato, e ele tem três regras que valem mais que o formato.

   ---------- 1. HEX RESOLVIDO, NUNCA NOME ----------
   "Marrom da logo" não constrói nada: quem lê precisa do valor. Toda cor
   sai como token CSS pronto para colar, e a superfície sai com a receita
   inteira.

   ---------- 2. CAMPO VAZIO NÃO VIRA PLACEHOLDER ----------
   Silêncio, num briefing, é convite para inventar. Um campo sem resposta
   não aparece como "[preencher]" nem como suposição: ou some, ou vira
   PROIBIÇÃO explícita. É por isso que a seção de condições comerciais, na
   prévia, é escrita como uma trava e não como uma lacuna: prometer "3x sem
   juros" numa loja que não parcela invalida a peça inteira.

   ---------- 3. PRÉVIA NÃO É A LOJA ----------
   Prévia com catálogo completo e WhatsApp funcionando é um site pronto de
   graça. O modo prévia corta o catálogo em doze peças, tira filtro, painel
   e página de peça, e o compilado diz ao agente POR QUE, para ele não
   "melhorar" a entrega sozinho.
   ============================================================ */

import {
  CATEGORIAS_MINIMO,
  EM_PROSA,
  HEROS,
  LAYOUTS,
  MARCAS_NA_TIRA,
  arquetipoAtual,
  categoriasDo,
  marcasDo,
  type Forma,
} from "./forma";
import { VOZ_DE, comAPeca, conflitoDe } from "./vozes";
import { SUPERFICIES } from "./exportar";
import type { Loja, Produto } from "./tipos";

export type Modo = "previa" | "completa";

/* Doze peças na prévia. Quem escolhe são as ESTRELAS da tabela: a escolha
   é sua, feita olhando as miniaturas. O ranking abaixo é só o preenchimento
   de quem não estrelou tudo, e o compilado diz quais são quais: um agente
   que não sabe a diferença trata as doze igual, e a primeira do hero passa
   a ser a primeira do feed. */
const NA_PREVIA = 12;

/* ---------- o WhatsApp da PRÉVIA é o do estúdio ----------
   Esta é a regra comercial mais cara do arquivo, e ela não pode ser
   decisão do agente. Prévia com o botão apontando para o número da loja é
   a vitrine funcionando de graça: a dona manda o link para as clientes e
   nunca mais precisa contratar nada.

   Apontando para cá, o mesmo botão vira o CTA do funil: quem clica é a
   dona da loja, e a mensagem já diz o que ela quer. */
const WHATS_ESTUDIO = "5544999997219";

function melhores(produtos: Produto[], quantas: number): Produto[] {
  return [...produtos]
    .sort((a, b) => nota(b) - nota(a) || a.ordem - b.ordem)
    .slice(0, quantas);
}
const nota = (p: Produto) => (p.preco !== null ? 2 : 0) + (p.revisado ? 1 : 0) + (p.marca ? 1 : 0);

const semAcento = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* Nome de token a partir do papel da cor, sempre com o hex ao lado: é o hex
   que constrói, o nome só organiza. */
function tokens(loja: Loja): string {
  const identidade = loja.identidade ?? {};
  const [tinta, apoio, ...outras] = identidade.paleta ?? [];
  const sup = identidade.superficie ? SUPERFICIES[identidade.superficie] : null;
  const escuro = identidade.fundo === "escuro";

  const linhas = [
    tinta ? `  --tinta: ${tinta};` : null,
    apoio ? `  --apoio: ${apoio};` : null,
    ...outras.map((c, i) => `  --apoio-${i + 2}: ${c};`),
    `  --fundo: ${sup?.base ?? (escuro ? "#14181A" : "#FBF9F3")};`,
    `  --texto: ${escuro ? "#EDEBE4" : "#14181A"};`,
    `  --texto-fraco: ${escuro ? "#9AA09C" : "#3A4144"};`,
    `  --linha: ${escuro ? "#2A3134" : "#D8D3C4"};`,
  ].filter(Boolean);

  return ["```css", ":root {", ...linhas, "}", "```"].join("\n");
}

/* A manchete da voz com a peça REAL da loja dentro, pela mesma regra da
   tela: a estrelada primeiro, porque é a peça escolhida para abrir a
   vitrine; depois a primeira com preço. Sem catálogo, o modelo sai com o
   exemplo genérico, e ainda assim serve de forma. */
function comAPecaDoCatalogo(modelo: string, produtos: Produto[]): string {
  /* Mesma ordem da tela: a primeira ESTRELADA na ordem do hero, e não a
     primeira do catálogo. As duas telas precisam mostrar a mesma frase, ou
     o exemplo deixa de ser exemplo. */
  const estreladas = produtos
    .filter((x) => x.destaque)
    .sort((a, b) => (a.ordem_destaque ?? 1e9) - (b.ordem_destaque ?? 1e9) || a.ordem - b.ordem);
  const peca =
    estreladas.find((x) => x.preco !== null && x.tamanhos) ??
    estreladas.find((x) => x.preco !== null) ??
    produtos.find((x) => x.preco !== null) ??
    null;
  return comAPeca(modelo, peca);
}
function secaoForma(forma: Forma): string {
  const linhas: string[] = [];
  if (forma.volume) {
    linhas.push(
      `- Catálogo ${forma.faixa === "curto" ? "curto" : forma.faixa === "longo" ? "longo" : "médio"}: ${forma.volume} peças.`,
    );
  }
  if (forma.foto) linhas.push(`- ${EM_PROSA[forma.foto]}`);
  for (const v of forma.variacao) linhas.push(`- ${EM_PROSA[v]}`);
  if (forma.preco) linhas.push(`- ${EM_PROSA[forma.preco]}`);
  if (forma.clique) linhas.push(`- ${EM_PROSA[forma.clique]}`);
  if (forma.esgotado) linhas.push(`- ${EM_PROSA[forma.esgotado]}`);
  if (forma.categorias === true) {
    linhas.push(
      `- O catálogo tem ${forma.n_categorias ?? "várias"} categorias: agrupe por elas e use os nomes que vierem no JSON.`,
    );
  }
  if (forma.categorias === false) {
    linhas.push("- Sem categorias: não invente agrupamento nem menu de filtro por tipo.");
  }

  const arq = LAYOUTS.find((l) => l.id === forma.layout);
  if (arq) {
    linhas.push("");
    linhas.push(`**Arquétipo: ${arq.nome.toUpperCase()}** (${arq.oque})`);
    linhas.push("");
    linhas.push(arq.estrutura);
    /* A prosa do arquétipo é fixa e as respostas acima são desta loja, então
       elas se contradizem de vez em quando: a FEIRA descreve um filtro por
       categoria, e um catálogo de duas categorias respondeu que não tem
       categoria nenhuma. Sem esta linha, quem lê escolhe uma das duas no
       escuro, e a chance é metade. Com ela, a contradição vira uma regra em
       vez de um bug, e vale para toda colisão futura, não só esta. */
    linhas.push("");
    linhas.push(
      "Onde a descrição do arquétipo discordar das respostas acima, as RESPOSTAS mandam: elas são desta loja, a descrição é um molde.",
    );
  }

  return linhas.join("\n");
}

/* ---------- a trava da foto de perfil ----------
   A prévia acontece ANTES de existir cliente: MATERIAL está vazio, e o único
   arquivo de marca que existe é a foto de perfil do Instagram, que a API
   entrega com 320px no melhor caso.

   Esta é uma armadilha específica e cara: 320px passa despercebido no
   cabeçalho de 40px e explode em qualquer coisa maior. Sem a frase abaixo,
   um gerador razoável usa a foto de perfil como marca d'água de fundo, e a
   primeira coisa que a dona da loja vê é o próprio logo borrado.

   A frase é literal de propósito: número em pixel não se interpreta. */
const TRAVA_AVATAR =
  "A imagem de perfil tem resolução baixa. Nunca renderize acima de 88px de largura. Não use como fundo, não amplie, não coloque no hero em tamanho grande.";

/* ---------- o orçamento da dobra ----------
   Sem número escrito, o hero sai com `100vh` e a primeira fileira do
   catálogo nunca aparece. E `100vh` no celular é pior do que parece: ele
   conta a barra de endereço que some, então a tela cheia é sempre um pouco
   maior que a tela.

   380 × 820 é o aparelho mediano do Brasil, e 520px deixa 300 de sobra: o
   suficiente para a fileira de produtos espiar e a pessoa entender que
   existe loja embaixo da capa. */
const VIEWPORT = "380 × 820";
const TETO_HERO = 520;
const ESPIA = 90;

const TRAVA_SEM_LOGO =
  "Não existe arquivo de logo em alta. O hero é tipográfico: o nome da loja composto na fonte de display definida acima. Não tente reconstruir, vetorizar ou aumentar a foto de perfil.";

function secaoHero(
  loja: Loja,
  forma: Forma | null,
  material: string[],
  noHero: Produto[],
  urlDaImagem: (p: Produto) => string,
  previa: boolean,
  /* O catálogo inteiro, e não só as escolhidas: a grade de entrada precisa
     das categorias, e a tira precisa das marcas. As duas coisas são
     recalculadas aqui e não lidas do que está salvo na ficha, porque uma
     leitura de catálogo posterior deixaria a lista salva velha em silêncio. */
  produtos: Produto[],
): string {
  const hero = forma?.hero ?? null;
  const semLogo = !material.length;
  const categorias = categoriasDo(produtos);
  const marcas = marcasDo(produtos).slice(0, MARCAS_NA_TIRA);
  /* Sem arquivo de logo, o arquétipo é forçado, e não sugerido: qualquer um
     dos outros três abre a página com uma imagem grande, e a única imagem de
     marca disponível é a foto de perfil de 320px. O motivo vai junto, numa
     linha, porque a instrução contradiz o que a ficha escolheu e uma
     contradição sem motivo é lida como engano. */
  /* `arquetipoAtual` traduz a ficha antiga: a FAIXA saiu e virou grade de
     entrada, e um prompt gerado a partir de ficha velha não pode sair sem
     hero nenhum por causa de um nome que mudou. */
  const escolhido = arquetipoAtual(hero?.arquetipo);
  /* Duas trocas, nesta ordem. A primeira é sobre material que não existe
     (logo), a segunda é sobre material que não dá (categorias de menos), e
     a de logo vence porque ela derruba qualquer abertura com imagem. */
  const semGrade = escolhido === "grade_entrada" && categorias.length < CATEGORIAS_MINIMO;
  const arquetipo = semLogo ? "letreiro" : semGrade ? "mosaico" : escolhido;
  const arq = HEROS.find((h) => h.id === arquetipo);

  const linhas: string[] = [];

  if (semLogo && escolhido && escolhido !== "letreiro") {
    linhas.push(
      `A ficha escolheu outra abertura, mas ela foi TROCADA aqui: sem arquivo de logo em alta, toda abertura baseada em imagem grande cai na foto de perfil do Instagram, que não aguenta o tamanho. O hero desta peça é tipográfico.`,
    );
    linhas.push("");
  } else if (semGrade) {
    linhas.push(
      `A ficha pediu uma grade de entrada por categoria, e ela foi TROCADA aqui: o catálogo tem ${categorias.length} ${categorias.length === 1 ? "categoria" : "categorias"}, e uma grade com menos de ${CATEGORIAS_MINIMO} blocos não é uma grade, é uma fileira torta. A abertura desta peça é uma composição de fotos.`,
    );
    linhas.push("");
  }

  /* O número de fotos é o do arquétipo QUE SAIU, e não o da ficha: quando
     a falta de logo troca a abertura para tipográfica, as cinco fotos do
     mosaico não cabem mais, e mandar cinco para uma tela que usa uma faz
     quem constrói escolher qual usar, que é a decisão que esta seção
     existe para tirar da mesa. */
  const pedido = hero?.n_fotos ?? 5;
  const n =
    arquetipo === "peca_unica"
      ? 1
      : arquetipo === "letreiro"
        ? Math.min(1, pedido)
        : arquetipo === "grade_entrada"
          ? /* Na grade o número não é escolha da ficha: é quantas categorias
               o catálogo tem, e `categoriasDo` já corta em seis. */
            categorias.length
          : pedido;

  if (arq) {
    linhas.push(arq.estrutura(n));
  } else {
    linhas.push(
      "A primeira tela não foi definida na ficha. Abra a página com o nome da loja em tipografia, sobre a superfície dos tokens, e comece o catálogo logo abaixo. Não invente uma composição de fotos.",
    );
  }

  if (hero?.texto) {
    linhas.push("");
    linhas.push(`- ${EM_PROSA[hero.texto]}`);
  }
  if (hero?.dobra) {
    linhas.push(hero.texto ? `- ${EM_PROSA[hero.dobra]}` : `\n- ${EM_PROSA[hero.dobra]}`);
  }

  /* ---------- o orçamento da dobra ----------
     Nada do que está escrito acima funciona se o hero não couber. Sem
     número, sai `100vh` e a primeira fileira do catálogo nunca aparece: a
     página vira uma capa, e a loja fica escondida atrás de uma rolagem que
     a maior parte das pessoas não dá. */
  linhas.push("");
  linhas.push("### O orçamento da dobra");
  linhas.push("");
  linhas.push(
    `Referência de viewport: ${VIEWPORT}. O hero, incluindo cabeçalho e tira de marcas, ocupa no máximo ${TETO_HERO}px de altura. Não use \`100vh\`, \`100svh\` nem \`min-height\` de viewport no hero.`,
  );
  if (hero?.dobra === "com_fileira") {
    linhas.push("");
    linhas.push(
      `Ao menos ${ESPIA}px da primeira fileira de produtos precisa aparecer sem rolagem.`,
    );
  }
  linhas.push("");
  linhas.push(
    "A primeira imagem do hero é o LCP da página. Alvo de 2,5s. Sirva em WebP com `priority`, largura máxima de 1600px, e não coloque texto sobre imagem que precise de fonte externa carregada antes de aparecer.",
  );

  /* ---------- a tira de marcas ----------
     Loja multimarcas desconhecida empresta credibilidade das marcas que
     vende, e essa é quase sempre a única credibilidade que a primeira tela
     tem. A instrução de renderizar EM TEXTO não é estética: logo de
     terceiro puxado do Instagram chega em 200px e borra, e usar marca alheia
     como imagem numa página que não é revenda oficial é problema de outra
     natureza. O nome na tipografia da vitrine resolve os dois. */
  if (hero?.tira_marcas && marcas.length) {
    linhas.push("");
    linhas.push("### A tira de marcas");
    linhas.push("");
    linhas.push("Abaixo do hero e acima da dobra, uma linha só:");
    linhas.push("");
    linhas.push(marcas.join(" · "));
    linhas.push("");
    linhas.push(
      "Renderize os nomes EM TEXTO, na fonte de display definida na seção 3. Não use logo, não baixe logo de nenhuma dessas marcas, não vetorize logo. Sem link e sem filtro nesta tira: ela é prova, não navegação.",
    );
    linhas.push("");
    linhas.push(
      "O motivo: quem chega não conhece esta loja, mas conhece essas marcas. Logo de terceiro puxado do Instagram chega em baixa resolução e piora o resultado; o nome composto na tipografia da vitrine resolve melhor e não usa marca alheia como imagem.",
    );
  }

  /* ---------- a marca na tela ---------- */
  linhas.push("");
  linhas.push("### A marca na tela");
  linhas.push("");
  linhas.push(semLogo ? `${TRAVA_SEM_LOGO}\n\n${TRAVA_AVATAR}` : TRAVA_AVATAR);

  /* ---------- as peças do hero ----------
     Sem esta lista, "use as de melhor foto" faz o agente pegar as primeiras
     do JSON, que são as primeiras do feed. Aqui elas vêm nomeadas e na
     ordem, que é a decisão que a tira de escolhidas existe para tomar. */
  /* ---------- a grade manda blocos, não peças ----------
     Aqui a lista muda de natureza: na grade de entrada cada item é uma
     CATEGORIA, com a contagem e a foto de uma peça real dela. Mandar as
     escolhidas seria mandar seis peças para uma tela que mostra seis
     portas. */
  if (arquetipo === "grade_entrada" && categorias.length) {
    linhas.push("");
    linhas.push("### Os blocos da grade, nesta ordem");
    linhas.push("");
    linhas.push(
      [
        "```json",
        JSON.stringify(
          categorias.map((c) => ({
            categoria: c.categoria,
            pecas: c.pecas,
            imagem: urlDaImagem(c.peca),
          })),
          null,
          2,
        ),
        "```",
      ].join("\n"),
    );
    linhas.push("");
    linhas.push(
      "Um bloco por categoria, exatamente estas e nesta ordem. A foto de cada uma é a peça que você vê no JSON: não troque por outra da mesma categoria.",
    );
    return linhas.join("\n");
  }

  /* A lista tem exatamente o tamanho que a tela usa. Mandar as doze
     estreladas para um hero de três é devolver a escolha ao agente. */
  const doHero = noHero.slice(0, n);
  if (doHero.length) {
    linhas.push("");
    linhas.push("### As peças do hero, nesta ordem");
    linhas.push("");
    linhas.push(
      [
        "```json",
        JSON.stringify(
          doHero.map((x) => ({ nome: x.nome, preco: x.preco, imagem: urlDaImagem(x) })),
          null,
          2,
        ),
        "```",
      ].join("\n"),
    );
    linhas.push("");
    linhas.push(
      "Esta ordem foi escolhida à mão, olhando as fotos. Use exatamente estas, exatamente nesta ordem, e não substitua por outras do catálogo.",
    );
  } else if (previa && n > 0) {
    linhas.push("");
    linhas.push(
      "Nenhuma peça foi escolhida à mão para o hero: use as primeiras do catálogo abaixo, e prefira as que tiverem foto mais limpa.",
    );
  }

  return linhas.join("\n");
}

export function compilar(
  loja: Loja,
  produtos: Produto[],
  urlDaImagem: (p: Produto) => string,
  modo: Modo,
  /* As URLs do que o cliente mandou pelo WhatsApp. Só uma pergunta é feita
     a esta lista, e ela decide o hero inteiro: existe arquivo de logo em
     alta, ou o único que existe é a foto de perfil do Instagram? */
  material: string[] = [],
): string {
  const identidade = loja.identidade ?? {};
  const conceito = loja.conceito ?? {};
  const condicoes = loja.condicoes ?? {};
  const forma = loja.forma ?? null;
  const lugar = loja.lugar ?? null;
  const previa = modo === "previa";

  const doWhats = `${loja.site ?? ""} ${loja.bio ?? ""}`;
  const whats = doWhats.match(/(?:wa\.me\/|whatsapp\.com\/send\?phone=)?(\d{12,13})/)?.[1] ?? null;
  /* O pedaço do endereço que termina em UF, e não uma posição fixa: o
     Google devolve "Rua X, 100 - Bairro, Juiz de Fora - MG, 36000-000" e
     também endereços sem número e sem CEP, então contar da direita para a
     esquerda já entregou "Cidade: 100" numa ficha. */
  const cidade =
    lugar?.endereco
      ?.split(",")
      .map((x) => x.trim())
      .find((x) => / - [A-Z]{2}$/.test(x))
      ?.split(" - ")[0] ?? null;

  /* As estreladas primeiro, na ordem que você deu na tira; o resto entra
     só para completar as doze, e entra identificado. */
  const estreladas = produtos
    .filter((x) => x.destaque)
    .sort((a, b) => (a.ordem_destaque ?? 1e9) - (b.ordem_destaque ?? 1e9) || a.ordem - b.ordem);
  const completadas = previa
    ? melhores(
        produtos.filter((x) => !x.destaque),
        Math.max(0, NA_PREVIA - estreladas.length),
      )
    : [];
  const pecas = previa ? [...estreladas, ...completadas].slice(0, NA_PREVIA) : produtos;
  /* As do hero são as estreladas, cortadas no doze: estrelar vinte é
     permitido, e as oito que sobram ficam no catálogo, não na primeira
     tela. É o mesmo corte que a tira desenha. */
  const noHero = estreladas.slice(0, NA_PREVIA);
  const catalogo = pecas.map((x) => ({
    nome: x.nome,
    marca: x.marca,
    preco: x.preco,
    cor: x.cor,
    tamanhos: x.tamanhos,
    categoria: x.categoria,
    imagem: urlDaImagem(x),
  }));

  const respondidas = (["frete", "pagamento", "retirada", "troca"] as const).filter((k) =>
    (condicoes[k] ?? "").trim(),
  );

  const partes: string[] = [];

  /* ---------- 1. identidade ---------- */
  partes.push(`# ${previa ? "PRÉVIA" : "VITRINE"} — ${loja.nome || `@${loja.arroba}`}`);
  partes.push("");
  partes.push("## 1. A loja");
  partes.push("");
  partes.push(
    [
      `- Nome: ${loja.nome || `@${loja.arroba}`}`,
      `- Instagram: @${loja.arroba}`,
      cidade ? `- Cidade: ${cidade}` : null,
      /* NA PRÉVIA O NÚMERO DA LOJA NÃO ENTRA, e esta linha é o que faz a
         regra da seção 9 valer alguma coisa: mandar o agente não usar o
         número e entregar o número três seções antes é confiar no
         autocontrole de quem lê. O que não está no documento não vaza. */
      whats && !previa ? `- WhatsApp: https://wa.me/${whats}` : null,
      whats && previa
        ? "- A loja tem WhatsApp, e ele foi omitido de propósito deste documento: ver a seção 9."
        : null,
      loja.bio ? `- Posicionamento, da própria bio: "${loja.bio}"` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  /* ---------- 2. tokens ---------- */
  partes.push("");
  partes.push("## 2. Tokens");
  partes.push("");
  partes.push(tokens(loja));
  const sup = identidade.superficie ? SUPERFICIES[identidade.superficie] : null;
  if (sup) {
    partes.push("");
    partes.push(`Superfície: **${sup.nome}**. Use esta receita no body, e nenhuma imagem de fundo:`);
    partes.push("");
    partes.push(["```css", `background: ${sup.css};`, "```"].join("\n"));
  }

  /* ---------- 3. tipografia ----------
     Esta é a única seção que sai MESMO VAZIA, e por um motivo de leitura: a
     numeração é fixa, e um documento que pula do 2 para o 4 avisa a quem lê
     que alguma coisa foi cortada no caminho. Sem par escolhido, o lugar
     continua lá e a seção vira o que ela é de fato: a instrução de NÃO
     inventar tipografia, que é o primeiro lugar onde um gerador improvisa. */
  partes.push("");
  partes.push("## 3. Tipografia");
  partes.push("");
  partes.push(
    identidade.tipografia
      ? `- Par: **${identidade.tipografia}**. A primeira família é a display (manchete, nome da loja, preço em destaque); a segunda é o corpo, e só.\n- Display em caixa alta apenas nas manchetes, peso máximo da família, tracking negativo leve (-0.01em).\n- Corpo em 15 a 16px, entrelinha 1.5, tracking zero.\n- Rótulos e dados (tamanho, categoria) em caixa alta, tracking 0.14em, corpo pequeno.`
      : "- Nenhum par foi escolhido na ficha. NÃO escolha um por conta: use a pilha do sistema (`system-ui, -apple-system, Segoe UI, Roboto, sans-serif`) em tudo, e resolva o contraste com peso e caixa, não com uma segunda família.\n- Corpo em 15 a 16px, entrelinha 1.5. Rótulos e dados em caixa alta, tracking 0.14em, corpo pequeno.",
  );

  /* ---------- 4. forma ---------- */
  if (forma) {
    partes.push("");
    partes.push("## 4. A forma");
    partes.push("");
    partes.push(secaoForma(forma));
  }

  /* ---------- 5. hero ----------
     Escrito em estrutura, nunca com o nome do arquétipo: quem constrói a
     vitrine não sabe o que é um "mosaico", e "faça um mosaico" é a
     instrução mais vazia que existe. */
  partes.push("");
  partes.push("## 5. O hero");
  partes.push("");
  partes.push(secaoHero(loja, forma, material, noHero, urlDaImagem, previa, produtos));

  /* ---------- 6. voz ----------
     Uma voz, e as REGRAS DE ESCRITA dela por extenso. O nome do tom
     sozinho ("acolhedora") é um adjetivo, e dois leitores escrevem páginas
     opostas a partir dele; "trata a cliente por você e escreve eu separei;
     o preço fecha a frase" é a mesma decisão de um jeito que se cumpre. */
  const voz = VOZ_DE(conceito.tom ?? conceito.personalidade?.[0]);
  const cta = (conceito.cta ?? voz?.botao ?? "").trim();
  if (voz || conceito.publico || conceito.promessa) {
    partes.push("");
    partes.push("## 6. A voz");
    partes.push("");
    partes.push(
      [
        voz ? `- Tom: **${voz.nome}** (${voz.nota}).` : null,
        voz ? `- Como esta voz escreve: ${voz.escrita}.` : null,
        voz
          ? `- A manchete de abertura, no modelo desta voz: "${comAPecaDoCatalogo(voz.manchete, produtos)}"`
          : null,
        conceito.publico ? `- Para quem: ${conceito.publico}` : null,
        conceito.promessa ? `- O que a página promete: ${conceito.promessa}` : null,
        conceito.autoridade?.length
          ? `- Fatos que a loja pode reivindicar (todos conferidos, use como estão): ${conceito.autoridade.join(" · ")}`
          : null,
        /* A palavra do botão é o texto que mais se repete numa vitrine, e é
           o primeiro que um gerador "melhora" sozinho: PEDIR NO ZAP vira
           "Comprar agora" em dois parágrafos. Por isso ela vai como
           instrução, e não como sugestão. */
        cta
          ? `- **A palavra de TODO botão de pedido é: \`${cta}\`**. Literalmente essa, em todos eles, sem variação, sem sinônimo e sem reescrever para caber. Não use "Comprar", "Ver mais" nem "Saiba mais" em lugar nenhum.`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );

    /* ---------- quando a voz e a forma discordam ----------
       A tela avisa e não impede, porque às vezes a contradição é a decisão
       certa. O compilado não pode deixar isso ambíguo: duas instruções
       opostas no mesmo documento fazem quem lê escolher no escuro, e a
       escolha que interessa é sempre a mesma. */
    const briga = conflitoDe(voz?.nome, forma);
    if (briga) {
      partes.push("");
      partes.push(
        `A voz escolhida e a estrutura da seção 4 discordam: ${briga}. Quando isso acontecer, **obedeça à seção 4**: ajuste o texto para caber na estrutura, e não a estrutura para caber no texto.`,
      );
    }
  }

  /* ---------- 6. fronteiras ---------- */
  const fronteiras: string[] = [];
  if (conceito.evitar) {
    fronteiras.push(
      ...conceito.evitar
        .split(/[,.;]\s*/)
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => `- ${x[0].toUpperCase()}${x.slice(1)}.`),
    );
  }
  /* A trava das condições comerciais. Ela é literal e é o item mais
     importante do compilado numa prévia: a loja ainda não respondeu, e a
     tentação do gerador é preencher com o que "toda loja tem". */
  /* A trava nomeia SÓ o que falta. Quando a loja já respondeu entrega e
     retirada, dizer "entrega não foi respondida" três linhas antes de
     imprimir a entrega confirmada deixa o documento se contradizendo, e
     quem lê escolhe no escuro qual das duas obedecer. */
  if (respondidas.length < 4) {
    const rotuloDe: Record<string, string> = {
      frete: "entrega",
      pagamento: "pagamento",
      retirada: "retirada",
      troca: "troca",
    };
    const faltam = (["frete", "pagamento", "retirada", "troca"] as const)
      .filter((k) => !respondidas.includes(k))
      .map((k) => rotuloDe[k]);
    const lista = faltam.length > 1 ? `${faltam.slice(0, -1).join(", ")} e ${faltam[faltam.length - 1]}` : faltam[0];
    fronteiras.push(
      `- ${lista[0].toUpperCase()}${lista.slice(1)} ${faltam.length > 1 ? "não foram respondidos" : "não foi respondido"} pela loja. Não crie seção nem frase sobre ${lista}. Não escreva "frete grátis", "3x sem juros", "troca em 7 dias" nem equivalente. Inventar uma condição comercial que a loja não pratica invalida a peça inteira.`,
    );
  }
  if (!identidade.paleta?.length) {
    fronteiras.push("- A paleta não foi definida: tire as cores das próprias fotos do catálogo e não invente cor de marca.");
  }
  /* A lista literal. `evitar` acima é posicionamento e se interpreta; esta
     não se interpreta, e é ela que segura o vocabulário de fábrica: sem a
     lista, "imperdível" e "garanta já" aparecem sozinhos na primeira
     tentativa de qualquer gerador. */
  /* ---------- nada de carrossel ----------
     É a instrução que mais se paga do compilado inteiro. Banner rotativo é
     o primeiro reflexo de quem monta vitrine, e é onde o conteúdo vai
     morrer: o segundo slide perde metade da audiência do primeiro, e o
     terceiro não existe. Vale nos dois modos. */
  fronteiras.push(
    "- Nada de carrossel, slider ou banner rotativo em nenhuma parte da página, nem no hero, nem em vitrine de destaques. Use seção estática. Uma mensagem, um CTA.",
  );
  if (conceito.proibidas?.length) {
    fronteiras.push(
      `- **Nenhuma destas palavras pode aparecer na página**, nem flexionada, nem em título, botão, descrição ou microcopy: ${conceito.proibidas.map((x) => `\`${x}\``).join(", ")}.`,
    );
  }
  if (fronteiras.length) {
    partes.push("");
    partes.push("## 7. Fronteiras");
    partes.push("");
    partes.push(fronteiras.join("\n"));
  }

  /* ---------- as condições, quando existirem ---------- */
  if (respondidas.length) {
    partes.push("");
    partes.push("### Condições que a loja confirmou");
    partes.push("");
    const rotulo: Record<string, string> = {
      frete: "Entrega",
      pagamento: "Pagamento",
      retirada: "Retirada",
      troca: "Troca",
    };
    partes.push(respondidas.map((k) => `- **${rotulo[k]}**: ${condicoes[k]}`).join("\n"));
    if (respondidas.length < 4) {
      partes.push("");
      partes.push("O que não está nesta lista não foi respondido: não escreva nada a respeito.");
    }
  }

  /* ---------- 7. catálogo ---------- */
  partes.push("");
  partes.push(`## 8. O catálogo (${catalogo.length} ${catalogo.length === 1 ? "peça" : "peças"})`);
  partes.push("");
  if (previa && produtos.length > catalogo.length) {
    partes.push(
      `Este recorte tem ${catalogo.length} peças de um catálogo de ${produtos.length}. É proposital: ver a seção 10.`,
    );
    partes.push("");
  }
  partes.push("As imagens já estão hospedadas. Use as URLs como estão, sem baixar nem otimizar.");
  partes.push("");
  partes.push(["```json", JSON.stringify(catalogo, null, 2), "```"].join("\n"));

  /* ---------- 8. conversão ---------- */
  partes.push("");
  partes.push("## 9. A conversão");
  partes.push("");
  partes.push(
    previa
      ? /* ---------- a conversão da PRÉVIA ----------
           O botão NÃO aponta para a loja, e essa é a regra comercial mais
           cara do compilado. Prévia com o WhatsApp da loja funcionando é a
           vitrine entregue de graça: a dona manda o link para as clientes
           e não precisa contratar nada.

           Apontando para o estúdio, o mesmo botão vira o CTA do funil, e
           quem clica é a única pessoa que a prévia precisa convencer. */
        [
          "Esta é uma prévia, então TODO botão de pedido aponta para o WhatsApp DO ESTÚDIO, e não para o da loja:",
          "",
          "```",
          `https://wa.me/${WHATS_ESTUDIO}?text=${encodeURIComponent(
            `Oi! Vi a prévia da vitrine da ${loja.nome || `@${loja.arroba}`} e quero colocar no ar.`,
          )}`,
          "```",
          "",
          "A mesma mensagem em todos os botões, sem interpolar peça: o clique aqui não é um pedido de produto, é a dona da loja dizendo que quer a vitrine. Não crie um segundo botão com o número da loja, não coloque o número da loja no rodapé, e não escreva o número da loja em lugar nenhum da página.",
        ].join("\n")
      : [
          whats
            ? `Todo botão de pedido abre \`https://wa.me/${whats}?text={mensagem}\`, com a mensagem já preenchida e codificada (encodeURIComponent).`
            : "O número de WhatsApp ainda não foi confirmado: deixe o botão pronto e marque no código onde o número entra. Não invente número.",
          "",
          "Modelo da mensagem:",
          "",
          "```",
          "Oi! Vi no site e queria essa peça:",
          "",
          "{nome}{marca_opcional}{cor_opcional}",
          "{tamanho_opcional}",
          "{preco_opcional}",
          "",
          "Ainda tem?",
          "```",
          "",
          "Regras da interpolação: campo nulo some da mensagem junto com a linha dele, e nada vira \"null\" nem \"undefined\". O nome da peça é sempre o do JSON, sem reescrever.",
        ].join("\n"),
  );

  /* ---------- 9. o modo ---------- */
  partes.push("");
  partes.push(previa ? "## 10. Isto é uma PRÉVIA" : "## 10. Vitrine completa");
  partes.push("");
  partes.push(
    previa
      ? [
          "Esta peça é uma amostra para a dona da loja ver o que a vitrine seria. Ela não é a loja, e as restrições abaixo são o que a mantém sendo amostra:",
          "",
          `- **Uma página só**, mobile primeiro (390px), sem rotas internas.`,
          `- **No máximo ${NA_PREVIA} peças**, exatamente as do JSON acima. Não complete com o resto do catálogo.`,
          /* De onde vieram as doze. A diferença importa para quem constrói:
             peça escolhida à mão aguenta aparecer grande, peça que entrou
             para fechar a conta é peça de grade. Sem esta linha, as doze
             chegam iguais e a decisão se perde no caminho. */
          estreladas.length && completadas.length
            ? `- Das ${pecas.length} peças, as ${estreladas.length} primeiras foram escolhidas à mão, olhando as fotos, e as outras ${completadas.length} entraram só para completar a página. Prefira as escolhidas onde a foto aparece grande.`
            : estreladas.length
              ? "- Todas as peças desta lista foram escolhidas à mão, olhando as fotos."
              : "- Nenhuma peça foi escolhida à mão: esta lista é a ordem do catálogo. Prefira as de foto mais limpa onde a imagem aparece grande.",
          "- **Sem painel, sem filtro e sem página de peça.**",
          `- Rota \`/previa/${loja.arroba}\`, com OG image gerada na hora: a marca sobre a superfície escolhida.`,
          "- Assinatura discreta do estúdio no rodapé.",
          "",
          "O motivo, e vale entender: prévia com catálogo completo e WhatsApp funcionando é um site pronto de graça. O que ela precisa provar é o desenho e a sensação, não o estoque.",
        ].join("\n")
      : [
          "Esta é a vitrine contratada. Vale o catálogo inteiro do JSON, filtro e busca conforme a seção 4, e as páginas ou modais que o arquétipo pedir.",
        ].join("\n"),
  );

  return partes.join("\n");
}
