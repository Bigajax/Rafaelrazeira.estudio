import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('./',import.meta.url));
const out=path.join(root,'verificacao');await fs.mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[],requests=[],checks=[];
function check(name,value){checks.push({name,passed:!!value});if(!value)errors.push(name);}
try{
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)requests.push({status:r.status(),url:r.url()});});
 for(const width of [320,390,768,1440,1920]){
  await page.setViewport({width,height:width<700?844:1000,deviceScaleFactor:1});
  const response=await page.goto('http://localhost:4318/',{waitUntil:'networkidle0'});
  await page.evaluate(()=>document.fonts.ready);
  check(`HTTP ${width}`,response.status()===200);
  check(`Sem overflow horizontal ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check(`Fontes carregadas ${width}`,await page.evaluate(()=>document.fonts.check('16px "Bodoni Moda"')&&document.fonts.check('16px Manrope')));
  await page.screenshot({path:path.join(out,`abertura-${width}.png`)});
  await page.evaluate(()=>document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.loading='eager'));
  await page.waitForFunction(()=>[...document.images].filter(i=>i.id!=='gallery-image').every(i=>i.complete),{timeout:15000});
  check(`Imagens da página ${width}`,await page.evaluate(()=>[...document.images].filter(i=>i.id!=='gallery-image').every(i=>i.complete&&i.naturalWidth>0)));
  if(width===390||width===1440)await page.screenshot({path:path.join(out,`pagina-${width}.png`),fullPage:true});
  await page.click('.hero-cta');
  await page.waitForSelector('#quote-dialog[open]');
  check(`Modal de orçamento responsivo ${width}`,await page.$eval('#quote-dialog',e=>e.scrollWidth<=e.clientWidth&&e.getBoundingClientRect().width<=innerWidth&&e.getBoundingClientRect().height<=innerHeight));
  check(`Foco inicial do formulário ${width}`,await page.evaluate(()=>document.activeElement.id==='quote-name'));
  if([320,390,1440].includes(width))await page.screenshot({path:path.join(out,`orcamento-${width}.png`)});
  await page.keyboard.press('Escape');
  check(`Escape fecha o orçamento ${width}`,await page.$eval('#quote-dialog',e=>!e.open));
  check(`Foco retorna ao orçamento ${width}`,await page.evaluate(()=>document.activeElement.classList.contains('hero-cta')));
  console.log(`Viewport ${width}: conferido`);
 }
 await page.setViewport({width:1440,height:1000});
 await page.goto('http://localhost:4318/',{waitUntil:'networkidle0'});
 await page.evaluate(()=>{
  window.quoteSubmissions=[];
  const form=document.querySelector('#quote-form');
  form.addEventListener('submit',e=>{
   e.preventDefault();
   if(form.checkValidity())window.quoteSubmissions.push({text:document.querySelector('#quote-message').value,action:form.action,target:form.target,fields:[...new FormData(form).keys()]});
  });
 });
 await page.click('.hero-cta');
 await page.click('.quote-submit');
 check('Formulário vazio não continua',await page.evaluate(()=>window.quoteSubmissions.length===0&&document.querySelector('#quote-name').validity.valueMissing));
 await page.type('#quote-name','   ');
 await page.type('#quote-city','Maringá, PR');
 await page.select('#quote-service','Projeto de interiores');
 await page.type('#quote-description','Desejo reformar a sala e a cozinha do apartamento.');
 await page.click('.quote-submit');
 check('Nome apenas com espaços é rejeitado',await page.evaluate(()=>window.quoteSubmissions.length===0&&!document.querySelector('#quote-name').validity.valid));
 await page.$eval('#quote-name',e=>e.value='');
 await page.type('#quote-name','Ana & João');
 await page.click('.quote-submit');
 check('Resumo leva os dados do formulário',await page.evaluate(()=>{const s=window.quoteSubmissions.at(-1);return s?.text.includes('Ana & João')&&s.text.includes('Maringá, PR')&&s.text.includes('Projeto de interiores')&&s.text.includes('reformar a sala');}));
 check('Continuação usa o WhatsApp confirmado',await page.evaluate(()=>window.quoteSubmissions.at(-1).action==='https://wa.me/5544999913481'&&window.quoteSubmissions.at(-1).target==='_blank'));
 check('Formulário envia apenas a mensagem preparada',await page.evaluate(()=>window.quoteSubmissions.at(-1).fields.join(',')==='text'));
 await page.focus('.quote-submit');await page.keyboard.press('Tab');
 check('Teclado permanece dentro do modal',await page.evaluate(()=>document.querySelector('#quote-dialog').contains(document.activeElement)));
 await page.keyboard.press('Escape');
 for(const [key,title] of [['ville','Casa Ville'],['estudio','Estúdio em Santa Fé'],['gourmet','Cozinha para área de lazer']]){
  await page.click(`[data-contact-project="${key}"]`);
  check(`Orçamento mantém a referência ${key}`,await page.$eval('#quote-reference',(e,title)=>!e.hidden&&e.textContent.includes(title),title));
  await page.click('.quote-submit');
  check(`Mensagem inclui o projeto ${key}`,await page.evaluate(title=>window.quoteSubmissions.at(-1).text.includes(`Projeto de referência: ${title}`),title));
  await page.click('.quote-close');
 }
 await page.click('.contact-cta');
 check('Orçamento geral não mantém referência anterior',await page.$eval('#quote-reference',e=>e.hidden));
 await page.click('.quote-close');
 for(const [id,label] of [['casa-ville-suite','Suíte'],['casa-ville-social','Área social'],['casa-ville-gourmet','Área gourmet']]){
  await page.click(`[data-hero-image="${id}"]`);
  await page.waitForFunction(id=>{const img=document.querySelector('#hero-image');return img.complete&&img.naturalWidth>0&&img.currentSrc.includes(id);},{timeout:15000},id);
  check(`Ambiente da abertura ${label}`,await page.$eval('#hero-scene',e=>e.textContent)===label);
  check(`Seleção única da abertura ${label}`,await page.$$eval('[data-hero-image][aria-pressed="true"]',es=>es.length===1));
  check(`Ampliação acompanha ${label}`,await page.$eval('.image-open',(e,id)=>e.dataset.image===id,id));
  if(id==='casa-ville-suite')await page.screenshot({path:path.join(out,'abertura-suite-1440.png')});
 }
 for(const [name,count] of [['ville',5],['estudio',3],['gourmet',3]]){
  await page.click(`[data-project="${name}"]`);
  await page.waitForSelector('#gallery[open]');
  check(`Galeria ${name} abre`,await page.$eval('#gallery',d=>d.open));
  check(`Miniaturas ${name}`,await page.$$eval('.gallery-thumbnails button',es=>es.length)===count);
  check(`Contato contextual ${name}`,await page.$eval('#gallery-contact',(e,title)=>e.dataset.quoteReference===title,name==='ville'?'Casa Ville':name==='estudio'?'Estúdio em Santa Fé':'Cozinha para área de lazer'));
  if(name==='ville'){
   await page.click('#gallery-contact');
   check('Galeria abre formulário com referência',await page.$eval('#quote-reference',e=>e.textContent.includes('Casa Ville')));
   await page.keyboard.press('Escape');
   check('Fechar formulário preserva a galeria',await page.$eval('#gallery',e=>e.open));
   check('Rolagem segue bloqueada com galeria aberta',await page.evaluate(()=>document.body.classList.contains('modal-open')));
  }
  for(let i=0;i<count;i++){
   await page.waitForFunction(()=>{const i=document.querySelector('#gallery-image');return i.complete&&i.naturalWidth>0;});
   check(`Foto ${name} ${i+1}`,await page.$eval('#gallery-count',e=>e.textContent)===`${i+1} / ${count}`);
   check(`Render identificado ${name} ${i+1}`,await page.$eval('#gallery-render',e=>!e.hidden)===(name==='gourmet'));
   check(`Miniatura ativa ${name} ${i+1}`,await page.$$eval('.gallery-thumbnails button[aria-pressed="true"]',es=>es.length===1));
   if(i===0)await page.screenshot({path:path.join(out,`galeria-${name}.png`)});
   if(i<count-1)await page.keyboard.press('ArrowRight');
  }
  await page.keyboard.press('Escape');
  check(`Escape fecha ${name}`,await page.$eval('#gallery',d=>!d.open));
  check(`Scroll liberado ${name}`,await page.evaluate(()=>!document.body.classList.contains('modal-open')));
 }
 await page.click('[data-hero-image="casa-ville-suite"]');
 await page.click('.image-open');
 await page.waitForSelector('#gallery[open]');
 check('Galeria abre a fotografia selecionada',await page.$eval('#gallery-image',e=>e.src.endsWith('casa-ville-suite.webp')));
 check('Posição da suíte na galeria',await page.$eval('#gallery-count',e=>e.textContent==='3 / 5'));
 await page.click('.gallery-thumbnails button:first-child');
 check('Miniatura seleciona a imagem',await page.$eval('#gallery-count',e=>e.textContent==='1 / 5'));
 await page.keyboard.press('Escape');
 await page.setViewport({width:390,height:844});
 await page.goto('http://localhost:4318/',{waitUntil:'networkidle0'});
 await page.click('.mobile-contact');
 check('Atalho móvel abre formulário',await page.$eval('#quote-dialog',e=>e.open));
 await page.keyboard.press('Escape');
 await page.click('.menu-toggle');await page.click('#navigation .nav-contact');
 check('Orçamento pelo menu móvel abre formulário',await page.$eval('#quote-dialog',e=>e.open));
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.activeElement.classList.contains('menu-toggle'));
 check('Fechar orçamento devolve foco ao menu móvel',await page.evaluate(()=>document.activeElement.classList.contains('menu-toggle')));
 await page.click('[data-hero-image="casa-ville-suite"]');
 await page.waitForFunction(()=>{const img=document.querySelector('#hero-image');return img.complete&&img.currentSrc.includes('casa-ville-suite.webp');});
 check('Abertura móvel usa foto maior',await page.$eval('#hero-image',e=>new URL(e.currentSrc).pathname.endsWith('/casa-ville-suite.webp')));
 await page.screenshot({path:path.join(out,'abertura-suite-390.png')});
 await page.click('.image-open');
 await page.waitForSelector('#gallery[open]');
 check('Abertura móvel amplia o ambiente selecionado',await page.$eval('#gallery-image',e=>e.src.endsWith('casa-ville-suite.webp')));
 await page.keyboard.press('Escape');
 await page.click('.menu-toggle');
 check('Menu móvel abre',await page.$eval('.menu-toggle',e=>e.getAttribute('aria-expanded')==='true'));
 await page.click('#navigation a[href="#servicos"]');
 check('Menu móvel fecha ao navegar',await page.$eval('.menu-toggle',e=>e.getAttribute('aria-expanded')==='false'));
 await page.click('details:nth-child(2) summary');
 check('Serviço expande',await page.$eval('details:nth-child(2)',e=>e.open));
 await page.click('[data-project="gourmet"]');
 await page.waitForSelector('#gallery[open]');
 await page.$eval('#gallery',e=>e.scrollTop=0);
 const cdp=await page.createCDPSession();
 const stage=await page.$eval('.gallery-stage',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
 const touchY=Math.round(stage.y+stage.h*.5),startX=Math.round(stage.x+stage.w*.8),endX=Math.round(stage.x+stage.w*.2);
 const countBefore=await page.$eval('#gallery-count',e=>e.textContent);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:startX,y:touchY}]});
 for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:Math.round(startX+(endX-startX)*i/5),y:touchY}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 check('Deslize horizontal avança a galeria',await page.$eval('#gallery-count',e=>e.textContent)==='2 / 3');
 check('Legenda muda junto com a foto',await page.$eval('#gallery-caption',e=>e.textContent.includes('bancada')));
 await page.click('.gallery-thumbnails button:nth-child(3)');
 check('Miniatura móvel navega diretamente',await page.$eval('#gallery-count',e=>e.textContent)==='3 / 3');
 await page.$eval('#gallery',e=>e.scrollTop=0);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:startX,y:touchY}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:startX+2,y:touchY+80}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 check('Gesto vertical preserva a imagem',await page.$eval('#gallery-count',e=>e.textContent)==='3 / 3');
 await cdp.detach();
 await page.screenshot({path:path.join(out,'galeria-mobile.png')});
 check('Galeria móvel sem overflow',await page.$eval('#gallery',e=>e.scrollWidth<=e.clientWidth));
 await page.click('.gallery-close');
 check('Destino de WhatsApp correto',await page.$eval('#quote-form',e=>e.action==='https://wa.me/5544999913481'));
 check('Três orçamentos por projeto',await page.$$eval('[data-contact-project]',es=>es.length===3&&es.every(e=>e.hasAttribute('data-quote'))));
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 check('Redução de movimento',await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior==='auto'));
 for(const route of ['creditos.html','apresentacao.html']){
  const r=await page.goto('http://localhost:4318/'+route,{waitUntil:'networkidle0'});
  check(`Documento ${route}`,r.status()===200);
  check(`Documento responsivo ${route}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 const manifest=JSON.parse(await fs.readFile(path.join(root,'dist/imagens.json'),'utf8'));
 check('12 origens documentadas',manifest.length===12&&manifest.every(i=>i.source_page&&i.source_image&&i.credit));
 check('Foto maior da área social documentada',manifest.find(i=>i.id==='casa-ville-social').width===2048);
 check('Sem respostas HTTP com erro',requests.length===0);
 const result={date:'2026-11-18',checks,errors,requests};
 await fs.writeFile(path.join(out,'resultado.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
 if(errors.length)process.exitCode=1;
}finally{await browser.close();}
