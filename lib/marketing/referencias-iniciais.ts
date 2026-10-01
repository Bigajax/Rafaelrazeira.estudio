/* ============================================================
   A PRIMEIRA CARGA DO BANCO DE REFERÊNCIAS (01/10/2026)

   A pesquisa de 01/10, aprovada pelo Rafael: 23 perfis conferidos (ativos
   entre agosto e 1º de outubro de 2026, seguidores lidos do cartão público
   do perfil), os 5 formatos que se repetem neles e o que evitar. A versão
   longa, com todas as fontes, mora no cofre:
   `2 Regras da casa/referencias-instagram.md`.

   Seguidor não prova que o formato funciona: é a única métrica pública.
   Por isso cada linha diz a evidência que existe, e "sem evidência pública"
   quando não existe. Entra no banco uma vez, pelo botão da aba Referências.
   ============================================================ */
import type { Categoria } from "./tipos";

export type TipoReferencia = "perfil" | "formato" | "evitar";

export type Referencia = {
  id?: string;
  tipo: TipoReferencia;
  categoria: Categoria | null;
  nome: string;
  link: string;
  por_que: string;
  copiar: string;
  nao_copiar: string;
  evidencia: string;
  ativo?: boolean;
};

const ig = (h: string) => `https://www.instagram.com/${h}/`;
const SEM = "sem evidência pública além dos seguidores";

