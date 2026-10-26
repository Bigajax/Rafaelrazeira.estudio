import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../fixtures/stores.mjs';
import {missions,improve,totalXP} from '../domain/engine.mjs';
import {weeklyCycle} from '../domain/cycles.mjs';
import {retrospective} from '../domain/achievements.mjs';
import {isDecision} from '../domain/recognition.mjs';
import {requestContext,descriptionFromFacts} from '../intelligence/context.mjs';
import {simulatedProvider} from '../intelligence/simulated-provider.mjs';
import {validateAnalysis} from '../intelligence/validate.mjs';
import {createIntelligenceService} from '../intelligence/service.mjs';
import {openRepository,tokenHash} from '../server/repository.mjs';
const payload=(s,type='esgotado',extra={})=>({generation:s.generation,missionId:missions(s,{limit:Infinity,includeDeferred:true}).find(m=>m.type===type).id,intent:'explain',...extra});
function fixture(scenario='intelligence',token='intelligence-a'){
  const repo=openRepository(':memory:');repo.create(token);const hash=tokenHash(token),state=repo.mutate(hash,'reset',{generation:1,scenario}).state;
  return {repo,hash,state};
}

test('decisão reconhece análise; melhora real, produto atualizado e denominador semanal são distintos',()=>{
  let s=createStore('intelligence');const now=Date.parse('2026-10-13T18:00:00Z'),m=missions(s)[0];
  assert.ok(isDecision(m));s=improve(s,{operation:'recognition-decision',missionId:m.id,decision:'manter',note:'Vou manter indisponível e orientar quem procura a peça.',at:'2026-10-13T12:00:00Z'}).state;
  assert.equal(totalXP(s),80);assert.equal(s.products[0].physical,0);assert.deepEqual(retrospective(s),{records:1,decisions:1,improvements:0,products:0,stockReviews:0});
  const c=weeklyCycle(s,now);assert.equal(c.opportunities,5);assert.equal(c.registered,1);assert.equal(c.decisions,1);assert.equal(c.improvements,0);
  const description=missions(s,{limit:Infinity}).find(m=>m.type==='descricao');s=improve(s,{operation:'recognition-description',missionId:description.id,description:'Modelagem reta e acabamento com costuras reforçadas.',at:'2026-10-13T12:30:00Z'}).state;
  assert.equal(weeklyCycle(s,now).registered,2);assert.equal(weeklyCycle(s,now).improvements,1);assert.equal(retrospective(s).products,1);
  // A structure improvement without an identified opportunity must not enter this numerator.
  const legacy=createStore();const photo=missions(legacy)[0],saved=improve(legacy,{operation:'legacy-photo',missionId:photo.id,photo:'/assets/conjunto.svg',at:'2026-10-13T12:30:00Z'}).state;
  assert.equal(weeklyCycle(saved,now).opportunities,0);assert.equal(weeklyCycle(saved,now).registered,0);
});

test('contexto mínimo da missão vem do estado; rejeita dados adulterados, pessoais e missão ausente',()=>{
  const s=createStore('intelligence'),p=payload(s),input=requestContext(s,p),json=JSON.stringify(input);
  assert.equal(input.context.period.people,148);assert.equal(input.context.product.physical,0);assert.equal(input.context.alternatives.length,1);assert.ok(!input.context.alternatives.some(p=>p.name==='Camisa Essencial'));
  for(const key of ['history','operations','sessionId','cover','deferred'])assert.ok(!json.includes(`"${key}"`));
  for(const bad of [{storeId:'another'},{xp:1000},{period:{people:9999}},{missionId:'absent'},{intent:'change-stock'},{facts:{brand:'Inventada'}},{facts:{cut:'Cliente teste@example.com'}},{intent:'question',question:'Telefone (44) 99899-0011'},{intent:'question',question:'CPF 123.456.789-00'}])assert.throws(()=>requestContext(s,{...p,...bad}));
  s.products[0].material='Contato consumidor@example.test';assert.throws(()=>requestContext(s,p));
});

test('adaptador simulado explica os modelos sem modificar XP ou executar opções',async()=>{
  const s=createStore('intelligence'),before=structuredClone(s);
  for(const type of ['esgotado','buscas','campanha','descricao','revisao']){
    const input=requestContext(s,payload(s,type)),result=validateAnalysis(await simulatedProvider.respond(input),input.context,input.intent);
    assert.equal(result.observed,input.context.observed);assert.ok(result.unknown.length);assert.equal(result.description,null);
  }
  assert.deepEqual(s,before);assert.equal(totalXP(s),0);
});

test('descrição só contém características informadas e composição cadastrada; não salva a peça',async()=>{
  const s=createStore('intelligence'),input=requestContext(s,payload(s,'descricao',{intent:'execute',facts:{cut:'reta, com cintura alta',finish:'com costuras reforçadas',colour:'bege'}}));
  const response=await simulatedProvider.respond(input),checked=validateAnalysis(response,input.context,'execute');
  assert.equal(checked.description,descriptionFromFacts(input.context));assert.ok(checked.description.includes('Composição: 100% algodão.'));assert.ok(checked.description.includes('Cor bege.'));assert.ok(!checked.description.includes('viscose'));
  assert.equal(s.products[2].description,'');assert.equal(totalXP(s),0);
  const noFacts=requestContext(s,payload(s,'descricao',{intent:'execute'}));assert.equal((await simulatedProvider.respond(noFacts)).description,null);
  assert.throws(()=>validateAnalysis({...response,description:'Produto premium de seda com ótimo caimento.'},input.context,'execute'));
});

