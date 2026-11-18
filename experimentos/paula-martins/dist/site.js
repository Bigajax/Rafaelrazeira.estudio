const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('#navigation');
function closeMenu(){toggle.setAttribute('aria-expanded','false');nav.classList.remove('is-open');}
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){closeMenu();toggle.focus();}});
matchMedia('(min-width:701px)').addEventListener('change',closeMenu);

const heroScenes={
 'casa-ville-gourmet':{label:'Área gourmet',alt:'Área gourmet da Casa Ville, com bancada escura e forro ripado de madeira.'},
 'casa-ville-suite':{label:'Suíte',alt:'Suíte da Casa Ville, com cabeceira estofada, texturas e abertura para o jardim.'},
 'casa-ville-social':{label:'Área social',alt:'Vista superior dos ambientes sociais integrados da Casa Ville.'}
};
document.querySelectorAll('[data-hero-image]').forEach(button=>button.addEventListener('click',()=>{
 const id=button.dataset.heroImage,scene=heroScenes[id];
 if(button.getAttribute('aria-pressed')==='true')return;
 const img=document.querySelector('#hero-image');
 img.srcset=`assets/${id}-720.webp 720w,assets/${id}.webp ${id==='casa-ville-social'?2048:1600}w`;
 img.src=`assets/${id}.webp`;
 img.alt=scene.alt;
 document.querySelector('#hero-scene').textContent=scene.label;
 document.querySelector('.hero-photo').dataset.scene=id;
 document.querySelector('.image-open').dataset.image=id;
 document.querySelectorAll('[data-hero-image]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
}));

const definitions={
 ville:{title:'Casa Ville',meta:'Maringá, PR · Interiores residenciais',ids:['casa-ville-gourmet','casa-ville-social','casa-ville-suite','casa-ville-banho','casa-ville-lazer']},
 estudio:{title:'Estúdio em Santa Fé',meta:'Santa Fé, PR · Interiores',ids:['estudio-ambiente','estudio-luz','estudio-composicao']},
 gourmet:{title:'Cozinha para área de lazer',meta:'Estância Zaúna · Visualização em 3D',ids:['cozinha-lazer','cozinha-bancada','cozinha-detalhe']}
};
const dialog=document.querySelector('#gallery');
const galleryImage=document.querySelector('#gallery-image');
const thumbnailList=document.querySelector('.gallery-thumbnails');
const captions={
 'casa-ville-gourmet':'Forro ripado, linhas de luz e bancada escura compõem a área de preparar e receber.',
 'casa-ville-social':'A vista superior revela a relação entre estar, jantar e circulação na Casa Ville.',
 'casa-ville-suite':'Cabeceira estofada, tecidos e abertura para o jardim compõem a área de descanso.',
 'casa-ville-banho':'Bancada dupla, espelho amplo e revestimentos em cinza definem o banheiro.',
 'casa-ville-lazer':'Na sala de jogos, a iluminação destaca as prateleiras e acompanha a mesa.',
 'estudio-ambiente':'Os móveis que a cliente já possuía ganham outra disposição e novos elementos de composição.',
 'estudio-luz':'Cortinas claras acompanham a entrada de luz natural e a composição de fotografias do estúdio.',
 'estudio-composicao':'Poltronas e mobiliário existentes se encontram em uma nova composição para o estúdio.',
 'cozinha-lazer':'Visualização em 3D: cozinha e mesa de jantar compartilham o mesmo ambiente de lazer.',
 'cozinha-bancada':'Visualização em 3D: a bancada articula a área de preparo com a mesa e os assentos.',
 'cozinha-detalhe':'Visualização em 3D: marcenaria clara, pendentes e vegetação aproximam as diferentes áreas.'
};
let selected=null,index=0,opener=null;
let manifestPromise;
const getManifest=()=>manifestPromise??=(fetch('imagens.json').then(r=>{if(!r.ok)throw Error('Manifesto indisponível');return r.json();}).catch(e=>{manifestPromise=null;throw e;}));
let selectedImages=[];
function renderImage(){
 const entry=selectedImages[index];
 galleryImage.src=entry.file;
 galleryImage.alt=entry.alt;
 document.querySelector('#gallery-caption').textContent=captions[entry.id]||entry.alt;
 document.querySelector('#gallery-credit').textContent=entry.project==='Casa Ville'?'Fotografia: Rogeria Dominicalli':'Fonte: Instagram de Paula Martins Arquitetura';
 document.querySelector('#gallery-count').textContent=`${index+1} / ${selectedImages.length}`;
 document.querySelector('#gallery-render').hidden=entry.type!=='Render';
 document.querySelector('#gallery-source').href=entry.source_page;
 document.querySelector('#gallery-contact').dataset.quoteReference=selected.title;
 thumbnailList.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
 const active=thumbnailList.children[index];
 if(active){
  const left=active.offsetLeft-thumbnailList.offsetLeft,right=left+active.offsetWidth;
  if(left<thumbnailList.scrollLeft)thumbnailList.scrollLeft=left;
  else if(right>thumbnailList.scrollLeft+thumbnailList.clientWidth)thumbnailList.scrollLeft=right-thumbnailList.clientWidth;
 }
 const next=new Image();next.src=selectedImages[(index+1)%selectedImages.length].file;
}
document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',async()=>{
 if(button.disabled)return;
 button.disabled=true;
 try{
  const manifest=await getManifest();
  selected=definitions[button.dataset.project];index=Math.max(0,selected.ids.indexOf(button.dataset.image));opener=button;
  selectedImages=selected.ids.map(id=>manifest.find(i=>i.id===id));
  document.querySelector('#gallery-title').textContent=selected.title;
  document.querySelector('#gallery-meta').textContent=selected.meta;
  thumbnailList.replaceChildren(...selectedImages.map((entry,i)=>{
   const thumb=document.createElement('button');thumb.type='button';
   thumb.setAttribute('aria-label',`Imagem ${i+1}: ${entry.alt}`);
   thumb.setAttribute('aria-pressed',String(i===index));
   const img=document.createElement('img');img.src=entry.file.replace('.webp','-720.webp');img.alt='';img.width=68;img.height=50;
   thumb.append(img);thumb.addEventListener('click',()=>{index=i;renderImage();});return thumb;
  }));
  renderImage();dialog.showModal();document.body.classList.add('modal-open');
 }catch{location.href='creditos.html';}
 finally{button.disabled=false;}
}));
function changeImage(delta){index=(index+delta+selectedImages.length)%selectedImages.length;renderImage();}
document.querySelector('#gallery-prev').addEventListener('click',()=>changeImage(-1));
document.querySelector('#gallery-next').addEventListener('click',()=>changeImage(1));
document.querySelector('.gallery-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});
function syncModalScroll(){document.body.classList.toggle('modal-open',Boolean(document.querySelector('dialog[open]')));}
dialog.addEventListener('close',()=>{syncModalScroll();if(!document.querySelector('#quote-dialog').open)opener?.focus({preventScroll:true});});
dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();syncModalScroll();});
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();changeImage(1);}if(e.key==='ArrowLeft'){e.preventDefault();changeImage(-1);}});

