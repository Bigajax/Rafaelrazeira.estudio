const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),puppeteer=require('puppeteer-core');
const {revealClick}=require('./browser-helpers.cjs');
const base='http://localhost:3405',key='experimento-evolucao-atelier04-react-v2',output=path.resolve(__dirname,'../../../.tmp/painel-gamificado');fs.mkdirSync(output,{recursive:true});
const state=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),xp=s=>s.history.reduce((n,h)=>n+h.xp,0);
const api=(p,action,payload)=>p.evaluate(async(action,payload)=>{const r=await fetch('/api/experiment',{method:action?'POST':'GET',headers:action?{'Content-Type':'application/json'}:undefined,body:action?JSON.stringify({action,payload}):undefined});return {status:r.status,body:await r.json()};},action,payload);
const clickText=require('./browser-helpers.cjs').clickText;
const reset=async(p,scenario)=>{await p.$eval('.prototype-controls details',d=>d.open=true);p.once('dialog',d=>d.accept());await p.select('#scenario',scenario);await p.waitForFunction((k,s)=>JSON.parse(localStorage.getItem(k))?.scenario===s,{},key,scenario);};
const open=async(p,selector)=>{await revealClick(p,selector);await p.waitForSelector('#editor[open]');};
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-networking']});
  const checks=[],errors=[],measurements=[];
  try{
    const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await p.goto(base+'/?cenario=continua#inicio',{waitUntil:'networkidle2'});await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.scenario==='continua',{},key);
    assert.ok((await p.$eval('.demo-badge',e=>e.textContent)).includes('1.4'));assert.equal(await p.$$('.featured [data-mission]').then(x=>x.length),1);assert.equal(xp(await state(p)),0);
    for(const [width,height] of [[1280,720],[1440,900]]){await p.setViewport({width,height});await p.evaluate(()=>scrollTo(0,0));const m=await p.$eval('.featured',e=>({width:innerWidth,bottom:e.getBoundingClientRect().bottom,cta:e.querySelector('[data-mission]').getBoundingClientRect().bottom}));assert.ok(m.cta<=height,JSON.stringify(m));measurements.push(m);}
    await p.setViewport({width:1440,height:1000});await p.screenshot({path:path.join(output,'performance-13-inicio-1440.png'),fullPage:true});
    await p.$eval('.week-priorities',e=>e.open=true);assert.equal(await p.$$('[data-priority]').then(x=>x.length),3);
    checks.push('Uma recomendação principal, CTA visível no desktop e até três prioridades opcionais em Sua semana.');
    await revealClick(p,'nav a[href="#missoes"]');await p.waitForSelector('.journey-list');assert.equal(await p.$$('[data-mission-card]').then(x=>x.length),5);
    await p.$$eval('.journey-group',g=>g.forEach(e=>e.open=true));await p.screenshot({path:path.join(output,'performance-13-missoes-1440.png'),fullPage:true});
    await revealClick(p,'[data-defer*=":buscas:"]');await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).deferred.length===1,{},key);assert.equal(xp(await state(p)),0);
    await revealClick(p,'[data-mission-section="adiadas"]');await open(p,'[data-resume*=":buscas:"]');assert.ok(await p.$('.opportunity-evidence'));assert.equal(await p.$eval('#editor',e=>getComputedStyle(e).animationName),'none');
    for(let i=0;i<8;i++){await p.keyboard.press('Tab');assert.ok(await p.$eval('#editor',e=>e.contains(document.activeElement)||document.activeElement===document.body));}await p.keyboard.press('Escape');assert.equal(await p.$('#editor'),null);
    await p.$eval('.prototype-controls details',d=>d.open=true);await revealClick(p,'#fail-save');await open(p,'[data-mission*=":buscas:"]');
    await p.select('#decision','revisar');const note='Vou revisar os nomes das peças e conferir se a loja oferece esse produto.';await p.type('#decision-note',note);await clickText(p,'Salvar decisão');await p.waitForSelector('#save-error:not([hidden])');assert.equal(xp(await state(p)),0);assert.equal(await p.$eval('#decision-note',e=>e.value),note);
    await clickText(p,'Salvar decisão');await p.waitForSelector('#saved-title');assert.equal(xp(await state(p)),60);assert.equal((await state(p)).decisions.length,1);assert.equal(await p.evaluate(()=>document.activeElement.id),'saved-title');await clickText(p,'Continuar');
    await p.reload({waitUntil:'networkidle2'});assert.equal(xp(await state(p)),60);assert.equal((await state(p)).decisions.length,1);assert.equal(await p.$('.level-up-celebration'),null);
    checks.push('Busca adiada e retomada; teclado e Escape; falha preserva a análise; retry salva uma decisão e 60 XP; reload não repete a recompensa.');
    for(const type of ['esgotado','revisao','campanha','descricao']){
      await open(p,`[data-mission*=":${type}:"]`);
      if(type==='esgotado'||type==='campanha'){await p.select('#decision','manter');await p.type('#decision-note','Vou manter esta decisão e observar os dados da próxima ocorrência.');}
      else if(type==='revisao'){await p.type('#physical','0');await p.type('#reason','Conferência completa na arara.');}
      else await p.type('#description','Modelagem reta com acabamento e costuras reforçadas.');
      await clickText(p,type==='esgotado'||type==='campanha'?'Salvar decisão':'Salvar melhoria');await p.waitForSelector('[data-reward-phase="complete"]');
      await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('#editor'));
    }
    const done=await state(p);assert.equal(xp(done),360);assert.equal(done.history.length,5);assert.equal(done.decisions.length,3);assert.equal(done.observations.length,5);assert.ok(done.observations.every(o=>o.after===null));assert.equal(done.products[0].physical,0);assert.equal(done.products[1].physical,0);
    await revealClick(p,'[data-mission-section="concluidas"]');assert.equal(await p.$$('[data-completed-mission]').then(x=>x.length),5);await revealClick(p,'[data-completed-mission*=":buscas:"] > summary');assert.ok((await p.$eval('.mission-evidence',e=>e.textContent)).includes(note));
    await revealClick(p,'nav a[href="#inicio"]');assert.ok((await p.$eval('.empty',e=>e.textContent)).includes('Sua loja está em dia'));assert.ok((await p.$eval('[data-week-registered]',e=>e.textContent)).includes('5 delas'));
    await revealClick(p,'nav a[href="#evolucao"]');await p.waitForSelector('.impact-list');assert.ok((await p.$eval('.history-list',e=>e.textContent)).includes('Conclusão')||(await p.$eval('.history-list',e=>e.textContent)).includes('divulgação'));assert.ok(!await p.$('[data-impact-status="ready"]'));
    await p.screenshot({path:path.join(output,'performance-13-evolucao-1440.png'),fullPage:true});
    checks.push('Os cinco modelos concluem com 360 XP, recibos, grupos e histórico; loja em dia preserva nível; nenhum resultado posterior foi fabricado.');
    await reset(p,'continua-poucos-dados');await revealClick(p,'nav a[href="#inicio"]');assert.ok((await p.$eval('.weekly-cycle',e=>e.textContent)).includes('Ainda estamos reunindo informações'));assert.equal(xp(await state(p)),0);assert.equal(await p.$('.featured'),null);
    await reset(p,'acompanhamento-continuo');assert.equal(xp(await state(p)),60);assert.equal((await state(p)).observations[0].before.visitors,148);assert.equal((await state(p)).observations[0].after,null);
    await reset(p,'divergencia-recorrente');await revealClick(p,'nav a[href="#missoes"]');await open(p,'[data-mission*=":revisao:"]');await p.type('#physical','2');await p.type('#reason','Nova conferência presencial da arara.');await clickText(p,'Salvar melhoria');await p.waitForSelector('[data-reward-phase="complete"]');assert.equal(xp(await state(p)),160);assert.equal((await state(p)).history.filter(h=>h.type==='revisao').length,2);await p.keyboard.press('Escape');
    checks.push('Dados insuficientes não criam missões; acompanhamento tem referência sem dados posteriores; outra divergência legítima reconhece apenas a nova revisão.');
    await reset(p,'campanha-concluida');const s=await state(p),mId=s.journeys.flatMap(g=>g.objectives).find(m=>m.type==='campanha').id;
    const payload={generation:s.generation,missionId:mId,operation:'browser-parallel-decision',decision:'manter',note:'Vou manter esta abordagem e comparar os dados de outra campanha.'};
    const results=await Promise.all([api(p,'save',payload),api(p,'save',payload)]);assert.ok(results.every(r=>r.status===200));assert.equal(results.filter(r=>r.body.award).length,1);
    assert.equal((await api(p)).body.state.decisions.length,1);assert.equal(xp((await api(p)).body.state),80);assert.equal((await api(p,'save',{...payload,operation:'browser-other-tab-operation'})).status,400);
    const context=await browser.createBrowserContext(),isolated=await context.newPage();await isolated.goto(base,{waitUntil:'networkidle2'});await isolated.waitForSelector('.featured');assert.equal(xp(await state(isolated)),0);await context.close();
    checks.push('Duas requisições concorrentes à mesma campanha salvam uma decisão; outra operação não repete XP; sessão independente fica isolada.');
    await reset(p,'continua');await revealClick(p,'nav a[href="#inicio"]');
    for(const view of ['inicio','missoes','evolucao']){await revealClick(p,`nav a[href="#${view}"]`);for(const width of [320,375,768,1440]){await p.setViewport({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),view+' '+width);if(width===375)await p.screenshot({path:path.join(output,`performance-13-${view}-375.png`),fullPage:true});}}
    assert.equal(errors.length,0,errors.join('\n'));checks.push('Início, Missões e Evolução de 320 a 1440 px sem transbordamento ou erro de JavaScript.');
    fs.writeFileSync(path.join(output,'verificacao-continuous.json'),JSON.stringify({checks,measurements,errors},null,2));console.log(JSON.stringify({checks,measurements,errors},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
