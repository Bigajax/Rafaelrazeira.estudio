/* PROVISÓRIO (21/10/2026): as pranchas de um post em tamanho real, para o
   PNG sair pelo PC quando o editor não abre no navegador. Só existe em
   desenvolvimento; apagar depois do uso. */
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Anton, Archivo, Bebas_Neue, Big_Shoulders, Bodoni_Moda, DM_Serif_Display, Fraunces, Instrument_Serif, Inter, JetBrains_Mono, Oswald, Playfair_Display } from "next/font/google";
import { SlidePost } from "@/components/marketing/SlidePost";
import { urlFundo, type Peca } from "@/lib/marketing/tipos";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" });
const dmserif = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-dmserif" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald" });
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair" });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas" });
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-fraunces" });
const shoulders = Big_Shoulders({ subsets: ["latin"], variable: "--font-shoulders" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-bodoni" });
const fontes = [display, body, mono, serif, anton, dmserif, oswald, playfair, bebas, fraunces, shoulders, bodoni].map((f) => f.variable).join(" ");

export const dynamic = "force-dynamic";

export default async function Pranchas({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { id } = await params;
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data } = await sb.from("mkt_pecas").select("*").eq("id", id).maybeSingle<Peca>();
  if (!data) notFound();
  const p = data;
  const extras = (p.estilo.extras ?? []).map((x) => urlFundo(x.caminho ?? null));
  return (
    <div className={fontes} style={{ display: "grid", gap: 40, padding: 40, background: "#888" }}>
      {p.slides.map((s, i) => (
        <div key={i} data-prancha={i + 1} style={{ width: "fit-content" }}>
          <SlidePost slide={s} i={i} total={p.slides.length} tipo={p.tipo} fundo={urlFundo(p.fundo)} extras={extras} cta={p.cta} estilo={p.estilo} />
        </div>
      ))}
    </div>
  );
}
