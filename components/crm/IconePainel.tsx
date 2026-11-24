import type { ReactNode } from "react";

export type IconePainelNome =
  | "hoje"
  | "clientes"
  | "funil"
  | "mensagens"
  | "templates"
  | "presente"
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
  | "buscar"
  | "menu";

/* ============================================================
   OS ÍCONES DO PAINEL, REDESENHADOS (24/11/2026)
   Pedido do Rafael: "melhore os ícones e as animações dos ícones". O
   conjunto antigo tinha canto vivo e peso desigual, e ficava parado.
   Agora os 18 saem da mesma grade (24), com canto arredondado e traço 1.7.

   Cada desenho é feito de PARTES, e três atributos dizem o que cada parte
   faz (o CSS mora no fim de app/(pt)/crm/crm.module.css, "os ícones vivos"):
   - data-f      a forma principal: ganha um preenchimento leve quando a
                 tela do ícone está aberta;
   - data-mov    o movimento da parte ao passar o mouse no item do menu:
                 sobe, desce, vai, gira, balanca, cresce, pulsa, desenha;
   - data-d      o atraso da parte (1, 2), para as linhas e barras entrarem
                 uma depois da outra.
   Parte com data-mov="desenha" precisa de pathLength={1}: o traço se
   desenha pelo comprimento normalizado.
   ============================================================ */
