/* ============================================================
   A BARRA DE ESTADO DO PAINEL (24/11/2026)
   Uma linha fina no pé de todas as telas, no computador: o gasto da Meta
   hoje, os leads de hoje e o último lead, com a hora da leitura. Pedida na
   volta ao tráfego pago, para o Rafael não precisar abrir o Gerenciador
   para saber se o dia está andando.

   DE ONDE VEM CADA NÚMERO, e o que NÃO aparece:
   - Meta hoje: direto da Marketing API (insights de hoje), quando o
     servidor tem META_ADS_TOKEN e META_AD_ACCOUNT_ID; a resposta fica 5 min
     em cache, e a chamada desiste em 2,5 s (medido em 24/11: a primeira
     chamada depois do cache vencer chegou a segurar o fim da página por
     6 s no servidor de desenvolvimento). Sem as variáveis (ou se a Meta falhar), cai para o que o
     `scripts/ler-meta.ts --gravar` deixou em ads_meta_dia, e a barra diz a
     hora dessa leitura em vez de "ao vivo".
   - Leads hoje e último lead: os cards do CRM que nasceram do formulário
     (tráfego pago e inbound), pelo dia de São Paulo.
   - O SALDO da conta de anúncios não aparece: o token de leitura não
     enxerga cobrança (erro #10). Campo vazio é honesto; saldo chutado não.

   É um componente de servidor, dentro de um <Suspense>: se a Meta demorar,
   a tela abre sem a barra e ela entra depois.
   ============================================================ */

import { clienteServidor } from "@/lib/crm/supabase";
import { hojeSP } from "@/lib/crm/regras";
import { BotaoTema } from "./TemaELuz";
import s from "@/app/(pt)/crm/crm.module.css";

type Meta = { gasto: number; impressoes: number; fonte: "ao vivo" | string } | null;

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const horaSP = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

function haQuanto(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

async function metaAoVivo(): Promise<Meta> {
  const token = process.env.META_ADS_TOKEN;
  const conta = (process.env.META_AD_ACCOUNT_ID ?? "").replace(/^act_/, "");
  if (!token || !conta) return null;
  try {
    const url = `https://graph.facebook.com/v21.0/act_${conta}/insights?fields=spend,impressions&date_preset=today&access_token=${token}`;
    const r = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(2500) });
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: { spend?: string; impressions?: string }[] };
    const linha = j.data?.[0];
    return { gasto: Number(linha?.spend ?? 0), impressoes: Number(linha?.impressions ?? 0), fonte: "ao vivo" };
  } catch {
    return null;
  }
}

export async function BarraEstado() {
  const supabase = await clienteServidor();
  const hoje = hojeSP();
  const desde = `${hoje}T00:00:00-03:00`;

  const [vivo, { data: doDia }, { data: ultimo }, { data: gravado }] = await Promise.all([
    metaAoVivo(),
    supabase.from("crm_leads").select("id").in("origem", ["trafego_pago", "inbound"]).gte("created_at", desde).returns<{ id: string }[]>(),
    supabase.from("crm_leads").select("created_at").in("origem", ["trafego_pago", "inbound"]).order("created_at", { ascending: false }).limit(1).returns<{ created_at: string }[]>(),
    supabase.from("ads_meta_dia").select("gasto, impressoes, lido_em").eq("dia", hoje).returns<{ gasto: number; impressoes: number; lido_em: string }[]>(),
  ]);

  let meta: Meta = vivo;
  if (!meta && gravado?.length) {
    const lido = gravado.map((g) => g.lido_em).sort().at(-1)!;
    meta = {
      gasto: gravado.reduce((a, g) => a + Number(g.gasto), 0),
      impressoes: gravado.reduce((a, g) => a + Number(g.impressoes), 0),
      fonte: `lido às ${horaSP(lido)}`,
    };
  }
  const leadsHoje = doDia?.length ?? 0;
  const ultimoLead = ultimo?.[0]?.created_at ?? null;

  return (
    <footer className={s.barraEstado} aria-label="Como está o dia do estúdio">
      <span data-vivo={meta ? (meta.gasto > 0 ? "sim" : "parado") : "sem"}>
        <i aria-hidden />
        Meta hoje
        {meta ? (
          <>
            <b>{reais(meta.gasto)}</b>
            <small>{meta.impressoes.toLocaleString("pt-BR")} {meta.impressoes === 1 ? "impressão" : "impressões"}</small>
          </>
        ) : (
          <small>sem leitura de hoje</small>
        )}
      </span>
      <span>
        Leads hoje <b>{leadsHoje}</b>
      </span>
      {ultimoLead ? (
        <span>
          Último lead <b data-texto>{haQuanto(ultimoLead)}</b>
        </span>
      ) : null}
      <span className={s.barraEstadoFim}>
        <small>{meta ? (meta.fonte === "ao vivo" ? `Meta ao vivo, ${horaSP(new Date().toISOString())}` : `Meta ${meta.fonte}`) : `visto às ${horaSP(new Date().toISOString())}`}</small>
        <BotaoTema />
      </span>
    </footer>
  );
}
