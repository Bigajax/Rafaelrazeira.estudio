/* A conquista deve acontecer no próprio bilhete, sem substituir a página. */
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const BASE=process.env.QA_BASE_URL||'http://localhost:3000';
async function clicar(page,texto){for(const el of await page.$$('button'))if((await el.evaluate(x=>x.textContent)).includes(texto)){await el.click();return;}throw new Error(`Botão não encontrado: ${texto}`);}
(async()=>{
  const browser=await puppeteer.launch({executablePath:process.env.QA_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage();await page.setCacheEnabled(false);const erros=[];let consultas=0;
    page.on('pageerror',e=>erros.push(e.message));page.on('request',r=>{if(r.url().includes('/api/arquitetos/sorteio'))consultas++;});
    for(const width of [320,390,768,1440]){
      await page.setViewport({width,height:width===1440?1000:844,deviceScaleFactor:1});
      await page.goto(`${BASE}/arquitetos/raspadinha`,{waitUntil:'networkidle2',timeout:90000});
      await page.waitForFunction(()=>document.querySelector('canvas')?.width>0);
      const url=page.url(),titulo=await page.$eval('h1',el=>el.textContent),bilhete=await page.$('[data-bilhete]'),area=await page.$('[data-raspagem]');
      await clicar(page,'Revelar sem raspar');
      await page.waitForSelector('[data-conquista=site]');await page.waitForSelector('[data-celebracao=principal]');
      assert.equal(page.url(),url);assert.equal(await page.$eval('h1',el=>el.textContent),titulo);
      assert.equal(await page.evaluate(el=>el===document.querySelector('[data-bilhete]'),bilhete),true,'O mesmo bilhete precisa permanecer montado.');
      assert.equal(await page.evaluate(el=>el===document.querySelector('[data-raspagem]'),area),true,'A área raspada precisa permanecer no lugar.');
      assert.equal(await page.$eval('[data-conquista] h2',el=>el.textContent),'Você ganhou um site!');
      assert.equal(await page.$eval('[data-conquista]',el=>!!el.closest('[data-bilhete] [data-raspagem]')),true);
      assert.equal(await page.$eval('[data-celebracao]',el=>!!el.closest('[data-bilhete]')),true);
      assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('[data-conquista] h2')),true);
      const geometria=await page.$eval('[data-celebracao]',el=>{const r=el.getBoundingClientRect(),b=el.closest('[data-bilhete]').getBoundingClientRect();return{posicao:getComputedStyle(el).position,dentro:r.left>=b.left-1&&r.right<=b.right+1&&r.top>=b.top-1&&r.bottom<=b.bottom+1};});
      assert.equal(geometria.posicao,'absolute');assert.equal(geometria.dentro,true);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const cta=await page.$eval('[data-conquista] a',el=>({texto:el.textContent,href:el.getAttribute('href')}));
      assert.equal(cta.texto,'Quero começar meu site');assert.equal(cta.href,'/arquitetos');assert.equal(await page.$('code'),null);
      assert.equal(await page.$('figure'),null,'A vitória não deve abrir outra apresentação de site.');
      if(width===390){await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-conquista]')).opacity==='1');await page.screenshot({path:'.tmp/conquista-bilhete-mobile.webp',type:'webp',fullPage:true});}
    }
    assert.equal(consultas,0);await page.waitForFunction(()=>!document.querySelector('[data-celebracao]'),{timeout:4500});
    assert.equal(await page.$eval('[data-conquista] h2',el=>el.textContent),'Você ganhou um site!');assert.equal(await page.$('label[class*="nomePrevia"]'),null);
    await page.screenshot({path:'.tmp/conquista-bilhete-desktop.webp',type:'webp',fullPage:true});
    console.log('OK: 320/390/768/1440px; bilhete e área raspada preservados, nome e CTA dentro do cartão, confetes contidos e mesma página.');
    await clicar(page,'50% de desconto');await clicar(page,'Revelar sem raspar');await page.waitForSelector('[data-celebracao=cupom]');
    assert.equal(await page.$eval('[data-celebracao]',el=>!!el.closest('[data-bilhete]')),true);assert.equal(await page.$('[data-conquista]'),null);
    await clicar(page,'R$ 300 de desconto');await clicar(page,'Revelar sem raspar');await page.waitForSelector('[aria-label="Resultado do bilhete"]');assert.equal(await page.$('[data-celebracao]'),null);
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await clicar(page,'Site de presente');
    await page.$eval('button[class*="revelar"]',el=>el.focus());await page.keyboard.press('Enter');await page.waitForSelector('[data-conquista]');
    assert.equal(await page.$('[data-celebracao]'),null);assert.equal(await page.$eval('[data-conquista]',el=>getComputedStyle(el).animationName),'none');
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Quero começar meu site');
    assert.notEqual(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'none');
    console.log('OK: celebração menor do cupom dentro do bilhete, movimento reduzido e teclado.');
    await page.setRequestInterception(true);page.on('request',req=>{if(!req.url().includes('/api/arquitetos/sorteio'))return req.continue();return req.respond({status:200,contentType:'application/json',body:JSON.stringify({estado:'resultado',nome:'Beatriz Mendes',ganhou:true,beneficio:'site',codigo:'BLOCO-TESTE-CONQUISTA',entregue:false,utilizado:false})});});
    await page.goto(`${BASE}/arquitetos/raspadinha/participar`,{waitUntil:'networkidle2'});await page.waitForSelector('canvas');await clicar(page,'Revelar sem raspar');await page.waitForSelector('[data-conquista]');
    assert.equal(await page.$eval('[data-conquista] h2',el=>el.textContent),'Você ganhou um site!');
    const wa=decodeURIComponent(await page.$eval('[data-conquista] a',el=>el.href));assert.ok(wa.startsWith('https://wa.me/'));assert.ok(wa.includes('Beatriz Mendes'));assert.ok(wa.includes('BLOCO-TESTE-CONQUISTA'));
    assert.equal(await page.$eval('[data-conquista] code',el=>el.textContent),'BLOCO-TESTE-CONQUISTA');assert.deepEqual(erros,[]);
    console.log('OK: código e WhatsApp do próprio ganhador também ficam no bilhete.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
