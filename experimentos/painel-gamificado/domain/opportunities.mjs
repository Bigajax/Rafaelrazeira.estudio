const DAY=86400000;
export const opportunityDefaults=Object.freeze({productDays:14,productPeople:50,searchDays:7,searchPeople:10,campaignDays:7,campaignPeople:50});
export const presentationRewards=Object.freeze({foto:60,detalhe:40,descricao:60,material:100});
const presentationActions={foto:'Adicionar foto',detalhe:'Adicionar foto de detalhe',descricao:'Informar detalhes da peça',material:'Informar composição'};
export const decisionModels={
  esgotado:{xp:80,category:'Estoque',action:'Registrar decisão',title:'Este produto continua despertando interesse.',choices:{manter:'Manter indisponível',avaliar:'Avaliar reposição',alternativa:'Orientar uma alternativa'}},
  buscas:{xp:60,category:'Vitrine',action:'Analisar buscas',title:'Seus visitantes estão procurando algo que não encontraram.',choices:{revisar:'Revisar nomes e categorias',avaliar:'Avaliar a procura',fora:'Não trabalhar com este item'}},
  campanha:{xp:80,category:'Divulgação',action:'Analisar campanha',title:'Você já pode analisar sua última divulgação.',choices:{manter:'Manter a abordagem',ajustar:'Ajustar a próxima divulgação',observar:'Observar outro período'}}
};
export function opportunityRules(state){
  const config={...opportunityDefaults,...state.opportunityRules};
  if(Object.keys(config).some(k=>!Object.hasOwn(opportunityDefaults,k)||!Number.isSafeInteger(config[k])||config[k]<1||config[k]>100000))throw Error('Configuração de oportunidades inválida.');
  return config;
}
export function eligiblePeriod(period,{days,people,now=Date.now()}){
  if(!period||typeof period.start!=='string'||typeof period.end!=='string')return false;
  const start=Date.parse(period.start),end=Date.parse(period.end);
  return Number.isFinite(start)&&Number.isFinite(end)&&end<=now&&(end-start)>=days*DAY&&
    Number.isSafeInteger(period.people)&&period.people>=people&&Number.isSafeInteger(period.contacts)&&period.contacts>=0&&period.contacts<=period.people;
}
function validEvent(event,state,now){
  const identified=Date.parse(event.identifiedAt);
  return event.storeId===state.storeId&&typeof event.id==='string'&&/^[a-zA-Z0-9_-]{3,100}$/.test(event.id)&&
    typeof event.sourceEventId==='string'&&/^[a-zA-Z0-9_-]{3,100}$/.test(event.sourceEventId)&&
    typeof event.entityId==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(event.entityId)&&
    Number.isFinite(identified)&&identified<=now&&identified>=Date.parse(event.period?.end);
}
export function freshOccurrence(state,event,type){
  return !state.history.some(award=>{
    if(award.sourceEventId===event.sourceEventId)return true;
    if(award.opportunityType!==type||award.entityId!==event.entityId)return false;
    // New windows alone are insufficient: require a new source event AFTER the previous decision.
    return Date.parse(event.period.start)<Date.parse(award.period?.end)||Date.parse(event.period.start)<Date.parse(award.at)||Date.parse(event.identifiedAt)<=Date.parse(award.at);
  });
}
export function productEvidence(state,productId,now=Date.now()){
  const rules=opportunityRules(state);
  return (state.opportunityData?.events??[]).find(e=>['produto','esgotado'].includes(e.kind)&&e.entityId===productId&&validEvent(e,state,now)&&eligiblePeriod(e.period,{days:rules.productDays,people:rules.productPeople,now}));
}
export function identifyOpportunities(state,{now=Date.now()}={}){
  if(!state.opportunityData)return {items:[],insufficient:false};
  const rules=opportunityRules(state),items=[],seenSources=new Set(),seenNeeds=new Set();let insufficient=false;
  for(const event of state.opportunityData.events??[]){
    if(!validEvent(event,state,now)){insufficient=true;continue;}
    const product=state.products.find(p=>p.id===event.entityId);
    let type=event.kind;
    const threshold=type==='buscas'?{days:rules.searchDays,people:rules.searchPeople}:type==='campanha'?{days:rules.campaignDays,people:rules.campaignPeople}:{days:rules.productDays,people:rules.productPeople};
    if(!eligiblePeriod(event.period,{...threshold,now})){insufficient=true;continue;}
    if(type==='produto'){
      if(!product||product.published===false)continue;
      type=!product.cover?'foto':product.needsDetail&&!product.detail?'detalhe':product.needsDescription&&!product.description.trim()?'descricao':!product.material.trim()?'material':null;
      if(!type)continue;
    }else if(type==='esgotado'){
      if(!product||product.published===false||product.physical!==0)continue;
    }else if(type==='buscas'){
      if(event.matched!==false||typeof event.term!=='string'||event.term.trim().length<2||event.term.length>100)continue;
    }else if(type==='campanha'){
      if(event.tracked!==true||typeof event.name!=='string'||!event.name.trim()||event.name.length>100)continue;
    }else continue;
    if(!freshOccurrence(state,event,type)||seenSources.has(event.sourceEventId)||seenNeeds.has(`${type}:${event.entityId}`))continue;
    seenSources.add(event.sourceEventId);seenNeeds.add(`${type}:${event.entityId}`);
    const model=decisionModels[type],name=product?.name??(type==='buscas'?`Busca: ${event.term.trim()}`:event.name.trim());
    const evidence=type==='buscas'?`${event.period.people} visitantes buscaram “${event.term.trim()}” sem encontrar resultados.`:type==='campanha'?`${event.period.people} visitantes vieram da campanha e ${event.period.contacts} clicaram no WhatsApp.`:`${event.period.people} pessoas viram ${name}; ${event.period.contacts} clicaram no WhatsApp.`;
    const missionId=model?`${state.storeId}:${type}:${event.entityId}:${event.sourceEventId}:v1`:`${state.storeId}:${type}:${event.entityId}:apresentacao:v1`;
    if(state.history.some(a=>a.id===missionId))continue;
    items.push({id:`${state.storeId}:oportunidade:${type}:${event.entityId}:${event.sourceEventId}:v1`,missionId,storeId:state.storeId,type,
      entityId:event.entityId,entityName:name,productId:product?.id,productName:name,sourceEventId:event.sourceEventId,
      opportunityType:type,occurrence:event.sourceEventId,identifiedAt:event.identifiedAt,period:{...event.period},
      evidence,reason:`${evidence} ${type==='esgotado'?'Esta variação está indisponível.':type==='buscas'?'Decida como tratar esta procura.':type==='campanha'?'Registre o que observou e seu próximo passo.':'Complete a informação ausente.'}`,
      title:model?.title??'Este produto está chamando atenção. Sua apresentação pode melhorar.',
      action:model?.action??presentationActions[type],category:model?.category??'Vitrine',family:'evolucao',objectiveKind:type==='campanha'?'desafio':'oportunidade',
      criterion:model?'Decisão permitida e justificativa ou próximo passo de 20 a 600 caracteres.':'Salvar a melhoria específica da apresentação.',
      xp:model?.xp??presentationRewards[type],priority:type==='esgotado'?1:type==='buscas'?3:4,ruleVersion:1,
      status:state.deferred.includes(missionId)?'adiada':'identificada'});
  }
  return {items,insufficient:insufficient||(state.opportunityData.events??[]).length===0&&!state.opportunityData.complete};
}
export function decisionObjectives(state){
  return identifyOpportunities(state).items.filter(o=>decisionModels[o.type]).map(o=>({...o,id:`${state.storeId}:${o.type}:${o.entityId}:${o.sourceEventId}:v1`,benefit:o.type==='esgotado'?'Sua decisão fica registrada. Não é necessário comprar mercadoria.':'O resultado da análise fica registrado para orientar a próxima ação.'}));
}
export function validateDecision(mission,command){
  const model=decisionModels[mission.type],note=typeof command.note==='string'?command.note.trim():'';
  if(!Object.hasOwn(model.choices,command.decision))throw Error('Escolha uma decisão para esta oportunidade.');
  if(note.length<20||note.length>600)throw Error('Registre sua análise ou próximo passo com 20 a 600 caracteres.');
  return {decision:command.decision,label:model.choices[command.decision],note};
}
export function stockOccurrenceEligible(state,product,now=Date.now()){
  const review=product.stockReview;
  if(!review?.sourceEventId)return true; // Preserve the six original models and historical fixtures.
  const at=Date.parse(review.identifiedAt);
  if(review.storeId!==state.storeId||typeof review.sourceEventId!=='string'||!/^[a-zA-Z0-9_-]{3,100}$/.test(review.sourceEventId)||!Number.isFinite(at)||at>now||!review.reason?.trim()||!Number.isSafeInteger(review.expected)||!Number.isSafeInteger(review.observed)||review.expected<0||review.observed<0||review.expected===review.observed)return false;
  return !state.history.some(a=>a.sourceEventId===review.sourceEventId||(a.type==='revisao'&&a.productId===product.id&&Date.parse(a.at)>=at));
}
