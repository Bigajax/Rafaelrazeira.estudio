export const scenarios=[{id:'oportunidades',label:'Loja com oportunidades'},{id:'nova',label:'Loja nova'},{id:'poucos-dados',label:'Poucos dados de desempenho'},{id:'em-dia',label:'Loja em dia'}];
export function createStore(scenario='oportunidades'){
  const counted=scenario==='em-dia',complete=scenario==='em-dia';
  const history=scenario==='nova'?[]:[{id:'atelier-04:inicio:v1',title:'Primeira apresentação da loja preparada',category:'Vitrine',xp:60,at:'2026-10-10T15:00:00.000Z',evidence:'Nome, categoria e foto de capa conferidos.'}];
  return {schema:1,storeId:'atelier-04',scenario,name:'Ateliê 04',products:[
    {id:'linho',name:'Conjunto Linho',category:'Roupas',description:'Conjunto de duas peças, com caimento leve e corte reto.',material:'55% linho, 45% viscose',cover:'/assets/conjunto.svg',detail:complete?'/assets/detalhe.svg':null,size:'M',physical:4,min:1},
    {id:'camisa',name:'Camisa Essencial',category:'Roupas',description:'Camisa de manga longa com modelagem ampla.',material:'100% algodão',cover:'/assets/camisa.svg',detail:'/assets/detalhe.svg',size:'40',physical:counted?3:null,min:1},
    {id:'natural',name:'Conjunto Natural',category:'Roupas',description:'Conjunto com cintura alta e fechamento lateral.',material:complete?'70% viscose, 30% linho':'',cover:'/assets/conjunto.svg',detail:'/assets/detalhe.svg',size:'P',physical:2,min:1}
  ],analytics:scenario==='poucos-dados'||scenario==='nova'?null:{productId:'natural',people:76,contacts:2,days:14,simulated:true},history,deferred:[],operations:[]};
}
