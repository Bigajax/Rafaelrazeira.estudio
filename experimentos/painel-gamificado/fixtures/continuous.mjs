import {improve,missions} from '../domain/engine.mjs';
import {withJourneys} from '../domain/journeys.mjs';
export const continuousScenarios=[
  {id:'intelligence',label:'1.3 · Intelligence para explorar'},
  {id:'continua',label:'1.3 · Loja organizada, novas oportunidades'},
  {id:'procura-esgotado',label:'1.3 · Procurado e esgotado'},
  {id:'buscas-sem-resultados',label:'1.3 · Buscas sem resultados'},
  {id:'campanha-concluida',label:'1.3 · Campanha para analisar'},
  {id:'apresentacao-procurada',label:'1.3 · Apresentação com procura'},
  {id:'divergencia-recorrente',label:'1.3 · Outra divergência legítima'},
  {id:'acompanhamento-continuo',label:'1.3 · Melhoria aguardando dados'},
  {id:'continua-em-dia',label:'1.3 · Loja em dia, sem novas tarefas'},
  {id:'continua-poucos-dados',label:'1.3 · Dados insuficientes'}
];
const period={start:'2026-09-28T00:00:00Z',end:'2026-10-12T00:00:00Z',people:148,contacts:9};
function event(kind,entityId,extra={}){return {id:`${kind}-${entityId}-01`,sourceEventId:`fonte-${kind}-${entityId}-01`,storeId:'atelier-04',kind,entityId,identifiedAt:'2026-10-12T12:00:00Z',period:{...period},...extra};}
export function withContinuous(initial){
  let state={...initial,schema:3,analytics:null,history:[],operations:[],deferred:[],journeys:[],decisions:[],observations:[],
    opportunityData:{complete:true,events:[]},products:initial.products.map(p=>({...p,physical:3,cover:'/assets/conjunto.svg',detail:'/assets/detalhe.svg',material:'100% algodão',description:'Modelagem reta e acabamento com costuras reforçadas.'}))};
  const all=['continua','intelligence'].includes(state.scenario),esgotado=event('esgotado','linho'),buscas=event('buscas','termo-linho',{term:'vestido de linho',matched:false,period:{...period,people:24,contacts:0}}),campanha=event('campanha','primavera',{name:'Primavera / Instagram',tracked:true,period:{...period,people:126,contacts:7}});
  if(all||state.scenario==='procura-esgotado'){state.products[0].physical=0;state.opportunityData.events.push(esgotado);}
  if(all||state.scenario==='buscas-sem-resultados')state.opportunityData.events.push(buscas);
  if(all||state.scenario==='campanha-concluida')state.opportunityData.events.push(campanha);
  if(all||['apresentacao-procurada','acompanhamento-continuo'].includes(state.scenario)){
    state.products[2].needsDescription=true;state.products[2].description='';
    state.opportunityData.events.push(event('produto','natural'));
  }
  if(all||state.scenario==='divergencia-recorrente'){
    state.products[1].stockReview={id:'arara-setembro-01',sourceEventId:'conferencia-setembro-01',storeId:state.storeId,expected:4,observed:3,identifiedAt:'2026-09-14T12:00:00Z',reason:'A conferência apontou diferença entre o registro e as peças na arara.'};
    if(state.scenario==='divergencia-recorrente'){
      state=withJourneys(state);
      const review=missions(state,{limit:Infinity}).find(m=>m.type==='revisao');
      state=improve(state,{operation:'fixture-review-september',missionId:review.id,physical:3,reason:'Conferência presencial da arara.',at:'2026-09-15T12:00:00Z'}).state;
    }
    state.products[1].stockReview={id:'arara-outubro-02',sourceEventId:'conferencia-outubro-02',storeId:state.storeId,expected:3,observed:2,identifiedAt:'2026-10-12T12:00:00Z',reason:'Outra conferência encontrou 2 peças na arara; o registro ainda indica 3. Confira antes de atualizar.'};
  }
  if(state.scenario==='acompanhamento-continuo'){
    const mission=missions(state,{limit:Infinity}).find(m=>m.type==='descricao');
    state=improve(state,{operation:'fixture-observed-description',missionId:mission.id,description:'Modelagem reta, cintura alta e acabamento com costuras reforçadas.',at:'2026-10-12T15:00:00Z'}).state;
  }
  if(state.scenario==='continua-poucos-dados'){
    state.opportunityData.complete=false;
    state.opportunityData.events=[event('campanha','primavera',{name:'Primavera / Instagram',tracked:true,period:{...period,people:12,contacts:1}}),event('buscas','termo-linho',{term:'vestido de linho',matched:false,period:{...period,people:3,contacts:0}})];
  }
  return state;
}
