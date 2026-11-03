/* ============================================================
   ASSINAR O PERFORMANCE (07/10/2026): /assinar/<loja>

   O painel da vitrine manda o dono para cá, com o id da loja, quando ele
   toca em "Ver o plano", na contagem de dias ou no aviso de renovação. A
   cobrança mora no ESTÚDIO porque a chave do Mercado Pago nunca vai para a
   vitrine. Três jeitos (decisão do Rafael em 07/10): Pix mês a mês, cartão
   todo mês (assinatura que renova sozinha) e cartão o ano todo (R$ 1.970 em
   até 12x). Os valores vêm de lib/oferta-performance.ts.

   (03/11/2026) Com ?servico=turbinar, a mesma página contrata o Turbinar
   (os anúncios pelo estúdio, com o Performance incluído): os planos de
   PLANOS_TURBINAR, a situação pelo turbinar_ate e o que se diz depois.

   Página por link: noindex aqui e /assinar no disallow do robots. O id da
   loja não é segredo: pagar pela loja de outra pessoa só libera a loja dela.
   ============================================================ */

import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { Selo } from "@/components/performance/Selo";
import { PLANOS_PERFORMANCE, PLANOS_TURBINAR, ehPlano, ehTurbinar } from "@/lib/oferta-performance";
import { Checkout } from "./Checkout";
import s from "./assinar.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const corpo = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Assinar o Performance", robots: { index: false, follow: false } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIA = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });

type Loja = { id: string; nome: string; liberado_ate: string | null; para_sempre: boolean; plano: string | null; assinatura_status: string | null; turbinar_ate?: string | null; turbinar_plano?: string | null; turbinar_assinatura_status?: string | null };

/* a loja, pela service role e só no servidor (a mesma leitura da rota de pagamento) */
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

export default async function PaginaAssinar({ params, searchParams }: { params: Promise<{ loja: string }>; searchParams: Promise<{ plano?: string; embed?: string; servico?: string }> }) {
  const { loja: id } = await params;
  const { plano, embed, servico } = await searchParams;
  /* embutida no painel da vitrine (07/10, "tem que abrir ali mesmo"): sem o
     título grande nem o rodapé, só os planos e o pagamento */
  const embutida = embed === "1";
  if (!UUID_RE.test(id)) notFound();
  const loja = await lerLoja(id);
  if (!loja) notFound();
  if (servico === "turbinar") return <Turbinar loja={loja} plano={plano} embutida={embutida} />;

  /* a situação de hoje, dita como gente */
  const agora = Date.now();
  const ate = loja.liberado_ate ? new Date(loja.liberado_ate) : null;
  const dias = ate ? Math.ceil((ate.getTime() - agora) / 86_400_000) : null;
  const renovaSozinho = loja.plano === "cartao_mensal" && loja.assinatura_status === "authorized";
  const situacao = loja.para_sempre
    ? "O Performance desta loja é para sempre. Não há nada para pagar."
    : renovaSozinho
      ? `Assinatura no cartão ativa: renova sozinha todo mês.${ate ? ` Liberado até ${DIA.format(ate)}.` : ""}`
      : ate && dias !== null && dias > 0
        ? `Liberado até ${DIA.format(ate)}: ${dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`}. Pagar agora soma ao que falta.`
        : ate
          ? `O Performance acabou em ${DIA.format(ate)}. Pagou, volta na hora, com os números guardados.`
          : "Pagou, o Performance liga na hora no seu painel.";

  const planos = (Object.keys(PLANOS_PERFORMANCE) as (keyof typeof PLANOS_PERFORMANCE)[]).map((k) => ({ id: k, ...PLANOS_PERFORMANCE[k] }));

  return (
    <main className={`${s.pagina} ${embutida ? s.embutida : ""} ${display.variable} ${corpo.variable} ${mono.variable}`}>
      <div className={s.folha}>
        {embutida ? (
          <p className={s.situacaoEmbutida}>{situacao}</p>
        ) : (
        <header className={s.topo}>
          <p className={s.rotulo}>
            <Selo tamanho={18} /> Performance
          </p>
          <h1 className={s.titulo}>{loja.nome}</h1>
          <p className={s.situacao}>{situacao}</p>
        </header>
        )}

        {loja.para_sempre ? null : <Checkout loja={loja.id} planos={planos} inicial={ehPlano(plano) ? plano : "pix_mensal"} renovaSozinho={renovaSozinho} embutida={embutida} />}

        {embutida ? null : (
        <p className={s.rodape}>
          Sem fidelidade. Dúvida antes de pagar?{" "}
          <a href={`https://wa.me/5544991246187?text=${encodeURIComponent(`Oi! Sou da ${loja.nome} e tenho uma dúvida sobre o Performance.`)}`} target="_blank" rel="noreferrer">
            Fale com o estúdio no WhatsApp
          </a>
          .
        </p>
        )}
      </div>
    </main>
  );
}

/* ── o Turbinar (03/11/2026) ─────────────────────────────────── */

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

function Turbinar({ loja, plano, embutida }: { loja: Loja; plano?: string; embutida: boolean }) {
  const agora = Date.now();
  const ate = loja.turbinar_ate ? new Date(loja.turbinar_ate) : null;
  const dias = ate ? Math.ceil((ate.getTime() - agora) / 86_400_000) : null;
  const renovaSozinho = loja.turbinar_plano === "turbinar_cartao" && loja.turbinar_assinatura_status === "authorized";
  const situacao = renovaSozinho
    ? `O Turbinar está no cartão: renova sozinho todo mês.${ate ? ` Pago até ${DIA.format(ate)}.` : ""}`
    : ate && dias !== null && dias > 0
      ? `O Turbinar está pago até ${DIA.format(ate)}: ${dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`}. Pagar agora soma ao que falta.`
      : ate
        ? `O Turbinar acabou em ${DIA.format(ate)}. Pagou, o estúdio volta a rodar os anúncios.`
        : "O estúdio roda os anúncios da sua loja todo mês. O Performance da aba Desempenho vem junto.";
  const planos = (Object.keys(PLANOS_TURBINAR) as (keyof typeof PLANOS_TURBINAR)[]).map((k) => ({
    id: k,
    ...PLANOS_TURBINAR[k],
    preco: `${reais(PLANOS_TURBINAR[k].valor)} por mês`,
    diz: k === "turbinar_pix" ? "Cada Pix vale 30 dias. O painel avisa antes de acabar." : "Renova sozinho todo mês, no mesmo cartão.",
  }));

  return (
    <main className={`${s.pagina} ${embutida ? s.embutida : ""} ${display.variable} ${corpo.variable} ${mono.variable}`}>
      <div className={s.folha}>
        {embutida ? (
          <p className={s.situacaoEmbutida}>{situacao}</p>
        ) : (
          <header className={s.topo}>
            <p className={s.rotulo}>Turbinar</p>
            <h1 className={s.titulo}>{loja.nome}</h1>
            <p className={s.situacao}>{situacao}</p>
          </header>
        )}

        <Checkout loja={loja.id} planos={planos} inicial={ehTurbinar(plano) ? plano : "turbinar_pix"} renovaSozinho={renovaSozinho} embutida={embutida} turbinar />

        <p className={s.rodape}>
          A verba dos anúncios é paga direto à Meta, no seu cartão, e não passa pelo estúdio. 3 meses no começo, depois mês a mês.{" "}
          {embutida ? null : (
            <a href="/turbinar" target="_blank" rel="noreferrer">
              Ver tudo o que entra
            </a>
          )}
        </p>
      </div>
    </main>
  );
}
