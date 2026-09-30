/* ============================================================
   A RÉGUA DO PROJETO

   As seis etapas numa linha só, o mesmo objeto do trilho deitado: uma
   linha inteira com estações. Estação cheia de tinta é etapa pronta; a
   verde é a da vez; vazada é o que ainda vem. Responde de relance "onde
   este cliente está", sem abrir nada.

   `grande` é a do projeto aberto, com o nome e a contagem de cada etapa;
   a da lista é só as estações e o nome da etapa da vez.
   ============================================================ */

import { ETAPAS, type Etapa, type SituacaoEtapa } from "@/lib/projetos/tipos";
import p from "@/app/(pt)/crm/projetos.module.css";

export function Regua({
  situacoes,
  atual,
  grande = false,
}: {
  situacoes: Record<Etapa, SituacaoEtapa>;
  atual: Etapa | null;
  grande?: boolean;
}) {
  return (
    <ol className={`${p.regua} ${grande ? p.reguaGrande : ""}`} aria-label="Etapas do projeto">
      {ETAPAS.map((e) => {
        const s = situacoes[e.id];
        const estado = s.pronta ? p.estacaoPronta : e.id === atual ? p.estacaoAtual : "";
        return (
          <li key={e.id} className={`${p.estacao} ${estado}`} aria-current={e.id === atual ? "step" : undefined}>
            <span className={p.estacaoMarca} aria-hidden="true" />
            {grande ? (
              <span className={p.estacaoTexto}>
                <b>{e.nome}</b>
                <i>
                  {s.feitos}/{s.total}
                </i>
              </span>
            ) : (
              <span className={p.somenteLeitor}>
                {e.nome}: {s.pronta ? "pronta" : e.id === atual ? "em andamento" : "a fazer"}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
