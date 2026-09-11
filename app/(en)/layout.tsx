import type { Metadata } from "next";
import "@/app/globals.css";

/* O layout raiz das páginas em inglês (app/(en)/en/...). É irmão do
   layout de app/(pt): o Next só permite mais de um layout raiz quando
   cada um vive num route group, e é assim que o <html lang> fica certo
   sem tornar o site inteiro dinâmico (a alternativa, headers() no layout
   raiz, faria toda página renderizar por requisição).

   O openGraph é repetido inteiro porque o do filho substitui o do pai
   (nota da /e-commerce): aqui só muda o locale. */
export const metadata: Metadata = {
  metadataBase: new URL("https://rafaelrazeira-estudio.vercel.app"),
  title: { default: "Rafael Razeira Studio", template: "%s — Rafael Razeira Studio" },
  description: "Design, strategy and development for brands that want to sell better.",
  icons: { icon: "/assets/favicon.png" },
  openGraph: {
    siteName: "Rafael Razeira Studio",
    type: "website",
    locale: "en_US",
    alternateLocale: ["pt_BR"],
    images: [
      {
        url: "/assets/og-rr.png",
        width: 1200,
        height: 630,
        alt: "Rafael Razeira Studio monogram",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayoutEn({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
