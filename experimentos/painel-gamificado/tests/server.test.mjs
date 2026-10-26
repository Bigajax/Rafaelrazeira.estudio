import test from 'node:test';import assert from 'node:assert/strict';
import {openRepository,tokenHash} from '../server/repository.mjs';
import {missions,totalXP} from '../domain/engine.mjs';
import {completeAuthenticatedMission} from '../integration/authenticated-service.mjs';

test('servidor salva dados e XP juntos, rejeita adulteração e isola sessões',()=>{
  const repository=openRepository(':memory:');try{
    const state=repository.create('session-a');repository.create('session-b');
    const photo={generation:state.generation,operation:'photo-operation',missionId:missions(state)[0].id,photo:'/assets/conjunto.svg'};
    assert.throws(()=>repository.mutate(tokenHash('session-a'),'save',{...photo,xp:9999}));
    assert.equal(totalXP(repository.read(tokenHash('session-a'))),0);
    const result=repository.mutate(tokenHash('session-a'),'save',photo);
    assert.equal(result.award.xp,60);assert.equal(result.state.products[0].cover,'/assets/conjunto.svg');
    assert.equal(totalXP(repository.read(tokenHash('session-b'))),0);
    assert.equal(repository.read(tokenHash('session-b')).products[0].cover,null);
    const repeat=repository.mutate(tokenHash('session-a'),'save',photo);assert.equal(repeat.award,null);assert.equal(totalXP(repeat.state),60);
    assert.throws(()=>repository.mutate(tokenHash('session-a'),'save',{...photo,photo:'/assets/detalhe.svg'}));
    assert.throws(()=>repository.read(tokenHash('not-a-session')));
    const count=missions(result.state).find(m=>m.type==='contagem');
    assert.throws(()=>repository.mutate(tokenHash('session-a'),'save',{generation:1,operation:'count-operation',missionId:count.id,physical:2,reason:''}));
    assert.equal(totalXP(repository.read(tokenHash('session-a'))),60);assert.equal(repository.read(tokenHash('session-a')).products[1].physical,null);
    const reset=repository.mutate(tokenHash('session-a'),'reset',{generation:1,scenario:'nova'});
    assert.equal(reset.state.generation,2);assert.throws(()=>repository.mutate(tokenHash('session-a'),'save',photo));
  }finally{repository.close();}
});

test('duas abas com estados antigos salvam objetivos distintos sem perder recompensas',()=>{
  const repository=openRepository(':memory:');try{
    const state=repository.create('shared-session'),[photo,count]=missions(state);
    repository.mutate(tokenHash('shared-session'),'save',{generation:1,operation:'photo-from-tab',missionId:photo.id,photo:'/assets/conjunto.svg'});
    const result=repository.mutate(tokenHash('shared-session'),'save',{generation:1,operation:'count-from-tab',missionId:count.id,physical:3,reason:'Conferido na arara'});
    assert.equal(totalXP(result.state),140);assert.equal(result.state.history.length,2);assert.equal(result.state.products[0].cover,'/assets/conjunto.svg');assert.equal(result.state.products[1].physical,3);
  }finally{repository.close();}
});

test('fronteira real exige sessão validada e transação autorizada por loja',async()=>{
  const input={request:{},storeId:'store-a',command:{operation:'valid-operation',missionId:'mission'}};
  let called=false;
  const repository={withAuthorizedStoreTransaction:async(user,store)=>{called=true;assert.equal(user,'owner-b');assert.equal(store,'store-a');throw Object.assign(new Error('Acesso negado.'),{status:403});}};
  await assert.rejects(()=>completeAuthenticatedMission(input,{authenticate:async()=>null,repository}),e=>e.status===401);assert.equal(called,false);
  await assert.rejects(()=>completeAuthenticatedMission(input,{authenticate:async()=>({userId:'owner-b'}),repository}),e=>e.status===403);assert.equal(called,true);
});

test('fronteira real não duplica XP e faz rollback se a operação falha',async()=>{
  const local=openRepository(':memory:');const initial=local.create('contract-session');local.close();
  let committed=structuredClone(initial),operations=new Map(),fail=false;
  const repository={withAuthorizedStoreTransaction:async(user,store,work)=>{
    assert.equal(user,'owner');assert.equal(store,'store');let pending=structuredClone(committed),ops=new Map(operations);
    const result=await work({read:async()=>pending,operation:async id=>ops.get(id),saveImprovementAndAward:async state=>{pending=state;},recordOperation:async(id,fingerprint)=>{if(fail)throw Error('Falha de gravação');ops.set(id,{fingerprint});}});
    committed=pending;operations=ops;return result;
  }};
  const deps={authenticate:async()=>({userId:'owner'}),repository},command={operation:'contract-photo',missionId:missions(initial)[0].id,photo:'/assets/conjunto.svg'};
  fail=true;await assert.rejects(()=>completeAuthenticatedMission({request:{},storeId:'store',command},deps));assert.equal(totalXP(committed),0);assert.equal(committed.products[0].cover,null);
  fail=false;assert.equal((await completeAuthenticatedMission({request:{},storeId:'store',command},deps)).award.xp,60);
  assert.equal((await completeAuthenticatedMission({request:{},storeId:'store',command},deps)).award,null);assert.equal(totalXP(committed),60);
});
