import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore,scenarios} from '../fixtures/stores.mjs';
import {missions,improve,deferMission,resumeMission,totalXP} from '../domain/engine.mjs';
import {missionBoard,completedMissionTitle} from '../domain/mission-board.mjs';

test('área dedicada inclui e permite concluir objetivos além dos três sugeridos',()=>{
  const state=createStore();
  const template=state.products[0];
  state.products.push(...Array.from({length:4},(_,i)=>({...template,id:`extra-${i}`,name:`Peça ${i}`,cover:null})));
  const board=missionBoard(state);
  assert.equal(missions(state).length,3);
  assert.equal(board.disponiveis.length,6);
  const mission=board.disponiveis[4];
  const deferred=deferMission(state,mission.id);
  assert.equal(missionBoard(deferred).adiadas[0].id,mission.id);
  const result=improve(resumeMission(deferred,mission.id),{operation:'fourth',missionId:mission.id,photo:'/assets/conjunto.svg'});
  assert.equal(totalXP(result.state),60);
  assert.equal(missionBoard(result.state).concluidas[0].id,mission.id);
  assert.equal(improve(result.state,{operation:'fourth',missionId:mission.id}).awards.length,0);
});

test('adiar mantém um objetivo por peça e não revela uma segunda tarefa da mesma peça',()=>{
  const state=createStore();state.products[0].needsDescription=true;state.products[0].description='';
  const photo=missionBoard(state).disponiveis.find(m=>m.type==='foto');
  const deferred=deferMission(state,photo.id),board=missionBoard(deferred);
  assert.equal(board.adiadas.length,1);
  assert.ok(!board.disponiveis.some(m=>m.productId===photo.productId));
  assert.equal(totalXP(state),totalXP(deferred));
  assert.equal(totalXP(resumeMission(deferred,photo.id)),0);
  const saved=improve(deferred,{operation:'photo',missionId:photo.id,photo:'/assets/conjunto.svg'}).state;
  assert.equal(missionBoard(saved).adiadas.length,0);
  assert.equal(missionBoard(saved).disponiveis.find(m=>m.productId===photo.productId).type,'descricao');
});

test('concluídas mostra evidências das missões, sem contar a preparação do cenário',()=>{
  let state=createStore('oportunidades');
  assert.equal(state.history.length,1);
  assert.equal(missionBoard(state).concluidas.length,0);
  const mission=missionBoard(state).disponiveis.find(m=>m.type==='contagem');
  state=improve(state,{operation:'stock',missionId:mission.id,physical:0,reason:'Conferência na arara'}).state;
  const [award]=missionBoard(state).concluidas;
  assert.equal(completedMissionTitle(award),'Primeira contagem registrada');
  assert.ok(award.evidence.includes('0 unidades'));
  assert.equal(award.productName,state.products.find(p=>p.id===mission.productId).name);
  assert.equal(totalXP(state),140);
  const before=JSON.stringify(state);missionBoard(state);assert.equal(JSON.stringify(state),before);
});

test('cenário de exploração tem 19 missões distintas com seis modelos e recompensas verificadas',()=>{
  const state=createStore('varias-missoes'),board=missionBoard(state);
  assert.ok(scenarios.some(s=>s.id==='varias-missoes'));
  assert.equal(board.disponiveis.length,12);assert.equal(board.adiadas.length,3);assert.equal(board.concluidas.length,4);
  assert.deepEqual(new Set(board.disponiveis.map(m=>m.type)),new Set(['foto','detalhe','descricao','contagem','revisao','material']));
  assert.equal(new Set([...board.disponiveis,...board.adiadas,...board.concluidas].map(m=>m.productId)).size,19);
  assert.equal(totalXP(state),280);assert.equal(state.operations.length,4);
  for(const award of board.concluidas){assert.ok(award.evidence);assert.ok(award.productName);assert.ok(!missions(state,{limit:Infinity}).some(m=>m.id===award.id));}
  const later=board.disponiveis.find(m=>m.type==='descricao');
  assert.ok(!missions(state).some(m=>m.id===later.id));
  const saved=improve(state,{operation:'explore-description',missionId:later.id,description:'Cintura ajustável e acabamento com costuras reforçadas.'}).state;
  assert.equal(missionBoard(saved).concluidas.length,5);assert.equal(totalXP(saved),340);
  assert.equal(totalXP(createStore('varias-missoes')),280);
});
