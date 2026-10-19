import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { casos, casoPorSlug } from "@/data/casos";
import { projetos } from "@/data/portfolio";
import { CasoPage } from "@/components/casos/CasoPage";

/* Um caso por loja, gerado no build a partir de data/casos.ts. Slug que
   não está na lista dá 404 (dynamicParams false), sem render no servidor. */
export const dynamicParams = false;

export function generateStaticParams() {
  return casos.map((c) => ({ slug: c.slug }));
}

const achar = (slug: string) => {
  const caso = casoPorSlug(slug);
  const projeto = projetos.find((p) => p.slug === slug);
  return caso && projeto ? { caso, projeto } : null;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const achado = achar(slug);
  if (!achado) return {};
  const { caso } = achado;
  return {
    /* absoluto: o título do caso já é longo, e o sufixo do layout o
       empurraria para além do que a busca mostra */
    title: { absolute: caso.titulo },
    description: caso.descricao,
    alternates: { canonical: `/casos/${slug}` },
    openGraph: { title: caso.titulo, description: caso.descricao, type: "article", locale: "pt_BR", images: [`/portfolio/${slug}.webp`] },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const achado = achar(slug);
  if (!achado) notFound();
  return <CasoPage caso={achado.caso} projeto={achado.projeto} />;
}
