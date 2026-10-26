import {useState} from 'react';
import Dialog from './Dialog';
import EvolutionEmblem from './EvolutionEmblem';
import {emblemRanks,emblemTier,rankNames,rankFeatures} from './emblem-designs.mjs';
export default function EmblemGallery({onClose}){
  const [level,setLevel]=useState(100),[all,setAll]=useState(false);
  const tier=emblemTier(level),levels=all?Array.from({length:100},(_,i)=>i+1):emblemRanks;
  return <Dialog id="emblem-gallery" labelId="emblem-gallery-title" onClose={onClose}>
    <header className="emblem-gallery-header"><div><span className="eyebrow">Performance / coleção de emblemas</span><h2 id="emblem-gallery-title">Uma identidade para cada etapa.</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar comparação de emblemas">×</button></header>
    <p className="emblem-gallery-intro">Do primeiro escudo à insígnia centenária. Novas formas a cada cinco níveis; joias de progresso entre as faixas. A seta da marca acompanha toda a coleção.</p>
    <section className="emblem-inspector" aria-label="Prévia de um nível">
      <div className="emblem-inspector-art" data-selected-emblem={level}><EvolutionEmblem level={level}/><div className="emblem-compact-preview"><EvolutionEmblem level={level} compact/><span>No painel</span></div></div>
      <div className="emblem-inspector-copy"><span className="eyebrow">Nível {String(level).padStart(2,'0')} / {rankNames[tier]}</span><h3>{rankFeatures[tier]}</h3><label htmlFor="emblem-level-select">Escolha um nível<select id="emblem-level-select" value={level} onChange={event=>setLevel(Number(event.target.value))}>{Array.from({length:100},(_,i)=><option key={i+1} value={i+1}>Nível {String(i+1).padStart(2,'0')}</option>)}</select></label><p>Prévia visual. Consultar a coleção não altera o nível da sua loja.</p></div>
    </section>
    <div className="emblem-gallery-controls" role="group" aria-label="Exibir coleção"><button aria-pressed={!all} onClick={()=>setAll(false)}>21 desenhos-base</button><button aria-pressed={all} onClick={()=>setAll(true)}>Todos os 100 níveis</button></div>
    <div className="emblem-comparison-grid">{levels.map(item=><figure key={item} data-emblem-preview={item}><button className="emblem-preview-button" onClick={()=>{setLevel(item);document.querySelector('.emblem-inspector')?.scrollIntoView({block:'nearest'});}} aria-label={`Examinar emblema do nível ${item}`}><EvolutionEmblem level={item}/></button><figcaption><strong>Nível {String(item).padStart(2,'0')} · {rankNames[emblemTier(item)]}</strong><span>{rankFeatures[emblemTier(item)]}</span></figcaption></figure>)}</div>
    <p className="emblem-gallery-footer">21 desenhos-base, com numeração e joias de progresso que individualizam os 100 níveis. Suas conquistas e seu XP continuam na trajetória da loja.</p>
  </Dialog>;
}