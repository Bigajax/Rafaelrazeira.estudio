/* O texto do /en/portfolio. Mesmas chaves do pt (o tipo garante); o que
   muda de conteúdo, além da língua: o contato é por e-mail (não há
   WhatsApp nem Stripe na versão em inglês desta primeira fase) e o
   rodapé só aponta páginas que existem em inglês. */
import type { PortfolioMessages } from "./portfolio.pt";

export const en: PortfolioMessages = {
  lang: "en",
  meta: {
    title: "Portfolio",
    description: "Projects delivered by the studio: digital storefronts, e-commerce and websites for real businesses. All live, all open on your phone.",
  },
  header: { status: "SAME-DAY REPLY", cta: "I WANT MINE ↓", logoHref: "/en/portfolio" },
  hero: {
    eyebrow: "STUDIO PORTFOLIO",
    projetos: "projects",
    faixa: "All open right now",
    placar: "{n} of {m} live",
    lead: "Storefronts, e-commerce and websites made in this studio. Tap any cover: the site opens on your phone, with real products and prices.",
  },
  numeros: ["zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"],
  tipos: {
    "Vitrine Digital": "Digital Storefront",
    "E-commerce": "E-commerce",
    "Site profissional": "Business website",
    "Site de evento": "Event website",
  },
  card: {
    live: "LIVE",
    semEndereco: "no public address",
    alt: "First screen of the {nome} website",
    abrir: "Open the {nome} website in a new tab",
  },
  contato: {
    eyebrow: "DIGITAL STOREFRONT · FULL PROJECT",
    titulo1: "The next one could",
    titulo2: "be yours",
    lead: "Catalog built, order arriving ready in your inbox and the store live in 7 business days. Email me and I'll show you how yours would look.",
    cta: "EMAIL ME ↗",
    mensagem: "Digital storefront for my business",
  },
  footer: {
    links: [
      { label: "DIGITAL STOREFRONT", href: "/en/vitrine-digital" },
      { label: "LANDING PAGES", href: "/en/landing-page" },
    ],
    copyright: "© 2026 RAFAEL RAZEIRA STUDIO",
  },
  bar: { titulo: "DIGITAL STOREFRONT", sub: "Live in 7 business days", cta: "I WANT MINE ↓" },
};
