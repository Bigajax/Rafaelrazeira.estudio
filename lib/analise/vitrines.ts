/* ============================================================
   AS VITRINES QUE PAGARAM (14/10/2026): o cadastro da análise.

   O Rafael: "só as 7 que pagaram". A análise olha o que está na mão do
   estúdio consertar (a saúde do site, a montagem, o catálogo) e junta os
   números que viram copy e anúncio. Cada vitrine aqui diz onde ela mora:
   - `url`: o endereço em que a VITRINE está no ar (nem sempre o domínio
     próprio); conferir no registro.br antes de escrever um domínio aqui:
     o arenaimportsfloripa.com.br é um site antigo no Wix (o da Arena é o
     .com, sem .br) e o xavierssports.com.br nunca foi registrado, era o
     exemplo do template (14/10);
   - `dominio`: o domínio próprio da loja, quando ela tem um; null quando
     ela só tem o .vercel.app;
   - `pasta`: a pasta em ~/Desktop/vitrines (o git, o pacote, o .env.local);
   - `perf`: o slug da loja no Performance (perf_lojas).
   Loja nova que pagar entra aqui.
   ============================================================ */

export type Vitrine = {
  nome: string;
  perf: string;
  pasta: string;
  url: string;
  dominio: string | null;
  /** o painel vem do @vitrine/plataforma */
  pacote: boolean;
};

export const VITRINES: Vitrine[] = [
  { nome: "Arena Imports Floripa", perf: "arena-imports-floripa", pasta: "arena-imports-floripa", url: "https://www.arenaimportsfloripa.com", dominio: "www.arenaimportsfloripa.com", pacote: true },
  { nome: "Japa Modas", perf: "japa-modas", pasta: "japa-modas", url: "https://japamodasurf.com.br", dominio: "japamodasurf.com.br", pacote: true },
  { nome: "SneakerSpot", perf: "sneakerspot", pasta: "sneakerspot", url: "https://sneakerspotbr.com.br", dominio: "sneakerspotbr.com.br", pacote: true },
  { nome: "Full Time Skateboards", perf: "fulltime", pasta: "fulltime", url: "https://fulltimeskateboards.com.br", dominio: "fulltimeskateboards.com.br", pacote: true },
  { nome: "Xavier's Sports", perf: "xaviers-sports", pasta: "Xavier's Sports", url: "https://xavier-s-sports.vercel.app", dominio: null, pacote: true },
  { nome: "M&M Calçados", perf: "mm-calcados", pasta: "mm-calcados", url: "https://mm-calcados.vercel.app", dominio: null, pacote: true },
  { nome: "Be Bless Store", perf: "be-bless", pasta: "be-bless", url: "https://beblesstore.vercel.app", dominio: null, pacote: false },
];
