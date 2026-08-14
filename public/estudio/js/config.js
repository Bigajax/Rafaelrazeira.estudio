/* ============================================================
   RAFAEL RAZEIRA ESTÚDIO — CONTEÚDO DA PÁGINA
   ------------------------------------------------------------
   ⭐ ESTE É O ÚNICO ARQUIVO QUE VOCÊ PRECISA EDITAR PARA
      TROCAR TEXTOS, CASES E DEPOIMENTOS.

   Regras rápidas:
   • Texto entre <b>…</b>  → destaque em preto forte
   • Texto entre <span class="muted">…</span> → cinza
   • Imagens: coloque o arquivo em /assets e aponte o caminho
     (ex.: img: "assets/case-1.jpg"). Deixe "" para o placeholder.
   ============================================================ */

/* ⬇ Número do WhatsApp usado em TODOS os botões do site
   (hero, footer e pós-envio). Formato: DDI + DDD + número, só dígitos. */
const WHATSAPP_NUMBER = "5544999997219";

/* ⬇ Mixpanel — funil próprio, espelha os mesmos eventos do Meta Pixel
   (PageView → ClickCTA → InitiateCheckout → Lead + ViewContent).
   Crie um projeto em mixpanel.com → Settings → Project Settings e cole
   o "Project Token" aqui. Vazio = desligado (nenhuma chamada é feita).
   Criou o projeto com residência de dados na UE? Troque o host
   MP_URL em js/lib/tracking.js para api-eu.mixpanel.com. */
const MIXPANEL_TOKEN = "56f4afa648bf59c45e417b084fdb4aa4";

