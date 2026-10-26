const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),puppeteer=require('puppeteer-core');
const {revealClick}=require('./browser-helpers.cjs');
const base='http://localhost:3405',key='experimento-evolucao-atelier04-react-v2';
const output=path.resolve(__dirname,'../../../.tmp/painel-gamificado');fs.mkdirSync(output,{recursive:true});
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const xp=state=>state.history.reduce((sum,h)=>sum+h.xp,0);
const click=async(page,text)=>{for(const el of await page.$$('button'))if(await el.evaluate((e,t)=>e.getClientRects().length&&e.textContent.trim()===t,text)){await el.click();return;}throw Error('Botão ausente: '+text);};
const drawerReady=async page=>{await page.waitForSelector('#editor[open]');await page.$eval('#editor',e=>Promise.all(e.getAnimations().map(a=>a.finished)));};
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-networking']});
  const checks=[],errors=[];
  try{
    const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1000});
    await page.goto(base+'/?cenario=varias-missoes#missoes',{waitUntil:'networkidle2'});await page.waitForSelector('.journey-group');
    assert.equal((await page.$$('.journey-group')).length,4);assert.equal((await page.$$('.mission-card')).length,12);
    assert.equal((await page.$$('.journey-group[open]')).length,1);
    const original=await state(page),group=original.journeys.find(g=>g.kind==='oportunidades');assert.equal(group.objectives.length,4);
    assert.ok((await page.$eval('.journey-group:first-child',e=>e.textContent)).includes('172 pessoas'));
    for(const width of [320,375,768,1440]){
      await page.setViewport({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(width===375||width===1440)await page.screenshot({path:path.join(output,`performance-11-missoes-${width}.png`),fullPage:true});
    }
    const closed=await page.$('.journey-group:not([open])>summary');await closed.focus();await page.keyboard.press('Enter');
    assert.equal((await page.$$('.journey-group[open]')).length,2);await page.keyboard.press('Enter');assert.equal((await page.$$('.journey-group[open]')).length,1);
    checks.push('Doze pendências aparecem em quatro grupos, com três frentes e uma expansão inicial; teclado e layout funcionam de 320 a 1440 px.');
    await click(page,'Evoluir');assert.equal((await page.$$('.journey-group')).length,1);assert.equal((await page.$$('.mission-card')).length,3);
    await page.reload({waitUntil:'networkidle2'});await page.waitForSelector('.journey-group');assert.ok(await page.$('.mission-category-filters button[aria-pressed="true"]'));
    assert.equal((await page.$$('.journey-group')).length,1);
    for(const type of ['foto','revisao','material']){
      await revealClick(page,`[data-mission*=":${type}:"]`);await drawerReady(page);
      if(type==='foto')await click(page,'Usar imagem da peça do exemplo');
      else if(type==='revisao'){await page.type('#physical','0');await page.type('#reason','Conferência na arara');}
      else await page.type('#material','70% viscose, 30% linho');
      await click(page,'Salvar melhoria');await page.waitForSelector('[data-reward-phase="complete"]');
      assert.ok(await page.$('[data-group-progress]'));
      const next=await state(page),savedGroup=next.journeys.find(g=>g.id===group.id);assert.equal(savedGroup.objectives.length,4);
      const number=next.history.filter(h=>savedGroup.objectives.some(m=>m.id===h.id)).length;
      assert.equal(await page.$eval(`#editor [data-group-progress] [role="progressbar"]`,e=>Number(e.getAttribute('aria-valuenow'))),number);
      if(type==='material'){
        assert.equal(xp(next),520);assert.ok(await page.$('.level-up-celebration .retrospective'));
        for(const width of [320,375,1440]){await page.setViewport({width,height:800});assert.ok(await page.$eval('#editor',e=>{const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1;}));assert.ok(await page.$eval('.editor-footer .primary',e=>e.getBoundingClientRect().bottom<=innerHeight));if(width===375)await page.screenshot({path:path.join(output,'performance-11-conquista-375.png')});}
        await click(page,'Ver missão concluída');await click(page,'Evoluir');
        await revealClick(page,'.journey-group>summary'); // Toggle through the native summary below if needed.
        const details=await page.$('.journey-group');if(!await details.evaluate(e=>e.open))await page.click('.journey-group>summary');
        assert.ok((await page.$eval('.journey-finished',e=>e.textContent)).includes('+340 XP'));
      }else await click(page,await page.$('.level-up-celebration')?'Continuar evoluindo':'Continuar');
    }
    const finalState=await state(page);assert.equal(xp(finalState),520);assert.equal(finalState.history.length,7);
    await page.reload({waitUntil:'networkidle2'});await page.waitForSelector('.journey-group');assert.equal(xp(await state(page)),520);
    await revealClick(page,'nav a[href="#evolucao"]');await page.waitForSelector('.trajectory-level');assert.ok((await page.$eval('.timeline-group',e=>e.textContent)).includes('4 cuidados concluídos'));
    assert.ok((await page.$eval('.timeline-group',e=>e.textContent)).includes('340 XP já registrados'));
    for(const width of [320,375,1440]){await page.setViewport({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===1440)await page.screenshot({path:path.join(output,'performance-11-evolucao-1440.png'),fullPage:true});}
    checks.push('Progresso fixo 1/4 → 2/4 → 3/4 → 4/4, XP 280 → 520 sem bônus; confirmação, histórico de grupo e atualização preservam as melhorias.');
    await revealClick(page,'nav a[href="#inicio"]');await page.waitForSelector('.featured');assert.equal((await page.$$('[data-mission]')).length,1);assert.equal(await page.$eval('.quiet-results',e=>e.open),false);
    await page.click('.opportunity-overview button');await page.waitForSelector('.missions-page');assert.ok(await page.$('.mission-category-filters button[aria-pressed="true"]'));
    await revealClick(page,'nav a[href="#inicio"]');await page.setViewport({width:1440,height:1000});await page.screenshot({path:path.join(output,'performance-11-inicio-1440.png'),fullPage:true});
    checks.push('Início dá prioridade à ação, mantém os resultados recolhidos e leva diretamente à frente escolhida.');
    assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(path.join(output,'verificacao-journeys.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
