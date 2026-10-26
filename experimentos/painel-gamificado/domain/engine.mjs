import {productEvidence,identifyOpportunities,decisionObjectives,decisionModels,presentationRewards,validateDecision,stockOccurrenceEligible} from './opportunities.mjs';
import {evidenceProvenance} from './impact.mjs';
export const MISSION_TYPES=['foto','detalhe','descricao','contagem','revisao','material','esgotado','buscas','campanha'];
export const STORAGE_KEY='experimento-evolucao-atelier04-react-v2';
export const CATEGORIES=['Vitrine','Estoque'];
export function productInterest(state,productId){
  if(state.opportunityData){const event=productEvidence(state,productId);return event?{people:event.period.people,contacts:event.period.contacts,days:(Date.parse(event.period.end)-Date.parse(event.period.start))/86400000,simulated:true}:null;}
  const value=state.productAnalytics?.[productId]??(state.analytics?.productId===productId?state.analytics:null);
  if(!value||!Number.isSafeInteger(value.people)||value.people<50||!Number.isSafeInteger(value.contacts)||value.contacts<0||value.contacts>value.people||!Number.isFinite(value.days)||value.days<14)return null;
  return value;
}
export function progress(total){
  if(!Number.isSafeInteger(total)||total<0)throw Error('Experiência inválida.');
  let level=1,within=total,needed=100;
  while(within>=needed){within-=needed;level++;needed=100+(level-1)*50;}
  return {level,total,within,needed,remaining:needed-within,fraction:within/needed};
}
export const totalXP=state=>state.history.reduce((n,h)=>n+h.xp,0);
function id(state,type,p){return `${state.storeId}:${type}:${p.id}:${type==='contagem'?p.size:type==='revisao'?p.stockReview.id:'apresentacao'}:v1`;}
function objectives(state){
  const list=[];
  for(const p of state.products){
    if(p.published===false)continue;
    if(!p.cover)list.push({id:id(state,'foto',p),type:'foto',family:'organizacao',category:'Vitrine',priority:1,productId:p.id,title:'Mostre a peça para ajudar na escolha',reason:`O ${p.name} ainda está sem foto. Adicione uma imagem para a cliente conhecer a peça antes de chamar a loja.`,benefit:'Uma apresentação mais clara para começar a conversa.',action:'Adicionar foto',xp:presentationRewards.foto,ruleVersion:1,occurrence:'primeira-foto-capa'});
    if(p.physical===null)list.push({id:id(state,'contagem',p),type:'contagem',family:'organizacao',category:'Estoque',priority:2,productId:p.id,title:'Saiba o que pode vender',reason:`A ${p.name}, tamanho ${p.size}, ainda está sem contagem. Confira quantas unidades você tem na loja.`,benefit:'Disponibilidade conferida para o atendimento.',action:'Conferir estoque',xp:80,ruleVersion:1,occurrence:'primeira-contagem'});
    if(p.physical!==null&&p.stockReview&&!p.stockReview.resolvedAt&&stockOccurrenceEligible(state,p))list.push({id:id(state,'revisao',p),type:'revisao',family:'organizacao',category:'Estoque',priority:2,productId:p.id,title:'Confira a quantidade antes do atendimento',reason:`${p.name}, tamanho ${p.size}: ${p.stockReview.reason}`,benefit:'Conferir uma divergência é mais útil do que aumentar o estoque.',action:'Revisar disponibilidade',xp:80,ruleVersion:1,occurrence:`revisao:${p.stockReview.id}`,sourceEventId:p.stockReview.sourceEventId,identifiedAt:p.stockReview.identifiedAt,objectiveKind:p.stockReview.sourceEventId?'desafio':'estrutura'});
    if(p.cover&&p.needsDetail&&!p.detail)list.push({id:id(state,'detalhe',p),type:'detalhe',family:'organizacao',category:'Vitrine',priority:3,productId:p.id,title:'Mostre o detalhe que ajuda na escolha',reason:`O ${p.name} tem uma foto de capa, mas o acabamento ainda não aparece.`,benefit:'Uma imagem de perto ajuda a conhecer o acabamento.',action:'Adicionar foto de detalhe',xp:presentationRewards.detalhe,ruleVersion:1,occurrence:'primeira-foto-detalhe'});
    if(p.needsDescription&&!p.description.trim())list.push({id:id(state,'descricao',p),type:'descricao',family:'organizacao',category:'Vitrine',priority:3,productId:p.id,title:'Explique o que a foto não conta',reason:`O ${p.name} ainda não informa o caimento ou o acabamento.`,benefit:'Use informações da peça que ajudem a cliente a escolher.',action:'Informar detalhes da peça',xp:presentationRewards.descricao,ruleVersion:1,occurrence:'primeira-descricao'});
    const a=productInterest(state,p.id);
    if(!p.material.trim()&&a)list.push({id:id(state,'material',p),type:'material',family:'evolucao',category:'Vitrine',priority:3,productId:p.id,title:'Este produto está despertando interesse',reason:`${a.people} pessoas viram o ${p.name} nos últimos ${a.days} dias. A composição do tecido ainda não aparece na peça.`,benefit:'Completar essa informação pode ajudar a avaliar a peça. Depois, acompanhe os contatos.',action:'Informar composição',xp:presentationRewards.material,ruleVersion:1,occurrence:'primeira-composicao',context:a});
  }
  const detected=identifyOpportunities(state).items;
  for(const objective of list){
    const opportunity=detected.find(o=>o.productId===objective.productId&&o.type===objective.type);
    if(opportunity){const {id:opportunityId,xp,action,priority,...context}=opportunity;Object.assign(objective,context,{id:objective.id,opportunityId});}
    objective.objectiveKind??=objective.type==='material'?'oportunidade':'estrutura';
    const interest=productInterest(state,objective.productId),base=objective.priority;
    objective.priority=base+1;
    objective.priorityReason=base===1?'A primeira foto ajuda a conhecer a peça.':base===2?'A disponibilidade precisa ser conferida.':'Uma informação ajuda a avaliar a peça.';
    if(interest){
      objective.family='evolucao';objective.context=interest;
      objective.priority=base===1?0:base===2?1:4;
      objective.priorityReason=`${interest.people} pessoas viram esta peça em ${interest.days} dias. ${base===2?'Vale conferir a disponibilidade antes de atender.':'Vale completar a apresentação para quem já está olhando.'}`;
    }
  }
  return [...list,...decisionObjectives(state)].sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
}
export function missions(state,{includeDeferred=false,limit=3}={}){
  const done=new Set(state.history.map(h=>h.id)),deferred=new Set(state.deferred);
  const seen=new Set();
  return objectives(state).filter(m=>{const entity=m.productId??`${m.type}:${m.entityId}`;if(done.has(m.id)||seen.has(entity))return false;seen.add(entity);return includeDeferred||!deferred.has(m.id);}).slice(0,limit);
}
export function deferMission(state,missionId){
  if(!missions(state,{includeDeferred:true,limit:Infinity}).some(m=>m.id===missionId))throw Error('Esta melhoria não está mais disponível.');
  return {...state,deferred:[...new Set([...state.deferred,missionId])]};
}
export function resumeMission(state,missionId){return {...state,deferred:state.deferred.filter(id=>id!==missionId)};}
export function improve(state,command){
  if(!command.operation||typeof command.operation!=='string')throw Error('Identificação da operação ausente.');
  if(state.operations.includes(command.operation))return {state,awards:[],duplicate:true};
  const mission=missions(state,{includeDeferred:true,limit:Infinity}).find(m=>m.id===command.missionId);
  if(!mission)throw Error('Esta melhoria já foi concluída ou não está mais disponível.');
  const next=structuredClone(state),p=next.products.find(p=>p.id===mission.productId),before=structuredClone(p);
  let evidence;
  if(decisionModels[mission.type]){
    const decision=validateDecision(mission,command);
    next.decisions??=[];next.decisions.push({missionId:mission.id,entityId:mission.entityId,type:mission.type,sourceEventId:mission.sourceEventId,period:mission.period,...decision,at:command.at??new Date().toISOString()});
    evidence=`${mission.entityName}: ${decision.label}. ${decision.note}`;
  }else if(mission.type==='foto'||mission.type==='detalhe'){
    const asset=command.photo;
    const field=mission.type==='foto'?'cover':'detail';
    if(typeof asset!=='string'||!(['/assets/conjunto.svg','/assets/detalhe.svg'].includes(asset)||/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(asset))||asset.length>2_800_000||asset===p[field])throw Error('Escolha uma foto válida antes de salvar.');
    p[field]=asset;evidence=mission.type==='foto'?'A primeira foto foi adicionada à peça.':'A primeira foto de detalhe mostra o acabamento da peça.';
  }else if(mission.type==='contagem'||mission.type==='revisao'){
    if(!Number.isSafeInteger(command.physical)||command.physical<0||command.physical>9999)throw Error('Informe uma quantidade inteira entre 0 e 9999.');
    const reason=typeof command.reason==='string'?command.reason.trim():'';
    if(reason.length<3||reason.length>240)throw Error('Informe como você conferiu essa quantidade.');
    p.physical=command.physical;evidence=`${mission.type==='revisao'?'Disponibilidade revisada':'Primeira contagem'}: ${p.physical} unidades, tamanho ${p.size}. ${reason}`;
    if(mission.type==='revisao')p.stockReview.resolvedAt=command.at??new Date().toISOString();
  }else if(mission.type==='descricao'){
    const description=typeof command.description==='string'?command.description.trim():'';
    if(description.length<20||description.length>800)throw Error('Informe de 20 a 800 caracteres sobre a peça.');
    p.description=description;evidence='As informações de caimento e acabamento foram adicionadas à peça.';
  }else{
    const material=typeof command.material==='string'?command.material.trim():'';
    if(material.length<8||material.length>160||material.replace(/\s/g,'')===before.material.replace(/\s/g,''))throw Error('Informe a composição que consta na etiqueta, com pelo menos 8 caracteres.');
    p.material=material;evidence='A composição do tecido foi informada na peça.';
  }
  const award={id:mission.id,title:mission.title,category:mission.category,family:mission.family,context:mission.context,xp:mission.xp,at:command.at??new Date().toISOString(),evidence,ruleVersion:mission.ruleVersion,occurrence:mission.occurrence,type:mission.type,productId:p?.id,productName:p?.name??mission.entityName,entityId:mission.entityId??p?.id,sourceEventId:mission.sourceEventId,opportunityType:mission.opportunityType,identifiedAt:mission.identifiedAt,period:mission.period,objectiveKind:mission.objectiveKind};
  if(mission.sourceEventId){next.observations??=[];next.observations.push({id:`observation:${mission.id}`,missionId:mission.id,storeId:state.storeId,productId:p?.id,entityId:award.entityId,entityName:award.productName,type:mission.type,changedAt:award.at,observationStartedAt:award.at,before:mission.period?{start:mission.period.start,end:mission.period.end,visitors:mission.period.people,contacts:mission.period.contacts,provenance:evidenceProvenance(state.storeId,award.entityId,mission.type,mission.sourceEventId)}:null,after:null,simulated:true});}
  next.history.push(award);next.operations.push(command.operation);next.deferred=next.deferred.filter(id=>id!==mission.id);
  return {state:next,awards:[award],duplicate:false};
}
