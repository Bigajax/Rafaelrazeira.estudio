/**
 * O SELO DO PERFORMANCE (07/10/2026), a mesma marca que vive no molde em
 * components/painel/SeloPerformance.tsx: a roseta de doze pontas em rosa com
 * a seta do monograma RR dentro (era o raio verde até 07/10). Aqui ela aparece no relatório do mês
 * e na lista de lojas do CRM (apagada quando a loja não tem o plano).
 * Mudou o desenho num lugar, muda no outro.
 */
export function Selo({
  tamanho = 18,
  apagado = false,
  rotulo = "Performance",
  className,
}: {
  tamanho?: number;
  apagado?: boolean;
  rotulo?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      role="img"
      aria-label={rotulo}
      style={{ color: apagado ? "#b5b5b5" : "#e31b62", verticalAlign: "-0.2em", flex: "none" }}
    >
      <path
        fill="currentColor"
        d="M12 1Q14.56 2.44 17.5 2.47Q19 5 21.53 6.5Q21.56 9.44 23 12Q21.56 14.56 21.53 17.5Q19 19 17.5 21.53Q14.56 21.56 12 23Q9.44 21.56 6.5 21.53Q5 19 2.47 17.5Q2.44 14.56 1 12Q2.44 9.44 2.47 6.5Q5 5 6.5 2.47Q9.44 2.44 12 1Z"
      />
      {/* a seta do monograma RR (07/10, pedido do Rafael): o chevron do
          alto, a barra, as duas hastes com o vão no meio e os pés */}
      <g transform="translate(12 11.7) scale(1.15) translate(-12 -11.7)">
      <path d="M7.7 11.5 12 5.3 16.3 11.5" fill="none" stroke="#fff" strokeWidth={1.55} strokeMiterlimit={10} />
      <path d="M9.2 11.2h5.6" stroke="#fff" strokeWidth={1.1} />
      <path d="M11 11.2v6.4M13 11.2v6.4" stroke="#fff" strokeWidth={1.5} />
      <path d="M9.3 18.1h2.4M12.3 18.1h2.4" stroke="#fff" strokeWidth={1.1} />
      </g>
    </svg>
  );
}
