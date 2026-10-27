/* ============================================================
   BACKUP DO BANCO — uma cópia do CRM fora do Supabase

   O plano grátis do Supabase não tem backup nenhum. Se o Rafael descer
   do Pro (decidido a estudar em 26/10/2026), um DELETE errado ou um SQL
   antigo rodado de novo apaga leads, contratos e o Caixa sem volta.

   Isto lê TODAS as tabelas pela API (chave de serviço, só leitura) e
   grava um JSON por tabela numa pasta com a data, no Google Drive. Não
   precisa de pg_dump nem da senha do banco. A ESTRUTURA (tabelas,
   policies, funções) não vai junto: ela mora nos .sql de `supabase/`,
   no git. O que este backup guarda são os DADOS.

   Confere cada tabela pelo `count=exact`: se o número de linhas
   gravadas não bater, a tabela entra em `_resumo.json` como FALHA, e o
   script sai com código 1.

   USO (na raiz do repo):
     node scripts/backup-banco.mjs
     node scripts/backup-banco.mjs --destino "D:/outra/pasta"

   Guarda as 8 cópias mais novas (dois meses, rodando toda semana).
   ============================================================ */
import fs from 'fs';
import path from 'path';

const PADRAO = 'G:/Meu Drive/Estúdio/backup-supabase/banco';
const MANTER = 8;
const i = process.argv.indexOf('--destino');
const raiz = i > 0 ? process.argv[i + 1] : PADRAO;

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => { const k = l.indexOf('='); return [l.slice(0, k), l.slice(k + 1).replace(/^"|"$/g, '')]; }));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local'); process.exit(1); }
const h = { apikey: key, Authorization: 'Bearer ' + key };

const agora = new Date();
const carimbo = agora.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', '_').replace(/:/g, 'h').slice(0, 16);
const pasta = path.join(raiz, carimbo);
fs.mkdirSync(pasta, { recursive: true });

const spec = await (await fetch(url + '/rest/v1/', { headers: h })).json();
const tabelas = Object.keys(spec.definitions || {}).sort();
if (!tabelas.length) { console.error('a API não listou nenhuma tabela'); process.exit(1); }

async function ler(tabela) {
  const linhas = [];
  let esperado = null;
  for (let de = 0; ; de += 1000) {
    const res = await fetch(`${url}/rest/v1/${tabela}?select=*`, {
      headers: { ...h, Range: `${de}-${de + 999}`, 'Range-Unit': 'items', Prefer: 'count=exact' },
    });
    if (!res.ok && res.status !== 416) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    if (esperado === null) esperado = Number((res.headers.get('content-range') || '').split('/')[1]);
    const pagina = res.status === 416 ? [] : await res.json();
    linhas.push(...pagina);
    if (pagina.length < 1000) break;
  }
  return { linhas, esperado };
}

const resumo = { feito_em: agora.toISOString(), projeto: url, tabelas: {} };
let falhas = 0;
for (const t of tabelas) {
  try {
    const { linhas, esperado } = await ler(t);
    fs.writeFileSync(path.join(pasta, t + '.json'), JSON.stringify(linhas));
    const ok = Number.isNaN(esperado) || linhas.length === esperado;
    resumo.tabelas[t] = { linhas: linhas.length, esperado, ok };
    if (!ok) { falhas++; console.log(`FALHA ${t}: ${linhas.length} de ${esperado}`); }
  } catch (e) {
    falhas++; resumo.tabelas[t] = { ok: false, erro: e.message };
    console.log(`FALHA ${t}: ${e.message}`);
  }
}

// Os logins (Auth): sem eles, um banco restaurado não tem quem entre no CRM.
try {
  const r = await (await fetch(url + '/auth/v1/admin/users?per_page=1000', { headers: h })).json();
  const users = (r.users || []).map(u => ({ id: u.id, email: u.email, criado: u.created_at, metadados: u.user_metadata }));
  fs.writeFileSync(path.join(pasta, '_usuarios.json'), JSON.stringify(users, null, 1));
  resumo.usuarios = users.length;
} catch (e) { falhas++; resumo.usuarios = 'FALHA: ' + e.message; }

fs.writeFileSync(path.join(pasta, '_resumo.json'), JSON.stringify(resumo, null, 1));
const total = Object.values(resumo.tabelas).reduce((s, x) => s + (x.linhas || 0), 0);
console.log(`${tabelas.length} tabelas, ${total} linhas, ${resumo.usuarios} usuários, ${falhas} falhas -> ${pasta}`);

// Só apaga cópia antiga depois de uma nova sem falha.
if (!falhas) {
  const antigas = fs.readdirSync(raiz).filter(n => /^\d{4}-\d{2}-\d{2}_/.test(n)).sort().slice(0, -MANTER);
  for (const n of antigas) { fs.rmSync(path.join(raiz, n), { recursive: true }); console.log('cópia antiga removida:', n); }
}
process.exit(falhas ? 1 : 0);
