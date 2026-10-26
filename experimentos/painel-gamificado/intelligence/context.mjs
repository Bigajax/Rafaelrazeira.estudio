import {missions} from '../domain/engine.mjs';
import {decisionModels} from '../domain/opportunities.mjs';
export const intents=['explain','decide','execute','question'];
const factKeys=['cut','finish','colour','use'];
export function containsPersonalData(text){
  return /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text)||/(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*\d{4,5}[\s.-]*\d{4}\b/.test(text)||/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(text);
}
export function requestContext(state,payload){
  const allowed=['generation','missionId','intent','question','facts','simulation'];
  if(!payload||Object.keys(payload).some(k=>!allowed.includes(k))||!intents.includes(payload.intent))throw Error('Escolha uma ajuda disponível nesta missão.');
  const mission=missions(state,{includeDeferred:true,limit:Infinity}).find(m=>m.id===payload.missionId);
  if(!mission)throw Error('Este cuidado mudou ou já foi registrado. Volte à lista de missões.');
  if(payload.question!==undefined&&typeof payload.question!=='string')throw Error('Informe uma pergunta em texto.');
  const question=typeof payload.question==='string'?payload.question.trim():'';
  if(question.length>240||(payload.intent==='question'&&question.length<5)||containsPersonalData(question))throw Error('Use uma pergunta de 5 a 240 caracteres sobre este cuidado, sem dados pessoais.');
  const facts=payload.facts??{};
  if(!facts||typeof facts!=='object'||Array.isArray(facts)||Object.keys(facts).some(k=>!factKeys.includes(k)))throw Error('Informe apenas características da peça.');
  const cleaned={};
  for(const key of factKeys){if(facts[key]===undefined)continue;if(typeof facts[key]!=='string'||facts[key].trim().length>160||containsPersonalData(facts[key]))throw Error('Use características curtas da peça, sem dados pessoais.');cleaned[key]=facts[key].trim();}
  if(Object.values(cleaned).some(Boolean)&&(mission.type!=='descricao'||(cleaned.cut??'').length<3))throw Error('Informe a modelagem da peça antes de preparar a descrição.');
  const simulation=payload.simulation??'normal';
  if(!['normal','unavailable','invalid','slow'].includes(simulation))throw Error('Simulação desconhecida.');
  const p=state.products.find(p=>p.id===mission.productId);
  const context={missionId:mission.id,type:mission.type,title:mission.title,action:mission.action,
    entityName:mission.entityName??p?.name,observed:mission.evidence??mission.reason,
    period:mission.period?{start:mission.period.start,end:mission.period.end,people:mission.period.people,contacts:mission.period.contacts}:null,
    product:p?{name:p.name,size:p.size,material:p.material,physical:p.physical}:null,
    choices:decisionModels[mission.type]?.choices??{},facts:cleaned,
    alternatives:mission.type==='esgotado'?state.products.filter(other=>other.id!==p.id&&other.published!==false&&other.category===p.category&&other.physical>0&&(!other.stockReview||other.stockReview.resolvedAt)).slice(0,3).map(other=>({name:other.name,size:other.size})):[]};
  if((descriptionFromFacts(context)?.length??0)>800)throw Error('Use características mais curtas para preparar um texto de até 800 caracteres.');
  const sourceTexts=[context.entityName,context.observed,context.product?.name,context.product?.size,context.product?.material,...context.alternatives.flatMap(p=>[p.name,p.size])];
  if(sourceTexts.some(value=>typeof value==='string'&&containsPersonalData(value)))throw Error('Revise o cadastro deste cuidado antes de consultar: use informações da peça sem dados pessoais.');
  return {context,intent:payload.intent,question,simulation};
}
export function descriptionFromFacts(context){
  if(context.type!=='descricao'||!context.facts.cut)return null;
  const {cut,finish,colour,use}=context.facts,material=context.product?.material;
  return [`${context.product.name}.`,`Modelagem ${cut}.`,finish?`Acabamento ${finish}.`:null,colour?`Cor ${colour}.`:null,use?`Indicado para ${use}.`:null,material?`Composição: ${material}.`:null].filter(Boolean).join(' ');
}
