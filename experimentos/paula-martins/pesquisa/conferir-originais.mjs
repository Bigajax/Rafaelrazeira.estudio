import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
const dir=fileURLToPath(new URL('./',import.meta.url));
const manifest=JSON.parse(await fs.readFile(path.join(dir,'../dist/imagens.json'),'utf8'));
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report=[];
try{
 for(const [name,url] of [['estudio','https://www.instagram.com/paulalemartinsarquitetura/p/DKjrISNgizQ/'],['cozinha','https://www.instagram.com/paulalemartinsarquitetura/p/CrJsu1WPwGg/'],['ville',manifest[0].source_page]]){
  const page=await browser.newPage();await page.setViewport({width:1920,height:1200,deviceScaleFactor:2});
  const result={name,url,images:[],larger:[]};
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   await new Promise(r=>setTimeout(r,3000));
   const close=await page.$('[aria-label="Fechar"]');if(close)await close.click();
   for(let slide=0;slide<(name==='ville'?1:6);slide++){
    const imgs=await page.evaluate(()=>[...document.images].filter(i=>i.naturalWidth>600).map(i=>({src:i.currentSrc||i.src,srcset:i.srcset,alt:i.alt,width:i.naturalWidth,height:i.naturalHeight})));
    for(const img of imgs){
     if(result.images.some(i=>i.src===img.src))continue;
     result.images.push(img);
     const filename=new URL(img.src).pathname.split('/').pop();
     const known=manifest.find(m=>new URL(m.source_image).pathname.split('/').pop()===filename);
     const id=known?.id||(name==='ville'&&filename.includes('OG_5171')?'casa-ville-social':null);
     if(!id)continue;
     const original=manifest.find(m=>m.id===id);
     const response=await fetch(img.src);if(!response.ok)continue;
     const data=Buffer.from(await response.arrayBuffer()),meta=await sharp(data).metadata();
     if(meta.width>original.width){
      const file='original-publico-'+id+'.jpg';await fs.writeFile(path.join(dir,'candidatas',file),data);
      result.larger.push({id,file,source_image:img.src,width:meta.width,height:meta.height,previous_width:original.width});
     }
    }
    const next=await page.$('button[aria-label="Avançar"],button[aria-label="Next"]');if(!next)break;
    await next.click();await new Promise(r=>setTimeout(r,800));
   }
   result.text=(await page.evaluate(()=>document.body.innerText)).slice(0,1500);
  }catch(e){result.error=e.message;}
  report.push(result);await page.close();
  console.log(JSON.stringify({name,loaded:result.images.length,larger:result.larger,error:result.error}));
 }
}finally{await browser.close();}
await fs.writeFile(path.join(dir,'originais-verificacao.json'),JSON.stringify(report,null,2));
