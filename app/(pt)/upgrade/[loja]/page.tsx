/* ============================================================
   O UPGRADE DA VITRINE (07/10/2026): /upgrade/<loja>?degrau=vender|loja

   Os dois degraus acima da vitrine, pagos de dentro do painel (o painel
   embute esta página com ?embed=1, como a de assinar o Performance). Os
   valores vêm de lib/oferta-performance.ts: a vitrine paga abate os R$ 999
   (decisão do Rafael em 25/09, na proposta da Fardo). Pix à vista ou cartão
   em até 12x; o pagamento marca o degrau na loja e o estúdio começa.

   Página por link: noindex e /upgrade no disallow do robots.
   ============================================================ */

import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { Selo } from "@/components/performance/Selo";
import { DEGRAUS, UPGRADES, ehDegrau, type PlanoUpgrade } from "@/lib/oferta-performance";
import { Checkout, type Plano } from "../../assinar/[loja]/Checkout";
import s from "../../assinar/[loja]/assinar.module.css";
import u from "./upgrade.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const corpo = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Upgrade da vitrine", robots: { index: false, follow: false } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

type Loja = { id: string; nome: string; upgrade?: string | null };

async function lerLoja(id: string): Promise<Loja | null> {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  const r = await fetch(`${url.replace(/\/$/, "")}/rest/v1/perf_lojas?id=eq.${id}&ativa=eq.true&select=*`, {
    headers: { apikey: chave, Authorization: `Bearer ${chave}` },
    cache: "no-store",
  }).catch(() => null);
  if (!r || !r.ok) return null;
  const linhas = (await r.json().catch(() => [])) as Loja[];
  return linhas[0] ?? null;
}

export default async function PaginaUpgrade({ params, searchParams }: { params: Promise<{ loja: string }>; searchParams: Promise<{ degrau?: string; embed?: string }> }) {
  const { loja: id } = await params;
  const { degrau: d, embed } = await searchParams;
  if (!UUID_RE.test(id) || !ehDegrau(d)) notFound();
  const loja = await lerLoja(id);
  if (!loja) notFound();
  const embutida = embed === "1";
  const degrau = DEGRAUS[d];
  const jaPago = loja.upgrade === "loja" || loja.upgrade === d;

  const planos: Plano[] = (Object.keys(UPGRADES) as PlanoUpgrade[])
    .filter((k) => UPGRADES[k].degrau === d)
    .map((k) => {
      const p = UPGRADES[k];
      return {
        id: k,
        rotulo: p.rotulo,
        valor: p.valor,
        metodo: p.metodo,
        maxParcelas: p.maxParcelas,
        preco: brl(p.valor),
        diz: p.metodo === "pix" ? "Na hora, pelo app do banco." : "Em até 12x, com os juros do cartão.",
      };
    });

  return (
    <main className={`${s.pagina} ${embutida ? s.embutida : ""} ${display.variable} ${corpo.variable} ${mono.variable}`}>
      <div className={s.folha}>
        <header className={embutida ? u.topoEmbutido : s.topo}>
          <p className={s.rotulo}>
            <Selo tamanho={18} /> O próximo passo da {loja.nome}
          </p>
          <h1 className={embutida ? u.tituloEmbutido : s.titulo}>{degrau.nome}</h1>
          <div className={u.preco}>
            <s>{brl(degrau.cheio)}</s>
            <b>{brl(degrau.valor)}</b>
            <span>A sua vitrine já abate {brl(degrau.vitrine)}.</span>
          </div>
          <ul className={u.inclui}>
            {degrau.inclui.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <p className={u.prazo}>
            Fica pronto em {degrau.prazo} depois do pagamento.
            {degrau.mensal ? ` ${degrau.mensal}.` : ""}
          </p>
        </header>

        {jaPago ? (
          <p className={s.aviso}>Pago. O estúdio está fazendo o seu {degrau.nome.toLowerCase()}, e avisa no WhatsApp quando estiver pronto.</p>
        ) : (
          <Checkout loja={loja.id} planos={planos} inicial={planos[0].id} renovaSozinho={false} embutida={embutida} />
        )}

        {embutida ? null : (
          <p className={s.rodape}>
            Dúvida antes de pagar?{" "}
            <a href={`https://wa.me/5544991246187?text=${encodeURIComponent(`Oi! Sou da ${loja.nome} e quero entender o upgrade ${degrau.nome}.`)}`} target="_blank" rel="noreferrer">
              Fale com o estúdio no WhatsApp
            </a>
            .
          </p>
        )}
      </div>
    </main>
  );
}
