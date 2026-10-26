export const STORAGE_KEY='experimento-evolucao-atelier04-v1';
export function progress(total){
  if(!Number.isSafeInteger(total)||total<0)throw Error('Experiência inválida.');
  let level=1,within=total,needed=100;
  while(within>=needed){within-=needed;level++;needed=100+(level-1)*50;}
  return {level,total,within,needed,remaining:needed-within,fraction:within/needed};
}
export const totalXP=state=>state.history.reduce((n,h)=>n+h.xp,0);
function id(state,type,p){return `${state.storeId}:${type}:${p.id}:${type==='contagem'?p.size:'apresentacao'}:v1`;}
function objectives(state){
  const list=[];
  for(const p of state.products){
    if(!p.detail)list.push({id:id(state,'foto',p),type:'foto',family:'organizacao',category:'Vitrine',priority:1,productId:p.id,title:'Ajude a cliente a ver os detalhes',reason:`O ${p.name} tem a foto de capa. Uma segunda imagem pode mostrar o tecido e o acabamento.`,benefit:'Mais informação para escolher com segurança.',action:'Adicionar foto',xp:60,ruleVersion:1,occurrence:'primeira-foto-detalhe'});
    if(p.physical===null)list.push({id:id(state,'contagem',p),type:'contagem',family:'organizacao',category:'Estoque',priority:2,productId:p.id,title:'Saiba o que pode vender',reason:`A ${p.name}, tamanho ${p.size}, ainda está sem contagem. Confira quantas unidades você tem na loja.`,benefit:'Disponibilidade conferida para o atendimento.',action:'Conferir estoque',xp:80,ruleVersion:1,occurrence:'primeira-contagem'});
    const a=state.analytics;
    if(!p.material.trim()&&a?.productId===p.id&&a.people>=50)list.push({id:id(state,'material',p),type:'material',family:'evolucao',category:'Conversão',priority:3,productId:p.id,title:'Tire uma dúvida de quem está olhando',reason:`${a.people} pessoas viram o ${p.name} nos últimos ${a.days} dias. A composição do tecido ainda não aparece na peça.`,benefit:'Informe a composição para ajudar na decisão. Depois, acompanhe os contatos.',action:'Informar composição',xp:100,ruleVersion:1,occurrence:'primeira-composicao',context:a});
  }
  return list.sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
}
export function missions(state,{includeDeferred=false}={}){
  const done=new Set(state.history.map(h=>h.id)),deferred=new Set(state.deferred);
  const seen=new Set();
  return objectives(state).filter(m=>{if(done.has(m.id)||(!includeDeferred&&deferred.has(m.id))||seen.has(m.productId))return false;seen.add(m.productId);return true;}).slice(0,3);
}
export function deferMission(state,missionId){
  if(!missions(state,{includeDeferred:true}).some(m=>m.id===missionId))throw Error('Esta melhoria não está mais disponível.');
  return {...state,deferred:[...new Set([...state.deferred,missionId])]};
}
export function resumeMission(state,missionId){return {...state,deferred:state.deferred.filter(id=>id!==missionId)};}
export function improve(state,command){
  if(!command.operation||typeof command.operation!=='string')throw Error('Identificação da operação ausente.');
  if(state.operations.includes(command.operation))return {state,awards:[],duplicate:true};
  const mission=missions(state,{includeDeferred:true}).find(m=>m.id===command.missionId);
  if(!mission)throw Error('Esta melhoria já foi concluída ou não está mais disponível.');
  const next=structuredClone(state),p=next.products.find(p=>p.id===mission.productId),before=structuredClone(p);
  let evidence;
  if(mission.type==='foto'){
    const asset=command.detail;
    if(typeof asset!=='string'||!(asset==='/assets/detalhe.svg'||/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(asset))||asset.length>5_600_000||asset===p.cover)throw Error('Escolha uma foto de detalhe válida antes de salvar.');
    p.detail=asset;evidence='Uma foto de detalhe foi adicionada à peça.';
  }else if(mission.type==='contagem'){
    if(!Number.isSafeInteger(command.physical)||command.physical<0||command.physical>9999)throw Error('Informe uma quantidade inteira entre 0 e 9999.');
    const reason=typeof command.reason==='string'?command.reason.trim():'';
    if(reason.length<3||reason.length>240)throw Error('Informe como você conferiu essa quantidade.');
    p.physical=command.physical;evidence=`Primeira contagem: ${p.physical} unidades, tamanho ${p.size}. ${reason}`;
  }else{
    const material=typeof command.material==='string'?command.material.trim():'';
    if(material.length<8||material.length>160||material.replace(/\s/g,'')===before.material.replace(/\s/g,''))throw Error('Informe a composição que consta na etiqueta, com pelo menos 8 caracteres.');
    p.material=material;evidence='A composição do tecido foi informada na peça.';
  }
  const award={id:mission.id,title:mission.title,category:mission.category,xp:mission.xp,at:command.at??new Date().toISOString(),evidence,ruleVersion:mission.ruleVersion,occurrence:mission.occurrence};
  next.history.push(award);next.operations.push(command.operation);next.deferred=next.deferred.filter(id=>id!==mission.id);
  return {state:next,awards:[award],duplicate:false};
}
