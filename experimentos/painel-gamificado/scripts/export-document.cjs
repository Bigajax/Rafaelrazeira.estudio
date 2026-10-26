// Export the local product document without a third-party service or remote fonts.
const fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer-core');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'documentacao');
const requested=process.argv.find(arg=>arg.startsWith('--document='))?.slice('--document='.length);
const stem=requested??'PERFORMANCE-DOCUMENTO-COMPLETO';
if(!/^[A-Z0-9.-]+$/.test(stem))throw Error('Invalid document name.');
const planning=process.argv.includes('--planning');
const utilityPlan=stem==='PLANO-1.5-UTILIDADE-COMERCIAL';
const validationKit=stem==='VALIDACAO-1.5-ETAPA-A';
const revision=stem.match(/REVISAO-(\d+)$/)?.[1];
const version=stem.match(/(\d+\.\d+)/)?.[1]??'1.0';
const commercialDelivery=stem==='PERFORMANCE-1.4-INTELIGENCIA-COMERCIAL';
const consolidated=stem==='PERFORMANCE-1.4-DOCUMENTO-CONSOLIDADO';
const deliveryOne=version==='1.3';
const deliveryTwo=stem==='PERFORMANCE-1.3-INTELIGENCIA-ASSISTIDA';
const deliveryThree=stem==='PERFORMANCE-1.3-ACOMPANHAMENTO-COMERCIAL';
const figureVersion=deliveryThree?'1.3-entrega-3':deliveryTwo?'1.3-entrega-2':version;
const documentDate=deliveryOne||planning||commercialDelivery||consolidated?'13/10/2026':'12/10/2026';
const longDate=deliveryOne||planning||commercialDelivery||consolidated?'13 de outubro de 2026':'12 de outubro de 2026';
const captureName=version==='1.0'?'missoes-desktop.png':`missoes-${figureVersion}-desktop.png`;
const assets=path.join(directory,'assets');fs.mkdirSync(assets,{recursive:true});
const escape=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const slug=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function inline(value){
  const tokens=[];
  const token=html=>`@@INLINE${tokens.push(html)-1}@@`;
  let result=value.replace(/`([^`]+)`/g,(_,code)=>token(`<code>${escape(code)}</code>`));
  result=result.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,url)=>token(`<a href="${escape(url)}">${escape(label)}</a>`));
  result=escape(result).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  return result.replace(/@@INLINE(\d+)@@/g,(_,index)=>tokens[Number(index)]);
}
function markdown(source){
  const lines=source.replace(/\r/g,'').split('\n'),html=[],headings=[];
  for(let i=0;i<lines.length;){
    const line=lines[i];
    if(!line.trim()){i++;continue;}
    if(line.startsWith('```')){const code=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))code.push(lines[i++]);i++;html.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);continue;}
    const heading=line.match(/^(#{1,3}) (.*)$/);
    if(heading){const level=heading[1].length,title=heading[2],id=slug(title);if(level===2)headings.push({title,id});html.push(`<h${level} id="${id}">${inline(title)}</h${level}>`);i++;continue;}
    const image=line.match(/^!\[([^\]]+)\]\(([^)]+)\)$/);
    if(image){const filename=path.resolve(directory,image[2]);if(!filename.startsWith(assets+path.sep))throw Error('Figure outside document assets.');const data=fs.readFileSync(filename).toString('base64');html.push(`<figure><img src="data:image/png;base64,${data}" alt="${escape(image[1])}"><figcaption>${escape(image[1])}</figcaption></figure>`);i++;continue;}
    if(line.startsWith('|')){
      const rows=[];while(i<lines.length&&lines[i].startsWith('|'))rows.push(lines[i++].split('|').slice(1,-1).map(s=>s.trim()));
      const header=rows.shift(),alignment=rows.shift();
      const cells=(row,tag)=>row.map((cell,j)=>`<${tag}${alignment[j]?.endsWith(':')?' class="numeric"':''}>${inline(cell)}</${tag}>`).join('');
      html.push(`<table><thead><tr>${cells(header,'th')}</tr></thead><tbody>${rows.map(row=>`<tr>${cells(row,'td')}</tr>`).join('')}</tbody></table>`);continue;
    }
    if(/^(?:- |\d+\. )/.test(line)){
      const ordered=/^\d/.test(line),items=[];while(i<lines.length&&(ordered?/^\d+\. /:/^- /).test(lines[i]))items.push(lines[i++].replace(ordered?/^\d+\. /:/^- /,''));
      const tag=ordered?'ol':'ul';html.push(`<${tag}>${items.map(item=>`<li>${inline(item)}</li>`).join('')}</${tag}>`);continue;
    }
    const paragraph=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(?:#|\||!\[|```|- |\d+\. )/.test(lines[i]))paragraph.push(lines[i++]);html.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return {html:html.join('\n'),headings};
}

