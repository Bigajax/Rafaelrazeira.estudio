import {descriptionFromFacts} from './context.mjs';
const fields=['mode','missionId','observed','why','options','execution','unknown','followup','description'];
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[<>]/.test(v);
export function validateAnalysis(response,context,intent){
  const fail=()=>{throw Error('INVALID_ANALYSIS');};
  if(!response||typeof response!=='object'||Array.isArray(response)||Object.keys(response).length!==fields.length||Object.keys(response).some(k=>!fields.includes(k)))fail();
  if(response.mode!=='simulated'||response.missionId!==context.missionId||response.observed!==context.observed||!text(response.why,600)||!text(response.execution,600))fail();
  if(!Array.isArray(response.unknown)||response.unknown.length<1||response.unknown.length>4||response.unknown.some(v=>!text(v,240)))fail();
  if(!Array.isArray(response.options)||response.options.length>3||new Set(response.options.map(o=>o?.id)).size!==response.options.length)fail();
  for(const option of response.options){if(!option||Object.keys(option).length!==3||Object.keys(option).some(k=>!['id','label','advice'].includes(k))||!Object.hasOwn(context.choices,option.id)||option.label!==context.choices[option.id]||!text(option.advice,500))fail();}
  if(response.followup!==null&&(!text(response.followup,600)||intent!=='question'))fail();
  // Numeric evidence belongs to the exact observed block, not to invented projections.
  const interpretation=[response.why,response.execution,...response.unknown,...response.options.flatMap(o=>[o.label,o.advice]),response.followup??''];
  if(interpretation.some(v=>/\d/.test(v)||/garantid|aumentará|venderá|causou|comprovadamente/i.test(v)))fail();
  const expected=intent==='execute'?descriptionFromFacts(context):null;
  if(response.description!==expected||(response.description!==null&&(!text(response.description,800)||response.description.length<20)))fail();
  return structuredClone(response);
}