const CONFIG_ESTUDIO = {
  brand: {
    name: "RAFAEL RAZEIRA",       // aparece no header e no footer
    suffix: "ESTÚDIO",            // segunda parte do logo (mais leve)
    navCta: "VAMOS CONVERSAR",    // link no topo à direita
  },

  hero: {
    status: "AGENDA ABERTA",                                   // sinal (bolinha pulsante esmeralda)
    tagline: "POSICIONAMENTO · CONVERSÃO · NOVOS NEGÓCIOS",
    // <em>…</em> na headline = destaque em esmeralda (css/sections/hero.css)
    headline: ["SUA MARCA", "VENDENDO ONLINE", "EM ATÉ <em>7 DIAS ÚTEIS.</em>"],
    // <em>…</em> no subtítulo = destaque em esmeralda (css/sections/hero.css)
    /* A frase do saldo ("o saldo você só quita depois de aprovar") saiu
       daqui em 14/08, junto com a da linha de prova. Ela continua inteira
       no bloco de garantia e no passo 03 do "Como funciona", que é onde
       alguém lê condição de pagamento. No cartão do hero ela custava duas
       linhas para responder uma pergunta que ninguém faz na primeira
       tela: ali a pessoa ainda está decidindo se conversa, não se paga. */
    subheadline: "<em>Landing pages, vitrines e lojas completas</em>: estratégia, copy e design sob medida.",
    cta: "QUERO MINHA ANÁLISE GRATUITA",
    /* ⬇ O CARTÃO DO HERO É UM FORMULÁRIO (14/08)
       Antes ele tinha só um botão que ROLAVA até o briefing lá no fim da
       página. Agora ele captura ali mesmo: dois campos obrigatórios e um
       opcional, o mínimo para conseguir responder.
       O briefing completo do fim da página continua existindo e continua
       sendo o caminho de quem quer contar o projeto inteiro; este aqui é
       para quem decidiu na primeira tela e não vai rolar dez mil pixels.
       Os dois gravam na mesma tabela e disparam o mesmo Lead. */
    form: {
      nome:      { label: "SEU NOME",             ph: "Como devo te chamar" },
      whatsapp:  { label: "WHATSAPP COM DDD",     ph: "(44) 99999-9999" },
      instagram: { label: "INSTAGRAM OU SITE",    ph: "@seuperfil (opcional)" },
      enviar: "QUERO MINHA ANÁLISE GRATUITA",
      enviando: "ENVIANDO…",
      errNome:  "Escreva seu nome.",
      errWhats: "Confira o número: faltou dígito.",
      okTitulo: "RECEBI SEU CONTATO.",
      okTexto:  "Vou olhar seu negócio e te responder pelo WhatsApp em até 24 horas úteis.",
      okCta:    "ADIANTAR PELO WHATSAPP",
      erro:     "Não consegui enviar agora. Tente de novo ou me chame no WhatsApp.",
    },
    // Linha de prova sob o CTA — responde às 3 dúvidas de quem acabou de clicar no anúncio
    proof: "SEM COMPROMISSO · RETORNO EM ATÉ 24H",
    // `ctaWhats` não é mais usado no hero: o link "prefiro conversar pelo
    // WhatsApp" saiu do cartão em 14/08 (era uma porta de saída ao lado do
    // botão de envio, competindo com ele). O WhatsApp continua no rodapé e
    // na confirmação de quem enviou. `whatsMsg` segue em uso pela
    // confirmação, então não apague nenhum dos dois.
    ctaWhats: "PREFIRO CONVERSAR PELO WHATSAPP",
    whatsMsg: "Olá, Rafael. Vi seu trabalho e gostaria de entender como uma landing page poderia funcionar para o meu negócio.",
  },

  // Uma frase ("...") ou várias (["...", "..."]) — elas se alternam na faixa
  marquee: [
    "PÁGINAS, VITRINES E LOJAS PARA MARCAS QUE NÃO ACEITAM O COMUM.",
    "FEITO PARA VENDER.",
  ],

  cue: "CONHEÇA MAIS",   // convite para rolar, logo após a faixa

  about: {
    label: "QUEM SOMOS.",
    paragraphs: [
      "Um <b>estúdio boutique</b> de design: poucos projetos por vez, cada um com <b>rigor artesanal</b>.",
      "<span class='muted'>Mais que páginas, <b>posicionamento de mercado</b>: autoridade e presença à altura do seu negócio.</span>",
    ],
    cta: "VAMOS CONVERSAR",
  },

  // Como funciona — o processo em 3 passos (sequência real: briefing → design → publicação)
  process: {
    label: "COMO FUNCIONA.",
    steps: [
      { num:"01", title:"BRIEFING E ANÁLISE",   text:"Você conta o seu negócio e o objetivo. Eu analiso e confirmo se somos o fit certo. Só então o trabalho começa." },
      { num:"02", title:"DESIGN E COPY EM ATÉ 7 DIAS ÚTEIS", text:"A partir do briefing aprovado, estratégia, texto e design do seu projeto ficam prontos em até 7 dias úteis." },
      { num:"03", title:"APROVAÇÃO E PUBLICAÇÃO", text:"Você revisa, aprova e o projeto vai ao ar. O saldo só é quitado depois do seu OK." },
    ],
    // Resumo da garantia — linha curta no fim da seção, leva ao bloco completo no contato
    note: "ENTRADA DE 50% · SALDO SÓ APÓS APROVAR O DESIGN",
  },

  // O que está incluso — o "romaneio" do projeto: tudo que sai do estúdio com a página
  included: {
    label: "O QUE ESTÁ INCLUSO.",
    headline: "TUDO O QUE SEU PROJETO PRECISA PARA IR AO AR.",
    items: [
      { num:"01", title:"ESTRATÉGIA DA OFERTA",       text:"Definição da mensagem, estrutura e objetivo principal da página." },
      { num:"02", title:"COPY COMPLETA",              text:"Textos desenvolvidos para comunicar valor e conduzir o visitante." },
      { num:"03", title:"DESIGN PERSONALIZADO",       text:"Identidade visual criada especificamente para o posicionamento da marca." },
      { num:"04", title:"DESENVOLVIMENTO RESPONSIVO", text:"Página otimizada para computador, tablet e celular." },
      { num:"05", title:"PUBLICAÇÃO E CONFIGURAÇÃO",  text:"Página ou loja publicada, domínio conectado, formulários e checkout funcionando." },
      { num:"06", title:"MENSURAÇÃO",                 text:"Configuração dos principais eventos para acompanhar visitas e contatos." },
    ],
  },

  cases: {
    label: "PROJETOS DO ESTÚDIO",
    headline: "CONHEÇA ALGUNS CASES RAFAEL RAZEIRA™",
    intro: "Três direções criadas no estúdio para negócios reais: cada página nasce do posicionamento da marca e é desenhada para converter.",
    cta: "QUERO UMA PÁGINA PARA O MEU NEGÓCIO",
    // video: gravação vertical (mp4) → aparece dentro de um mockup de iPhone, em loop.
    // img: captura mobile de página inteira (jpg) → rola sozinha dentro do mockup de iPhone.
    // Deixe os dois "" para exibir o placeholder estilizado.
    // tag: rótulo acima do título. Deixe "" para ocultar.
    items: [
      { video:"", img:"assets/case-solourb.jpg",     tag:"", category:"E-COMMERCE · STREETWEAR & SNEAKERS",  name:"Sölo Urb",          result:"Concept store urbana com curadoria de sneakers, streetwear e relógios: vitrine em preto e branco que deixa o produto falar." },
      { video:"", img:"assets/case-xavier.jpg",      tag:"", category:"VITRINE DIGITAL · CAMISAS DE FUTEBOL", name:"Xavier's Sports",   result:"Camisas de clubes e seleções, atuais e retrô: catálogo completo com pedido direto pelo WhatsApp, sem fricção de checkout." },
      { video:"", img:"assets/case-lancellotti.jpg", tag:"", category:"LANDING PAGE · TATTOO & PIERCING",     name:"Lancellotti Tattoo", result:"Arte, identidade e expressão em cada detalhe: hero cinematográfico, acervo em galeria e orçamento guiado por etapas." },
    ],
  },

  founder: {
    firstName: "RAFAEL",
    lastName: "RAZEIRA",
    photo: "assets/rafael.jpg",
    bgWords: ["BOUTIQUE CRIATIVA", "POSICIONAMENTO", "AUTORIDADE"],   // letreiro clarinho de fundo
    headline: "O estrategista por trás de páginas que posicionam e vendem",
    paragraphs: [
      "Trabalho lado a lado com fundadores e marcas em crescimento, unindo design, posicionamento e conversão em cada projeto.",
      "Design de impacto não é só bonito: conecta a marca ao público certo e posiciona o negócio como líder no seu mercado.",
    ],
  },

  values: {
    words: ["POSICIONAMENTO", "CONVERSÃO", "AUTORIDADE", "DIFERENCIAÇÃO"],
    paragraph: "É o que a sua marca conquista comigo: <b>presença digital que transmite autoridade, gera oportunidades e destaca você no mercado.</b>",
  },

  audience: {
    label: "PARA QUEM É ESTE TRABALHO",
    blocks: [
      { title:"PROFISSIONAIS QUE VALORIZAM REPUTAÇÃO", text:"Para quem sabe que a credibilidade online precisa refletir o prestígio offline." },
      { title:"MARCAS QUE QUEREM CRESCER",            text:"Para negócios prontos para escalar, com presença digital à altura da ambição." },
      { title:"NEGÓCIOS LANÇANDO OFERTAS",            text:"Para quem vai ao mercado com um produto ou serviço e precisa de uma página, ou loja, feita para converter." },
    ],
  },

  testimonials: {
    enabled: false,                 // ⬅ mude para true quando tiver os vídeos
    label: "O QUE ESTÃO DIZENDO",
    // thumb: imagem de capa (assets/…) · video: link que abre em nova aba
    items: [
      { thumb:"", video:"", name:"Nome do Cliente", role:"Cargo · Empresa" },
      { thumb:"", video:"", name:"Nome do Cliente", role:"Cargo · Empresa" },
    ],
  },

  /* Projetos Fundadores — acesso antecipado ao estúdio (antes do contato).
     Tom: exclusividade e parceria — nunca desconto por necessidade. */
  founders: {
    status: "PRIMEIROS CASES",
    title: "Estou selecionando os próximos cases do estúdio.",
    text: "Empresas com potencial de virar grandes cases recebem uma condição especial de lançamento, em troca da autorização para divulgar o projeto e os resultados.",
    benefits: [
      "Condição especial de lançamento",
      "Projeto totalmente personalizado",
      "Direito a usar o projeto como case",
      "Depoimento após a entrega",
      "Atendimento direto comigo",
    ],
    limited: "Condição válida para um número limitado de empresas.",
    ctaLine: "Quero fazer parte dos primeiros cases",
    cta: "SOLICITAR ANÁLISE GRATUITA",
  },

  contact: {
    status: "AGENDA ABERTA",
    headline: "SEU PROJETO COMEÇA AQUI.",
    intro: "Conte sobre o seu negócio. Eu analiso e retorno pelo WhatsApp em até 24 horas úteis.",
    scarcity: "Vagas limitadas por mês: todo projeto passa por análise.",
    email: "rafael.rbarbon@gmail.com",
    // Bloco de garantia — aparece destacado logo antes do formulário
    guarantee: {
      label: "GARANTIA",
      title: "RISCO ZERO PARA COMEÇAR.",
      text:  "Você começa com <b>50% de entrada</b> e quita o saldo só depois de <b>aprovar a direção visual</b>. Não aprovou e não quis continuar? A entrada é <b>devolvida integralmente</b>.",
    },
    pricing: "Projetos a partir de <b>R$ 1.500</b>.",   // microcopy acima do formulário
    pricingNote: "O valor final depende da complexidade, quantidade de seções, integrações e materiais disponíveis.",
    steps: [
      { num:"01", label:"SEUS DADOS" },
      { num:"02", label:"SOBRE O PROJETO" },
    ],
    form: {
      nome:      { label:"Qual seu nome?",    placeholder:"Seu nome",        err:"Digite seu nome." },
      whatsapp:  { label:"WhatsApp com DDD",   placeholder:"(12) 12345-6789", err:"Digite o WhatsApp com DDD (10 a 11 dígitos)." },
      instagram: { label:"Instagram ou site (opcional)", placeholder:"@seuperfil ou seusite.com.br" },
      tipoProjeto: { label:"O que você precisa?", err:"Escolha uma opção para continuar.", options:[
        "Landing page (página única de vendas ou captação)",
        "Site institucional (3 a 5 páginas)",
        "Loja virtual (catálogo + checkout)",
        "Ainda não sei",
      ]},
      vende:     { label:"O que você vende?", placeholder:"Ex.: consultoria, estética, mentoria, arquitetura…", err:"Conte o que você vende." },
      objetivo:  { label:"Qual é o principal objetivo da página?", options:["Gerar contatos no WhatsApp","Vender um produto ou serviço","Divulgar um lançamento","Agendar atendimentos","Outro"] },
      identidade:{ label:"Já possui identidade visual?", options:["Sim, completa","Tenho logo e algumas peças","Ainda não tenho"] },
      detalhes:  { label:"Quer contar mais algum detalhe? (opcional)", placeholder:"Prazos, referências, links: o que achar útil." },
      continueBtn: "CONTINUAR",
      backBtn: "← Voltar",
      submit:  "ENVIAR MEU PROJETO",
      note:    "Sem compromisso. Seus dados serão usados apenas para responder sobre o projeto.",
      successTitle: "PROJETO RECEBIDO!",
      successText:  "Vou analisar e te retorno pelo WhatsApp em até 24 horas úteis. Quer adiantar a conversa?",
    },
    /* Passo 02 — agendamento após o envio.
       url: cole aqui seu Calendly/Cal.com (ex.: "https://calendly.com/rafael/30min").
       Vazio = o botão abre o WhatsApp com mensagem pronta. */
    schedule: { url: "", cta: "CHAMAR NO WHATSAPP" },
  },

  footer: {
    name: "RAFAEL RAZEIRA ESTÚDIO",
    email: "rafael.rbarbon@gmail.com",
    instagram: { handle:"@rafaelrazeira", url:"https://instagram.com/rafaelrazeira" },
    whatsapp: { display:"(44) 99999-7219", url:`https://wa.me/${WHATSAPP_NUMBER}` },
    location: "ESTAMOS NO BRASIL",   // ⬅ troque pela sua cidade (ex.: "ESTAMOS EM CAMPINAS, SP")
    legal: [
      { label:"TERMOS DE USO",            url:"/termos" },
      { label:"POLÍTICA DE PRIVACIDADE",  url:"/privacidade" },
    ],
  },

  pillText: "ANALISAR MEU PROJETO",
};

