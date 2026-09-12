/* ============================================================
   AS VOZES — como esta marca escreve

   Este arquivo saiu de dentro do Conceito.tsx quando o bloco FORMA passou a
   existir, e a separação é a razão de ele existir:

   ---------- ESTRUTURA É DO FORMA, ESCRITA É DAQUI ----------
   A linha de baixo de cada voz dizia "mais peças por tela", "filtro por
   tamanho no topo", "manchete grande ocupando a dobra". Tudo isso agora tem
   dono: é o bloco FORMA que responde quantas peças cabem, se existe filtro
   e o que fica acima da dobra.

   Deixar as duas coisas nos dois lugares não era redundância inofensiva: as
   duas vão para o MESMO prompt compilado, e o dia em que o FORMA disser
   "catálogo longo, grade densa" e a voz disser "catálogo curto por escolha,
   nada de grade infinita", quem lê escolhe uma das duas no escuro.

   Então cada voz aqui responde só quatro perguntas, e todas são de texto:
   que comprimento tem a frase, em que pessoa ela fala, como o preço é
   escrito, e o que essa voz NUNCA diz. A última é a mais útil: o gerador
   tem um padrão forte de fábrica, e o que o desvia é a negativa.

   ---------- por que família ----------
   Doze cartões soltos são doze decisões. Quatro famílias de três são uma
   decisão grossa e uma fina, e é assim que a escolha acontece na cabeça de
   quem decide: primeiro "essa loja é contida ou é falante", depois qual das
   três. A leitura das legendas também acerta a família muito mais do que
   acerta o cartão, e assim ela pode responder o que sabe.
   ============================================================ */

export type Familia = "direta" | "proxima" | "contida" | "autoral";

export const FAMILIAS: { id: Familia; rotulo: string }[] = [
  { id: "direta", rotulo: "Direta e sem enfeite" },
  { id: "proxima", rotulo: "Próxima e falante" },
  { id: "contida", rotulo: "Contida e cara" },
  { id: "autoral", rotulo: "Autoral e com atitude" },
];

export type Voz = {
  /* O id É o nome. A ficha antiga gravou o nome em `personalidade`, e um id
     curto novo obrigaria a uma tabela de conversão para nada. */
  nome: string;
  familia: Familia;
  nota: string;
  /* A manchete é modelo, não frase pronta: `{peca}`, `{preco}` e
     `{tamanhos}` são trocados pela peça real da loja quando existe catálogo.
     Ver `comAPeca`. */
  manchete: string;
  botao: string;
  /* As regras de ESCRITA desta voz. Nada de espaço, grade ou dobra: isso é
     do FORMA. */
  escrita: string;
};

