/* ============================================================
   O TEXTO DA /vitrine-v2 (05/10/2026)

   A V2 é o TESTE da compra direta: a pessoa vê, entende e paga na
   própria página, sem prévia e sem conversa obrigatória. O WhatsApp vira
   a saída de quem tem dúvida. Ela roda AO LADO da /vitrine-digital (a da
   prévia grátis), com o mesmo criativo e a mesma verba, e o critério é o
   custo por VENDA, não o CPL.

   A ESTRUTURA é o roteiro de 12 partes que o Rafael trouxe em 05/10
   (hero com VSL, "não é só um site", dor, transformação, demonstração,
   CRO, não é template, escala, prova, oferta, risco, FAQ). A primeira
   versão reaproveitava as seções da /vitrine-digital e ele respondeu
   "ficou igual à outra... não tem a parte da VSL": por isso quase tudo
   aqui é seção própria, e só o FAQ continua emprestado.

   Dois objetos:
   - `ptV2`: o dicionário da /vitrine-digital com as chaves que a seção
     emprestada (o FAQ) lê, reescritas para a V2.
   - `v2`: o texto de todas as seções próprias.

   O PREÇO vem de PROPOSTAS["vitrine-v2"] (lib/propostas.ts), o mesmo
   objeto que o checkout cobra: a página e o botão não têm como discordar.
   A única exceção é a parcela de 12x, que quem calcula é o Mercado Pago
   na hora (o juro é do cliente). Ela está escrita à mão em PARCELA_12X.

   Sem travessão em texto visível: o "QUERO MINHA VITRINE — R$997" do
   roteiro virou dois-pontos.
   ============================================================ */
import { pt, type VitrineMessages } from "@/messages/vitrine.pt";
import { PROPOSTAS } from "@/lib/propostas";

const itens = PROPOSTAS["vitrine-v2"].itens;
export const PRECO_PIX = itens.avista_pix.valor;   // 997
export const MAX_PARCELAS = itens.avista_card.maxParcelas ?? 1;

/* A parcela de 12x COM o juro do cliente, decidida pelo Rafael em
   05/10/2026. NÃO sai de conta nenhuma: é o que o Brick do Mercado Pago
   mostra para R$ 997 em 12x na taxa da conta. CONFERIR no checkout de
   verdade antes de a página receber anúncio, e de novo se a taxa mudar.
   Se o Brick mostrar outro número, a página está mentindo por ele. */
export const PARCELA_12X = 97.9;

/* Até 60 produtos cadastrados por mim, decisão do Rafael em 05/10/2026
   (a /vitrine-digital segue com 20). Fecha a conta só se o material
   chegar padronizado: nome, preço, tamanhos, categoria e foto de cada
   peça num formato só. */
export const PRODUTOS = 60;

