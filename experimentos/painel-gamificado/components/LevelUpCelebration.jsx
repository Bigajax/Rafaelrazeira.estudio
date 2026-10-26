import {useEffect,useRef} from 'react';
import EvolutionEmblem from './EvolutionEmblem';
import XPProgress from './XPProgress';
import Retrospective from './Retrospective';
import JourneyProgress from './JourneyProgress';

export default function LevelUpCelebration({result}) {
  const heading=useRef(null);
  useEffect(()=>{
    // Keep the user's focus if they have already moved to a close/continue action.
    const active=document.activeElement;
    if(!active||active===document.body||active.id==='saved-title'||active.id==='editor')heading.current?.focus({preventScroll:true});
  },[]);
  return <section className={`level-up-celebration ${result.milestone?'major-milestone':''}`} aria-labelledby="level-title">
    <span className="eyebrow celebration-kicker">{result.milestone?'Uma nova conquista':'Novo nível'}</span>
    <EvolutionEmblem level={result.progress.level}/>
    <div className="level-route"><span>Nível {String(result.previousProgress.level).padStart(2,'0')}</span><span aria-hidden="true">→</span><strong>Nível {String(result.progress.level).padStart(2,'0')}</strong></div>
    <h3 id="level-title" tabIndex={-1} ref={heading}>Você alcançou um novo nível.</h3>
    <p>Sua loja continua evoluindo.</p>
    {result.summary&&<Retrospective summary={result.summary}/>}
    <span className="achievement-xp">+{result.award.xp} XP conquistados</span>
    <div className="reward-result level-up"><XPProgress value={result.progress}/><p>{result.progress.within} de {result.progress.needed} XP no novo nível. Seu progresso continua.</p></div>
    {result.journey&&<div className="celebration-journey"><span className="eyebrow">{result.journey.complete?'Grupo finalizado':'Seu cuidado avançou'}</span><JourneyProgress group={result.journey} compact/></div>}
  </section>;
}
