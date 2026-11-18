import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
const dir=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:\/)/,'$1'));
await fs.mkdir(path.join(dir,'candidatas'),{recursive:true});
const article=JSON.parse(await fs.readFile(path.join(dir,'casa-ville.json'),'utf8'));
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage();
await page.setViewport({width:1440,height:1000});
await page.goto('https://www.instagram.com/paulalemartinsarquitetura/',{waitUntil:'networkidle2',timeout:60000});
const close=await page.$('[aria-label="Fechar"]');
if(close) await close.click();
else await page.evaluate(()=>{const e=[...document.querySelectorAll('svg')].find(e=>e.getAttribute('aria-label')==='Fechar');e?.closest('button, [role="button"]')?.click()});
await page.evaluate(()=>{const e=[...document.querySelectorAll('span,button')].find(e=>e.textContent==='mais');e?.click()});
await new Promise(r=>setTimeout(r,1500));
const profile=await page.evaluate(()=>({text:document.body.innerText,links:[...document.querySelectorAll('a')].map(a=>({text:a.textContent,url:a.href})),images:[...document.images].filter(i=>i.naturalWidth>300).map(i=>({src:i.currentSrc||i.src,alt:i.alt,url:i.closest('a')?.href,width:i.naturalWidth,height:i.naturalHeight}))}));
await fs.writeFile(path.join(dir,'instagram-expanded.json'),JSON.stringify(profile,null,2));
await page.screenshot({path:path.join(dir,'instagram-expanded.jpg'),fullPage:true});
console.log(JSON.stringify({bio:profile.text.slice(0,1400),links:profile.links.filter(l=>!/facebook|privacy|terms|explore|accounts|about|legal|language|developer/i.test(l.url))}));
const manifest=[];
for(const [i,img] of article.images.slice(0,7).entries()){
 const name='ville-'+i+'.jpg';
 try {const r=await fetch(img.src);if(!r.ok) throw Error(r.status);const data=Buffer.from(await r.arrayBuffer());await fs.writeFile(path.join(dir,'candidatas',name),data);manifest.push({...img,file:name,source:'Club&Casa',page:'https://blog.clubecasadesign.com.br/2025/03/10/conteudo-e-visibilidade-modernidade-aconchego-e-atencao-especial-para-os-pets-na-casa-ville-em-maringa/'});}catch(e){console.log(name,e.message)}
}
for(const [i,img] of profile.images.entries()){
 const name='instagram-'+i+'.jpg';
 try{const r=await fetch(img.src);if(!r.ok) throw Error(r.status);await fs.writeFile(path.join(dir,'candidatas',name),Buffer.from(await r.arrayBuffer()));manifest.push({...img,file:name,source:'Instagram'});}catch(e){console.log(name,e.message)}
}
await fs.writeFile(path.join(dir,'candidatas.json'),JSON.stringify(manifest,null,2));
const post=profile.links.find(l=>/\/p\//.test(l.url)&&/\/p\//.test(l.url));
if(post){await page.goto(post.url,{waitUntil:'networkidle2',timeout:45000});await fs.writeFile(path.join(dir,'post-test.txt'),await page.evaluate(()=>document.body.innerText));await page.screenshot({path:path.join(dir,'post-test.jpg')});console.log('post test',post.url,(await page.evaluate(()=>document.body.innerText)).slice(0,1200));}
await browser.close();
const tiles=await Promise.all(manifest.map(async(img,i)=>({input:await sharp(path.join(dir,'candidatas',img.file)).resize(320,240,{fit:'contain',background:'#eeeae3'}).extend({bottom:28,background:'#eeeae3'}).composite([{input:Buffer.from(`<svg width="320" height="28"><text x="10" y="20" fill="#222" font-size="16">${img.file}</text></svg>`),top:240,left:0}]).jpeg().toBuffer(),left:(i%4)*320,top:Math.floor(i/4)*268})));
await sharp({create:{width:1280,height:Math.ceil(tiles.length/4)*268,channels:3,background:'#eeeae3'}}).composite(tiles).jpeg({quality:85}).toFile(path.join(dir,'curadoria.jpg'));
console.log('Downloaded',manifest.length);
