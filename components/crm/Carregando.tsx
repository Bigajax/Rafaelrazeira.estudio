import s from "./carregando.module.css";

type Formato = "painel" | "quadro" | "lista" | "ficha";

/* ============================================================
   O CARREGAMENTO: A MARCA NO MEIO, SEM ESCRITA (10/11/2026)

   Até aqui era o esqueleto da tela que vinha (quadro, lista, ficha) com
   "Carregando o funil…" no canto de cima. O Rafael pediu outro desenho,
   "sem escrita e centralizado no meio": o monograma parado no centro da
   área, com um aro fino girando em volta.

   O texto não some para quem usa leitor de tela: fica no aria-label.
   `formato` continua na assinatura porque as 24 rotas o passam, mas não
   desenha mais nada. O que nunca fazer: devolver texto visível aqui.
   ============================================================ */
export function Carregando({
  area = "painel",
  compacto = false,
}: {
  area?: string;
  formato?: Formato;
  compacto?: boolean;
  palavra?: string;
  sangra?: boolean;
}) {
  return (
    <section
      className={`${s.carregando} ${compacto ? s.compacto : ""}`}
      role="status"
      aria-busy="true"
      aria-label={`Carregando ${area}`}
    >
      <span className={s.marca} aria-hidden="true">
        <span className={s.aro} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/rr.webp" alt="" width={36} height={36} />
      </span>
    </section>
  );
}
