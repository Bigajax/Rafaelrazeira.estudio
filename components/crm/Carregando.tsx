import s from "./carregando.module.css";

type Formato = "painel" | "quadro" | "lista" | "ficha";

/** Estrutura estática da próxima tela; apenas o pequeno indicador de estado se move. */
export function Carregando({
  area = "painel",
  formato = "painel",
  compacto = false,
}: {
  area?: string;
  formato?: Formato;
  compacto?: boolean;
  // Compatibilidade com telas locais que também reutilizam este componente.
  palavra?: string;
  sangra?: boolean;
}) {
  return (
    <section
      className={`${s.carregando} ${compacto ? s.compacto : ""}`}
      aria-busy="true"
      aria-label={`Carregando ${area}`}
    >
      <div className={s.estado} role="status" aria-live="polite">
        <span className={s.indicador} aria-hidden="true" />
        <span>Carregando {area}…</span>
      </div>
      <div className={s.estrutura} aria-hidden="true">
        <div className={s.cabecalho}>
          <span className={s.titulo} />
          <span className={s.acao} />
        </div>
        {formato === "quadro" ? (
          <>
            <div className={s.resumo}>
              <span />
              <span />
              <span />
            </div>
            <div className={s.quadro}>
              {Array.from({ length: 5 }, (_, i) => (
                <div className={s.coluna} key={i}>
                  <span className={s.colunaTitulo} />
                  {Array.from({ length: i === 2 ? 2 : 3 }, (_, j) => (
                    <div className={s.cartao} key={j}>
                      <span />
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : formato === "ficha" ? (
          <div className={s.ficha}>
            <div className={s.bloco}>
              <span className={s.linhaLarga} />
              <span />
              <span />
              <span className={s.linhaCurta} />
            </div>
            <div className={s.bloco}>
              <span />
              <span />
              <span className={s.linhaCurta} />
            </div>
          </div>
        ) : (
          <>
            {formato === "painel" ? (
              <div className={s.indicadores}>
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i}>
                    <span />
                    <span className={s.valor} />
                    <span />
                  </div>
                ))}
              </div>
            ) : null}
            <div className={s.lista}>
              {Array.from({ length: compacto ? 3 : 5 }, (_, i) => (
                <div className={s.linha} key={i}>
                  <div>
                    <span />
                    <span className={s.linhaCurta} />
                  </div>
                  <span className={s.acao} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
