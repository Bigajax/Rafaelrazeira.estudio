import {improve,missions,totalXP,progress} from '../domain/engine.mjs';
import {withJourneys} from '../domain/journeys.mjs';

export function withPreviewLevel(initial,level){
  if(![10,25].includes(level))throw Error('Escolha um nível demonstrativo válido.');
  const target=(level-1)*100+25*(level-1)*(level-2);
  let state=structuredClone(initial),i=0;
  while(totalXP(state)<target){
    const remaining=target-totalXP(state),type=remaining>=80?'contagem':remaining===60?'foto':remaining===40?'detalhe':null;
    if(!type)throw Error('Histórico demonstrativo inválido.');
    const product={...state.products[2],id:`historico-nivel${level}-${++i}`,name:`Peça do histórico ${i}`,size:'M',physical:type==='contagem'?null:2,cover:type==='foto'?null:'/assets/conjunto.svg',detail:type==='detalhe'?null:'/assets/detalhe.svg',needsDetail:type==='detalhe',variants:undefined,published:true};
    state.products.push(product);state=withJourneys(state);
    const mission=missions(state,{includeDeferred:true,limit:Infinity}).find(m=>m.productId===product.id&&m.type===type);
    state=improve(state,{operation:`fixture-level-${level}-${i}`,missionId:mission.id,...(type==='contagem'?{physical:2,reason:'Conferência do histórico fictício da demonstração.'}:{photo:type==='foto'?'/assets/conjunto.svg':'/assets/detalhe.svg'}),at:new Date(Date.UTC(2026,0,i,12)).toISOString()}).state;
    state.products.find(p=>p.id===product.id).published=false;
  }
  if(progress(totalXP(state)).level!==level)throw Error('Nível demonstrativo inválido.');
  return state;
}
