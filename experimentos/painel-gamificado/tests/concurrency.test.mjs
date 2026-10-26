import test from 'node:test';import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {mkdirSync,mkdtempSync} from 'node:fs';import path from 'node:path';
import {openRepository,tokenHash} from '../server/repository.mjs';
import {missions,totalXP} from '../domain/engine.mjs';

test('conexões concorrentes persistem cada objetivo uma vez no mesmo banco',async()=>{
  const base=path.resolve(process.cwd(),'../../.tmp/painel-gamificado');mkdirSync(base,{recursive:true});
  const folder=mkdtempSync(path.join(base,'concurrency-')),filename=path.join(folder,'test.sqlite');
  const repository=openRepository(filename),initial=repository.create('parallel-session'),[photo,count]=missions(initial);
  const commands=[{generation:1,operation:'parallel-photo',missionId:photo.id,photo:'/assets/conjunto.svg'},{generation:1,operation:'parallel-count',missionId:count.id,physical:0,reason:'Conferência da arara'}];
  const source=`const {parentPort,workerData}=require('node:worker_threads');(async()=>{const {openRepository,tokenHash}=await import(workerData.module);const r=openRepository(workerData.filename);parentPort.once('message',()=>{try{const result=r.mutate(tokenHash('parallel-session'),'save',workerData.command);parentPort.postMessage({done:true,awarded:result.award?.xp??0});}catch(error){parentPort.postMessage({error:error.message});}finally{r.close();}});parentPort.postMessage({ready:true});})().catch(error=>parentPort.postMessage({error:error.message}));`;
  const workers=[];
  try{
    const ready=[],done=[];
    for(const command of [...commands,...commands]){
      const worker=new Worker(source,{eval:true,workerData:{module:new URL('../server/repository.mjs',import.meta.url).href,filename,command}});workers.push(worker);
      ready.push(new Promise((resolve,reject)=>{worker.on('message',m=>{if(m.ready)resolve();if(m.error)reject(Error(m.error));});worker.on('error',reject);}));
      done.push(new Promise((resolve,reject)=>{worker.on('message',m=>{if(m.done)resolve(m);if(m.error)reject(Error(m.error));});worker.on('error',reject);}));
    }
    await Promise.all(ready);workers.forEach(w=>w.postMessage('go'));
    const results=await Promise.all(done);assert.equal(results.filter(r=>r.awarded>0).length,2);assert.equal(results.reduce((sum,r)=>sum+r.awarded,0),140);
    const state=repository.read(tokenHash('parallel-session'));assert.equal(totalXP(state),140);assert.equal(state.history.length,2);assert.equal(state.products[1].physical,0);
  }finally{repository.close();await Promise.all(workers.map(w=>w.terminate()));}
});
