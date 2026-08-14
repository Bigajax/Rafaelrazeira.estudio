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
  /* Ocupa duas colunas na grade do /portfolio, em vez de uma. É o único
     lugar onde a página tem OPINIÃO sobre o próprio trabalho: dez cards
     do mesmo tamanho leem como catálogo, e catálogo não escolhe nada.

     São exatamente DOIS, e as posições importam: eles têm que estar na 1ª
     e na 4ª linha da lista para as quatro fileiras fecharem certinho em
     três colunas (2+1 / 1+2 / 3 / 3). Marcar um terceiro, ou mudar um de
     lugar, abre buraco na grade. Se a lista crescer, refaça a conta antes
     de mexer aqui. */
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
  { nome: "Xavier's Sports", slug: "xaviers-sports", tipo: "Vitrine Digital", ramo: "Camisas de clubes e seleções, atuais e retrô.", destaque: true, url: "https://xavier-s-sports.vercel.app" },
  { nome: "Star Point", slug: "star-point", tipo: "Vitrine Digital", ramo: "Sneakers e streetwear, com retirada na loja.", url: "https://star-point-wheat.vercel.app" },
  { nome: "Sölo Urb", slug: "solo-urb", tipo: "E-commerce", ramo: "Sneakers, roupas e relógios de várias marcas.", url: "https://s-lo-urb.vercel.app" },
  /* vérít.lab (14/08): veritlab.com.br NÃO resolve DNS, então vale só o
     deploy da Vercel. É vitrine e não e-commerce: o próprio README do
     projeto registra que não existe carrinho nem checkout, e o WhatsApp é
     o único mecanismo de conversão. Repositório em
     C:\Users\Rafael\Desktop\Vérit.lab (Next 16 + Supabase, com painel
     admin próprio para a dona cadastrar peça e marcar vendida). */
  { nome: "vérít.lab", slug: "verit-lab", tipo: "Vitrine Digital", ramo: "Espelhos, quadros e objetos feitos à mão.", destaque: true, url: "https://verit-lab.vercel.app" },
  { nome: "PR Grife", slug: "pr-grife", tipo: "Vitrine Digital", ramo: "Multimarcas com loja física em Maringá.", url: "https://pr-grife.vercel.app" },
  { nome: "Bella Black", slug: "bella-black", tipo: "Vitrine Digital", ramo: "Streetwear e lançamentos, loja física em Maringá.", url: "https://bella-black-three.vercel.app" },
  { nome: "PR Gold", slug: "pr-gold", tipo: "Vitrine Digital", ramo: "Joias em ouro 18K, com confecção própria.", url: "https://prgold.vercel.app" },
  { nome: "Filato Bene", slug: "filato-bene", tipo: "Vitrine Digital", ramo: "Alfaiataria masculina e moda para noivos.", url: "https://filato-bene.vercel.app" },
  { nome: "Lancellotti Tattoo Clinic", slug: "lancellotti", tipo: "Site profissional", ramo: "Tatuagem autoral e piercing, com orçamento online.", url: "https://lancellotti-tattoo-clinic.vercel.app" },
  { nome: "Baixudos.PR", slug: "baixudos", tipo: "Site de evento", ramo: "Encontro de cultura automotiva, com ingresso e inscrição.", url: "https://baixudos.vercel.app" },
];
