import {evolutionEvents} from '../domain/presentation.mjs';
import {Brand,Icon} from './Icons';
import {useState} from 'react';
import {missionArea} from '../domain/journeys.mjs';
import {isDecision} from '../domain/recognition.mjs';
import {completedMissionTitle} from '../domain/mission-board.mjs';
import DecisionStatus from './DecisionStatus';
import {groupHeadline} from './mission-copy.mjs';

export default function EvolutionTimeline({history,products,journeys=[]}) {
  const [visible,setVisible]=useState(8),events=evolutionEvents(history,journeys);
  return <><ol className="history-list evolution-timeline">{events.slice(0,visible).map(event=>{
    const product=products.find(p=>p.id===(event.productId??event.id.split(':')[2]));
    const action=event.occurrence==='primeira-foto-capa'?'Primeira foto adicionada':event.occurrence==='primeira-contagem'?'Disponibilidade conferida':event.occurrence==='primeira-composicao'?'Composição informada':event.type==='detalhe'?'Foto de detalhe adicionada':event.type==='descricao'?'Informações da peça adicionadas':event.type==='revisao'?'Disponibilidade revisada':null;
    if(event.kind==='journey')return <li key={event.id} className="timeline-group"><div className="history-icon"><Icon name="missions"/></div><div><span className="eyebrow">{event.family} / grupo finalizado · <time dateTime={event.at}>{new Date(event.at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}</time></span><h3>{groupHeadline(journeys.find(group=>`journey:${group.id}`===event.id)??{title:event.title})}</h3><p>{event.total} {event.total===1?'cuidado concluído':'cuidados concluídos'} neste conjunto. +{event.earnedXP} XP já registrados pelos cuidados individuais.</p></div><span className="group-completed-mark"><Icon name="check"/></span></li>;
    return <li key={event.id} className={event.kind==='level'?'timeline-milestone':'timeline-improvement'}>
    <div className="history-icon">{event.kind==='level'?<Brand/>:<Icon name="check"/>}</div>
    <div><span className="eyebrow">{event.kind==='level'?'Conquista':event.type?missionArea(event):event.category} · <time dateTime={event.at}>{new Date(event.at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'long',year:'numeric'})}</time></span>
      <h3>{event.kind==='level'?`Sua loja chegou ao nível ${String(event.level).padStart(2,'0')}.`:isDecision(event)?`${completedMissionTitle(event)}: ${event.productName}.`:action&&product?`${action}: ${product.name}.`:event.title}</h3>
      <p>{event.kind==='level'?'Seus cuidados registrados abriram um novo capítulo.':event.evidence}</p>{isDecision(event)&&<DecisionStatus type={event.type}/>}
    </div>
    {event.kind==='level'?<span className="timeline-level" aria-hidden="true">{String(event.level).padStart(2,'0')}</span>:<span className="xp-tag">+{event.xp} XP</span>}
  </li>;})}</ol>{events.length>visible&&<button className="button secondary timeline-more" onClick={()=>setVisible(n=>n+8)}>Mostrar mais do meu caminho <Icon name="arrow"/></button>}</>;
}
