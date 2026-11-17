/* Downloads e espera com API simulada; nenhum benefício é emitido em produção. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const puppeteer=require('puppeteer-core');
const BASE=process.env.QA_BASE_URL||'http://localhost:3000';
const pasta=fs.mkdtempSync(path.resolve('.tmp/bilhetes-salvos-'));
const pausa=ms=>new Promise(r=>setTimeout(r,ms));
async function clicar(page,texto){for(const button of await page.$$('button'))if((await button.evaluate(el=>el.textContent)).includes(texto)){await button.click();return;}throw new Error(`Botão não encontrado: ${texto}`);}
async function texto(page,valor){await page.waitForFunction(t=>document.body.textContent.includes(t),{},valor);}
async function prontoParaUsar(page){await page.$eval('[data-raspagem]',async el=>{await Promise.allSettled(el.getAnimations({subtree:true}).map(a=>a.finished));});}
(async()=>{
  fs.mkdirSync(pasta,{recursive:true});
  const browser=await puppeteer.launch({executablePath:process.env.QA_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  try{
    const cdp=await browser.target().createCDPSession();
    await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:pasta,eventsEnabled:true});
    const page=await browser.newPage();await page.setViewport({width:390,height:844});const erros=[];
    page.on('pageerror',e=>erros.push(e.message));
    await page.evaluateOnNewDocument(()=>{
      window.textosSalvos=[];window.copia='';
      const original=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(...args){window.textosSalvos.push(args[0]);return original.apply(this,args);};
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async valor=>{window.copia=valor;}}});
    });
    async function baixar(rotulo,esperados,previa){
      await page.evaluate(()=>{window.textosSalvos=[];});
      const download=new Promise((resolve,reject)=>{
        const receber=e=>{clearTimeout(limite);resolve(e);};
        const limite=setTimeout(()=>{cdp.off('Browser.downloadWillBegin',receber);reject(new Error('Download não começou.'));},15000);
        cdp.once('Browser.downloadWillBegin',receber);
      });
      await clicar(page,rotulo);const evento=await download;
      for(let i=0;i<100&&!fs.existsSync(path.join(pasta,evento.suggestedFilename));i++)await pausa(50);
      const imagem=await sharp(path.join(pasta,evento.suggestedFilename)).metadata();
      assert.equal(imagem.format,'png');assert.equal(imagem.width,1080);assert.equal(imagem.height,1350);
      const cor=await sharp(path.join(pasta,evento.suggestedFilename)).extract({left:95,top:150,width:1,height:1}).removeAlpha().raw().toBuffer();
      assert.deepEqual([...cor],[4,108,64],'O PNG deve usar o mesmo verde da marca.');
      const impresso=(await page.evaluate(()=>window.textosSalvos)).map(t=>t.replace(/\s/g,' '));
      for(const esperado of esperados)assert.ok(impresso.includes(esperado),`Imagem deve conter: ${esperado}`);
      assert.ok(!impresso.includes('Pessoa inscrita'));
      assert.equal(evento.suggestedFilename.startsWith('previa-sem-validade'),previa);
      await texto(page,'Imagem gerada.');
      return impresso;
    }
    await page.goto(`${BASE}/arquitetos/raspadinha`,{waitUntil:'networkidle2'});
    await clicar(page,'50% de desconto');await clicar(page,'Revelar sem raspar');await page.waitForSelector('[data-cupom]');
    await prontoParaUsar(page);
    await baixar('Salvar prévia',['50%','R$ 749,50','Prévia sem validade','Esta imagem não concede um benefício.'],true);
    assert.ok(!(await page.evaluate(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Copiar código'))));
    console.log('OK: prévia baixa PNG identificado sem validade nem código real.');
    let estado;
    await page.setRequestInterception(true);page.on('request',req=>req.url().includes('/api/arquitetos/sorteio')?req.respond({status:200,contentType:'application/json',body:JSON.stringify(estado)}):req.continue());
    for(const beneficio of ['site','cupom50','cupom300']){
      estado={estado:'resultado',nome:'Pessoa inscrita',ganhou:beneficio==='site',beneficio,codigo:`BLOCO-TESTE-${beneficio}`,entregue:false,utilizado:false};
      await page.goto(`${BASE}/arquitetos/raspadinha/participar`,{waitUntil:'networkidle2'});await page.waitForSelector('canvas');await clicar(page,'Revelar sem raspar');
      await page.waitForSelector('[data-guardar-bilhete]');
      await prontoParaUsar(page);
      assert.ok(await page.$('[data-bilhete] [data-raspagem] [data-guardar-bilhete]'));
      await clicar(page,'Copiar código');await texto(page,'Código copiado.');
      assert.equal(await page.evaluate(()=>window.copia),estado.codigo);
      assert.ok(await page.$eval('button[class*=copiarCodigo]',el=>el.textContent.trim()==='Código copiado ✓'));
      await page.waitForFunction(()=>document.querySelector('button[class*=copiarCodigo]')?.textContent.trim()==='Copiar código');
      await baixar(beneficio==='site'?'Salvar meu prêmio':'Salvar meu cupom',[estado.codigo,beneficio==='site'?'Você ganhou um site!':beneficio==='cupom50'?'R$ 749,50':'R$ 1.199,00'],false);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      if(beneficio==='cupom300'){
        await page.screenshot({path:'.tmp/cupom-salvar-mobile.webp',type:'webp',fullPage:true});
        await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('Bloqueado');};});
        await clicar(page,'Copiar código');await texto(page,'Selecione o código acima');
        estado={...estado,utilizado:true};await page.reload({waitUntil:'networkidle2'});await page.waitForSelector('canvas');await clicar(page,'Revelar sem raspar');
        await page.waitForSelector('[data-guardar-bilhete]');await prontoParaUsar(page);await baixar('Salvar meu cupom',[estado.codigo,'Cupom já utilizado'],false);
        assert.equal(await page.$('[data-cupom] a[href^="https://wa.me/"]'),null);
      }
    }
    console.log('OK: site e cupons salvos em PNG com código próprio/valores, cópia e falha de permissão; cupom usado identificado.');
    const compartilhar=await browser.newPage();await compartilhar.setViewport({width:390,height:844});
    compartilhar.on('pageerror',e=>erros.push(e.message));
    await compartilhar.evaluateOnNewDocument(()=>{
      window.modoCompartilhar='sucesso';window.permiteCompartilhar=true;
      Object.defineProperty(navigator,'canShare',{configurable:true,value:dados=>window.permiteCompartilhar&&dados.files?.length===1&&dados.files[0].type==='image/png'});
      Object.defineProperty(navigator,'share',{configurable:true,value:dados=>{
        window.compartilhado=dados;window.ativacaoAoCompartilhar=navigator.userActivation.isActive;
        if(window.modoCompartilhar==='cancelar')return Promise.reject(new DOMException('Cancelado','AbortError'));
        if(window.modoCompartilhar==='negar')return Promise.reject(new DOMException('Bloqueado','NotAllowedError'));
        return Promise.resolve();
      }});
    });
    await compartilhar.setRequestInterception(true);compartilhar.on('request',req=>req.url().includes('/api/arquitetos/sorteio')?req.respond({status:200,contentType:'application/json',body:JSON.stringify(estado)}):req.continue());
    estado={estado:'resultado',nome:'Pessoa inscrita',ganhou:false,beneficio:'cupom50',codigo:'BLOCO-COMPARTILHAR-TESTE',utilizado:false,entregue:false};
    await compartilhar.goto(`${BASE}/arquitetos/raspadinha/participar`,{waitUntil:'networkidle2'});
    await compartilhar.waitForFunction(()=>document.querySelector('canvas')?.width>0);await clicar(compartilhar,'Revelar sem raspar');
    await compartilhar.waitForFunction(()=>document.querySelector('button[class*=compartilharBilhete]')?.disabled===false);
    await prontoParaUsar(compartilhar);await clicar(compartilhar,'Compartilhar bilhete');
    await texto(compartilhar,'Bilhete enviado ao compartilhamento');
    const recebido=await compartilhar.evaluate(async()=>({nome:window.compartilhado.files[0].name,tipo:window.compartilhado.files[0].type,bytes:Array.from(new Uint8Array(await window.compartilhado.files[0].arrayBuffer())),ativacao:window.ativacaoAoCompartilhar,url:window.compartilhado.url}));
    assert.equal(recebido.nome,'BLOCO-COMPARTILHAR-TESTE-cupom50.png');assert.equal(recebido.tipo,'image/png');assert.equal(recebido.ativacao,true);assert.equal(recebido.url,undefined);
    const meta=await sharp(Buffer.from(recebido.bytes)).metadata();assert.equal(meta.width,1080);assert.equal(meta.height,1350);
    let downloadsAoCancelar=0;const contar=()=>downloadsAoCancelar++;cdp.on('Browser.downloadWillBegin',contar);
    await compartilhar.evaluate(()=>{window.modoCompartilhar='cancelar';});await clicar(compartilhar,'Compartilhar bilhete');
    await compartilhar.waitForFunction(()=>document.querySelector('button[class*=compartilharBilhete]')?.disabled===false);await pausa(100);
    assert.equal(downloadsAoCancelar,0);assert.ok(!(await compartilhar.evaluate(()=>document.body.textContent.includes('Não foi possível abrir'))));cdp.off('Browser.downloadWillBegin',contar);
    await compartilhar.evaluate(()=>{window.modoCompartilhar='negar';});await clicar(compartilhar,'Compartilhar bilhete');await texto(compartilhar,'Não foi possível abrir o compartilhamento.');
    assert.equal(await compartilhar.$eval('button[class*=salvarBilhete]',el=>el.disabled),false);
    await compartilhar.evaluateOnNewDocument(()=>{window.permiteCompartilhar=false;});await compartilhar.reload({waitUntil:'networkidle2'});
    await compartilhar.waitForFunction(()=>document.querySelector('canvas')?.width>0);await clicar(compartilhar,'Revelar sem raspar');
    await compartilhar.waitForFunction(()=>document.querySelector('button[class*=compartilharBilhete]')?.disabled===false);await prontoParaUsar(compartilhar);
    const fallback=new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('Compartilhamento sem suporte deve oferecer o PNG.')),15000);cdp.once('Browser.downloadWillBegin',e=>{clearTimeout(t);resolve(e);});});
    await clicar(compartilhar,'Compartilhar bilhete');assert.equal((await fallback).suggestedFilename,'BLOCO-COMPARTILHAR-TESTE-cupom50.png');await texto(compartilhar,'Este navegador não abre o menu de compartilhamento.');
    assert.ok(await compartilhar.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await compartilhar.close();
    console.log('OK: botão confirma cópia e restaura rótulo; arquivo PNG preparado antes do toque, compartilhamento simulado mantém ativação; cancelamento sem download; falha orienta e ausência de suporte baixa o PNG.');
    const espera=await browser.newPage();espera.on('pageerror',e=>erros.push(e.message));
    await espera.evaluateOnNewDocument(()=>{
      const original=window.setTimeout;
      window.setTimeout=(fn,ms,...args)=>original(fn,ms>=8000&&ms<=12000?120:ms,...args);
      Object.defineProperty(document,'visibilityState',{get:()=>window.abaOculta?'hidden':'visible'});
    });
    let consultas=0,falhar=false;
    await espera.setRequestInterception(true);espera.on('request',req=>{
      if(!req.url().includes('/api/arquitetos/sorteio'))return req.continue();
      consultas++;return req.respond({status:falhar?503:200,contentType:'application/json',body:JSON.stringify(falhar?{erro:'Conexão de teste indisponível.'}:estado)});
    });
    estado={estado:'aguardando',nome:'Pessoa inscrita'};
    await espera.goto(`${BASE}/arquitetos/raspadinha/participar`,{waitUntil:'domcontentloaded'});await espera.waitForSelector('[data-espera-sorteio]');
    await texto(espera,'Pode continuar assistindo à palestra.');assert.equal(await espera.$('canvas'),null);
    estado={estado:'resultado',nome:'Pessoa inscrita',ganhou:false,beneficio:'cupom300',codigo:'BLOCO-ESPERA-TESTE',utilizado:false,entregue:false};
    await espera.waitForSelector('canvas',{timeout:5000});assert.equal(await espera.$('[data-cupom]'),null);
    await clicar(espera,'Revelar sem raspar');await espera.waitForSelector('[data-cupom=cupom300]');
    const encerradas=consultas;await pausa(450);assert.equal(consultas,encerradas,'Consultas devem parar depois de liberar o bilhete.');
    console.log('OK: espera bloqueia raspagem até o sorteio, libera automaticamente e encerra consultas após o resultado.');
    estado={estado:'aguardando',nome:'Pessoa inscrita'};
    await espera.reload({waitUntil:'domcontentloaded'});await espera.waitForSelector('[data-espera-sorteio]');
    await espera.evaluate(()=>{window.abaOculta=true;document.dispatchEvent(new Event('visibilitychange'));});
    await pausa(100);const ocultas=consultas;await pausa(400);assert.equal(consultas,ocultas);
    falhar=true;await espera.evaluate(()=>{window.abaOculta=false;document.dispatchEvent(new Event('visibilitychange'));});
    await texto(espera,'Reconectando… sua inscrição está guardada.');
    falhar=false;estado={estado:'resultado',nome:'Pessoa inscrita',ganhou:true,beneficio:'site',codigo:'BLOCO-VOLTA-TESTE',entregue:false,utilizado:false};
    await espera.evaluate(()=>window.dispatchEvent(new Event('online')));await espera.waitForSelector('canvas',{timeout:5000});
    assert.deepEqual(erros,[]);
    console.log('OK: aba oculta suspende consultas; retorno/reconexão consulta resultado novamente sem perder inscrição.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
