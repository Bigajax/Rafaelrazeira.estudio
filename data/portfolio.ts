/* Os projetos entregues pelo estúdio, na ordem em que aparecem no
   /portfolio (a ordem é curadoria: ver a nota logo acima da lista).
   Todos estão no ar. Atenção aos endereços: bellablack.com.br,
   xavierssports.com.br e veritlab.com.br não resolvem DNS, e o deploy
   antigo do Star Point (starpoint-maringa) foi apagado, então valem só as
   URLs abaixo.
   Um projeto sem `url` sai com o card sem botão e sem o selo NO AR. A capa
   vem de /public/portfolio/{slug}.webp, gerada por
   scripts/capture-portfolio.mjs. */

export type Projeto = {
  nome: string;
  slug: string;
  tipo: "Vitrine Digital" | "E-commerce" | "Site profissional" | "Site de evento";
  /* O que o negócio VENDE, em uma linha. Entrou em 14/08 porque a grade do
     /portfolio tinha nove capturas, nove nomes e nove endereços, e nenhuma
     palavra dizendo o que cada loja é: seis cards seguidos rotulados
     "Vitrine Digital" descrevem o que EU entreguei, nunca o que a cliente
     faz, e é o que a cliente faz que separa uma loja da outra para quem
     está olhando.
     Regra da linha: fato conferível na própria captura (o que vende, onde
     fica, o que a loja oferece), nunca adjetivo. Se não dá para ver
     abrindo o site, não entra. */
  ramo: string;
  /* A mesma linha em inglês, para o /en/portfolio (11/09/2026). Nome e
     endereço não traduzem; só o que o negócio vende. */
  ramoEn: string;
  /* Ocupa duas colunas na grade do /portfolio, em vez de uma. É o único
     lugar onde a página tem OPINIÃO sobre o próprio trabalho: dez cards
     do mesmo tamanho leem como catálogo, e catálogo não escolhe nada.

     São exatamente DOIS, e as posições importam: eles têm que estar na 1ª
     e na 4ª linha da lista para as duas primeiras fileiras fecharem em
     três colunas (2+1 / 1+2). Marcar um terceiro, ou mudar um de lugar,
     abre buraco no meio da grade. A ÚLTIMA fileira fecha sozinha desde
     05/10/2026 (ver `sobra` no PortfolioPage), então a lista pode crescer
     sem refazer conta. */
  destaque?: true;
  url?: string;
};

/* ---------- a ordem é curadoria, não categoria (14/08) ----------
   Até 13/08 a lista era agrupada por tipo: as seis vitrines primeiro, os
   três projetos de outro tipo no fim. O Rafael passou a ordenar pelo que
   quer mostrar primeiro, e as quatro primeiras posições são escolha dele:
   Xavier's Sports, Star Point, Sölo Urb e vérít.lab. As seis seguintes
   ficam alternando segmento para a grade não mostrar quatro lojas de
   roupa em sequência.

   A ordem tem efeito em três lugares da /portfolio, e todos leem daqui:
   a grade, a tira rosa rolante e a linha de inventário (que conta os
   tipos na ordem de primeira aparição). */