(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-background-networking']});
  try{
    if(!consolidated&&!planning&&(process.argv.includes('--capture')||!fs.existsSync(path.join(assets,captureName)))){
      const preview=await browser.newPage();await preview.setViewport({width:1440,height:950,deviceScaleFactor:1});
      if(commercialDelivery){
        await preview.goto('http://localhost:3405/?cenario=mapa-comercial#inicio',{waitUntil:'networkidle2'});await preview.waitForSelector('[data-commercial-diagnosis]');
        const badge=await preview.$eval('.demo-badge',e=>({text:e.textContent,delivery:e.dataset.delivery}));if(!badge.text.includes('Performance 1.4')||badge.delivery!=='A-B')throw Error('Current commercial delivery required for capture.');
        await preview.screenshot({path:path.join(assets,'inicio-1.4-desktop.png')});
        await preview.evaluate(()=>location.hash='missoes?secao=mapa');await preview.waitForSelector('[data-map-product]');await preview.screenshot({path:path.join(assets,captureName)});
        await preview.click('[data-inspect-product="linho"]');await preview.waitForSelector('#product-insight[open]');await preview.screenshot({path:path.join(assets,'produto-1.4-desktop.png')});
        await preview.click('[data-open-storefront]');await preview.waitForSelector('#variant-preview[open]');await preview.click('[data-preview-size="variante-0-41"]');await preview.waitForSelector('[data-declare-interest]');await preview.screenshot({path:path.join(assets,'vitrine-1.4-desktop.png')});
      }else{
      await preview.goto(`http://localhost:3405/?cenario=${deliveryTwo||deliveryThree?'intelligence':deliveryOne?'continua':'varias-missoes'}#missoes`,{waitUntil:'networkidle2'});
      await preview.waitForFunction(count=>document.querySelectorAll('.mission-card').length===count,{},deliveryOne?5:12);
      const actualVersion=await preview.$eval('.demo-badge',e=>e.textContent);
      if(!actualVersion.includes(`Performance ${version}`)&&!(version==='1.0'&&actualVersion.startsWith('Experimento')))throw Error('Capture version does not match the requested document; preserved older figures.');
      if(deliveryOne&&actualVersion.includes('inteligência simulada')!==(deliveryTwo||deliveryThree))throw Error('Capture delivery does not match; preserved figures from the earlier delivery.');
      const actualDelivery=await preview.$eval('.demo-badge',e=>Number(e.dataset.delivery??2));
      if(deliveryOne&&actualDelivery===3&&!deliveryThree)throw Error('Entrega 3 cannot overwrite earlier delivery figures.');
      if(deliveryThree&&actualDelivery!==3)throw Error('Delivery 3 UI required for capture.');
      await preview.screenshot({path:path.join(assets,captureName)});
      if(version==='1.2'||deliveryOne){
        await preview.evaluate(()=>location.hash='inicio');await preview.waitForSelector('.home-v12');await preview.setViewport({width:1366,height:deliveryOne?1000:768,deviceScaleFactor:1});await preview.screenshot({path:path.join(assets,`inicio-${figureVersion}-desktop.png`)});
        if(deliveryTwo||deliveryThree){await preview.click('[data-home-intelligence]');await preview.waitForSelector('[data-intelligence-response][aria-busy="false"]');await preview.screenshot({path:path.join(assets,`intelligence-${figureVersion}-desktop.png`)});await preview.keyboard.press('Escape');}
        await preview.evaluate(()=>location.hash='evolucao');await preview.waitForSelector('.level-collection');await preview.setViewport({width:1440,height:900,deviceScaleFactor:1});await preview.screenshot({path:path.join(assets,`evolucao-${figureVersion}-desktop.png`)});
      }
      if(deliveryThree){await preview.goto('http://localhost:3405/?cenario=acompanhamento-comercial#evolucao',{waitUntil:'networkidle2'});await preview.waitForSelector('[data-load-evidence]');await preview.click('[data-load-evidence]');await preview.waitForSelector('[data-impact-status="ready"]');await preview.$eval('#acompanhamento',e=>e.scrollIntoView({block:'start',behavior:'instant'}));await preview.screenshot({path:path.join(assets,`acompanhamento-${figureVersion}-desktop.png`)});}
      }
      await preview.close();
    }
    const crests=path.resolve(root,'../../.tmp/painel-gamificado/brasoes-niveis.png');
    if(!consolidated&&!planning&&fs.existsSync(crests))fs.copyFileSync(crests,path.join(assets,'brasoes-niveis.png'));
    const source=fs.readFileSync(path.join(directory,stem+'.md'),'utf8'),body=markdown(source);
    const toc=body.headings.map(({title,id})=>`<li><a href="#${id}">${escape(title)}</a></li>`).join('');
    const css=`
      :root{--ink:#16352b;--green:#123d2a;--pink:#e8146a;--line:#deded4;--paper:#f6f4ee}
      *{box-sizing:border-box}html{background:#eceae3}body{margin:0;color:var(--ink);font:10pt/1.55 "Segoe UI",Arial,sans-serif;background:white}
      .cover{min-height:244mm;display:flex;flex-direction:column;justify-content:space-between;padding:16mm 9mm 10mm;border-top:3mm solid var(--pink);background:var(--paper);break-after:page}
      .studio{font-size:9pt;letter-spacing:.2em;color:var(--green);font-weight:700}.cover h1{font:normal 46pt/1.06 Georgia,serif;letter-spacing:-.035em;margin:18mm 0 8mm}.cover h1 span{display:block;font-size:30pt;margin-top:3mm}.cover p{font-size:12pt;max-width:130mm;margin:0 0 7mm}.cover .kicker{font:8pt Consolas,monospace;letter-spacing:.15em;color:var(--pink);text-transform:uppercase}
      .cover-stats{display:flex;gap:12mm;padding:8mm 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.cover-stats strong{display:block;font:normal 31pt Georgia,serif;color:var(--green)}.cover-stats span{font-size:9pt}.cover-meta{font-size:9pt;line-height:1.8;margin-top:12mm}.cover-meta strong{color:var(--pink)}
      .contents{break-after:page;padding:4mm 0}.contents h2{font:normal 27pt Georgia,serif;margin:0 0 6mm}.contents ul{padding:0;list-style:none}.contents li{padding:2mm 0;border-bottom:1px solid var(--line);font-size:10pt}.contents a{color:var(--ink);text-decoration:none}
      article>h1{display:none}article h2{font:normal 24pt/1.18 Georgia,serif;letter-spacing:-.02em;color:var(--green);margin:10mm 0 5mm;padding-top:4mm;border-top:1.5px solid var(--pink);break-after:avoid}
      article h3{font:600 12pt/1.4 "Segoe UI",Arial,sans-serif;margin:6mm 0 3mm;break-after:avoid}p{margin:0 0 3.6mm;orphans:3;widows:3}strong{font-weight:650}a{color:#126b4e;text-underline-offset:2px}ul,ol{padding-left:6mm;margin:3mm 0 5mm}li{padding-left:1mm;margin:0 0 2.4mm;break-inside:avoid}
      table{width:100%;border-collapse:collapse;margin:5mm 0 6mm;font-size:8.7pt;line-height:1.45}thead{display:table-header-group}th{text-align:left;background:#123d2a;color:white;font-weight:600;border:1px solid #123d2a;padding:2.6mm}td{padding:2.7mm;border:1px solid var(--line);vertical-align:top}tbody tr:nth-child(even){background:#f6f4ee}tr{break-inside:avoid}td.numeric,th.numeric{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
      code{font:8.2pt Consolas,monospace;overflow-wrap:anywhere;background:#f2f1e9;border-radius:2px;padding:0 .5mm}pre{white-space:pre-wrap;background:#f6f4ee;border-left:2px solid #123d2a;padding:4mm;margin:4mm 0 5mm;break-inside:avoid}pre code{padding:0;background:none;line-height:1.6}
      figure{margin:5mm 0 6mm;break-inside:avoid}figure img{display:block;width:100%;height:auto;max-height:112mm;object-fit:contain;border:1px solid var(--line);border-radius:4px}figcaption{font-size:8pt;color:#657062;margin-top:2mm}
      @page{size:A4;margin:18mm 18mm 19mm}@media screen{body{max-width:210mm;margin:20px auto;padding:18mm;box-shadow:0 5px 30px #0001}.cover{min-height:244mm}.contents{margin-top:15mm}}
    `;
    const html=`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Performance — Documento completo</title><style>${css}</style></head><body><section class="cover"><div class="studio">RAFAEL RAZEIRA / ESTÚDIO</div><div><div class="kicker">${planning?'Plano e validação':'Documento de produto'} · versão ${version}${planning&&revision?' · Revisão '+revision:''}${commercialDelivery?' · Entregas A e B':deliveryThree?' · Entrega 3':deliveryTwo?' · Entrega 2':''}</div><h1>Performance.<span>Sua loja em evolução.</span></h1><p>${planning?'Mapa de produtos, procura por variações e diagnóstico. Validar a experiência antes de ampliar o produto.':commercialDelivery?'Uma oportunidade clara, um próximo cuidado e dados úteis mesmo com poucas visitas.':deliveryThree?'Da decisão ao acompanhamento: ações declaradas, evidências compatíveis e novas oportunidades.':deliveryTwo?'Uma ajuda contextual para observar oportunidades, tomar decisões e revisar cuidados com fontes claras.':'A experiência gamificada: missões úteis, melhorias verificáveis e uma identidade própria para cada conquista.'}</p><p>Produto, jornada, design, regras, simulação e integração.</p></div><div><div class="cover-stats"><div><strong>03</strong><span>${planning?'frentes prioritárias':'áreas dedicadas'}</span></div><div><strong>${planning?'02':commercialDelivery||deliveryOne?'09':'06'}</strong><span>${planning?'entregas planejadas':'modelos de missão'}</span></div><div><strong>${planning?'01':commercialDelivery?'30':deliveryThree?'23':deliveryTwo?'19':deliveryOne?'18':'19'}</strong><span>${planning?'rodada de validação':commercialDelivery||deliveryOne?'cenários fictícios':'objetivos na simulação'}</span></div></div><div class="cover-meta"><strong>Protótipo independente · dados fictícios</strong><br>${planning?'Planejamento da versão':'Consolidação da implementação'} ${version} em ${longDate}.<br>Integração ao painel real ainda não ativada.</div></div></section><nav class="contents" aria-label="Conteúdo do documento"><h2>O que está neste documento.</h2><ul>${toc}</ul></nav><article>${body.html}</article></body></html>`;
    const rendered=consolidated?html
      .replace('Documento de produto · versão 1.4','Documento consolidado · versão 1.4 · Emblemas 1–100')
      .replace('A experiência gamificada: missões úteis, melhorias verificáveis e uma identidade própria para cada conquista.','Missões, inteligência comercial, acompanhamento e emblemas até 100. Toda a experiência atual em um documento.')
      .replace(/<div class="cover-stats">[\s\S]*?<\/div><div class="cover-meta">/,'<div class="cover-stats"><div><strong>21</strong><span>desenhos-base</span></div><div><strong>09</strong><span>modelos de missão</span></div><div><strong>32</strong><span>cenários fictícios</span></div></div><div class="cover-meta">')
      .replace('td{padding:2.7mm','td{overflow-wrap:anywhere;padding:2.7mm'):utilityPlan?html
      .replace('Plano e validação · versão 1.5','Plano e validação · versão 1.5 · Revisão 3')
      .replace('Mapa de produtos, procura por variações e diagnóstico. Validar a experiência antes de ampliar o produto.','Dados, decisões e acompanhamento. Validar a utilidade com lojistas antes de ampliar integrações e inteligência artificial.')
      .replace(/<div class="cover-stats">[\s\S]*?<\/div><div class="cover-meta">/,'<div class="cover-stats"><div><strong>06</strong><span>frentes do Performance</span></div><div><strong>04</strong><span>etapas de entrega</span></div><div><strong>01</strong><span>rodada de validação</span></div></div><div class="cover-meta">')
      .replace('Planejamento da versão 1.5 em','Planejamento; aplicativo ativo na 1.4 A/B. Atualizado em')
      .replace('td{padding:2.7mm','td{overflow-wrap:anywhere;padding:2.7mm'):validationKit?html
      .replace('Plano e validação · versão 1.5','Kit de validação · preparação da 1.5 · Etapa A')
      .replace('Mapa de produtos, procura por variações e diagnóstico. Validar a experiência antes de ampliar o produto.','Descoberta, entendimento, ação, confirmação e acompanhamento. Um roteiro para observar a utilidade da experiência atual.')
      .replace(/<div class="cover-stats">[\s\S]*?<\/div><div class="cover-meta">/,'<div class="cover-stats"><div><strong>05</strong><span>sessões propostas</span></div><div><strong>04</strong><span>tarefas centrais</span></div><div><strong>01</strong><span>caminho principal</span></div></div><div class="cover-meta">')
      .replace('Planejamento da versão 1.5 em','Pesquisa preparada; interface testada na 1.4 A/B. Atualizado em')
      .replace('td{padding:2.7mm','td{overflow-wrap:anywhere;padding:2.7mm'):html;
    const htmlPath=path.join(directory,stem+'.html'),pdfPath=path.join(directory,stem+'.pdf');fs.writeFileSync(htmlPath,rendered);
    const page=await browser.newPage();await page.goto(pathToFileURL(htmlPath).href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
    const failedImages=await page.$$eval('img',images=>images.filter(image=>!image.complete||image.naturalWidth===0).map(image=>image.alt));if(failedImages.length)throw Error('Missing figures: '+failedImages.join(', '));
    await page.pdf({path:pdfPath,format:'A4',preferCSSPageSize:true,printBackground:true,displayHeaderFooter:true,
      headerTemplate:'<div style="font:8px Arial;width:100%;margin:0 18mm;color:#657062;">PERFORMANCE / DOCUMENTO DE PRODUTO</div>',
      footerTemplate:`<div style="font:8px Arial;width:100%;margin:0 18mm;display:flex;justify-content:space-between;color:#657062;"><span>Estúdio Rafael Razeira · ${documentDate} · Protótipo independente</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`});
    await page.setViewport({width:1000,height:1300});await page.screenshot({path:path.resolve(root,`../../.tmp/painel-gamificado/${consolidated?'consolidado-capa':utilityPlan?'plano-15-capa':validationKit?'kit-15-capa':'documento-capa'}.png`)});
    const chapters=await page.$$eval('article h2',headings=>headings.length);
    console.log(JSON.stringify({markdown:path.join(directory,stem+'.md'),pdf:pdfPath,chapters,figures:await page.$$eval('figure',figures=>figures.length),pdfBytes:fs.statSync(pdfPath).size,words:source.split(/\s+/).length},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
