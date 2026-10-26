import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../fixtures/stores.mjs';
import {missions,totalXP,improve} from '../domain/engine.mjs';
import {observationsFor,compareImpact} from '../domain/impact.mjs';
import {followupStatus,recordFollowup} from '../domain/followup.mjs';
import {loadFollowupEvidence} from '../fixtures/followup.mjs';
import {openRepository,tokenHash} from '../server/repository.mjs';
const now=Date.parse('2026-10-13T18:00:00Z');
test('decisão, ação declarada e leitura posterior são etapas distintas, sem XP adicional',()=>{
  const s=createStore('decisao-sem-acao'),o=observationsFor(s)[0];assert.equal(followupStatus(o,now).stage,'action-pending');
  const next=recordFollowup(s,{operation:'record-followup-test',observationId:o.id,status:'performed',note:'Consultei o fornecedor e ainda aguardo o prazo de entrega.',at:'2026-10-13T12:00:00Z'}).state;
  assert.equal(followupStatus(observationsFor(next)[0],now).stage,'waiting');assert.equal(next.products[0].physical,0);assert.equal(totalXP(next),80);assert.deepEqual(next.history,s.history);
  assert.equal(recordFollowup(next,{operation:'record-followup-test'}).duplicate,true);
  const paused=recordFollowup(next,{operation:'followup-pause-test',observationId:o.id,status:'not-now',note:'Vou manter indisponível até obter uma confirmação do fornecedor.',at:'2026-10-13T13:00:00Z'}).state;
  assert.equal(followupStatus(observationsFor(paused)[0],now).stage,'paused');assert.equal(totalXP(paused),80);
  assert.throws(()=>recordFollowup(s,{operation:'invalid-followup',observationId:o.id,status:'performed',note:'Curta.'}));
  assert.throws(()=>recordFollowup(s,{operation:'invalid-followup',observationId:o.id,status:'performed',note:'Descrição do encaminhamento inválido.',at:'2026-09-01T00:00:00Z'}));
});
test('fonte posterior concluída abre uma comparação e outra ocorrência independente',()=>{
  const s=createStore('acompanhamento-comercial');assert.equal(missions(s).length,0);assert.equal(followupStatus(observationsFor(s)[0],now).stage,'waiting');
  const next=loadFollowupEvidence(s,'periodo-posterior-setembro').state,c=compareImpact(observationsFor(next)[0],now);
  assert.equal(c.status,'ready');assert.equal(c.beforeRate,2.5);assert.equal(c.afterRate,7.5);assert.equal(c.difference,5);assert.equal(totalXP(next),80);assert.deepEqual(next.history,s.history);
  assert.equal(loadFollowupEvidence(next,'periodo-posterior-setembro').duplicate,true);
  const m=missions(next)[0];assert.equal(m.type,'campanha');assert.notEqual(m.sourceEventId,next.history[0].sourceEventId);
  const done=improve(next,{operation:'next-campaign-test',missionId:m.id,decision:'observar',note:'Observar os dados da nova campanha antes de alterar a divulgação.',at:'2026-10-13T13:00:00Z'}).state;assert.equal(totalXP(done),160);assert.equal(done.history.length,2);
});
test('proveniência, ação e duração impedem comparações enganosas',()=>{
  const s=loadFollowupEvidence(createStore('acompanhamento-comercial'),'periodo-posterior-setembro').state,o=observationsFor(s)[0];
  for(const key of ['storeId','entityId','population','metric','version','sourceEventId']){
    const altered=structuredClone(o);altered.after.provenance[key]=key==='sourceEventId'?altered.before.provenance.sourceEventId:'incompatível';assert.equal(compareImpact(altered,now).status,'incomparable');
  }
  const sameInvalid=structuredClone(o);sameInvalid.before.provenance.population=sameInvalid.after.provenance.population='visitantes-de-toda-a-loja';assert.equal(compareImpact(sameInvalid,now).status,'incomparable');
  assert.equal(compareImpact({...o,action:{...o.action,at:'2026-09-15T00:00:00Z'}},now).status,'incomparable');
  assert.equal(compareImpact({...o,after:{...o.after,end:'2026-09-30T00:00:00Z'}},now).status,'incomparable');
  assert.equal(compareImpact({...o,after:{...o.after,contacts:121}},now).status,'incomparable');
  assert.equal(compareImpact(o,Date.parse('2026-09-20T00:00:00Z')).status,'waiting');
  assert.equal(compareImpact({...o,type:'buscas'},now).status,'incomparable');
  assert.equal(followupStatus(observationsFor(createStore('acompanhamento-amostra'))[0],now).stage,'small-sample');
  assert.equal(followupStatus(observationsFor(createStore('acompanhamento-fontes'))[0],now).stage,'incomparable');
});
test('o servidor limita importações ao cenário preparado, isola sessões e protege repetição',()=>{
  const repo=openRepository(':memory:');try{
    repo.create('followup-one');repo.create('followup-two');const hash=tokenHash('followup-one');let s=repo.mutate(hash,'reset',{generation:1,scenario:'acompanhamento-comercial'}).state;
    const command={generation:s.generation,operation:'import-evidence-operation',preset:'periodo-posterior-setembro'};
    assert.throws(()=>repo.mutate(hash,'demo-evidence',{...command,after:{visitors:999}}),e=>e.status===400);
    const result=repo.mutate(hash,'demo-evidence',command);assert.equal(result.award,null);assert.equal(totalXP(result.state),80);
    assert.equal(repo.mutate(hash,'demo-evidence',command).duplicate,true);assert.equal(repo.read(hash).revision,result.state.revision);
    assert.throws(()=>repo.mutate(hash,'demo-evidence',{...command,preset:'inventado'}),e=>e.status===409);
    assert.throws(()=>repo.mutate(tokenHash('followup-two'),'demo-evidence',{...command,generation:1}),e=>e.status===400);assert.equal(totalXP(repo.read(tokenHash('followup-two'))),0);
    assert.throws(()=>repo.mutate(hash,'demo-evidence',{...command,generation:1}),e=>e.status===409);
  }finally{repo.close();}
});
test('encaminhamentos persistem atomicamente sem adulteração de datas, catálogo ou recompensas',()=>{
  const repo=openRepository(':memory:');try{
    repo.create('followup-mutation');const hash=tokenHash('followup-mutation'),s=repo.mutate(hash,'reset',{generation:1,scenario:'decisao-sem-acao'}).state,o=observationsFor(s)[0],command={generation:s.generation,operation:'followup-save-operation',observationId:o.id,status:'performed',note:'Consultei o fornecedor e aguardarei a confirmação para cadastrar entrada.'};
    for(const extra of [{at:'2026-09-13T12:00:00Z'},{xp:999},{physical:10},{after:{visitors:1000}}])assert.throws(()=>repo.mutate(hash,'followup',{...command,...extra}),e=>e.status===400);
    assert.equal(repo.read(hash).followups,undefined);
    const result=repo.mutate(hash,'followup',command);assert.equal(result.award,null);assert.equal(totalXP(result.state),80);assert.deepEqual(result.state.products,s.products);assert.equal(result.state.followups.length,1);
    assert.equal(repo.mutate(hash,'followup',command).duplicate,true);assert.equal(repo.read(hash).followups.length,1);assert.throws(()=>repo.mutate(hash,'followup',{...command,status:'not-now'}),e=>e.status===409);
    const reset=repo.mutate(hash,'reset',{generation:s.generation,scenario:'nova'}).state;assert.throws(()=>repo.mutate(hash,'followup',command),e=>e.status===409);assert.equal(totalXP(reset),0);
  }finally{repo.close();}
});
