import {createHash} from 'node:crypto';
import {requestContext} from './context.mjs';
import {simulatedProvider} from './simulated-provider.mjs';
import {validateAnalysis} from './validate.mjs';
import {RequestError} from '../server/repository.mjs';
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function createIntelligenceService({provider=simulatedProvider,clock=Date.now,timeoutMs=5000}={}){
  const cache=new Map();
  return async function analyse(repo,hash,payload){
    const state=repo.read(hash);
    if(payload.generation!==state.generation)throw new RequestError('O cenário mudou. Volte à missão antes de consultar.',409);
    const input=requestContext(state,payload),started=clock();
    const usageId=repo.beginIntelligence(hash,input.intent,started);
    const key=digest([state.sessionId,state.generation,state.revision,input.context,input.intent,input.question]);
    for(const [k,value] of cache)if(value.expires<=started)cache.delete(k);
    let cached=false;
    let timer;
    try{
      const hit=input.simulation==='normal'?cache.get(key):null;
      const response=hit?.value??validateAnalysis(await Promise.race([provider.respond(structuredClone(input)),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('TIMEOUT')),timeoutMs);})]),input.context,input.intent);
      cached=Boolean(hit);
      const latest=repo.read(hash);
      if(latest.generation!==state.generation||latest.revision!==state.revision)throw new RequestError('A loja recebeu uma atualização. Consulte o cuidado novamente.',409);
      if(!hit&&input.simulation==='normal'){if(cache.size>=200)cache.delete(cache.keys().next().value);cache.set(key,{value:structuredClone(response),expires:started+5*60000});}
      repo.finishIntelligence(hash,usageId,'success',cached,clock()-started);
      return {analysis:structuredClone(response),context:structuredClone(input.context),cached,mode:'simulated',revision:state.revision};
    }catch(error){
      repo.finishIntelligence(hash,usageId,error.status===409?'stale':error.message==='INVALID_ANALYSIS'?'invalid':error.message==='TIMEOUT'?'timeout':'unavailable',cached,clock()-started);
      if(error instanceof RequestError)throw error;
      throw new RequestError(error.message==='INVALID_ANALYSIS'?'Não foi possível validar esta análise. Sua missão e seu preenchimento foram preservados.':'A ajuda está indisponível neste momento. Você pode continuar a missão ou tentar novamente.',503);
    }finally{clearTimeout(timer);}
  };
}
export function intelligenceService(){return globalThis.__performanceIntelligence??=createIntelligenceService();}
