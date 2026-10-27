/* ============================================================
   LIMPAR A PRODUÇÃO — tirar do Storage o que já está no Drive

   Em 26/10/2026 o bucket `producao` tinha 1,4 GB e o plano grátis do
   Supabase aceita 1 GB no total. Os arquivos das prévias paradas e das
   lojas entregues foram baixados para o Drive e conferidos um a um
   (4.933 de 4.933). As vitrines não leem deste bucket: o
   `exportar-vitrine.ts` copia cada foto para o `public/` delas.

   Isto APAGA de vez. Por isso:
     - só apaga o que está na lista do Drive E existe lá com o mesmo
       tamanho; o que não estiver no backup, pula;
     - sem --apagar, só mostra o que faria.
   As linhas do CRM (prod_ativos) ficam: a oficina daquela loja mostra
   a foto quebrada até voltar com `--restaurar`, que sobe do Drive de
   novo no mesmo caminho.

   USO (na raiz do repo):
     node scripts/limpar-producao.mjs                # só mostra
     node scripts/limpar-producao.mjs --apagar       # apaga
     node scripts/limpar-producao.mjs --restaurar <pasta-da-loja>
   ============================================================ */
import fs from 'fs';
import path from 'path';

const DRIVE = 'G:/Meu Drive/Estúdio/backup-supabase/producao';
const LISTA = path.join(DRIVE, '_limpeza-2026-10-26-arquivos.json');

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => { const k = l.indexOf('='); return [l.slice(0, k), l.slice(k + 1).replace(/^"|"$/g, '')]; }));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };
const local = c => path.join(DRIVE, ...c.split('/'));

const ir = process.argv.indexOf('--restaurar');
if (ir > 0) {
  const pasta = process.argv[ir + 1];
  const todos = JSON.parse(fs.readFileSync(path.join(DRIVE, '_lista.json'), 'utf8')).filter(o => o.caminho.startsWith(pasta + '/'));
  let ok = 0;
  for (const o of todos) {
    const ext = path.extname(o.caminho).slice(1).toLowerCase();
    const tipo = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4', json: 'application/json' }[ext] || 'application/octet-stream';
    const r = await fetch(`${url}/storage/v1/object/producao/${o.caminho.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST', headers: { ...h, 'Content-Type': tipo, 'x-upsert': 'true' }, body: fs.readFileSync(local(o.caminho)),
    });
    if (r.ok) ok++; else console.log('FALHA', o.caminho, r.status);
  }
  console.log(`restaurados ${ok} de ${todos.length}`);
  process.exit(ok === todos.length ? 0 : 1);
}

const tamanhos = new Map(JSON.parse(fs.readFileSync(path.join(DRIVE, '_lista.json'), 'utf8')).map(o => [o.caminho, o.tamanho]));
const lista = JSON.parse(fs.readFileSync(LISTA, 'utf8'));
const seguros = lista.filter(c => fs.existsSync(local(c)) && fs.statSync(local(c)).size === tamanhos.get(c));
const mb = seguros.reduce((s, c) => s + tamanhos.get(c), 0) / 1048576;
console.log(`${seguros.length} de ${lista.length} arquivos estão no Drive com o mesmo tamanho (${mb.toFixed(0)} MB)`);
if (seguros.length < lista.length) console.log(`${lista.length - seguros.length} ficam no Supabase: não estão no backup`);

if (!process.argv.includes('--apagar')) { console.log('nada apagado (rode com --apagar)'); process.exit(0); }

let apagados = 0;
for (let i = 0; i < seguros.length; i += 500) {
  const r = await fetch(`${url}/storage/v1/object/producao`, {
    method: 'DELETE', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: seguros.slice(i, i + 500) }),
  });
  const j = await r.json();
  if (!r.ok) { console.log('FALHA no lote', i, r.status, JSON.stringify(j).slice(0, 200)); process.exit(1); }
  apagados += j.length;
}
console.log(`apagados ${apagados} arquivos do bucket producao`);
