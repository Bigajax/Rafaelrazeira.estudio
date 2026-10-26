import {createHash} from 'node:crypto';
import {improve,progress,totalXP} from '../domain/engine.mjs';
import {retrospective,milestoneBetween} from '../domain/achievements.mjs';
import {withJourneys,groupForMission} from '../domain/journeys.mjs';

// Production boundary: authenticate must validate the server session, never read a user ID from JSON.
// The repository commits the product change, award and operation in the SAME store transaction.
export async function completeAuthenticatedMission({request,storeId,command},{authenticate,repository}){
  const identity=await authenticate(request);
  if(!identity?.userId)throw Object.assign(new Error('Entre no painel para continuar.'),{status:401});
  const allowed=['operation','missionId','photo','physical','reason','material','description','decision','note'];
  if(!command||Object.keys(command).some(key=>!allowed.includes(key)))throw Object.assign(new Error('Comando inválido.'),{status:400});
  if(typeof command.operation!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(command.operation))throw Object.assign(new Error('Identificação da operação inválida.'),{status:400});
  const canonical=Object.fromEntries(Object.keys(command).sort().map(key=>[key,command[key]]));
  const fingerprint=createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  return repository.withAuthorizedStoreTransaction(identity.userId,storeId,async transaction=>{
    const state=withJourneys(await transaction.read());
    const previousProgress=progress(totalXP(state));
    const previous=await transaction.operation(command.operation);
    if(previous){
      if(previous.fingerprint!==fingerprint)throw Object.assign(new Error('Operação reutilizada com dados diferentes.'),{status:409});
      return {state,award:null,duplicate:true,previousProgress,progress:previousProgress};
    }
    const result=improve(state,{...canonical,at:new Date().toISOString()});
    result.state=withJourneys(result.state);
    await transaction.saveImprovementAndAward(result.state,result.awards[0]);
    await transaction.recordOperation(command.operation,fingerprint);
    const p=progress(totalXP(result.state));
    return {state:result.state,award:result.awards[0],journey:groupForMission(result.state,command.missionId),previousProgress,progress:p,summary:retrospective(result.state),milestone:milestoneBetween(previousProgress.level,p.level)};
  });
}