export const VOZES: Voz[] = [
  /* ---------- direta e sem enfeite ---------- */
  {
    nome: "Direta e sem rodeio",
    familia: "direta",
    nota: "preço na cara, sem enfeite",
    manchete: "{peca}. {preco}. Do {tamanhos}.",
    botao: "Pedir no zap",
    escrita:
      'frase de três a cinco palavras, sem verbo; o preço é um número solto, sem "apenas" nem "só"',
  },
  {
    nome: "Prática e resolvida",
    familia: "direta",
    nota: "para quem tem pressa",
    manchete: "Escolhe, manda o print, chega amanhã.",
    botao: "Resolver agora",
    escrita: "verbo no imperativo, nada de adjetivo, o preço vem antes da descrição",
  },
  {
    nome: "Técnica e precisa",
    familia: "direta",
    nota: "material, medida, uso",
    manchete: "{peca} · couro · solado 3 cm · {tamanhos}",
    botao: "Ver medidas e pedir",
    escrita:
      "a frase é uma lista separada por ponto médio: material, medida, numeração; o preço vem depois dos dados, nunca antes",
  },

  /* ---------- próxima e falante ---------- */
  {
    nome: "Acolhedora e próxima",
    familia: "proxima",
    nota: "fala como quem conhece a cliente pelo nome",
    manchete: "Chegou o {peca}, e eu separei o seu.",
    botao: "Quero esse",
    escrita:
      'trata a cliente por você e escreve "eu separei"; o preço fecha a frase, nunca aparece sozinho',
  },
  {
    nome: "Jovem e divertida",
    familia: "proxima",
    nota: "gíria, emoji, urgência leve",
    manchete: "Esse aqui não fica no estoque, viu 👀",
    botao: "Garantir o meu",
    escrita: "frase curta, primeira pessoa, emoji no fim e não no meio",
  },
  {
    nome: "De bairro, de confiança",
    familia: "proxima",
    nota: "a loja que todo mundo na rua conhece",
    manchete: "Há 12 anos na mesma esquina.",
    botao: "Chamar no WhatsApp",
    escrita:
      'fala como quem já conhece; cita tempo e esquina, não coleção; o preço vem com "passa aqui", nunca com contagem',
  },

  /* ---------- contida e cara ---------- */
  {
    nome: "Sóbria e elegante",
    familia: "contida",
    nota: "pouca palavra, muito espaço",
    manchete: "{peca}",
    botao: "Consultar",
    escrita:
      'só o nome da peça, sem frase em volta; o preço é dígito sem ênfase, e a palavra "imperdível" não existe',
  },
  {
    nome: "Luxo discreto",
    familia: "contida",
    nota: "sem gritar preço nem promoção",
    manchete: "Coleção de inverno",
    botao: "Falar com a loja",
    escrita:
      'terceira pessoa, nunca "você"; o preço não é escrito na vitrine, e "desconto" não aparece em lugar nenhum',
  },
  {
    nome: "Curadora",
    familia: "contida",
    nota: "poucas peças, escolhidas a dedo",
    manchete: "Oito peças esta semana. Estas.",
    botao: "Reservar",
    escrita: "a dona fala em primeira pessoa sobre por que escolheu a peça",
  },

  /* ---------- autoral e com atitude ---------- */
  {
    nome: "Confiante e provocadora",
    familia: "autoral",
    nota: "atitude, sem pedir licença",
    manchete: "Você não precisa combinar com ninguém.",
    botao: "É meu",
    escrita: "afirmação sem qualificador, nunca pede, nunca justifica",
  },
  {
    nome: "Aspiracional",
    familia: "autoral",
    nota: "vende o que a peça significa, não o que ela é",
    manchete: "Para quem chega e não precisa avisar.",
    botao: "Fazer parte",
    escrita: "descreve o momento de uso, não o produto; preço não aparece na frase",
  },
  {
    nome: "Artesanal e feita à mão",
    familia: "autoral",
    nota: "a mão de quem fez aparece",
    manchete: "Feito aqui, uma peça de cada vez.",
    botao: "Encomendar",
    escrita:
      "primeira pessoa do plural, fala de tempo e de mão; o preço vem junto do prazo, nunca junto da pressa",
  },
];

export const VOZ_DE = (nome: string | null | undefined) =>
  VOZES.find((v) => v.nome === nome) ?? null;

/* ---------- a manchete com a peça dela ----------
   "Campus creme · 899 · 34 ao 39" é o exemplo de outra loja, e exemplo de
   outra loja é o que faz doze cartões parecerem um catálogo de agência. Com
   a peça real da vitrine dentro, a frase vira a frase que vai existir, e a
   comparação entre as vozes passa a ser uma comparação de verdade.

   Por template e não por concatenação: "Chegou o {peca}, e eu separei o
   seu" precisa da peça no meio, e nenhuma regra de emenda daria conta das
   doze frases sem virar remendo. */
export function comAPeca(
  modelo: string,
  peca: { nome: string; preco: number | null; tamanhos: string | null } | null,
): string {
  const cheio = {
    peca: peca?.nome ?? "Campus creme",
    preco: peca?.preco != null ? String(peca.preco) : "899",
    tamanhos: peca?.tamanhos ?? "34 ao 39",
  };
  return modelo
    .replace(/\{peca\}/g, cheio.peca)
    .replace(/\{preco\}/g, cheio.preco)
    .replace(/\{tamanhos\}/g, cheio.tamanhos);
}

/* ============================================================
   AS PALAVRAS PROIBIDAS

   "O que ela NÃO é" trata de posicionamento, e posicionamento é uma
   instrução que o gerador interpreta. Esta lista não se interpreta: são as
   palavras que o padrão de fábrica de qualquer gerador escreve sozinho na
   primeira tentativa, e proibi-las nominalmente é a única coisa que segura.

   As cinco primeiras vêm marcadas em toda ficha nova porque não existe loja
   em que elas ajudem: são o vocabulário de e-commerce grande em promoção, e
   é justamente disso que a vitrine de bairro precisa não parecer.
   ============================================================ */
export const PROIBIDAS_PADRAO = [
  "imperdível",
  "arrase",
  "corre que acaba",
  "clique aqui",
  "garanta já",
];

export const PROIBIDAS_SUGESTAO = [
  "últimas unidades",
  "não perca",
  "promoção relâmpago",
  "você merece",
];

/* ============================================================
   OS CONFLITOS COM O FORMA

   Voz e estrutura podem discordar, e quando discordam quem perde é o
   compilado: uma vitrine "curadora, poucas peças escolhidas a dedo" com
   sessenta peças na grade não é um estilo, é uma contradição que quem lê
   resolve por conta.

   O aviso é NOTA e não trava, de propósito: as duas coisas juntas às vezes
   são a decisão certa (uma loja de sessenta peças pode escolher falar como
   curadora e mostrar doze na abertura). O que não pode é isso acontecer sem
   você ter visto.
   ============================================================ */
