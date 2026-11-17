/* Prévia e resultados da API simulados no navegador; não emite cupons reais. */
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');
const BASE = process.env.QA_BASE_URL || 'http://localhost:3000';
const temTexto = (page,texto) => page.waitForFunction(t=>document.body.textContent.replace(/\s/g,' ').includes(t),{},texto);
async function clicar(page,texto) {
  for(const button of await page.$$('button')) if((await button.evaluate(el=>el.textContent)).includes(texto)) {await button.click();return;}
  throw new Error(`Botão não encontrado: ${texto}`);
}
(async()=>{
  const browser = await puppeteer.launch({executablePath:process.env.QA_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  try {
    const page=await browser.newPage(); await page.setCacheEnabled(false);
    const erros=[]; let consultas=0;
    page.on('pageerror',e=>erros.push(e.message));
    page.on('request',req=>{if(req.url().includes('/api/arquitetos/sorteio'))consultas++;});
    const beneficios=[
      {beneficio:'site',botao:'Site de presente',titulo:'Você ganhou um site!',valor:null},
      {beneficio:'cupom50',botao:'50% de desconto',titulo:'Você ganhou 50% de desconto!',valor:'R$ 749,50'},
      {beneficio:'cupom300',botao:'R$ 300 de desconto',titulo:'Você ganhou R$ 300 de desconto!',valor:'R$ 1.199,00'},
    ];
    for(const width of [320,390,1440]) {
      await page.setViewport({width,height:width===1440?980:844,deviceScaleFactor:1});
      assert.equal((await page.goto(`${BASE}/arquitetos/raspadinha`,{waitUntil:'networkidle2',timeout:90000})).status(),200);
      for(const beneficio of beneficios) {
        await clicar(page,beneficio.botao);
        await page.evaluate(()=>{window.bilheteOriginal=document.querySelector('[data-bilhete]');window.areaOriginal=document.querySelector('[data-raspagem]');});
        await page.$eval('button[class*="revelar"]',el=>el.focus()); await page.keyboard.press('Enter');
        await temTexto(page,beneficio.titulo);
        await page.waitForFunction(()=>getComputedStyle(document.querySelector('[aria-label="Resultado do bilhete"]')).opacity==='1');
        if(beneficio.valor) {
          await temTexto(page,beneficio.valor);
          const resultado=await page.$(`[data-bilhete] [data-raspagem] [data-cupom="${beneficio.beneficio}"]`);
          assert.ok(resultado);
          assert.ok((await resultado.evaluate(el=>el.textContent.replace(/\s/g,' '))).includes(beneficio.valor));
          assert.equal(await resultado.$eval('a',el=>el.getAttribute('href')),'/arquitetos');
          assert.ok(await page.evaluate(()=>document.activeElement===document.querySelector('[data-cupom] h2')));
          await page.keyboard.press('Tab');
          assert.ok(await page.evaluate(()=>document.activeElement===document.querySelector('[data-cupom] a')));
        }
        assert.ok(await page.evaluate(()=>window.bilheteOriginal===document.querySelector('[data-bilhete]')&&window.areaOriginal===document.querySelector('[data-raspagem]')));
        assert.equal(await page.$('code'),null);
        assert.equal(await page.$('a[href^="https://wa.me/"]'),null);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert.ok(!(await page.evaluate(()=>document.body.textContent.includes('serão definidos antes'))));
        if(width===390&&beneficio.beneficio==='cupom50')await page.screenshot({path:'.tmp/cupom-50-mobile.webp',type:'webp',fullPage:true});
        if(width===1440&&beneficio.beneficio==='cupom300')await page.screenshot({path:'.tmp/cupom-300-desktop.webp',type:'webp',fullPage:true});
        await clicar(page,'Raspar de novo');
        assert.equal(await page.$('[aria-label="Resultado do bilhete"]'),null);
      }
    }
    assert.equal(consultas,0);
    console.log('OK: 3 benefícios em 320/390/1440px, valores exatos, reinício e prévia sem emitir/consultar cupons.');

    let estado;
    await page.setRequestInterception(true);
    page.on('request',req=>{
      if(!req.url().includes('/api/arquitetos/sorteio'))return req.continue();
      assert.equal(req.method(),'GET');
      return req.respond({status:200,contentType:'application/json',body:JSON.stringify(estado)});
    });
    for(const beneficio of beneficios) {
      estado={estado:'resultado',nome:'Pessoa inscrita',ganhou:beneficio.beneficio==='site',beneficio:beneficio.beneficio,codigo:`BLOCO-${beneficio.beneficio}-TESTE`,entregue:false,utilizado:false};
      await page.goto(`${BASE}/arquitetos/raspadinha/participar`,{waitUntil:'networkidle2'});
      await page.waitForSelector('canvas'); await clicar(page,'Revelar sem raspar');
      await temTexto(page,beneficio.titulo); await temTexto(page,estado.codigo);
      const wa=decodeURIComponent(await page.$eval('a[href^="https://wa.me/"]',el=>el.href)).replace(/\s/g,' ');
      assert.ok(wa.includes(estado.codigo));
      if(beneficio.valor) {
        assert.ok(await page.$(`[data-cupom="${beneficio.beneficio}"] code`));
        assert.ok(await page.$(`[data-cupom="${beneficio.beneficio}"] a[href^="https://wa.me/"]`));
        assert.ok(!(await page.$eval('[data-cupom]',el=>el.textContent.includes('Pessoa inscrita'))));
        assert.ok(wa.includes(beneficio.valor)); await temTexto(page,'Usar meu cupom');
        estado={...estado,utilizado:true}; await page.reload({waitUntil:'networkidle2'});
        await page.waitForSelector('canvas'); await clicar(page,'Revelar sem raspar');
        await temTexto(page,'Este cupom já foi utilizado.');
        assert.equal(await page.$('a[href^="https://wa.me/"]'),null);
      } else assert.ok(wa.includes('ganhei o site'));
    }
    estado={estado:'encerrado'};
    await page.reload({waitUntil:'networkidle2'}); await temTexto(page,'O sorteio já aconteceu.');
    assert.equal(await page.$('code'),null); assert.equal(await page.$('canvas'),null);
    assert.deepEqual(erros,[]);
    console.log('OK: código e WhatsApp correspondem ao próprio benefício; cupom utilizado sem novo resgate; visitante externo não recebe códigos.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
