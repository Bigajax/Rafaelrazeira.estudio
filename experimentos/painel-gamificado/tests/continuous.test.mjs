import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../fixtures/stores.mjs';
import {missions,improve,totalXP,deferMission,resumeMission} from '../domain/engine.mjs';
import {identifyOpportunities,opportunityRules} from '../domain/opportunities.mjs';
import {weeklyCycle} from '../domain/cycles.mjs';
import {withJourneys,journeyBoard} from '../domain/journeys.mjs';
import {compareImpact} from '../domain/impact.mjs';
import {openRepository,tokenHash} from '../server/repository.mjs';
const now=Date.parse('2026-10-13T18:00:00Z');
const command=(mission,extra={})=>({operation:`save-${mission.type}`,missionId:mission.id,decision:mission.type==='buscas'?'revisar':'manter',note:'Vou revisar esta situação antes de definir o próximo passo.',at:'2026-10-12T15:00:00Z',...extra});

test('camada determinística identifica cinco modelos sem diagnosticar conversão baixa',()=>{
  const s=createStore('continua'),before=JSON.stringify(s),all=missions(s,{limit:Infinity});
  assert.deepEqual(new Set(all.map(m=>m.type)),new Set(['esgotado','buscas','campanha','revisao','descricao']));
  const detected=identifyOpportunities(s,{now});assert.equal(detected.items.length,4);
  for(const m of detected.items){assert.equal(m.storeId,s.storeId);assert.ok(m.sourceEventId);assert.ok(m.period);assert.ok(m.criterion);assert.ok(m.action);assert.ok(Number.isSafeInteger(m.xp));assert.ok(m.evidence);assert.ok(!m.reason.includes('baixa conversão'));}
  assert.equal(JSON.stringify(s),before);assert.equal(totalXP(s),0);
  assert.throws(()=>opportunityRules({...s,opportunityRules:{productPeople:0}}));
  assert.equal(identifyOpportunities({...s,opportunityRules:{productPeople:200}},{now}).items.filter(m=>m.productId).length,0);
});

test('decisões verificadas não alteram disponibilidade, criam vendas ou premiam abertura',()=>{
  for(const [scenario,type,xp] of [['procura-esgotado','esgotado',80],['buscas-sem-resultados','buscas',60],['campanha-concluida','campanha',80]]){
    const s=createStore(scenario),m=missions(s)[0];assert.equal(m.type,type);
    for(const invalid of [{decision:'inventada'},{note:' '},{note:'a'.repeat(601)}])assert.throws(()=>improve(s,command(m,invalid)));
    assert.equal(totalXP(s),0);const saved=improve(s,command(m)).state;
    assert.equal(totalXP(saved),xp);assert.deepEqual(saved.products,s.products);assert.equal(saved.decisions.length,1);assert.equal(saved.decisions[0].sourceEventId,m.sourceEventId);
    assert.equal(saved.observations.length,1);assert.equal(saved.observations[0].after,null);assert.equal(compareImpact(saved.observations[0],now).status,'waiting');
    assert.equal(missions(saved).length,0);assert.equal(improve(saved,command(m)).awards.length,0);
    assert.throws(()=>improve(saved,command(m,{operation:'other-operation'})));assert.equal(totalXP(saved),xp);
  }
});

test('nova ocorrência exige fonte nova, janela posterior à decisão e necessidade concreta',()=>{
  let s=createStore('buscas-sem-resultados'),event=s.opportunityData.events[0];
  // The earlier legitimate decision was made after a different, concluded period.
  event.period={start:'2026-09-01T00:00:00Z',end:'2026-09-15T00:00:00Z',people:24,contacts:0};event.identifiedAt='2026-09-15T12:00:00Z';
  s=withJourneys(s);const old=missions(s)[0];s=withJourneys(improve(s,command(old,{at:'2026-09-15T15:00:00Z'})).state);
  const originalGroup=s.journeys[0];
  const replay={...event,id:'renamed-event',sourceEventId:'renamed-source'};
  s.opportunityData.events=[replay];assert.equal(missions(s).length,0);
  const current={...replay,period:{start:'2026-09-28T00:00:00Z',end:'2026-10-12T00:00:00Z',people:31,contacts:0},identifiedAt:'2026-10-12T12:00:00Z'};
  s.opportunityData.events=[{...current,sourceEventId:event.sourceEventId}];assert.equal(missions(s).length,0);
  s.opportunityData.events=[{...current,period:{...current.period,start:'2026-09-10T00:00:00Z'}}];assert.equal(missions(s).length,0);
  s.opportunityData.events=[current];s=withJourneys(s);assert.equal(missions(s).length,1);assert.notEqual(missions(s)[0].id,old.id);
  assert.deepEqual(s.journeys.find(g=>g.id===originalGroup.id),originalGroup);assert.equal(journeyBoard(s).filter(g=>g.kind==='buscas').length,2);
  s=improve(s,command(missions(s)[0],{operation:'new-occurrence'})).state;assert.equal(totalXP(s),120);
  s.opportunityData.events[0].matched=true;assert.equal(missions(s).length,0);
});

