import test from 'node:test';import assert from 'node:assert/strict';
import {createStore,scenarios} from '../fixtures/stores.mjs';
import {productMap,diagnostic,variantSignals} from '../domain/commercial.mjs';
import {registerVariantSignal} from '../domain/variant-interest.mjs';
import {totalXP,improve,progress} from '../domain/engine.mjs';
import {openRepository,tokenHash} from '../server/repository.mjs';
const now=Date.parse('2026-10-13T18:00:00Z');
test('loja pequena mantém fatos e ação concreta sem comparação ou novas recompensas',()=>{
  const s=createStore('mapa-comercial'),before=structuredClone(s),rows=productMap(s,{now});assert.equal(rows.length,40);assert.ok(rows.every(r=>!r.comparison));
  assert.equal(rows.find(r=>r.product.id==='natural').reading.visitors,18);assert.equal(rows.find(r=>r.product.id==='natural').mission.type,'foto');assert.equal(rows.find(r=>r.product.id==='linho').pending.declared,14);
  assert.equal(rows.find(r=>r.product.id==='camisa').mostViewed,true);assert.equal(diagnostic(s,{now}).length,2);assert.equal(totalXP(s),0);assert.deepEqual(s,before);assert.equal(scenarios.length,32);
});
test('prévia do nível 10 mantém o mapa e as necessidades da loja, com histórico fictício válido',()=>{
  const s=createStore('mapa-nivel-10');assert.equal(totalXP(s),2700);assert.equal(progress(totalXP(s)).level,10);assert.equal(s.history.length,34);
  assert.equal(productMap(s,{now}).length,40);assert.equal(productMap(s,{now}).find(r=>r.product.id==='natural').mission.type,'foto');assert.equal(productMap(s,{now}).find(r=>r.product.id==='linho').pending.declared,14);
});
test('prévia do nível 25 usa a progressão original e mantém 40 produtos publicados',()=>{
  const s=createStore('mapa-nivel-25');assert.equal(totalXP(s),16200);assert.equal(progress(totalXP(s)).level,25);assert.equal(productMap(s,{now}).length,40);
  assert.equal(productMap(s,{now}).find(r=>r.product.id==='natural').mission.type,'foto');
});
test('três níveis são separados; dados incompatíveis nunca calculam taxa relativa',()=>{
  let s=createStore('mapa-comparavel');assert.ok(productMap(s,{now}).every(r=>r.level===3));assert.equal(productMap(s,{now}).find(r=>r.product.id==='linho').situation,'Destaque relativo');assert.ok(productMap(s,{now}).some(r=>r.situation==='Pouco descoberto'));const noExposure=structuredClone(s);noExposure.commercialData.products.forEach(r=>r.exposuresQualified=false);assert.ok(productMap(noExposure,{now}).every(r=>!r.exposureComparison));
  for(const mutate of [s=>s.commercialData.complete=false,s=>s.commercialData.products.forEach(r=>r.previous.storeId='outra-loja'),s=>s.commercialData.products.forEach(r=>r.contactsQualified=false),s=>s.commercialData.products.forEach(r=>r.previous.sourceEventId=r.sourceEventId),s=>s.commercialData.products.forEach(r=>r.previous.period={...r.previous.period,end:'2026-10-02T00:00:00Z'}),s=>s.commercialData.products.forEach(r=>r.contacts=r.visitors+1)]){
    const invalid=structuredClone(s);mutate(invalid);assert.ok(productMap(invalid,{now}).every(r=>!r.comparison));
  }
  const small=structuredClone(s);small.products=small.products.slice(0,4);assert.ok(productMap(small,{now}).every(r=>!r.comparison));
  const invalid=structuredClone(s);invalid.commercialData.products[0].storeId='outra-loja';assert.equal(productMap(invalid,{now}).find(r=>r.product.id==='linho').reading,null);
  assert.ok(productMap(createStore('mapa-fontes-incompletas'),{now}).every(r=>!r.comparison));
});
test('consulta não é declaração; união por visitante evita multiplicação de pessoas',()=>{
  const s=createStore('mapa-toques'),v=variantSignals(s,'linho',now).find(v=>v.size==='41');assert.equal(v.opened,14);assert.equal(v.declared,0);assert.equal(diagnostic(s,{now}).some(r=>r.pending),false);
  const declared=createStore('mapa-interesse'),sig=declared.commercialData.variantSignals.find(e=>e.kind==='interest');declared.commercialData.variantSignals.push({...sig,sourceEventId:'duplicate-source'});assert.equal(variantSignals(declared,'linho',now).find(v=>v.size==='41').declared,7);
  declared.commercialData.variantSignals.push({...sig,visitorId:'future',at:'2030-01-01T00:00:00Z'},{...sig,visitorId:'other-store',storeId:'outra-loja'});assert.equal(variantSignals(declared,'linho',now).find(v=>v.size==='41').declared,7);
  const reposto=productMap(createStore('mapa-reposto'),{now}).find(r=>r.product.id==='linho');assert.equal(reposto.pending,undefined);assert.equal(reposto.signals[0].unavailable,7);assert.equal(reposto.signals[0].physical,2);
});
test('declaração exige consulta recente, disponibilidade atual e confirmação sem alterar estoque',()=>{
  const s=createStore('mapa-interesse'),command={operation:'declared-operation',productId:'linho',variantId:'variante-0-41',kind:'interest'},options={visitorId:'test-visitor',at:'2026-10-13T18:00:00Z'};
  assert.throws(()=>registerVariantSignal(s,command,options));const opened=registerVariantSignal(s,{...command,operation:'opened-operation',kind:'open'},options).state;
  assert.equal(variantSignals(opened,'linho',now).find(v=>v.size==='41').declared,7);
  const confirmed=registerVariantSignal(opened,command,options);assert.equal(confirmed.status,'registered');assert.equal(totalXP(confirmed.state),0);assert.deepEqual(confirmed.state.products,s.products);assert.equal(variantSignals(confirmed.state,'linho',now).find(v=>v.size==='41').declared,8);
  assert.equal(registerVariantSignal(confirmed.state,{...command,operation:'other-operation'},options).duplicate,true);
  const changed=structuredClone(opened);changed.products[0].variants[1].physical=2;assert.equal(registerVariantSignal(changed,command,options).status,'available');changed.products[0].variants[1].physical=null;assert.equal(registerVariantSignal(changed,command,options).status,'unknown');
  assert.throws(()=>registerVariantSignal(opened,command,{...options,at:'2026-10-13T19:00:00Z'}));
  const renewed=registerVariantSignal(opened,{...command,operation:'renew-open-operation',kind:'open'},{...options,at:'2026-10-13T19:00:00Z'}).state;assert.equal(registerVariantSignal(renewed,command,{...options,at:'2026-10-13T19:00:00Z'}).status,'registered');
});
test('o cuidado aberto pelo mapa usa a recompensa original e desaparece após salvar',()=>{
  const s=createStore('mapa-poucos-dados'),m=productMap(s,{now}).find(r=>r.mission).mission,next=improve(s,{operation:'map-photo-save',missionId:m.id,photo:'/assets/conjunto.svg',at:'2026-10-13T18:00:00Z'}).state;
  assert.equal(totalXP(next),60);assert.equal(productMap(next,{now}).find(r=>r.product.id===m.productId).mission,undefined);assert.equal(diagnostic(next,{now}).some(r=>r.product.id===m.productId),false);
});
test('API de interesse é atômica, idempotente, isolada e recusa origem e métricas do cliente',()=>{
  const repo=openRepository(':memory:');try{
    repo.create('map-session-one');repo.create('map-session-two');const hash=tokenHash('map-session-one'),s=repo.mutate(hash,'reset',{generation:1,scenario:'mapa-interesse'}).state,c={generation:s.generation,operation:'interest-open-api',productId:'linho',variantId:'variante-0-41'};
    for(const extra of [{visitorId:'someone'},{at:'2026-10-11T00:00:00Z'},{physical:0},{xp:80},{kind:'interest'},{declared:999}])assert.throws(()=>repo.mutate(hash,'variant-open',{...c,...extra}),e=>e.status===400);
    assert.throws(()=>repo.mutate(hash,'variant-interest',{...c,operation:'interest-before-open'}),e=>e.status===400);
    repo.mutate(hash,'variant-open',c);const result=repo.mutate(hash,'variant-interest',{...c,operation:'interest-confirm-api'});assert.equal(result.status,'registered');assert.equal(totalXP(result.state),0);
    assert.equal(repo.mutate(hash,'variant-interest',{...c,operation:'interest-confirm-api'}).duplicate,true);assert.equal(repo.read(hash).revision,result.state.revision);
    assert.throws(()=>repo.mutate(hash,'variant-interest',{...c,operation:'interest-confirm-api',variantId:'variante-0-42'}),e=>e.status===409);
    assert.equal(repo.read(tokenHash('map-session-two')).commercialData,undefined);
    const changed=repo.mutate(hash,'demo-variant-stock',{...c,operation:'changed-stock-api',preset:'available'}).state;assert.equal(totalXP(changed),0);
    const unavailableResult=repo.mutate(hash,'variant-interest',{...c,operation:'interest-after-change'});assert.equal(unavailableResult.status,'available');assert.equal(repo.mutate(hash,'variant-interest',{...c,operation:'interest-after-change'}).status,'available');
    repo.mutate(hash,'reset',{generation:s.generation,scenario:'nova'});assert.throws(()=>repo.mutate(hash,'variant-interest',c),e=>e.status===409);
  }finally{repo.close();}
});
