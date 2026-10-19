import type { Metadata } from "next";
import Link from "next/link";
import { OFERTA } from "@/lib/oferta";
import { SITE } from "@/lib/idiomas";
import { Moldura } from "@/components/casos/Moldura";
import s from "@/app/(pt)/portfolio/portfolio.module.css";
import c from "@/app/(pt)/casos/casos.module.css";

/* ============================================================
   QUANTO CUSTA UM SITE PARA LOJA (19/10/2026)

   A página que responde a busca que o dono de loja faz antes de chamar
   alguém: quanto custa. Quase ninguém publica o número, e publicar é o
   posicionamento da casa ("o designer que mostra o número").

   Nenhum número daqui é escrito à mão: a vitrine vem de lib/oferta.ts,
   o mesmo lugar que a /vitrine-digital lê. O e-commerce repete o "a
   partir de R$ 3.499" que a /e-commerce já publica; se ele mudar lá,
   muda aqui (ECOMMERCE_A_PARTIR, logo abaixo).
   Nada de preço de concorrente: muda todo mês e seria chute.
   ============================================================ */
const v = OFERTA.pt.vitrine;
const R = OFERTA.pt.preco;
const ECOMMERCE_A_PARTIR = 3499;

const titulo = "Quanto custa um site para loja: o preço real de uma vitrine digital";
const descricao = `Uma vitrine digital para loja custa ${R(v.total)}, uma vez só e sem mensalidade: ${R(v.entrada)} para começar e o resto depois de aprovar. O que entra, o que não entra e quando vale um e-commerce.`;

export const metadata: Metadata = {
  title: { absolute: titulo },
  description: descricao,
  alternates: { canonical: "/quanto-custa-site-para-loja" },
  openGraph: { title: titulo, description: descricao, type: "article", locale: "pt_BR" },
};

const entra = [
  ["Design personalizado", "Visual feito para a identidade da sua loja, não um modelo pronto."],
  ["Catálogo e páginas de produto", "Página inicial, categorias e uma página por produto, com fotos, preço e tamanhos."],
  ["Até 20 produtos cadastrados por mim", "Os outros você cadastra no painel, sem limite."],
  ["Pedido pronto no WhatsApp", "A mensagem chega com o produto já identificado."],
  ["Painel de gestão", "Você troca preço e foto, marca esgotado e cadastra produto novo pelo celular."],
  ["Publicação e uma rodada de ajustes", "A vitrine no ar, com endereço configurado, depois da sua revisão."],
  ["Entrega em até 7 dias úteis", "Contados a partir do envio de todo o material da loja."],
];

const naoEntra = [
  ["Domínio próprio", "É opcional, tem custo anual e é pago direto no registrador, no nome da loja."],
  ["Pagamento dentro do site", "A vitrine leva o pedido ao WhatsApp, onde você combina pagamento e entrega. Receber no próprio site é e-commerce."],
  ["Cadastro de mais de 20 produtos por mim", "Acima disso, combinamos à parte, ou você mesmo cadastra no painel."],
  ["Mudanças depois da entrega", "Você pede quando precisar e eu orço na hora. Nada é obrigatório."],
];

const perguntas = [
  { p: "Existe mensalidade?", r: `Não. A vitrine custa ${R(v.total)} uma vez só. O único custo recorrente possível é o domínio próprio, que é opcional e pago direto no registrador.` },
  { p: "Preciso pagar tudo antes?", r: `Não. São ${R(v.entrada)} no Pix para começar e ${R(v.saldo)} só depois de você ver e aprovar o projeto, no cartão em até 4x ou no Pix.${v.avista ? ` À vista no Pix, o total fica em ${R(v.avista)}.` : ""}` },
  { p: `Por que ${R(v.total)} e não R$ 5 mil?`, r: "Porque não tem agência no meio. Você fala comigo do primeiro oi até a loja no ar, sem atendimento, sem gerente de projeto e sem repasse. O processo é o mesmo em todos os projetos, então o que sobra de custo é o meu tempo." },
  { p: "Dá para ver antes de pagar?", r: "Dá. Eu desenho a vitrine da sua loja com os seus produtos e te mostro pronta, de graça. Você decide depois de ver." },
  { p: "Quanto custa um e-commerce?", r: `Projetos a partir de ${R(ECOMMERCE_A_PARTIR)}. O valor final sai do diagnóstico: a quantidade de produtos, as integrações com os sistemas que a loja já usa e as regras comerciais.` },
];

