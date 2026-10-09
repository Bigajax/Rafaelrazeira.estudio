/* ============================================================
   A SEMANA DA LOJA, NO CRM (09/10/2026)

   A fila de segunda: cada loja com o Performance liberado, com o texto da
   semana pronto para mandar no WhatsApp da dona. O texto é o mesmo do
   cartão "Sua semana" na Início do painel dela (a cópia de lá é
   estudio/lib/semana.ts no _molde: mudou aqui, muda lá). O leitor do
   WhatsApp do estúdio só lê, então o envio é um toque do Rafael, pelo wa.me.

   O CRM não lê o catálogo das lojas: o nome da peça sai do endereço dela
   ("tenis-grande-onda" vira "Tenis grande onda").
   ============================================================ */

import { clienteServidor } from "@/lib/crm/supabase";

export type Semana = {
  pessoas: number;
  chamaram: number;
  pessoas_antes: number;
  chamaram_antes: number;
  peca: string | null;
  peca_chamaram: number | null;
  buscas: string[];
  esgotados: { produto: string; tamanho: string | null; pessoas: number }[];
  contagem_desde: string | null;
};

export type SemanaDaLoja = { loja_id: string; nome: string; slug: string; lead_id: string | null; semana: Semana | null };

const br = (v: number) => v.toLocaleString("pt-BR");

function comparacao(agora: number, antes: number): string {
  if (!antes) return "";
  const pct = Math.round(((agora - antes) / antes) * 100);
  if (Math.abs(pct) < 5) return ", quase igual à semana anterior";
  return pct > 0 ? `, ${pct}% a mais que a semana anterior` : `, ${Math.abs(pct)}% a menos que a semana anterior`;
}

export function nomeDoEndereco(slug: string): string {
  const t = slug.replace(/-/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function frasesDaSemana(s: Semana, nomeDe: (slug: string) => string | null = nomeDoEndereco): string[] {
  const frases: string[] = [];
  if (!s.pessoas) return frases;

  const temAntes = s.contagem_desde !== null && Date.parse(s.contagem_desde) < Date.now() - 14 * 24 * 60 * 60 * 1000;
  frases.push(
    `${br(s.pessoas)} ${s.pessoas === 1 ? "pessoa entrou" : "pessoas entraram"} na vitrine nos últimos 7 dias${temAntes ? comparacao(s.pessoas, s.pessoas_antes) : ""}, e ${br(s.chamaram)} ${s.chamaram === 1 ? "chamou" : "chamaram"} no WhatsApp.`,
  );

  const peca = s.peca ? nomeDe(s.peca) : null;
  if (peca && s.peca_chamaram) {
    frases.push(`A peça que mais levou gente ao WhatsApp foi ${peca}: ${br(s.peca_chamaram)} ${s.peca_chamaram === 1 ? "pessoa" : "pessoas"}.`);
  }

  const esgotado = s.esgotados.map((e) => ({ ...e, nome: nomeDe(e.produto) })).find((e) => e.nome);
  if (esgotado) {
    frases.push(`${br(esgotado.pessoas)} ${esgotado.pessoas === 1 ? "pessoa tocou" : "pessoas tocaram"} no ${esgotado.tamanho ?? "tamanho"} de ${esgotado.nome}, que acabou. Vale repor.`);
  }

  if (s.buscas.length) {
    const lista = s.buscas.map((b) => `"${b}"`);
    const texto = lista.length > 1 ? `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}` : lista[0];
    frases.push(`Procuraram ${texto} e não acharam na vitrine.`);
  }
  return frases;
}

/** a mensagem de segunda, com a saudação e o convite para a aba */
export function mensagemDaSemana(primeiroNome: string | null, frases: string[]): string {
  const oi = primeiroNome ? `Bom dia, ${primeiroNome}! ` : "Bom dia! ";
  return `${oi}A semana da sua vitrine:\n\n${frases.map((f) => `• ${f}`).join("\n")}\n\nO detalhe está na aba Desempenho do seu painel. Qualquer coisa, me chama aqui.`;
}

/** a fila: só as lojas liberadas, com o WhatsApp e o primeiro nome do lead */
export async function semanasParaMandar(): Promise<(SemanaDaLoja & { whatsapp: string | null; primeiroNome: string | null })[]> {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("perf_resumos_da_semana");
  if (error || !data) return [];
  const lista = data as SemanaDaLoja[];
  const ids = [...new Set(lista.map((l) => l.lead_id).filter((x): x is string => !!x))];
  const { data: leads } = ids.length
    ? await supabase.from("crm_leads").select("id, nome, whatsapp").in("id", ids).returns<{ id: string; nome: string | null; whatsapp: string | null }[]>()
    : { data: [] as { id: string; nome: string | null; whatsapp: string | null }[] };
  const porId = new Map((leads ?? []).map((l) => [l.id, l]));
  return lista.map((l) => {
    const lead = l.lead_id ? porId.get(l.lead_id) : undefined;
    return { ...l, whatsapp: lead?.whatsapp ?? null, primeiroNome: lead?.nome?.trim().split(/\s+/)[0] ?? null };
  });
}