const desenhos: Record<IconePainelNome, ReactNode> = {
  hoje: (
    <>
      <path data-f d="M4 10.6 12 4l8 6.6V18.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5Z" />
      <path data-mov="desenha" pathLength={1} d="M9.75 20v-5a2.25 2.25 0 0 1 4.5 0v5" />
    </>
  ),
  clientes: (
    <>
      <g data-f>
        <circle cx="9" cy="8" r="3.1" />
        <path d="M3.5 19.5v-.8a5.5 5.5 0 0 1 11 0v.8Z" />
      </g>
      <path data-mov="vai" d="M15.6 5.1a3.1 3.1 0 0 1 0 5.8M17.4 14.2a5.2 5.2 0 0 1 3.1 4.7v.6" />
    </>
  ),
  funil: (
    <>
      <path data-f d="M4.2 5h15.6a.5.5 0 0 1 .4.8L14 13.4v4.9a1 1 0 0 1-.55.9l-2 1a1 1 0 0 1-1.45-.9v-5.9L3.8 5.8a.5.5 0 0 1 .4-.8Z" />
      <path data-mov="desenha" pathLength={1} d="M8 8.6h8" />
    </>
  ),
  mensagens: (
    <>
      <path data-f d="M5.5 4.5h13a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5v-14A1.5 1.5 0 0 1 5.5 4.5Z" />
      <path data-mov="desenha" pathLength={1} d="M8.5 9h7" />
      <path data-mov="desenha" data-d="1" pathLength={1} d="M8.5 12.5h4.5" />
    </>
  ),
  /* a folha com o canto dobrado (30/10): Templates não pode ser o balão */
  templates: (
    <>
      <path data-f d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5Z" />
      <path d="M13.5 3.5v3.5A1.5 1.5 0 0 0 15 8.5h3.5" />
      <path data-mov="desenha" pathLength={1} d="M9 13h6" />
      <path data-mov="desenha" data-d="1" pathLength={1} d="M9 16.5h3.5" />
    </>
  ),
  presente: (
    <>
      <path data-f d="M5 11.5h14V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z" />
      <path d="M12 11.5V20" />
      <g data-mov="sobe">
        <path d="M4.5 8h15a.5.5 0 0 1 .5.5v2.5a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5V8.5a.5.5 0 0 1 .5-.5Z" />
        <path d="M12 8c-1.1-2.9-4.4-3.7-4.4-1.6C7.6 7.8 10 8 12 8Zm0 0c1.1-2.9 4.4-3.7 4.4-1.6C16.4 7.8 14 8 12 8Z" />
      </g>
    </>
  ),
  producao: (
    <>
      <g data-mov="balanca">
        <path data-f d="M4.5 19.5l.9-3.8L16.6 4.5a2.05 2.05 0 0 1 2.9 2.9L8.3 18.6Z" />
        <path d="M14.6 6.5l2.9 2.9" />
      </g>
      <path data-mov="desenha" pathLength={1} d="M12.5 20h7" />
    </>
  ),
  projetos: (
    <>
      <path data-f d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h3.9a1 1 0 0 1 .7.3l1.6 1.7H19A1.5 1.5 0 0 1 20.5 9v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18Z" />
      <path data-mov="desenha" pathLength={1} d="M3.5 11.2h17" />
    </>
  ),
  performance: (
    <>
      <path d="M4 4v14.5A1.5 1.5 0 0 0 5.5 20H20" />
      <path data-mov="desenha" pathLength={1} d="M7.8 14.6l3.6-4.2 3.1 2.6L19.8 7" />
    </>
  ),
  suporte: (
    <>
      <circle data-f cx="12" cy="12" r="8.5" />
      <path data-mov="balanca" d="M9.7 9.7a2.4 2.4 0 1 1 3.5 2.1c-.7.4-1.2 1-1.2 1.8v.3" />
      <path data-mov="pulsa" d="M12 16.9h.01" />
    </>
  ),
  caixa: (
    <>
      <rect data-f x="3.5" y="6" width="17" height="13.5" rx="2.5" />
      <path d="M3.5 10.2h17" />
      <path data-mov="pulsa" d="M15.2 14.8h2.1" />
    </>
  ),
  financeiro: (
    <>
      <path d="M12 3.5v17" />
      <path data-mov="desenha" pathLength={1} d="M16.6 7.6H10.2a2.7 2.7 0 0 0 0 5.4h3.6a2.7 2.7 0 0 1 0 5.4H7" />
    </>
  ),
  marketing: (
    <>
      <g data-mov="balanca">
        <path data-f d="M4 10.2v3.6a1 1 0 0 0 1 1h2.2l7.3 3.9V5.3L7.2 9.2H5a1 1 0 0 0-1 1Z" />
        <path d="M8.2 14.9v3.3a1.4 1.4 0 0 0 2.8 0v-1.9" />
      </g>
      <path data-mov="pulsa" d="M17.8 9.4a3.6 3.6 0 0 1 0 5.2" />
    </>
  ),
  ai: (
    <>
      <path data-f data-mov="gira" d="M10.8 4.3l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9Z" />
      <path data-mov="pulsa" d="M18.6 3.6v3.8M16.7 5.5h3.8" />
    </>
  ),
  metricas: (
    <>
      <rect data-f data-mov="cresce" x="4.4" y="12.5" width="3.6" height="7.5" rx="1" />
      <rect data-f data-mov="cresce" data-d="1" x="10.2" y="4.5" width="3.6" height="15.5" rx="1" />
      <rect data-f data-mov="cresce" data-d="2" x="16" y="9" width="3.6" height="11" rx="1" />
    </>
  ),
  plano: (
    <>
      <path d="M5.5 20.5V4" />
      <path data-f data-mov="ondula" d="M5.5 4.8h11.4a.4.4 0 0 1 .3.65L15 8.4l2.2 2.95a.4.4 0 0 1-.3.65H5.5Z" />
    </>
  ),
  sair: (
    <>
      <path d="M9.8 4.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h3.8" />
      <path data-mov="vai" d="M10 12h10.4m-3.6-3.6 3.6 3.6-3.6 3.6" />
    </>
  ),
  buscar: (
    <>
      <circle data-f cx="11" cy="11" r="6.5" />
      <path data-mov="vai" d="m16 16 4 4" />
    </>
  ),
  menu: (
    <>
      <path d="M4.5 6.5h15M4.5 12h15M4.5 17.5h15" />
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
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icone={nome}
    >
      {desenhos[nome]}
    </svg>
  );
}
