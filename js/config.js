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
    headline: ["TRANSFORME", "SEU SERVIÇO EM UMA", "PÁGINA PRONTA PARA", "<em>RECEBER CLIENTES.</em>"],
    subheadline: "Sua página completa — estratégia, copy e design — <b>no ar em até 7 dias úteis</b>. O saldo, você só quita <b>depois de aprovar</b>.",
    cta: "QUERO UMA ANÁLISE DO MEU PROJETO",
    ctaWhats: "PREFIRO CONVERSAR PELO WHATSAPP",
    whatsMsg: "Olá, Rafael. Vi seu trabalho e gostaria de entender como uma landing page poderia funcionar para o meu negócio.",
  },

  // Uma frase ("...") ou várias (["...", "..."]) — elas se alternam na faixa
  marquee: [
    "UMA PÁGINA FEITA PARA MARCAS QUE NÃO ACEITAM O COMUM.",
    "UM SITE FEITO PARA VENDER.",
  ],

  cue: "CONHEÇA MAIS",   // convite para rolar, logo após a faixa

  about: {
    label: "QUEM SOMOS.",
    paragraphs: [
      "Um <b>estúdio boutique</b> de design que escolhe a dedo os projetos que assume, cuidando de cada detalhe com <b>rigor artesanal</b>.",
      "<span class='muted'>Mais que páginas, entrego <b>posicionamento de mercado</b>: autoridade, reputação digital sólida e uma presença à altura do seu negócio.</span>",
    ],
    cta: "VAMOS CONVERSAR",
  },

  // Como funciona — o processo em 3 passos (sequência real: briefing → design → publicação)
  process: {
    label: "COMO FUNCIONA.",
    steps: [
      { num:"01", title:"BRIEFING E ANÁLISE",   text:"Você conta o seu negócio e o objetivo da página. Eu analiso o projeto e confirmo se somos o fit certo — só então o trabalho começa." },
      { num:"02", title:"DESIGN E COPY EM ATÉ 7 DIAS ÚTEIS", text:"A partir do briefing aprovado, estratégia, texto e design da sua página ficam prontos em até 7 dias úteis." },
      { num:"03", title:"APROVAÇÃO E PUBLICAÇÃO", text:"Você revisa e aprova a página antes de ela ir ao ar. O saldo só é quitado depois do seu OK." },
    ],
    // Resumo da garantia — linha curta no fim da seção, leva ao bloco completo no contato
    note: "ENTRADA DE 50% · SALDO SÓ APÓS APROVAR O DESIGN",
  },

  // O que está incluso — o "romaneio" do projeto: tudo que sai do estúdio com a página
  included: {
    label: "O QUE ESTÁ INCLUSO.",
    headline: "TUDO O QUE SUA LANDING PAGE PRECISA PARA IR AO AR.",
    items: [
      { num:"01", title:"ESTRATÉGIA DA OFERTA",       text:"Definição da mensagem, estrutura e objetivo principal da página." },
      { num:"02", title:"COPY COMPLETA",              text:"Textos desenvolvidos para comunicar valor e conduzir o visitante." },
      { num:"03", title:"DESIGN PERSONALIZADO",       text:"Identidade visual criada especificamente para o posicionamento da marca." },
      { num:"04", title:"DESENVOLVIMENTO RESPONSIVO", text:"Página otimizada para computador, tablet e celular." },
      { num:"05", title:"PUBLICAÇÃO E CONFIGURAÇÃO",  text:"Página publicada, domínio conectado e formulários funcionando." },
      { num:"06", title:"MENSURAÇÃO",                 text:"Configuração dos principais eventos para acompanhar visitas e contatos." },
    ],
  },

  cases: {
    label: "ESTUDOS AUTORAIS DE REDESIGN",
    headline: "CONHEÇA ALGUNS CASES RAFAEL RAZEIRA™",
    intro: "Projetos desenvolvidos para demonstrar como marcas reais poderiam melhorar clareza, posicionamento e experiência digital.",
    cta: "QUERO UMA PÁGINA PARA O MEU NEGÓCIO",
    // video: gravação vertical (mp4) → aparece dentro de um mockup de iPhone, em loop.
    // img: imagem estática (assets/case-1.jpg) → usada se não houver vídeo.
    // Deixe os dois "" para exibir o placeholder estilizado.
    // tag: rótulo acima do título (ex.: "ESTUDO DE REDESIGN"). Deixe "" para ocultar.
    items: [
      { video:"assets/case-1.mp4", img:"", tag:"ESTUDO DE REDESIGN", category:"LANDING PAGE · CREATOR ECONOMY",     name:"Uppbeat",  result:"Música e efeitos livres de royalties, aprovados por 4 milhões de criadores — página vibrante, feita para converter visita em cadastro." },
      { video:"assets/case-2.mp4", img:"", tag:"ESTUDO DE REDESIGN", category:"LANDING PAGE · SOFTWARE CRIATIVO",   name:"Affinity", result:"Suíte de design profissional, gratuita para pessoas físicas — página escura de tipografia editorial, à altura de uma marca criativa." },
      { video:"assets/case-3.mp4", img:"", tag:"ESTUDO DE REDESIGN", category:"LANDING PAGE · INFRAESTRUTURA DE IA", name:"Aria",     result:"Inteligência de engenharia em cada camada da rede — visual técnico em preto e vermelho para um produto que enxerga o que o hardware comum não vê." },
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
      "Cada página é mais que design: é a oportunidade de alinhar criatividade, estratégia e resultado — transformando ideias em ferramentas de crescimento para negócios.",
      "Acredito que design de impacto não é apenas bonito, mas estratégico: conecta marcas ao seu público e posiciona negócios como líderes em seus mercados.",
    ],
  },

  values: {
    words: ["POSICIONAMENTO", "CONVERSÃO", "AUTORIDADE", "DIFERENCIAÇÃO"],
    paragraph: "É isso que a sua marca conquista ao criar sua página comigo: <b>uma presença digital que transmite autoridade, gera oportunidades e destaca você no mercado.</b>",
  },

  audience: {
    label: "PARA QUEM É ESTE TRABALHO",
    blocks: [
      { title:"PROFISSIONAIS QUE VALORIZAM REPUTAÇÃO", text:"Para quem sabe que cada detalhe comunica autoridade — e que a credibilidade online precisa refletir o prestígio offline." },
      { title:"MARCAS QUE QUEREM CRESCER",            text:"Para negócios prontos para escalar e que precisam de uma presença digital à altura da ambição." },
      { title:"NEGÓCIOS LANÇANDO OFERTAS",            text:"Para quem vai ao mercado com um produto ou serviço e precisa de uma página feita para converter." },
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

  contact: {
    status: "AGENDA ABERTA",
    headline: "VAMOS ENTENDER SE O PROJETO FAZ SENTIDO.",
    intro: "Conte brevemente sobre o seu negócio. Eu analiso o projeto e retorno pelo WhatsApp em até 24 horas úteis.",
    scarcity: "Trabalho com vagas limitadas por mês e todos os projetos passam por análise.",
    email: "rafael.rbarbon@gmail.com",
    // Bloco de garantia — aparece destacado logo antes do formulário
    guarantee: {
      label: "GARANTIA",
      title: "RISCO ZERO PARA COMEÇAR.",
      text:  "Você inicia o projeto com <b>50% de entrada</b> e quita o saldo somente depois de <b>aprovar a direção visual</b>. Caso a primeira proposta não seja aprovada e nenhuma continuidade seja solicitada, a entrada será <b>devolvida integralmente</b>.",
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
      vende:     { label:"O que você vende?", placeholder:"Ex.: consultoria, estética, mentoria, arquitetura…", err:"Conte o que você vende." },
      objetivo:  { label:"Qual é o principal objetivo da página?", options:["Gerar contatos no WhatsApp","Vender um produto ou serviço","Divulgar um lançamento","Agendar atendimentos","Outro"] },
      identidade:{ label:"Já possui identidade visual?", options:["Sim, completa","Tenho logo e algumas peças","Ainda não tenho"] },
      detalhes:  { label:"Quer contar mais algum detalhe? (opcional)", placeholder:"Prazos, referências, links — o que achar útil." },
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
   O envio é um POST JSON com: nome, whatsapp, instagram, vende,
   objetivo, identidade, detalhes (+ origem).
   ⚠️ Formulário novo (jul/2026): rode a migração no fim de
      supabase/briefings.sql ANTES de publicar, senão o insert falha.
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
