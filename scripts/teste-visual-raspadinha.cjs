/* Header, composição no celular e transição de altura. API sempre simulada. */
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const BASE=process.env.QA_BASE_URL||'http://localhost:3000';
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
async function clicar(page,texto){for(const b of await page.$$('button'))if((await b.evaluate(el=>el.textContent)).includes(texto)){await b.click();return;}throw new Error(texto);}
(async()=>{
  const browser=await puppeteer.launch({executablePath:process.env.QA_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage();const erros=[];page.on('pageerror',e=>erros.push(e.message));
    await page.setViewport({width:1440,height:1000});
    await page.goto(`${BASE}/arquitetos`,{waitUntil:'networkidle2',timeout:90000});
    const headerOriginal=await page.$eval('[data-header-arquiteto]',el=>{const r=el.getBoundingClientRect();return{width:r.width,height:r.height,top:r.top,logo:el.querySelector('img').getAttribute('src')};});
    await page.goto(`${BASE}/arquitetos/raspadinha`,{waitUntil:'networkidle2'});
    const header=await page.$eval('[data-header-arquiteto]',el=>{const r=el.getBoundingClientRect();return{width:r.width,height:r.height,top:r.top,logo:el.querySelector('img').getAttribute('src')};});
    assert.deepEqual(header,headerOriginal);
    assert.equal(await page.$eval('[data-bilhete] [class*=impresso]',el=>getComputedStyle(el).backgroundColor),'rgb(4, 108, 64)');
    assert.equal(await page.$eval('aside[aria-label="Conheça o site para arquitetos"] a',el=>getComputedStyle(el).backgroundColor),'rgb(227, 27, 98)');
    assert.equal(await page.$eval('header > a:last-child',el=>el.getAttribute('href')),'/arquitetos');
    await page.waitForFunction(()=>document.querySelector('canvas')?.width>0);
    const inicial=await page.$eval('[data-raspagem]',el=>el.getBoundingClientRect().height);
    await page.evaluate(()=>{window.alturas=[];const inicio=performance.now();const medir=()=>{window.alturas.push(document.querySelector('[data-raspagem]').getBoundingClientRect().height);if(performance.now()-inicio<850)requestAnimationFrame(medir);};requestAnimationFrame(medir);});
    await page.$eval('button[class*=revelar]',el=>el.click());await page.waitForSelector('[data-conquista]');await pausa(900);
    const alturas=await page.evaluate(()=>window.alturas),final=alturas.at(-1);
    assert.ok(final>inicial+30);
    assert.ok(Math.min(...alturas)>=inicial-2,'O espaço dos controles não pode sumir e encolher o cartão antes de crescer.');
    assert.ok(alturas.some(h=>h>inicial+8&&h<final-8),'Precisa expandir em quadros intermediários.');
    console.log('OK: header compartilhado com /arquitetos, cores da marca e expansão contínua sem encolher antes do prêmio.');
    let estado;
    await page.setRequestInterception(true);page.on('request',req=>req.url().includes('/api/arquitetos/sorteio')?req.respond({status:200,contentType:'application/json',body:JSON.stringify(estado)}):req.continue());
    for(const width of [320,390,768,1440]){
      await page.setViewport({width,height:width===1440?1000:844});
      for(const etapa of ['inscricao','espera','site','cupom300']){
        estado=etapa==='inscricao'?{estado:'inscricoes-abertas'}:etapa==='espera'?{estado:'aguardando',nome:'Participante de teste'}:{estado:'resultado',nome:'Participante de teste',ganhou:etapa==='site',beneficio:etapa,codigo:'BLOCO-12345678901234567890123456789012',utilizado:false,entregue:false};
        await page.goto(`${BASE}/arquitetos/raspadinha/participar`,{waitUntil:'networkidle2'});
        if(etapa==='site'||etapa==='cupom300'){await page.waitForFunction(()=>document.querySelector('canvas')?.width>0);await page.$eval('button[class*=revelar]',el=>el.click());await page.waitForSelector('[aria-label="Resultado do bilhete"]');await pausa(450);}
        if(etapa==='inscricao'){
          assert.ok(await page.$('form input[name=whatsapp]'));
          assert.ok(await page.$eval('form input[name=nome]',el=>el.getBoundingClientRect().height>=48));
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        const r=await page.$eval('[data-bilhete]',el=>{const b=el.getBoundingClientRect();return{left:b.left,right:b.right};});
        assert.ok(r.left>=0&&r.right<=width,'O bilhete deve caber inteiro na largura.');
        assert.ok(await page.$eval('header',el=>el.getBoundingClientRect().bottom<document.querySelector('h1').getBoundingClientRect().top));
        const links=await page.$$eval('aside[aria-label="Conheça o site para arquitetos"] a',els=>els.map(el=>({href:el.getAttribute('href'),h:el.getBoundingClientRect().height,w:el.getBoundingClientRect().width})));
        assert.ok(links.every(l=>l.href==='/arquitetos'&&l.h>=48&&l.w<=width-28));
        if(width===390&&etapa==='inscricao')await page.screenshot({path:'.tmp/cadastro-verde-mobile.webp',type:'webp',fullPage:true});
        if(width===1440&&etapa==='site')await page.screenshot({path:'.tmp/resultado-verde-desktop.webp',type:'webp',fullPage:true});
      }
    }
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    await page.reload({waitUntil:'networkidle2'});await page.waitForFunction(()=>document.querySelector('canvas')?.width>0);await page.$eval('button[class*=revelar]',el=>el.click());await page.waitForSelector('[data-cupom]');
    assert.equal(await page.$eval('[data-cupom]',el=>getComputedStyle(el).animationName),'none');
    assert.ok(await page.$eval('[data-cupom]',el=>[...el.children].every(child=>getComputedStyle(child).animationName==='none')));
    assert.equal(await page.$eval('[data-raspagem]',el=>el.getAnimations({subtree:true}).length),0);
    assert.deepEqual(erros,[]);
    console.log('OK: cadastro, espera e prêmios em 320/390/768/1440px; bilhete completo, código longo, CTA rosa e movimento reduzido.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
