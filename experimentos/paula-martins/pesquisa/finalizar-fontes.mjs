import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
const dir=fileURLToPath(new URL('./',import.meta.url));
for(const family of ['bodonimoda','manrope']){
 const target=path.join(dir,'../dist/assets',family+'-OFL.txt');
 try{await fs.access(target);}catch{
  const r=await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`);
  if(!r.ok)throw Error(family+' license '+r.status);
  await fs.writeFile(target,await r.text());
 }
}
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const [name,url,search] of [['norm','https://normcph.com/','Dynaudio'],['mcgee','https://www.studio-mcgee.com/','Portfolio']]){
  const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await new Promise(r=>setTimeout(r,2500));
  await page.evaluate(search=>{const target=[...document.querySelectorAll('h1,h2,h3,h4')].find(e=>e.textContent.includes(search)&&e.getBoundingClientRect().top>innerHeight); if(target)target.scrollIntoView({block:'center'});else scrollTo(0,innerHeight*2);},search);
  await new Promise(r=>setTimeout(r,2000));
  await page.screenshot({path:path.join(dir,name+'-editorial.jpg')});
  await page.close();console.log(name,'seção editorial registrada');
 }
}finally{await browser.close();}