/* ============================================================
   A SEGUNDA PÁGINA: /landing-page

   Este arquivo passou a servir DUAS páginas, e é bom entender por quê
   antes de mexer.

   A /landing-page é o destino do tráfego pago da Meta. Ela fala com
   quem JÁ anuncia, e por isso muda tudo o que é argumento (o problema é
   o clique que se perde, não "presença digital") e nada do que é
   estrutura: o hero com o cartão de captura, o processo em 3 passos, os
   cases no mockup de celular, o quem faz e o formulário são os MESMOS
   componentes da /estudio, com o mesmo CSS.

   Duplicar a pasta inteira teria sido mais rápido hoje e mais caro para
   sempre: toda correção de layout precisaria ser feita duas vezes, e a
   segunda seria esquecida. Então o conteúdo se separa aqui e o resto
   continua um só.

   COMO FUNCIONA: as chaves de CONFIG_LP SUBSTITUEM as de CONFIG_ESTUDIO
   inteiras, no primeiro nível. Se você mexer só em `hero.cta`, precisa
   repetir o bloco `hero` todo. É proposital: mesclagem profunda
   esconderia de onde cada texto veio.

   As seções que a /landing-page NÃO usa (o que está incluso, valores,
   depoimentos, projetos fundadores, brandband) continuam definidas
   acima e simplesmente não entram na ordem de `js/main-lp.js`.
   ============================================================ */
