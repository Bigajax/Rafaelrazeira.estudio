/* Peças finais para impressão. Sem banco, inscrição ou sorteio. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const QRCode=require('qrcode');
const sharp=require('sharp');
const puppeteer=require('puppeteer-core');
const jsQR=require(path.resolve('.tmp/qr-qa/node_modules/jsqr'));
const {PDFDocument}=require(path.resolve('.tmp/qr-qa/node_modules/pdf-lib'));
const destino=path.resolve('public/evento');
const previo=path.resolve('.tmp/impressos-raspadinha');
const verde='#046c40';
const dominio=fs.readFileSync('lib/idiomas.ts','utf8').match(/export const SITE = "([^"]+)"/)[1];
const rota=fs.readFileSync('lib/sorteio-arquitetos.ts','utf8').match(/export const ROTA_SORTEIO = "([^"]+)"/)[1];
const url=dominio+rota;
const dados=(tipo,buffer)=>`data:${tipo};base64,${buffer.toString('base64')}`;
async function lerQr(buffer,esperado){
  const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const lido=jsQR(new Uint8ClampedArray(data),info.width,info.height);
  assert.equal(lido?.data,esperado,'O QR deve abrir exatamente o cadastro real da raspadinha.');
}
function fontes(){
  const caminhos=['.next/static/css/app/(pt)/arquitetos/page.css','.next-build/static/css'];
  if(!fs.existsSync(caminhos[0]))throw new Error('Abra /arquitetos no localhost antes de gerar: as fontes locais precisam estar compiladas.');
  const css=fs.readFileSync(caminhos[0],'utf8');
  return [...css.matchAll(/@font-face\s*\{[^}]+\}/g)].map(m=>m[0]).filter(regra=>/U\+0000-00FF/i.test(regra)&&/Instrument Sans|Inter/.test(regra)).map(regra=>{
    const src=regra.match(/url\(([^)]+)\)/)[1];
    const arquivo=path.join('.next',src.replace('/_next/',''));
    return regra.replace(/url\([^)]+\)/,`url(${dados('font/woff2',fs.readFileSync(arquivo))})`);
  }).join('\n');
}
(async()=>{
  fs.mkdirSync(destino,{recursive:true});fs.mkdirSync(previo,{recursive:true});
  const marca=dados('image/webp',fs.readFileSync('public/assets/marca/rr-nome.webp'));
  const monograma=dados('image/png',await sharp('public/assets/marca/rr-monograma.webp').png().toBuffer());
  const qr=QRCode.create(url,{errorCorrectionLevel:'H'}),n=qr.modules.size,margem=4,total=n+margem*2;
  let desenho='';
  for(let y=0;y<n;y++)for(let x=0;x<n;){if(!qr.modules.get(y,x)){x++;continue;}const inicio=x;while(x<n&&qr.modules.get(y,x))x++;desenho+=`M${inicio+margem} ${y+margem}h${x-inicio}v1h-${x-inicio}z`;}
  const placa=9,meio=(total-placa)/2;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="0 0 ${total} ${total}"><rect width="${total}" height="${total}" fill="#fff"/><path d="${desenho}" fill="${verde}"/><rect x="${meio}" y="${meio}" width="${placa}" height="${placa}" rx=".65" fill="#fff"/><image href="${monograma}" x="${meio+1}" y="${meio+2.59}" width="7" height="3.82" preserveAspectRatio="xMidYMid meet"/></svg>`;
  const png=await sharp(Buffer.from(svg)).png().toBuffer();
  await lerQr(png,url);
  for(const largura of [220,350,700])await lerQr(await sharp(png).resize(largura,largura).blur(.35).jpeg({quality:80}).toBuffer(),url);
  await lerQr(await sharp(png).rotate(90).resize(400,400).png().toBuffer(),url);
  fs.writeFileSync(path.join(destino,'qr-raspadinha-monograma.png'),png);
  fs.writeFileSync(path.join(destino,'qr-raspadinha-monograma.svg'),svg);
  const cssFontes=fontes();
  const ticket=`<article class="peca">
    <img class="marca" src="${marca}" alt="Rafael Razeira Estúdio" />
    <p class="evento">Na palestra da Bloco Arquitetura</p>
    <h1>Seu escritório<br>pode ganhar um site.</h1>
    <div class="bilhete"><span class="lateral esquerda">Um presente para o seu escritório</span><div class="qr">${svg}</div><span class="lateral direita">Rafael Razeira Estúdio</span></div>
    <p class="chamada">Aponte a câmera e participe.</p>
    <p class="como">Cadastre seu nome e WhatsApp e aguarde o sorteio.<br>Quando o Rafael anunciar, raspe no mesmo navegador.</p>
    <div class="premios"><p><strong>1 site</strong><span>de presente</span></p><p><strong>Até 2 cupons</strong><span>de 50% de desconto</span></p><p><strong>R$ 300</strong><span>de desconto para os demais</span></p></div>
    <p class="condicao">Cupons individuais, de uso único e sem acúmulo.</p>
    <a class="endereco" href="${url}">${url.replace('https://','')}</a>
  </article>`;
  const estilos=`${cssFontes}
    *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#173c28;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{font-family:'Inter',Arial,sans-serif}.folha{position:relative;display:flex;width:148mm;height:210mm}.peca{position:relative;flex:0 0 148mm;width:148mm;height:210mm;overflow:hidden;background:#fff}
    .marca{position:absolute;top:11mm;left:47.5mm;width:53mm;height:auto}.evento{position:absolute;top:23mm;left:12mm;width:124mm;margin:0;text-align:center;font-size:8.2pt;color:#617068}
    h1{position:absolute;top:31.5mm;left:10mm;width:128mm;margin:0;text-align:center;color:${verde};font:500 31pt/1.02 'Instrument Sans',Arial,sans-serif;letter-spacing:-.045em}
    .bilhete{position:absolute;top:62mm;left:15mm;width:118mm;height:88mm;background:${verde};border-radius:1mm}.bilhete:before,.bilhete:after{content:'';position:absolute;left:1.5mm;right:1.5mm;height:1.5mm;background:radial-gradient(circle at 1.5mm 0,#fff .65mm,transparent .75mm) 0 0/3mm 1.5mm repeat-x}.bilhete:before{top:0}.bilhete:after{bottom:0;transform:rotate(180deg)}
    .qr{position:absolute;top:6mm;left:21mm;width:76mm;height:76mm;background:#fff}.qr svg{display:block;width:100%;height:100%}
    .lateral{position:absolute;top:9mm;height:70mm;display:flex;align-items:center;justify-content:center;writing-mode:vertical-rl;font-size:6.6pt;letter-spacing:.015em;color:#e1f1df}.esquerda{left:5mm;transform:rotate(180deg)}.direita{right:5mm}
    .chamada{position:absolute;top:157mm;left:10mm;width:128mm;margin:0;text-align:center;font:600 13pt/1.2 'Instrument Sans',Arial,sans-serif;color:#e31b62}
    .como{position:absolute;top:166mm;left:11mm;width:126mm;margin:0;text-align:center;font-size:8.5pt;line-height:1.6;color:#4e6055}
    .premios{position:absolute;top:181mm;left:12mm;width:124mm;display:grid;grid-template-columns:1fr 1fr 1.15fr;border-top:.2mm solid #dce5df;padding-top:2.5mm}.premios p{margin:0;text-align:center}.premios p+p{border-left:.2mm solid #dce5df}.premios strong{display:block;font:600 11pt/1.2 'Instrument Sans',Arial,sans-serif;color:${verde}}.premios span{display:block;margin-top:1mm;font-size:6.8pt;line-height:1.3;color:#617068}
    .condicao{position:absolute;top:196mm;left:10mm;width:128mm;margin:0;text-align:center;font-size:6.5pt;color:#617068}.endereco{position:absolute;top:201mm;left:8mm;width:132mm;text-align:center;font-size:6.7pt;color:${verde};text-decoration:none}
    .dupla{width:297mm}.dupla .peca+.peca{margin-left:1mm}.dupla:after{content:'';position:absolute;top:0;bottom:0;left:148.5mm;border-left:.15mm dashed #9ab5a4}
  `;
  const browser=await puppeteer.launch({executablePath:process.env.QA_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
  try{
    for(const dupla of [false,true]){
      const page=await browser.newPage();await page.setViewport({width:1123,height:794,deviceScaleFactor:2});
      const nome=dupla?'raspadinha-mesa-a4-duas-pecas':'raspadinha-mesa-a5';
      const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Participe do sorteio — Rafael Razeira Estúdio</title><style>${estilos}@page{size:${dupla?'297mm 210mm':'148mm 210mm'};margin:0}</style></head><body><main class="folha ${dupla?'dupla':''}">${ticket}${dupla?ticket:''}</main></body></html>`;
      fs.writeFileSync(path.join(previo,nome+'.html'),html);
      await page.setContent(html,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.evaluate(()=>document.fonts.check('500 31pt "Instrument Sans"')),true);
      for(const qrEl of await page.$$('.qr'))await lerQr(await qrEl.screenshot({type:'png'}),url);
      const ultimo=await page.$eval('.endereco',el=>el.getBoundingClientRect().bottom);
      const altura=await page.$eval('.peca',el=>el.getBoundingClientRect().height);assert.ok(ultimo<altura-12,'O endereço precisa ficar dentro da margem de impressão.');
      await (await page.$('.folha')).screenshot({path:path.join(previo,nome+'.png'),type:'png'});
      const buffer=await page.pdf({preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,margin:{top:0,right:0,bottom:0,left:0}});
      const pdf=await PDFDocument.load(buffer);assert.equal(pdf.getPageCount(),1);
      const size=pdf.getPages()[0].getSize();assert.ok(Math.abs(size.width-(dupla?297:148)/25.4*72)<1);assert.ok(Math.abs(size.height-210/25.4*72)<1);
      pdf.setTitle(dupla?'Raspadinha — duas peças A5 em A4':'Raspadinha — peça de mesa A5');pdf.setAuthor('Rafael Razeira Estúdio');pdf.setSubject('QR code público para participar do sorteio na palestra da Bloco Arquitetura');
      fs.writeFileSync(path.join(destino,nome+'.pdf'),await pdf.save());
      console.log(JSON.stringify({arquivo:'public/evento/'+nome+'.pdf',paginas:1,formato:dupla?'A4 horizontal, duas peças':'A5 vertical',qrLido:true}));
      await page.close();
    }
    console.log('OK: QR com monograma lido em múltiplas resoluções, com compressão/desfoque e rotação; destino='+url);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
