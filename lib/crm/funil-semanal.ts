/* ============================================================
   O FUNIL DE QUEM PROCUROU O ESTÚDIO, POR SEMANA DE CHEGADA (10/11/2026)

   Os Indicadores mediam esforço (toques por semana) e uma "taxa de
   resposta" que em 10/11 dava 3%: com o leitor do WhatsApp desligado desde
   01/10, ela media falta de registro, não silêncio. Faltava a pergunta que
   decide o mês: de quem chegou naquela semana, quantos receberam a
   primeira mensagem, em quanto tempo, quantos viram o preço e quantos
   fecharam.

   É por SEMANA DE CHEGADA (coorte), e não por semana do evento: assim a
   linha de uma semana melhora com o tempo e as semanas se comparam. A
   prospecção fica de fora, como na fila do Hoje. Ignora o seletor de dias,
   como a constância do Instagram: ritmo se lê por semana.

   O que nunca fazer: somar aqui o que foi RECEBIDO. Fechou é o card em
   Ganho; o dinheiro mora no Caixa.
   ============================================================ */
import { lerTodos } from "@/lib/sistema/consultas";
import { ehToqueDePreco, ehVoltaDoPreco } from "./atendimento";
import { diaEmSP, hojeSP, inicioDaSemana, somarDias } from "./regras";
import { clienteServidor } from "./supabase";

export type SemanaDoFunil = {
  semana: string;
  chegaram: number;
  /* receberam a primeira mensagem minha */
  falei: number;
  /* a mediana, em horas, entre a chegada e a primeira mensagem (de quem recebeu) */
  horasAteFalar: number | null;
  preco: number;
  fecharam: number;
};

const mediana = (v: number[]) => {
  if (!v.length) return null;
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

export async function funilSemanal(semanas = 8): Promise<SemanaDoFunil[]> {
  const banco = await clienteServidor();
  const hoje = hojeSP();
  const primeira = somarDias(inicioDaSemana(hoje), -7 * (semanas - 1));
  const [leads, toques] = await Promise.all([
    lerTodos<{ id: string; origem: string; estagio: string; created_at: string }>(banco, "crm_leads", "id, origem, estagio, created_at", {
      coluna: "created_at",
      inicio: `${primeira}T00:00:00-03:00`,
      fim: `${somarDias(hoje, 1)}T00:00:00-03:00`,
    }),
    lerTodos<{ lead_id: string; direcao: string; resumo: string | null; created_at: string }>(banco, "crm_interacoes", "lead_id, direcao, resumo, created_at", {
      coluna: "created_at",
      inicio: `${primeira}T00:00:00-03:00`,
      fim: `${somarDias(hoje, 1)}T00:00:00-03:00`,
    }),
  ]);
  const primeiraSaida = new Map<string, string>();
  const viuPreco = new Set<string>();
  for (const t of toques) {
    if (t.direcao !== "saida") continue;
    const antes = primeiraSaida.get(t.lead_id);
    if (!antes || t.created_at < antes) primeiraSaida.set(t.lead_id, t.created_at);
    if (ehToqueDePreco(t.resumo) && !ehVoltaDoPreco(t.resumo)) viuPreco.add(t.lead_id);
  }
  const linhas = new Map<string, SemanaDoFunil & { horas: number[] }>();
  for (let i = 0; i < semanas; i++) {
    const semana = somarDias(primeira, 7 * i);
    linhas.set(semana, { semana, chegaram: 0, falei: 0, horasAteFalar: null, preco: 0, fecharam: 0, horas: [] });
  }
  for (const l of leads) {
    if (l.origem === "prospeccao") continue;
    const linha = linhas.get(inicioDaSemana(diaEmSP(l.created_at)));
    if (!linha) continue;
    linha.chegaram++;
    const saida = primeiraSaida.get(l.id);
    if (saida) {
      linha.falei++;
      linha.horas.push(Math.max(0, (Date.parse(saida) - Date.parse(l.created_at)) / 3600000));
    }
    if (viuPreco.has(l.id) || ["proposta", "negociacao"].includes(l.estagio)) linha.preco++;
    if (l.estagio === "ganho") linha.fecharam++;
  }
  return [...linhas.values()].map(({ horas, ...l }) => {
    const m = mediana(horas);
    return { ...l, horasAteFalar: m === null ? null : Math.round(m) };
  });
}
