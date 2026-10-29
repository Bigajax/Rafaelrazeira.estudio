import type { Metadata } from "next";
import "@/app/globals.css";

/* O cartão do link: quando uma URL do site é colada no WhatsApp ou no
   Instagram, o preview monta com a og:image. metadataBase transforma os
   caminhos relativos em URL absoluta, que é o que os robôs de preview
   exigem. */
export const metadata: Metadata = {
  metadataBase: new URL("https://rafaelrazeira.com.br"),
  title: { default: "Rafael Razeira Estúdio", template: "%s — Rafael Razeira Estúdio" },
  description: "Design, estratégia e desenvolvimento para marcas que querem vender melhor.",
  /* o ícone da aba em 48px (2KB) e o do iPhone em 180px (28/10): o
     favicon.png de 512px pesava 66KB em toda abertura de página */
  icons: { icon: "/assets/favicon-48.png", apple: "/assets/apple-touch-icon.png" },
  openGraph: {
    siteName: "Rafael Razeira Estúdio",
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: "/assets/og-rr.png",
        width: 1200,
        height: 630,
        alt: "Monograma RR do Rafael Razeira Estúdio",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
