/* Postgres em memória + a API real. Não carrega .env nem acessa produção. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const Module = require('node:module');
const ts = require('typescript');
const { PGlite } = require(path.resolve('.tmp/raspadinha-qa/node_modules/@electric-sql/pglite'));
const { NextRequest } = require('next/server');
const owner = '11111111-1111-4111-8111-111111111111';
const outro = '22222222-2222-4222-8222-222222222222';
const campanha = 'bloco-arquitetura-site-2026';
const origem = 'http://localhost:3000';
const endpoint = `${origem}/api/arquitetos/sorteio`;
const cache = new Map();
function carregar(arquivo) {
  const absoluto = path.resolve(arquivo);
  if (cache.has(absoluto)) return cache.get(absoluto).exports;
  const m = new Module(absoluto, module); m.filename = absoluto; m.paths = Module._nodeModulePaths(path.dirname(absoluto)); cache.set(absoluto, m);
  const nativo = m.require.bind(m);
  m.require = nome => {
    if (nome === 'server-only') return {};
    if (nome.startsWith('@/') || nome.startsWith('./')) {
      const base = nome.startsWith('@/') ? path.resolve(nome.slice(2)) : path.resolve(path.dirname(absoluto), nome);
      if (fs.existsSync(`${base}.ts`)) return carregar(`${base}.ts`);
    }
    return nativo(nome);
  };
  m._compile(ts.transpileModule(fs.readFileSync(absoluto, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, absoluto);
  return m.exports;
}
(async () => {
  const db = new PGlite(); let servidor;
  try {
    await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant execute on functions to anon, authenticated;
      create table auth.users(id uuid primary key); insert into auth.users values ('${owner}'),('${outro}');
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth, public to anon, authenticated, service_role;`);
    const migration = fs.readFileSync('supabase/sorteio-arquitetos.sql', 'utf8');
    await db.exec(migration); await db.exec(migration);
    const cupons = fs.readFileSync('supabase/sorteio-arquitetos-cupons.sql', 'utf8');
    await db.exec(cupons); await db.exec(cupons);
    for (const total of [1,2,3,7,100,300]) {
      await db.exec('begin');
      await db.query('insert into arquiteto_sorteios(campanha,owner_id) values ($1,$2)',[campanha,owner]);
      for(let i=0;i<total;i++) await db.query('select arquiteto_inscrever($1,$2,$3,$4)',[owner,`Limite ${i}`,`4498800${String(i).padStart(4,'0')}`,String(i).padStart(64,'0')]);
      await db.query('select arquiteto_sortear_site($1)',[owner]);
      const beneficios=(await db.query('select beneficio,final_centavos,faixa50 from arquiteto_participantes')).rows;
      assert.equal(beneficios.filter(p=>p.beneficio==='site').length,1);
      assert.equal(beneficios.filter(p=>p.beneficio==='cupom50').length,Math.min(2,total-1));
      assert.equal(beneficios.filter(p=>p.beneficio==='cupom300').length,Math.max(0,total-3));
      assert.ok(beneficios.every(p=>p.final_centavos===({site:0,cupom50:74950,cupom300:119900})[p.beneficio]));
      const codigos=(await db.query('select codigo from arquiteto_participantes')).rows.map(p=>p.codigo);
      assert.equal(new Set(codigos).size,total);
      await db.exec('rollback');
    }
    // Uma campanha já encerrada antes dos cupons mantém seu vencedor e horário.
    await db.exec('begin');
    await db.query('insert into arquiteto_sorteios(campanha,owner_id) values ($1,$2)',[campanha,owner]);
    const antigo = (await db.query('select arquiteto_inscrever($1,$2,$3,$4) id',[owner,'Ganhador anterior','44998887766','a'.repeat(64)])).rows[0].id;
    for(let i=0;i<3;i++) await db.query('select arquiteto_inscrever($1,$2,$3,$4)',[owner,`Participante antigo ${i}`,`449880000${String(i).padStart(2,'0')}`,String(i).padStart(64,'0')]);
    await db.query('update arquiteto_sorteios set ganhador_id=$1,sorteado_em=now()',[antigo]);
    const horario=(await db.query('select sorteado_em from arquiteto_sorteios')).rows[0].sorteado_em;
    assert.equal((await db.query('select arquiteto_sortear_site($1) id',[owner])).rows[0].id,antigo);
    assert.deepEqual((await db.query('select sorteado_em from arquiteto_sorteios')).rows[0].sorteado_em,horario);
    assert.equal((await db.query("select count(*)::int n from arquiteto_participantes where beneficio='cupom50'")).rows[0].n,2);
    await db.exec('rollback');
    console.log('OK: 1, 2, 3, 7, 100 e 300 inscritos recebem benefícios possíveis, com valores exatos e códigos únicos; ganhador anterior preservado.');
    await db.exec('set role anon');
    await assert.rejects(db.exec('select * from arquiteto_sorteios'), /permission denied/);
    await assert.rejects(db.query('select arquiteto_sortear_site($1)', [owner]), /permission denied/);
    await assert.rejects(db.query('select arquiteto_inscrever($1,$2,$3,$4)', [owner, 'Pessoa', '44998887766', 'a'.repeat(64)]), /permission denied/);
    await db.exec('reset role; set role authenticated');
    await assert.rejects(db.query('select arquiteto_sortear_site($1)', [owner]), /permission denied/);
    await assert.rejects(db.exec('delete from arquiteto_participantes'), /permission denied/);
    await db.exec('reset role; set role service_role');
    await assert.rejects(db.exec('delete from arquiteto_sorteios'), /permission denied/);
    await db.exec('reset role');
    console.log('OK: migração reaplicável; funções fechadas para anon/authenticated e sem exclusão pela chave de serviço.');

    let falhar = false;
    servidor = http.createServer(async (req, res) => {
      try {
        if (falhar) { res.writeHead(503, {'Content-Type':'application/json'}); res.end(JSON.stringify({message:'Banco indisponível'})); return; }
        const url = new URL(req.url, 'http://localhost');
        let corpo;
        if (url.pathname === '/rest/v1/rpc/arquiteto_inscrever') {
          assert.equal(req.method, 'POST'); let texto = ''; for await (const chunk of req) texto += chunk;
          const d = JSON.parse(texto);
          corpo = (await db.query('select arquiteto_inscrever($1,$2,$3,$4) id', [d.p_owner,d.p_nome,d.p_whatsapp,d.p_recibo_hash])).rows[0].id;
        } else {
          assert.equal(req.method, 'GET');
          const tabela = url.pathname.split('/').at(-1);
          assert.ok(['arquiteto_sorteios','arquiteto_participantes'].includes(tabela));
          const valores = [], filtros = [];
          for (const [campo,valor] of url.searchParams) {
            if (campo === 'select') continue;
            assert.ok(['campanha','owner_id','recibo_hash'].includes(campo)); assert.ok(valor.startsWith('eq.'));
            valores.push(valor.slice(3)); filtros.push(`${campo}=$${valores.length}`);
          }
          corpo = (await db.query(`select * from ${tabela} where ${filtros.join(' and ')}`, valores)).rows;
        }
        res.writeHead(200, {'Content-Type':'application/json'}); res.end(JSON.stringify(corpo));
      } catch(e) { res.writeHead(400, {'Content-Type':'application/json'}); res.end(JSON.stringify({code:e.code || 'QA',message:e.message})); }
    });
    await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
    process.env.SUPABASE_URL = `http://127.0.0.1:${servidor.address().port}`;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'somente-teste-local'; process.env.CRM_OWNER_ID = owner;
    const rota = carregar('app/(pt)/api/arquitetos/sorteio/route.ts');
    const get = cookie => rota.GET(new NextRequest(endpoint, {headers:cookie ? {cookie} : {}}));
    const post = (cookie, nome='Pessoa inscrita', whatsapp='44998887766', origin=origem, extra={}) => rota.POST(new NextRequest(endpoint, {
      method:'POST', headers:{'Content-Type':'application/json',Origin:origin,...(cookie ? {cookie} : {})}, body:JSON.stringify({nome,whatsapp,...extra}),
    }));
    const inicio = await get();
    assert.deepEqual(await inicio.json(), {estado:'nao-aberto'});
    assert.equal(inicio.headers.get('cache-control'), 'private, no-store');
    assert.match(inicio.headers.get('set-cookie'), /HttpOnly/); assert.match(inicio.headers.get('set-cookie'), /SameSite=strict/i);
    const ca = inicio.headers.get('set-cookie').split(';')[0];
    assert.equal((await post(ca)).status, 409);
    await db.query('insert into arquiteto_sorteios(campanha,owner_id) values ($1,$2)', [campanha,owner]);
    await assert.rejects(db.query('select arquiteto_sortear_site($1)', [owner]), /nenhum_participante/);
    assert.deepEqual(await (await get(ca)).json(), {estado:'inscricoes-abertas'});
    assert.equal((await post(null)).status, 400);
    assert.equal((await post(ca,'Pessoa','44998887766','https://outro.example')).status,403);
    assert.equal((await post(ca,'Pessoa','123')).status,400);
    assert.equal((await post(ca,'x','44998887766')).status,400);
    assert.equal((await post(ca,'Pessoa','44998887766',origem,{website:'bot'})).status,400);
    console.log('OK: abrir não inscreve, sorteio vazio recusado, validação de sessão/origem/nome/telefone e campo isca.');

    const cookies = await Promise.all(Array.from({length:12}, async () => (await get()).headers.get('set-cookie').split(';')[0]));
    const envios = await Promise.all(cookies.map((cookie,i) => post(cookie, `Pessoa ${i}`, `449880000${String(i).padStart(2,'0')}`)));
    assert.ok(envios.every(r => r.status===200));
    for (let i=0;i<envios.length;i++) assert.deepEqual(await envios[i].json(), {estado:'aguardando',nome:`Pessoa ${i}`});
    const repetidos = await Promise.all([post(cookies[0],'Nome alterado','44997776655'),post(cookies[0],'Nome alterado','44997776655')]);
    assert.ok(repetidos.every(r=>r.status===200));
    assert.equal((await db.query('select count(*)::int n from arquiteto_participantes')).rows[0].n,12);
    assert.equal((await post(ca,'Outra pessoa','44988000000')).status,409);
    console.log('OK: 12 inscrições simultâneas; repetição não duplica; WhatsApp único e nome preservado.');

    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false)`);
    assert.equal((await db.query('select * from arquiteto_participantes')).rows.length,12);
    await db.exec(`select set_config('request.jwt.claim.sub','${outro}',false)`);
    assert.equal((await db.query('select * from arquiteto_participantes')).rows.length,0);
    await db.exec('reset role');
    const sorteios = await Promise.all([db.query('select arquiteto_sortear_site($1) id',[owner]),db.query('select arquiteto_sortear_site($1) id',[owner])]);
    const ganhador = sorteios[0].rows[0].id;
    assert.equal(sorteios[1].rows[0].id,ganhador);
    const resultados = await Promise.all(cookies.map(async c => (await get(c)).json()));
    assert.equal(resultados.filter(r=>r.ganhou).length,1);
    assert.ok(resultados.every((r,i)=>r.estado==='resultado'&&r.nome===`Pessoa ${i}`));
    assert.equal(resultados.filter(r=>r.beneficio==='cupom50').length,2);
    assert.equal(resultados.filter(r=>r.beneficio==='cupom300').length,9);
    assert.equal(new Set(resultados.map(r=>r.codigo)).size,12);
    assert.ok(!JSON.stringify(resultados).includes('449880000'));
    assert.deepEqual(await (await get(ca)).json(),{estado:'encerrado'});
    assert.equal((await post(ca,'Inscrição atrasada','44999988776')).status,409);
    assert.equal((await post(cookies[0],'Pessoa 0','44988000000')).status,200);
    await assert.rejects(db.exec('update arquiteto_sorteios set sorteado_em=null,ganhador_id=null'),/não podem ser reiniciados/);
    await assert.rejects(db.exec("update arquiteto_participantes set nome='Outro nome'"),/não pode ser transferida/);
    await assert.rejects(db.query("update arquiteto_participantes set beneficio='cupom300',faixa50=null where id=$1",[ganhador]),/já foi definido/);
    await assert.rejects(db.exec('update arquiteto_participantes set final_centavos=1'),/DEFAULT|generated/);
    await assert.rejects(db.query("insert into arquiteto_participantes(campanha,nome,whatsapp,recibo_hash,beneficio) values ($1,'Duplicação','44988000099',$2,'site')",[campanha,'f'.repeat(64)]),/duplicate key/);
    await assert.rejects(db.query("insert into arquiteto_participantes(campanha,nome,whatsapp,recibo_hash,beneficio,faixa50) values ($1,'Duplicação','44988000099',$2,'cupom50',1)",[campanha,'f'.repeat(64)]),/duplicate key/);
    const foto=(await db.query('select id,beneficio,faixa50,codigo,final_centavos from arquiteto_participantes order by id')).rows;
    await db.exec(cupons);
    await db.query('select arquiteto_sortear_site($1)',[owner]);
    assert.deepEqual((await db.query('select id,beneficio,faixa50,codigo,final_centavos from arquiteto_participantes order by id')).rows,foto);
    const perdedor = (await db.query('select id from arquiteto_participantes where id<>$1 limit 1',[ganhador])).rows[0].id;
    await assert.rejects(db.query('update arquiteto_participantes set entregue_em=now() where id=$1',[perdedor]),/Somente o ganhador/);
    await db.query('update arquiteto_participantes set entregue_em=now() where id=$1',[ganhador]);
    await assert.rejects(db.query('update arquiteto_participantes set entregue_em=null where id=$1',[ganhador]),/já foi registrada/);
    const cookieGanhador = cookies[resultados.findIndex(r=>r.ganhou)];
    assert.equal((await (await get(cookieGanhador)).json()).entregue,true);
    const indiceCupom=resultados.findIndex(r=>r.beneficio==='cupom50');
    const idCupom=(await db.query('select id from arquiteto_participantes where codigo=$1',[resultados[indiceCupom].codigo])).rows[0].id;
    const usos=await Promise.all([db.query('update arquiteto_participantes set utilizado_em=now() where id=$1 and utilizado_em is null returning id',[idCupom]),db.query('update arquiteto_participantes set utilizado_em=now() where id=$1 and utilizado_em is null returning id',[idCupom])]);
    assert.equal(usos.reduce((n,r)=>n+r.rows.length,0),1);
    await assert.rejects(db.query('update arquiteto_participantes set utilizado_em=null where id=$1',[idCupom]),/já foi utilizado/);
    assert.equal((await (await get(cookies[indiceCupom])).json()).utilizado,true);
    await assert.rejects(db.query('update arquiteto_participantes set utilizado_em=now() where id=$1',[ganhador]),/arquiteto_uso_cupom_valido/);
    console.log('OK: sorteios concorrentes mantêm 1 site, 2 cupons de 50% e 9 de R$ 300; preços e benefícios imutáveis, códigos individuais e uso único atômico.');
    falhar = true; assert.equal((await get(ca)).status,503);
    console.log('OK: indisponibilidade do banco tratada sem confirmar inscrições fictícias.');
  } finally {
    if (servidor) { servidor.closeAllConnections(); await new Promise(resolve=>servidor.close(resolve)); }
    await db.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
