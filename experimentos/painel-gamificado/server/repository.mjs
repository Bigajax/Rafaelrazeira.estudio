import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {createStore,scenarios} from '../fixtures/stores.mjs';
import {improve,deferMission,resumeMission,progress,totalXP} from '../domain/engine.mjs';
import {retrospective,milestoneBetween} from '../domain/achievements.mjs';
import {withJourneys,groupForMission} from '../domain/journeys.mjs';
import {recordFollowup} from '../domain/followup.mjs';
import {loadFollowupEvidence} from '../fixtures/followup.mjs';
import {registerVariantSignal} from '../domain/variant-interest.mjs';
import {changeDemoVariant} from '../fixtures/commercial.mjs';

export class RequestError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const digest=value=>createHash('sha256').update(value).digest('hex');
export const tokenHash=token=>digest(token);

export function openRepository(filename){
  if(filename!==':memory:')mkdirSync(path.dirname(filename),{recursive:true});
  const db=new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS stores(id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, state TEXT NOT NULL, generation INTEGER NOT NULL DEFAULT 1, revision INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS awards(store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE, mission_id TEXT NOT NULL, award TEXT NOT NULL, PRIMARY KEY(store_id,mission_id));
    CREATE TABLE IF NOT EXISTS operations(store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE, operation_id TEXT NOT NULL, fingerprint TEXT NOT NULL, PRIMARY KEY(store_id,operation_id));
    CREATE TABLE IF NOT EXISTS variant_receipts(store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE, operation_id TEXT NOT NULL, status TEXT NOT NULL, PRIMARY KEY(store_id,operation_id));
    CREATE TABLE IF NOT EXISTS intelligence_usage(id INTEGER PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id), at INTEGER NOT NULL, intent TEXT NOT NULL, outcome TEXT NOT NULL, cached INTEGER NOT NULL DEFAULT 0, latency_ms INTEGER NOT NULL DEFAULT 0, cost_cents INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS intelligence_usage_window ON intelligence_usage(store_id,at);`);
  function transaction(work){db.exec('BEGIN IMMEDIATE');try{const result=work();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}
  function row(hash){const value=db.prepare('SELECT * FROM stores WHERE token_hash=? AND expires_at>?').get(hash,Date.now());if(!value)throw new RequestError('A sessão do experimento expirou. Atualize a página.',401);return value;}
  const decode=value=>withJourneys({...JSON.parse(value.state),sessionId:value.id,generation:value.generation,revision:value.revision});
  function write(value,state,reset=false){
    state=withJourneys(state);
    if(reset){db.prepare('DELETE FROM awards WHERE store_id=?').run(value.id);db.prepare('DELETE FROM operations WHERE store_id=?').run(value.id);db.prepare('DELETE FROM variant_receipts WHERE store_id=?').run(value.id);}
    const add=db.prepare('INSERT OR IGNORE INTO awards(store_id,mission_id,award) VALUES(?,?,?)');
    for(const award of state.history)add.run(value.id,award.id,JSON.stringify(award));
    db.prepare('UPDATE stores SET state=?,generation=?,revision=revision+1 WHERE id=?').run(JSON.stringify(state),value.generation+(reset?1:0),value.id);
    return decode(row(value.token_hash));
  }
  return {
    close:()=>db.close(),
    create(token){return transaction(()=>{const id=randomUUID(),state=createStore(),hash=tokenHash(token);db.prepare('INSERT INTO stores(id,token_hash,state,expires_at) VALUES(?,?,?,?)').run(id,hash,JSON.stringify(state),Date.now()+30*86400000);return decode(row(hash));});},
    read:hash=>decode(row(hash)),
    beginIntelligence(hash,intent,now){return transaction(()=>{
      const value=row(hash),count=db.prepare('SELECT COUNT(*) AS total FROM intelligence_usage WHERE store_id=? AND at>?').get(value.id,now-60000).total;
      if(count>=30)throw new RequestError('Você já fez várias consultas. Aguarde um minuto ou continue a missão pelo formulário.',429);
      return Number(db.prepare('INSERT INTO intelligence_usage(store_id,at,intent,outcome) VALUES(?,?,?,?)').run(value.id,now,intent,'pending').lastInsertRowid);
    });},
    finishIntelligence(hash,id,outcome,cached,latency){const value=row(hash);db.prepare('UPDATE intelligence_usage SET outcome=?,cached=?,latency_ms=? WHERE id=? AND store_id=?').run(outcome,cached?1:0,Math.max(0,Math.round(latency)),id,value.id);},
    intelligenceUsage(hash){const value=row(hash);return db.prepare('SELECT intent,outcome,cached,latency_ms,cost_cents FROM intelligence_usage WHERE store_id=? ORDER BY id').all(value.id);},
    mutate(hash,action,payload){return transaction(()=>{
      const value=row(hash),state=decode(value);
      if(payload.generation!==state.generation)throw new RequestError('O cenário mudou em outra aba. Atualize antes de continuar.',409);
      if(action==='reset'){
        if(!scenarios.some(s=>s.id===payload.scenario))throw new RequestError('Escolha um cenário válido.');
        return {state:write(value,createStore(payload.scenario),true)};
      }
      if(action==='defer'||action==='resume')return {state:write(value,(action==='defer'?deferMission:resumeMission)(state,payload.missionId))};
      if(['variant-open','variant-interest','demo-variant-stock'].includes(action)){
        const allowed=['operation','productId','variantId','generation',...(action==='demo-variant-stock'?['preset']:[])];
        if(Object.keys(payload).some(key=>!allowed.includes(key)))throw new RequestError('A origem, a disponibilidade e a contagem são verificadas no servidor.');
        if(typeof payload.operation!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(payload.operation))throw new RequestError('Identificação da operação inválida.');
        const command=Object.fromEntries(allowed.filter(k=>k!=='generation'&&payload[k]!==undefined).sort().map(k=>[k,payload[k]])),fingerprint=digest(JSON.stringify({action,...command}));
        const existing=db.prepare('SELECT fingerprint FROM operations WHERE store_id=? AND operation_id=?').get(value.id,payload.operation);
        if(existing){if(existing.fingerprint!==fingerprint)throw new RequestError('Esta operação já foi usada com outro preenchimento.',409);const receipt=db.prepare('SELECT status FROM variant_receipts WHERE store_id=? AND operation_id=?').get(value.id,payload.operation);if(!receipt)throw new RequestError('Não foi possível recuperar a confirmação desta operação.',409);return {state,award:null,duplicate:true,status:receipt.status};}
        let result;try{result=action==='demo-variant-stock'?changeDemoVariant(state,command):registerVariantSignal(state,{...command,kind:action==='variant-interest'?'interest':'open'},{visitorId:`demo-${state.sessionId}`,at:new Date().toISOString()});}catch(error){throw new RequestError(error.message);}
        const saved=result.state===state?state:write(value,result.state);
        db.prepare('INSERT INTO operations(store_id,operation_id,fingerprint) VALUES(?,?,?)').run(value.id,payload.operation,fingerprint);
        db.prepare('INSERT INTO variant_receipts(store_id,operation_id,status) VALUES(?,?,?)').run(value.id,payload.operation,result.status);
        return {state:saved,status:result.status,award:null,duplicate:result.duplicate};
      }
      if(action==='followup'||action==='demo-evidence'){
        const allowed=action==='followup'?['operation','observationId','status','note','generation']:['operation','preset','generation'];
        if(Object.keys(payload).some(key=>!allowed.includes(key)))throw new RequestError('O acompanhamento usa os registros e as fontes do servidor.');
        if(typeof payload.operation!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(payload.operation))throw new RequestError('Identificação da operação inválida.');
        const command=Object.fromEntries(allowed.filter(k=>k!=='generation'&&payload[k]!==undefined).sort().map(k=>[k,payload[k]]));
        const fingerprint=digest(JSON.stringify({action,...command})),existing=db.prepare('SELECT fingerprint FROM operations WHERE store_id=? AND operation_id=?').get(value.id,payload.operation);
        if(existing){if(existing.fingerprint!==fingerprint)throw new RequestError('Esta operação já foi usada com outro preenchimento.',409);return {state,award:null,duplicate:true};}
        let result;try{result=action==='followup'?recordFollowup(state,{...command,at:new Date().toISOString()}):loadFollowupEvidence(state,command.preset);}catch(error){throw new RequestError(error.message);}
        const saved=result.duplicate?state:write(value,result.state);
        db.prepare('INSERT INTO operations(store_id,operation_id,fingerprint) VALUES(?,?,?)').run(value.id,payload.operation,fingerprint);
        return {state:saved,award:null,duplicate:result.duplicate};
      }
      if(action!=='save')throw new RequestError('Operação desconhecida.');
      const allowed=['operation','missionId','photo','physical','reason','material','description','decision','note','generation'];
      if(Object.keys(payload).some(key=>!allowed.includes(key)))throw new RequestError('A pontuação e os dados da loja são calculados no servidor.');
      if(typeof payload.operation!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(payload.operation))throw new RequestError('Identificação da operação inválida.');
      const command=Object.fromEntries(allowed.filter(key=>key!=='generation'&&payload[key]!==undefined).sort().map(key=>[key,payload[key]]));
      const fingerprint=digest(JSON.stringify(command));
      const existing=db.prepare('SELECT fingerprint FROM operations WHERE store_id=? AND operation_id=?').get(value.id,payload.operation);
      const previousProgress=progress(totalXP(state));
      if(existing){
        if(existing.fingerprint!==fingerprint)throw new RequestError('Esta operação já foi usada com outro preenchimento.',409);
        return {state,award:null,previousProgress,previousLevel:previousProgress.level,progress:previousProgress,duplicate:true};
      }
      // Ignore client timestamps. Mission identity, reward and evidence come from the saved server state.
      const result=improve(state,{...command,at:new Date().toISOString()});
      const saved=write(value,result.state),p=progress(totalXP(saved));
      db.prepare('INSERT INTO operations(store_id,operation_id,fingerprint) VALUES(?,?,?)').run(value.id,payload.operation,fingerprint);
      return {state:saved,award:result.awards[0],journey:groupForMission(saved,payload.missionId),previousProgress,previousLevel:previousProgress.level,progress:p,summary:retrospective(saved),milestone:milestoneBetween(previousProgress.level,p.level)};
    });}
  };
}

export function repository(){
  // The database belongs only to this independent app. Never read production credentials.
  if(!globalThis.__evolutionRepository)globalThis.__evolutionRepository=openRepository(path.resolve(process.cwd(),'.data','experiment.sqlite'));
  return globalThis.__evolutionRepository;
}
