/**
 * Selo do Performance: roseta rosa com a seta escondida no monograma RR.
 * Formas preenchidas preservam a ponta, as hastes e as bases em tamanho pequeno.
 * Manter o desenho igual ao SeloPerformance do pacote @vitrine/plataforma.
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
      role={rotulo ? "img" : undefined}
      aria-label={rotulo || undefined}
      aria-hidden={rotulo ? undefined : true}
      focusable="false"
      style={{ color: apagado ? "#b5b5b5" : "#e31b62", verticalAlign: "-0.2em", flex: "none" }}
    >
      <path
        fill="currentColor"
        d="M12 0.8C13.466 0.8 14.434 2.942 15.559 3.408C16.684 3.874 18.883 3.044 19.92 4.08C20.956 5.117 20.126 7.316 20.592 8.441C21.058 9.566 23.2 10.534 23.2 12C23.2 13.466 21.058 14.434 20.592 15.559C20.126 16.684 20.956 18.883 19.92 19.92C18.883 20.956 16.684 20.126 15.559 20.592C14.434 21.058 13.466 23.2 12 23.2C10.534 23.2 9.566 21.058 8.441 20.592C7.316 20.126 5.117 20.956 4.08 19.92C3.044 18.883 3.874 16.684 3.408 15.559C2.942 14.434 0.8 13.466 0.8 12C0.8 10.534 2.942 9.566 3.408 8.441C3.874 7.316 3.044 5.117 4.08 4.08C5.117 3.044 7.316 3.874 8.441 3.408C9.566 2.942 10.534 0.8 12 0.8Z"
      />
      {/* Duas diagonais e duas hastes com bases curvas, como no centro da logo. */}
      <path
        fill="#fff"
        d="M11.55 5.15 6.65 12.15 8.95 12.6 11.55 8.7ZM12.45 5.15 17.35 12.15 15.05 12.6 12.45 8.7ZM9.15 13H11.55V17.1C11.55 17.84 11.62 18.05 11.85 18.22V18.55H8.7V18.22C9.61 18.16 9.85 17.81 9.85 17.1V13.75H9.15ZM14.85 13H12.45V17.1C12.45 17.84 12.38 18.05 12.15 18.22V18.55H15.3V18.22C14.39 18.16 14.15 17.81 14.15 17.1V13.75H14.85Z"
      />
    </svg>
  );
}
