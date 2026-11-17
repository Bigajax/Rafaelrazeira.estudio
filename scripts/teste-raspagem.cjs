/* Regressão do gesto no navegador, sem tocar no sorteio ou no banco. */
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');
const BASE = process.env.QA_BASE_URL || 'http://localhost:3000';
const pronto = page => page.waitForFunction(() => document.querySelector('canvas')?.width > 0 && !document.querySelector('[class*="preparando"]'));
const quadros = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function abrir(page, width = 390, dpr = 1, touch = true) {
  await page.setViewport({width,height:900,deviceScaleFactor:dpr,isMobile:touch,hasTouch:touch});
  await page.goto(`${BASE}/arquitetos/raspadinha`,{waitUntil:'networkidle2',timeout:90000});
  await pronto(page);
  const canvas = await page.$('canvas');
  await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  return canvas.boundingBox();
}
async function alpha(page,x,y) {
  return page.$eval('canvas',(el,p)=>{
    const r=el.getBoundingClientRect();
    return CanvasRenderingContext2D.prototype.getImageData.call(el.getContext('2d'),Math.floor(p.x*el.width),Math.floor(p.y*el.height),1,1).data[3];
  },{x,y});
}
async function tocar(cdp,tipo,x,y) { await cdp.send('Input.dispatchTouchEvent',{type:tipo,touchPoints:tipo==='touchEnd'||tipo==='touchCancel'?[]:[{x,y}]}); }
(async()=>{
  const browser=await puppeteer.launch({executablePath:process.env.QA_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  try {
    const page=await browser.newPage(); await page.setCacheEnabled(false);
    const erros=[]; page.on('pageerror',e=>erros.push(e.message));
    const cdp=await page.createCDPSession();
    let b=await abrir(page,390,2);
    assert.ok(b.height>=154,'A faixa de toque precisa ter altura suficiente para a impressão do prêmio.');
    const dimensoes=await page.$eval('canvas',el=>({real:el.width,css:el.getBoundingClientRect().width}));
    assert.ok(Math.abs(dimensoes.real-dimensoes.css*2)<2,'Canvas deve acompanhar a densidade da tela.');
    await tocar(cdp,'touchStart',b.x+b.width/2,b.y+b.height/2); await quadros(page);
    await tocar(cdp,'touchEnd');
    assert.ok((await alpha(page,.5,.5))<10,'O toque deve apagar exatamente sob o dedo.');
    assert.ok((await alpha(page,.5,.1))>200,'Um toque não pode apagar o cartão inteiro.');
    assert.notEqual(await page.$eval('[data-raspagem]',el=>el.dataset.raspagem),'revelada');
    console.log('OK: faixa maior, precisão sob o dedo, alta densidade e toque isolado sem revelação acidental.');

    await page.setViewport({width:768,height:1000,deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await quadros(page);
    assert.ok((await alpha(page,.5,.5))<10,'Redimensionar não pode restaurar a prata já raspada.');
    console.log('OK: raspagem preservada ao mudar orientação/tamanho da tela.');

    for (const width of [320,390]) {
      b=await abrir(page,width,2);
      const titulo=await page.$eval('h1',el=>el.textContent);
      const posicao=await page.$eval('canvas',el=>el.getBoundingClientRect().top);
      await tocar(cdp,'touchStart',b.x+12,b.y+b.height*.28);
      for(let row=0;row<2;row++) for(let passo=0;passo<=12;passo++) {
        const p=row%2?1-passo/12:passo/12;
        await tocar(cdp,'touchMove',b.x+12+p*(b.width-24),b.y+b.height*(row===0?.28:.72));
      }
      await quadros(page);
      assert.equal(await page.$eval('h1',el=>el.textContent),titulo,'O resultado não deve mexer a página com o dedo ainda pressionado.');
      assert.equal(await page.$eval('[data-raspagem]',el=>el.dataset.raspagem),'pronta');
      assert.ok(Math.abs((await page.$eval('canvas',el=>el.getBoundingClientRect().top))-posicao)<1);
      await tocar(cdp,'touchEnd');
      await page.waitForFunction(()=>document.body.textContent.includes('Você ganhou um site!'));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    console.log('OK: duas passadas no celular; cartão e texto estáveis durante o gesto; revelação ao soltar.');

    b=await abrir(page);
    await tocar(cdp,'touchStart',b.x+12,b.y+b.height/2);
    await tocar(cdp,'touchMove',b.x+b.width-12,b.y+b.height/2);
    await quadros(page); await tocar(cdp,'touchCancel');
    assert.notEqual(await page.$eval('[data-raspagem]',el=>el.dataset.raspagem),'revelada');
    await page.$eval('button[class*="revelar"]',el=>el.focus()); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.body.textContent.includes('Você ganhou um site!'));
    console.log('OK: gesto interrompido preserva a raspagem; alternativa por teclado continua funcionando.');

    b=await abrir(page,1440,1,false);
    await page.$eval('[data-bilhete]',el=>el.scrollIntoView({block:'center',behavior:'instant'}));b=await (await page.$('canvas')).boundingBox();
    await (await page.$('[data-bilhete]')).screenshot({path:'.tmp/raspagem-nova-prata.webp',type:'webp'});
    await page.mouse.move(b.x+b.width*.08,b.y+b.height*.42);await page.mouse.down();
    await page.mouse.move(b.x+b.width*.92,b.y+b.height*.42,{steps:14});
    await page.mouse.move(b.x+b.width*.92,b.y+b.height*.58,{steps:3});
    await page.mouse.move(b.x+b.width*.08,b.y+b.height*.58,{steps:14});await quadros(page);
    assert.equal(await page.$eval('[data-raspagem]',el=>el.dataset.raspagem),'pronta','O centro descoberto deve bastar sem raspar as bordas.');
    assert.equal(await page.$('[data-conquista]'),null,'Só deve concluir ao soltar.');
    assert.ok((await alpha(page,.08,.08))>200);
    const cobertura=await page.$eval('canvas',el=>{
      const ctx=el.getContext('2d');let apagados=0;
      for(let y=0;y<24;y++)for(let x=0;x<64;x++)if(ctx.getImageData(Math.floor((x+.5)*el.width/64),Math.floor((y+.5)*el.height/24),1,1).data[3]<10)apagados++;
      return apagados/(64*24);
    });
    assert.ok(cobertura<.4,'Este caso precisa testar a conclusão pelo centro, antes de 40% da área inteira.');
    await (await page.$('[data-bilhete]')).screenshot({path:'.tmp/raspagem-novo-centro.webp',type:'webp'});
    await page.mouse.up();await page.waitForSelector('[data-conquista]');
    assert.equal(await page.$('[role="progressbar"]'),null);
    console.log('OK: centro legível com menos de 40% da área libera ao soltar; bordas prateadas e cartão permanecem estáveis.');

    b=await abrir(page,1440,1,false);
    await page.mouse.move(b.x+20,b.y+b.height/2); await page.mouse.down();
    await page.mouse.move(b.x+b.width-20,b.y+b.height/2,{steps:2}); await quadros(page);
    for(const x of [.2,.4,.6,.8]) assert.ok((await alpha(page,x,.5))<10,'O traço rápido deve ser contínuo.');
    await page.mouse.up();
    assert.notEqual(await page.$eval('[data-raspagem]',el=>el.dataset.raspagem),'revelada','Um risco fino não deve liberar o prêmio sozinho.');
    await page.mouse.move(b.x+20,b.y+b.height*.25); await page.mouse.down();
    await page.mouse.move(b.x+b.width-20,b.y+b.height*.25,{steps:6});
    await page.mouse.move(b.x+20,b.y+b.height*.75,{steps:6}); await page.mouse.up();
    await page.waitForFunction(()=>document.body.textContent.includes('Você ganhou um site!'));
    console.log('OK: mouse rápido sem buracos; poucos movimentos completam a raspagem no computador.');

    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await abrir(page);
    assert.equal(await page.$eval('canvas',el=>getComputedStyle(el).transitionDuration),'0s');
    await page.$eval('button[class*="revelar"]',el=>el.click());
    await page.waitForFunction(()=>document.body.textContent.includes('Você ganhou um site!'));
    assert.deepEqual(erros,[]);
    console.log('OK: movimento reduzido respeitado e nenhum erro de JavaScript.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
