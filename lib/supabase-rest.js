/* ============================================================
   FALAR COM O SUPABASE DE DENTRO DE UMA ROTA DE API

   As rotas em `pages/api` não têm sessão de usuário: elas rodam para quem
   chega da rua (um formulário do site, uma notificação do Mercado Pago),
   então `auth.uid()` é nulo lá e o RLS não tem por quem filtrar. O caminho é
   a SERVICE ROLE KEY, que ignora o RLS, mais o dono escrito à mão em
   `CRM_OWNER_ID`.

   Isto era um helper privado dentro de pages/api/lead.js e saiu para cá em
   20/08, quando o webhook do Mercado Pago passou a precisar exatamente da
   mesma coisa. Doze linhas duplicadas não doem; o que dói é a segunda cópia
   divergir na primeira vez que alguém acertar o tratamento de erro em uma
   só.

   ⚠️ A service role key é chave de administrador. Ela NUNCA pode aparecer em
   `NEXT_PUBLIC_*`, nunca pode ser importada por componente de client, e é
   por isso que este arquivo fica em lib/ mas só é chamado de pages/api: a
   fronteira precisa ser visível na árvore de arquivos.
   ============================================================ */

const TIMEOUT_MS = 8000;

/* Um webhook que fica pendurado numa conexão morta é pior do que um que
   falha: o Mercado Pago espera resposta em segundos e reenvia quando não
   recebe, então travar aqui vira uma fila de retentativas. */
async function comTimeout(url, opcoes) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opcoes, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Uma chamada crua ao PostgREST com a service role key. `caminho` é o que
    vem depois de /rest/v1/ (tabela, filtros e select, no dialeto do
    PostgREST). */
export async function supabaseREST(caminho, opcoes = {}) {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente");

  return comTimeout(`${url.replace(/\/$/, "")}/rest/v1/${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      ...(opcoes.headers || {}),
    },
  });
}

/** GET que devolve o array já parseado, ou [] quando qualquer coisa falha.
    Silencioso de propósito: quem chama decide o que fazer com uma lista
    vazia, e um throw aqui derrubaria o webhook por causa de uma consulta
    auxiliar. */
export async function supabaseSelect(caminho) {
  try {
    const r = await supabaseREST(caminho);
    if (!r.ok) return [];
    const corpo = await r.json().catch(() => []);
    return Array.isArray(corpo) ? corpo : [];
  } catch {
    return [];
  }
}

/** O uuid do dono do CRM, para escrever numa rota que não tem usuário. */
export const donoDoCRM = () => process.env.CRM_OWNER_ID || null;
