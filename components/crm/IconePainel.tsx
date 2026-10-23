import type { ReactNode } from "react";

export type IconePainelNome =
  | "hoje"
  | "clientes"
  | "funil"
  | "mensagens"
  | "producao"
  | "projetos"
  | "performance"
  | "suporte"
  | "caixa"
  | "financeiro"
  | "marketing"
  | "ai"
  | "metricas"
  | "plano"
  | "sair"
  | "menu";

const desenhos: Record<IconePainelNome, ReactNode> = {
  clientes: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20v-3a6 6 0 0 1 12 0v3ZM16 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1" />
    </>
  ),
  hoje: (
    <>
      <path d="m3 10 9-7 9 7v10H3Z" />
      <path d="M9 20v-7h6v7" />
    </>
  ),
  funil: (
    <>
      <path d="M3 4h18l-7 9v6l-4 2v-8Z" />
    </>
  ),
  mensagens: (
    <>
      <path d="M4 4h16v13H8l-4 4Z" />
      <path d="M8 8h8M8 12h5" />
    </>
  ),
  producao: (
    <>
      <path d="m14 4 6 6M3 21l5-1L20 8a3 3 0 0 0-4-4L4 16Z" />
      <path d="m5 15 4 4" />
    </>
  ),
  projetos: (
    <>
      <path d="M3 6h7l2 2h9v12H3Z" />
      <path d="M3 6V4h7l2 2" />
    </>
  ),
  suporte: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
    </>
  ),
  performance: (
    <>
      <path d="M4 3v17h17M8 14l4-5 4 3 5-7" />
    </>
  ),
  caixa: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 9h18M16 13h5" />
      <circle cx="16" cy="15" r=".5" />
    </>
  ),
  financeiro: (
    <>
      <path d="M12 3v18M17 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6" />
    </>
  ),
  marketing: (
    <>
      <path d="m3 10 17-6v16L3 14ZM7 15l2 6h4l-2-5M20 9h2M20 15h2" />
    </>
  ),
  ai: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4M18 4h4" />
    </>
  ),
  metricas: (
    <>
      <path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7" />
    </>
  ),
  plano: (
    <>
      <path d="M5 21V3M5 4h14l-3 4 3 4H5" />
    </>
  ),
  sair: (
    <>
      <path d="M9 4H4v16h5M9 12h12m-4-4 4 4-4 4" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </>
  ),
};

export function IconePainel({ nome, className }: { nome: IconePainelNome; className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {desenhos[nome]}
    </svg>
  );
}
