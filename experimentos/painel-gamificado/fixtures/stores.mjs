import {improve,missions} from '../domain/engine.mjs';
import {withManyMissions} from './many-missions.mjs';
import {withJourneys} from '../domain/journeys.mjs';
import {withContinuous,continuousScenarios} from './continuous.mjs';
import {withFollowup,followupScenarios} from './followup.mjs';
import {withCommercial,commercialScenarios} from './commercial.mjs';
export const scenarios=[{id:'varias-missoes',label:'Várias missões para explorar'},{id:'oportunidades',label:'Loja com oportunidades'},{id:'nova',label:'Loja nova'},{id:'poucos-dados',label:'Poucos dados de desempenho'},{id:'em-dia',label:'Loja em dia'},{id:'novas-missoes',label:'Detalhes e revisão de estoque'},{id:'marco-5',label:'Um passo para o nível 5'},{id:'marco-10',label:'Um passo para o nível 10'},{id:'impacto',label:'Impacto e períodos de observação'},...continuousScenarios,...followupScenarios,...commercialScenarios];
export function createStore(scenario='nova'){
  const counted=scenario==='em-dia',complete=scenario==='em-dia';
  const history=scenario==='nova'?[]:[{id:'atelier-04:inicio:v1',title:'Primeira apresentação da loja preparada',category:'Vitrine',xp:60,at:'2026-10-10T15:00:00.000Z',evidence:'Nome, categoria e foto de capa conferidos.'}];
  let state={schema:2,storeId:'atelier-04',scenario,name:'Ateliê 04',products:[
    {id:'linho',name:'Conjunto Linho',category:'Roupas',description:'Conjunto de duas peças, com caimento leve e corte reto.',material:'55% linho, 45% viscose',cover:complete?'/assets/conjunto.svg':null,detail:complete?'/assets/detalhe.svg':null,size:'M',physical:4,min:1},
    {id:'camisa',name:'Camisa Essencial',category:'Roupas',description:'Camisa de manga longa com modelagem ampla.',material:'100% algodão',cover:'/assets/camisa.svg',detail:'/assets/detalhe.svg',size:'40',physical:counted?3:null,min:1},
    {id:'natural',name:'Conjunto Natural',category:'Roupas',description:'Conjunto com cintura alta e fechamento lateral.',material:complete?'70% viscose, 30% linho':'',cover:'/assets/conjunto.svg',detail:'/assets/detalhe.svg',size:'P',physical:2,min:1}
  ],analytics:scenario==='poucos-dados'||scenario==='nova'?null:{productId:'natural',people:76,contacts:2,days:14,simulated:true},storeSummary:['oportunidades','em-dia','impacto'].includes(scenario)?{days:7,visitors:324,productVisits:112,whatsappPeople:41,simulated:true}:null,history,deferred:[],operations:[]};
  if(scenario==='novas-missoes'){
    state.analytics=null;state.products[0].cover='/assets/conjunto.svg';state.products[0].needsDetail=true;
    state.products[1].physical=3;state.products[1].stockReview={id:'conferencia-arara-01',reason:'A última conferência apontou uma diferença entre a arara e a contagem registrada.'};
    state.products[2].needsDescription=true;state.products[2].description='';
  }
  if(scenario==='marco-5'||scenario==='marco-10'){
    state.history=[];state.analytics=null;state.products[1].physical=3;
    const count=scenario==='marco-5'?8:33;
    for(let i=0;i<count;i++){
      const product={...state.products[1],id:`arquivo-${i+1}`,name:`Peça do acervo ${String(i+1).padStart(2,'0')}`,physical:null};
      state.products.push(product);
      const mission=missions(state,{includeDeferred:true}).find(m=>m.productId===product.id);
      state=improve(state,{operation:`fixture-count-${i}`,missionId:mission.id,physical:2+(i%4),reason:'Conferência registrada no cenário fictício.',at:new Date(Date.UTC(2026,8,1+i)).toISOString()}).state;
    }
  }
  if(scenario==='impacto'){
    state.analytics=null;state.products[1].physical=3;
    const mission=missions(state)[0];state=improve(state,{operation:'fixture-photo',missionId:mission.id,photo:'/assets/conjunto.svg',at:'2026-09-12T12:00:00Z'}).state;
    const before={start:'2026-08-28T00:00:00Z',end:'2026-09-11T00:00:00Z',visitors:100,contacts:3};
    const after={start:'2026-09-13T00:00:00Z',end:'2026-09-27T00:00:00Z',visitors:100,contacts:7};
    const extra=[];
    for(const productId of ['camisa','natural']){
      const product=state.products.find(p=>p.id===productId);product.needsDescription=true;product.description='';
      const objective=missions(state).find(m=>m.productId===productId);
      state=improve(state,{operation:`fixture-description-${productId}`,missionId:objective.id,description:'Modelagem reta e acabamento com costuras reforçadas.',at:'2026-09-12T12:00:00Z'}).state;
      extra.push(objective.id);
    }
    state.observations=[{id:'impact-ready',missionId:mission.id,productId:'linho',changedAt:'2026-09-12T12:00:00Z',before,after,simulated:true},{id:'impact-small',missionId:extra[0],productId:'camisa',changedAt:'2026-09-12T12:00:00Z',before:{...before,visitors:32,contacts:1},after:{...after,visitors:28,contacts:2},simulated:true},{id:'impact-waiting',missionId:extra[1],productId:'natural',changedAt:'2026-09-12T12:00:00Z',before,after:null,simulated:true}];
  }
  return withJourneys(commercialScenarios.some(s=>s.id===scenario)?withCommercial(state):followupScenarios.some(s=>s.id===scenario)?withFollowup(state):continuousScenarios.some(s=>s.id===scenario)?withContinuous(state):scenario==='varias-missoes'?withManyMissions(state):state);
}
