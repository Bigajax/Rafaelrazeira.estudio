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
    </style></head>`);
}
