import type { Metadata } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import { LojaOnline } from "@/components/loja-online/LojaOnline";
import { SemAncoraDoAnuncio } from "@/components/vitrine/SemAncoraDoAnuncio";
import { DEGRAUS, MENSALIDADE_ECOMMERCE } from "@/lib/oferta-performance";
import { SITE } from "@/lib/idiomas";

/* ---------- a /loja-online (07/11/2026) ----------
   A página de anúncio da Loja online, no design oficial do estúdio. Ela
   substitui a /e-commerce de julho (design antigo, "a partir de R$ 3.499"
   e o WhatsApp errado), que agora redireciona para cá (next.config.ts).
   O nome do produto é "Loja online" (cofre, entrada-199-regra, 04/11);
   "e-commerce" só aparece aqui, no título e na descrição do Google,
   porque é o termo que se busca. Sem tela de carregamento, pelo mesmo
   motivo da /vitrine-digital: é tráfego pago frio. */
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const titulo = Instrument_Sans({ subsets: ["latin"], variable: "--font-titulo" });

const loja = DEGRAUS.loja;
const mensal = MENSALIDADE_ECOMMERCE.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const title = "Loja online para loja de roupa e tênis | Rafael Razeira";
const description = `Aumente suas vendas com uma loja online (e-commerce) em que o cliente escolhe o tamanho, vê o frete e paga no Pix ou no cartão, sem esperar você responder. Implantação R$ ${loja.cheio.toLocaleString("pt-BR")} e R$ ${mensal} por mês depois da entrega.`;

export const metadata: Metadata = {
  /* absolute: o modelo do layout acrescentaria " — Rafael Razeira Estúdio",
     repetindo o nome e pondo travessão na aba */
  title: { absolute: title },
  description,
  alternates: { canonical: `${SITE}/loja-online` },
  openGraph: { title, description, url: `${SITE}/loja-online`, locale: "pt_BR", type: "website" },
};

export default function LojaOnlinePage() {
  const schema = {
    "@context": "https://schema.org", "@type": "Service", name: "Loja online",
    description, url: `${SITE}/loja-online`, serviceType: "Criação de loja online",
    provider: { "@type": "ProfessionalService", name: "Rafael Razeira Estúdio", url: SITE },
    offers: { "@type": "Offer", price: loja.cheio, priceCurrency: "BRL", url: `${SITE}/loja-online` },
  };
  return <div className={`${titulo.variable} ${body.variable}`}>
    <SemAncoraDoAnuncio />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <LojaOnline />
  </div>;
}
