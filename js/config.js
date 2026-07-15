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

const CONFIG = {
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
    subheadline: "<em>Landing pages, vitrines e lojas completas</em>: estratégia, copy e design sob medida. O saldo, você só quita <b>depois de aprovar</b>.",
    cta: "QUERO MINHA ANÁLISE GRATUITA",
    // Linha de prova sob o CTA — responde às 3 dúvidas de quem acabou de clicar no anúncio
    proof: "SEM COMPROMISSO · RETORNO EM ATÉ 24H · SALDO SÓ APÓS APROVAR",
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