const CONFIG_LP = {
  brand: {
    name: "RAFAEL RAZEIRA",
    suffix: "ESTÚDIO",
    navCta: "ANÁLISE GRATUITA",
  },

  hero: {
    status: "AGENDA ABERTA",
    tagline: "CAPTAÇÃO · VENDA · LANÇAMENTO",
    /* Lida em voz alta: "Você já pagou pelo clique. A venda é aqui."
       Ela nomeia o dinheiro que já saiu do bolso e aponta o lugar. Nenhuma
       promessa de número, que é o que todo concorrente escreve.
       O <em> da última linha ganha a largura 100% e a faixa grafite (ver
       css/sections/hero.css); os pontos finais saem em rosa. */
    headline: ["VOCÊ JÁ PAGOU", "PELO CLIQUE.", "A VENDA <em>É AQUI.</em>"],
    subheadline: "<em>Landing pages para quem já anuncia.</em> Estratégia, texto e design da página que recebe o seu tráfego, no ar em 7 dias úteis.",
    cta: "QUERO MINHA ANÁLISE GRATUITA",
    form: {
      nome:      { label: "SEU NOME",          ph: "Como devo te chamar" },
      whatsapp:  { label: "WHATSAPP COM DDD",  ph: "(44) 99999-9999" },
      instagram: { label: "SITE OU INSTAGRAM", ph: "Para onde seus anúncios vão hoje" },
      enviar: "QUERO MINHA ANÁLISE GRATUITA",
      enviando: "ENVIANDO…",
      errNome:  "Escreva seu nome.",
      errWhats: "Confira o número: faltou dígito.",
      okTitulo: "RECEBI SEU CONTATO.",
      okTexto:  "Vou olhar para onde o seu tráfego cai hoje e te respondo pelo WhatsApp em até 24 horas úteis.",
      okCta:    "ADIANTAR PELO WHATSAPP",
      erro:     "Não consegui enviar agora. Tente de novo ou me chame no WhatsApp.",
    },
    proof: "RESPOSTA EM ATÉ 24H · SEM COMPROMISSO",
    ctaWhats: "PREFIRO CONVERSAR PELO WHATSAPP",
    whatsMsg: "Olá, Rafael. Eu já anuncio e quero uma landing page para receber o meu tráfego.",
  },

  marquee: [
    "SEU ANÚNCIO MERECE UM DESTINO MELHOR QUE O LINK DA BIO.",
    "FEITO PARA CONVERTER.",
  ],

  cue: "VEJA ONDE O DINHEIRO VAZA",

  /* ---------- O VAZAMENTO ----------
     Ocupa o lugar do "Para quem é" da /estudio, e o trabalho dele é
     outro: criar o problema e provar que o estúdio entende do assunto
     SEM depender de um único resultado de cliente. É a seção que segura
     a página enquanto não houver número para mostrar. */
  audience: {
    label: "ONDE O DINHEIRO VAZA.",
    headline: "O PROBLEMA QUASE NUNCA É O ANÚNCIO.",
    intro: "Você paga por cada clique. Se o que vem depois do clique não estiver à altura, o dinheiro sai do mesmo jeito e a venda não acontece. Os três vazamentos mais caros:",
    /* Liga o marcador numerado em rosa no lugar do traço esmeralda (ver
       .aud__item--marcado, no CSS). Só esta página usa: é a única das
       duas que descreve um problema, e o rosa da casa marca a ação em
       todo lugar menos aqui, onde ele inverte e marca o que está errado. */
    marcador: "VAZAMENTO",
    /* Fundo grafite. O miolo da página eram SEIS seções de papel
       seguidas, sem uma quebra: cada uma bem resolvida sozinha e todas
       iguais em peso, o que faz a leitura virar rolagem. Esta é a única
       que dá uma má notícia, então é ela que apaga a luz. */
    escura: true,
    blocks: [
      { title:"O CLIQUE CAI NO LUGAR ERRADO", text:"Link da bio, home do site, direct do Instagram. Três destinos que obrigam a pessoa a procurar sozinha o que ela veio buscar. Boa parte desiste no caminho." },
      { title:"A PÁGINA NÃO REPETE A PROMESSA DO ANÚNCIO", text:"Ela clicou por causa de uma frase. Se essa frase não estiver na primeira tela, ela acha que errou de lugar e volta." },
      { title:"NO CELULAR, NADA DISSO SE SUSTENTA", text:"É de onde vem quase todo o seu tráfego pago, e é onde as páginas feitas no computador quebram primeiro." },
    ],
  },

  /* O passo 01 é o próprio botão da página: a pessoa lê o processo e
     descobre que o começo é exatamente o que ela já podia ter feito. E o
     pixel no passo 03 é entrega real, que este cliente valoriza e o dono
     de loja da /vitrine-digital nem entenderia. */
  process: {
    label: "COMO FUNCIONA.",
    steps: [
      /* O `prazo` não acrescenta promessa: as três frases já estavam
         dentro dos parágrafos. Ele só tira do meio do texto o dado que
         este cliente está tentando descobrir enquanto lê, e põe no
         trilho da esquerda, embaixo do número. */
      { num:"01", prazo:"RESPOSTA EM 24H ÚTEIS", title:"VOCÊ PEDE A ANÁLISE",     text:"Você me manda o seu site ou Instagram em dois campos. Eu olho para onde o seu tráfego cai hoje e te respondo em até 24 horas úteis, sem compromisso." },
      { num:"02", prazo:"7 DIAS ÚTEIS",          title:"EU FAÇO A PÁGINA INTEIRA", text:"Estratégia, texto, design e desenvolvimento. Você não escreve nada e não manda nada pronto. Fica em até 7 dias úteis, com a sua campanha em mente." },
      { num:"03", prazo:"SALDO APÓS O SEU OK",   title:"VOCÊ APROVA E VAI AO AR",  text:"Domínio conectado, formulário caindo no seu WhatsApp e o pixel configurado, para você ver quanto custa cada contato. O saldo só é quitado depois do seu OK." },
    ],
    note: "ENTRADA DE 50% · SALDO SÓ APÓS APROVAR O DESIGN",
  },

  /* A Xavier's Sports saiu e a Baixudos.PR entrou. Não é gosto: a
     manchete diz "páginas feitas para uma tarefa só", e a Xavier's é uma
     vitrine de catálogo, ou seja, o contrário disso. Manter os três
     antigos faria a própria seção de prova desmentir o título. */
  cases: {
    label: "PROJETOS DO ESTÚDIO",
    headline: "PÁGINAS FEITAS PARA UMA TAREFA SÓ.",
    intro: "Cada uma nasceu de um objetivo específico, não de um layout bonito escolhido antes.",
    cta: "QUERO UMA PÁGINA PARA A MINHA CAMPANHA",
    items: [
      { video:"", img:"assets/case-lancellotti.jpg", tag:"", category:"LANDING PAGE · CAPTAÇÃO",   name:"Lancellotti Tattoo", result:"Hero cinematográfico, acervo em galeria e orçamento guiado por etapas: quem chega interessado sai com o pedido já descrito." },
      { video:"", img:"assets/case-baixudos.jpg",    tag:"", category:"LANDING PAGE · EVENTO",     name:"Baixudos.PR",        result:"Página de campanha com data marcada: uma promessa, uma ação e o caminho até o ingresso sem desvio." },
      /* A Sölo Urb saiu em 14/08, pelo mesmo motivo que a Xavier's já
         tinha saído: a manchete promete "páginas feitas para uma tarefa
         só" e um e-commerce de catálogo é exatamente a exceção disso.
         Sobraram DUAS, e duas é o número certo aqui: com três, a terceira
         era a que desmentia o título. A grade se ajusta sozinha ao número
         de itens (ver .cases__grid, no CSS). */
    ],
  },

  /* ---------- QUEM FAZ ----------
     O "um homem só" deixa de ser charme de estúdio e vira a solução de um
     problema técnico que este cliente conhece pelo nome: message match.
     Quando o anúncio e a página saem de mãos diferentes, é no meio do
     caminho que a promessa se perde. */
  about: {
    label: "QUEM FAZ.",
    paragraphs: [
      "Sou eu que desenho, escrevo e publico a sua página.",
      "Um estúdio de um homem só. Você não fala com atendimento nem com estagiário: <b>fala comigo</b>, do briefing ao ar.",
      "<span class='muted'>Estratégia, texto e design saindo do mesmo par de mãos é o que faz o <b>anúncio e a página falarem igual</b>. Quando são pessoas diferentes, é no meio do caminho que a promessa se perde.</span>",
    ],
    cta: "QUERO MINHA ANÁLISE GRATUITA",
  },

  contact: {
    status: "AGENDA ABERTA",
    headline: "COMECE PELA ANÁLISE.",
    intro: "Me conte o que você vende e para onde o seu tráfego vai hoje. Eu analiso e retorno pelo WhatsApp em até 24 horas úteis.",
    scarcity: "Pego poucos projetos por mês, e todos passam por análise antes de aceitar.",
    email: "rafael.rbarbon@gmail.com",
    /* O bloco que na /estudio é a GARANTIA aqui descreve a entrega da
       análise. É a mesma caixa no mesmo lugar, com outro trabalho: lá ela
       tira o risco de pagar, aqui ela diz o que a pessoa ganha de graça,
       que é o que faz o formulário valer o preenchimento. */
    guarantee: {
      label: "A ANÁLISE",
      title: "O QUE VOCÊ RECEBE.",
      text:  "Eu abro o seu Instagram e o destino que os seus anúncios usam hoje, e te mando <b>em vídeo</b>: onde o clique se perde, o que a página precisa ter para segurar quem chega e <b>que tipo de projeto o seu caso pede</b>. Se eu achar que não consigo ajudar, eu falo.",
    },
    /* Sem preço na página: cada campanha pede um escopo diferente, e um
       "a partir de" aqui filtraria pelo número antes de a pessoa entender
       o que recebe. O valor fechado sai depois da análise. */
    pricing: "",
    pricingNote: "Cada campanha pede um escopo diferente. Depois da análise eu te mando o valor fechado, sem surpresa no meio do caminho.",
    /* ---------- um passo só, quatro campos ----------
       A /estudio pergunta em dois passos porque lá o formulário É o
       briefing. Aqui ele é o pedido de uma ANÁLISE: objetivo, identidade
       visual e detalhes eu pergunto no WhatsApp, depois que a conversa
       existir. Cada campo a mais numa página de tráfego pago é gente que
       desiste no meio. */
    passoUnico: true,
    /* Inverte quem brilha na seção escura: o bloco da análise vira
       contorno e o formulário vira a etiqueta de papel. Ver o comentário
       em js/sections/contact.js. */
    formClaro: true,
    form: {
      nome:      { label:"Qual seu nome?",  placeholder:"Seu nome", err:"Digite seu nome." },
      whatsapp:  { label:"WhatsApp com DDD", placeholder:"(44) 99999-9999", err:"Digite o WhatsApp com DDD (10 a 11 dígitos)." },
      instagram: { label:"Site ou Instagram", placeholder:"Para onde seus anúncios vão hoje", err:"Diga para onde seus anúncios vão hoje." },
      vende:     { label:"O que você vende?", placeholder:"Ex.: estética, mentoria, curso, serviço local…", err:"Conte o que você vende." },
      submit:  "RECEBER MINHA ANÁLISE GRATUITA",
      note:    "Sem compromisso. Seus dados serão usados apenas para responder sobre o seu projeto.",
      successTitle: "ANÁLISE SOLICITADA!",
      successText:  "Vou olhar para onde o seu tráfego cai hoje e te respondo pelo WhatsApp em até 24 horas úteis. Quer adiantar a conversa?",
    },
    schedule: { url: "", cta: "CHAMAR NO WHATSAPP" },
  },

  footer: {
    name: "RAFAEL RAZEIRA ESTÚDIO",
    email: "rafael.rbarbon@gmail.com",
    instagram: { handle:"@rafaelrazeira", url:"https://instagram.com/rafaelrazeira" },
    whatsapp: { display:"(44) 99999-7219", url:`https://wa.me/${WHATSAPP_NUMBER}` },
    location: "MARINGÁ · PR · ATENDO O BRASIL INTEIRO",
    legal: [
      { label:"TERMOS DE USO",            url:"/termos" },
      { label:"POLÍTICA DE PRIVACIDADE",  url:"/privacidade" },
    ],
  },

  pillText: "QUERO MINHA ANÁLISE",
};

