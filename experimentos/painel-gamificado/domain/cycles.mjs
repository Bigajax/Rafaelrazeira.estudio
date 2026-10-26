import {missions} from './engine.mjs';
import {identifyOpportunities} from './opportunities.mjs';
import {observationsFor,compareImpact} from './impact.mjs';
import {isDecision} from './recognition.mjs';
export function weeklyCycle(state,now=Date.now()){
  const start=now-7*86400000,available=missions(state,{limit:Infinity}),all=missions(state,{includeDeferred:true,limit:Infinity});
  const inWeek=at=>Date.parse(at)>=start&&Date.parse(at)<=now;
  const identified=identifyOpportunities(state,{now});
  const found=new Set([...identified.items,...all.filter(m=>m.sourceEventId),...state.history.filter(a=>a.sourceEventId)].filter(o=>inWeek(o.identifiedAt)).map(o=>o.sourceEventId));
  const observations=observationsFor(state),waiting=observations.filter(o=>compareImpact(o,now).status!=='ready');
  return {start:new Date(start).toISOString(),end:new Date(now).toISOString(),
    opportunities:found.size,
    registered:new Set(state.history.filter(a=>found.has(a.sourceEventId)).map(a=>a.sourceEventId)).size,
    improvements:state.history.filter(a=>a.type&&!isDecision(a)&&inWeek(a.at)).length,
    decisions:state.history.filter(a=>isDecision(a)&&inWeek(a.at)).length,
    observing:waiting.length,results:observations.length-waiting.length,
    reviews:all.filter(m=>['esgotado','revisao'].includes(m.type)).length,
    priorities:available.slice(0,3),deferred:all.filter(m=>state.deferred.includes(m.id)).length,
    inOrder:available.length===0&&all.length===0,insufficient:identified.insufficient};
}