export const REFERENCIAS_INICIAIS: Referencia[] = [
  /* ---------- Tendência ---------- */
  { tipo: "perfil", categoria: "tendencia", nome: "@thenews.cc", link: ig("thenews.cc"), por_que: "o resumo do dia que dá para mandar para alguém: card de texto com a manchete reescrita em linguagem de conversa, feito para virar print no grupo", copiar: "a notícia traduzida em uma frase que o dono da loja entende e quer mostrar para o sócio", nao_copiar: "o volume (8 posts por dia) e o tom de meme", evidencia: "2 milhões de seguidores; citada pelo Nieman Lab e pela beehiiv entre as maiores newsletters do Brasil" },
  { tipo: "perfil", categoria: "tendencia", nome: "@startseoficial", link: ig("startseoficial"), por_que: "Reels curtos de \"o que foi lançado e por que importa\", sempre pelo lado do negócio", copiar: "o gancho \"X lançou Y\" seguido de \"o que isso muda para você\"", nao_copiar: "o deslumbramento com gadget que não chega à loja do cliente; o filtro é: muda a venda de uma loja de bairro em 12 meses?", evidencia: `769 mil seguidores; ${SEM}` },
  { tipo: "perfil", categoria: "tendencia", nome: "@rafaelkiso", link: ig("rafaelkiso"), por_que: "o perfil mais próximo de \"o designer que mostra o número\": abre com a pergunta do público e responde com dado de estudo", copiar: "a estrutura pergunta, número, fonte, o que fazer", nao_copiar: "o assunto (métrica de Instagram para social media); a pergunta tem que ser de loja", evidencia: "530 mil seguidores; fundador da mLabs, que publica índice com mais de 30 milhões de posts" },
  { tipo: "perfil", categoria: "tendencia", nome: "@b9.com.br", link: ig("b9.com.br"), por_que: "curadoria de marca e comunicação com olhar crítico, com capa editorial", copiar: "o case de marca contado como história curta, com a lição no final", nao_copiar: "a publicidade de grande marca; o case só serve se a lição couber numa loja de 1 a 5 pessoas", evidencia: `173 mil seguidores; ${SEM}` },
  { tipo: "perfil", categoria: "tendencia", nome: "@wgsn (gringo)", link: ig("wgsn"), por_que: "a fonte de tendência de consumo e cor que as próprias marcas consultam; capa de revista com uma tese por post", copiar: "a tese nomeada (dar nome a uma tendência) e a capa com uma foto e uma frase", nao_copiar: "a moda de passarela; usar como fonte citada, não como estilo", evidencia: "841 mil seguidores; principal empresa de previsão de tendências do mundo" },

  /* ---------- Design e marca ---------- */
  { tipo: "perfil", categoria: "design", nome: "@marcelokimuradesign", link: ig("marcelokimuradesign"), por_que: "o maior perfil brasileiro de design de marca: análise de identidade, lista de erros, opinião", copiar: "a análise de uma marca real em 5 a 8 telas: o que fez, por que funciona, o que você leva", nao_copiar: "o conteúdo para designer (carreira); o público do estúdio é quem contrata design", evidencia: "431 mil seguidores; Reportei cita mais de 419 mil e 150 mil no YouTube" },
  { tipo: "perfil", categoria: "design", nome: "@design.descomplicado", link: ig("design.descomplicado"), por_que: "carrosséis de curiosidade de marca com título fixo (logos que escondem segredos, empresas que mudaram de nome)", copiar: "a série com título fixo, um caso por semana, e a curiosidade que se encaminha por \"você sabia?\"", nao_copiar: "a capa pop art saturada e o humor", evidencia: "168 mil seguidores; 5º no ranking de marketing de conteúdo do Brasil da Favikon" },
  { tipo: "perfil", categoria: "design", nome: "@pedropanetto", link: ig("pedropanetto"), por_que: "Reel de rosto sobre um detalhe de marca famosa, reagindo no dia ao assunto de design da semana", copiar: "reagir no mesmo dia ao assunto de design da semana", nao_copiar: "o \"logo escondido\" como fim em si; o estúdio liga o detalhe à venda", evidencia: `56 mil seguidores; ${SEM}; sem post em setembro de 2026` },
  { tipo: "perfil", categoria: "design", nome: "@designculturebr", link: ig("designculturebr"), por_que: "o jornal do design brasileiro: logo novo, identidade nova, no dia", copiar: "\"novo logo de X\" em antes e depois, rápido, no dia", nao_copiar: "a agenda de eventos e o conteúdo para a comunidade de designers", evidencia: `66 mil seguidores; ${SEM}` },
  { tipo: "perfil", categoria: "design", nome: "@thefuturishere (gringo)", link: ig("thefuturishere"), por_que: "como um estúdio fala de preço, valor e marca sem vergonha", copiar: "a frase de abertura que contraria o senso comum e a coragem de falar de dinheiro", nao_copiar: "o conteúdo de carreira para criativos e a estética de palestra", evidencia: `528 mil seguidores; ${SEM}` },

  /* ---------- E-commerce ---------- */
  { tipo: "perfil", categoria: "ecommerce", nome: "@ecommercenapratica", link: ig("ecommercenapratica"), por_que: "o carrossel mais próximo do que o estúdio quer: rótulo de editoria na capa, uma promessa e \"salva e confere\"", copiar: "o rótulo da categoria na capa e o pedido explícito \"salva e compara com a sua\"", nao_copiar: "marketplace e operação grande; a loja do estúdio vende pelo WhatsApp", evidencia: "431 mil seguidores; a escola diz ter ajudado mais de 150 mil pessoas" },
  { tipo: "perfil", categoria: "ecommerce", nome: "@nuvemshop", link: ig("nuvemshop"), por_que: "traz o dado de varejo que vira pauta (entrega em 4 horas, IA no e-commerce, pesquisa com lojistas)", copiar: "usar os dados que ela publica como matéria-prima (\"57% dos lojistas dizem que o problema é converter\")", nao_copiar: "o tom institucional e o post de evento", evidencia: "478 mil seguidores; D2C Summit 2026 com mais de 7 mil pessoas" },
  { tipo: "perfil", categoria: "ecommerce", nome: "@lojaintegrada", link: ig("lojaintegrada"), por_que: "fala com o lojista pequeno de igual para igual, pela dor da rotina", copiar: "o reconhecimento da dor, que faz a pessoa mandar para outro empreendedor", nao_copiar: "o meme de baixo esforço e a promessa de \"loja em um dia\"; o estúdio vende o oposto", evidencia: `187 mil seguidores; ${SEM}` },
  { tipo: "perfil", categoria: "ecommerce", nome: "@rafaelwencel", link: ig("rafaelwencel"), por_que: "o bastidor de uma marca de roupa pequena em série, com o número na primeira frase", copiar: "o número na primeira frase e a série com episódio", nao_copiar: "o drama de reality e o \"comenta QUERO\"", evidencia: "387 mil seguidores; citado pela Favikon entre influenciadores de negócios (posição não confirmada)" },

  /* ---------- Educacional ---------- */
  { tipo: "perfil", categoria: "educacional", nome: "@thaismartan", link: ig("thaismartan"), por_que: "\"eu testei\" e o passo a passo com a ferramenta do dia, tela gravada com voz", copiar: "o \"eu testei\" com tela real e a legenda \"envia para quem está começando\"", nao_copiar: "cobrir toda ferramenta nova; testar só o que serve para loja", evidencia: "569 mil seguidores; cerca de 460 mil pelo HypeAuditor em levantamento da cpdf.ai" },
  { tipo: "perfil", categoria: "educacional", nome: "@aline.delamare", link: ig("aline.delamare"), por_que: "tutoriais de fluxo, não de ferramenta, sempre com o próprio uso", copiar: "\"isso é o que eu uso no meu negócio\", com o arquivo ou o prompt de verdade", nao_copiar: "o \"comenta PALAVRA\" em todo post", evidencia: `190 mil seguidores; ${SEM}` },
  { tipo: "perfil", categoria: "educacional", nome: "@odanilogato", link: ig("odanilogato"), por_que: "notícia e alerta prático, sempre com número (98% dos apps feitos com IA tinham falha de segurança)", copiar: "o dado que assusta seguido do que fazer", nao_copiar: "o vídeo de humor com IA e o volume diário", evidencia: "895 mil seguidores; Top 1 de IA do Brasil pela Favikon, segundo a cpdf.ai" },
  { tipo: "perfil", categoria: "educacional", nome: "@therundownai (gringo)", link: ig("therundownai"), por_que: "cards de texto limpos, um por notícia, e a série \"Workflows\"", copiar: "a série com nome e o card de texto com hierarquia clara: o tratamento visual mais próximo do estúdio", nao_copiar: "o ritmo de agência de notícias e IA para empresa grande", evidencia: "626 mil seguidores; newsletter com mais de 2 milhões de leitores" },

  /* ---------- Vitrines ---------- */
  { tipo: "perfil", categoria: "vitrines", nome: "@alumbraestudio", link: ig("alumbraestudio"), por_que: "estúdio pequeno contando case com a peça aplicada no mundo, em série do mesmo cliente", copiar: "o case em série do mesmo cliente e a frase-tese na primeira linha", nao_copiar: "a falta de número; o estúdio fecha o case com o resultado", evidencia: `17 mil seguidores; ${SEM}` },
  { tipo: "perfil", categoria: "vitrines", nome: "@karinesackt", link: ig("karinesackt"), por_que: "web designer solo com quase a mesma oferta: \"como chegou\" contra \"como ficou\" e o processo do celular", copiar: "o antes e depois e o processo do celular explicado com um número", nao_copiar: "o intervalo irregular e a capa de mockup sem contexto", evidencia: `12 mil seguidores; ${SEM}; último post em 18/08/2026` },
  { tipo: "perfil", categoria: "vitrines", nome: "@_marsdesigner", link: ig("_marsdesigner"), por_que: "Reels de site rolando na tela do celular", copiar: "a gravação de tela do site rolando no celular, que é como o lojista vai ver a vitrine", nao_copiar: "a legenda vazia e o redesign de marca famosa sem pedido", evidencia: `22 mil seguidores; ${SEM}` },
  { tipo: "perfil", categoria: "vitrines", nome: "@pentagramdesign (gringo)", link: ig("pentagramdesign"), por_que: "o padrão de case: a peça aplicada, o problema e a decisão", copiar: "o case contado como decisão (o problema era X, escolhemos Y por causa de Z)", nao_copiar: "a escala e a legenda longa de portfólio", evidencia: "1 milhão de seguidores; um dos estúdios independentes mais conhecidos do mundo" },
  { tipo: "perfil", categoria: "vitrines", nome: "@flux.academy (gringo)", link: ig("flux.academy"), por_que: "o negócio de quem faz site, com número (uma landing page virou um contrato de US$ 300 mil)", copiar: "o bastidor com número de negócio", nao_copiar: "o conteúdo para designer aprender; o bastidor é para o cliente confiar", evidencia: `54 mil seguidores; ${SEM}` },

  /* ---------- Os formatos que se repetem ---------- */
  { tipo: "formato", categoria: null, nome: "Pergunta do público respondida com um número", link: "", por_que: "abre com a dúvida que a pessoa tem e fecha com dado e fonte: encerra a discussão com o sócio, por isso é encaminhado", copiar: "pergunta, número, fonte, o que fazer", nao_copiar: "número sem fonte", evidencia: "@rafaelkiso, @odanilogato, @ecommercenapratica, @rafaelwencel, @karinesackt" },
  { tipo: "formato", categoria: null, nome: "Checklist com \"salva e confere\"", link: "", por_que: "carrossel com rótulo de editoria na capa, lista curta e o pedido de salvar para comparar com a própria operação", copiar: "a lista curta e o pedido explícito de salvar", nao_copiar: "lista longa e genérica", evidencia: "@ecommercenapratica, @therundownai, @marcelokimuradesign, @design.descomplicado" },
  { tipo: "formato", categoria: null, nome: "O assunto da semana no mesmo dia", link: "", por_que: "quando algo grande muda, vários perfis publicam em 24 horas; quem chega primeiro com leitura própria é encaminhado", copiar: "a leitura própria, ligada à loja, no dia", nao_copiar: "repetir a notícia sem dizer o que ela muda", evidencia: "logo novo do Instagram (13/08/2026) e os agentes da OpenAI (29/09/2026) em @pedropanetto, @designculturebr, @thaismartan, @odanilogato, @b9.com.br" },
  { tipo: "formato", categoria: null, nome: "\"Eu testei\" com a tela real", link: "", por_que: "a pessoa usa a ferramenta no próprio trabalho e mostra a tela, o prompt ou o arquivo", copiar: "a tela de verdade, não a promessa", nao_copiar: "teste de ferramenta que não serve para loja", evidencia: "@thaismartan, @aline.delamare, @rafaelwencel, @pedropanetto, @flux.academy" },
  { tipo: "formato", categoria: null, nome: "Antes e depois", link: "", por_que: "a peça do cliente aplicada, com o estado anterior ao lado, de preferência em série com o mesmo cliente", copiar: "como chegou contra como ficou, com o número no fim", nao_copiar: "mockup sem contexto", evidencia: "@alumbraestudio, @karinesackt, @designculturebr, @pentagramdesign, @_marsdesigner" },

  /* ---------- O que evitar ---------- */
  { tipo: "evitar", categoria: null, nome: "\"Comenta PALAVRA que eu te mando\"", link: "", por_que: "infla comentário e direct, não encaminhamento, e o público já reconhece a isca", copiar: "o pedido certo é o de encaminhar: \"envia para quem está começando\"", nao_copiar: "a isca de comentário", evidencia: "aparece em quase todo perfil grande (@aline.delamare, @rafaelwencel, @alfredosoares)" },
];
