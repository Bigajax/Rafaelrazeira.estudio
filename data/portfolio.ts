/* Os nove projetos entregues pelo estúdio, na ordem em que aparecem no
   /portfolio: as duas vitrines que a landing já usa como prova primeiro,
   depois as demais lojas, e por fim os projetos que não são vitrine.
   Todos estão no ar. Atenção aos endereços: bellablack.com.br e
   xavierssports.com.br não resolvem DNS, e o deploy antigo do Star Point
   (starpoint-maringa) foi apagado, então valem só as URLs abaixo.
   Um projeto sem `url` sai com o card sem botão e sem o selo NO AR. A capa
   vem de /public/portfolio/{slug}.webp, gerada por
   scripts/capture-portfolio.mjs. */

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
  { nome: "Star Point", slug: "star-point", tipo: "Vitrine Digital", url: "https://star-point-wheat.vercel.app" },
  { nome: "Bella Black", slug: "bella-black", tipo: "Vitrine Digital", url: "https://bella-black-three.vercel.app" },
  { nome: "Sölo Urb", slug: "solo-urb", tipo: "E-commerce", url: "https://s-lo-urb.vercel.app" },
  { nome: "Lancellotti Tattoo Clinic", slug: "lancellotti", tipo: "Site profissional", url: "https://lancellotti-tattoo-clinic.vercel.app" },
  { nome: "Baixudos.PR", slug: "baixudos", tipo: "Site de evento", url: "https://baixudos.vercel.app" },
];
