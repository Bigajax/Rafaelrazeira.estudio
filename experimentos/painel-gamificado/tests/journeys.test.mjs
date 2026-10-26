import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../fixtures/stores.mjs';
import {missions,improve,totalXP,deferMission,resumeMission,productInterest} from '../domain/engine.mjs';
import {journeyBoard,withJourneys,groupForMission} from '../domain/journeys.mjs';
import {evolutionEvents} from '../domain/presentation.mjs';
import {openRepository,tokenHash} from '../server/repository.mjs';

test('19 objetivos ficam em quatro grupos com progresso derivado das recompensas',()=>{
  const state=createStore('varias-missoes'),before=JSON.stringify(state),groups=journeyBoard(state);
  assert.equal(groups.length,4);assert.equal(groups.reduce((n,g)=>n+g.total,0),19);
  assert.equal(groups.reduce((n,g)=>n+g.available,0),12);assert.equal(groups.reduce((n,g)=>n+g.deferred,0),3);
  assert.equal(groups.reduce((n,g)=>n+g.completed,0),4);assert.equal(groups.reduce((n,g)=>n+g.earnedXP,0),280);
  assert.deepEqual(new Set(groups.map(g=>g.family)),new Set(['Organizar','Cuidar','Evoluir']));
  assert.equal(JSON.stringify(state),before);
});

test('progressão do grupo mantém o total ao salvar, adiar, retomar e incluir novas peças',()=>{
  let state=createStore('varias-missoes');const mission=missions(state,{limit:Infinity}).find(m=>m.type==='contagem');
  const original=groupForMission(state,mission.id);assert.equal(original.total,5);assert.equal(original.completed,1);
  state=deferMission(state,mission.id);assert.equal(groupForMission(state,mission.id).total,5);assert.equal(totalXP(state),280);
  state=resumeMission(state,mission.id);state=improve(state,{operation:'journey-stock',missionId:mission.id,physical:0,reason:'Conferência na arara'}).state;
  assert.equal(groupForMission(state,mission.id).completed,2);assert.equal(groupForMission(state,mission.id).total,5);
  state.products.push({...state.products.find(p=>p.id===mission.productId),id:'nova-peca',physical:null});state=withJourneys(state);
  assert.equal(groupForMission(state,mission.id).total,5);
  assert.equal(journeyBoard(state).filter(g=>g.kind==='disponibilidade').length,2);
  assert.equal(journeyBoard(state).find(g=>g.kind==='disponibilidade'&&g.sequence===2).total,1);assert.equal(totalXP(state),360);
});

test('finalizar um grupo registra um marco visual sem acrescentar XP',()=>{
  let state=createStore();
  for(const m of missions(state,{limit:Infinity}))state=improve(state,{operation:m.id,missionId:m.id,photo:'/assets/conjunto.svg',physical:2,reason:'Conferência na loja'}).state;
  const groups=journeyBoard(state);assert.ok(groups.every(g=>g.complete));assert.equal(totalXP(state),140);
  const events=evolutionEvents(state.history,groups);assert.equal(events.filter(e=>e.kind==='journey').length,2);
  assert.equal(events.filter(e=>e.kind==='improvement').reduce((n,e)=>n+e.xp,0),140);
  assert.equal(events.filter(e=>e.kind==='journey').reduce((n,e)=>n+e.earnedXP,0),140);
});

test('objetivo que deixa de ser elegível não desaparece do total e não vira conclusão',()=>{
  const state=createStore('oportunidades'),mission=missions(state).find(m=>m.type==='material');state.analytics=null;
  const group=groupForMission(state,mission.id);assert.equal(group.total,1);assert.equal(group.completed,0);assert.equal(group.unavailable,1);assert.equal(group.complete,false);assert.equal(totalXP(state),60);
});

test('procura só prioriza quando a referência é válida e mantém composição em Vitrine',()=>{
  const state=createStore('varias-missoes'),list=missions(state,{limit:Infinity});
  assert.equal(list[0].productId,'vestido-aurora');assert.equal(list[1].productId,'calca-social');
  assert.ok(list[0].priorityReason.includes('172 pessoas'));assert.equal(list.find(m=>m.type==='material').category,'Vitrine');
  for(const invalid of [{people:49},{days:7},{contacts:999},{people:NaN}]){
    const next=structuredClone(state);Object.assign(next.productAnalytics['vestido-aurora'],invalid);assert.equal(productInterest(next,'vestido-aurora'),null);
    assert.equal(missions(next,{limit:Infinity}).find(m=>m.productId==='vestido-aurora').family,'organizacao');
  }
  state.products.find(p=>p.id==='vestido-aurora').published=false;
  assert.ok(!missions(state,{limit:Infinity}).some(m=>m.productId==='vestido-aurora'));
});

test('servidor salva objetivos fixos do grupo e não aceita progresso informado pelo navegador',()=>{
  const repo=openRepository(':memory:');try{
    const initial=repo.create('group-session'),mission=missions(initial)[0],command={generation:initial.generation,operation:'group-photo-save',missionId:mission.id,photo:'/assets/conjunto.svg'};
    assert.throws(()=>repo.mutate(tokenHash('group-session'),'save',{...command,journeys:[{completed:999}]}));
    const saved=repo.mutate(tokenHash('group-session'),'save',command);assert.equal(saved.journey.completed,1);assert.equal(saved.journey.total,1);assert.equal(saved.journey.earnedXP,60);
    assert.equal(repo.read(tokenHash('group-session')).journeys.length,2);
    assert.equal(repo.mutate(tokenHash('group-session'),'save',command).award,null);assert.equal(totalXP(repo.read(tokenHash('group-session'))),60);
  }finally{repo.close();}
});

test('sessão da versão anterior ganha grupos sem alterar seu histórico ou XP',()=>{
  const state=createStore('varias-missoes');delete state.journeys;const original=structuredClone(state);
  const next=withJourneys(state);assert.equal(next.journeys.length,4);assert.deepEqual(next.history,original.history);assert.equal(totalXP(next),280);
  assert.deepEqual(withJourneys(next).journeys,next.journeys);
});
