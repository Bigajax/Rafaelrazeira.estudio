import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/estudio", permanent: false },
      { source: "/termos", destination: "/termos.html", permanent: false },
      { source: "/privacidade", destination: "/privacidade.html", permanent: false },
    ];
  },
  // /estudio é um site estático em public/estudio; o Next não resolve
  // index.html de subpasta sozinho (a Vercel resolve, o next dev não).
  // Como a página é servida em /estudio (sem barra final), os caminhos
  // relativos dela (css/…, js/…) resolvem na raiz — daí os dois mapas.
  // Briefing e propostas viviam com URLs sem .html (cleanUrls do deploy
  // estático antigo); os rewrites mantêm esses links compartilhados vivos.
  async rewrites() {
    return [
      { source: "/estudio", destination: "/estudio/index.html" },
      { source: "/css/:path*", destination: "/estudio/css/:path*" },
      { source: "/js/:path*", destination: "/estudio/js/:path*" },
      { source: "/briefing", destination: "/briefing.html" },
      { source: "/proposta/:slug", destination: "/proposta/:slug.html" },
    ];
  },
};

export default nextConfig;
