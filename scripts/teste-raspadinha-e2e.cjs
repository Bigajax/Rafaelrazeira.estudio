/* Navegadores -> Next real -> API/ações reais -> Postgres isolado (PGlite).
   Supabase e autenticação locais, com credenciais fictícias. Sem escrita em produção. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const {PGlite}=require(path.resolve('.tmp/raspadinha-qa/node_modules/@electric-sql/pglite'));
const puppeteer=require('puppeteer-core');
const owner='11111111-1111-4111-8111-111111111111';
const campanha='bloco-arquitetura-site-2026';
const email='dono-e2e@example.test',senha='senha-ficticia-somente-e2e';
const publico='chave-publica-somente-e2e',servico='chave-servidor-somente-e2e';
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
const texto=(page,t)=>page.waitForFunction(v=>document.body.textContent.includes(v),{timeout:60000},t);
async function clicar(page,t){for(const b of await page.$$('button'))if((await b.evaluate(el=>el.textContent.trim()))===t){await b.click();return;}throw new Error(`Botão não encontrado: ${t}`);}
async function portaLivre(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function corpo(req){let b='';for await(const c of req)b+=c;return b?JSON.parse(b):{};}
(async()=>{
  const db=new PGlite();let provider,aplicacao,browser;let log='',etapa='preparacao';const errosProvider=[],errosBrowser=[];
  const iniciadoEm=new Date().toISOString();
  const quebraTsconfig=fs.readFileSync('tsconfig.json','utf8').includes('\r\n')?'\r\n':'\n';
  fs.mkdirSync('.tmp',{recursive:true});
  fs.writeFileSync('.tmp/raspadinha-e2e-resultado.json',JSON.stringify({ok:false,estado:'executando',iniciadoEm,producaoAlterada:false},null,2));
  try{
    await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role bypassrls;
      create table auth.users(id uuid primary key);insert into auth.users values ('${owner}');
      create function auth.uid() returns uuid language sql as $$select null::uuid$$;`);
    await db.exec(fs.readFileSync('supabase/sorteio-arquitetos.sql','utf8'));
    await db.exec(fs.readFileSync('supabase/sorteio-arquitetos-cupons.sql','utf8'));
    const agora=Math.floor(Date.now()/1000);
    const jwt=[{alg:'HS256',typ:'JWT'},{sub:owner,aud:'authenticated',role:'authenticated',email,exp:agora+3600,iat:agora,session_id:'22222222-2222-4222-8222-222222222222'},'assinatura-somente-teste'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
    const usuario={id:owner,email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:new Date().toISOString(),identities:[]};
    const sessao={access_token:jwt,refresh_token:'refresh-somente-e2e',expires_in:3600,token_type:'bearer',user:usuario};
    provider=http.createServer(async(req,res)=>{
      const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,prefer,range,x-supabase-api-version','Access-Control-Allow-Methods':'GET,POST,PATCH,HEAD,OPTIONS','Access-Control-Expose-Headers':'Content-Range'};
      const enviar=(status,dados,extras={})=>{res.writeHead(status,{...headers,...extras});res.end(req.method==='HEAD'?'':JSON.stringify(dados));};
      try{
        const url=new URL(req.url,'http://127.0.0.1');
        if(req.method==='OPTIONS')return enviar(200,{});
        if(url.pathname==='/auth/v1/token'){
          const d=await corpo(req);
          if((d.email===email&&d.password===senha)||d.refresh_token===sessao.refresh_token)return enviar(200,sessao);
          return enviar(400,{code:'invalid_credentials',msg:'Invalid login credentials'});
        }
        if(url.pathname==='/auth/v1/user')return req.headers.authorization===`Bearer ${jwt}`?enviar(200,usuario):enviar(401,{message:'Sessão ausente.'});
        if(url.pathname==='/auth/v1/logout')return enviar(200,{});
        if(url.pathname.startsWith('/rest/v1/rpc/')){
          assert.equal(req.headers.apikey,servico);const d=await corpo(req);
          if(url.pathname.endsWith('/arquiteto_inscrever'))return enviar(200,(await db.query('select arquiteto_inscrever($1,$2,$3,$4) id',[d.p_owner,d.p_nome,d.p_whatsapp,d.p_recibo_hash])).rows[0].id);
          if(url.pathname.endsWith('/arquiteto_sortear_site'))return enviar(200,(await db.query('select arquiteto_sortear_site($1) id',[d.p_owner])).rows[0].id);
          throw new Error('RPC inesperada no teste.');
        }
        const tabela=url.pathname.split('/').at(-1);
        if(!['arquiteto_sorteios','arquiteto_participantes'].includes(tabela)){
          assert.ok(['GET','HEAD'].includes(req.method));return enviar(200,[],{'Content-Range':'*/0'});
        }
        assert.equal(req.headers.apikey,servico);
        const valores=[],filtros=[];
        for(const [campo,valor] of url.searchParams){
          if(['select','order','limit','offset'].includes(campo))continue;
          assert.ok(['campanha','owner_id','recibo_hash','id','beneficio','utilizado_em','entregue_em'].includes(campo));
          if(valor==='is.null'){filtros.push(`${campo} is null`);continue;}
          if(valor.startsWith('in.(')){valores.push(valor.slice(4,-1).split(','));filtros.push(`${campo}=any($${valores.length})`);continue;}
          assert.ok(valor.startsWith('eq.'));valores.push(valor.slice(3));filtros.push(`${campo}=$${valores.length}`);
        }
        const where=filtros.length?` where ${filtros.join(' and ')}`:'';
        let linhas,total;
        if(req.method==='POST'){
          const dados=await corpo(req);assert.equal(tabela,'arquiteto_sorteios');
          linhas=(await db.query('insert into arquiteto_sorteios(campanha,owner_id) values ($1,$2) returning *',[dados.campanha,dados.owner_id])).rows;
        }else if(req.method==='PATCH'){
          const dados=await corpo(req);const campos=Object.keys(dados);assert.ok(campos.every(c=>['utilizado_em','entregue_em'].includes(c)));
          const sets=campos.map(c=>{valores.push(dados[c]);return `${c}=$${valores.length}`;});
          linhas=(await db.query(`update ${tabela} set ${sets.join(',')}${where} returning *`,valores)).rows;
        }else{
          assert.ok(['GET','HEAD'].includes(req.method));
          let ordem='';const o=url.searchParams.get('order');if(o){const [c,sentido]=o.split('.');assert.ok(['criado_em','faixa50'].includes(c));ordem=` order by ${c} ${sentido==='desc'?'desc':'asc'}`;}
          linhas=(await db.query(`select * from ${tabela}${where}${ordem}`,valores)).rows;total=linhas.length;
          if(url.searchParams.has('limit'))linhas=linhas.slice(0,Number(url.searchParams.get('limit')));
        }
        if(req.headers.accept?.includes('application/vnd.pgrst.object+json')){
          if(linhas.length!==1)return enviar(406,{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned'});
          return enviar(200,linhas[0]);
        }
        return enviar(req.method==='POST'?201:200,linhas,{'Content-Range':linhas.length?`0-${linhas.length-1}/${total??linhas.length}`:`*/${total??0}`});
      }catch(e){if(!['23505','P0001'].includes(e.code))errosProvider.push(e.message);enviar(400,{code:e.code||'E2E',message:e.message});}
    });
    await new Promise(r=>provider.listen(0,'127.0.0.1',r));const bancoUrl=`http://127.0.0.1:${provider.address().port}`;
    const porta=await portaLivre(),base=`http://localhost:${porta}`;
    const env={...process.env,SUPABASE_URL:bancoUrl,NEXT_PUBLIC_SUPABASE_URL:bancoUrl,NEXT_PUBLIC_SUPABASE_ANON_KEY:publico,SUPABASE_SERVICE_ROLE_KEY:servico,CRM_OWNER_ID:owner,NEXT_DIST_DIR:'.tmp/raspadinha-next-e2e',NEXT_TELEMETRY_DISABLED:'1'};
    assert.equal(env.SUPABASE_URL,bancoUrl);assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,bancoUrl);
    assert.equal(env.SUPABASE_SERVICE_ROLE_KEY,servico);assert.equal(env.CRM_OWNER_ID,owner);
    aplicacao=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port',String(porta),'--hostname','127.0.0.1'],{cwd:process.cwd(),env,stdio:['ignore','pipe','pipe'],windowsHide:true});
    for(const stream of [aplicacao.stdout,aplicacao.stderr])stream.on('data',d=>{log=(log+d.toString()).slice(-40000);});
    for(let i=0;i<120;i++){if(log.includes('Ready in'))break;if(aplicacao.exitCode!==null)throw new Error('Next de teste encerrou.');await pausa(500);}
    assert.ok(log.includes('Ready in'),'Next de teste precisa iniciar.');
    browser=await puppeteer.launch({executablePath:process.env.QA_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
    async function pagina(contexto){const p=await contexto.newPage();p.on('pageerror',e=>errosBrowser.push(e.message));await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});await p.setRequestInterception(true);p.on('request',req=>{const u=new URL(req.url());return ['127.0.0.1','localhost'].includes(u.hostname)||['data:','blob:'].includes(u.protocol)?req.continue():req.abort();});return p;}
    etapa='login-admin';const admin=await pagina(await browser.createBrowserContext());await admin.setViewport({width:1440,height:1000});
    await admin.goto(base+'/crm/raspadinha',{waitUntil:'networkidle2',timeout:120000});assert.ok(admin.url().includes('/crm/login'));
    await admin.type('input[name=email]',email);await admin.type('input[name=senha]',senha);
    await clicar(admin,'Entrar');await admin.waitForFunction(()=>location.pathname==='/crm/raspadinha',{timeout:120000});
    await texto(admin,'Inscrições ainda não abertas');await clicar(admin,'Abrir inscrições e gerar QR code');await texto(admin,'Inscrições abertas');
    await admin.waitForSelector('img[alt="QR code para todos participarem do sorteio"]');
    console.log('OK E2E: login pelo formulário real, sessão do administrador, painel e abertura de inscrições pelo botão.');
    etapa='cadastros';const pessoas=[];
    for(let i=0;i<6;i++){
      const p=await pagina(await browser.createBrowserContext());await p.goto(base+'/arquitetos/raspadinha/participar',{waitUntil:'networkidle2',timeout:120000});
      await p.waitForSelector('input[name=nome]');await p.type('input[name=nome]',`Participante E2E ${i}`);await p.type('input[name=whatsapp]',`4498700000${i}`);await clicar(p,'Participar do sorteio');
      await texto(p,'Inscrição confirmada. Aguardando o sorteio.');assert.equal(await p.$('canvas'),null);pessoas.push(p);
    }
    assert.equal((await db.query('select count(*)::int n from arquiteto_participantes')).rows[0].n,6);
    await clicar(admin,'Atualizar participantes');await texto(admin,'6 participantes');
    await pessoas[0].reload({waitUntil:'networkidle2'});await texto(pessoas[0],'Inscrição confirmada.');
    console.log('OK E2E: seis cadastros gravados pela API real; painel conta seis; voltar ao navegador reconhece o recibo.');
    etapa='sorteio';await clicar(admin,'Sortear site e cupons');await texto(admin,'Confirmar distribuição');await clicar(admin,'Confirmar distribuição');await texto(admin,'Sorteio realizado');
    const distribuicao=(await db.query('select nome,beneficio,codigo from arquiteto_participantes order by nome')).rows;
    assert.equal(distribuicao.filter(p=>p.beneficio==='site').length,1);assert.equal(distribuicao.filter(p=>p.beneficio==='cupom50').length,2);assert.equal(distribuicao.filter(p=>p.beneficio==='cupom300').length,3);assert.equal(new Set(distribuicao.map(p=>p.codigo)).size,6);
    await pessoas[0].waitForSelector('canvas',{timeout:20000});
    for(let i=0;i<pessoas.length;i++){
      const p=pessoas[i];if(i>0&&await p.$('[data-espera-sorteio]'))await clicar(p,'Atualizar resultado');await p.waitForFunction(()=>document.querySelector('canvas')?.width>0);
      const oferta=distribuicao.find(d=>d.nome===`Participante E2E ${i}`);
      if(oferta.beneficio==='site'){
        const canvas=await p.$('canvas');await canvas.evaluate(el=>el.scrollIntoView({block:'center'}));const b=await canvas.boundingBox();const cdp=await p.createCDPSession();
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+10,y:b.y+b.height*.28}]});
        for(const [linha,y] of [[0,.28],[1,.72]])for(let k=0;k<=12;k++){const t=linha?1-k/12:k/12;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+10+t*(b.width-20),y:b.y+b.height*y}]});}
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      }else await clicar(p,'Revelar sem raspar');
      await p.waitForSelector('[aria-label="Resultado do bilhete"]');await texto(p,oferta.codigo);
      assert.ok(await p.$('[data-bilhete] code'));assert.equal(await p.$eval('[data-bilhete] code',el=>el.textContent),oferta.codigo);
      assert.ok(decodeURIComponent(await p.$eval('[data-bilhete] a[href^="https://wa.me/"]',el=>el.href)).includes(oferta.codigo));
    }
    console.log('OK E2E: sorteio acionado no painel, distribuição 1/2/3 correta, atualização automática e raspagem com toque real revelam o próprio código.');
    etapa='registro-uso';const comum=distribuicao.find(p=>p.beneficio==='cupom300');
    const linha=(await admin.$$('tbody tr'))[await admin.$$eval('tbody tr',(linhas,nome)=>linhas.findIndex(el=>el.textContent.includes(nome)),comum.nome)];
    await (await linha.$('button')).click();await clicar(admin,'Confirmar uso');await texto(admin,'Utilizado em');
    const indice=Number(comum.nome.split(' ').at(-1)),p=pessoas[indice];await p.reload({waitUntil:'networkidle2'});await p.waitForFunction(()=>document.querySelector('canvas')?.width>0);await clicar(p,'Revelar sem raspar');await texto(p,'Este cupom já foi utilizado.');assert.equal(await p.$('[data-bilhete] a[href^="https://wa.me/"]'),null);
    const externo=await pagina(await browser.createBrowserContext());await externo.goto(base+'/arquitetos/raspadinha/participar',{waitUntil:'networkidle2'});await texto(externo,'O sorteio já aconteceu.');assert.equal(await externo.$('code'),null);
    const antes=(await db.query('select ganhador_id from arquiteto_sorteios')).rows[0].ganhador_id;
    await admin.reload({waitUntil:'networkidle2'});await texto(admin,'Sorteio realizado');assert.equal((await db.query('select ganhador_id from arquiteto_sorteios')).rows[0].ganhador_id,antes);
    await admin.screenshot({path:'.tmp/raspadinha-e2e-painel.webp',type:'webp',fullPage:true});
    assert.deepEqual(errosProvider,[]);assert.deepEqual(errosBrowser,[]);
    fs.writeFileSync('.tmp/raspadinha-e2e-resultado.json',JSON.stringify({ok:true,iniciadoEm,concluidoEm:new Date().toISOString(),participantes:6,site:1,cupom50:2,cupom300:3,usoRegistrado:true,producaoAlterada:false},null,2));
    console.log('OK E2E: registro de uso pelo painel refletido no bilhete; visitante externo sem códigos; recarregar preserva o ganhador. Produção não foi alterada.');
  }catch(e){fs.writeFileSync('.tmp/raspadinha-e2e-resultado.json',JSON.stringify({ok:false,iniciadoEm,concluidoEm:new Date().toISOString(),etapa,erro:e.message,producaoAlterada:false},null,2));fs.writeFileSync('.tmp/raspadinha-e2e-next.log',log);if(browser){const paginas=await browser.pages();if(paginas.length)console.error('Tela de teste: '+(await paginas.at(-1).evaluate(()=>document.body.textContent)).slice(-2200));}console.error('Provider de teste: '+JSON.stringify(errosProvider));console.error(`Falha na etapa ${etapa}: ${e.stack}`);process.exitCode=1;}
  finally{
    if(browser)await browser.close();
    if(aplicacao){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(aplicacao.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else aplicacao.kill('SIGTERM');}
    if(provider){provider.closeAllConnections();await new Promise(r=>provider.close(r));}await db.close();
    const tsconfig=fs.readFileSync('tsconfig.json','utf8');
    fs.writeFileSync('tsconfig.json',tsconfig.replace(/,\r?\n\s*"\.tmp\/raspadinha-next-e2e\/types\/\*\*\/\*\.ts"/,'').replace(/\r?\n/g,quebraTsconfig));
    const nextEnv=fs.readFileSync('next-env.d.ts','utf8');
    fs.writeFileSync('next-env.d.ts',nextEnv.replace('./.tmp/raspadinha-next-e2e/types/routes.d.ts','./.next/types/routes.d.ts'));
  }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
