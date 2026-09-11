/* ============================================================
   O TEXTO DO /portfolio, em português

   Regra dos dicionários (ver components/i18n.tsx): só strings, números
   e arrays. Onde um número entra no meio da frase, a string leva {n} /
   {m} / {nome} e o componente troca com `preencher()`. O tipo nasce
   daqui (`typeof pt`) e o inglês é obrigado a ter as mesmas chaves.

   A lista `numeros` vai até vinte porque um portfólio de link da bio que
   passar disso vira outra coisa, e aí a manchete muda junto.
   ============================================================ */
import type { Projeto } from "@/data/portfolio";
import type { Lang } from "@/lib/idiomas";

export const pt = {
  lang: "pt" as Lang,
  meta: {
    title: "Portfólio",
    description: "Projetos entregues pelo estúdio: vitrines digitais, e-commerce e sites para negócios reais. Todos no ar, e todos abrem no seu celular.",
  },
  header: { status: "RESPOSTA NO MESMO DIA", cta: "QUERO A MINHA ↓", logoHref: "/estudio/" },
  hero: {
    eyebrow: "PORTFÓLIO DO ESTÚDIO",
    /* "{n} projetos." com o número por extenso vindo de `numeros` */
    projetos: "projetos",
    faixa: "Todos abrem agora",
    placar: "{n} de {m} no ar",
    lead: "Vitrines, e-commerce e sites feitos neste estúdio. Toque em qualquer capa: o site abre no seu celular, com produto e preço reais.",
  },
  numeros: ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove", "vinte"],
  tipos: {
    "Vitrine Digital": "Vitrine Digital",
    "E-commerce": "E-commerce",
    "Site profissional": "Site profissional",
    "Site de evento": "Site de evento",
  } satisfies Record<Projeto["tipo"], string>,
  card: {
    live: "NO AR",
    semEndereco: "sem endereço público",
    alt: "Primeira dobra do site da {nome}",
    abrir: "Abrir o site da {nome} em nova aba",
  },
  contato: {
    eyebrow: "VITRINE DIGITAL · PROJETO COMPLETO",
    titulo1: "A próxima pode",
    titulo2: "ser a sua",
    lead: "Catálogo montado, WhatsApp integrado e a loja no ar em 7 dias úteis. Me chama que eu te mostro como fica a sua.",
    cta: "FALAR COMIGO NO WHATSAPP ↗",
    /* a mensagem que abre no WhatsApp (pt) ou o assunto do e-mail (en) */
    mensagem: "Olá, Rafael! Vi o portfólio do estúdio e quero uma vitrine digital para o meu negócio.",
  },
  footer: {
    links: [
      { label: "INÍCIO", href: "/estudio/" },
      { label: "VITRINE DIGITAL", href: "/vitrine-digital/" },
      { label: "SERVIÇOS", href: "/servicos" },
      { label: "E-COMMERCE", href: "/e-commerce" },
    ],
    copyright: "© 2026 RAFAEL RAZEIRA ESTÚDIO",
  },
  bar: { titulo: "VITRINE DIGITAL", sub: "No ar em 7 dias úteis", cta: "QUERO A MINHA ↓" },
};

export type PortfolioMessages = typeof pt;
