import test from 'node:test';
import assert from 'node:assert/strict';
import {progress} from '../domain/engine.mjs';
import {evolutionEvents,rewardFrame} from '../domain/presentation.mjs';

test('a barra mostra o nível anterior completo antes de incorporar o excedente',()=>{
  const before=progress(60),after=progress(140);
  assert.deepEqual(rewardFrame(before,after,'idle'),before);
  const full=rewardFrame(before,after,'xp_received');
  assert.equal(full.level,1);assert.equal(full.within,100);assert.equal(full.fraction,1);
  for(const phase of ['level_up','complete'])assert.deepEqual(rewardFrame(before,after,phase),after);
  assert.equal(before.within,60);assert.equal(after.within,40);
});

test('ganhar XP sem subir de nível não apresenta um limite fictício',()=>{
  const before=progress(0),after=progress(60);
  assert.deepEqual(rewardFrame(before,after,'xp_received'),after);
});

test('a linha do tempo deriva a conquista sem acrescentar XP ou modificar o histórico',()=>{
  const history=[{id:'foto',xp:60,at:'2026-10-11T12:00:00Z'},{id:'estoque',xp:80,at:'2026-10-11T13:00:00Z'}];
  const original=structuredClone(history),events=evolutionEvents(history);
  assert.deepEqual(history,original);
  assert.deepEqual(events.map(e=>e.kind),['level','improvement','improvement']);
  assert.equal(events[0].level,2);assert.equal(events[0].at,history[1].at);
  assert.equal(events.filter(e=>e.kind==='improvement').reduce((sum,e)=>sum+e.xp,0),140);
  assert.deepEqual(evolutionEvents([]),[]);
});

test('uma recompensa que cruza vários níveis produz um marco com o nível final',()=>{
  const events=evolutionEvents([{id:'multiple',xp:700,at:'2026-10-11T12:00:00Z'}]);
  assert.equal(events.filter(e=>e.kind==='level').length,1);
  assert.equal(events[0].level,5);assert.equal(events[0].total,700);
});
