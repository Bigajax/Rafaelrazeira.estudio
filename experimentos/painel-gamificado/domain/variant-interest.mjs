import {variantsFor} from './commercial.mjs';
export function registerVariantSignal(state,command,{visitorId,at=new Date().toISOString()}={}){
  const product=state.products.find(p=>p.id===command.productId&&p.published!==false),variant=product&&variantsFor(product).find(v=>v.id===command.variantId);
  if(!variant||!visitorId||!['open','interest'].includes(command.kind))throw Error('Escolha uma variação disponível neste catálogo.');
  if(variant.physical!==0)return {state,duplicate:false,status:variant.physical===null?'unknown':'available'};
  if(!Number.isFinite(Date.parse(at)))throw Error('Data de registro inválida.');
  const records=state.commercialData?.variantSignals??[],start=Date.parse(at)-7*86400000;
  if(records.some(e=>e.sourceEventId===command.operation||(command.kind==='interest'&&e.visitorId===visitorId&&e.productId===product.id&&e.variantId===variant.id&&e.kind==='interest'&&Date.parse(e.at)>start&&Date.parse(e.at)<=Date.parse(at))))return {state,duplicate:true,status:command.kind==='interest'?'registered':'opened'};
  if(command.kind==='interest'&&!records.some(e=>e.visitorId===visitorId&&e.productId===product.id&&e.variantId===variant.id&&e.kind==='open'&&e.stockVersion===variant.stockVersion&&Date.parse(e.at)>Date.parse(at)-15*60000))throw Error('Abra a informação do tamanho novamente antes de registrar interesse.');
  if(records.length>=5000)throw Error('Esta demonstração já recebeu muitos eventos. Reinicie o cenário para continuar.');
  const next=structuredClone(state);next.commercialData??={complete:false,products:[],variantSignals:[]};next.commercialData.variantSignals??=[];
  next.commercialData.variantSignals.push({storeId:state.storeId,sourceEventId:command.operation,productId:product.id,variantId:variant.id,kind:command.kind,visitorId,at,availability:'unavailable',stockVersion:variant.stockVersion});
  return {state:next,duplicate:false,status:command.kind==='interest'?'registered':'opened'};
}
