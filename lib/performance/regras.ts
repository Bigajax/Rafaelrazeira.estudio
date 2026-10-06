/* ============================================================
   PERFORMANCE: as regras puras (06/10/2026)
   Sem import de servidor: este arquivo roda no navegador também.
   ============================================================ */

import type { PerfLoja } from "@/lib/crm/tipos";

export type SituacaoLoja = "para_sempre" | "liberada" | "travada" | "sem_chave";

/* A mesma conta de perf_liberada() do banco, para a tela não discordar dele. */
export function situacaoDaLoja(l: Pick<PerfLoja, "para_sempre" | "liberado_ate" | "chave_prefixo">): SituacaoLoja {
  if (!l.chave_prefixo) return "sem_chave";
  if (l.para_sempre) return "para_sempre";
  if (l.liberado_ate && new Date(l.liberado_ate).getTime() > Date.now()) return "liberada";
  return "travada";
}
