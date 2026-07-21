import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Rafael Razeira Estúdio", template: "%s — Rafael Razeira Estúdio" },
  description: "Design, estratégia e desenvolvimento para marcas que querem vender melhor.",
  icons: { icon: "/assets/favicon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