export type Conflito = { vozes: string[]; nota: string };

export const CONFLITOS: Conflito[] = [
  {
    vozes: ["Direta e sem rodeio", "Prática e resolvida"],
    nota: "o preço está como sob consulta na forma",
  },
  {
    vozes: ["Curadora", "Luxo discreto"],
    nota: "a forma diz 60+ peças; essa voz pressupõe catálogo curto",
  },
  {
    vozes: ["Técnica e precisa"],
    nota: "essa voz vive de medida e numeração, e a forma diz que a peça não varia",
  },
  {
    vozes: ["Aspiracional"],
    nota: "a forma diz foto de objeto na mão; essa voz precisa de foto em cena",
  },
];

/* Qual conflito vale para esta voz com esta forma. Recebe só os quatro
   campos que importam, para servir tanto à tela quanto ao compilador. */
export function conflitoDe(
  voz: string | null | undefined,
  forma: { preco?: string | null; faixa?: string | null; variacao?: string[]; foto?: string | null } | null,
): string | null {
  if (!voz || !forma) return null;
  if (CONFLITOS[0].vozes.includes(voz) && forma.preco === "consulta") return CONFLITOS[0].nota;
  if (CONFLITOS[1].vozes.includes(voz) && forma.faixa === "longo") return CONFLITOS[1].nota;
  if (CONFLITOS[2].vozes.includes(voz) && (forma.variacao ?? []).includes("nenhuma")) {
    return CONFLITOS[2].nota;
  }
  if (CONFLITOS[3].vozes.includes(voz) && forma.foto === "objeto") return CONFLITOS[3].nota;
  return null;
}

/* ============================================================
   A VOZ MEDIDA NAS LEGENDAS

   A legenda dos posts é a única amostra que existe da voz da loja escrita
   pela própria dona, e ela está na bancada desde a primeira colheita sem
   ninguém ler. Oito sinais, contados e não interpretados: um modelo daria
   uma resposta mais bonita e mais cara, e esta aqui é conferível.

   O que ela devolve é a FAMÍLIA com confiança e o cartão com palpite, e é
   nessa ordem que a certeza cai: contar emoji separa falante de contida com
   folga; separar "curadora" de "luxo discreto" pela contagem é chute
   educado, e por isso o cartão nasce tracejado como tudo mais aqui.
   ============================================================ */
export type Sinais = {
  legendas: number;
  emoji: number;
  exclamacao: number;
  caixaAlta: number;
  giria: number;
  pessoa: number;
  preco: number;
  urgencia: number;
  palavras: number;
};

/* Amostra menor que isto não separa voz de coincidência: três legendas com
   um emoji cada dariam "próxima e falante" a uma loja que quase não
   escreve. O botão continua rodando, e a nota diz o tamanho da amostra. */
export const AMOSTRA_MINIMA = 8;

/* ---------- fronteira de palavra, à mão ----------
   O `\b` do JavaScript trata acento como separador: `ó` não é `\w`, então
   /\bó\b/ casa com o "ó" DENTRO de "história", e /\btá\b/ casa dentro de
   "está". Isso não é detalhe de regex: era a leitura das legendas
   devolvendo PRÓXIMA E FALANTE para uma loja que escreve textos longos e
   autorais, por causa de um acento no meio de uma palavra comum.

   `p{L}` é qualquer letra, com acento e tudo, e é o que a fronteira
   precisava significar desde o começo. */
