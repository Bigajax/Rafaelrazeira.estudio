/* ============================================================
   A LEITURA DA CONVERSA (01/10/2026, etapa 2 do leitor do WhatsApp)

   O formato que o leitor grava em crm_analises.resultado e a ficha mostra.
   Mora aqui, sem rede, para os dois lados lerem a mesma coisa e para a
   resposta da IA passar por UMA porta antes de chegar na tela: etapa que
   não existe vira nula, travessão vira vírgula, número absurdo de dias
   vira 3.
   ============================================================ */
import { ESTAGIOS, type Estagio } from "./tipos";

export type StatusAnalise = "na_fila" | "rodando" | "pronta" | "erro";

export type Leitura = {
  /* Uma frase: em que pé a conversa está. */
  situacao: string;
  /* O que a pessoa quis dizer, e o clima: duas ou três frases. */
  leitura: string;
  /* Nula = fica onde está. */
  etapa_sugerida: Estagio | null;
  porque_etapa: string;
  proximo_passo: string;
  retorno_em_dias: number;
  /* Nula quando o certo é esperar e não mandar nada. */
  resposta: string | null;
  /* Algo para o Rafael não deixar passar (uma objeção escondida, um prazo
     que a pessoa deu). Nulo quando não há. */
  alerta: string | null;
};

export type Analise = {
  id: string;
  lead_id: string;
  status: StatusAnalise;
  origem: "botao" | "resposta";
  resultado: Leitura | null;
  erro: string | null;
  aplicada_em: string | null;
  pedida_em: string;
  pronta_em: string | null;
};

/* O batimento do leitor a cada 15 s; passou disso com folga, está desligado. */
export const LEITOR_VIVO_MS = 45_000;

/* A casa não usa travessão em texto visível: a regra vale para a IA também. */
const semTravessao = (t: string) => t.replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",").trim();

const texto = (v: unknown) => (typeof v === "string" ? semTravessao(v) : "");

export function normalizarLeitura(bruto: Record<string, unknown>): Leitura {
  const etapa = typeof bruto.etapa_sugerida === "string" ? bruto.etapa_sugerida.trim().toLowerCase() : "";
  const dias = Number(bruto.retorno_em_dias);
  const resposta = texto(bruto.resposta);
  const alerta = texto(bruto.alerta);
  return {
    situacao: texto(bruto.situacao),
    leitura: texto(bruto.leitura),
    etapa_sugerida: (ESTAGIOS as readonly string[]).includes(etapa) ? (etapa as Estagio) : null,
    porque_etapa: texto(bruto.porque_etapa),
    proximo_passo: texto(bruto.proximo_passo),
    retorno_em_dias: Number.isFinite(dias) && dias >= 0 && dias <= 90 ? Math.round(dias) : 3,
    resposta: resposta || null,
    alerta: alerta || null,
  };
}
