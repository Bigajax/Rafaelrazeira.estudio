import {improve,missions,deferMission} from '../domain/engine.mjs';

// A fictional catalogue for exploring the mission board. All completed rewards
// use the same validation as a saved improvement; no points are inserted by hand.
export function withManyMissions(initial){
  let state={...initial,products:[],history:[],operations:[],deferred:[],analytics:null,
    storeSummary:{days:7,visitors:324,productVisits:112,whatsappPeople:41,simulated:true}};
  function add(id,name,type,size,cover='/assets/conjunto.svg'){
    const product={id,name,category:'Roupas',size,min:1,
      description:type==='descricao'?'':'Modelagem confortável e acabamento com costuras reforçadas.',
      material:type==='material'?'':'100% algodão',
      cover:type==='foto'?null:cover,detail:type==='detalhe'?null:'/assets/detalhe.svg',
      physical:type==='contagem'?null:4};
    if(type==='detalhe')product.needsDetail=true;
    if(type==='descricao')product.needsDescription=true;
    if(type==='revisao')product.stockReview={id:`conferencia-${id}-01`,reason:'A quantidade na arara precisa ser conferida com o registro da loja.'};
    state.products.push(product);return product;
  }
  // Twelve available missions, including all six useful models.
  add('vestido-aurora','Vestido Aurora','foto','M');
  add('conjunto-linho','Conjunto Linho','foto','P');
  add('saia-plissada','Saia Midi Plissada','foto','G');
  add('camisa-cetim','Camisa de Cetim','detalhe','40','/assets/camisa.svg');
  add('cardigan-canelado','Cardigan Canelado','detalhe','M','/assets/camisa.svg');
  add('vestido-envelope','Vestido Envelope','descricao','M');
  add('blazer-alfaiataria','Blazer de Alfaiataria','descricao','42','/assets/camisa.svg');
  add('jeans-reta','Calça Jeans Reta','contagem','38');
  add('short-linho','Short de Linho','contagem','P');
  add('camiseta-essencial','Camiseta Essencial','revisao','M','/assets/camisa.svg');
  add('calca-social','Calça Social','revisao','42');
  add('conjunto-natural','Conjunto Natural','material','P');

  const deferred=[
    add('macacao-urbano','Macacão Urbano','foto','G'),
    add('saia-evase','Saia Evasê','descricao','M'),
    add('jaqueta-jeans','Jaqueta Jeans','revisao','38','/assets/camisa.svg')
  ];
  const completed=[
    add('vestido-floral','Vestido Floral','foto','P'),
    add('camisa-branca','Camisa Branca','contagem','40','/assets/camisa.svg'),
    add('conjunto-algodao','Conjunto de Algodão','detalhe','M'),
    add('blusa-malha','Blusa de Malha','material','G','/assets/camisa.svg')
  ];
  state.analytics={productId:'blusa-malha',people:96,contacts:5,days:14,simulated:true};
  for(const [index,product] of completed.entries()){
    const mission=missions(state,{includeDeferred:true,limit:Infinity}).find(m=>m.productId===product.id);
    state=improve(state,{operation:`fixture-many-${product.id}`,missionId:mission.id,
      photo:mission.type==='detalhe'?'/assets/detalhe.svg':'/assets/conjunto.svg',
      physical:6,reason:'Conferência do cenário demonstrativo.',material:'95% algodão, 5% elastano',
      at:new Date(Date.UTC(2026,9,7+index,14)).toISOString()}).state;
  }
  state.analytics={productId:'conjunto-natural',people:148,contacts:9,days:14,simulated:true};
  state.productAnalytics={
    'vestido-aurora':{productId:'vestido-aurora',people:172,contacts:8,days:14,simulated:true},
    'calca-social':{productId:'calca-social',people:84,contacts:6,days:14,simulated:true}
  };
  for(const product of deferred){
    const mission=missions(state,{includeDeferred:true,limit:Infinity}).find(m=>m.productId===product.id);
    state=deferMission(state,mission.id);
  }
  return state;
}
