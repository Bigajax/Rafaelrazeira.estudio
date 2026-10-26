import test from 'node:test';import assert from 'node:assert/strict';
import {createStore} from '../fixtures/stores.mjs';
import {missions,improve,totalXP,progress} from '../domain/engine.mjs';
import {achievements,retrospective} from '../domain/achievements.mjs';
import {compareImpact,observationsFor} from '../domain/impact.mjs';

test('níveis 5 e 10 usam histórico verificável, sem bônus de marco',()=>{
  for(const [scenario,level,total,records] of [['marco-5',5,640,8],['marco-10',10,2640,33]]){
    let state=createStore(scenario);assert.equal(totalXP(state),total);assert.equal(state.history.length,records);
    state=improve(state,{operation:'photo',missionId:missions(state)[0].id,photo:'/assets/conjunto.svg'}).state;
    assert.equal(totalXP(state),total+60);assert.equal(progress(totalXP(state)).level,level);
    const mark=achievements(state).find(a=>a.level===level);assert.equal(mark.summary.improvements,records+1);assert.equal(mark.summary.products,records+1);assert.equal(mark.summary.stockReviews,records);
    assert.deepEqual(retrospective(state),mark.summary);
  }
});

test('novas missões resolvem necessidades e não reaparecem após apagar a melhoria',()=>{
  let state=createStore('novas-missoes');assert.deepEqual(missions(state).map(m=>m.type),['revisao','descricao','detalhe']);
  for(const type of ['revisao','descricao','detalhe']){
    const m=missions(state).find(m=>m.type===type),command={operation:type,missionId:m.id,physical:0,reason:'Conferência na arara',description:'Modelagem ampla com acabamento reforçado.',photo:'/assets/detalhe.svg'};
    state=improve(state,command).state;assert.ok(!missions(state).some(n=>n.id===m.id));
  }
  assert.equal(totalXP(state),240);assert.ok(state.products[1].stockReview.resolvedAt);assert.equal(state.products[1].physical,0);
  state.products[0].detail=null;state.products[2].description='';assert.equal(missions(state).length,0);
});

test('nenhuma tarefa opcional é inventada para a loja em dia',()=>{assert.equal(missions(createStore('em-dia')).length,0);});

test('impacto compara janelas iguais, mesma elegibilidade e percentuais descritivos',()=>{
  const state=createStore('impacto'),observation=observationsFor(state)[0],comparison=compareImpact(observation);
  assert.equal(comparison.status,'ready');assert.equal(comparison.beforeRate,3);assert.equal(comparison.afterRate,7);assert.equal(comparison.difference,4);
  assert.ok(state.history.some(h=>h.id===observation.missionId));
  assert.equal(compareImpact(state.observations[1]).status,'small-sample');assert.equal(compareImpact(state.observations[2]).status,'waiting');
  assert.equal(compareImpact({...observation,before:null}).status,'no-baseline');
  assert.equal(compareImpact({...observation,after:{...observation.after,end:'2026-10-01T00:00:00Z'}}).status,'incomparable');
  assert.equal(compareImpact({...observation,changedAt:'2026-08-01T00:00:00Z'}).status,'incomparable');
  assert.equal(compareImpact({...observation,after:{...observation.after,contacts:101}}).status,'incomparable');
  assert.equal(compareImpact(observation,Date.parse('2026-09-20T00:00:00Z')).status,'waiting');
});
