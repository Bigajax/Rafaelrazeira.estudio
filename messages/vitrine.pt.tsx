/* ============================================================
   O TEXTO DA /vitrine-digital, em português

   Extraído de components/vitrine/sections.tsx em 11/09/2026 para a
   /en/vitrine-digital renderizar os MESMOS componentes com outro
   dicionário. Cada string foi copiada palavra por palavra do que estava
   inline, e a prova é a captura da página pt igual antes e depois.
   As notas de decisão de cada frase ficaram nos componentes, ao lado de
   onde a frase é usada; aqui só mora o texto.

   Regra dos dicionários (components/i18n.tsx): strings, números, arrays
   e JSX. Nenhuma função: o objeto atravessa a fronteira servidor ->
   cliente. Onde um número entra no meio da frase, a string leva {n} e o
   componente troca com `preencher()`; onde o número entra em JSX, o
   componente monta a partir das partes.

   Os preços vêm de lib/oferta.ts, que é a única fonte deles nos dois
   idiomas. O tipo nasce daqui (`typeof pt`) e o inglês é obrigado a ter
   as mesmas chaves.
   ============================================================ */
import type { Lang } from "@/lib/idiomas";
import { OFERTA } from "@/lib/oferta";

const o = OFERTA.pt;
const v = o.vitrine;
const R = o.preco;                           // R$999
const centavos = (n: number) => `${R(n)},00`; // R$999,00

