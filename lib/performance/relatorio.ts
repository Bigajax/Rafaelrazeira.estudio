/* ============================================================
   O RELATÓRIO DO MÊS DO PERFORMANCE (06/10/2026)

   O que a página /relatorio/<token> mostra, montado a partir da função
   perf_relatorio do banco central. A página é pública (o token é a
   credencial do link), então a chamada vai com a chave ANON: a função é
   security definer e só devolve aquele mês daquela loja.

   As decisões do mês saem daqui, por regra, no mesmo espírito da aba
   Desempenho da vitrine (lib/atencao.ts lá): cada uma começa pelo verbo,
   e nenhuma diz "bom" ou "ruim". A leitura humana é o texto que o Rafael
   escreve no CRM; as regras só preparam o terreno.
   ============================================================ */

import { SUPABASE_ANON, SUPABASE_URL } from "@/lib/crm/supabase";

export type DadosRelatorio = {
  loja: string;
  mes: string;
  parcial: boolean;
  ate: string;
  leitura: string | null;
  feito: string | null;
  total: { pessoas: number; olharam: number; chamaram: number };
  antes: { pessoas: number; olharam: number; chamaram: number };
  dias: { d: string; pessoas: number; chamaram: number }[];
  pecas: { produto: string; viram: number; chamaram: number }[];
  buscas: { termo: string; pessoas: number }[];
  esgotados: { produto: string; tamanho: string; pessoas: number }[];
  origem: { origem: string; pessoas: number; chamaram: number }[];
  links: { nome: string; pessoas: number; chamaram: number }[];
  horario: { dia: number; faixa: number; pessoas: number } | null;
  voltaram: number;
};

export async function lerRelatorio(token: string): Promise<DadosRelatorio | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON || !/^[a-f0-9]{32}$/.test(token)) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/perf_relatorio`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify({ chave_link: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const texto = await r.text();
    return texto ? (JSON.parse(texto) as DadosRelatorio | null) : null;
  } catch {
    return null;
  }
}

/* o central guarda a peça pelo slug (não tem o catálogo da loja): o nome
   do relatório sai do slug, "nike-phantom-creme-e-vinho" vira "Nike Phantom
   creme e vinho". As marcas conhecidas ficam com a grafia delas. */
const MARCAS: Record<string, string> = { nike: "Nike", adidas: "adidas", puma: "Puma", mizuno: "Mizuno", joma: "Joma", oakley: "Oakley", vans: "Vans", umbro: "Umbro", fila: "Fila" };
export function nomeDaPeca(slug: string) {
  const partes = slug.split("-").filter(Boolean);
  return partes
    .map((p, i) => {
      if (MARCAS[p]) return MARCAS[p];
      if (i === 1 && partes[0] && MARCAS[partes[0]]) return p.charAt(0).toUpperCase() + p.slice(1);
      return i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p;
    })
    .join(" ");
}

export const ORIGENS: Record<string, string> = {
  instagram: "Instagram",
  google: "Google",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  direto: "Link direto",
  outro: "Outros sites",
};

const DIAS = ["", "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
export function textoHorario(h: DadosRelatorio["horario"]) {
  if (!h || !h.pessoas) return null;
  return `${DIAS[h.dia]}, das ${h.faixa * 3}h às ${h.faixa * 3 + 3}h`;
}

export type Decisao = { tipo: string; frase: string; porque: string };

const br = (v: number) => v.toLocaleString("pt-BR");

/** Até quatro decisões para o mês que começa, a partir do mês que passou. */
export function decisoes(R: DadosRelatorio): Decisao[] {
  const lista: Decisao[] = [];
  const e = R.esgotados[0];
  if (e && e.pessoas >= 2)
    lista.push({ tipo: "Estoque", frase: `Repor o ${e.tamanho} do ${nomeDaPeca(e.produto)}`, porque: `${br(e.pessoas)} pessoas queriam esse número e ele tinha acabado.` });
  const b = R.buscas[0];
  if (b && b.pessoas >= 2)
    lista.push({ tipo: "Estoque", frase: `Cadastrar ou encomendar “${b.termo}”`, porque: `${br(b.pessoas)} pessoas procuraram na vitrine e não acharam.` });

  const somaV = R.pecas.reduce((a, p) => a + p.viram, 0);
  const media = somaV ? R.pecas.reduce((a, p) => a + p.chamaram, 0) / somaV : 0;
  const fracas = R.pecas.filter((p) => p.viram >= 20 && p.chamaram / p.viram < media / 2);
  if (fracas.length) {
    const p = fracas.reduce((a, c) => (c.viram > a.viram ? c : a));
    lista.push({
      tipo: "Peça",
      frase: `Rever a foto e o preço do ${nomeDaPeca(p.produto)}`,
      porque: `${br(p.viram)} pessoas abriram e só ${br(p.chamaram)} chamaram: ${Math.round((p.chamaram / p.viram) * 100)} de cada 100, quando a média da loja é ${Math.round(media * 100)}.`,
    });
  }
  const forte = R.pecas.filter((p) => p.viram >= 10).sort((a, c) => c.chamaram / c.viram - a.chamaram / a.viram)[0];
  if (forte && forte.chamaram >= 3)
    lista.push({
      tipo: "Destaque",
      frase: `Pôr o ${nomeDaPeca(forte.produto)} em destaque e num post`,
      porque: `É a peça que mais faz gente chamar: ${Math.round((forte.chamaram / forte.viram) * 100)} de cada 100 que abrem.`,
    });
  const h = textoHorario(R.horario);
  if (h && lista.length < 4) lista.push({ tipo: "Divulgação", frase: `Postar no horário mais forte: ${h}`, porque: "É quando mais gente entrou na vitrine neste mês." });
  return lista.slice(0, 4);
}
