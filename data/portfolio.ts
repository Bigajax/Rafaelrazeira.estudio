/* Os nove projetos entregues pelo estúdio, na ordem em que aparecem no
   /portfolio: as duas vitrines que a landing já usa como prova primeiro,
   depois os demais no ar, e por último os entregues sem endereço público
   (Star Point aguarda liberação do cliente; a Bella Black ainda não foi
   publicada — bellablack.com.br no ar hoje é de outra empresa).
   Sem `url`, o card sai sem botão e sem selo de NO AR. A capa vem de
   /public/portfolio/{slug}.webp, gerada por scripts/capture-portfolio.mjs. */

export type Projeto = {
  nome: string;
  slug: string;
  tipo: "Vitrine Digital" | "E-commerce" | "Site profissional" | "Site de evento";
  url?: string;
};

export const projetos: Projeto[] = [
  { nome: "Xavier's Sports", slug: "xaviers-sports", tipo: "Vitrine Digital", url: "https://xavier-s-sports.vercel.app" },
  { nome: "PR Grife", slug: "pr-grife", tipo: "Vitrine Digital", url: "https://pr-grife.vercel.app" },
  { nome: "PR Gold", slug: "pr-gold", tipo: "Vitrine Digital", url: "https://prgold.vercel.app" },
  { nome: "Filato Bene", slug: "filato-bene", tipo: "Vitrine Digital", url: "https://filato-bene.vercel.app" },
  { nome: "Sölo Urb", slug: "solo-urb", tipo: "E-commerce", url: "https://s-lo-urb.vercel.app" },
  { nome: "Lancellotti Tattoo Clinic", slug: "lancellotti", tipo: "Site profissional", url: "https://lancellotti-tattoo-clinic.vercel.app" },
  { nome: "Baixudos.PR", slug: "baixudos", tipo: "Site de evento", url: "https://baixudos.vercel.app" },
  { nome: "Star Point", slug: "star-point", tipo: "Vitrine Digital" },
  { nome: "Bella Black", slug: "bella-black", tipo: "Vitrine Digital" },
];
