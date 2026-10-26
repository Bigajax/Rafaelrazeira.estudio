const {revealClick}=require('./browser-helpers.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),puppeteer=require('puppeteer-core');
const base='http://localhost:3405',key='experimento-evolucao-atelier04-react-v2';
const output=path.resolve(__dirname,'../../../.tmp/painel-gamificado');fs.mkdirSync(output,{recursive:true});
const click=require('./browser-helpers.cjs').clickText;
const state=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const xp=s=>s.history.reduce((sum,h)=>sum+h.xp,0);
const drawerReady=async page=>{await page.waitForSelector('#editor[open]');await page.$eval('#editor',d=>Promise.all(d.getAnimations().map(a=>a.finished)));};
const navigate=async(page,view)=>{await revealClick(page,`nav a[href="#${view}"]`);await page.waitForFunction(view=>document.querySelector(`nav a[href="#${view}"]`)?.getAttribute('aria-current')==='page',{},view);};
const section=async(page,id)=>{await revealClick(page,`[data-mission-section="${id}"]`);await page.waitForSelector(`[data-mission-section="${id}"][aria-pressed="true"]`);};
const reset=async(page,scenario)=>{await page.$eval('.prototype-controls details',e=>e.open=true);page.once('dialog',d=>d.accept());await page.select('#scenario',scenario);await page.waitForFunction((key,scenario)=>JSON.parse(localStorage.getItem(key))?.scenario===scenario,{},key,scenario);};

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-networking']});
  const checks=[],errors=[];
  try{
    const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width:1440,height:1000});await page.goto(base+'/#missoes',{waitUntil:'networkidle2'});await page.waitForSelector('.mission-card');
    assert.equal(await page.$eval('nav a[aria-current]',e=>e.getAttribute('href')),'#missoes');
    assert.equal((await page.$$('.mission-card')).length,2);
    await section(page,'concluidas');assert.ok(await page.$('.mission-empty'));assert.equal(xp(await state(page)),0);
    await section(page,'adiadas');assert.ok(await page.$('.mission-empty'));await section(page,'disponiveis');
    await click(page,'Cuidar');assert.equal((await page.$$('.mission-card')).length,1);
    assert.ok((await page.$eval('.mission-card',e=>e.textContent)).includes('Camisa Essencial'));
    await click(page,'Evoluir');assert.ok(await page.$('.mission-empty'));await click(page,'Ver todas as frentes');
    assert.equal((await page.$$('.mission-card')).length,2);
    checks.push('Acesso direto à página, frentes e situações têm estados vazios úteis e não concedem XP.');

    const photoId=await page.$eval('[data-mission*="foto"]',e=>e.dataset.mission);
    await revealClick(page,`[data-defer="${photoId}"]`);
    await page.waitForFunction(()=>document.querySelectorAll('.mission-card').length===1);
    await section(page,'adiadas');assert.ok(await page.$(`[data-resume="${photoId}"]`));assert.equal(xp(await state(page)),0);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.missionSection),'adiadas');
    await page.reload({waitUntil:'networkidle2'});await page.waitForSelector('[data-resume]');
    assert.equal(await page.evaluate(()=>location.hash),'#missoes?status=adiadas');
    await navigate(page,'evolucao');assert.equal(await page.$('[data-resume]'),null);
    await page.goBack();await page.waitForSelector('[data-resume]');
    await revealClick(page,`[data-resume="${photoId}"]`);await drawerReady(page);
    assert.ok((await page.$eval('#editor-title',e=>e.textContent)).includes('Conjunto Linho'));
    assert.equal((await state(page)).deferred.length,0);assert.equal(xp(await state(page)),0);
    await page.keyboard.press('Escape');assert.equal(await page.$('#editor'),null);
    await page.waitForSelector(`[data-mission="${photoId}"]`);
    checks.push('Adiar persiste ao recarregar; Voltar retorna ao filtro; Retomar abre a peça diretamente e Evolução concentra a trajetória.');

    await revealClick(page,`[data-mission="${photoId}"]`);await drawerReady(page);
    await click(page,'Usar imagem da peça do exemplo');await click(page,'Salvar melhoria');
    await page.waitForSelector('[data-reward-phase="complete"]');await click(page,'Ver missão concluída');
    await page.waitForSelector('[data-completed-mission]');
    assert.equal(await page.evaluate(()=>location.hash),'#missoes?status=concluidas');
    assert.equal((await page.$$('[data-completed-mission]')).length,1);assert.equal(xp(await state(page)),60);
    await revealClick(page,'.completed-mission-row summary');await page.waitForSelector('.completed-mission-row[open]');
    assert.ok((await page.$eval('.mission-evidence',e=>e.textContent)).includes('A primeira foto foi adicionada'));
    await page.keyboard.press('Enter');assert.equal(await page.$('.completed-mission-row[open]'),null);
    await page.reload({waitUntil:'networkidle2'});await page.waitForSelector('[data-completed-mission]');
    assert.equal(xp(await state(page)),60);assert.equal(await page.$('#editor'),null);
    checks.push('Salvar leva à confirmação dedicada da missão com evidência e XP único; resumo abre pelo teclado e recarregar não repete recompensa.');

    await section(page,'disponiveis');assert.equal((await page.$$('.mission-card')).length,1);
    await revealClick(page,'[data-mission]');await drawerReady(page);await page.type('#physical','0');await page.type('#reason','Conferência na arara');await click(page,'Salvar melhoria');await page.waitForSelector('[data-reward-phase="complete"]');await click(page,'Ver missão concluída');
    await page.waitForFunction(()=>document.querySelectorAll('[data-completed-mission]').length===2);assert.equal(xp(await state(page)),140);
    for(const width of [320,375,768,1440]){await page.setViewport({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
    await navigate(page,'inicio');await page.waitForSelector('.empty');assert.ok((await page.$eval('.empty',e=>e.textContent)).includes('Sua loja está em dia'));
    await reset(page,'oportunidades');assert.equal((await page.$$('[data-mission]')).length,1);assert.equal(await page.$('.opportunity-column'),null);
    await click(page,'Ver todas as missões');await page.waitForSelector('.journey-list');assert.equal((await page.$$('.mission-card')).length,3);
    for(const width of [320,375,768,1440]){
      await page.setViewport({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.ok(await page.$$eval('.mission-status-filters button',es=>es.every(e=>e.getBoundingClientRect().height>=44)));
      if(width===375||width===1440)await page.screenshot({path:path.join(output,`missoes-${width}.png`),fullPage:true});
    }
    await section(page,'concluidas');assert.equal((await page.$$('[data-completed-mission]')).length,0);assert.equal(xp(await state(page)),60);
    await navigate(page,'evolucao');assert.ok(await page.$('.evolution-timeline'));assert.equal(await page.$('[data-mission]'),null);
    checks.push('Início mostra apenas o próximo movimento; Missões reúne os objetivos e funciona de 320 a 1440 px; preparação fictícia do cenário não é contada como missão concluída.');

    await page.goto(base+'/#missoes?status=desconhecido',{waitUntil:'networkidle2'});await page.waitForSelector('.journey-list');assert.ok(await page.$('[data-mission-section="disponiveis"][aria-pressed="true"]'));
    await page.goto(base+'/?cenario=varias-missoes#missoes',{waitUntil:'networkidle2'});
    await page.waitForFunction(()=>document.querySelectorAll('.mission-card').length===12);
    assert.equal((await state(page)).scenario,'varias-missoes');assert.equal(xp(await state(page)),280);
    assert.equal(await page.evaluate(()=>new URLSearchParams(location.search).has('cenario')),false);
    for(const width of [320,375,768,1440]){await page.setViewport({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
    await page.screenshot({path:path.join(output,'varias-missoes-1440.png'),fullPage:true});
    await click(page,'Evoluir');assert.equal((await page.$$('.mission-card')).length,3);await click(page,'Todas');
    await section(page,'adiadas');assert.equal((await page.$$('.mission-card')).length,3);
    await section(page,'concluidas');assert.equal((await page.$$('[data-completed-mission]')).length,4);
    await revealClick(page,'.completed-mission-row summary');assert.ok((await page.$eval('.mission-evidence',e=>e.textContent)).includes('composição'));
    await section(page,'disponiveis');await revealClick(page,'[data-mission*=":descricao:"]');await drawerReady(page);
    await page.type('#description','Cintura ajustável e acabamento com costuras reforçadas.');await click(page,'Salvar melhoria');await page.waitForSelector('[data-reward-phase="complete"]');await click(page,'Ver missão concluída');
    await page.waitForFunction(()=>document.querySelectorAll('[data-completed-mission]').length===5);assert.equal(xp(await state(page)),340);
    const generation=(await state(page)).generation;
    await page.reload({waitUntil:'networkidle2'});await page.waitForSelector('[data-completed-mission]');assert.equal((await state(page)).generation,generation);assert.equal(xp(await state(page)),340);
    await page.goto(base+'/?cenario=varias-missoes#missoes',{waitUntil:'networkidle2'});await page.waitForSelector('.mission-card');assert.equal((await state(page)).generation,generation);assert.equal((await page.$$('.mission-card')).length,11);
    checks.push('Simulação com 12 disponíveis, 3 adiadas e 4 concluídas; link carrega o cenário, filtros funcionam e edição além das três sugestões persiste após atualizar ou reabrir o link.');
    assert.equal(errors.length,0,errors.join('\n'));
    fs.writeFileSync(path.join(output,'verificacao-missoes.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