export const projetos: Projeto[] = [
  { nome: "Xavier's Sports", slug: "xaviers-sports", tipo: "Vitrine Digital", ramo: "Camisas de clubes e seleções, atuais e retrô.", ramoEn: "Club and national team jerseys, current and retro.", destaque: true, url: "https://xavier-s-sports.vercel.app" },
  { nome: "Star Point", slug: "star-point", tipo: "Vitrine Digital", ramo: "Sneakers e streetwear, com retirada na loja.", ramoEn: "Sneakers and streetwear, with in-store pickup.", url: "https://star-point-wheat.vercel.app" },
  { nome: "Sölo Urb", slug: "solo-urb", tipo: "E-commerce", ramo: "Sneakers, roupas e relógios de várias marcas.", ramoEn: "Multi-brand sneakers, apparel and watches.", url: "https://s-lo-urb.vercel.app" },
  /* vérít.lab (14/08): veritlab.com.br NÃO resolve DNS, então vale só o
     deploy da Vercel. É vitrine e não e-commerce: o próprio README do
     projeto registra que não existe carrinho nem checkout, e o WhatsApp é
     o único mecanismo de conversão. Repositório em
     C:\Users\Rafael\Desktop\vitrines\Vérit.lab (Next 16 + Supabase, com painel
     admin próprio para a dona cadastrar peça e marcar vendida). */
  { nome: "vérít.lab", slug: "verit-lab", tipo: "Vitrine Digital", ramo: "Espelhos, quadros e objetos feitos à mão.", ramoEn: "Handmade mirrors, frames and objects.", destaque: true, url: "https://verit-lab.vercel.app" },
  { nome: "PR Grife", slug: "pr-grife", tipo: "Vitrine Digital", ramo: "Multimarcas com loja física em Maringá.", ramoEn: "Multi-brand store with a physical shop in Maringá.", url: "https://pr-grife.vercel.app" },
  { nome: "Bella Black", slug: "bella-black", tipo: "Vitrine Digital", ramo: "Streetwear e lançamentos, loja física em Maringá.", ramoEn: "Streetwear and new drops, physical shop in Maringá.", url: "https://bella-black-three.vercel.app" },
  { nome: "PR Gold", slug: "pr-gold", tipo: "Vitrine Digital", ramo: "Joias em ouro 18K, com confecção própria.", ramoEn: "18K gold jewelry, made in-house.", url: "https://prgold.vercel.app" },
  { nome: "Filato Bene", slug: "filato-bene", tipo: "Vitrine Digital", ramo: "Alfaiataria masculina e moda para noivos.", ramoEn: "Men's tailoring and groom's fashion.", url: "https://filato-bene.vercel.app" },
  { nome: "Lancellotti Tattoo Clinic", slug: "lancellotti", tipo: "Site profissional", ramo: "Tatuagem autoral e piercing, com orçamento online.", ramoEn: "Custom tattoos and piercing, with online quotes.", url: "https://lancellotti-tattoo-clinic.vercel.app" },
  { nome: "Baixudos.PR", slug: "baixudos", tipo: "Site de evento", ramo: "Encontro de cultura automotiva, com ingresso e inscrição.", ramoEn: "Car culture meetup, with tickets and sign-up.", url: "https://baixudos.vercel.app" },

  /* ---------- todas as vitrines (05/10/2026) ----------
     O Rafael pediu TODAS as vitrines no portfólio, misturadas na mesma
     grade e com o nome da loja, inclusive as prévias de quem não fechou.
     Elas entram depois dos dez da curadoria, da mais nova para a mais
     antiga (data de criação do projeto na Vercel).

     A fonte dos endereços é a conta da Vercel, NÃO a ficha do cofre: na
     conferência, três fichas apontavam para sites de OUTRAS pessoas
     (vallox, worldsports e padelco .vercel.app já tinham dono, e o deploy
     nosso ganhou sufixo), e a Encanto Íntimo idem. Endereço novo aqui só
     depois de abrir e conferir o <title>.

     O ramo é a descrição que o próprio site publica, encurtada. Ficaram
     fora: a JK Imports (o deploy abre na tela "Pagamento pendente"), as
     cartilhas de entrega e o que não é vitrine (personal, rádio, gráfica,
     advocacia). */
  { nome: "Lucky Star Smash", slug: "lucky-star-smash", tipo: "Site profissional", ramo: "Smash burger de drop em Maringá, só pelo iFood.", ramoEn: "Drop-only smash burgers in Maringá, on iFood.", url: "https://lucky-star-smash.vercel.app" },
  { nome: "Ateliê Malha", slug: "atelie-malha", tipo: "Vitrine Digital", ramo: "Lembrancinhas feitas à mão em fio de malha.", ramoEn: "Handmade party favors in t-shirt yarn.", url: "https://atelie-malha.vercel.app" },
  { nome: "Mariele Silva", slug: "mariele-silva", tipo: "Vitrine Digital", ramo: "Unha em gel e design de sobrancelha, com agendamento.", ramoEn: "Gel nails and brow design, with booking.", url: "https://mariele-silva.vercel.app" },
  { nome: "Ryze Wear", slug: "ryze-wear", tipo: "Vitrine Digital", ramo: "Streetwear e surfwear em Concórdia, SC.", ramoEn: "Streetwear and surfwear in Concórdia, SC.", url: "https://ryze-wear.vercel.app" },
  { nome: "Icônica Shoes", slug: "iconica-shoes", tipo: "Vitrine Digital", ramo: "Tênis e rasteiras femininos em Garibaldi, RS.", ramoEn: "Women's sneakers and flats in Garibaldi, RS.", url: "https://iconica-shoes.vercel.app" },
  { nome: "Denis DDS Store", slug: "denis-dds-store", tipo: "Vitrine Digital", ramo: "Camisas de time e moda masculina.", ramoEn: "Football jerseys and menswear.", url: "https://denis-dds-store.vercel.app" },
  { nome: "Startbox", slug: "startbox", tipo: "Vitrine Digital", ramo: "Tênis e roupa com loja física em Piraquara, PR.", ramoEn: "Sneakers and apparel, physical shop in Piraquara, PR.", url: "https://startbox-psi.vercel.app" },
  { nome: "SneakerSpot", slug: "sneakerspot", tipo: "Vitrine Digital", ramo: "Sneakers e roupa de treino, pronta entrega ou encomenda.", ramoEn: "Sneakers and training wear, in stock or to order.", url: "https://sneakerspot-weld.vercel.app" },
  { nome: "One Tênis", slug: "one-tenis", tipo: "Vitrine Digital", ramo: "Distribuidora de tênis para revenda.", ramoEn: "Sneaker wholesaler for resellers.", url: "https://one-tenis.vercel.app" },
  { nome: "OFF Multimarcas", slug: "off-multimarcas", tipo: "Vitrine Digital", ramo: "Ponta de estoque multimarcas na Lapa, Rio de Janeiro.", ramoEn: "Multi-brand outlet in Lapa, Rio de Janeiro.", url: "https://off-multimarcas.vercel.app" },
  { nome: "Movvo Style", slug: "movvo-style", tipo: "Vitrine Digital", ramo: "Tênis de marca com frete grátis para o Brasil.", ramoEn: "Brand-name sneakers with free shipping in Brazil.", url: "https://movvo-style.vercel.app" },
  { nome: "JS Imports", slug: "js-imports", tipo: "Vitrine Digital", ramo: "iPhone, iPad e Xiaomi lacrados, em Maringá.", ramoEn: "Sealed iPhone, iPad and Xiaomi, in Maringá.", url: "https://js-imports-eight.vercel.app" },
  { nome: "HG Surf Wear", slug: "hg-surf-wear", tipo: "Vitrine Digital", ramo: "Marca de surfwear: moletons, camisetas e bermudas.", ramoEn: "Surfwear brand: hoodies, tees and boardshorts.", url: "https://hg-surf-wear.vercel.app" },
  { nome: "H2B Imports", slug: "h2b-imports", tipo: "Vitrine Digital", ramo: "Air Jordan 4, Dunk e New Balance 9060.", ramoEn: "Air Jordan 4, Dunk and New Balance 9060.", url: "https://h2b-imports.vercel.app" },
  { nome: "DK Modas", slug: "dk-modas", tipo: "Vitrine Digital", ramo: "Moda masculina em Cidade Ocidental, GO.", ramoEn: "Menswear in Cidade Ocidental, GO.", url: "https://dk-modas.vercel.app" },
  { nome: "Adriano Shoes", slug: "adriano-shoes", tipo: "Vitrine Digital", ramo: "Tênis do 34 ao 39, loja virtual no Rio de Janeiro.", ramoEn: "Sneakers in sizes 34 to 39, online shop in Rio.", url: "https://adriano-shoes.vercel.app" },
  { nome: "Ufa! Skateshop", slug: "ufa-skateshop", tipo: "Vitrine Digital", ramo: "Skate e streetwear em Adamantina, SP.", ramoEn: "Skate and streetwear in Adamantina, SP.", url: "https://ufa-skateshop.vercel.app" },
  { nome: "Serra Calçados", slug: "serra-calcados", tipo: "Vitrine Digital", ramo: "Calçados e bolsas para a família, em Lagoa Santa, MG.", ramoEn: "Family shoes and bags in Lagoa Santa, MG.", url: "https://serra-calcados.vercel.app" },
  { nome: "Prime Center", slug: "prime-center", tipo: "Vitrine Digital", ramo: "Streetwear e joias em Catanduvas, SC.", ramoEn: "Streetwear and jewelry in Catanduvas, SC.", url: "https://prime-center-phi.vercel.app" },
  { nome: "M.R Storys", slug: "mr-storys", tipo: "Vitrine Digital", ramo: "Bermudas, camisetas e cuecas de marca.", ramoEn: "Brand-name shorts, tees and underwear.", url: "https://mr-storys.vercel.app" },
  { nome: "Hard Urban Store", slug: "hard-urban", tipo: "Vitrine Digital", ramo: "Skate shop no Avenida Center, em Maringá.", ramoEn: "Skate shop at Avenida Center mall, Maringá.", url: "https://hard-urban.vercel.app" },
  { nome: "Company Street Run", slug: "company-street-run", tipo: "Vitrine Digital", ramo: "Tênis de corrida de alta performance em Natal, RN.", ramoEn: "High-performance running shoes in Natal, RN.", url: "https://company-street-run.vercel.app" },
  { nome: "Anvi Calçados", slug: "anvi-calcados", tipo: "Vitrine Digital", ramo: "Tênis em Bragança Paulista desde 2010.", ramoEn: "Sneakers in Bragança Paulista since 2010.", url: "https://anvi-calcados.vercel.app" },
  { nome: "AL Multimarcas", slug: "almultimarcas", tipo: "Vitrine Digital", ramo: "Tênis e roupas no calçadão de Osasco.", ramoEn: "Sneakers and apparel on Osasco's high street.", url: "https://almultimarcas.vercel.app" },
  { nome: "NOUS", slug: "sejanous", tipo: "Vitrine Digital", ramo: "Marca autoral de slow fashion feita em Maringá.", ramoEn: "Independent slow fashion label made in Maringá.", url: "https://sejanous.vercel.app" },
  { nome: "Joy Street Wear", slug: "joy-street-wear", tipo: "Vitrine Digital", ramo: "Tênis e streetwear na Vila Container, em Belém.", ramoEn: "Sneakers and streetwear at Vila Container, Belém.", url: "https://joy-street-wear.vercel.app" },
  { nome: "GO PLAY", slug: "goplay", tipo: "Vitrine Digital", ramo: "Moda de rua em Belo Horizonte desde 2015.", ramoEn: "Streetwear in Belo Horizonte since 2015.", url: "https://goplay-pi.vercel.app" },
  { nome: "Carol Sapatos", slug: "carol-sapatos", tipo: "Vitrine Digital", ramo: "Tênis a preço de outlet em Londrina.", ramoEn: "Sneakers at outlet prices in Londrina.", url: "https://carol-sapatos.vercel.app" },
  { nome: "Zero46 Premium", slug: "zero46-premium", tipo: "Vitrine Digital", ramo: "Jordan, Air Force e Dunk em Santa Izabel do Oeste.", ramoEn: "Jordan, Air Force and Dunk in Santa Izabel do Oeste.", url: "https://zero46-premium.vercel.app" },
  { nome: "VAYLW", slug: "vaylw", tipo: "Vitrine Digital", ramo: "Jeans, óculos, calçados e camisetas.", ramoEn: "Jeans, sunglasses, shoes and tees.", url: "https://vaylw.vercel.app" },
  { nome: "M&M Calçados", slug: "mm-calcados", tipo: "Vitrine Digital", ramo: "Tênis de corrida e clássicos em Piracicaba.", ramoEn: "Running and classic sneakers in Piracicaba.", url: "https://mm-calcados.vercel.app" },
  { nome: "MariMar Shoes", slug: "marimar-shoes", tipo: "Vitrine Digital", ramo: "Calçados femininos em Palmas, TO.", ramoEn: "Women's shoes in Palmas, TO.", url: "https://marimar-shoes.vercel.app" },
  { nome: "Look Fit", slug: "look-fit", tipo: "Vitrine Digital", ramo: "Moda fitness feminina e masculina em Florianópolis.", ramoEn: "Women's and men's activewear in Florianópolis.", url: "https://look-fit-rho.vercel.app" },
  { nome: "JM Multimarcas", slug: "jm-multimarcas", tipo: "Vitrine Digital", ramo: "Tênis de corrida e do dia a dia, loja virtual em BH.", ramoEn: "Running and everyday sneakers, online shop in BH.", url: "https://jm-multimarcas-xi.vercel.app" },
  { nome: "Japa Modas", slug: "japa-modas", tipo: "Vitrine Digital", ramo: "Moda masculina em Ribeirão Preto desde 2018.", ramoEn: "Menswear in Ribeirão Preto since 2018.", url: "https://japa-modas.vercel.app" },
  { nome: "Garimpo do Atleta", slug: "garimpo-do-atleta", tipo: "Vitrine Digital", ramo: "Brechó de tênis de corrida em Goiânia.", ramoEn: "Pre-owned running shoes in Goiânia.", url: "https://garimpo-do-atleta.vercel.app" },
  { nome: "Fardo Esportes", slug: "fardo-esportes", tipo: "Vitrine Digital", ramo: "Artigos esportivos no centro de Erechim, RS.", ramoEn: "Sporting goods in downtown Erechim, RS.", url: "https://fardo-esportes.vercel.app" },
  { nome: "Ciclo Skate Shop", slug: "ciclo-skate-shop", tipo: "Vitrine Digital", ramo: "Peças de skate e streetwear em Monte Mor, SP.", ramoEn: "Skate parts and streetwear in Monte Mor, SP.", url: "https://ciclo-skate-shop.vercel.app" },
  { nome: "Bia Bragança", slug: "bia-braganca", tipo: "Vitrine Digital", ramo: "Bolsas, tênis e sandálias com curadoria, em Londrina.", ramoEn: "Curated bags, sneakers and sandals in Londrina.", url: "https://bia-braganca.vercel.app" },
  { nome: "RWinstore", slug: "rwinstore", tipo: "Vitrine Digital", ramo: "Moda masculina em Curitiba desde 2010.", ramoEn: "Menswear in Curitiba since 2010.", url: "https://rwinstore.vercel.app" },
  { nome: "Padel&Co.", slug: "padelco", tipo: "Vitrine Digital", ramo: "Raquetes, tênis e roupa de padel, em Ijuí, RS.", ramoEn: "Padel rackets, shoes and apparel in Ijuí, RS.", url: "https://padelco-three.vercel.app" },
  { nome: "GR Store", slug: "grstore", tipo: "Vitrine Digital", ramo: "Tênis premium, do 9060 ao Samba.", ramoEn: "Premium sneakers, from the 9060 to the Samba.", url: "https://grstore.vercel.app" },
  { nome: "WLUKI7 Store", slug: "wluki7", tipo: "Vitrine Digital", ramo: "Moda masculina de Brusque, SC, para o Brasil.", ramoEn: "Menswear from Brusque, SC, shipped across Brazil.", url: "https://wluki7.vercel.app" },
  { nome: "Sublime Street Store", slug: "sublimestreetstore", tipo: "Vitrine Digital", ramo: "Streetwear com duas lojas em Erechim, RS.", ramoEn: "Streetwear with two shops in Erechim, RS.", url: "https://sublimestreetstore.vercel.app" },
  { nome: "Store Blessed", slug: "storeblessed", tipo: "Vitrine Digital", ramo: "Moda masculina, feminina e infantil, de São Paulo.", ramoEn: "Men's, women's and kids' fashion from São Paulo.", url: "https://storeblessed.vercel.app" },
  { nome: "Reis Store", slug: "reisstore", tipo: "Vitrine Digital", ramo: "Polos, camisas e jaquetas em Carpina, PE.", ramoEn: "Polos, shirts and jackets in Carpina, PE.", url: "https://reisstore.vercel.app" },
  { nome: "Narciso Store", slug: "narcisostore", tipo: "Vitrine Digital", ramo: "Tênis premium em Barra do Garças, MT.", ramoEn: "Premium sneakers in Barra do Garças, MT.", url: "https://narcisostore.vercel.app" },
  { nome: "Ivone Calçados SBC", slug: "ivonecalcados", tipo: "Vitrine Digital", ramo: "Calçados para a família em São Bernardo do Campo.", ramoEn: "Family footwear in São Bernardo do Campo.", url: "https://ivonecalcados.vercel.app" },
  { nome: "Dodo Store", slug: "dodostore", tipo: "Vitrine Digital", ramo: "Roupa masculina do M ao G2, de São Paulo.", ramoEn: "Menswear in sizes M to XXL, from São Paulo.", url: "https://dodostore-seven.vercel.app" },
  { nome: "Dani Tênis", slug: "danitenis", tipo: "Vitrine Digital", ramo: "Tênis, papetes e sandálias em Navegantes, SC.", ramoEn: "Sneakers and sandals in Navegantes, SC.", url: "https://danitenis.vercel.app" },
  { nome: "Tio do Tênis", slug: "tiodotenis", tipo: "Vitrine Digital", ramo: "Tênis originais no Brás, São Paulo.", ramoEn: "Authentic sneakers in Brás, São Paulo.", url: "https://tiodotenis.vercel.app" },
  { nome: "Shopping do Tênis", slug: "shoppingdotenis", tipo: "Vitrine Digital", ramo: "Tênis de corrida, de dia a dia, sapatênis e botas.", ramoEn: "Running and everyday sneakers, loafers and boots.", url: "https://shoppingdotenis.vercel.app" },
  { nome: "Samuel Ribeiro", slug: "samuelribeiro", tipo: "Vitrine Digital", ramo: "Galeria de um artista de Maringá, em fine art.", ramoEn: "A Maringá artist's gallery, in fine art prints.", url: "https://samuelribeiro-wheat.vercel.app" },
  { nome: "Pegabem Calçados", slug: "pegabemcalcados", tipo: "Vitrine Digital", ramo: "Calçados com duas lojas no Distrito Federal.", ramoEn: "Footwear with two shops in Brasília, DF.", url: "https://pegabemcalcados.vercel.app" },
  { nome: "Panda Sneakers", slug: "pandasneakers", tipo: "Vitrine Digital", ramo: "Tênis premium e importados em Birigui, SP.", ramoEn: "Premium and imported sneakers in Birigui, SP.", url: "https://pandasneakers.vercel.app" },
  { nome: "Jota Outlet", slug: "jotaoutlet", tipo: "Vitrine Digital", ramo: "Agasalhos, polos e bermudas de marca.", ramoEn: "Brand-name tracksuits, polos and shorts.", url: "https://jotaoutlet.vercel.app" },
  { nome: "CJ Shoes", slug: "cjshoes", tipo: "Vitrine Digital", ramo: "Tênis esportivos no atacado e no varejo.", ramoEn: "Sports sneakers, wholesale and retail.", url: "https://cjshoes.vercel.app" },
  { nome: "AGS Outlet Shoes", slug: "agsoutletshoes", tipo: "Vitrine Digital", ramo: "Outlet de tênis em Governador Valadares, MG.", ramoEn: "Sneaker outlet in Governador Valadares, MG.", url: "https://agsoutletshoes.vercel.app" },
  { nome: "Imports Premium BRJ", slug: "importspremiumbrj", tipo: "Vitrine Digital", ramo: "Tênis e chuteiras importados, sob encomenda.", ramoEn: "Imported sneakers and cleats, to order.", url: "https://importspremiumbrj.vercel.app" },
  { nome: "Importado Kids", slug: "importadokids", tipo: "Vitrine Digital", ramo: "Roupa de marca para menino em Rondonópolis, MT.", ramoEn: "Brand-name boys' clothing in Rondonópolis, MT.", url: "https://importadokids.vercel.app" },
  { nome: "Ada Tênis", slug: "adatenis", tipo: "Vitrine Digital", ramo: "Tênis de corrida e de rua em Nova Lima e BH.", ramoEn: "Running and street sneakers in Nova Lima and BH.", url: "https://adatenis.vercel.app" },
  { nome: "World Sports Alfenas", slug: "worldsports", tipo: "Vitrine Digital", ramo: "Tênis de corrida em Alfenas, MG.", ramoEn: "Running shoes in Alfenas, MG.", url: "https://worldsports-one.vercel.app" },
  { nome: "Vallox", slug: "vallox", tipo: "Vitrine Digital", ramo: "Streetwear com lojas em Itapiranga e Três Passos.", ramoEn: "Streetwear with shops in Itapiranga and Três Passos.", url: "https://vallox-nine.vercel.app" },
  { nome: "T-Shoes", slug: "tshoes", tipo: "Vitrine Digital", ramo: "Tênis do 34 ao 43, de Araras, SP.", ramoEn: "Sneakers in sizes 34 to 43, from Araras, SP.", url: "https://tshoes.vercel.app" },
  { nome: "Street Modas", slug: "streetmodas", tipo: "Vitrine Digital", ramo: "Streetwear com loja física em Roncador, PR.", ramoEn: "Streetwear, physical shop in Roncador, PR.", url: "https://streetmodas.vercel.app" },
  { nome: "Maison Priscila", slug: "maison-priscila", tipo: "Vitrine Digital", ramo: "Semijoias banhadas a ouro 18k, em Itajaí, SC.", ramoEn: "18k gold-plated jewelry in Itajaí, SC.", url: "https://maison-one-virid.vercel.app" },
  { nome: "Levili Shop", slug: "levilishop", tipo: "Vitrine Digital", ramo: "Os tênis mais procurados, do 34 ao 39.", ramoEn: "The most wanted sneakers, in sizes 34 to 39.", url: "https://levilishop.vercel.app" },
  { nome: "House Skate", slug: "houseskate", tipo: "Vitrine Digital", ramo: "Moda skate de fábrica própria em Sertãozinho, SP.", ramoEn: "In-house skatewear brand in Sertãozinho, SP.", url: "https://houseskate.vercel.app" },
  { nome: "Full Time Skateboards", slug: "fulltime", tipo: "Vitrine Digital", ramo: "Skate shop na Galeria Xaxim, em Curitiba.", ramoEn: "Skate shop at Galeria Xaxim, Curitiba.", url: "https://fulltimeskateboards.com.br" },
  { nome: "Fabrício Store Shoes", slug: "fabriciostoreshoes", tipo: "Vitrine Digital", ramo: "Tênis em Muriaé, MG, com envio para o Brasil.", ramoEn: "Sneakers in Muriaé, MG, shipped across Brazil.", url: "https://fabriciostoreshoes.vercel.app" },
  { nome: "Central de Vendas Oficial", slug: "centraldevendas", tipo: "Vitrine Digital", ramo: "Tricô para bebê e saídas de maternidade.", ramoEn: "Baby knitwear and going-home outfits.", url: "https://centraldevendas-lemon.vercel.app" },
  { nome: "Careca Multimarcas", slug: "carecamultimarcas", tipo: "Vitrine Digital", ramo: "Tênis e roupas de marca em São Gonçalo e Niterói.", ramoEn: "Brand-name sneakers and apparel in São Gonçalo and Niterói.", url: "https://carecamultimarcas.vercel.app" },
  { nome: "Box66", slug: "box66", tipo: "Vitrine Digital", ramo: "Calçados direto da fábrica, em Campinas.", ramoEn: "Factory-direct footwear from Campinas.", url: "https://box66-eta.vercel.app" },
  { nome: "Arena Imports Floripa", slug: "arena-imports", tipo: "Vitrine Digital", ramo: "Chuteiras, tênis e bolsas importados, em Florianópolis.", ramoEn: "Imported cleats, sneakers and bags in Florianópolis.", url: "https://arenaimportsfloripa.com" },
  { nome: "Rust Country", slug: "rustcountry", tipo: "Vitrine Digital", ramo: "Calças country femininas bordadas.", ramoEn: "Embroidered women's western jeans.", url: "https://rustcountry.vercel.app" },
  { nome: "Olé Sports", slug: "ole-sports", tipo: "Vitrine Digital", ramo: "Uniformes esportivos personalizados em Birigui, SP.", ramoEn: "Custom sports uniforms in Birigui, SP.", url: "https://ole-sports.vercel.app" },
  { nome: "Minas Brasil Decor", slug: "minas-decor", tipo: "Vitrine Digital", ramo: "Sofás, mesas de madeira e camas em Contagem, MG.", ramoEn: "Sofas, wooden tables and beds in Contagem, MG.", url: "https://minasbrasildecor.vercel.app" },
  { nome: "Encanto Íntimo", slug: "encanto-intimo", tipo: "Vitrine Digital", ramo: "Pijamas, lingerie e body splash em Itaporanga, SP.", ramoEn: "Sleepwear, lingerie and body mists in Itaporanga, SP.", url: "https://encantointimo-orcin.vercel.app" },
  { nome: "Zum Zum Zum Gelateria", slug: "zumzumzum", tipo: "Vitrine Digital", ramo: "Gelato artesanal e waffles em Goiânia.", ramoEn: "Artisan gelato and waffles in Goiânia.", url: "https://zumzumzumgelateria.vercel.app" },
  { nome: "NYLIFE Nutrition", slug: "nylife", tipo: "Vitrine Digital", ramo: "Suplementos de beleza e bem-estar.", ramoEn: "Beauty and wellness supplements.", url: "https://nylife.vercel.app" },
  { nome: "Mimos da Mah", slug: "mimosdamah", tipo: "Vitrine Digital", ramo: "Maquiagem com envio para o Brasil, de Jundiaí.", ramoEn: "Makeup shipped across Brazil, from Jundiaí.", url: "https://mimosdamah.vercel.app" },
  { nome: "Effect Sunglasses", slug: "effectsunglass", tipo: "Vitrine Digital", ramo: "Óculos de sol com proteção UV400.", ramoEn: "Sunglasses with UV400 protection.", url: "https://effectsunglass.vercel.app" },
  { nome: "Aurum Sagrado", slug: "aurum-sagrado", tipo: "Vitrine Digital", ramo: "Sabonetes, velas e banhos ritualísticos feitos à mão.", ramoEn: "Handmade soaps, candles and ritual baths.", url: "https://aurumsagrado.vercel.app" },
  { nome: "Picorelli Premium", slug: "picorelli", tipo: "Vitrine Digital", ramo: "Roupas, tênis, perfumes e correntes em São Paulo.", ramoEn: "Apparel, sneakers, fragrances and chains in São Paulo.", url: "https://picorelli.vercel.app" },
  { nome: "Ortobom Aracaju", slug: "ortobom-aracaju", tipo: "Vitrine Digital", ramo: "Colchões, bases e travesseiros em Aracaju.", ramoEn: "Mattresses, bed bases and pillows in Aracaju.", url: "https://ortobomaracaju.vercel.app" },
  { nome: "Fantoche", slug: "fantoche", tipo: "Vitrine Digital", ramo: "Artigos esportivos e natação em Indaiatuba, SP.", ramoEn: "Sporting and swim goods in Indaiatuba, SP.", url: "https://fantoche.vercel.app" },
  { nome: "Velas Mogi", slug: "velasmogi", tipo: "Vitrine Digital", ramo: "Fábrica de velas em Mogi Mirim, SP.", ramoEn: "Candle factory in Mogi Mirim, SP.", url: "https://velasmogi.vercel.app" },
  { nome: "SacraZen", slug: "sacrazen", tipo: "Vitrine Digital", ramo: "Loja esotérica e religiosa em Uberaba, MG.", ramoEn: "Esoteric and religious shop in Uberaba, MG.", url: "https://sacrazen.vercel.app" },
  { nome: "KANTON", slug: "kanton", tipo: "Vitrine Digital", ramo: "Moda feminina em Santos Dumont, MG.", ramoEn: "Women's fashion in Santos Dumont, MG.", url: "https://usekanton.vercel.app" },
  { nome: "VINCITORE", slug: "vincitore", tipo: "Vitrine Digital", ramo: "Moda masculina com loja física em Gravataí, RS.", ramoEn: "Menswear, physical shop in Gravataí, RS.", url: "https://vincitore-phi.vercel.app" },
  { nome: "LEGADO essentials", slug: "legado-essentials", tipo: "Vitrine Digital", ramo: "Camisetas essenciais em algodão pima.", ramoEn: "Essential tees in pima cotton.", url: "https://legadoessentials.vercel.app" },
  { nome: "Carina Melo Shop", slug: "carinamelo", tipo: "Vitrine Digital", ramo: "Semijoias com garantia de 5 anos, em Maringá.", ramoEn: "Plated jewelry with a 5-year warranty, in Maringá.", url: "https://carinamelo-eta.vercel.app" },
  { nome: "ArraZou! Semijoias", slug: "arrazou", tipo: "Vitrine Digital", ramo: "Semijoias em ouro 18k e prata 925, em Maringá.", ramoEn: "18k gold and 925 silver jewelry in Maringá.", url: "https://arrazou.vercel.app" },
  { nome: "WS Style Men's", slug: "ws-style-mens", tipo: "Vitrine Digital", ramo: "Moda masculina, tênis e relógios.", ramoEn: "Menswear, sneakers and watches.", url: "https://wsstylemens.vercel.app" },
  { nome: "Pisada de Ouro", slug: "pisada-de-ouro", tipo: "Vitrine Digital", ramo: "Tênis e moda com loja física em Maringá.", ramoEn: "Sneakers and fashion, physical shop in Maringá.", url: "https://pisadadeouro.vercel.app" },
  { nome: "DOMDIAS", slug: "dom-dias", tipo: "Vitrine Digital", ramo: "Camisetas e moletons masculinos minimalistas.", ramoEn: "Minimalist men's tees and sweatshirts.", url: "https://dom-dias.vercel.app" },
  { nome: "Dandy Alfaiataria", slug: "dandy", tipo: "Vitrine Digital", ramo: "Alfaiataria masculina sob medida.", ramoEn: "Made-to-measure men's tailoring.", url: "https://dandy-one.vercel.app" },
  { nome: "Exclusive Conceptt", slug: "exclusive-conceptt", tipo: "Vitrine Digital", ramo: "Moda masculina multimarcas.", ramoEn: "Multi-brand menswear.", url: "https://exclusive-concepptt.vercel.app" },
  { nome: "GH Store", slug: "gh-store", tipo: "Vitrine Digital", ramo: "Roupas, perfumes e acessórios em Maringá.", ramoEn: "Apparel, fragrances and accessories in Maringá.", url: "https://g-hstore.vercel.app" },
];
