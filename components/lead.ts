/* ============================================================
   SALVAR O LEAD — o único caminho do formulário até o banco.

   Fica fora dos arquivos de tracking de propósito: não é medição, é o
   registro do negócio. Tracking pode ser desligado por consentimento, por
   ambiente ou por aparelho; isto aqui nunca pode, porque é a pessoa pedindo
   contato. A rota /api/lead é que fala com o Supabase, com a service role key
   que jamais desce para o navegador.

   Compartilhado entre as páginas: a /e-commerce entrou em 06/08 e a
   /vitrine-digital entra depois, mandando `pagina: "vitrine-digital"`.

   Devolve true/false, e nunca lança. Quem chama decide o que fazer com o
   false, e a decisão sempre é a mesma: seguir com o WhatsApp direto, o
   caminho antigo. Perder o lead do banco é ruim; perder a conversa é pior.
   ============================================================ */

/* Teto de espera do lado do cliente, um pouco acima do timeout da rota (6s):
   se o servidor for demorar mais que isso, a pessoa está olhando um botão
   parado, e a saída boa é cair no WhatsApp em vez de continuar esperando. */
const TIMEOUT_MS = 8000;

export type LeadPayload = Record<string, unknown> & { pagina: string; nome: string; whatsapp: string };

export async function salvarLead(dados: LeadPayload): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
      signal: ctrl.signal,
    });
    return r.ok;
  } catch {
    /* rede caída, aba fechando, timeout: tudo cai no mesmo lugar */
    return false;
  } finally {
    clearTimeout(t);
  }
}
