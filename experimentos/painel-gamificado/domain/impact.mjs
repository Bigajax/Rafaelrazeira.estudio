import {isDecision} from './recognition.mjs';
const DAY=86400000;
const provenanceFields=['storeId','entityId','population','metric','version'];
export function evidenceProvenance(storeId,entityId,type,sourceEventId){return {storeId,entityId,population:type==='campanha'?'visitantes-da-campanha':type==='buscas'?'pessoas-que-buscaram':'visitantes-do-produto',metric:'pessoas-com-clique-whatsapp',version:1,sourceEventId};}
function period(value){
  if(!value)return null;
  const start=Date.parse(value.start),end=Date.parse(value.end);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!Number.isSafeInteger(value.visitors)||value.visitors<0||!Number.isSafeInteger(value.contacts)||value.contacts<0||value.contacts>value.visitors)return null;
  return {...value,startTime:start,endTime:end,days:(end-start)/DAY};
}
export function compareImpact(observation,now=Date.now()){
  if(isDecision(observation)&&(!observation.action||observation.action.status==='not-now'))return {status:'waiting',message:observation.action?'Você decidiu não realizar uma ação agora. Não há resultado atribuído a esta decisão.':'A decisão foi registrada. Informe o próximo passo antes de acompanhar uma ação.'};
  const before=period(observation.before),after=period(observation.after),changedAt=Date.parse(observation.action?.at??observation.changedAt);
  if(!before)return {status:observation.before?'incomparable':'no-baseline',message:observation.before?'As contagens do período anterior precisam ser conferidas.':'Ainda não temos um período anterior comparável para esta melhoria.'};
  if(observation.after&&!after)return {status:'incomparable',message:'As contagens do período depois da melhoria precisam ser conferidas.'};
  if(!after||after.endTime>now)return {status:'waiting',message:'O período depois da melhoria ainda está em observação.'};
  if(observation.type==='buscas')return {status:'incomparable',message:'Buscas sem resultado precisam de uma medida própria. Não comparamos buscas com visitantes e cliques de produto.'};
  if(before.provenance||after.provenance){
    const a=before.provenance,b=after.provenance;
    const expectedPopulation=observation.type==='campanha'?'visitantes-da-campanha':'visitantes-do-produto';
    if(!a||!b||provenanceFields.some(key=>a[key]===undefined||a[key]!==b[key])||!a.sourceEventId||!b.sourceEventId||a.sourceEventId===b.sourceEventId||a.entityId!==(observation.entityId??observation.productId)||a.storeId!==observation.storeId||a.metric!=='pessoas-com-clique-whatsapp'||a.version!==1||a.population!==expectedPopulation)return {status:'incomparable',message:'Os períodos precisam medir a mesma loja, peça ou campanha, população e versão, com fontes distintas.'};
  }
  if(!Number.isFinite(changedAt)||before.endTime>changedAt||after.startTime<changedAt||Math.abs(before.days-after.days)>.001||before.days<14||before.endTime>after.startTime)return {status:'incomparable',message:'Os períodos precisam ter a mesma duração e ficar antes e depois da melhoria.'};
  if(before.visitors<100||after.visitors<100)return {status:'small-sample',message:'Precisamos de ao menos 100 visitantes elegíveis em cada período para esta leitura inicial.',before,after};
  const beforeRate=100*before.contacts/before.visitors,afterRate=100*after.contacts/after.visitors;
  return {status:'ready',before,after,beforeRate,afterRate,difference:afterRate-beforeRate,message:'A comparação descreve os períodos observados; não comprova que a melhoria causou a mudança.'};
}
export function observationsFor(state){
  const saved=state.observations??[];
  const pending=state.history.filter(h=>['foto','detalhe','descricao','material'].includes(h.type)&&!saved.some(o=>o.missionId===h.id)).map(h=>({id:`observation:${h.id}`,missionId:h.id,productId:h.productId,changedAt:h.at,before:null,after:null,simulated:true}));
  return [...saved,...pending].map(o=>{const award=state.history.find(h=>h.id===o.missionId),action=(state.followups??[]).filter(f=>f.observationId===o.id).at(-1);return {...o,type:o.type??award?.type,storeId:o.storeId??state.storeId,entityId:o.entityId??o.productId,entityName:o.entityName??award?.productName,action:action??o.action};});
}
