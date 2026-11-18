import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:\/)/,'$1'));
const assets=path.join(root,'dist/assets');await fs.mkdir(assets,{recursive:true});
const candidates=JSON.parse(await fs.readFile(path.join(root,'pesquisa/candidatas.json'),'utf8'));
const posts=JSON.parse(await fs.readFile(path.join(root,'pesquisa/posts.json'),'utf8'));
const largerImages={'casa-ville-social':{file:'original-publico-casa-ville-social.jpg',src:'https://blog.clubecasadesign.com.br/wp-content/uploads/2025/03/OG_5171-2048x1366.jpg'}};
const chosen=[
 ['ville-2.jpg','casa-ville-gourmet','Casa Ville','Área gourmet com bancada escura e forro de madeira','Fotografia'],
 ['ville-1.jpg','casa-ville-social','Casa Ville','Vista superior dos ambientes sociais integrados','Fotografia'],
 ['ville-3.jpg','casa-ville-suite','Casa Ville','Suíte com cabeceira estofada e abertura para o jardim','Fotografia'],
 ['ville-5.jpg','casa-ville-banho','Casa Ville','Banheiro com bancada dupla e revestimento cinza','Fotografia'],
 ['ville-4.jpg','casa-ville-lazer','Casa Ville','Sala de lazer com mesa de jogos e iluminação indireta','Fotografia'],
 ['ville-6.jpg','paula-martins','Paula Martins','Retrato profissional de Paula Martins','Fotografia'],
 ['sala-0-0.jpg','estudio-ambiente','Estúdio em Santa Fé','Estúdio com poltronas escuras, molduras e iluminação acolhedora','Fotografia'],
 ['sala-0-1.jpg','estudio-luz','Estúdio em Santa Fé','Luz natural atravessando o estúdio e suas cortinas claras','Fotografia'],
 ['sala-3-2.jpg','estudio-composicao','Estúdio em Santa Fé','Composição dos móveis e fotografias no estúdio','Fotografia'],
 ['gourmet-0-0.jpg','cozinha-lazer','Cozinha para área de lazer','Visualização da cozinha integrada a uma área de lazer','Render'],
 ['gourmet-1-1.jpg','cozinha-bancada','Cozinha para área de lazer','Visualização da bancada e da mesa na área de lazer','Render'],
 ['gourmet-1-2.jpg','cozinha-detalhe','Cozinha para área de lazer','Visualização da marcenaria clara e dos pendentes da cozinha','Render']
];
const manifest=[];
for(const [file,id,project,alt,type] of chosen){
 const post=posts.find(p=>p.images.some(i=>i.file===file));
 const source=candidates.find(i=>i.file===file)||post?.images.find(i=>i.file===file);
 const input=path.join(root,'pesquisa/candidatas',largerImages[id]?.file||file);
 const meta=await sharp(input).metadata();
 await sharp(input).webp({quality:88}).toFile(path.join(assets,id+'.webp'));
 await sharp(input).resize({width:720,withoutEnlargement:true}).webp({quality:84}).toFile(path.join(assets,id+'-720.webp'));
 manifest.push({id,file:'assets/'+id+'.webp',project,alt,type,width:meta.width,height:meta.height,source_page:post?.url||source.page,source_image:largerImages[id]?.src||source.src,credit:project==='Casa Ville'||project==='Paula Martins'?'Rogeria Dominicalli, conforme crédito da matéria Club&Casa':project==='Estúdio em Santa Fé'?'Rogeria Dominicalli, perfil marcado na publicação; confirmar crédito definitivo':'Paula Martins Arquitetura; autoria da visualização a confirmar',checked_on:'2026-11-18'});
}
await fs.writeFile(path.join(root,'dist/imagens.json'),JSON.stringify(manifest,null,2));
for(const [family,name] of [['Bodoni+Moda:opsz,wght@6..96,400;6..96,500','bodoni'],['Manrope:wght@400;500;600','manrope']]){
 const res=await fetch('https://fonts.googleapis.com/css2?family='+family+'&display=swap',{headers:{'User-Agent':'Mozilla/5.0'}});
 const css=await res.text();
 const matches=[...css.matchAll(/url\((https:[^)]+)\)/g)];
 const unique=[...new Set(matches.map(m=>m[1]))];
 let rewritten=css;
 for(const [i,url] of unique.entries()){const r=await fetch(url);if(!r.ok)throw Error('Font '+r.status);const fontFile=name+'-'+i+'.ttf';await fs.writeFile(path.join(assets,fontFile),Buffer.from(await r.arrayBuffer()));rewritten=rewritten.split(url).join('./'+fontFile);}
 await fs.writeFile(path.join(assets,name+'.css'),rewritten);
}
console.log('12 imagens selecionadas e otimizadas; fontes locais.');