const brl = (n: number, cents = false) =>
  `R$${n.toLocaleString("pt-BR", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;
const R = (n: number) => brl(n);
const PARCELA = `${MAX_PARCELAS}x de ${brl(PARCELA_12X, true)}`;

export const ptV2: VitrineMessages = {
  ...pt,
  meta: {
    title: "Vitrine Digital para lojas",
    description: `Catálogo com foto, preço e tamanho, pedido pronto no WhatsApp e painel para você atualizar. ${R(PRECO_PIX)} uma vez só, sem mensalidade.`,
  },
  faq: {
    ...pt.faq,
    itens: [
      { p: "Tem mensalidade?", r: `Não. São ${R(PRECO_PIX)} uma única vez. Um domínio próprio é opcional e tem custo anual pago direto no registrador.`, nao: true },
      { p: "É uma loja virtual?", r: "Não no sentido de carrinho, frete e pagamento automático. É uma vitrine que organiza os seus produtos e leva o cliente para o seu WhatsApp com a peça escolhida. O pagamento e a entrega você combina com ele, como já faz hoje.", nao: true },
      { p: "Quantos produtos consigo colocar?", r: `Quantos quiser. Os ${PRODUTOS} primeiros eu cadastro para você, com foto, preço e tamanhos; os outros você mesmo cadastra no painel, em minutos.`, nao: false },
      { p: "Quanto tempo demora?", r: "Até 7 dias úteis depois que você me manda o material da loja: logo, fotos, produtos e preços.", nao: false },
      { p: "Funciona no celular?", r: "Sim, e ele vem primeiro: a vitrine é desenhada para a tela onde o seu cliente compra, e depois adaptada para o computador.", nao: false },
      { p: "Preciso ter domínio?", r: "Não. A vitrine vai ao ar num endereço que eu configuro. Se quiser um domínio próprio (sualoja.com.br), ele é opcional, anual e pago direto no registrador; eu faço a ligação.", nao: true },
      { p: "Como o pedido chega?", r: "No seu WhatsApp, com o nome da peça, o tamanho e o link dela já escritos na mensagem.", nao: false },
      { p: "Posso pedir alterações?", r: "Antes de publicar, você recebe a primeira versão e tem uma rodada de ajustes incluída. Depois, produtos, preços e fotos você mesmo troca no painel; mudança de design eu orço na hora.", nao: false },
      { p: "Como eu pago?", r: `No Pix, ${R(PRECO_PIX)} à vista, ou no cartão em até ${MAX_PARCELAS}x, com os juros do cartão calculados na hora. É um pagamento só: não tem entrada, saldo nem mensalidade.`, nao: false },
    ],
  },
};

export const v2 = {
  header: { cta: "QUERO MINHA VITRINE ↓" },

  /* 1. HERO, revisto para converter (05/10, "o que dá para melhorar no
     hero pra converter mais", e "pode aplicar tudo, a manchete também"):
     - a manchete foi trocada e VOLTOU no mesmo dia: o Rafael testou "Seu
       cliente escolhe a peça sozinho. O pedido chega pronto no seu WhatsApp."
       e respondeu "não gostei, quero a mesma copy". Manchete e lead são os dele;
     - colado no botão: a parcela (o primeiro número que a pessoa vê pesa
       mais que o total, regra de 18/09) e o risco tirado (a primeira
       versão é aprovada antes de publicar, o que já é verdade);
     - quem faz, com a foto: sem a prévia, a pessoa paga a alguém que nunca
       viu;
     - a prova social só com nomes: a contagem do portfólio não inclui a
       Japa e a Full Time, então um número misturado ficaria errado.
     A manchete fica na decisão dele, com o resto do hero novo em volta.
 */
  hero: {
    eyebrow: "PARA LOJAS QUE VENDEM PELO INSTAGRAM",
    h1: <>Aumente as vendas da sua loja com uma <em>vitrine digital.</em></>,
    lead: "Seus clientes encontram produtos, preços e tamanhos sozinhos, escolhem o que querem e chegam no seu WhatsApp muito mais perto da compra.",
    cta: `QUERO MINHA VITRINE: ${R(PRECO_PIX)}`,
    parcela: `ou ${PARCELA} no cartão`,
    risco: "Você aprova a primeira versão antes de publicar, com uma rodada de ajustes.",
    micro: ["Pagamento único", "R$0 de mensalidade", "Pronta em até 7 dias úteis"],
    quem: { nome: "Rafael Razeira", diz: "quem desenha e quem responde sou eu", foto: "/assets/v2/rafael-avatar.webp" },
    duvida: "Tem dúvida? Fale comigo",
    duvidaMsg: "Oi Rafael! Vi a vitrine digital e fiquei com uma dúvida antes de comprar.",
    prova: { rotulo: "No ar com esta vitrine:", lojas: ["vérít.lab", "Japa Modas", "Full Time"] },
    legenda: "Uma compra real na vitrine da vérít.lab",
    /* O aparelho do hero mostra a vérít.lab, pedido do Rafael em 05/10 (a
       /vitrine-digital mostra a Sölo Urb). Gravação de uma compra no
       celular, em public/assets/v2/veritlab-compra.*. O balão de pedido
       que ficava por cima do aparelho saiu: ele cobria o vídeo e repetia o
       que o vídeo mostra no fim. */
    demo: {
      aria: "Uma compra na vitrine da vérít.lab, num celular: a pessoa rola as peças, toca no quadro Mickey Mapa, vê o preço, toca em Quero essa e chega no WhatsApp com a mensagem pronta",
    },
  },

  /* A VSL, logo abaixo da dobra. Enquanto `src` for null, a moldura do
     player aparece com o aviso de que o vídeo está em gravação: a página
     é TESTE e não recebe anúncio antes dele. Quando existir: arquivo em
     public/assets/v2/, poster em WebP. */
  video: {
    src: null as string | null,
    poster: null as string | null,
    eyebrow: "ASSISTA ANTES DE DECIDIR",
    titulo: "Como a vitrine tira as perguntas do caminho da compra",
    duracao: "6 min",
    pendente: "Vídeo em gravação",
    legenda: "Com som. Do story ao pedido no WhatsApp, o CRO, as lojas no ar e o preço.",
  },

  /* 2. NÃO É SÓ UM SITE */
  site: {
    h2: <>Não é só um site.<br /><em>É o caminho entre o Instagram e a venda.</em></>,
    lead: "Um site pode simplesmente existir. A sua vitrine é estruturada para o cliente encontrar o produto, entender a oferta e chegar até você com menos dúvidas no caminho.",
    /* A equação (05/10: "esta parte tem que ter mais personalidade"):
       eram três palavras gigantes, e ninguém via o que cada uma faz.
       Agora cada parcela é um OBJETO que mostra o seu trabalho, e a soma
       dá um resultado carimbado. As cores e letras do cartão de design
       são aproximações das três lojas reais, rotuladas pelo nome. */
    equacao: {
      /* 05/10, segunda volta ("melhore aqui, dê mais personalidade"):
         as parcelas deixaram de ser desenho e passaram a mostrar a MESMA
         história da página, com imagens reais: as três lojas, a página do
         Mickey Mapa e a conversa dele no WhatsApp. */
      design: {
        nome: "Design",
        diz: "A cara da sua loja, não a de um modelo.",
        telas: [
          { loja: "vérít.lab", img: "/portfolio/verit-lab.webp" },
          { loja: "Japa Modas", img: "/assets/v2/tela-japa.webp" },
          { loja: "Full Time", img: "/assets/v2/tela-fulltime.webp" },
        ],
      },
      cro: {
        nome: "CRO",
        diz: "O caminho mais curto até o botão.",
        tela: "/assets/v2/passo-produto.webp",
        marcas: [["Preço", 26], ["Detalhes", 60], ["Pedir", 86]] as [string, number][],
      },
      whats: {
        nome: "WhatsApp",
        diz: "O pedido chega pronto, com a peça escolhida.",
        tela: "/assets/v2/passo-whatsapp.webp",
        app: "WhatsApp",
        hora: "agora",
        quem: "Novo pedido",
        texto: "Oi! Vi a peça MICKEY MAPA no site e queria saber mais.",
      },
      resultadoNota: "na sua mão, com a peça escolhida",
      resultado: "Pedido pronto",
    },
    croTitulo: "CRO é otimização para conversão.",
    croTexto: "Eu organizo cada parte da vitrine para facilitar a compra: produtos mais fáceis de encontrar, informações claras, menos distração, botões no lugar certo e um caminho curto até o WhatsApp.",
  },

  /* 3. A DOR */
  dor: {
    h2: <>Quanto mais sua loja cresce, <em>mais o atendimento vira um problema.</em></>,
    lead: "Cada pergunta que o cliente precisa fazer é mais uma etapa entre ele e a compra. E quanto mais gente chega, mais difícil fica responder todo mundo a tempo.",
    /* A caixa lotada. Nasceu como o Direct do Instagram (05/10: "está sem
       personalidade, os balões etc") e virou a lista de conversas do
       WhatsApp no mesmo dia ("faz como WhatsApp aqui"); o "direct" do
       título virou "atendimento" junto, para o título e a tela falarem da
       mesma coisa. Os nomes são ilustração, nenhuma pessoa real. A ordem
       é a do app, a mais nova em cima, então a espera CRESCE para baixo:
       de 21:40 a 20:39, uma hora inteira. */
    inbox: {
      titulo: "WhatsApp",
      filtros: ["Tudo", "Não lidas", "Favoritas", "Grupos"],
      conversas: [
        ["Ana Lu", "Onde vejo os modelos?", "21:40", 1],
        ["Pedro H.", "Tem esse ainda?", "21:36", 2],
        ["Carol", "Me manda foto?", "21:28", 1],
        ["Lucas R.", "Tem preto?", "21:14", 3],
        ["Bia Costa", "Tem M?", "20:59", 2],
        ["João Pedro", "Quanto custa?", "20:39", 1],
      ] as [string, string, string, number][],
      rodape: "seis clientes esperando, e você ainda está respondendo o primeiro",
    },
  },

  /* 4. A TRANSFORMAÇÃO */
  virada: {
    h2: <>Tire as perguntas<br /><em>do caminho da compra.</em></>,
    /* Dois caminhos DESENHADOS (05/10: "agora esta parte... mais
       personalidade"). O de hoje é torto, com as esperas no meio e um
       final incerto; o da vitrine é um trilho reto. As contas ao lado são
       a contagem das próprias fichas, não dado de cliente. */
    antesRotulo: "HOJE",
    antes: [
      ["Instagram", "etapa"], ["Direct", "etapa"], ["Pergunta", "etapa"], ["espera", "espera"],
      ["Resposta", "etapa"], ["Outra pergunta", "etapa"], ["espera", "espera"], ["Resposta", "etapa"],
      ["Talvez compre", "fim"],
    ] as [string, "etapa" | "espera" | "fim"][],
    antesConta: ["2 esperas", "final incerto"],
    depoisRotulo: "COM A VITRINE",
    depois: ["Instagram", "Vitrine", "Produto", "Tamanho", "WhatsApp", "Pedido"],
    depoisConta: ["nenhuma espera", "pedido pronto"],
    frase: ["O cliente para de perguntar o que tem.", "E começa a perguntar como compra."],
  },

  /* 5. A DEMONSTRAÇÃO: é sequência de verdade, então leva número.
     Quatro telas da MESMA compra do vídeo do hero (05/10: "agora aqui"):
     as telas 2, 3 e 4 são quadros da gravação real na vérít.lab
     (public/assets/v2/passo-*.webp). A 1 é desenhada, porque o app do
     Instagram não se grava, mas com os dados reais do perfil (ver insta). */
  demo: {
    h2: <>Do story ao pedido<br /><em>em poucos cliques.</em></>,
    passos: [
      { titulo: "Instagram", diz: "O cliente toca no link da bio.", tela: null },
      { titulo: "Vitrine", diz: "Navega pelas peças, com preço em cada uma.", tela: "/assets/v2/passo-vitrine.webp" },
      { titulo: "Produto", diz: "Vê foto, preço e detalhes, e toca em pedir.", tela: "/assets/v2/passo-produto.webp" },
      { titulo: "WhatsApp", diz: "Chega em você com a peça escolhida.", tela: "/assets/v2/passo-whatsapp.webp" },
    ] as { titulo: string; diz: string; tela: string | null }[],
    /* O perfil REAL do @verit.lab, lido no Instagram em 05/10/2026: a
       foto, o nome de exibição, os números daquele dia e a bio inteira.
       O feed são 9 posts reais (Desktop/vitrines/Vérit.lab/_raw-ig). O
       link é o www.verit.com.br, o domínio que o Rafael confirmou ser
       deles e que vai ser ligado; em 05/10 ele ainda estava estacionado
       na Hostinger, e a bio real ainda não tinha link nenhum. Os números
       mudam: conferir antes de anunciar. */
    insta: {
      arroba: "verit.lab",
      nome: "v é r i t • l a b",
      numeros: [["37", "posts"], ["386", "seguidores"], ["48", "seguindo"]] as [string, string][],
      bio: ["v e r i t . l a b", "Contemporary design lab.", "Objetos que expressam identidade.", "Peças únicas.", "Orgânico. Urbano. Autoral.", "Nothing is repeat.", "📍 Maringá"],
      link: "www.verit.com.br",
      botoes: ["Seguir", "Enviar mensagem"],
      avatar: "/assets/v2/verit-ig-avatar.webp",
      feed: "/assets/v2/verit-ig-feed.webp",
    },
    alt: "Passo {n} da compra no celular: {t}",
    /* a frase que fechava a escala (seção cortada em 05/10) */
    fecho: "Você entra na conversa quando o cliente já está muito mais perto de decidir.",
  },

  /* 6. CRO como diferencial: os seis princípios NÃO são sequência */
  cro: {
    eyebrow: "COMO EU DESENHO",
    h2: <>Bonita para a marca.<br /><em>Pensada para converter.</em></>,
    lead: "Qualquer ferramenta de IA gera uma página bonita. O que ela não faz sozinha é organizar o caminho do seu cliente até o WhatsApp. Toda vitrine minha é construída com princípios de CRO, para deixar a jornada mais clara e tirar os atritos antes do contato.",
    /* A prancha anotada (05/10: "agora dê personalidade aqui"): os seis
       princípios marcados sobre uma tela REAL, a página do Mickey Mapa da
       vérít.lab (o mesmo quadro da demonstração). `caixa` é o retângulo de
       marcação em % da tela [topo, esquerda, largura, altura] (a tela tem
       400x722; null no "celular primeiro", que é o aparelho todo); `lado`
       onde a anotação fica no desktop, e `ny` a altura dela (separada do
       ponto, senão duas anotações do mesmo lado se encostam). O número é o do marcador, não uma
       ordem: são etiquetas de onde olhar. */
    tela: "/assets/v2/passo-produto.webp",
    telaAlt: "A página do quadro Mickey Mapa na vitrine da vérít.lab, no celular, com seis pontos marcados",
    principios: [
      { t: "Hierarquia clara", d: "O preço é a maior coisa da tela: o cliente entende em segundos o que importa.", caixa: [22, 3, 46, 9], lado: "esq", ny: 30 },
      { t: "Categorias organizadas", d: "O menu leva direto às peças, sem garimpar o feed.", caixa: [1.5, 44, 54, 5.5], lado: "esq", ny: 6 },
      { t: "Informação antes do contato", d: "Tipo, medida, material e acabamento respondem antes de a pergunta chegar.", caixa: [43, 2, 96, 35], lado: "esq", ny: 62 },
      { t: "Botão no momento certo", d: "O pedido aparece depois que o cliente viu tudo, e não antes.", caixa: [81, 2, 96, 9.5], lado: "dir", ny: 60 },
      { t: "Celular primeiro", d: "Desenhada para a tela onde o seu cliente compra de verdade.", caixa: null, lado: "dir", ny: 24 },
      { t: "Menos distração", d: "Uma ação por tela, sem cadastro: abre direto no WhatsApp.", caixa: [91, 2, 68, 4.5], lado: "dir", ny: 92 },
    ] as { t: string; d: string; caixa: [number, number, number, number] | null; lado: "esq" | "dir"; ny: number }[],
    fecho: "CRO não significa prometer que todo visitante vai comprar. Significa remover obstáculos para aumentar as chances de ele avançar.",
  },

  /* 7. NÃO É TEMPLATE: três lojas reais, de cara completamente diferente */
  template: {
    h2: <>Não é um template<br /><em>com o seu logo em cima.</em></>,
    lead: "A vitrine é construída para parecer parte da sua marca. Cores, tipografia, banners, categorias e organização visual são feitos para a sua loja.",
    lojas: [
      { nome: "vérít.lab", ramo: "Espelhos e quadros feitos à mão", img: "/portfolio/verit-lab.webp" },
      { nome: "Japa Modas", ramo: "Moda masculina em Ribeirão Preto", img: "/assets/v2/tela-japa.webp" },
      { nome: "Full Time Skateboards", ramo: "Skate shop em Curitiba", img: "/assets/v2/tela-fulltime.webp" },
    ],
  },

  /* 8. ESCALA */
  escala: {
    h2: <>Mais clientes.<br /><em>Sem multiplicar o atendimento.</em></>,
    lead: "Uma pessoa ou cem podem navegar pela sua vitrine ao mesmo tempo. Elas encontram produtos e informações sem depender de você mostrar cada peça no direct.",
    linhas: [
      ["No direct", "um cliente por vez, e cada um começa do zero"],
      ["Na vitrine", "todos ao mesmo tempo, e cada um chega com a peça escolhida"],
    ] as [string, string][],
    fecho: "Você entra na conversa quando o cliente já está muito mais perto de decidir.",
    /* A cena (05/10: "agora aqui tbm"): a fila do direct contra a
       multidão da vitrine. Ilustração, sem número de pessoas: mostra a
       diferença, não mede nada. */
    cena: {
      voce: "Você",
      respondendo: "respondendo…",
      esperando: "esperando",
      navegando: "navegando agora",
      fila: 16,
      multidao: 28,
      etiquetas: ["Tam. M", "R$ 89", "→ WhatsApp", "Preto", "Tam. 41", "→ WhatsApp"],
    },
  },

  /* 9. PROVA: Japa Modas e Full Time, a pedido do Rafael em 05/10 (no
     lugar da Xavier's e da PR Grife da /vitrine-digital). As capturas são
     a página inicial inteira de cada uma, nos domínios próprios, feitas
     em 05/10 (public/assets/v2/prova-*.webp, 640 de largura). Só fato
     que se confere abrindo a loja. */
  prova: {
    eyebrow: "PROVA",
    h2: <>Não é conceito.<br /><em>Já tem loja usando.</em></>,
    /* 05/10, o corte para 9 seções: a prova absorveu o "não é um
       template". Três lojas de cara oposta, todas no ar: a diferença entre
       elas é o argumento contra o template. A vérít.lab mostra
       www.verit.com.br na barra (pedido do Rafael), mas o link abre o
       endereço que funciona hoje: o domínio ainda está estacionado.
       Quando ele for ligado, trocar a url. */
    lead: "Espelhos e quadros feitos à mão em Maringá, moda masculina em Ribeirão Preto, skate em Curitiba. Três lojas, três identidades, nenhuma é template com logo trocado. Todas no ar, com produto e preço reais.",
    live: "NO AR",
    lojas: [
      {
        nome: "vérít.lab", tag: "ARTE E OBJETOS · MARINGÁ",
        dom: "www.verit.com.br", url: "https://verit-lab.vercel.app",
        img: "/assets/v2/prova-verit.webp", w: 640, h: 2712, dur: "40s",
        antes: "As peças espalhadas pelo feed do Instagram.",
        depois: "Uma galeria com cada peça única, o preço e a encomenda direto no WhatsApp.",
        cta: "ABRIR A VITRINE DA VÉRÍT ↗",
      },
      {
        nome: "Japa Modas", tag: "MODA MASCULINA · RIBEIRÃO PRETO",
        dom: "japamodasurf.com.br", url: "https://japamodasurf.com.br",
        img: "/assets/v2/prova-japa.webp", w: 640, h: 4500, dur: "60s",
        antes: "As peças no Instagram e cada preço respondido no WhatsApp.",
        depois: "Uma vitrine por categoria, com preço em cada peça e o pedido direto no WhatsApp do Japa.",
        cta: "ABRIR A VITRINE DA JAPA ↗",
      },
      {
        nome: "Full Time Skateboards", tag: "SKATE SHOP · CURITIBA",
        dom: "fulltimeskateboards.com.br", url: "https://fulltimeskateboards.com.br",
        img: "/assets/v2/prova-fulltime.webp", w: 640, h: 3229, dur: "45s",
        antes: "As peças no Instagram e o cliente perguntando o que tinha na loja.",
        depois: "Camisetas, skate e roupas por categoria, com as fotos reais da loja e o pedido no WhatsApp.",
        cta: "ABRIR A VITRINE DA FULL TIME ↗",
      },
    ],
    antesRotulo: "Antes",
    depoisRotulo: "Depois",
  },

  /* ---------- o painel de desempenho, BÔNUS da V2 (05/10/2026) ----------
     Decisão do Rafael: entra de bônus nos R$ 997. Desde 06/10 ele EXISTE
     no molde, como a aba "Desempenho" (ver 4 Máquina/performance.md no
     cofre): o básico que esta página promete (pessoas, chamadas no
     WhatsApp, as peças que mais chamam, de onde vieram) é grátis em toda
     vitrine, e o resto é o Performance, pago por mês. O que ainda falta
     antes de anunciar: o supabase/performance.sql rodado no Supabase do
     estúdio e as três variáveis PERF_* na Vercel de cada loja nova.
     Os números da tela são de EXEMPLO e levam selo visível dizendo isso.
     "Contatos", nunca "vendas": a venda fecha no WhatsApp, onde a vitrine
     não enxerga. */
  dados: {
    eyebrow: "BÔNUS: PAINEL DE DESEMPENHO",
    h2: <>Pare de vender<br /><em>no escuro.</em></>,
    lead: "Junto com a vitrine, você recebe um painel que mostra o que os clientes fazem dentro dela: o que olham, o que procuram e o que leva cada um até o seu WhatsApp.",
    /* "entrega de resultado" (05/10): no lugar da lista de recursos, as
       perguntas que o dono passa a conseguir responder */
    perguntasTitulo: "Perguntas que o painel responde",
    perguntas: [
      ["Qual peça repor primeiro?", "A que mais leva gente ao WhatsApp, não a que você acha."],
      ["De onde vem quem chama?", "Bio do Instagram, anúncio ou link direto."],
      ["O anúncio está trazendo gente?", "Visitas e contatos por dia, lado a lado."],
      ["Quanta gente chega até você?", "De cada 100 que visitam, quantos chamam."],
    ] as [string, string][],
    nota: "Contatos, não vendas: a venda fecha no seu WhatsApp, e o painel conta só o que ele consegue ver.",
    /* ---------- a tela do painel: TUDO é exemplo ----------
       A tela aqui é uma ilustração da aba Desempenho do molde. Os
       números são inventados para ilustrar e o selo DADOS DE EXEMPLO fica
       na tela. Produtos genéricos de propósito: com as peças da vérít.lab
       os números pareceriam dela. Os totais (visitantes, contatos, taxa,
       funil) são SOMADOS das séries diárias no componente, então a tela
       não tem como se contradizer. */
    tela: {
      titulo: "Painel de desempenho",
      selo: "DADOS DE EXEMPLO",
      abas: ["Hoje", "7 dias", "30 dias"],
      visitas: [31, 28, 35, 40, 38, 52, 61, 44, 39, 37, 42, 48, 55, 70, 63, 41, 38, 36, 44, 47, 58, 66, 49, 40, 35, 39, 43, 50, 57, 35],
      contatos: [3, 2, 4, 5, 4, 7, 8, 5, 4, 4, 5, 6, 7, 9, 8, 4, 4, 3, 5, 6, 7, 9, 6, 4, 3, 4, 5, 6, 7, 3],
      vistosPorVisita: 2.9,
      variacao: { visitantes: "+18%", vistos: "+12%", contatos: "+24%", taxa: "+0,6 pp" },
      rotulos: { visitantes: "Visitantes", vistos: "Produtos vistos", contatos: "Contatos no WhatsApp", taxa: "Chegaram ao WhatsApp", mes: "vs. mês anterior" },
      graficoTitulo: "Visitantes e contatos por dia",
      legenda: ["Visitantes", "Contatos no WhatsApp"],
      funilTitulo: "Do clique ao WhatsApp",
      funil: ["Visitaram a vitrine", "Abriram um produto", "Chamaram no WhatsApp"],
      viuProduto: 0.64,
      origemTitulo: "De onde vem quem chama",
      origem: [["Bio do Instagram", 58], ["Anúncio", 27], ["Link direto", 15]] as [string, number][],
      topoTitulo: "Produtos que mais geram contato",
      topo: [["Tênis de corrida preto", 42], ["Moletom oversized cinza", 31], ["Boné aba curva", 27], ["Camiseta básica branca", 19]] as [string, number][],
    },
  },

  /* O PAINEL ADMINISTRATIVO (05/10: "e a parte do painel administrativo..."):
     ele saiu da página quando a V2 deixou de emprestar seções da
     /vitrine-digital. Volta como um painel que a pessoa TESTA: muda o
     preço ou marca esgotado, salva, e o cartão da vitrine ao lado muda na
     hora. As abas são as do painel do molde (Início, Peças, Banners, Site,
     Loja) e os estados são os que ele tem. A peça é o Mickey Mapa da
     vérít.lab, com o preço real (R$ 2.100) como ponto de partida. */
  admin: {
    eyebrow: "O PAINEL DA LOJA",
    h2: <>Depois de publicada,<br /><em>a vitrine é sua.</em></>,
    lead: "Junto com a vitrine, você recebe um painel para trocar preço, foto e estoque sem depender de programador, nem de mim. Testa aqui: muda o preço ou marca como esgotado, e salva.",
    abas: ["Início", "Peças", "Banners", "Site", "Loja"],
    abaAtiva: 1,
    peca: {
      nome: "Mickey Mapa",
      detalhe: "Quadro · 95 × 65 cm",
      preco: 2100,
      img: "/assets/v2/mickey-mapa.webp",
      loja: "vérít.lab",
    },
    rotulos: { preco: "Preço", estado: "Estoque", salvar: "Salvar", salvo: "Salvo. A vitrine já mudou.", agora: "atualizado agora", pedir: "Quero essa" },
    estados: [
      ["disponivel", "Disponível", ""],
      ["ultimas", "Últimas unidades", "Últimas unidades"],
      ["esgotado", "Esgotado", "Esgotado"],
    ] as [string, string, string][],
    provas: [
      "Troca preço, foto e descrição na hora",
      "Marca esgotado, últimas unidades ou pronta entrega",
      "Cadastra peça nova e ela entra na vitrine na mesma hora",
      "Troca banners e os textos da vitrine pela aba Site",
    ],
    claim: "Sem mensalidade: o painel faz parte da entrega.",
    /* o painel de desempenho, reduzido a uma faixa (corte de 05/10): o
       painel grande saiu da página; os números são os mesmos de
       dados.tela, somados no componente, com o selo de exemplo */
    bonus: {
      rotulo: "BÔNUS",
      titulo: "E o painel de desempenho: pare de vender no escuro.",
      texto: "Quantas pessoas visitam, quais peças olham e quantas chegam ao seu WhatsApp.",
    },
  },

  /* 10. A OFERTA */
  oferta: {
    h2: <>Sua estrutura de vendas digital.<br /><em>{R(PRECO_PIX)} uma vez.</em></>,
    lead: "Sem mensalidade. Sem template pronto. Entregue publicada.",
    itens: [
      "Design personalizado da sua vitrine",
      "Estrutura pensada com princípios de CRO",
      "Página inicial personalizada",
      "Categorias",
      "Página individual de cada produto",
      `Até ${PRODUTOS} produtos cadastrados por mim`,
      "Fotos, preços, tamanhos e descrições",
      "Pedido direcionado para o seu WhatsApp",
      "Pensada primeiro para o celular",
      "Painel para você atualizar sozinho",
      "Publicação e configuração completa",
      "Pronta em até 7 dias úteis",
    ],
    /* O cupom fiscal (05/10: "agora a parte da oferta, mais
       personalidade"): a lista virou o papel de impressora térmica que
       todo lojista conhece. Cada linha diz "incluso" e não um preço: dar
       valor a cada parte seria inventar número. O "R$0 de mensalidade"
       saiu da lista e virou a linha de mensalidade do cupom. */
    cupom: {
      cabecalho: ["RAFAEL RAZEIRA ESTÚDIO", "Maringá, PR"],
      titulo: "Cupom da sua vitrine",
      incluso: "incluso",
      bonusItem: "Painel de desempenho",
      bonusValor: "bônus",
      mensalidade: "Mensalidade",
      mensalidadeValor: "R$ 0,00",
      total: "Total",
      totalValor: `${R(PRECO_PIX)}`,
      rodape: "Pago uma vez. O resto é comigo.",
    },
    carimbo: ["Sem", "mensalidade"],
    preco: R(PRECO_PIX),
    vez: "pagamento único",
    parcela: `no Pix, ou ${PARCELA} no cartão`,
    parcelaNota: "com os juros do cartão, calculados na hora",
    pix: `PAGAR ${R(PRECO_PIX)} NO PIX`,
    cartao: `PAGAR NO CARTÃO EM ATÉ ${MAX_PARCELAS}X`,
    seguro: "Pagamento pelo Mercado Pago. Seus dados de cartão não passam por mim.",
    duvida: "Ainda tem alguma dúvida?",
    duvidaLink: "Fale comigo no WhatsApp",
    duvidaMsg: "Oi Rafael! Vi a vitrine digital e fiquei com uma dúvida antes de comprar.",
  },

  /* 11. RISCO: o "faço antes de você pagar" saiu do núcleo; no lugar,
     o que acontece depois da compra e a rodada de ajustes */
  risco: {
    h2: <>Você não precisa entender de site.<br /><em>Eu cuido da implementação.</em></>,
    lead: "Depois da compra, você me manda as informações da loja e os produtos. Eu cuido do design, da organização, do cadastro e da publicação.",
    passos: [
      ["Pagamento confirmado", "O WhatsApp abre sozinho numa conversa comigo. Quem responde sou eu, não um atendente."],
      ["Você me manda o material", "Logo, fotos, produtos, preços e categorias. Eu te digo exatamente o que falta."],
      ["Eu monto a sua vitrine", `Design, catálogo e os ${PRODUTOS} primeiros produtos cadastrados, em até 7 dias úteis.`],
      ["Você revisa e ela entra no ar", "Você recebe a primeira versão e tem uma rodada de ajustes antes da publicação."],
    ] as [string, string][],
    /* O pós-compra contado como ele acontece: uma conversa de WhatsApp
       com o Rafael (05/10: "a personalidade agora é essa parte aqui").
       Ilustração, não cliente real: a loja é genérica (sualoja.com.br).
       Os dias seguem a promessa da página: o prazo de 7 dias úteis conta
       a partir do material. */
    chat: {
      nome: "Rafael Razeira",
      status: "Estúdio",
      mensagens: [
        { tipo: "dia", texto: "Hoje" },
        { tipo: "cliente", texto: "Paguei! ✓", hora: "10:12" },
        { tipo: "eu", texto: "Recebi, obrigado! Me manda a logo, as fotos e a lista dos produtos com preço e tamanho.", hora: "10:14" },
        { tipo: "arquivo", texto: "logo.png", detalhe: "PNG · 240 KB", hora: "10:31" },
        { tipo: "arquivo", texto: "fotos-produtos.zip", detalhe: "ZIP · 86 MB", hora: "10:33" },
        { tipo: "arquivo", texto: "produtos.xlsx", detalhe: "Planilha · 18 KB", hora: "10:34" },
        { tipo: "eu", texto: "Tudo certo. Começo hoje.", hora: "10:40" },
        { tipo: "dia", texto: "6 dias úteis depois" },
        { tipo: "link", texto: "Sua vitrine está pronta para revisar 👇", link: "sualoja.vercel.app", hora: "16:05" },
        { tipo: "cliente", texto: "Amei! Dá para trocar a foto do topo?", hora: "16:22" },
        { tipo: "eu", texto: "Feito. Sua loja está no ar: sualoja.com.br ✓", hora: "17:10" },
      ] as { tipo: "dia" | "cliente" | "eu" | "arquivo" | "link"; texto: string; detalhe?: string; link?: string; hora?: string }[],
    },
  },

  /* O FAQ (05/10: "agora o FAQ, mais personalidade"): as perguntas
     como balões que chegam no WhatsApp do Rafael, e a resposta dele como
     balão enviado que abre ao tocar. As perguntas e respostas continuam
     em ptV2.faq.itens; aqui só o que é da forma. */
  faq: {
    eyebrow: "ANTES DE COMPRAR",
    h2: <>Perguntas que chegam<br />no meu WhatsApp.<br /><em>E as respostas.</em></>,
    lead: "As dúvidas que todo lojista me manda antes de fechar. Toque na pergunta para ver o que eu respondo.",
    abrir: "ver resposta",
    fechar: "fechar",
    hora: "agora",
    outra: "Não achou a sua?",
    outraLink: "Me pergunta no WhatsApp",
    outraMsg: "Oi Rafael! Vi a vitrine digital e tenho uma pergunta que não está na página.",
  },

  /* 12. FECHAMENTO */
  fim: {
    h2: <>Se sua loja já chama atenção,<br /><em>faça essa atenção chegar mais perto da venda.</em></>,
    lead: `Vitrine digital completa por ${R(PRECO_PIX)}. No Pix ou em até ${MAX_PARCELAS}x no cartão.`,
    cta: "QUERO MINHA VITRINE",
  },

  barra: { destaque: R(PRECO_PIX), sub: "uma vez, sem mensalidade", cta: "QUERO MINHA VITRINE" },
};

export type V2Messages = typeof v2;
