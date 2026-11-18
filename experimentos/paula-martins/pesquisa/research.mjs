import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:\/)/, '$1'));
const browser = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const sources = [
 ['norm','https://normcph.com/'],
 ['mcgee','https://www.studio-mcgee.com/'],
 ['instagram','https://www.instagram.com/paulalemartinsarquitetura/'],
 ['casa-ville','https://blog.clubecasadesign.com.br/2025/03/10/conteudo-e-visibilidade-modernidade-aconchego-e-atencao-especial-para-os-pets-na-casa-ville-em-maringa/']
];
await Promise.all(sources.map(async ([name,url])=>{
 const page=await browser.newPage();
 await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
 try {
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await new Promise(r=>setTimeout(r,4000));
  await page.screenshot({path:path.join(dir,name+'.jpg'),fullPage:false});
  const data=await page.evaluate(()=>({title:document.title,text:document.body.innerText,images:[...document.images].map(i=>({src:i.currentSrc||i.src,alt:i.alt,width:i.naturalWidth,height:i.naturalHeight})),styles:[...document.querySelectorAll('h1,h2,p,a')].slice(0,40).map(e=>({text:e.textContent.slice(0,80),font:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize,lineHeight:getComputedStyle(e).lineHeight}))}));
  await fs.writeFile(path.join(dir,name+'.json'),JSON.stringify(data,null,2));
  await fs.writeFile(path.join(dir,name+'.html'),await page.content());
  console.log(JSON.stringify({name,status:response.status(),title:data.title,text:data.text.slice(0,name==='instagram'?3000:100),images:name==='casa-ville'?data.images: data.images.length}));
 } catch(e){console.log(JSON.stringify({name,error:e.message}));}
 await page.close();
}));
await browser.close();
