import type { CSSProperties } from "react";
const caminhos = {
  busca: "m21 21-4.4-4.4M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z",
  mais: "M12 5v14M5 12h14",
  filtros: "M4 7h16M7 12h10M10 17h4",
  seta: "M5 12h14m-5-5 5 5-5 5",
  expandir: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  dinheiro: "M12 2v20m5-15H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  proposta:
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h5",
  relogio: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  alerta:
    "M12 8v5m0 4h.01M10.3 3.9 1.8 18.1A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0Z",
  ganho: "m8 12 3 3 5-6m5 3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  perdido: "m9 9 6 6m0-6-6 6m12-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  geladeira: "M8 5v14M16 5v14",
  pessoas:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M13 3.1a4 4 0 0 1 0 7.8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
};
export function IconePipeline({
  nome,
  className,
  style,
}: {
  nome: keyof typeof caminhos;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={caminhos[nome]} />
    </svg>
  );
}
