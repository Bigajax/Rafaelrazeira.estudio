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
const CONFIG = {
  brand: {
    name: "RAFAEL RAZEIRA",       // aparece no header e no footer
    suffix: "ESTÚDIO",            // segunda parte do logo (mais leve)
    navCta: "VAMOS CONVERSAR",    // link no topo à direita
  },

  hero: {
    status: "AGENDA ABERTA",                                   // sinal (bolinha pulsante esmeralda)
    tagline: "POSICIONAMENTO · CONVERSÃO · NOVOS NEGÓCIOS",
    headline: ["TENHA", "UMA PÁGINA", "QUE VENDE."],           // 3 linhas da headline gigante
    subheadline: "Landing pages de alto padrão que posicionam sua marca com <b>autoridade</b> e convertem visitantes em <b>clientes</b>.",
    cta: "VAMOS CONVERSAR",
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

  cases: {
    headline: "CONHEÇA ALGUNS CASES RAFAEL RAZEIRA™",
    // video: gravação vertical (mp4) → aparece dentro de um mockup de iPhone, em loop.
    // img: imagem estática (assets/case-1.jpg) → usada se não houver vídeo.
    // Deixe os dois "" para exibir o placeholder estilizado.
    items: [
      { video:"assets/case-1.mp4", img:"", category:"LANDING PAGE · FINTECH", name:"Goldsand",   result:"Lista de espera para conta digital que rende 7% ao ano — página enxuta, feita para converter visita em cadastro." },
      { video:"assets/case-2.mp4", img:"", category:"LANDING PAGE · EDTECH",  name:"Legend.org", result:"Feedback de trabalhos com IA para professores — identidade escura que transmite tecnologia com credibilidade." },
      { video:"assets/case-3.mp4", img:"", category:"LANDING PAGE · SAAS",    name:"Ditto",      result:"Copy de produto com uma só fonte de verdade — página B2B com tipografia forte, à altura de 8.000 equipes." },
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
    headline: "VAMOS CONVERSAR SOBRE O SEU PROJETO.",
    intro: "Conduzo projetos estratégicos para empresas que precisam elevar autoridade, clareza e percepção de valor.",
    scarcity: "Trabalho com vagas limitadas por mês e todos os projetos passam por análise.",
    email: "rafael.rbarbon@gmail.com",
    steps: [
      { num:"01", label:"FORMULÁRIO" },
      { num:"02", label:"AGENDAR CONVERSA" },
    ],
    form: {
      nome:    { label:"Qual seu nome?",   placeholder:"Seu nome" },
      email:   { label:"Seu e-mail",       placeholder:"seu@email.com" },
      whatsapp:{ label:"WhatsApp com DDD",  placeholder:"(12) 12345-6789" },
      empresa: { label:"Nome da empresa",   placeholder:"Escreva aqui" },
      cargo:   { label:"Qual seu cargo?",   options:["Fundador(a) / Sócio(a)","CEO / Diretor(a)","Marketing","Autônomo(a) / Profissional liberal","Outro"] },
      need:    { label:"O que você precisa?", options:["Landing page","Identidade visual","Outro"] },
      inicio:  { label:"Qual expectativa de início?", options:["Imediatamente","Nos próximos 30 dias","Em 1 a 3 meses","Ainda estou planejando"] },
      investimento: { label:"Qual expectativa de investimento?", options:["De R$ 399 a R$ 1.000","De R$ 1.000 a R$ 2.500","De R$ 2.500 a R$ 5.000","Acima de R$ 5.000"] },
      canal:   { label:"Como conheceu o estúdio?", options:["Instagram","Indicação","Google","Outro"] },
      submit:  "ENVIAR E AGENDAR",
      note:    "Resposta em até 24h úteis. Seus dados ficam seguros.",
      successTitle: "BRIEFING RECEBIDO!",
      successText:  "Agora escolha o melhor horário para a nossa conversa — é rápido e sem compromisso.",
    },
    /* Passo 02 — agendamento após o envio.
       url: cole aqui seu Calendly/Cal.com (ex.: "https://calendly.com/rafael/30min").
       Vazio = o botão abre o WhatsApp com mensagem pronta. */
    schedule: { url: "", cta: "AGENDAR PELO WHATSAPP" },
  },

  footer: {
    name: "RAFAEL RAZEIRA ESTÚDIO",
    email: "rafael.rbarbon@gmail.com",
    instagram: { handle:"@rafaelrazeira", url:"https://instagram.com/rafaelrazeira" },
    whatsapp: { display:"(44) 99999-7219", url:"https://wa.me/5544999997219" },
    location: "ESTAMOS NO BRASIL",   // ⬅ troque pela sua cidade (ex.: "ESTAMOS EM CAMPINAS, SP")
    legal: [
      { label:"TERMOS DE USO",            url:"#" },   // ⬅ aponte para as páginas quando existirem
      { label:"POLÍTICA DE PRIVACIDADE",  url:"#" },
    ],
  },

  pillText: "VAMOS CONVERSAR",
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
   O envio é um POST JSON com: nome, email, whatsapp, empresa, cargo, necessidade.
   ============================================================ */
const FORM_ENDPOINT = ""; // ⬅ cole sua URL aqui (deixe "" para modo demo)
const FORM_HEADERS  = { "Content-Type": "application/json" };

/* ⚠️ Não precisa mexer daqui para baixo — apenas disponibiliza o conteúdo p/ a página. */
export { CONFIG, FORM_ENDPOINT, FORM_HEADERS };