export const pt = {
  lang: "pt" as Lang,
  meta: {
    title: "Vitrine Digital para lojas",
    description: "Eu desenho a sua vitrine antes de você pagar. Catálogo com foto, preço e tamanho, pedido pronto no WhatsApp, projeto completo por R$999.",
  },
  marca: { nome: "RAFAEL RAZEIRA", sufixo: "ESTÚDIO" },
  header: { status: "RESPOSTA NO MESMO DIA", cta: "VER A MINHA LOJA ↓" },

  hero: {
    eyebrow: "PARA LOJAS DO INSTAGRAM E WHATSAPP",
    h1: <>SUA LOJA PRONTA ANTES DE <em>VOCÊ PAGAR.</em></>,
    lead: <><b>Foto, preço e tamanho</b> de cada peça num link só. O cliente escolhe e o pedido chega montado no WhatsApp, sem você responder um por um.</>,
    faixa: "Pronta em 7 dias úteis · Sem mensalidade · Você mesmo atualiza ·",
    phoneAria: "A loja completa da Sölo Urb rolando do topo ao rodapé dentro de um celular: catálogo, páginas de produto e pedido pelo WhatsApp",
    liveTag: "NO AR: SÖLO URB · VER LOJAS QUE JÁ USAM ↓",
    pedido: {
      k: "PEDIDO NO SEU WHATSAPP",
      texto: <>Oi, Sölo! Quero o <b>New Balance 9060</b>, tam <b>41</b>. Pode separar?</>,
      hora: "14:07 ✓✓",
    },
  },

  /* a etiqueta do hero e o formulário da oferta dividem estas frases */
  form: {
    enviando: "ENVIANDO…",
    enviar: "QUERO VER A MINHA LOJA",
    /* a confirmação, quando o lead está gravado */
    okTitulo: "RECEBI SEUS DADOS",
    okSub: "Te chamo no WhatsApp ainda hoje.",
    okCta: "QUER AGILIZAR? ME CHAMA AGORA ↗",
    /* o "Falta um toque": a gravação falhou e o WhatsApp abriu no lugar */
    pendenteTitulo: "Falta um toque.",
    pendenteTexto: <>Abri o WhatsApp com sua mensagem pronta. Toque em <b>enviar</b> lá para eu receber, senão ela não chega.</>,
    pendenteCta: "ABRIR O WHATSAPP ↗",
    /* os campos */
    nome: "NOME",
    whatsapp: "WHATSAPP",
    whatsappPh: "(44) 99999-0000",
    email: "E-MAIL",
    emailPh: "voce@sualoja.com.br",
    telefone: "TELEFONE (OPCIONAL)",
    telefonePh: "+55 44 99999-0000",
    errTel: "Confere o número: é por ele que eu te chamo. Ex.: (44) 99999-0000.",
    errEmail: "Confere o e-mail: é por ele que eu te respondo.",
    /* o @ que a rota não achou na Meta; {arroba} é o que a pessoa digitou */
    errInsta1: "Não achei ",
    errInsta2: " no Instagram. Confere o @ da loja: precisa ser a conta profissional, é dela que eu tiro as fotos.",
  },

  etiqueta: {
    selo: { aria: "Carimbo: agenda aberta", arco: "RAFAEL RAZEIRA ESTÚDIO", l1: "AGENDA", l2: "ABERTA", rodape: "MARINGÁ · PR" },
    lead: <>Eu desenho.<br />Você decide.</>,
    sub: "Manda o seu @ e eu te mostro a sua loja pronta em 24h.",
    aparte: "De graça, sem compromisso.",
    instaAria: "Sua loja no Instagram",
    instaPh: "sualoja",
    micro: <><b>A prévia é por minha conta.</b> Se gostar: <b>{R(v.total)}</b> no total, começando com <b>{R(v.entrada)}</b>. Se não gostar, me diz sem dó.</>,
    /* o canhoto: {n} é o placar de projetos no ar */
    stub: { projetos: "PROJETOS NO AR", prazo: "7", prazoRotulo: "DIAS ÚTEIS", mensal: `${o.simbolo}0`, mensalRotulo: "DE MENSALIDADE" },
  },

  quem: {
    alt: "Rafael Razeira de óculos escuros esportivos, em preto e branco, com montanhas nevadas ao fundo",
    legenda: "MARINGÁ · PR · EST. 2026",
    eyebrow: "QUEM FAZ",
    h2: <>Do primeiro oi<br />até a loja no ar:<br /><em>sou eu.</em></>,
    p1: "Rafael Razeira. Desenho, desenvolvo e publico cada vitrine, e é comigo que você fala no WhatsApp. Sem fila de atendimento, sem gerente de conta, sem telefone que ninguém atende.",
    /* {n} é o resto do portfólio (os projetos no ar menos os três nomeados) */
    p2: "A Sölo Urb, que rola no celular aí em cima, e as duas lojas de clientes logo abaixo? Saíram desta mesa, junto com os outros {n} projetos do portfólio.",
    fatos: { cidade: "MARINGÁ · PR", projetos: "{n} PROJETOS NO AR", resposta: "RESPOSTA NO MESMO DIA" },
    cta: "QUERO VER A MINHA LOJA ↑",
  },

  marca_faixa: <>rafaelrazeira<em>.</em>estudio</>,

  dor: {
    perguntas: [
      ["oi! quanto custa a camisa do story?", "19:02"],
      ["tem em outro modelo?", "19:03"],
      ["quais tamanhos vocês têm?", "19:05"],
      ["consegue mandar as fotos de novo? não achei no feed", "19:07"],
    ] as [string, string][],
    eyebrow: "POR QUE ISSO ACONTECE",
    h2: <>Cada cliente<br />começa<br /><em>do zero.</em></>,
    /* os três lugares "espalhados" ganham a classe no componente */
    lead: { antes: "Seus produtos ficam espalhados entre ", lugares: ["stories", "destaques", "publicações antigas"], sep: ", ", e: " e ", depois: ". Aí o cliente pergunta foto, preço e tamanho, um por um, e muitas vezes desiste antes mesmo de chamar." },
    conta: "perguntas antes de escolher uma peça, e o atendimento recomeça no cliente seguinte",
    tira: { label: "HOJE · O CLIENTE ESPERANDO NO DIRECT", nota: "Visualizado só às 21:40, e a vontade de comprar não espera duas horas." },
    manifesto: [<>O INSTAGRAM APRESENTA.</>, <>A VITRINE <em>RESPONDE.</em></>, <>VOCÊ SÓ FECHA.</>],
  },

  como: {
    eyebrow: "COMO FUNCIONA",
    h2: <>Do Instagram ao pedido em quatro passos.<br /><em>Nenhum deles é seu.</em></>,
    passos: [
      ["O cliente acessa o link da bio", "Um endereço fixo, sempre atualizado, no lugar mais visto do seu perfil."],
      ["Navega pelas categorias", "Produtos agrupados do jeito que a sua loja vende."],
      ["Vê foto, preço e tamanho", "As mesmas perguntas que hoje chegam no seu direct, respondidas antes de ele digitar."],
      ["Chama a loja pelo WhatsApp", "A mensagem já chega com o produto escolhido."],
    ] as [string, string][],
    chegada: "você entra aqui",
    cta: "QUERO MINHA PRÉVIA ↓",
    alt: "Catálogo da vérít.lab: seis peças em grade, cada uma com nome, medida, preço e selo de peça única",
    tira: { label: "COM A VITRINE · O PEDIDO CHEGA PRONTO", nota: "A mesma noite, sem uma foto sequer no direct: o cliente escolheu sozinho." },
    balao1: "escolhi pela vitrine: o Mickey Mapa, 95 × 65. ainda tem?",
    intervalo: "1 minuto depois",
    balao2: "tem sim! é peça única, separei a sua. te mando o Pix",
  },

  projetos: {
    eyebrow: "PROJETOS NO AR",
    h2: <>Não acredite em mim.<br /><em>Abra as duas.</em></>,
    lead: "A Xavier's Sports vende camisas esportivas. A PR Grife é multimarcas e tem loja física em Maringá. As duas estão no ar, com produto e preço reais, e abrem no seu celular agora.",
    live: "NO AR",
    tipo: "LOJA DE CLIENTE",
    abrir: "Abrir o site do projeto {nome} em nova aba",
    alt: "Página completa da vitrine da {nome}",
    itens: [
      {
        tag: "CAMISAS ESPORTIVAS",
        copy: "Vitrine no ar, navegável agora. Abra pelo celular e faça o caminho que o cliente faz.",
        fatos: ["Catálogo por clubes e seleções", "Página para cada produto", "Controle de pronta entrega", "Pedido direto no WhatsApp"],
        cta: "ABRIR A VITRINE DA XAVIER'S ↗",
      },
      {
        tag: "MULTIMARCAS DE ALTO PADRÃO",
        copy: "Loja com ponto físico em Maringá. Entreguei a vitrine e o painel: o dono publica peça e ajusta o estoque sozinho.",
        fatos: ["Catálogo por marca e categoria", "Página para cada produto", "Painel de estoque para o dono", "Pedido com forma de pagamento escolhida"],
        cta: "ABRIR A VITRINE DA PR GRIFE ↗",
      },
    ],
    portfolio: "VER OS {n} PROJETOS NO PORTFÓLIO ↗",
    portfolioHref: "/portfolio",
  },

  inclui: {
    eyebrow: `O QUE ENTRA NOS ${R(v.total)}`,
    h2: <>Você manda o material.<br /><em>O resto é comigo.</em></>,
    cards: [
      ["Design personalizado", "Visual alinhado à identidade da sua loja, não um modelo pronto."],
      ["Catálogo e produtos", "Página inicial, categorias e até 20 produtos cadastrados por mim."],
      ["WhatsApp integrado", "O pedido chega com o produto já identificado."],
      ["Publicação completa", "Vitrine no ar, endereço configurado e uma rodada de ajustes."],
    ] as [string, string][],
    listaTitulo: "Ver a lista completa, item por item",
    lista: [
      ["Até 20 produtos", "Eu cadastro todos no lançamento. Acima disso, combinamos à parte."],
      ["Domínio e endereço", "Coloco a vitrine no ar. O domínio próprio é opcional, anual e pago direto no registrador."],
      ["Páginas de produto", "Fotos, descrição, preço, tamanhos e variações em uma página só."],
      ["Uma rodada de ajustes", "Você revisa e aponta as correções antes de a página entrar no ar."],
      ["Entrega em até 7 dias úteis", "Contados a partir do envio de todos os materiais da loja."],
      ["Painel de gestão", "Na identidade da sua loja: produtos, preços, fotos, estoque e disponibilidade."],
      ["Atualizações quando precisar", "Você pede alterações pontuais depois e eu orço na hora. Nada é obrigatório."],
    ] as [string, string][],
    enviarTitulo: "O que preciso enviar?",
    enviar: ["Logo", "Fotos", "Produtos", "Preços", "Categorias", "Informações da loja"],
  },

  painel: {
    eyebrow: "O PAINEL DA LOJA",
    h2: <>Depois de publicada,<br /><em>a vitrine é sua.</em></>,
    lead: "Junto com a vitrine, você recebe um painel de gestão na identidade da sua loja. Atualizar não depende de programador, nem de mim.",
    provas: [
      "Troca preço, foto e descrição na hora",
      "Marca esgotado, últimas unidades ou pronta entrega",
      "Cadastra produto novo e ele entra na vitrine na mesma hora",
    ],
    claim: <><b>Sem mensalidade:</b> o painel faz parte da entrega.</>,
    chip: "● PAINEL DA LOJA",
    alt: "Tela de produtos e estoque do painel da Xavier's Sports: cada camisa com foto, preço, estoque por tamanho e status de pronta entrega",
    legenda: "Painel real da Xavier's Sports. Cada loja recebe o seu, na própria identidade.",
  },

  oferta: {
    eyebrow: "OFERTA E CONTRATAÇÃO",
    h2: <>Vitrine digital completa por <em>{R(v.total)}.</em></>,
    lead: `É a mesma vitrine das duas lojas que você abriu aí em cima, com o painel junto. Você começa com ${R(v.entrada)}, acompanha o desenvolvimento e só paga o saldo depois de aprovar.`,
    prova: { rotulo: "PROVA NO AR", texto: "A PR Grife, multimarcas com loja física em Maringá, publica peça e ajusta o estoque sozinha no painel. ", link: "Veja a loja dela acima." },
    produto: "VITRINE DIGITAL",
    semMensal: "SEM MENSALIDADE",
    /* o número grande é a ENTRADA; o total vem na linha seguinte */
    preco: { moeda: o.simbolo, inteiro: String(v.entrada), centavos: ",00", rotulo: <>PARA<br />COMEÇAR</> },
    total: { valor: centavos(v.total), sufixo: " no total" },
    /* as duas portas do balcão; a segunda (à vista) é null quando não há Pix */
    parcelado: { rotulo: "PARCELADO", antes: " 4 parcelas de ", valor: centavos(v.saldo / 4), depois: "", nota: "o saldo só depois de você aprovar" },
    avista: v.avista ? { rotulo: "À VISTA NO PIX ", selo: "10% OFF", valor: centavos(v.avista), depois: " de uma vez", nota: `economiza ${R(v.total - v.avista)} e é a forma que eu prefiro receber` } : null,
    itens: ["Design personalizado", "Página inicial e catálogo", "Páginas de produto", "WhatsApp integrado", "Até 20 produtos cadastrados", "Painel de gestão da loja", "Publicação e endereço configurado", "Uma rodada de ajustes", "Entrega em até 7 dias úteis"],
    cta: "QUERO VER A MINHA LOJA ↓",
    garantia: `O saldo de ${R(v.saldo)} é pago somente depois que você visualizar e aprovar o projeto.`,
    tira: { label: "SUA PRÓXIMA MENSAGEM", balao: "Rafael, quero uma vitrine dessas pra minha loja", hora: "19:15" },
    okTexto: "Vou olhar sua loja antes de falar com você, para a conversa já começar com uma direção.",
    formTitulo: "COMEÇAR PELA PRÉVIA",
    formSub: `O desenho é sem custo. A entrada de ${R(v.entrada)} só existe se você gostar.`,
    insta: "INSTAGRAM OU SITE DA LOJA",
    instaPh: "@sualoja",
    /* a caixa do Pix; null quando não há Pix */
    avistaCheck: v.avista ? `Prefiro pagar à vista no Pix por ${R(v.avista)} (10% de desconto)` : null,
    micro: "Ao enviar, recebo seu pedido e te chamo no WhatsApp. Não peço dados de cartão nesta etapa.",
    /* o que vai para a coluna `plano` do banco e para a mensagem */
    plano: { parcelado: `Entrada de ${R(v.entrada)} + ${R(v.saldo)} em até 4x`, avista: v.avista ? `À vista no Pix ${R(v.avista)}` : "" },
  },

  processo: {
    eyebrow: "DO SIM À LOJA NO AR",
    h2: <>Você vê a loja pronta<br /><em>antes de pagar nada.</em></>,
    passos: [
      ["Prévia", "Você me manda o seu @. Eu desenho a sua vitrine e te mostro pronta, sem custo nenhum."],
      ["Reserva", `Gostou? Aí sim: ${R(v.entrada)} e o material da loja.`],
      ["Criação", "Eu desenho, desenvolvo e monto o catálogo inteiro."],
      ["Aprovação e publicação", "Você revisa, pede a rodada de ajustes e, depois do saldo, a vitrine entra no ar."],
    ] as [string, string][],
    selo: "✓ PAGAMENTO PROCESSADO EM AMBIENTE SEGURO",
    termos: "VER ESCOPO E TERMOS",
    termosHref: "/termos",
  },

  faq: {
    eyebrow: "ANTES DE CONTRATAR",
    /* a manchete conta os "não" da lista; {n} é o número por extenso */
    manchete: { umL1: "Uma desta resposta", umL2: "começa com", variosL1: "{n} destas respostas", variosL2: "começam com", fim: "não." },
    numeros: ["nenhuma", "Uma", "Duas", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito"],
    etiqueta: "não",
    /* `nao` marca as respostas que começam com "não": é o que a manchete conta */
    itens: [
      { p: "A vitrine recebe pagamentos dos meus clientes?", r: "Não. A vitrine organiza o catálogo e leva o pedido pronto para o WhatsApp da loja, onde você combina pagamento e entrega.", nao: true },
      { p: "Quantos produtos estão incluídos?", r: "A vitrine não tem limite de produtos. Os 20 primeiros eu cadastro para você, com foto, preço e tamanhos; os outros você mesmo cadastra no painel, em minutos e sem me chamar.", nao: false },
      { p: "Existe mensalidade?", r: `Não. O projeto custa ${R(v.total)} uma única vez. Um domínio próprio é opcional e tem custo anual pago direto no registrador.`, nao: true },
      { p: "Quem atualiza a vitrine depois?", r: "Você mesmo, pelo painel que acompanha a vitrine: troca preço e foto, marca esgotado ou pronta entrega e cadastra produtos novos.", nao: false },
      { p: "Quanto tempo demora?", r: "Até 7 dias úteis depois do envio de todos os materiais da loja.", nao: false },
      { p: `Por que ${R(v.total)} e não R$5 mil?`, r: "Porque não tem agência no meio. Você fala comigo do primeiro oi até a loja no ar, sem atendimento, sem gerente de projeto e sem repasse. O processo é o mesmo em todos os projetos, então o que sobra de custo é o meu tempo.", nao: false },
      { p: "Preciso pagar tudo antes?", r: `Não. São ${R(v.entrada)} para começar e ${R(v.saldo)} somente depois da apresentação e da sua aprovação, em até 4x no cartão. Quem prefere pagar à vista no Pix fecha por ${R(v.avista ?? v.total)}.`, nao: true },
    ],
  },

  fim: {
    eyebrow: "AGENDA ABERTA",
    h2: <>Sua loja já tem produtos.<br />Agora precisa de uma estrutura para<br /><em>vender melhor.</em></>,
    lead: `Deixa o seu @ que eu desenho a sua vitrine e te mostro pronta, de graça. Se você já decidiu, começa com ${R(v.entrada)}.`,
    cta: "QUERO VER A MINHA LOJA ↑",
    ghost: "VER O QUE ESTÁ INCLUSO",
  },

  rodape: {
    links: [
      { label: "INÍCIO", href: "/estudio/" },
      { label: "PORTFÓLIO", href: "/portfolio" },
      { label: "SERVIÇOS", href: "/servicos" },
      { label: "E-COMMERCE", href: "/e-commerce" },
      { label: "TERMOS", href: "/termos" },
      { label: "PRIVACIDADE", href: "/privacidade" },
    ],
    copyright: "© 2026 RAFAEL RAZEIRA ESTÚDIO",
  },

  barra: { destaque: "GRÁTIS", sub: "Sua vitrine desenhada", cta: "QUERO VER A MINHA LOJA" },

  /* a mensagem que abre no WhatsApp (pt) ou o assunto do e-mail (en) */
  contato: { abertura: "Oi Rafael! Quero uma vitrine para minha loja.", nome: "Nome", loja: "Loja", plano: "Plano", ref: "Ref" },
};

export type VitrineMessages = typeof pt;