const galleryStage=document.querySelector('.gallery-stage');
let swipeStart=null;
galleryStage.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
 if(!e.isPrimary)return;
 swipeStart={x:e.clientX,y:e.clientY,id:e.pointerId};
 galleryStage.setPointerCapture(e.pointerId);
});
galleryStage.addEventListener('pointerup',e=>{
 if(!swipeStart||swipeStart.id!==e.pointerId)return;
 const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;
 if(Math.abs(dx)>=45&&Math.abs(dx)>Math.abs(dy)*1.3)changeImage(dx<0?1:-1);
});
galleryStage.addEventListener('pointercancel',()=>swipeStart=null);
galleryStage.addEventListener('lostpointercapture',()=>swipeStart=null);

const quoteDialog=document.querySelector('#quote-dialog');
const quoteForm=document.querySelector('#quote-form');
const quoteReference=document.querySelector('#quote-reference');
let quoteOpener=null,referenceTitle='';
document.querySelectorAll('[data-quote]').forEach(button=>button.addEventListener('click',()=>{
 quoteOpener=button;
 referenceTitle=button.dataset.quoteReference||definitions[button.dataset.contactProject]?.title||'';
 quoteReference.textContent=referenceTitle?`Projeto de referência: ${referenceTitle}`:'';
 quoteReference.hidden=!referenceTitle;
 closeMenu();quoteDialog.showModal();quoteDialog.scrollTop=0;syncModalScroll();
 document.querySelector('#quote-name').focus({preventScroll:true});
}));
function closeQuote(){quoteDialog.close();syncModalScroll();}
document.querySelector('.quote-close').addEventListener('click',closeQuote);
quoteDialog.addEventListener('cancel',e=>{e.preventDefault();closeQuote();});
quoteDialog.addEventListener('close',()=>{
 syncModalScroll();
 const fromMobileMenu=nav.contains(quoteOpener)&&toggle.getClientRects().length>0;
 const returnTo=fromMobileMenu?toggle:quoteOpener?.getClientRects().length?quoteOpener:toggle;
 returnTo?.focus({preventScroll:true});
});
quoteDialog.addEventListener('click',e=>{const r=quoteDialog.getBoundingClientRect();if(e.target===quoteDialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))closeQuote();});
quoteDialog.addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;
 const fields=[...quoteDialog.querySelectorAll('button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(el=>el.getClientRects().length);
 const first=fields[0],last=fields.at(-1);
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
quoteForm.querySelectorAll('input,textarea,select').forEach(field=>field.addEventListener('input',()=>field.setCustomValidity('')));
quoteForm.addEventListener('submit',e=>{
 const field=id=>document.querySelector('#quote-'+id);
 const value=id=>field(id).value.trim();
 for(const [id,message] of [['name','Informe seu nome.'],['city','Informe a cidade e o estado.'],['description','Conte um pouco sobre o seu projeto.']]){
  field(id).setCustomValidity(value(id)?'':message);
 }
 if(!quoteForm.reportValidity()){e.preventDefault();return;}
 const lines=[
  'Olá, Paula! Gostaria de solicitar um orçamento.',
  '',`Nome: ${value('name')}`,`Cidade: ${value('city')}`,`Serviço: ${value('service')}`,
  ...(referenceTitle?[`Projeto de referência: ${referenceTitle}`]:[]),
  '',`Sobre o meu projeto: ${value('description')}`
 ];
 document.querySelector('#quote-message').value=lines.join('\n');
});
