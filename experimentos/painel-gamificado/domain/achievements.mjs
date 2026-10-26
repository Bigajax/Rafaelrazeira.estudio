import {progress,totalXP} from './engine.mjs';
import {recognitionSummary,isDecision} from './recognition.mjs';
export const milestoneLevels=[5,10];
export function retrospective(state,history=state.history){
  const ids=new Set(state.products.map(p=>p.id));
  const products=new Set(history.filter(h=>!isDecision(h)).map(h=>h.productId??h.id.split(':')[2]).filter(id=>ids.has(id)));
  return {...recognitionSummary(history),products:products.size,stockReviews:history.filter(h=>h.type==='contagem'||h.type==='revisao'||h.occurrence==='primeira-contagem').length};
}
export function achievements(state){
  let total=0;
  const found=[];
  for(let i=0;i<state.history.length;i++){
    total+=state.history[i].xp;
    for(const level of milestoneLevels){
      if(progress(total).level>=level&&!found.some(a=>a.level===level))found.push({level,at:state.history[i].at,summary:retrospective(state,state.history.slice(0,i+1))});
    }
  }
  return found;
}
export function milestoneBetween(before,after){return milestoneLevels.filter(level=>level>before&&level<=after).at(-1)??null;}
