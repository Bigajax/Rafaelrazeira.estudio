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
    description: "Eu desenho a prévia da sua vitrine sem custo. Catálogo com foto, preço e tamanho, pedido pronto no WhatsApp, projeto completo por R$999.",
  },
  marca: { nome: "RAFAEL RAZEIRA", sufixo: "ESTÚDIO" },
  header: {
    /* sem a seta desde 28/10: o botão abre o modal, não desce a página */
    cta: "Quero ver a minha loja",
    navAria: "Seções da página",
    nav: [["#projetos", "Lojas no ar"], ["#como", "Como funciona"], ["#oferta", "Preço"]] as [string, string][],
    insta: { handle: "@rafaelrazeira.estudio", linha: "Instagram", aria: "Abrir o Instagram do estúdio, @rafaelrazeira.estudio" },
  },

  hero: {
    /* 28/10: era "PARA LOJAS DO INSTAGRAM E WHATSAPP", que lia como loja que
       pertence ao Instagram; o Rafael disse que não fazia sentido. O que a
       etiqueta diz é PARA QUEM é a página */
    eyebrow: "Para lojas que vendem pelo Instagram",
    /* em caixa normal desde 28/10: o CSS põe em caixa alta (como já fazia com
       os h2), e o teste da Geist precisa da frase escrita como se fala */
    /* ---------- a manchete mudou com a entrada de 50% (28/10/2026) ----------
       "Sua loja pronta antes de você pagar" deixou de ser verdade: com R$ 500
       de entrada, a pessoa paga ANTES de a loja ser feita. O que ela vê sem
       pagar é a prévia. "Antes de decidir" guarda o argumento (você vê
       primeiro) e é verdade: decidir não é pagar. Escolha do Rafael entre
       três caminhos (a dor do direct e o resultado curto ficaram de fora). */
    h1: <>Veja sua loja pronta antes de <em>decidir.</em></>,
    lead: <>Mando a prévia com as suas peças em até 24h. Gostou, ela vai ao ar com o pedido chegando montado no seu WhatsApp.</>,
    faixa: "Pronta em 7 dias úteis · Sem mensalidade · Você mesmo atualiza ·",
    phoneAria: "A loja completa da Iconic Sneakers rolando do topo ao rodapé dentro de uma janela de navegador: catálogo, páginas de produto e pedido pelo WhatsApp",
    /* 28/10: as logos são só quem PAGOU, e o canhoto conta todas as vitrines
       com link (as amostras incluídas). Com "no ar" nos dois, 8 e 108 pareciam
       se contradizer; agora um diz cliente e o outro diz desenhadas */
    lojas: "Lojas que já são clientes do estúdio",
    rolar: "Rolar até a vitrine da Iconic",
    cta: "Quero ver a minha loja",
    cta2: "Ver lojas no ar",
    modalAria: "Pedir a prévia da sua loja",
    modalFechar: "Fechar",
    liveTag: "No ar: Iconic Sneakers · Ver lojas que já usam ↓",
    pedido: {
      k: "Pedido no seu WhatsApp",
      texto: <>Oi, Iconic! Quero o <b>New Balance 9060</b>, tam <b>41</b>. Pode separar?</>,
      hora: "agora",
    },
  },

  /* a etiqueta do hero e o formulário da oferta dividem estas frases */
  form: {
    enviando: "ENVIANDO…",
    enviar: "QUERO VER A MINHA LOJA",
    /* a confirmação, quando o lead está gravado */
    okTitulo: "Pedido recebido.",
    /* 24h, a mesma promessa da página (era "ainda hoje", 28/10) */
    okSub: "Vou olhar sua loja e te mando a prévia no WhatsApp em até 24h.",
    okCta: "Me chama no WhatsApp agora",
    /* o "Falta um toque": a gravação falhou e o WhatsApp abriu no lugar */
    pendenteTitulo: "Falta um toque.",
    pendenteTexto: <>Abri o WhatsApp com sua mensagem pronta. Toque em <b>enviar</b> lá para eu receber, senão ela não chega.</>,
    pendenteCta: "Abrir o WhatsApp",
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
    /* o campo do @ recebeu outra coisa (12/09): dito na hora, sem ir à rota */
    errInstaTel: "Isso é um telefone. Aqui eu preciso do @ da loja no Instagram, o nome que aparece logo abaixo da foto do perfil.",
    errInstaEmail: "Isso é um e-mail. Aqui eu preciso do @ da loja no Instagram, o nome que aparece logo abaixo da foto do perfil.",
    /* a segunda recusa da Meta: quase sempre é conta pessoal */
    errInstaPessoal1: "A Meta não reconhece ",
    errInstaPessoal2: " como conta profissional, e a prévia sai das fotos do perfil. Mudar leva um minuto: no Instagram, Configurações, Tipo de conta e ferramentas, Mudar para conta profissional. Depois manda o @ de novo.",
    errInstaOnde: "Onde achar: abra o Instagram da loja; o @ está logo abaixo da foto do perfil.",
    ajudaCta: "Não achou? Me chama que eu te ajudo ↗",
    ajudaMsg: "Oi Rafael! Tentei mandar o @ da minha loja pelo site e não deu certo. Pode me ajudar?",
    /* a loja que a Meta encontrou, na confirmação; {n} são os seguidores */
    lojaAchada1: "Encontrei ",
    lojaAchada2: " no Instagram, com {n} seguidores. É essa a sua loja? Se não for, me avisa.",
  },

  etiqueta: {
    selo: { aria: "Carimbo: agenda aberta", arco: "RAFAEL RAZEIRA ESTÚDIO", l1: "AGENDA", l2: "ABERTA", rodape: "MARINGÁ · PR" },
    /* 28/10: o cartão inteiro revisto com o Rafael. O título fala da loja
       dela, não de mim; a linha diz o que é a prévia e por onde ela chega
       (é o motivo de pedir o WhatsApp); o "loja pronta" saiu, porque o que
       sai em 24h é a prévia e a loja leva os 7 dias úteis do canhoto. O canhoto
       chegou a ganhar "LOJA EM" na frente do 7, e saiu no mesmo dia: quebrava
       a linha única em duas ou três (medido em 360, 390 e 1440), e a linha
       de cima já não promete loja em 24h, então não há o que desempatar */
    lead: <>Sua loja, com<br />as suas peças.</>,
    sub: "Manda o @ da loja. Eu monto a prévia com o que já está no seu Instagram e te mando pelo WhatsApp em até 24h.",
    instaAria: "Sua loja no Instagram",
    /* o @ no exemplo (28/10): o símbolo do Instagram ao lado não dizia que o
       campo pede o @; o campo tira o @ se a pessoa digitar */
    instaPh: "@sualoja",
    /* o botão do modal, em caixa de frase (o form.enviar é da oferta) */
    enviar: "Quero ver a minha loja",
    enviando: "Enviando…",
    micro: <><b>A prévia é por minha conta.</b> Gostou? <b>{R(v.total)}</b> no total: <b>{R(v.entrada)}</b> para começar e o resto só depois de aprovar. Não gostou? Me diz sem dó.</>,
    /* o canhoto: {n} é o placar de projetos no ar */
    /* "criadas" e não "desenhadas" (28/10): para o Rafael, desenhada soa
       feita à mão. Vale nos quatro lugares em que o número aparece. */
    stub: { projetos: "VITRINES CRIADAS", prazo: "7", prazoRotulo: "DIAS ÚTEIS", mensal: `${o.simbolo}0`, mensalRotulo: "DE MENSALIDADE" },
  },

  quem: {
    alt: "Rafael Razeira de óculos esportivos e jaqueta preta, com montanhas nevadas ao fundo",
    legenda: "MARINGÁ · PR · EST. 2026",
    eyebrow: "QUEM FAZ",
    h2: <>Do primeiro oi<br />até a loja no ar:<br /><em>sou eu.</em></>,
    /* em duas partes para a animação letra a letra do Quem Faz curto (28/10) */
    h2a: "Do primeiro oi até a loja no ar:", h2b: "sou eu.",
    p1: "Rafael Razeira. Desenho, desenvolvo e publico cada vitrine, e é comigo que você fala no WhatsApp. Sem fila de atendimento, sem gerente de conta, sem telefone que ninguém atende.",
    /* {n} é o resto do portfólio (os projetos no ar menos os DOIS nomeados:
       desde 28/10 a Iconic rola no celular e também está nos projetos) */
    p2: "A Iconic Sneakers, rodando aí em cima, e a Japa Modas, mais abaixo? As duas são lojas de clientes e saíram desta mesa, junto com os outros {n} projetos do portfólio.",
    fatos: { cidade: "MARINGÁ · PR", projetos: "{n} VITRINES CRIADAS", resposta: "RESPOSTA NO MESMO DIA" },
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
    lead: "A Iconic Sneakers vende tênis de Florianópolis para todo o Brasil. A Japa Modas veste o homem e tem loja de rua em Ribeirão Preto. As duas estão no ar, com produto e preço reais, e abrem no seu celular agora.",
    live: "NO AR",
    tipo: "LOJA DE CLIENTE",
    abrir: "Abrir o site do projeto {nome} em nova aba",
    alt: "Página completa da vitrine da {nome}",
    itens: [
      {
        tag: "SNEAKERS",
        copy: "Estoque próprio e importação sob encomenda, de Florianópolis para todo o Brasil. Entreguei a vitrine e o painel: o dono sobe preço e estoque sozinho.",
        fatos: ["Catálogo por Corrida, Streetwear e Icônicos", "Página para cada par", "Sob encomenda com orçamento", "Pedido direto no WhatsApp"],
        cta: "ABRIR A VITRINE DA ICONIC ↗",
      },
      {
        tag: "MODA MASCULINA",
        copy: "Loja de rua em Ribeirão Preto. Entreguei a vitrine e o painel: o dono publica peça e ajusta o estoque sozinho.",
        fatos: ["Uma vitrine para cada categoria", "Página para cada produto", "Ofertas com o preço riscado", "Pedido direto no WhatsApp"],
        cta: "ABRIR A VITRINE DA JAPA ↗",
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
      ["Catálogo e produtos", "Página inicial, categorias e até 60 produtos cadastrados por mim."],
      ["WhatsApp integrado", "O pedido chega com o produto já identificado."],
      ["Publicação completa", "Vitrine no ar, endereço configurado e uma rodada de ajustes."],
    ] as [string, string][],
    listaTitulo: "Ver a lista completa, item por item",
    lista: [
      ["Até 60 produtos", "Eu cadastro todos no lançamento. Acima disso, combinamos à parte."],
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
    itens: ["Design personalizado", "Página inicial e catálogo", "Páginas de produto", "WhatsApp integrado", "Até 60 produtos cadastrados", "Painel de gestão da loja", "Publicação e endereço configurado", "Uma rodada de ajustes", "Entrega em até 7 dias úteis"],
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
    /* "prévia" e não "loja" desde 28/10: com 50% de entrada a loja é feita
       DEPOIS do primeiro pagamento; sem pagar nada, o que se vê é a prévia */
    h2: <>Você vê a prévia pronta<br /><em>antes de pagar nada.</em></>,
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
    /* 28/10 (pedido do Rafael): a manchete que contava os "não" e as
       etiquetas em caixinha saíram; título simples e a saída para o WhatsApp
       ao lado da lista */
    /* enxuto desde 28/10 (pedido do Rafael): saíram as que a página já responde
       (mensalidade: o cartão R$0 por mês; prazo: o passo 03; quem atualiza: o
       cartão do painel; pagar tudo antes: o trilho do preço) */
    titulo: "Perguntas antes de contratar",
    duvida: { texto: "Não achou a sua?", link: "Me chama no WhatsApp", msg: "Oi Rafael, tenho uma dúvida sobre a vitrine digital." },
    itens: [
      { p: "A vitrine recebe pagamentos dos meus clientes?", r: "Não. A vitrine organiza o catálogo e leva o pedido pronto para o WhatsApp da loja, onde você combina pagamento e entrega.", nao: true },
      { p: "Quantos produtos estão incluídos?", r: "A vitrine não tem limite de produtos. Os 60 primeiros eu cadastro para você, com foto, preço e tamanhos; os outros você mesmo cadastra no painel, em minutos e sem me chamar.", nao: false },
      /* as três de 28/10: as respostas são as dos termos (public/termos.html,
         seção 06) e a do Google é a da nota "fechar e receber" do cofre */
      { p: "O que eu preciso mandar?", r: "A logo, as fotos das peças e a lista delas com preço e tamanhos. O prazo de 7 dias úteis conta a partir do dia em que tudo isso chega.", nao: false },
      { p: `Por que ${R(v.total)} e não R$5 mil?`, r: "Porque não tem agência no meio. Você fala comigo do primeiro oi até a loja no ar, sem atendimento, sem gerente de projeto e sem repasse. O processo é o mesmo em todos os projetos, então o que sobra de custo é o meu tempo.", nao: false },
      { p: "E se eu desistir?", r: `Em até 7 dias depois de pagar a entrada, você desiste por qualquer motivo e recebe os ${R(v.entrada)} inteiros de volta, no mesmo Pix. E se a primeira versão não ficar pronta no prazo, a entrada também volta.`, nao: false },
      { p: "A vitrine aparece no Google?", r: "Aparece pelo nome da loja: cada peça tem a sua página, com nome, preço e foto que o Google lê. O que ela não faz é ganhar de loja grande numa busca genérica, tipo \"tênis Nike\". Prometer posição no Google seria mentir.", nao: false },
    ],
  },

  fim: {
    eyebrow: "AGENDA ABERTA",
    h2: <>Sua loja já tem produtos.<br />Agora precisa de uma estrutura para<br /><em>vender melhor.</em></>,
    lead: `Deixa o seu @ que eu desenho a sua vitrine e te mostro pronta, de graça. Se você já decidiu, começa com ${R(v.entrada)}.`,
    cta: "QUERO VER A MINHA LOJA ↑",
    ghost: "VER O QUE ESTÁ INCLUSO",
  },

  /* ---------- a página simplificada (28/10/2026), ver components/vitrine/mobbin.tsx ----------
     Os depoimentos são frases copiadas das conversas do WhatsApp que o
     Rafael mandou em 28/10; nada aqui foi escrito por mim. `k` é a loja
     com ícone; sem `k`, o lead aparece pelo estado (o DDD do número). */
  mb: {
    /* o quem faz desta página (28/10): fatos no lugar dos três "sem". {c} é a
       mesma centena do placar (as vitrines no ar), para os dois números baterem.
       Maringá já está no site (a legenda da foto e a /landing). */
    quem: { texto: "Rafael Razeira, de Maringá. Criei cada uma das mais de {c} vitrines do estúdio, do layout ao endereço no ar. E a conversa é no meu WhatsApp, do primeiro oi à entrega.", assinatura: "Rafael Razeira" },
    /* o rodapé desta página (28/10): a frase é a mesma promessa do selo do hero */
    rodape: { frase: "Vitrines digitais para lojas que vendem pelo Instagram. Maringá, PR.", navAria: "Rodapé", copy: "© 2026 Rafael Razeira Estúdio", contato: "Fale comigo", msg: "Oi Rafael, vim pelo site do estúdio." },
    placar: {
      /* os três números empurram para a prévia (28/10): o "8 lojas clientes"
         saiu, porque ao lado do 108 convidava a pergunta errada; quem são
         os clientes está nas logos do hero. O R$0 é o argumento do botão
         dito como fato: a prévia é sem custo. */
      rotulo: "Como funciona, em três números",
      /* "+100" e não "108" (28/10, pedido do Rafael): {c} é a centena cheia
         abaixo do total, e o componente conta de 0 até ela */
      itens: [["+{c}", "vitrines criadas"], ["24h", "até a prévia"], [R(0), "para ver a sua"]] as [string, string][],
    },
    lojasAr: {
      /* em duas partes (28/10): o componente monta o <h2> com o <em> e
         quebra em letras; o elemento pronto do dicionário não passava no
         isValidElement da quebra (o do hero passa; causa não achada) */
      /* era "Veja lojas no ar em segundos." até 28/10: lido rápido, o "em
         segundos" soava como prazo de entrega (o real é 7 dias úteis) */
      h2a: "Lojas que já recebem", h2b: "pedido no WhatsApp.",
      lead: "Vitrines de clientes do estúdio, com produto e preço reais. Toque numa para abrir.",
      abasAria: "Filtrar por tipo de loja",
      abas: [["todas", "Todas"], ["sneakers", "Sneakers"], ["moda", "Moda"], ["esporte", "Esporte"], ["skate", "Skate"]] as [string, string][],
      abrir: "Abrir a vitrine da {nome} em nova aba",
    },
    jornada: {
      h2: <>Do Instagram ao pedido. <em>Nenhum passo é seu.</em></>,
      zapNome: "Loja · WhatsApp",
      cartoes: [
        { t: "O cliente escolhe sozinho", p: "Foto, preço e tamanho de cada peça num link só, na bio. As perguntas que hoje chegam no seu direct, respondidas antes de ele digitar." },
        { t: "O pedido chega montado no WhatsApp", p: "A mensagem já vem com a peça escolhida. Você só confirma e combina o pagamento." },
      ],
    },
    etapas: {
      h2: <>Da prévia <em>à loja no ar.</em></>,
      h2a: "Da prévia", h2b: "à loja no ar.",
      itens: [
        { n: "01", t: "Prévia em até 24h, sem custo", p: "Você manda o @ da loja. Eu desenho a sua vitrine com as suas peças e te mostro pronta.", chip: "Oi! A vitrine da @sualoja ficou pronta. Dá uma olhada:" },
        { n: "02", t: `Gostou? ${R(v.entrada)} para começar`, p: "Aí você manda o material da loja e eu monto o catálogo inteiro. O saldo só depois de aprovar.", chip: `${R(v.entrada)} agora · ${R(v.saldo)} na entrega` },
        { n: "03", t: "No ar em até 7 dias úteis, com o painel seu", p: "Troca preço, foto e estoque sozinho, pelo celular. Sem mensalidade.", chip: "" },
      ],
      /* o bento (28/10): quatro cartões com tela de verdade, abaixo da linha
         dos passos. O painel é o da Xavier's Sports, a captura que a página
         antiga já usava; a mensagem da prévia é a que o Rafael manda de
         verdade (print de 28/10), com o @ trocado pelo genérico. */
      bento: {
        painel: { t: "O painel é seu", p: ["Troca preço e foto na hora", "Marca esgotado ou pronta entrega", "Cadastra peça nova e ela entra na vitrine no mesmo minuto"], alt: "O painel da loja cadastrando uma peça: a foto, o nome, a categoria, o preço e os tamanhos, e a peça aparecendo na lista", legenda: "O painel cadastrando uma peça, de verdade. É o mesmo em todas as lojas." },
        previa: { t: "A prévia chega no seu WhatsApp", p: "Em até 24h, sem custo.", msg: "Oi! A vitrine da @sualoja ficou pronta, montei com as fotos que você mandou:", link: "sualoja.vercel.app" },
        pedido: { t: "O pedido chega montado", p: "Com a peça e o tamanho. Você só confirma." },
        mensal: { t: "Sem mensalidade", valor: R(0), sufixo: "por mês", p: "Domínio próprio opcional, anual e pago direto no registrador.", meses: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] },
      },
    },
    preco: {
      eyebrow: "Sem mensalidade",
      h2: <>Vitrine completa por <em>{R(v.total)}.</em></>,
      h2a: "Vitrine completa por", h2b: `${R(v.total)}.`,
      lead: "Metade para começar, metade na entrega. O saldo só depois de você aprovar.",
      linhas: [[R(v.entrada), "para começar"], [R(v.saldo), "na entrega, depois de aprovar"]] as [string, string][],
      /* o R$899 à vista saiu do cartão em 28/10 (decisão do Rafael): é o
         degrau 1 de desconto da negociação (cofre, 1 Processos/fechar-e-receber),
         e publicado ele vira o preço de todo mundo; e não tinha botão para pagar */
      pix: null as string | null,
      /* a lista do incluso em três grupos (28/10): os números são posições
         em `oferta.itens`, para o texto de cada item continuar num lugar só */
      grupos: [["O site", [0, 1, 2, 4]], ["O painel", [5, 3]], ["A entrega", [6, 7, 8]]] as [string, number[]][],
      cta: "Quero ver a minha loja",
      /* a compra direta no cartão (28/10, pedido do Rafael): quem não quer
         esperar a prévia paga a entrada ali mesmo. O botão abre o checkout
         da /vitrine-v4 (lib/propostas.ts, "vitrine-direta", entrada_pix): o
         VALOR COBRADO vem de lá, este texto só exibe. Se a entrada mudar em
         lib/oferta.ts, mudar lá também. `null` some com o bloco.
         Desde 28/10 é um link discreto e não um botão do tamanho do rosa: a
         prévia é o caminho que a página promete, e este é o atalho de quem já
         decidiu. A desistência em 7 dias está no FAQ e nos termos. */
      direto: { texto: "Já decidiu?", botao: `Pague a entrada de ${R(v.entrada)} no Pix` } as { texto: string; botao: string } | null,
      nota: "A prévia é sem custo. Você só paga se gostar.",
      termos: "Ver escopo e termos",
    },
    depo: {
      h2: <>O que dizem <em>no WhatsApp.</em></>,
      /* o nome da seção em texto puro, para o aria-label (o h2 saiu da tela em 28/10) */
      titulo: "O que dizem no WhatsApp",
      lead: "Mensagens reais, copiadas da conversa: de clientes e de lojistas que viram a prévia.",
      cliente: "Cliente", previa: "Viu a prévia", pontosAria: "Escolher o depoimento",
      /* só o Luciano, da Iconic (28/10, pedido do Rafael), com a foto dele;
         as outras seis frases ficaram guardadas na conversa de 28/10 */
      itens: [
        { q: ["Parabéns pelo trabalho! Parabéns pela agilidade e prestatividade! Você se antecipou em várias coisas que não tínhamos pedido e principalmente em fazer uma entrega com rapidez.", "Para nós ajudou muito, pois já tínhamos desistido de pegar esta Black Friday, mas ainda deu tempo hábil por causa do seu empenho!"], quem: "Luciano", loja: "Iconic Sneakers", cliente: true, k: "iconic", foto: "/assets/depo/luciano.webp",
          /* o destaque (28/10): um trecho EXATO da segunda frase, com as reticências dizendo que é recorte; a mensagem inteira continua embaixo */
          destaque: "…já tínhamos desistido de pegar esta Black Friday, mas ainda deu tempo hábil por causa do seu empenho!", site: "https://iconicsneakers.com.br", dominio: "iconicsneakers.com.br", tela: "/assets/demo/iconic-vitrine" },
      ] as { q: string[]; quem: string; loja?: string; cliente: boolean; k?: string; foto?: string; destaque?: string; site?: string; dominio?: string; tela?: string }[],
    },
    fim: {
      h2: <>Sua loja pode ser <em>a próxima.</em></>,
      h2a: "Sua loja pode ser", h2b: "a próxima.",
      lead: "Deixa o @ que eu desenho a prévia da sua vitrine em até 24h, sem custo.",
      cta: "Quero ver a minha loja",
      cta2: "Ver o preço",
    },
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

  /* desde 28/10 a barra do celular é só a pílula: o texto ao lado saiu */
  barra: { cta: "Quero ver a minha loja" },

  /* a mensagem que abre no WhatsApp (pt) ou o assunto do e-mail (en) */
  contato: { abertura: "Oi Rafael! Quero uma vitrine para minha loja.", nome: "Nome", loja: "Loja", plano: "Plano", ref: "Ref" },
};

export type VitrineMessages = typeof pt;