/* Qual das duas o navegador está lendo. É a única linha que decide, e ela
   olha o caminho porque as duas páginas compartilham TODO o resto dos
   arquivos: mesmo CSS, mesmos módulos de seção, mesmo js/lib. */
const naLP = typeof location !== "undefined" && location.pathname.startsWith("/landing-page");
const CONFIG = naLP ? { ...CONFIG_ESTUDIO, ...CONFIG_LP } : CONFIG_ESTUDIO;

/* ============================================================
   ENDPOINT DE ENVIO DO FORMULÁRIO
   ------------------------------------------------------------
   Por padrão o formulário só mostra a mensagem de sucesso (modo demo).
   Para receber os leads de verdade, defina FORM_ENDPOINT abaixo:

   • Webhook (Zapier / Make / n8n): cole a URL do webhook.
   • Supabase (tabela "briefings" com policy de insert público):
       FORM_ENDPOINT = "https://SEU_PROJETO.supabase.co/rest/v1/briefings"
       FORM_HEADERS  = {
         "Content-Type": "application/json",
         "apikey": "SUA_ANON_KEY",
         "Authorization": "Bearer SUA_ANON_KEY",
         "Prefer": "return=minimal"
       }
   O envio é um POST JSON com: nome, whatsapp, instagram, tipo_projeto,
   vende, objetivo, identidade, detalhes (+ origem).
   ⚠️ Formulário novo (jul/2026): rode as migrações no fim de
      supabase/briefings.sql ANTES de publicar, senão o insert falha
      (inclui a coluna nova tipo_projeto).
   ============================================================ */
const FORM_ENDPOINT = "https://mxfakodcmpphgasmdlna.supabase.co/rest/v1/briefings";
const FORM_HEADERS  = {
  "Content-Type": "application/json",
  "apikey": "sb_publishable_8SVQEwGP2XG346NsQcRXgg_kn5Z1M7Z",
  "Authorization": "Bearer sb_publishable_8SVQEwGP2XG346NsQcRXgg_kn5Z1M7Z",
  "Prefer": "return=minimal",
};

/* ⚠️ Não precisa mexer daqui para baixo — apenas disponibiliza o conteúdo p/ a página. */
export { CONFIG, FORM_ENDPOINT, FORM_HEADERS, WHATSAPP_NUMBER, MIXPANEL_TOKEN };
