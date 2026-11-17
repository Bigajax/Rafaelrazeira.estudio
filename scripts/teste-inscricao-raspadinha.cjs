/* Falhas de envio simuladas: não inscreve pessoas nem acessa o banco real. */
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const BASE=process.env.QA_BASE_URL||'http://localhost:3000';
const esperarTexto=(page,t)=>page.waitForFunction(texto=>document.body.textContent.includes(texto),{},t);
(async()=>{
  const browser=await puppeteer.launch({executablePath:process.env.QA_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage();await page.setCacheEnabled(false);await page.setViewport({width:390,height:844});
    let cenario='salvou-resposta-perdida',inscrito=false,envios=0,consultas=0;
    const erros=[];page.on('pageerror',e=>erros.push(e.message));
    await page.setRequestInterception(true);page.on('request',req=>{
      if(!req.url().includes('/api/arquitetos/sorteio'))return req.continue();
      if(req.method()==='POST'){
        envios++;
        if(cenario==='salvou-resposta-perdida'||cenario==='sorteou-resposta-perdida'){inscrito=true;return req.abort('failed');}
        if(cenario==='offline')return req.abort('failed');
        inscrito=true;return req.respond({status:200,contentType:'application/json',body:JSON.stringify({estado:'aguardando',nome:'Pessoa de teste'})});
      }
      consultas++;
      if(cenario==='offline'&&envios>0)return req.abort('failed');
      const estado=cenario==='encerrado'?{estado:'encerrado'}:inscrito?cenario==='sorteou-resposta-perdida'?{estado:'resultado',nome:'Pessoa de teste',beneficio:'cupom300',ganhou:false,codigo:'BLOCO-TESTE-REDE',utilizado:false,entregue:false}:{estado:'aguardando',nome:'Pessoa de teste'}:{estado:'inscricoes-abertas'};
      return req.respond({status:200,contentType:'application/json',body:JSON.stringify(estado)});
    });
    async function abrir(){await page.goto(`${BASE}/arquitetos/raspadinha/participar`,{waitUntil:'networkidle2'});await page.waitForSelector('input[name=nome]');}
    async function preencher(){await page.type('input[name=nome]','Pessoa de teste');await page.type('input[name=whatsapp]','44998887766');}
    async function enviar(){await page.$eval('form button[type=submit]',el=>el.click());}
    await abrir();await preencher();await enviar();
    await esperarTexto(page,'Inscrição confirmada. Aguardando o sorteio.');
    assert.equal(envios,1);assert.ok(consultas>=2);assert.equal(await page.$('form'),null);assert.equal(await page.$('canvas'),null);
    assert.equal(await page.$('[role=alert]'),null);
    await page.reload({waitUntil:'networkidle2'});await esperarTexto(page,'Inscrição confirmada.');assert.equal(envios,1);
    console.log('OK: cadastro salvo com resposta perdida é reconhecido por nova consulta, sem reenviar; recarregar mantém a inscrição.');
    cenario='offline';inscrito=false;envios=0;consultas=0;
    await abrir();await preencher();await enviar();
    await esperarTexto(page,'Confira a conexão e tente novamente neste navegador.');
    assert.equal(await page.$eval('input[name=nome]',el=>el.value),'Pessoa de teste');
    assert.equal(await page.$eval('input[name=whatsapp]',el=>el.value),'(44) 99888-7766');
    assert.equal(await page.$('canvas'),null);
    assert.equal(await page.$eval('form button[type=submit]',el=>el.disabled),false);
    assert.ok(!(await page.evaluate(()=>document.body.textContent.includes('Inscrição confirmada. Aguardando'))));
    cenario='normal';await enviar();await esperarTexto(page,'Inscrição confirmada. Aguardando o sorteio.');assert.equal(envios,2);
    console.log('OK: falha antes de salvar mantém os campos e não confirma inscrição fictícia; nova tentativa funciona após reconexão.');
    cenario='sorteou-resposta-perdida';inscrito=false;envios=0;
    await abrir();await preencher();await enviar();await page.waitForFunction(()=>document.querySelector('canvas')?.width>0);
    assert.equal(envios,1);assert.equal(await page.$('form'),null);assert.equal(await page.$('[role=alert]'),null);
    console.log('OK: confirmação após erro também recupera um resultado já sorteado.');
    cenario='encerrado';inscrito=false;
    await page.reload({waitUntil:'networkidle2'});await esperarTexto(page,'O sorteio já aconteceu.');
    await esperarTexto(page,'Não encontramos uma inscrição neste navegador.');await esperarTexto(page,'Consulte sua participação');
    assert.ok(!(await page.evaluate(()=>document.body.textContent.includes('Aguarde o sorteio'))));
    assert.equal(await page.$('code'),null);assert.equal(await page.$('canvas'),null);
    await page.screenshot({path:'.tmp/participacao-nao-localizada.webp',type:'webp',fullPage:true});
    assert.deepEqual(erros,[]);
    console.log('OK: navegador não identificado recebe orientação de consulta, sem mensagem de aguardar sorteio nem exposição de códigos.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
