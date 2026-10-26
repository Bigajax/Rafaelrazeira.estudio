/* PROVISÓRIO (21/10/2026): a semana 1 do conceito de DESIGN (a segunda troca
   do dia). Cria os posts no Marketing, sobe os prints das referências de
   vitrine como "tela real", tira do calendário os posts da primeira troca
   (sem apagar) e passa o "Dia 1" para quarta.
   Uso: npx tsx scripts/_semear-semana-01.ts */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import type { Estilo, Slide, TipoPeca, Categoria, Pilar } from "../lib/marketing/tipos";

for (const linha of fs.readFileSync(path.resolve(".env.local"), "utf8").split(/\r?\n/)) {
  if (!linha.includes("=") || linha.trim().startsWith("#")) continue;
  const i = linha.indexOf("=");
  const k = linha.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = linha.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const REFS = path.join(process.env.USERPROFILE ?? "", "Desktop", "rafaelrazeira.estúdio", "2 Regras da casa", "referencias");
const ABRE = "Vertical 4:5 (1080x1350) image, no text, no letters, no typography, no logos, no numbers.";

/* os posts da primeira troca: saem do calendário, ficam no Marketing */
const SAEM = ["f1548037-af36-4ec8-9bfc-62ac278564d7", "7ed4506c-2d72-47aa-8a48-5adff0039a4d", "64dd0cde-d3d5-47f0-8baa-da00aae98a6a", "ecde9380-f811-4c8d-9fbf-cfe415ca4585"];
const DIA_1 = "9a073253-10f4-46bb-b9a9-fc19dd170c25";

type Post = {
  data: string;
  tipo: TipoPeca;
  categoria: Categoria;
  pilar: Pilar;
  estilo: Estilo;
  briefing: string;
  gancho: string;
  cta: string;
  hashtags: string;
  legenda: string;
  prompt_capa: string;
  slides: (Slide & { print?: string })[];
  extras?: { slide: number; papel: Slide["papel"]; prompt: string }[];
};

const POSTS: Post[] = [
  {
    data: "2026-10-26",
    tipo: "carrossel",
    categoria: "por_dentro",
    pilar: "curadoria",
    estilo: {
      direcao: "acido",
      foto: "cor",
      respiro: "base",
      biblia: "A young Brazilian man with short dark hair and a thin mustache, oversized cobalt-blue workwear jacket over a white t-shirt. World: flat saturated cobalt-blue studio, acid-green accents, hard direct flash, editorial still-life photography.",
    },
    briefing:
      "A loja grande por dentro: a página do tênis da Nike, vista no computador em 24/09/2026 (prints em 2 Regras da casa/referencias). Quatro detalhes que cabem numa loja de bairro: o tamanho esgotado riscado, o aviso de ajuste em cima da grade, a linha de para quem e para onde embaixo do nome (Adulto / Society, anotada na lista), e a descrição cortada com Ver mais para o botão não descer.",
    gancho: "O que a página do tênis da Nike faz que a sua loja não faz.",
    cta: "Salva para a sua loja",
    hashtags: "#lojadetenis #designdeloja #lojavirtual #ecommerce #varejo #empreendedorismo #webdesign",
    legenda:
      "O que a página do tênis da Nike faz que a sua loja não faz.\n\nO tamanho esgotado não some: aparece riscado. Uma frase em cima da grade avisa como o tênis veste. Embaixo do nome, uma linha diz para quem e para onde. E a descrição tem quatro linhas e um \"ver mais\", para o botão não descer.\n\nNenhum desses detalhes precisa de loja grande. Precisa de decisão.\n\nSalva e confere a página da sua peça. Visto no site da Nike em setembro de 2026.",
    prompt_capa: `${ABRE} The young man holds a large brass magnifying glass up to a single black sneaker standing on a tall white plinth, studying one detail of it with a serious, curious expression. Cobalt-blue seamless backdrop, acid-green rim light on the sneaker, low angle, sharp editorial still-life mood.`,
    slides: [
      { tipo: "capa", papel: "abertura", rotulo: "a loja grande por dentro", manchete: "O que a Nike faz", batida: "na página do tênis", apoio: "4 detalhes que cabem na sua loja" },
      { tipo: "tela", papel: "prova", print: "nike-produto-tamanho.jpg", rotulo: "1 · o tamanho esgotado", manchete: "O 37 acabou.", batida: "Ele não some", apoio: "Aparece riscado. Quem calça 37 entende na hora, em vez de achar que a peça nem existe no número dele." },
      { tipo: "tela", papel: "prova", print: "nike-produto-tamanho.jpg", rotulo: "2 · o aviso de ajuste", manchete: "Uma frase", batida: "em cima da grade", apoio: "“Compre um tamanho maior que o usual.” A pergunta que você mais responde no WhatsApp, respondida antes." },
      { tipo: "texto", papel: "respiro", rotulo: "3 · para quem e para onde", manchete: "Embaixo do nome,", batida: "a linha que decide", apoio: "Na chuteira, “Adulto / Society”. Na roupa, o tamanho que tem. Ache a informação que decide a compra no seu ramo e ponha no cartão." },
      { tipo: "tela", papel: "prova", print: "nike-produto-descricao.jpg", rotulo: "4 · o botão primeiro", manchete: "A descrição", batida: "não empurra o botão", apoio: "Quatro linhas e “ver mais”. O botão fica na tela, e quem quer ler, lê." },
      { tipo: "fecho", papel: "fecho", manchete: "Não precisa", batida: "de loja grande", apoio: "Precisa de decisão. Salva e confere a página da sua peça. Visto no site da Nike em setembro de 2026." },
    ],
  },
  {
    data: "2026-10-27",
    tipo: "carrossel",
    categoria: "percepcao",
    pilar: "comparacao",
    estilo: {
      direcao: "colagem",
      foto: "cor",
      respiro: "base",
      biblia: "The same plain black cotton t-shirt in every image, no print, no logo. World: warm editorial collage photography, saturated tomato-red and sunflower-yellow accents, hard flash with soft colored gels.",
    },
    briefing:
      "Por que parece barata: a mesma camiseta parecendo de R$ 49 ou de R$ 189. Três comparações (o fundo da foto, o nome da peça, o preço à vista) e uma regra de cor vista na Piet (o laranja só no botão e no tamanho escolhido). Fundo cinza liso: padrão visto em New Balance, Nike e Piet. Nome no formato peça, nome, cor: o da Piet.",
    gancho: "A mesma camiseta. Parece de R$ 49 ou de R$ 189?",
    cta: "",
    hashtags: "#lojaderoupas #branding #designdeloja #lojavirtual #moda #empreendedorismo #varejo",
    legenda:
      "A mesma camiseta. Parece de R$ 49 ou de R$ 189?\n\nO que muda não é a peça. É o fundo da foto, o nome que ela ganha e o preço aparecendo ou não.\n\nNa cama, amassada, ela é qualquer camiseta. No cinza liso, passada, com nome e preço à vista, ela é uma peça que alguém escolheu.\n\nManda para quem tem loja e acha que o problema é o preço.",
    prompt_capa: `${ABRE} Two identical plain black t-shirts side by side as a diptych: on the left, crumpled on an unmade bed under dim yellowish bedroom light, shot with harsh phone flash; on the right, neatly pressed and laid flat on a light grey seamless studio backdrop under clean soft light. Same shirt, opposite perceived value, playful editorial contrast, warm tomato-red tape strips holding the two halves like a collage.`,
    slides: [
      { tipo: "capa", papel: "abertura", rotulo: "por que parece barata", manchete: "A mesma camiseta.", batida: "R$ 49 ou R$ 189?", apoio: "O que muda não é a peça" },
      { tipo: "comparacao", papel: "contraste", rotulo: "1 · o fundo", manchete: "O fundo", batida: "vende antes", ruim: "Na cama, amassada", bom: "No cinza liso, passada" },
      { tipo: "comparacao", papel: "respiro", rotulo: "2 · o nome", manchete: "O nome", batida: "diz o que é", ruim: "Camiseta preta", bom: "Camiseta Boxy, Algodão Pesado, Preta", apoio: "Peça, nome, cor: o formato da Piet. A busca acha, e o cliente entende o que está comprando." },
      { tipo: "comparacao", papel: "respiro", rotulo: "3 · o preço", manchete: "O preço", batida: "à vista", ruim: "“Valor no direct”", bom: "R$ 189 · 3x de R$ 63 · P M G", apoio: "Preço escondido parece preço que muda conforme a cara do cliente." },
      { tipo: "texto", papel: "respiro", rotulo: "4 · uma cor forte", manchete: "A cor mais forte", batida: "só onde se clica", apoio: "Na página da Piet, o laranja aparece no botão e no tamanho escolhido, e em mais nada. O olho sabe onde ir, e a página parece arrumada." },
      { tipo: "fecho", papel: "fecho", manchete: "O preço é o mesmo.", batida: "A percepção não", apoio: "Manda para quem tem loja e acha que o problema é o preço." },
    ],
  },
  {
    data: "2026-10-29",
    tipo: "carrossel",
    categoria: "antes_depois",
    pilar: "case",
    estilo: { direcao: "acido", foto: "cor", respiro: "base" },
    briefing:
      "SÓ PUBLICAR COM O OK DA FULL TIME (a autorização de imagem ainda está pendente na ficha dela). Antes e depois: a Full Time Skateboards como chegava (o Instagram @fulltimeskateboards e o link da bio) e como ficou (a vitrine em fulltimeskateboards.com.br), em três decisões de design. Os prints da vitrine sobem pelo script; o print do Instagram é do Rafael.",
    gancho: "A Full Time: do Instagram à vitrine, em 3 decisões.",
    cta: "Salva para a sua loja",
    hashtags: "#skateshop #lojadetenis #designdeloja #antesedepois #lojavirtual #webdesign #streetwear",
    legenda:
      "A Full Time Skateboards antes e depois.\n\nAntes, a peça morava no feed, e o cliente perguntava no direct. Depois, cada peça tem página, tamanho e o pedido chega pronto no WhatsApp.\n\nTrês decisões fizeram a diferença. Estão no carrossel.\n\nSalva para pensar a sua loja.",
    prompt_capa: "",
    slides: [
      { tipo: "capa", papel: "abertura", rotulo: "antes e depois", manchete: "A Full Time:", batida: "do Instagram à vitrine", apoio: "3 decisões de design" },
      { tipo: "tela", papel: "prova", rotulo: "antes", manchete: "A peça", batida: "morava no feed", apoio: "Para saber preço e tamanho, o cliente perguntava no direct. [print do Instagram: Rafael sobe]" },
      { tipo: "tela", papel: "prova", print: "VITRINE_HOME", rotulo: "depois", manchete: "A loja", batida: "tem endereço", apoio: "fulltimeskateboards.com.br: a vitrine com a cara da loja, no domínio dela." },
      { tipo: "tela", papel: "prova", print: "VITRINE_PECA", rotulo: "decisão 1", manchete: "Cada peça", batida: "tem página", apoio: "Foto, preço e tamanho na mesma tela, sem precisar perguntar." },
      { tipo: "texto", papel: "respiro", rotulo: "decisão 2", manchete: "O tamanho", batida: "que acabou fica riscado", apoio: "O cliente vê o que tem antes de chamar, e a conversa já começa no número certo." },
      { tipo: "texto", papel: "respiro", rotulo: "decisão 3", manchete: "O pedido", batida: "chega pronto", apoio: "O botão abre o WhatsApp da loja com a peça e o tamanho escritos." },
      { tipo: "fecho", papel: "fecho", manchete: "A mesma loja.", batida: "Outro endereço", apoio: "Salva para pensar a sua." },
    ],
  },
  {
    data: "2026-10-30",
    tipo: "carrossel",
    categoria: "por_dentro",
    pilar: "curadoria",
    estilo: {
      direcao: "colagem",
      foto: "cor",
      respiro: "base",
      biblia: "A stylish Brazilian woman in her thirties with short platinum hair, printed tropical midi skirt, gold earrings. World: warm sunflower-yellow and tomato-red collage editorial photography, hard flash with soft colored gels.",
    },
    briefing:
      "A loja grande por dentro: a página da saia na Farm, vista em 24/09/2026 (print em 2 Regras da casa/referencias/farm-produto.jpg). O parcelamento embaixo do preço, a referência visível com botão de copiar, o Ver medidas da peça ao lado do tamanho, e a navegação por faixa de preço na seção de presentes (anotada na nota). E o que cada um vira numa loja de bairro.",
    gancho: "O que a Farm faz na página da peça que cabe na sua loja.",
    cta: "Salva para a sua loja",
    hashtags: "#lojaderoupas #modafeminina #designdeloja #lojavirtual #ecommerce #varejo #empreendedorismo",
    legenda:
      "O que a Farm faz na página da peça que cabe na sua loja.\n\nO parcelamento logo embaixo do preço. A referência da peça à vista, com botão de copiar. As medidas a um toque, ao lado do tamanho. E, nos presentes, a loja dividida por faixa de preço.\n\nNada disso é tecnologia cara. É a resposta para as perguntas que chegam no seu direct, escrita antes.\n\nSalva e confere a sua. Visto no site da Farm em setembro de 2026.",
    prompt_capa: `${ABRE} The woman stands confidently in front of a giant oversized clothing rack made of sunflower-yellow pipes, holding a single printed skirt on a hanger out toward the camera like an offer, slight smile, playful scale, tomato-red backdrop, hard flash.`,
    slides: [
      { tipo: "capa", papel: "abertura", rotulo: "a loja grande por dentro", manchete: "O que a Farm faz", batida: "na página da peça", apoio: "4 detalhes que cabem na sua loja" },
      { tipo: "tela", papel: "prova", print: "farm-produto.jpg", rotulo: "1 · o parcelamento", manchete: "Embaixo do preço,", batida: "as vezes", apoio: "“ou 3x de R$ 99,50”. Só se a sua loja parcela: aí é a primeira dúvida respondida." },
      { tipo: "tela", papel: "prova", print: "farm-produto.jpg", rotulo: "2 · a referência", manchete: "A referência", batida: "à vista", apoio: "Com botão de copiar. Quando o cliente pergunta “e aquela outra?”, o código resolve a conversa." },
      { tipo: "tela", papel: "prova", print: "farm-produto.jpg", rotulo: "3 · as medidas", manchete: "As medidas", batida: "a um toque", apoio: "“Ver medidas da peça”, ao lado do tamanho. Em roupa, é a diferença entre o pedido certo e a troca." },
      { tipo: "texto", papel: "respiro", rotulo: "4 · por faixa de preço", manchete: "Até R$ 50,", batida: "até R$ 100", apoio: "Nos presentes, a Farm divide a loja por faixa de preço. Em loja de presente e de semijoia, é o filtro que o cliente quer." },
      { tipo: "fecho", papel: "fecho", manchete: "Não é", batida: "tecnologia cara", apoio: "É a resposta escrita antes da pergunta. Visto no site da Farm em setembro de 2026." },
    ],
  },
];

async function subirImagem(id: string, buf: Buffer, nome: string) {
  const webp = await sharp(buf).resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
  const caminho = `${id}/${nome}-${Date.now()}.webp`;
  const up = await sb.storage.from("marketing").upload(caminho, webp, { contentType: "image/webp" });
  if (up.error) throw new Error(`upload: ${up.error.message}`);
  return caminho;
}

async function printDaVitrine(qual: string): Promise<Buffer | null> {
  const arq = path.resolve(`.tmp-vitrine-${qual}.png`);
  return fs.existsSync(arq) ? fs.readFileSync(arq) : null;
}

async function main() {
  const { data: dono } = await sb.from("mkt_pecas").select("owner_id").limit(1).single();
  const owner = dono!.owner_id as string;

  for (const id of SAEM) await sb.from("mkt_pecas").update({ posta_em: null }).eq("id", id);
  await sb.from("mkt_pecas").update({ posta_em: "2026-10-28", categoria: "construcao" }).eq("id", DIA_1);
  console.log("primeira troca fora do calendário; Dia 1 em 28/10");

  for (const p of POSTS) {
    const { data: existente } = await sb.from("mkt_pecas").select("id").eq("posta_em", p.data).eq("gancho", p.gancho).maybeSingle<{ id: string }>();
    if (existente) {
      console.log(`${p.data} já existe -> ${existente.id}`);
      continue;
    }
    const { data: peca, error } = await sb
      .from("mkt_pecas")
      .insert({
        owner_id: owner,
        tipo: p.tipo,
        categoria: p.categoria,
        pilar: p.pilar,
        estilo: { ...p.estilo, extras: (p.extras ?? []).map((x) => ({ slide: x.slide, papel: x.papel, prompt: x.prompt })) },
        briefing: p.briefing,
        gancho: p.gancho,
        cta: p.cta,
        hashtags: p.hashtags,
        legenda: p.legenda,
        slides: [],
        prompt_capa: p.prompt_capa,
        posta_em: p.data,
        status: "rascunho",
        notas: { estrategista: "Semana 1 do conceito de design de 21/10/2026. Observações de site só do que foi visto e anotado em 2 Regras da casa/referencias-de-vitrine.md." },
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !peca) throw new Error(`mkt_pecas: ${error?.message}`);

    const slides: Slide[] = [];
    for (const s of p.slides) {
      const { print, ...resto } = s;
      let img: string | undefined;
      if (print?.startsWith("VITRINE_")) {
        const buf = await printDaVitrine(print === "VITRINE_HOME" ? "home" : "peca");
        if (buf) img = await subirImagem(peca.id, buf, "img");
      } else if (print) {
        img = await subirImagem(peca.id, fs.readFileSync(path.join(REFS, print)), "img");
      }
      slides.push(img ? { ...resto, img } : resto);
    }
    await sb.from("mkt_pecas").update({ slides }).eq("id", peca.id);
    console.log(`${p.data} ${p.gancho.slice(0, 55)} -> ${peca.id}`);
  }
}

main().catch((e) => {
  console.error("ERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
});
