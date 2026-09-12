/* ============================================================
   O TEXTO DA /en/vitrine-digital

   Mesmas chaves do pt (o tipo garante). O que muda de conteúdo, além da
   língua: o contato é por E-MAIL (não há WhatsApp nem Stripe na versão em
   inglês desta primeira fase), o telefone é opcional e internacional, os
   preços vêm de OFERTA.en (PLACEHOLDER A CONFIRMAR) e não existe a porta
   do Pix: a segunda porta do balcão diz como se paga (por e-mail, depois
   da prévia). O produto se chama "digital storefront"; o pedido continua
   chegando "no WhatsApp da loja" porque é como a vitrine funciona para a
   cliente dela, não para o contato comigo.

   Os três "No." da FAQ são os mesmos três do pt: a manchete conta.
   ============================================================ */
import { OFERTA } from "@/lib/oferta";
import type { VitrineMessages } from "./vitrine.pt";

const o = OFERTA.en;
const v = o.vitrine;
const R = o.preco;                           // US$199

export const en: VitrineMessages = {
  lang: "en",
  meta: {
    title: "Digital Storefront for shops",
    description: `I design your storefront before you pay. Catalog with photo, price and size, orders arriving ready on WhatsApp, full project for ${R(v.total)}.`,
  },
  marca: { nome: "RAFAEL RAZEIRA", sufixo: "STUDIO" },
  header: { status: "SAME-DAY REPLY", cta: "SEE MY STORE ↓" },

  hero: {
    eyebrow: "FOR INSTAGRAM AND WHATSAPP SHOPS",
    h1: <>YOUR STORE, READY BEFORE <em>YOU PAY.</em></>,
    lead: <><b>Photo, price and size</b> of every item in one link. The customer picks, and the order lands on WhatsApp already assembled, without you answering one by one.</>,
    faixa: "Ready in 7 business days · No monthly fee · You update it yourself ·",
    phoneAria: "The complete Sölo Urb store scrolling top to bottom inside a phone: catalog, product pages and WhatsApp ordering",
    liveTag: "LIVE: SÖLO URB · SEE STORES ALREADY USING IT ↓",
    pedido: {
      k: "ORDER ON YOUR WHATSAPP",
      texto: <>Hi, Sölo! I want the <b>New Balance 9060</b>, size <b>41</b>. Can you hold it?</>,
      hora: "14:07 ✓✓",
    },
  },

  form: {
    enviando: "SENDING…",
    enviar: "I WANT TO SEE MY STORE",
    okTitulo: "GOT YOUR DETAILS",
    okSub: "I'll email you today.",
    okCta: "PREFER EMAIL? WRITE ME NOW ↗",
    /* no en o "falta um toque" é a gravação que falhou: sem WhatsApp para
       abrir, a saída é escrever direto */
    pendenteTitulo: "One more step.",
    pendenteTexto: <>I couldn't save your request just now. Email me directly and I'll <b>start your preview</b> from there.</>,
    pendenteCta: "EMAIL ME ↗",
    nome: "NAME",
    whatsapp: "WHATSAPP",
    whatsappPh: "+1 555 123 4567",
    email: "EMAIL",
    emailPh: "you@yourstore.com",
    telefone: "PHONE (OPTIONAL)",
    telefonePh: "+1 555 123 4567",
    errTel: "Check the number: digits only, with the country code. E.g. +1 555 123 4567.",
    errEmail: "Check the email: that's where your preview goes.",
    errInsta1: "I couldn't find ",
    errInsta2: " on Instagram. Check your store's handle: it needs to be the business account, that's where I take the photos from.",
    errInstaTel: "That's a phone number. Here I need your store's Instagram handle, the name right under the profile photo.",
    errInstaEmail: "That's an email. Here I need your store's Instagram handle, the name right under the profile photo.",
    errInstaPessoal1: "Meta doesn't recognize ",
    errInstaPessoal2: " as a professional account, and the preview is built from the profile photos. Switching takes a minute: on Instagram, Settings, Account type and tools, Switch to professional account. Then send the handle again.",
    errInstaOnde: "Where to find it: open your store's Instagram; the handle is right under the profile photo.",
    ajudaCta: "Can't find it? Email me and I'll help ↗",
    ajudaMsg: "I tried to send my store's Instagram handle through the site and it didn't work. Can you help?",
    lojaAchada1: "I found ",
    lojaAchada2: " on Instagram, with {n} followers. Is that your store? If not, let me know.",
  },

  etiqueta: {
    /* "BOOKS OPEN" é como se diz "agenda aberta" no mundo da cliente; o
       rodapé do selo tem lugar para uma palavra a 7.2px, e "BRAZIL ·
       WORLDWIDE" saía do círculo */
    selo: { aria: "Stamp: books open", arco: "RAFAEL RAZEIRA STUDIO", l1: "BOOKS", l2: "OPEN", rodape: "WORLDWIDE" },
    lead: <>I design.<br />You decide.</>,
    sub: "Send me your @ and I'll show you your store, ready, in 24h.",
    aparte: "Free, no strings attached.",
    instaAria: "Your store on Instagram",
    instaPh: "yourstore",
    micro: <><b>The preview is on me.</b> Like it: <b>{R(v.total)}</b> in total, starting with <b>{R(v.entrada)}</b>. Don't like it, just say so.</>,
    stub: { projetos: "PROJECTS LIVE", prazo: "7", prazoRotulo: "BUSINESS DAYS", mensal: `${o.simbolo}0`, mensalRotulo: "MONTHLY FEE" },
  },

  quem: {
    alt: "Rafael Razeira in sports sunglasses, in black and white, with snowy mountains behind",
    legenda: "MARINGÁ · BRAZIL · EST. 2026",
    eyebrow: "WHO MAKES IT",
    h2: <>From the first hello<br />to the store live:<br /><em>it's me.</em></>,
    p1: "Rafael Razeira. I design, build and publish every storefront, and I'm the one you email. No support queue, no account manager, no phone nobody answers.",
    p2: "Sölo Urb, scrolling on the phone up there, and the two client stores right below? They came off this desk, along with the other {n} projects in the portfolio.",
    fatos: { cidade: "BRAZIL · WORKING WORLDWIDE", projetos: "{n} PROJECTS LIVE", resposta: "SAME-DAY REPLY" },
    cta: "I WANT TO SEE MY STORE ↑",
  },

  marca_faixa: <>rafaelrazeira<em>.</em>estudio</>,

  dor: {
    perguntas: [
      ["hi! how much is the shirt from the story?", "19:02"],
      ["do you have it in another style?", "19:03"],
      ["what sizes do you have?", "19:05"],
      ["can you send the photos again? couldn't find them in the feed", "19:07"],
    ],
    eyebrow: "WHY THIS HAPPENS",
    h2: <>Every customer<br />starts<br /><em>from zero.</em></>,
    lead: { antes: "Your products are scattered across ", lugares: ["stories", "highlights", "old posts"], sep: ", ", e: " and ", depois: ". Then the customer asks for photo, price and size, one by one, and often gives up before even messaging." },
    conta: "questions before picking one item, and the whole thing starts over with the next customer",
    tira: { label: "TODAY · THE CUSTOMER WAITING IN YOUR DMs", nota: "Seen only at 21:40, and the urge to buy doesn't wait two hours." },
    manifesto: [<>INSTAGRAM SHOWS.</>, <>THE STOREFRONT <em>ANSWERS.</em></>, <>YOU JUST CLOSE.</>],
  },

  como: {
    eyebrow: "HOW IT WORKS",
    h2: <>From Instagram to the order in four steps.<br /><em>None of them is yours.</em></>,
    passos: [
      ["The customer opens your link in bio", "One fixed address, always up to date, in the most seen spot of your profile."],
      ["Browses the categories", "Products grouped the way your store sells."],
      ["Sees photo, price and size", "The same questions that land in your DMs today, answered before they type."],
      ["Messages the store on WhatsApp", "The message arrives with the product already chosen."],
    ],
    chegada: "you come in here",
    cta: "I WANT MY PREVIEW ↓",
    alt: "The vérít.lab catalog: six pieces in a grid, each with name, dimensions, price and a one-of-a-kind badge",
    tira: { label: "WITH THE STOREFRONT · THE ORDER ARRIVES READY", nota: "Same night, not a single photo sent in the DMs: the customer chose alone." },
    balao1: "picked it on the storefront: the Mickey Map, 95 × 65. still available?",
    intervalo: "1 minute later",
    balao2: "yes! it's one of a kind, I've set it aside for you. sending the payment link",
  },

  projetos: {
    eyebrow: "PROJECTS LIVE",
    h2: <>Don't take my word for it.<br /><em>Open both.</em></>,
    lead: "Xavier's Sports sells sports jerseys. PR Grife is a multi-brand store with a physical shop in Maringá, Brazil. Both are live, with real products and prices, and open on your phone right now.",
    live: "LIVE",
    tipo: "CLIENT STORE",
    abrir: "Open the {nome} project website in a new tab",
    alt: "Full page of the {nome} storefront",
    itens: [
      {
        tag: "SPORTS JERSEYS",
        copy: "Storefront live, browsable now. Open it on your phone and walk the path the customer walks.",
        fatos: ["Catalog by clubs and national teams", "A page for every product", "In-stock control", "Orders straight to WhatsApp"],
        cta: "OPEN XAVIER'S STOREFRONT ↗",
      },
      {
        tag: "PREMIUM MULTI-BRAND",
        copy: "A store with a physical shop in Maringá. I delivered the storefront and the panel: the owner publishes items and adjusts stock alone.",
        fatos: ["Catalog by brand and category", "A page for every product", "Stock panel for the owner", "Orders with the payment method chosen"],
        cta: "OPEN PR GRIFE'S STOREFRONT ↗",
      },
    ],
    portfolio: "SEE ALL {n} PROJECTS IN THE PORTFOLIO ↗",
    portfolioHref: "/en/portfolio",
  },

  inclui: {
    eyebrow: `WHAT THE ${R(v.total)} INCLUDES`,
    h2: <>You send the material.<br /><em>The rest is on me.</em></>,
    cards: [
      ["Custom design", "A look aligned with your store's identity, not a ready-made template."],
      ["Catalog and products", "Home page, categories and up to 20 products registered by me."],
      ["WhatsApp built in", "The order arrives with the product already identified."],
      ["Full publishing", "Storefront live, address set up and one round of revisions."],
    ],
    listaTitulo: "See the full list, item by item",
    lista: [
      ["Up to 20 products", "I register all of them at launch. Beyond that, we agree separately."],
      ["Domain and address", "I put the storefront live. Your own domain is optional, yearly, and paid directly to the registrar."],
      ["Product pages", "Photos, description, price, sizes and variations on one page."],
      ["One round of revisions", "You review and point out the fixes before the page goes live."],
      ["Delivery in up to 7 business days", "Counted from the day all the store's material arrives."],
      ["Management panel", "In your store's identity: products, prices, photos, stock and availability."],
      ["Updates whenever you need", "You ask for specific changes later and I quote on the spot. Nothing is mandatory."],
    ],
    enviarTitulo: "What do I need to send?",
    enviar: ["Logo", "Photos", "Products", "Prices", "Categories", "Store details"],
  },

  painel: {
    eyebrow: "THE STORE PANEL",
    h2: <>Once published,<br /><em>the storefront is yours.</em></>,
    lead: "Along with the storefront, you get a management panel in your store's identity. Updating doesn't depend on a developer, or on me.",
    provas: [
      "Change price, photo and description on the spot",
      "Mark sold out, last units or in stock",
      "Add a new product and it's on the storefront the same minute",
    ],
    claim: <><b>No monthly fee:</b> the panel is part of the delivery.</>,
    chip: "● STORE PANEL",
    alt: "Products and stock screen of the Xavier's Sports panel: each jersey with photo, price, stock per size and in-stock status",
    legenda: "Xavier's Sports' real panel. Every store gets its own, in its own identity.",
  },

  oferta: {
    eyebrow: "OFFER AND HIRING",
    h2: <>Complete digital storefront for <em>{R(v.total)}.</em></>,
    lead: `It's the same storefront as the two stores you just opened, panel included. You start with ${R(v.entrada)}, follow the build and only pay the balance after approving.`,
    prova: { rotulo: "LIVE PROOF", texto: "PR Grife, a multi-brand store with a physical shop in Maringá, publishes items and adjusts stock alone in the panel. ", link: "See their store above." },
    produto: "DIGITAL STOREFRONT",
    semMensal: "NO MONTHLY FEE",
    preco: { moeda: o.simbolo, inteiro: String(v.entrada), centavos: ".00", rotulo: <>TO<br />START</> },
    total: { valor: `${R(v.total)}.00`, sufixo: " in total" },
    /* sem Pix: a primeira porta é o saldo, a segunda diz como se paga */
    parcelado: { rotulo: "THE BALANCE", antes: " ", valor: `${R(v.saldo)}.00`, depois: " after approval", nota: "the balance only after you approve the store" },
    avista: { rotulo: "HOW YOU PAY ", selo: "NO CARD HERE", valor: "By email", depois: ", after the preview", nota: "I send the payment details once you approve the design" },
    itens: ["Custom design", "Home page and catalog", "Product pages", "WhatsApp built in", "Up to 20 products registered", "Store management panel", "Publishing and address set up", "One round of revisions", "Delivery in up to 7 business days"],
    cta: "I WANT TO SEE MY STORE ↓",
    garantia: `The ${R(v.saldo)} balance is paid only after you see and approve the project.`,
    tira: { label: "YOUR NEXT MESSAGE", balao: "Rafael, I want a storefront like that for my store", hora: "19:15" },
    okTexto: "I'll look at your store before writing back, so the conversation already starts with a direction.",
    formTitulo: "START WITH THE PREVIEW",
    formSub: `The design is free. The ${R(v.entrada)} deposit only exists if you like it.`,
    insta: "STORE INSTAGRAM OR WEBSITE",
    instaPh: "@yourstore",
    avistaCheck: null,
    micro: "When you send, I get your request and email you back. No card details at this stage.",
    plano: { parcelado: `Deposit of ${R(v.entrada)} + ${R(v.saldo)} after approval`, avista: "" },
  },

  processo: {
    eyebrow: "FROM YES TO THE STORE LIVE",
    h2: <>You see the store ready<br /><em>before paying anything.</em></>,
    passos: [
      ["Preview", "You send me your @. I design your storefront and show it to you ready, at no cost."],
      ["Deposit", `Like it? Then: ${R(v.entrada)} and the store's material.`],
      ["Build", "I design, develop and assemble the whole catalog."],
      ["Approval and launch", "You review, ask for the round of revisions and, after the balance, the storefront goes live."],
    ],
    selo: "✓ PAYMENT AGREED BY EMAIL, NO CARD ON THIS PAGE",
    termos: "SEE SCOPE AND TERMS",
    termosHref: "/termos",
  },

  faq: {
    eyebrow: "BEFORE YOU HIRE",
    manchete: { umL1: "One of these answers", umL2: "starts with", variosL1: "{n} of these answers", variosL2: "start with", fim: "no." },
    numeros: ["none", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"],
    etiqueta: "no",
    itens: [
      { p: "Does the storefront take payments from my customers?", r: "No. The storefront organizes the catalog and delivers the order ready to the store's WhatsApp, where you settle payment and delivery.", nao: true },
      { p: "How many products are included?", r: "The storefront has no product limit. I register the first 20 for you, with photo, price and sizes; the rest you add yourself in the panel, in minutes, without calling me.", nao: false },
      { p: "Is there a monthly fee?", r: `No. The project costs ${R(v.total)} once. Your own domain is optional and has a yearly cost paid directly to the registrar.`, nao: true },
      { p: "Who updates the storefront afterwards?", r: "You do, through the panel that comes with the storefront: change price and photo, mark sold out or in stock, and add new products.", nao: false },
      { p: "How long does it take?", r: "Up to 7 business days after all the store's material arrives.", nao: false },
      { p: `Why ${R(v.total)} and not ${R(1000)}?`, r: "Because there's no agency in the middle. You talk to me from the first hello to the store live, with no support desk, no project manager and no markup. The process is the same in every project, so what's left of the cost is my time.", nao: false },
      { p: "Do I have to pay everything up front?", r: `No. It's ${R(v.entrada)} to start and ${R(v.saldo)} only after the presentation and your approval. We settle the payment by email, and there's no card on this page.`, nao: true },
    ],
  },

  fim: {
    eyebrow: "OPEN FOR NEW PROJECTS",
    h2: <>Your store already has products.<br />Now it needs a structure to<br /><em>sell better.</em></>,
    lead: `Leave your @ and I'll design your storefront and show it to you ready, for free. If you've already decided, it starts with ${R(v.entrada)}.`,
    cta: "I WANT TO SEE MY STORE ↑",
    ghost: "SEE WHAT'S INCLUDED",
  },

  rodape: {
    links: [
      { label: "PORTFOLIO", href: "/en/portfolio" },
      { label: "LANDING PAGES", href: "/en/landing-page" },
      { label: "TERMS", href: "/termos" },
      { label: "PRIVACY", href: "/privacidade" },
    ],
    copyright: "© 2026 RAFAEL RAZEIRA STUDIO",
  },

  barra: { destaque: "FREE", sub: "Your storefront, designed", cta: "I WANT TO SEE MY STORE" },

  contato: { abertura: "Digital storefront preview for my store", nome: "Name", loja: "Store", plano: "Plan", ref: "Ref" },
};
