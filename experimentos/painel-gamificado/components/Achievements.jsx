import {achievements,milestoneLevels} from '../domain/achievements.mjs';
import {progress,totalXP} from '../domain/engine.mjs';
import {useState} from 'react';
import EvolutionEmblem,{emblemRanks} from './EvolutionEmblem';
import EmblemGallery from './EmblemGallery';
export default function Achievements({state,onOpen}){
  const [gallery,setGallery]=useState(false);
  const current=progress(totalXP(state)).level,unlocked=achievements(state);
  const levels=[...new Set([1,current-2,current-1,current,current+1,...milestoneLevels,...emblemRanks.filter(rank=>rank<=Math.max(10,current+10))].filter(level=>level>0))].sort((a,b)=>a-b);
  return <><section className="achievements achievements-v12" aria-labelledby="achievements-title"><div className="section-heading"><h2 id="achievements-title">Marcos do seu caminho</h2><button className="text-button" data-compare-emblems onClick={()=>setGallery(true)}>Ver evolução dos emblemas →</button></div><div className="achievement-grid level-collection" role="list" tabIndex={0} aria-label="Coleção de marcos; os próximos níveis aparecem de forma discreta">{levels.map(level=>{
    const achievement=unlocked.find(a=>a.level===level),special=milestoneLevels.includes(level),future=level>current;
    return <article key={level} role="listitem" className={`level-tile ${level===current?'current':future?'future':'earned'} ${special?`achievement-card ${achievement?'unlocked':'locked'}`:''}`} data-level-tile={level}><EvolutionEmblem level={level}/><span className="level-tile-label">Nível {String(level).padStart(2,'0')}</span><small>{level===current?'Seu nível atual':level===1?'O começo':future?'Próximo marco':'Alcançado'}</small>{achievement&&<button className="text-button" onClick={()=>onOpen(achievement)} aria-label={`Rever conquista do nível ${level}`}>Rever conquista</button>}</article>;
  })}</div></section>{gallery&&<EmblemGallery onClose={()=>setGallery(false)}/>}</>;
}