export default function Page() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: perguntas.map((q) => ({ "@type": "Question", name: q.p, acceptedAnswer: { "@type": "Answer", text: q.r } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Vitrine digital para lojas",
      provider: { "@type": "ProfessionalService", name: "Rafael Razeira Estúdio", url: `${SITE}/` },
      areaServed: { "@type": "Country", name: "Brasil" },
      url: `${SITE}/vitrine-digital`,
      offers: { "@type": "Offer", price: v.total, priceCurrency: "BRL" },
    },
  ];

  return <Moldura origem="preco" mensagem="Olá, Rafael! Vi quanto custa a vitrine digital e quero uma para a minha loja.">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

    <section className={s.hero}>
      <div className={s.wrap}>
        <p className={s.eyebrow}>QUANTO CUSTA UM SITE PARA LOJA</p>
        <h1>{R(v.total)}<span className={s.ponto}>.</span>
          <span className={s.faixa}><span className={s.faixaTxt}>Uma vez só<span className={s.ponto}>.</span></span></span>
        </h1>
        <p className={s.lead}>Quase todo estúdio só fala o preço depois da reunião. Aqui ele vem primeiro: uma vitrine digital para a sua loja custa {R(v.total)}, sem mensalidade, e você começa com {R(v.entrada)}.</p>

        <dl className={c.ficha}>
          <div><dt>Para começar</dt><dd>{R(v.entrada)} no Pix</dd></div>
          <div><dt>Depois de aprovar</dt><dd>{R(v.saldo)}, no cartão em até 4x ou no Pix</dd></div>
          {v.avista && <div><dt>À vista no Pix</dt><dd>{R(v.avista)} no total</dd></div>}
          <div><dt>Mensalidade</dt><dd>Nenhuma</dd></div>
          <div><dt>Prazo</dt><dd>Até 7 dias úteis</dd></div>
        </dl>
      </div>
    </section>

    <section className={`${s.section} ${c.feitoSec}`}>
      <div className={`${s.wrap} ${c.bloco}`}>
        <h2>O que entra nos {R(v.total)}<span className={s.ponto}>.</span></h2>
        <ol className={c.feito}>
          {entra.map(([t, d], i) => <li key={t}>
            <span className={c.num} aria-hidden>{String(i + 1).padStart(2, "0")}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </li>)}
        </ol>
      </div>
    </section>

    <section className={s.section}>
      <div className={`${s.wrap} ${c.bloco}`}>
        <h2>O que não entra<span className={s.ponto}>.</span></h2>
        <div className={c.texto}>
          {naoEntra.map(([t, d]) => <p key={t}><b>{t}.</b> {d}</p>)}
        </div>
      </div>
    </section>

    <section className={`${s.section} ${c.feitoSec}`}>
      <div className={`${s.wrap} ${c.bloco}`}>
        <h2>Vitrine ou e-commerce<span className={s.ponto}>?</span></h2>
        <div className={c.texto}>
          <p><b>A vitrine digital, {R(v.total)}.</b> Para a loja que já vende pelo WhatsApp e quer parar de mandar foto por foto: o catálogo fica no ar, com preço e tamanho, e o pedido chega pronto. Sem mensalidade. <Link href="/vitrine-digital/">Ver a vitrine digital →</Link></p>
          <p><b>O e-commerce, a partir de {R(ECOMMERCE_A_PARTIR)}.</b> Para a loja que quer receber o pagamento no próprio site, com carrinho, checkout e pedidos no painel. O valor final sai do diagnóstico da operação. <Link href="/e-commerce">Ver o e-commerce →</Link></p>
          <p>Na dúvida, comece pela vitrine: quem já tem ela e passa a vender mais paga só a diferença para subir de degrau.</p>
        </div>
      </div>
    </section>

    <section className={s.section}>
      <div className={`${s.wrap} ${c.bloco}`}>
        <h2>Perguntas de quem vai pagar<span className={s.ponto}>.</span></h2>
        <div className={c.texto}>
          {perguntas.map((q) => <div key={q.p}><h3>{q.p}</h3><p>{q.r}</p></div>)}
        </div>
      </div>
    </section>

    <p className={c.conferido}>Valores de outubro de 2026. <Link href="/casos">Ver lojas reais contadas por dentro →</Link></p>
  </Moldura>;
}
