import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* AVIF na frente do WebP. O padrão do Next é só WebP, e o que decide aqui
     é o quadro estático do hero (/assets/demo/xavier-hero-still.jpg): ele é a
     primeira imagem grande da /vitrine-digital e a maioria do tráfego chega
     por 4G, no navegador interno do Instagram. Em AVIF ele cai por volta de
     um terço do WebP no mesmo tamanho de tela. Quem não suporta AVIF recebe
     WebP, e quem não suporta nenhum dos dois recebe o JPEG original: a lista
     é uma negociação por Accept, não uma troca de formato.
     Custo: a primeira requisição de cada tamanho paga a conversão no servidor;
     da segunda em diante sai do cache da Vercel. */
  images: { formats: ["image/avif", "image/webp"] },
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
