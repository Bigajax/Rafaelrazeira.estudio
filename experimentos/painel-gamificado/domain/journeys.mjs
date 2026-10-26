import {missions,MISSION_TYPES} from './engine.mjs';

export const missionFamilies=['Organizar','Cuidar','Evoluir'];
const types=new Set(MISSION_TYPES);
export const missionType=objective=>objective.type??objective.id.split(':')[1];
export const missionArea=objective=>['contagem','revisao','esgotado'].includes(missionType(objective))?'Estoque':missionType(objective)==='campanha'?'Divulgação':'Vitrine';
export function journeyKind(objective){
  if(['buscas','campanha','esgotado'].includes(missionType(objective)))return missionType(objective);
  if(objective.family==='evolucao'||missionType(objective)==='material')return 'oportunidades';
  if(missionArea(objective)==='Estoque')return 'disponibilidade';
  return ['foto','detalhe'].includes(missionType(objective))?'fotos':'apresentacao';
}
const definitions={
  buscas:{family:'Evoluir',title:'Entenda o que não foi encontrado.',reason:'Decida como tratar buscas registradas sem resultado. Não é necessário cadastrar produtos que a loja não vende.',icon:'missions'},
  campanha:{family:'Evoluir',title:'Aprenda com sua divulgação.',reason:'Observe o período concluído e registre uma conclusão. Clique no WhatsApp não confirma uma venda.',icon:'growth'},
  esgotado:{family:'Cuidar',title:'Reveja a procura sem disponibilidade.',reason:'Uma decisão pode ser manter a indisponibilidade ou orientar alternativas. Não é obrigatório repor.',icon:'box'},
  fotos:{family:'Organizar',title:'Mostre suas peças por inteiro.',reason:'Fotos de capa e de detalhe ajudam a conhecer a peça antes de chamar a loja.',icon:'photo'},
  apresentacao:{family:'Organizar',title:'Conte o que a foto não mostra.',reason:'Caimento e acabamento tornam a apresentação mais clara para quem está escolhendo.',icon:'missions'},
  disponibilidade:{family:'Cuidar',title:'Atenda com a disponibilidade conferida.',reason:'Confira quantidades e divergências para saber o que pode separar para sua cliente.',icon:'box'},
  oportunidades:{family:'Evoluir',title:'Dê atenção às peças procuradas.',reason:'A procura observada ajuda a escolher o próximo cuidado. A melhoria será acompanhada separadamente dos seus resultados.',icon:'growth'}
};
function snapshot(objective,state){
  const product=state.products.find(p=>p.id===(objective.productId??objective.id.split(':')[2]));
  return {...objective,type:missionType(objective),category:missionArea(objective),productId:product?.id??objective.productId,productName:objective.productName??product?.name??objective.entityName??'Peça da vitrine',size:product?.size};
}

// Freeze membership on the server. New objectives get a new journey rather
// than increasing a denominator after the merchant has made progress.
export function withJourneys(state){
  const groups=[...(state.journeys??[])],known=new Set(groups.flatMap(g=>g.objectives.map(m=>m.id)));
  const candidates=[...missions(state,{includeDeferred:true,limit:Infinity}),...state.history.filter(h=>types.has(missionType(h)))];
  const additions=new Map();
  for(const objective of candidates){
    if(known.has(objective.id))continue;known.add(objective.id);
    const key=journeyKind(objective);if(!additions.has(key))additions.set(key,[]);
    additions.get(key).push(snapshot(objective,state));
  }
  for(const [kind,objectives] of additions){
    const sequence=groups.filter(g=>g.kind===kind).length+1;
    groups.push({id:`${state.storeId}:grupo:${kind}:${sequence}:v1`,kind,sequence,objectives});
  }
  return {...state,journeys:groups};
}

export function journeyBoard(original){
  const state=withJourneys(original),live=new Map(missions(state,{includeDeferred:true,limit:Infinity}).map(m=>[m.id,m]));
  const awarded=new Map(state.history.map(h=>[h.id,h])),deferred=new Set(state.deferred);
  return state.journeys.map(group=>{
    const items=group.objectives.map(objective=>{
      const award=awarded.get(objective.id),mission=live.get(objective.id);
      const status=award?'concluidas':mission?(deferred.has(objective.id)?'adiadas':'disponiveis'):'indisponiveis';
      return {...objective,...mission,category:missionArea(objective),status,award};
    });
    const completed=items.filter(m=>m.status==='concluidas'),pending=items.filter(m=>['disponiveis','adiadas'].includes(m.status));
    const finalAward=state.history.filter(h=>group.objectives.some(m=>m.id===h.id)).at(-1);
    return {...group,...definitions[group.kind],items,total:items.length,completed:completed.length,
      earnedXP:completed.reduce((sum,m)=>sum+m.award.xp,0),complete:completed.length===items.length,
      completedAt:completed.length===items.length?finalAward?.at:null,finalAwardId:completed.length===items.length?finalAward?.id:null,
      available:items.filter(m=>m.status==='disponiveis').length,deferred:items.filter(m=>m.status==='adiadas').length,
      unavailable:items.filter(m=>m.status==='indisponiveis').length,
      priority:pending.length?Math.min(...pending.map(m=>m.priority??5)):9};
  }).sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
}

export function groupForMission(state,id){return journeyBoard(state).find(g=>g.objectives.some(m=>m.id===id));}
export const objectiveLabel=type=>({foto:'Adicionar foto de capa',detalhe:'Adicionar foto de detalhe',descricao:'Informar caimento e acabamento',contagem:'Conferir disponibilidade',revisao:'Resolver divergência',material:'Informar composição',esgotado:'Revisar a procura e registrar uma decisão',buscas:'Analisar o termo e registrar uma decisão',campanha:'Consultar os resultados e registrar uma conclusão'})[type];
