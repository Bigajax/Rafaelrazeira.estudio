import type { MetadataRoute } from "next";
import { PARES, SITE } from "@/lib/idiomas";

/* As páginas públicas de venda, nos dois idiomas, cada uma apontando a
   irmã. Fora: /crm, as propostas (são por link), o registrar-venda e as
   páginas de apoio. A /estudio e a /e-commerce entram só em português. */
export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date();
  const emDoisIdiomas = Object.entries(PARES).flatMap(([pt, en]) => {
    const languages = { "pt-BR": `${SITE}${pt}`, en: `${SITE}${en}`, "x-default": `${SITE}${pt}` };
    return [
      { url: `${SITE}${pt}`, lastModified: agora, alternates: { languages } },
      { url: `${SITE}${en}`, lastModified: agora, alternates: { languages } },
    ];
  });
  const soPt = ["/estudio", "/e-commerce", "/servicos"].map((p) => ({ url: `${SITE}${p}`, lastModified: agora }));
  return [...emDoisIdiomas, ...soPt];
}
