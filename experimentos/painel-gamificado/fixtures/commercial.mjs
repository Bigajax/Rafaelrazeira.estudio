import {withContinuous} from './continuous.mjs';
import {withPreviewLevel} from './preview-level.mjs';
export const commercialScenarios=[
  {id:'mapa-nivel-25',label:'1.4 · Experimento no nível 25'},
  {id:'mapa-nivel-10',label:'1.4 · Experimento no nível 10'},
  {id:'mapa-comercial',label:'1.4 · Loja pequena, 40 produtos'},
  {id:'mapa-comparavel',label:'1.4 · Produtos com base comparável'},
  {id:'mapa-poucos-dados',label:'1.4 · Poucas visitas, cuidados úteis'},
  {id:'mapa-interesse',label:'1.4 · Sete interessados no tamanho'},
  {id:'mapa-reposto',label:'1.4 · Tamanho disponível agora'},
  {id:'mapa-fontes-incompletas',label:'1.4 · Coleta incompleta'},
  {id:'mapa-toques',label:'1.4 · Toques sem interesse declarado'}
];
const period={start:'2026-09-28T00:00:00Z',end:'2026-10-12T00:00:00Z'},previousPeriod={start:'2026-09-14T00:00:00Z',end:'2026-09-28T00:00:00Z'};
export function withCommercial(initial){
  const state=withContinuous(initial);state.schema=4;
  const names=['Tênis Air Max','Tênis Dunk Panda','Conjunto Linho','Jaqueta Nylon','Camiseta Essencial','Calça Reta'];
  const large=['mapa-comercial','mapa-nivel-10','mapa-nivel-25'].includes(state.scenario),comparable=state.scenario==='mapa-comparavel'||state.scenario==='mapa-fontes-incompletas';
  state.products=Array.from({length:large?40:comparable?6:3},(_,i)=>({...state.products[i%3],id:i<3?state.products[i].id:`catalogo-${i+1}`,name:names[i]??`Peça do catálogo ${String(i+1).padStart(2,'0')}`,size:i<2?'41':i===2?'M':'P',category:i<2?'Calçados':'Roupas',description:i<2?'Tênis de cano baixo, com fechamento por cadarço. Confira a numeração antes de escolher.':state.products[i%3].description,material:i<2?'Cabedal sintético; sola de borracha':state.products[i%3].material,cover:i<2?'/assets/tenis.svg':i===2?null:state.products[i%3].cover,variants:i<2?[{id:`variante-${i}-40`,size:'40',physical:2,stockVersion:1},{id:`variante-${i}-41`,size:'41',physical:i===0&&state.scenario!=='mapa-reposto'?0:2,stockVersion:1},{id:`variante-${i}-42`,size:'42',physical:1,stockVersion:1}]:[{id:`variante-${i}-M`,size:'M',physical:3,stockVersion:1}],physical:i===0&&state.scenario!=='mapa-reposto'?0:3}));
  state.products.forEach(p=>p.publishedAt='2026-09-01T00:00:00Z');
  if(comparable)state.products[2].cover='/assets/conjunto.svg';
  state.commercialData={period,complete:state.scenario!=='mapa-fontes-incompletas',variantSignals:[],products:state.products.map((p,i)=>{
    const visitors=comparable?[220,180,160,140,120,100][i]:[24,83,18][i]??(2+i%9),contacts=comparable?[36,9,8,5,3,1][i]:i===1?17:i===2?2:0;
    return {storeId:state.storeId,productId:p.id,sourceEventId:`leitura-produto-${i}-outubro`,version:1,population:'visitantes-do-produto',visitors,contacts,contactsQualified:true,exposures:visitors+40,exposuresQualified:true,opensFromExposure:visitors,previous:comparable?{storeId:state.storeId,productId:p.id,period:previousPeriod,sourceEventId:`leitura-produto-${i}-setembro`,version:1,population:'visitantes-do-produto',visitors:120,contacts:6,contactsQualified:true}:null};
  })};
  const declarations=state.scenario==='mapa-toques'?0:comparable||state.scenario==='mapa-poucos-dados'?0:large?14:7;
  for(let i=0;i<14;i++){
    const base={storeId:state.storeId,productId:state.products[0].id,variantId:'variante-0-41',visitorId:`ficticio-${i}`,at:'2026-10-11T12:00:00Z',availability:'unavailable',stockVersion:1};
    state.commercialData.variantSignals.push({...base,sourceEventId:`consulta-tamanho-${i}`,kind:'open'});
    if(i<declarations)state.commercialData.variantSignals.push({...base,sourceEventId:`interesse-tamanho-${i}`,kind:'interest'});
  }
  return state.scenario==='mapa-nivel-10'?withPreviewLevel(state,10):state.scenario==='mapa-nivel-25'?withPreviewLevel(state,25):state;
}
export function changeDemoVariant(state,command){
  if(!commercialScenarios.some(s=>s.id===state.scenario))throw Error('A mudança de estoque está disponível apenas nos cenários fictícios da 1.4.');
  const next=structuredClone(state),p=next.products.find(p=>p.id===command.productId),v=p?.variants?.find(v=>v.id===command.variantId);
  if(!v||!['available','unavailable','unknown'].includes(command.preset))throw Error('Escolha uma disponibilidade fictícia válida.');
  v.physical=command.preset==='available'?2:command.preset==='unknown'?null:0;v.stockVersion++;
  if(v.size===p.size)p.physical=v.physical;
  return {state:next,status:command.preset};
}
