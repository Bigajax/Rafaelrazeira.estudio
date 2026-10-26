import {withContinuous} from './continuous.mjs';
import {withJourneys} from '../domain/journeys.mjs';
import {improve,missions} from '../domain/engine.mjs';
import {recordFollowup} from '../domain/followup.mjs';
import {observationsFor} from '../domain/impact.mjs';
export const followupScenarios=[
  {id:'acompanhamento-comercial',label:'1.3 · Ciclo comercial completo'},
  {id:'decisao-sem-acao',label:'1.3 · Decisão aguardando ação'},
  {id:'acompanhamento-amostra',label:'1.3 · Comparação com pouca amostra'},
  {id:'acompanhamento-fontes',label:'1.3 · Fontes incompatíveis'}
];
const actionAt='2026-09-13T12:00:00Z';
const before={start:'2026-08-28T00:00:00Z',end:'2026-09-11T00:00:00Z',people:120,contacts:3};
export function withFollowup(initial){
  let state=withContinuous(initial),type=state.scenario==='decisao-sem-acao'?'esgotado':'campanha',entityId=type==='esgotado'?'linho':'primavera';
  if(type==='esgotado')state.products[0].physical=0;
  state.opportunityData.events=[{id:'historico-setembro-01',sourceEventId:'campanha-setembro-fonte-01',storeId:state.storeId,kind:type,entityId,name:'Primavera / Instagram',tracked:true,identifiedAt:'2026-09-11T12:00:00Z',period:before}];
  state=withJourneys(state);
  const m=missions(state,{limit:Infinity})[0];
  state=improve(state,{operation:'fixture-historical-decision',missionId:m.id,decision:type==='esgotado'?'avaliar':'ajustar',note:'Avaliar a oportunidade e definir o próximo encaminhamento da loja.',at:'2026-09-12T12:00:00Z'}).state;
  if(type==='esgotado')return state;
  const o=observationsFor(state)[0];
  state=recordFollowup(state,{operation:'fixture-historical-action',observationId:o.id,status:'performed',note:'Ajustei o texto da divulgação e publiquei uma nova campanha rastreada.',at:actionAt}).state;
  if(state.scenario!=='acompanhamento-comercial')state=loadFollowupEvidence(state,'periodo-posterior-setembro').state;
  return state;
}
export function canLoadFollowupEvidence(state){return followupScenarios.some(s=>s.id===state.scenario)&&state.scenario!=='decisao-sem-acao'&&observationsFor(state).some(o=>o.type==='campanha'&&!o.after&&o.action?.status==='performed'&&o.action.at===actionAt);}
export function loadFollowupEvidence(state,preset){
  if(preset!=='periodo-posterior-setembro')throw Error('Escolha uma fonte fictícia preparada para este cenário.');
  if(state.evidenceImports?.includes(preset))return {state,duplicate:true};
  if(!canLoadFollowupEvidence(state))throw Error('Não há período fictício compatível preparado para este acompanhamento.');
  const next=structuredClone(state),o=next.observations.find(o=>o.type==='campanha'&&!o.after);
  o.after={start:'2026-09-14T00:00:00Z',end:'2026-09-28T00:00:00Z',visitors:120,contacts:9,provenance:{...o.before.provenance,sourceEventId:'campanha-setembro-posterior-02'}};
  if(state.scenario==='acompanhamento-amostra')o.after.visitors=28;
  if(state.scenario==='acompanhamento-fontes')o.after.provenance.population='visitantes-de-toda-a-loja';
  o.evidenceReceivedAt=new Date().toISOString();
  next.evidenceImports=[...(next.evidenceImports??[]),preset];
  // This is a separate concluded campaign occurrence, never derived from the rate difference.
  if(state.scenario==='acompanhamento-comercial')next.opportunityData.events.push({id:'campanha-outubro-02',sourceEventId:'campanha-outubro-fonte-02',storeId:state.storeId,kind:'campanha',entityId:'primavera',name:'Primavera / Instagram',tracked:true,identifiedAt:'2026-10-12T12:00:00Z',period:{start:'2026-09-28T00:00:00Z',end:'2026-10-12T00:00:00Z',people:126,contacts:7}});
  return {state:next,duplicate:false};
}