test('schema rejeita comando, evidência alterada, projeção, opção indevida e resposta incompleta',async()=>{
  const s=createStore('intelligence'),input=requestContext(s,payload(s)),valid=await simulatedProvider.respond(input);
  for(const mutate of [r=>{r.xp=1000;},r=>{r.missionId='another';},r=>{r.observed='9999 visitantes';},r=>{r.options[0].id='buy-now';},r=>{r.why='As vendas aumentarão 200%';},r=>{r.execution='Resultado garantido.';},r=>{r.unknown=[];},r=>{r.description='Tecido inventado';}]){const r=structuredClone(valid);mutate(r);assert.throws(()=>validateAnalysis(r,input.context,'explain'));}
});

test('pergunta complementar fica no contexto e não converte clique em venda',async()=>{
  const s=createStore('intelligence');for(const question of ['Preciso repor este produto?','Estes cliques confirmam uma venda?','Quero ganhar XP sem salvar.']){
    const input=requestContext(s,payload(s,'esgotado',{intent:'question',question})),r=validateAnalysis(await simulatedProvider.respond(input),input.context,'question');assert.ok(r.followup);assert.equal(r.description,null);
  }assert.equal(totalXP(s),0);assert.equal(s.decisions.length,0);
});

test('serviço usa cache por sessão e contexto; consulta e auditoria não alteram estado comercial',async()=>{
  const {repo,hash,state}=fixture();try{
    const service=createIntelligenceService(),p=payload(state),before=repo.read(hash);const first=await service(repo,hash,p);assert.equal(first.cached,false);first.analysis.why='Mutação no objeto do consumidor';
    const repeat=await service(repo,hash,p);assert.equal(repeat.cached,true);assert.notEqual(repeat.analysis.why,first.analysis.why);assert.deepEqual(repo.read(hash),before);
    repo.create('intelligence-b');const hashB=tokenHash('intelligence-b'),b=repo.mutate(hashB,'reset',{generation:1,scenario:'intelligence'}).state;assert.equal((await service(repo,hashB,payload(b))).cached,false);assert.equal(repo.intelligenceUsage(hashB).length,1);
    assert.ok(repo.intelligenceUsage(hash).every(log=>log.cost_cents===0));assert.ok(!JSON.stringify(repo.intelligenceUsage(hash)).includes('pergunta'));
    const reset=repo.mutate(hash,'reset',{generation:state.generation,scenario:'intelligence'}).state;assert.equal((await service(repo,hash,payload(reset))).cached,false);await assert.rejects(()=>service(repo,hash,p),e=>e.status===409);
  }finally{repo.close();}
});

test('resposta inválida ou indisponível permite retry sem conceder XP ou perder estado',async()=>{
  const {repo,hash,state}=fixture();try{
    const service=createIntelligenceService(),p=payload(state),before=repo.read(hash);
    for(const simulation of ['invalid','unavailable'])await assert.rejects(()=>service(repo,hash,{...p,simulation}),e=>e.status===503);
    assert.deepEqual(repo.read(hash),before);assert.ok((await service(repo,hash,p)).analysis);assert.deepEqual(repo.intelligenceUsage(hash).map(v=>v.outcome),['invalid','unavailable','success']);
  }finally{repo.close();}
});

test('limite é compartilhado entre consultas concorrentes da sessão, inclui cache e expira',async()=>{
  const {repo,hash,state}=fixture();try{
    let now=Date.now();const service=createIntelligenceService({clock:()=>now}),p=payload(state);
    const results=await Promise.allSettled(Array.from({length:32},()=>service(repo,hash,p)));assert.equal(results.filter(r=>r.status==='fulfilled').length,30);assert.ok(results.filter(r=>r.status==='rejected').every(r=>r.reason.status===429));
    assert.equal(repo.intelligenceUsage(hash).length,30);assert.equal(totalXP(repo.read(hash)),0);now+=61000;assert.ok((await service(repo,hash,p)).analysis);
  }finally{repo.close();}
});

test('resposta atrasada é descartada quando a missão ou geração muda',async()=>{
  const {repo,hash,state}=fixture();try{
    let release;const provider={respond:input=>new Promise(resolve=>{release=async()=>resolve(await simulatedProvider.respond(input));})},service=createIntelligenceService({provider}),p=payload(state);
    const pending=service(repo,hash,p);repo.mutate(hash,'reset',{generation:state.generation,scenario:'continua-em-dia'});await release();await assert.rejects(()=>pending,e=>e.status===409);assert.equal(repo.intelligenceUsage(hash)[0].outcome,'stale');assert.equal(totalXP(repo.read(hash)),0);
  }finally{repo.close();}
});

test('timeout registra falha e provedor não pode adulterar o contexto de validação',async()=>{
  const {repo,hash,state}=fixture();try{
    const p=payload(state),timeout=createIntelligenceService({provider:{respond:()=>new Promise(()=>{})},timeoutMs:10});await assert.rejects(()=>timeout(repo,hash,p),e=>e.status===503);assert.equal(repo.intelligenceUsage(hash)[0].outcome,'timeout');
    const altered=createIntelligenceService({provider:{respond:input=>{input.context.observed='Dado inventado';return simulatedProvider.respond(input);}}});await assert.rejects(()=>altered(repo,hash,p),e=>e.status===503);assert.equal(totalXP(repo.read(hash)),0);
  }finally{repo.close();}
});
