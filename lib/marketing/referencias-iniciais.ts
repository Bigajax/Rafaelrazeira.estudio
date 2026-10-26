/* ============================================================
   AS REFERÊNCIAS DO CONCEITO DE 21/10/2026 (temas de design)

   Trocam a carga de 01/10 (23 perfis por editoria). Saíram de três
   pesquisas de 21/10: perfis brasileiros lidos no Instagram, com a mediana
   dos últimos 24 a 32 reels de cada um e o pico acima dela; perfis de
   fora; e o que o lojista digita no Google. Só entra quem tem post muito
   acima da própria mediana, ou um formato que se repete. A versão longa,
   com as fontes, mora no cofre: `1 Processos/produzir-conteudo-da-marca.md`.

   "Provável impulsionado" é inferência: muita view e menos de 0,5% de
   curtidas. Seguidor e view não provam venda; são o que é público.
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
const LIDO = "lido no Instagram em 21/10/2026";

export const REFERENCIAS_INICIAIS: Referencia[] = [
  
  /* ---------- A loja grande por dentro e por que parece barata ---------- */
  { tipo: "perfil", categoria: "percepcao", nome: "@williamoliveira.iv", link: ig("williamoliveira.iv"), por_que: "analisa o perfil de uma loja real na tela (“teu perfil tá espantando cliente”) e compara loja que trava com loja que vende", copiar: "a loja real na tela, o erro apontado e o que fazer; ele analisa o Instagram, o site ninguém analisa", nao_copiar: "os cortes de podcast sem contexto", evidencia: `“Como utilizar cada formato na sua loja on-line” (22/09/2026): 549 mil views, 1.904 comentários, 83x a mediana de 6,6 mil; ${LIDO}` },
  { tipo: "perfil", categoria: "percepcao", nome: "@abrecarvalho", link: ig("abrecarvalho"), por_que: "“como vender [categoria] pela internet”, uma categoria por vídeo; é o concorrente mais parecido com o estúdio, em escala pequena", copiar: "uma categoria por vídeo; tênis e moda estão livres", nao_copiar: "nada específico", evidencia: `“Como vender perfume pela internet” (21/09/2026): 13,1 mil views, 10x a mediana de 1,3 mil, com 6 mil seguidores; ${LIDO}` },
  { tipo: "perfil", categoria: "por_dentro", nome: "Roast My Landing Page (gringo)", link: "https://www.indiehackers.com/product/roast-my-landing-page", por_que: "200 páginas analisadas em 12 meses viraram “16 padrões que se repetem” e um negócio", copiar: "o agregado: muitas lojas lidas, o número do que se repete, sem expor ninguém", nao_copiar: "o “roast” agressivo: no Brasil o lojista é o cliente", evidencia: "cerca de £70 mil em 12 meses, segundo o próprio fundador no Indie Hackers (2021)" },

  
  { tipo: "perfil", categoria: "por_dentro", nome: "Marketing Examples (gringo)", link: "https://marketingexamples.com/", por_que: "um print real, uma flecha, uma regra de uma linha: o exemplo comentado que vira carrossel", copiar: "o print do site da marca com a flecha no detalhe e a regra embaixo", nao_copiar: "o assunto de marketing de software", evidencia: "mais de 130 mil assinantes e mais de 110 mil seguidores sem anúncio (TripleDart, yespress)" },
  { tipo: "perfil", categoria: "percepcao", nome: "@marcelokimuradesign", link: ig("marcelokimuradesign"), por_que: "o maior perfil brasileiro de design de marca: a análise de uma marca real em 5 a 8 telas", copiar: "o que a marca fez, por que funciona, o que você leva disso", nao_copiar: "o conteúdo para designer (carreira); o público aqui é quem contrata", evidencia: "431 mil seguidores em 01/10/2026; Reportei cita mais de 419 mil" },

  /* ---------- O estúdio construindo ---------- */
  { tipo: "perfil", categoria: "construcao", nome: "@giovannazocchio_", link: ig("giovannazocchio_"), por_que: "o diário de quem está criando a marca de atacado no Brás: a audiência acompanha a jornada", copiar: "a jornada contada enquanto acontece; é o modelo mais replicável da pesquisa", nao_copiar: "nada específico", evidencia: `“A gente vive o Brás todos os dias” (01/10/2026): 224 mil views; dois reels de 29/09 com 240 e 208 mil; 28,3 mil seguidores, mediana 10,7 mil; ${LIDO}` },
  { tipo: "perfil", categoria: "construcao", nome: "@joaoecodrop", link: ig("joaoecodrop"), por_que: "dono de loja online que mostra a prova física do trabalho: pedidos embalados, container, estoque", copiar: "a prova física no quadro; no estúdio, a tela da loja recebendo o pedido", nao_copiar: "a ostentação de faturamento", evidencia: `“Embalando 600 pedidos hoje” (28/09/2026): 102 mil views; o pico, “Como ajudei meus pais com R$ 200 mil”, 2,4 mi; mediana 22,1 mil; ${LIDO}` },
  { tipo: "perfil", categoria: "construcao", nome: "DesignJoy (gringo)", link: "https://x.com/BrettFromDJ", por_que: "designer solo com preço fixo que abre a receita e o bastidor de cliente; a maior parte dos clientes vem do conteúdo", copiar: "o estúdio por dentro, com o número real (decisão do Rafael se abre o Caixa)", nao_copiar: "o print que expõe cliente e o sorteio “siga e comente”", evidencia: "170.979 seguidores no X (SuperX, outubro de 2026)" },

  /* ---------- Percepção e antes e depois ---------- */
  { tipo: "perfil", categoria: "percepcao", nome: "@uana_amorim", link: ig("uana_amorim"), por_que: "a fundadora de um e-commerce de moda contando o bastidor e a própria história, inclusive o branding que ela não conhecia", copiar: "“eu ainda não sabia o que era branding”: a dor que um estúdio resolve, na voz de quem viveu", nao_copiar: "a escala", evidencia: `“Eu ainda não sabia o que era branding!” (01/10/2026): 396 mil views; mediana 32,2 mil; 813 mil seguidores; ${LIDO}` },
  { tipo: "perfil", categoria: "antes_depois", nome: "@donasdeloja", link: ig("donasdeloja"), por_que: "a história de uma loja real contada em off, para donas de loja", copiar: "a história da loja cliente: como nasceu e como ficou o site", nao_copiar: "o formato de curso", evidencia: `“Você já conhecia a história da @nativozza” (10/10/2026): 72,7 mil views, 7x a mediana de 10,3 mil; ${LIDO}` },

  /* ---------- Os formatos que se repetem ---------- */
  { tipo: "formato", categoria: null, nome: "Carrossel para ser visto e salvo", link: "", por_que: "em conta de 1 a 5 mil seguidores o carrossel tem mais views que o Reels, e 9x mais salvamentos que a imagem", copiar: "um print real, uma flecha, uma regra por tela (o estilo do Marketing Examples) e o pedido de salvar", nao_copiar: "tela cheia de texto corrido", evidencia: "mediana de 993 views contra 580 do Reels (Socialinsider, 35 mi de posts de 2025); salvamentos (Metricool, 2026)" },
  { tipo: "formato", categoria: null, nome: "Reels de 45 a 60 segundos", link: "", por_que: "é a faixa que mais rende para alcançar quem não segue; acima de 3 minutos não vai para quem não segue", copiar: "a tela da loja e o Rafael juntos desde o primeiro quadro", nao_copiar: "rosto sozinho nos 3 primeiros segundos (o h27u perdeu 74% ali)", evidencia: "10.374 views de mediana contra 4.700 abaixo de 30 s (Socialinsider, 9,77 mi de Reels, jan a jun/2026)" },
  { tipo: "formato", categoria: null, nome: "Feito para encaminhar", link: "", por_que: "o envio por DM é o sinal que mais pesa para chegar em quem não segue", copiar: "o fecho diz para quem mandar: “manda para quem tem loja e vive respondendo ‘valor?’”", nao_copiar: "fecho genérico", evidencia: "Adam Mosseri, chefe do Instagram, janeiro de 2025" },
  { tipo: "formato", categoria: null, nome: "O vídeo descobre, o site fecha", link: "", por_que: "o fundador da PopSockets diz que as pessoas acham a marca no vídeo e compram no site", copiar: "o argumento da loja própria para quem só tem Instagram", nao_copiar: "a palhaçada sem ligação com o produto", evidencia: "Modern Retail, 29/07/2026" },

  /* ---------- O que evitar ---------- */
  { tipo: "evitar", categoria: null, nome: "Portfólio rolando como conteúdo", link: "", por_que: "mostrar o site entregue rolando na tela só tem alcance pago, e nenhum interesse", copiar: "a análise com número no lugar do portfólio", nao_copiar: "o site rolando sozinho", evidencia: "@webleticiaa_, “Site feito para perfumaria árabe” (29/05/2026): 100 mil views e 40 curtidas" },
  { tipo: "evitar", categoria: null, nome: "Repostar referência sem comentário", link: "", por_que: "desde 30/04/2026 o Instagram para de recomendar a quem não segue quem posta majoritariamente conteúdo alheio, carrossel e foto incluídos", copiar: "a referência com a leitura própria por cima", nao_copiar: "o repost com crédito", evidencia: "Planoly, 05/05/2026; PetaPixel, 30/04/2026" },
  { tipo: "evitar", categoria: null, nome: "Insulto, promessa de renda e ostentação", link: "", por_que: "funciona no público de renda extra, não no lojista que é cliente", copiar: "o gancho provocativo de uma frase, sem ofender", nao_copiar: "“você é burro”, “ganhe em casa”, o faturamento de vitrine", evidencia: "@chauldigital, 1,1 mi views com “Infelizmente você é burro” (05/09/2026): público de renda extra" },
  { tipo: "evitar", categoria: null, nome: "“Comenta PALAVRA que eu te mando” (a decidir)", link: "", por_que: "multiplica comentários (1.904 num reel do @williamoliveira.iv), mas a estratégia de 25/08 proibiu porque traz lead frio", copiar: "se o Rafael aprovar: testar uma vez, com material que só lojista quer, e medir quantos viram conversa", nao_copiar: "a isca em todo post", evidencia: "decisão pendente do Rafael desde 21/10/2026" },
];
