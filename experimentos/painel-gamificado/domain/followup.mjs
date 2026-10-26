import {observationsFor,compareImpact} from './impact.mjs';
import {isDecision} from './recognition.mjs';

export const followupChoices={performed:'Realizei o encaminhamento', 'not-now':'Decidi não realizar agora'};
export function followupStatus(observation,now=Date.now()){
  const comparison=compareImpact(observation,now);
  if(isDecision(observation)&&!observation.action)return {stage:'action-pending',label:'Falta registrar o próximo passo',comparison};
  if(observation.action?.status==='not-now')return {stage:'paused',label:'Sem ação neste momento',comparison};
  return {stage:comparison.status,label:comparison.status==='ready'?'Comparação disponível':comparison.status==='waiting'?'Aguardando o período seguinte':comparison.status==='small-sample'?'Poucos visitantes para comparar':comparison.status==='no-baseline'?'Sem período anterior': 'Dados incompatíveis',comparison};
}
export function recordFollowup(state,command){
  if(state.operations.includes(command.operation))return {state,duplicate:true};
  const observation=observationsFor(state).find(o=>o.id===command.observationId);
  if(!observation||!isDecision(observation))throw Error('Escolha uma decisão registrada para acompanhar.');
  const note=typeof command.note==='string'?command.note.trim():'';
  if(!followupChoices[command.status]||note.length<20||note.length>600)throw Error('Escolha o encaminhamento e descreva de 20 a 600 caracteres.');
  const at=command.at??new Date().toISOString();
  if(!Number.isFinite(Date.parse(at))||Date.parse(at)<Date.parse(observation.changedAt))throw Error('O encaminhamento precisa acontecer depois da decisão.');
  const next=structuredClone(state);
  next.followups??=[];
  next.followups.push({id:command.operation,observationId:observation.id,status:command.status,note,at,declared:true});
  next.operations.push(command.operation);
  return {state:next,duplicate:false};
}
