import type { MetadataRoute } from "next";
import { SITE } from "@/lib/idiomas";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/crm", "/proposta", "/registrar-venda", "/api"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
