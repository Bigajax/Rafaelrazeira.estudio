import type { MetadataRoute } from "next";
import { SITE } from "@/lib/idiomas";

export default function robots(): MetadataRoute.Robots {
  return {
    /* /entrega entra junto com /proposta: as duas são páginas por link, e
       as de entrega ainda carregam a senha inicial do painel do cliente.
       O noindex de cada página impede o Google de indexar; isto impede o
       robô de passar por lá. Nenhum dos dois torna a página privada. */
    rules: { userAgent: "*", allow: "/", disallow: ["/crm", "/proposta", "/entrega", "/registrar-venda", "/api"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
