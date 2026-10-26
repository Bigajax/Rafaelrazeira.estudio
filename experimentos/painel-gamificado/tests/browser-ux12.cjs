const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),puppeteer=require('puppeteer-core');
const {revealClick}=require('./browser-helpers.cjs');
const output=path.resolve(__dirname,'../../../.tmp/painel-gamificado');fs.mkdirSync(output,{recursive:true});
const base='http://localhost:3405',key='experimento-evolucao-atelier04-react-v2';
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-networking']});
  const checks=[],errors=[],measurements=[];
  try{
    const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/?cenario=varias-missoes#inicio',{waitUntil:'networkidle2'});await page.waitForSelector('.featured [data-mission]');
    for(const [width,height] of [[1280,720],[1366,768],[1440,900]]){
      await page.setViewport({width,height});await page.evaluate(()=>scrollTo(0,0));
      const m=await page.$eval('.featured',e=>{const card=e.getBoundingClientRect(),button=e.querySelector('[data-mission]').getBoundingClientRect();return {width:innerWidth,height:innerHeight,cardTop:card.top,cardBottom:card.bottom,buttonBottom:button.bottom,title:e.querySelector('h2').textContent};});
      measurements.push(m);assert.ok(m.cardTop>=0&&m.cardBottom<=height,JSON.stringify(m));assert.ok(m.buttonBottom<=height,JSON.stringify(m));
      assert.ok(m.title.includes('Vestido Aurora precisa de uma foto'));
      assert.equal(await page.$('nav .nav-level'),null);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(output,`performance-12-inicio-${width}.png`)});
    }
    checks.push('Missão e CTA aparecem inteiros sem rolagem em 1280×720, 1366×768 e 1440×900; menu não usa números como notificações.');
    const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    await revealClick(page,'nav a[href="#missoes"]');await page.waitForSelector('.journey-group');await page.setViewport({width:1440,height:1000});
    await page.$$eval('.journey-group',groups=>groups.forEach(g=>g.open=true));
    const heights=await page.$$eval('.journey-task',rows=>rows.filter(e=>e.getBoundingClientRect().height>0).map(e=>({id:e.dataset.missionCard,height:e.getBoundingClientRect().height})));
    assert.equal(heights.length,12);assert.ok(heights.every(row=>row.height>=100&&row.height<=124),JSON.stringify(heights));measurements.push({taskHeights:heights});
    assert.ok(!await page.$$eval('.journey-task-copy',rows=>rows.some(e=>e.textContent.includes('Uma apresentação mais clara para começar a conversa'))));
    assert.ok(await page.$$eval('.journey-task-actions button',buttons=>buttons.every(b=>b.getBoundingClientRect().height>=44)));
    await page.screenshot({path:path.join(output,'performance-12-missoes-1440.png'),fullPage:true});
    checks.push('As 12 linhas têm altura de 100–124 px no desktop, ações de 44 px e contexto específico sem repetir a justificativa do grupo.');
    for(const width of [320,375,768,1440]){
      await page.setViewport({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(width===375)await page.screenshot({path:path.join(output,'performance-12-missoes-375.png'),fullPage:true});
    }
    await revealClick(page,'nav a[href="#evolucao"]');await page.waitForSelector('.level-collection');
    assert.equal(await page.$('.history-summary'),null);assert.equal(await page.$('.trajectory-groups'),null);
    assert.equal(await page.$eval('.level-tile.current',e=>Number(e.dataset.levelTile)),3);
    assert.equal((await page.$$('.level-tile.earned')).length,2);
    assert.ok(await page.$('.level-tile.future[data-level-tile="5"]'));assert.ok(await page.$('.level-tile.future[data-level-tile="10"]'));
    assert.ok((await page.$eval('.trajectory-xp',e=>e.textContent)).includes('280'));
    assert.ok((await page.$eval('.trajectory-message',e=>e.textContent)).includes('4 melhorias'));
    for(const width of [320,375,768,1440]){
      await page.setViewport({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if(width===375||width===1440)await page.screenshot({path:path.join(output,`performance-12-evolucao-${width}.png`),fullPage:true});
    }
    const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.deepEqual(after.history,before.history);assert.deepEqual(after.journeys,before.journeys);
    checks.push('Evolução concentra nível, XP e melhorias; coleção distingue níveis anteriores, atual e próximos, sem modificar histórico ou grupos.');
    await revealClick(page,'nav a[href="#inicio"]');await page.setViewport({width:375,height:812});await page.screenshot({path:path.join(output,'performance-12-inicio-375.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(path.join(output,'verificacao-ux12.json'),JSON.stringify({checks,measurements,errors},null,2));console.log(JSON.stringify({checks,measurements,errors},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
