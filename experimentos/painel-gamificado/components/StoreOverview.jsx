import {progress,totalXP} from '../domain/engine.mjs';
import XPProgress from './XPProgress';
import EvolutionEmblem from './EvolutionEmblem';
import {Icon} from './Icons';

function MetricIcon({type}){
  if(type==='people')return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="9" cy="7" r="3"/><path d="M3 21v-5a6 6 0 0 1 12 0v5m0-17a3 3 0 0 1 0 6m3 3a5 5 0 0 1 3 5v3"/></svg>;
  if(type==='eye')return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m4 20 1-5a9 9 0 1 1 4 4Zm4-12c1 4 2 5 6 6l2-2-3-2-1 1-2-2 1-1-2-2Z"/></svg>;
}

export function StoreEvolution({state,onNavigate}){
  const value=progress(totalXP(state));
  return <section className="store-evolution" aria-label="Sua evolução"><div className="store-evolution-copy"><span className="eyebrow">Sua evolução</span><XPProgress value={value}/><p>O cuidado que virou ação.</p></div><button className="store-emblem-button" onClick={()=>onNavigate('evolucao')} aria-label={`Ver minha evolução, nível ${value.level}`}><EvolutionEmblem level={value.level}/></button></section>;
}
export function StoreResults({state}){
  const summary=state.storeSummary;
  const metrics=[['people','Pessoas na vitrine','visitors'],['eye','Visitas às peças','productVisits'],['whatsapp','Cliques no WhatsApp','whatsappPeople']];
  return <details className="store-results quiet-results"><summary><span>Seus resultados <small>{summary?`Últimos ${summary.days} dias`:'Em acompanhamento'}</small></span><span>Ver resumo <Icon name="arrow"/></span></summary><div className="store-metrics">{metrics.map(([type,label,key])=><div key={key}><span className="metric-icon"><MetricIcon type={type}/></span><strong>{summary?summary[key].toLocaleString('pt-BR'):'—'}</strong><span>{label}</span></div>)}</div><p><Icon name="info"/>{summary?'Dados fictícios da vitrine. Cliques não confirmam vendas.':'Ainda não há dados da vitrine para este período.'}</p></details>;
}
