import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** A mesma arte do arquivo portátil, servida apenas dentro do CRM autenticado. */
export async function moldePlacas(nome?: string): Promise<string> {
  const html = await readFile(path.join(process.cwd(), "docs/placas/molde.html"), "utf8");
  const data = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const configuracao = JSON.stringify({ loja: nome || "Loja Modelo", data }).replace(/</g, "\\u003c");
  return html
    .replace('<body>', '<body data-ambiente="crm">')
    .replace('<script id="configuracao-salva" type="application/json">null</script>',
      () => `<script id="configuracao-salva" type="application/json">${configuracao}</script>`)
    .replace('</head>', `<style>
      body[data-ambiente="crm"] .barra,
      body[data-ambiente="crm"] .intro,
      body[data-ambiente="crm"] .rodape { display:none }
      body[data-ambiente="crm"] main { padding:0;max-width:none }
      body[data-ambiente="crm"] .oficina { border:0;border-radius:0 }
      /* os controles na régua do estúdio (30/10/2026): no CRM o editor saía
         creme e verde, com botões de canto 7; a placa em si (a arte, os
         acabamentos) segue com as cores do Performance */
      body[data-ambiente="crm"] { --papel:#ffffff; --tinta:#14181a; --linha:#e6e6e3; --muted:#6b7072; background:#ffffff; color:#14181a }
      body[data-ambiente="crm"] .oficina { background:#ffffff }
      body[data-ambiente="crm"] input:not([type=checkbox]), body[data-ambiente="crm"] select { background:#ffffff; border-color:#e6e6e3; border-radius:12px; color:#14181a }
      body[data-ambiente="crm"] input:hover, body[data-ambiente="crm"] select:hover, body[data-ambiente="crm"] input:focus, body[data-ambiente="crm"] select:focus { border-color:#14181a }
      body[data-ambiente="crm"] .passo { border-color:#e6e6e3; color:#6b7072 }
      body[data-ambiente="crm"] .botao { border-color:#e6e6e3; border-radius:980px; color:#14181a; background:#ffffff; font-size:13px }
      body[data-ambiente="crm"] .primario { background:#14181a; border-color:#14181a; color:#ffffff }
      body[data-ambiente="crm"] .tom[aria-pressed=true] { outline-color:#14181a }
      body[data-ambiente="crm"] .check input { accent-color:#14181a }
      body[data-ambiente="crm"] .previsualizacao { background:#f6f6f4 }
      body[data-ambiente="crm"] .previa-cabecalho { color:#6b7072; letter-spacing:0; text-transform:none; font-size:12px }
      body[data-ambiente="crm"] .ao-vivo::before { background:#0c9159 }
      body[data-ambiente="crm"] .legenda { color:#6b7072 }
      body[data-ambiente="crm"] button:focus-visible, body[data-ambiente="crm"] input:focus-visible, body[data-ambiente="crm"] select:focus-visible, body[data-ambiente="crm"] summary:focus-visible { outline-color:#14181a }
    </style></head>`);
}
