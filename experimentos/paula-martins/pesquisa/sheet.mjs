import fs from 'node:fs/promises';
import sharp from 'sharp';
const dir=new URL('./',import.meta.url);
const files=(await fs.readdir(new URL('candidatas/',dir))).filter(f=>/^(sala|gourmet|comercial|jantar)-/.test(f)&& !/-0-[2-9]/.test(f));
const tiles=await Promise.all(files.map(async(f,i)=>({input:await sharp(new URL('candidatas/'+f,dir).pathname.replace(/^\/(.:\/)/,'$1')).resize(360,230,{fit:'contain',background:'#eee'}).extend({bottom:25,background:'#eee'}).composite([{input:Buffer.from(`<svg width="360" height="25"><text x="10" y="19" font-size="15">${f}</text></svg>`),left:0,top:230}]).jpeg().toBuffer(),left:i%3*360,top:Math.floor(i/3)*255})));
await sharp({create:{width:1080,height:Math.ceil(tiles.length/3)*255,channels:3,background:'#eee'}}).composite(tiles).jpeg().toFile(new URL('carrosseis.jpg',dir).pathname.replace(/^\/(.:\/)/,'$1'));
