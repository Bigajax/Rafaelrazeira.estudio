import {missions} from './engine.mjs';
const DAY=86400000;
const count=n=>Number.isSafeInteger(n)&&n>=0;
const median=values=>{const v=values.slice().sort((a,b)=>a-b),i=Math.floor(v.length/2);return v.length%2?v[i]:(v[i-1]+v[i])/2;};
export const mapFilters={all:'Todas',attention:'Merecem atenção',interest:'Procura por tamanho',comparable:'Podemos comparar',initial:'Leitura inicial'};
export function variantsFor(product){return product.variants??[{id:`${product.id}-${product.size}`,size:product.size,physical:product.physical,stockVersion:1}];}
function validPeriod(p,now){return p&&Number.isFinite(Date.parse(p.start))&&Number.isFinite(Date.parse(p.end))&&Date.parse(p.end)>Date.parse(p.start)&&Date.parse(p.end)<=now;}
function reading(state,product,now){
  const data=state.commercialData,r=data?.products?.find(r=>r.productId===product.id);
  if(!r||r.storeId!==state.storeId||!validPeriod(data.period,now)||!r.sourceEventId||!count(r.visitors)||!count(r.contacts)||!count(r.exposures))return null;
  return {...r,publishedAt:product.publishedAt,period:data.period,complete:data.complete===true,qualified:r.contactsQualified===true&&r.contacts<=r.visitors};
}
function comparable(r,now){
  const p=r?.previous;if(!r?.complete||!r.qualified||r.visitors<100||!p||p.storeId!==r.storeId||p.productId!==r.productId||!validPeriod(p.period,now)||!count(p.visitors)||p.visitors<100||!count(p.contacts)||p.contacts>p.visitors||p.contactsQualified!==true||!p.sourceEventId||p.sourceEventId===r.sourceEventId||p.version!==r.version||p.population!==r.population||r.version!==1||r.population!=='visitantes-do-produto')return false;
  const duration=Date.parse(r.period.end)-Date.parse(r.period.start),prior=Date.parse(p.period.end)-Date.parse(p.period.start);
  return duration>=14*DAY&&Math.abs(duration-prior)<1000&&Date.parse(p.period.end)<=Date.parse(r.period.start);
}
export function variantSignals(state,productId,now=Date.now()){
  const product=state.products.find(p=>p.id===productId);if(!product)return [];
  return variantsFor(product).map(v=>{
    const events=(state.commercialData?.variantSignals??[]).filter(e=>e.storeId===state.storeId&&e.productId===productId&&e.variantId===v.id&&typeof e.visitorId==='string'&&e.sourceEventId&&Number.isFinite(Date.parse(e.at))&&Date.parse(e.at)>now-7*DAY&&Date.parse(e.at)<=now);
    const unique=kind=>new Set(events.filter(e=>e.kind===kind).map(e=>e.visitorId)).size;
    return {...v,opened:unique('open'),declared:unique('interest'),unavailable:new Set(events.filter(e=>e.kind==='interest'&&e.availability==='unavailable'&&Number.isSafeInteger(e.stockVersion)).map(e=>e.visitorId)).size,unknown:new Set(events.filter(e=>e.kind==='interest'&&e.availability!=='unavailable').map(e=>e.visitorId)).size};
  });
}
export function productMap(state,{now=Date.now()}={}){
  const available=missions(state,{limit:Infinity}),all=missions(state,{includeDeferred:true,limit:Infinity}),rows=state.products.filter(p=>p.published!==false).map(product=>({product,reading:reading(state,product,now),variants:variantSignals(state,product.id,now),mission:available.find(m=>m.productId===product.id),deferred:all.some(m=>m.productId===product.id&&state.deferred.includes(m.id))}));
  const cohort=rows.filter(r=>comparable(r.reading,now));
  const exposureCohort=cohort.filter(({reading:r})=>r.exposuresQualified===true&&r.exposures>=100&&count(r.opensFromExposure)&&r.opensFromExposure<=r.exposures&&r.opensFromExposure<=r.visitors&&Date.parse(r.publishedAt)<=Date.parse(r.period.start));
  const reference=cohort.length>=5?{visitors:median(cohort.map(r=>r.reading.visitors)),rate:median(cohort.map(r=>r.reading.contacts/r.reading.visitors)),exposure:exposureCohort.length>=5?median(exposureCohort.map(r=>r.reading.opensFromExposure/r.reading.exposures)):null,members:cohort.length}:null;
  const maxVisitors=Math.max(0,...rows.map(r=>r.reading?.visitors??0));
  return rows.map(row=>{
    const r=row.reading,signals=row.variants.filter(v=>v.declared>0),pending=signals.find(v=>v.physical===0||v.physical===null),hasComparison=Boolean(reference&&comparable(r,now));
    let situation='Leitura inicial',suggestion='Veja os fatos disponíveis e acompanhe a peça.',level=r?1:0;
    if(row.mission){situation='Cuidado identificado';suggestion=row.mission.action;level=2;}
    if(signals.length){level=Math.max(level,2);situation=pending?'Procura por tamanho':'Interesse registrado';suggestion=pending?.physical===null?'Confira a disponibilidade atual.':pending?'Avalie a disponibilidade antes de decidir sobre reposição.':'A peça está disponível agora. Veja a procura registrada.';}
    const limitedDiscovery=hasComparison&&reference.exposure!==null&&exposureCohort.includes(row)&&r.visitors<reference.visitors&&r.opensFromExposure/r.exposures<reference.exposure;
    if(hasComparison){level=3;if(!signals.length&&!row.mission){const rate=r.contacts/r.visitors;situation=r.visitors>=reference.visitors&&rate>reference.rate?'Destaque relativo':r.visitors>=reference.visitors?'Muito visto':limitedDiscovery?'Pouco descoberto':'Leitura comparável';} }
    return {...row,signals,pending,level,situation,suggestion,comparison:hasComparison?{rate:100*r.contacts/r.visitors,referenceRate:100*reference.rate,members:reference.members,previousRate:100*r.previous.contacts/r.previous.visitors}:null,exposureComparison:limitedDiscovery?{rate:100*r.opensFromExposure/r.exposures,referenceRate:100*reference.exposure}:null,mostViewed:Boolean(r?.complete&&maxVisitors>0&&r.visitors===maxVisitors),priority:pending?1:row.mission?2:signals.length?3:4};
  }).sort((a,b)=>a.priority-b.priority||(b.reading?.visitors??-1)-(a.reading?.visitors??-1)||a.product.name.localeCompare(b.product.name));
}
export function diagnostic(state,{now=Date.now()}={}){
  const rows=productMap(state,{now});
  return rows.filter(r=>!r.deferred&&(r.mission||r.pending)).slice(0,3);
}
