import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const dir=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:\/)/,'$1'));
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const targets=[['sala','https://www.instagram.com/paulalemartinsarquitetura/p/DKjrISNgizQ/'],['gourmet','https://www.instagram.com/paulalemartinsarquitetura/p/CrJsu1WPwGg/'],['comercial','https://www.instagram.com/paulalemartinsarquitetura/p/Crbe1jEPIDs/'],['estar','https://www.instagram.com/paulalemartinsarquitetura/p/ConioO-Pen_/'],['jantar','https://www.instagram.com/paulalemartinsarquitetura/p/CnzcgP6rn4t/'],['reel','https://www.instagram.com/paulalemartinsarquitetura/reel/Cp5KC9OA5Ta/'],['destaque','https://www.instagram.com/stories/highlights/17848352141239895/']];
const output=[];
for(let start=0;start<targets.length;start+=3){
await Promise.all(targets.slice(start,start+3).map(async([name,url])=>{
 const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
 try{
  await page.goto(url,{waitUntil:'networkidle2',timeout:45000});
  const close=await page.$('[aria-label="Fechar"]'); if(close)await close.click();
  const text=await page.evaluate(()=>document.body.innerText);
  const entry={name,url,text,images:[],slides:0};
  for(let slide=0;slide<(name==='sala'||name==='gourmet'||name==='jantar'?6:1);slide++){
   const imgs=await page.evaluate(()=>[...document.images].filter(i=>i.naturalWidth>=600).map(i=>({src:i.currentSrc||i.src,alt:i.alt,width:i.naturalWidth,height:i.naturalHeight})));
   for(const [i,img] of imgs.entries()){
    if(entry.images.some(j=>j.src===img.src))continue;
    const file=`${name}-${slide}-${i}.jpg`;
    try{const r=await fetch(img.src);if(!r.ok)throw Error(r.status);await fs.writeFile(path.join(dir,'candidatas',file),Buffer.from(await r.arrayBuffer()));entry.images.push({...img,file});}catch(e){console.log(file,e.message);}
   }
   entry.slides++;
   const next=await page.$('button[aria-label="Avançar"],button[aria-label="Next"]');
   if(!next)break;
   await next.click();await new Promise(r=>setTimeout(r,700));
  }
  await page.screenshot({path:path.join(dir,name+'-post.jpg')});
  await fs.writeFile(path.join(dir,name+'-post.json'),JSON.stringify(entry,null,2));
  output.push(entry);
  console.log(JSON.stringify({name,text:text.slice(0,4200),slides:entry.slides,images:entry.images.map(i=>({file:i.file,width:i.width,height:i.height,alt:i.alt}))}));
 }catch(e){console.log(JSON.stringify({name,error:e.message}));}
 await page.close();
}));}
await fs.writeFile(path.join(dir,'posts.json'),JSON.stringify(output,null,2));
await browser.close();