const palavra = (lista: string, extras = "") =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${lista})(?![\\p{L}\\p{N}])`, `iu${extras}`);

/* ---------- gíria em dois pesos ----------
   `pra` e `tá` estão em quase toda legenda escrita em português falado, de
   qualquer loja e de qualquer voz. Contá-los como gíria fazia a família
   PRÓXIMA vencer sempre e, como ela é a primeira regra da fila, ela engolia
   as outras três: uma legenda longa e autoral que dissesse `pra você` uma
   vez virava loja falante. Uma legenda conta como gíria com UM marcador
   forte, ou com DOIS fracos. */
const GIRIA_FORTE = palavra("viu|gente|arrasa|arrasou|bb|amei|amo|lindezas?|meninas?");
const GIRIA_FRACA = palavra("pra|tá|né", "g");
const temGiria = (t: string) =>
  GIRIA_FORTE.test(t) || (t.match(GIRIA_FRACA) ?? []).length >= 2;
const PESSOA = palavra("eu|separei|nosso|nossa|pra você|te|meu amor");
const URGENCIA = palavra("corre|últimas?|ultimas?|acabou|só hoje|so hoje|restam|resta");
const PRECO = /(r\$\s*\d|\b\d{2,4}[,.]\d{2}\b|\b\d{3,4}\s*(reais|conto))/i;
/* Emoji por faixa, e não por lista: qualquer lista fica velha em um mês. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
/* Sigla e marca em caixa alta não contam como grito: "PP", "GG", "NIKE" são
   o vocabulário normal de uma legenda de moda. */
const SIGLA = /^[A-ZÀ-Ú]{1,4}$/;

export function medirVoz(legendas: string[]): Sinais {
  const uteis = legendas.map((x) => (x ?? "").trim()).filter(Boolean);
  const n = uteis.length;
  if (!n) {
    return { legendas: 0, emoji: 0, exclamacao: 0, caixaAlta: 0, giria: 0, pessoa: 0, preco: 0, urgencia: 0, palavras: 0 };
  }

  let emoji = 0;
  let exclamacao = 0;
  let maiusculas = 0;
  let totalPalavras = 0;
  let giria = 0;
  let pessoa = 0;
  let preco = 0;
  let urgencia = 0;

  for (const t of uteis) {
    emoji += (t.match(EMOJI) ?? []).length;
    exclamacao += (t.match(/!/g) ?? []).length;
    const palavras = t.split(/\s+/).filter(Boolean);
    totalPalavras += palavras.length;
    maiusculas += palavras.filter(
      (w) => w.length > 1 && w === w.toUpperCase() && /[A-ZÀ-Ú]/.test(w) && !SIGLA.test(w),
    ).length;
    if (temGiria(t)) giria++;
    if (PESSOA.test(t)) pessoa++;
    if (PRECO.test(t)) preco++;
    if (URGENCIA.test(t)) urgencia++;
  }

  return {
    legendas: n,
    emoji: emoji / n,
    exclamacao: exclamacao / n,
    caixaAlta: totalPalavras ? maiusculas / totalPalavras : 0,
    giria: giria / n,
    pessoa: pessoa / n,
    preco: preco / n,
    urgencia: urgencia / n,
    palavras: totalPalavras / n,
  };
}

/* Os cortes. Eles são números escolhidos e não medidos, e ficam aqui em vez
   de espalhados na função para poderem ser discutidos como o que são. */
const ALTO = {
  emoji: 1.5,
  giria: 0.3,
  urgencia: 0.25,
  preco: 0.4,
  pessoa: 0.3,
  palavras: 35,
};
const BAIXO = { preco: 0.1, palavras: 12, emoji: 0.2 };

/* A regra de saída, na ordem em que a spec a escreveu. Ordem é regra: uma
   loja que usa emoji E escreve preço em toda legenda é falante primeiro, e
   direta depois, porque o emoji é o sinal mais difícil de fingir. */
export function familiaDe(s: Sinais): Familia | null {
  if (!s.legendas) return null;
  if (s.emoji >= ALTO.emoji || s.giria >= ALTO.giria) return "proxima";
  if (s.urgencia >= ALTO.urgencia && s.preco >= ALTO.preco) return "direta";
  if (s.palavras <= BAIXO.palavras && s.preco <= BAIXO.preco && s.emoji <= BAIXO.emoji) {
    return "contida";
  }
  if (s.pessoa >= ALTO.pessoa && s.palavras >= ALTO.palavras) return "autoral";
  return null;
}

/* Dentro da família, o cartão mais provável pelos sinais secundários. Aqui
   a certeza já é baixa, e é por isso que o resultado nasce tracejado: o que
   esta função faz de útil é deixar UM cartão pré-marcado para você
   discordar, que é mais rápido que escolher entre três do zero. */
export function tomDe(familia: Familia, s: Sinais): string {
  if (familia === "proxima") {
    if (s.emoji >= 2.5 || s.exclamacao >= 1.5) return "Jovem e divertida";
    if (s.pessoa >= ALTO.pessoa) return "Acolhedora e próxima";
    return "De bairro, de confiança";
  }
  if (familia === "direta") {
    if (s.caixaAlta >= 0.2) return "Direta e sem rodeio";
    if (s.palavras <= 15) return "Prática e resolvida";
    return "Técnica e precisa";
  }
  if (familia === "contida") {
    if (s.preco <= 0.02) return "Luxo discreto";
    if (s.palavras <= 6) return "Sóbria e elegante";
    return "Curadora";
  }
  if (s.exclamacao >= 1) return "Confiante e provocadora";
  if (s.palavras >= 50) return "Artesanal e feita à mão";
  return "Aspiracional";
}