test('dados insuficientes, futuros ou de outra loja não criam uma oportunidade',()=>{
  const s=createStore('continua-poucos-dados');assert.equal(missions(s).length,0);assert.equal(identifyOpportunities(s,{now}).insufficient,true);
  for(const change of [{storeId:'outra-loja'},{identifiedAt:'2030-01-01T00:00:00Z'},{period:{start:'2026-10-01',end:'2030-01-01',people:100,contacts:1}},{period:{start:'2026-09-28',end:'2026-10-12',people:100,contacts:101}}]){
    const state=createStore('campanha-concluida');Object.assign(state.opportunityData.events[0],change);assert.equal(missions(state).length,0);
  }
  const untracked=createStore('campanha-concluida');untracked.opportunityData.events[0].tracked=false;assert.equal(missions(untracked).length,0);
});

test('apresentação reutiliza missão pontual, sem prêmio extra nem repetição ao apagar campo',()=>{
  let s=createStore('apresentacao-procurada');const m=missions(s)[0];assert.equal(m.type,'descricao');assert.equal(m.id,'atelier-04:descricao:natural:apresentacao:v1');assert.equal(m.xp,60);assert.ok(m.sourceEventId);
  s=improve(s,command(m,{description:'Modelagem reta com acabamento e costuras reforçadas.'})).state;assert.equal(totalXP(s),60);assert.equal(s.observations[0].before.visitors,148);assert.equal(s.observations[0].after,null);
  s.products[2].description='';const event=s.opportunityData.events[0];event.sourceEventId='another-presentation-event';assert.equal(missions(s).length,0);
});

test('divergência recorrente reutiliza revisão e rejeita evento rebatizado sem nova evidência',()=>{
  let s=createStore('divergencia-recorrente');assert.equal(totalXP(s),80);const m=missions(s)[0];assert.equal(m.type,'revisao');assert.ok(m.sourceEventId);
  s=improve(s,command(m,{physical:0,reason:'Conferência completa na arara.'})).state;assert.equal(totalXP(s),160);assert.equal(s.products[1].physical,0);
  const review=s.products[1].stockReview;delete review.resolvedAt;review.id='another-id';assert.equal(missions(s).length,0);
  review.sourceEventId='another-source';assert.equal(missions(s).length,0);
  review.identifiedAt='2026-10-13T12:00:00Z';review.expected=2;review.observed=2;assert.equal(missions(s).length,0);
});

test('ciclo mantém registro identificado após conclusão, no máximo três prioridades e nenhum XP por tempo',()=>{
  let s=createStore('continua');const before=weeklyCycle(s,now);assert.equal(before.opportunities,5);assert.equal(before.priorities.length,3);
  const m=missions(s)[0];s=improve(s,command(m)).state;
  const after=weeklyCycle(s,now);assert.equal(after.opportunities,5);assert.equal(after.improvements,0);assert.equal(after.decisions,1);assert.equal(after.registered,1);assert.equal(after.observing,1);assert.equal(after.reviews,1);
  const xp=totalXP(s);weeklyCycle(s,now+30*86400000);assert.equal(totalXP(s),xp);
  const quiet=createStore('continua-em-dia');assert.equal(weeklyCycle(quiet,now).inOrder,true);assert.equal(missions(quiet).length,0);
  const tracking=createStore('acompanhamento-continuo');assert.equal(weeklyCycle(tracking,now).observing,1);assert.equal(weeklyCycle(tracking,now).results,0);
});

test('adiar e retomar preservam ocorrência, denominador e XP',()=>{
  const s=createStore('continua'),m=missions(s)[0],groups=journeyBoard(s),deferred=withJourneys(deferMission(s,m.id));
  assert.equal(totalXP(deferred),0);assert.ok(!missions(deferred).some(n=>n.productId===m.productId));assert.deepEqual(deferred.journeys,s.journeys);
  const resumed=resumeMission(deferred,m.id);assert.equal(missions(resumed)[0].id,m.id);assert.deepEqual(journeyBoard(resumed).map(g=>g.total),groups.map(g=>g.total));
});

test('backend registra decisão e XP atomicamente, duplica sem premiar e isola sessões',()=>{
  const repo=openRepository(':memory:');try{
    repo.create('continuous-one');repo.create('continuous-two');let s=repo.mutate(tokenHash('continuous-one'),'reset',{generation:1,scenario:'buscas-sem-resultados'}).state;
    const m=missions(s)[0],{at,...c}=command(m,{operation:'backend-decision'}),payload={...c,generation:s.generation};
    assert.throws(()=>repo.mutate(tokenHash('continuous-one'),'save',{...payload,note:''}));assert.equal(repo.read(tokenHash('continuous-one')).decisions.length,0);assert.equal(totalXP(repo.read(tokenHash('continuous-one'))),0);
    for(const forge of [{xp:1000},{period:m.period},{sourceEventId:'fake-source'},{at:'2030-01-01'}])assert.throws(()=>repo.mutate(tokenHash('continuous-one'),'save',{...payload,...forge}));
    s=repo.mutate(tokenHash('continuous-one'),'save',payload).state;assert.equal(s.decisions.length,1);assert.equal(totalXP(s),60);assert.equal(s.observations.length,1);
    const repeat=repo.mutate(tokenHash('continuous-one'),'save',payload);assert.equal(repeat.award,null);assert.equal(repeat.state.decisions.length,1);
    assert.throws(()=>repo.mutate(tokenHash('continuous-one'),'save',{...payload,note:'Um preenchimento diferente após uma operação confirmada.'}));
    assert.throws(()=>repo.mutate(tokenHash('continuous-one'),'save',{...payload,operation:'concurrent-other-tab'}));assert.equal(totalXP(repo.read(tokenHash('continuous-one'))),60);
    assert.equal(totalXP(repo.read(tokenHash('continuous-two'))),0);
  }finally{repo.close();}
});
