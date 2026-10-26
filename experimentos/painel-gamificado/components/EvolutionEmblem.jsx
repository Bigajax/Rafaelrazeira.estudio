import {useId} from 'react';
import {advancedRanks,emblemTier} from './emblem-designs.mjs';
export {emblemRanks,emblemTier} from './emblem-designs.mjs';

// Evolve the silhouette, not just the level number. The brand arrow remains
// inside the central gem, and every rank has a clear compact silhouette.


const arrow='M11.55 5.15 6.65 12.15 8.95 12.6 11.55 8.7ZM12.45 5.15 17.35 12.15 15.05 12.6 12.45 8.7ZM9.15 13H11.55V17.1C11.55 17.84 11.62 18.05 11.85 18.22V18.55H8.7V18.22C9.61 18.16 9.85 17.81 9.85 17.1V13.75H9.15ZM14.85 13H12.45V17.1C12.45 17.84 12.38 18.05 12.15 18.22V18.55H15.3V18.22C14.39 18.16 14.15 17.81 14.15 17.1V13.75H14.85Z';
const shields={1:'M120 25 201 72v96l-81 48-81-48V72Z',15:'M120 26 192 68v90l-23 31-49 35-49-35-23-31V68Z',20:'M120 30 190 61l7 14-7 91-70 58-70-58-7-91 7-14Z',25:'M120 32 183 60l16 21-8 80-21 32-50 35-50-35-21-32-8-80 16-21Z'};
const wing='M52 86 13 63l9 36 28 22-35-13 13 33 25 16-27-7 15 29 20 8Z';
const leaves='M48 64C14 91 12 169 63 203M34 88 12 73l3 25 16 13Zm-9 37L4 112l7 26 15 9Zm1 30L6 145l13 24 18 4Zm15 27L20 177l22 21 17-1Z';

export default function EvolutionEmblem({level=1,compact=false}){
  const tier=emblemTier(level),id=useId().replace(/:/g,''),surface=`crest-face-${id}`,metal=`crest-metal-${id}`;
  const advanced=advancedRanks[tier],shield=advanced?.shield??shields[tier]??shields[1];
  const step=Math.min(4,Math.max(0,level-tier));
  return <div className={`evolution-emblem emblem-tier-${tier} ${advanced?'emblem-advanced':''} ${level>=100?'emblem-three-digits':''} ${compact?'emblem-compact':''}`} data-emblem-rank={tier} data-emblem-step={step} aria-hidden="true">
    <svg className="emblem-orbit" viewBox="0 0 240 240" fill="none">
      <defs>
        <linearGradient id={surface} x1="54" y1="36" x2="180" y2="211" gradientUnits="userSpaceOnUse"><stop className="crest-light"/><stop offset="1" className="crest-deep"/></linearGradient>
        <linearGradient id={metal} x1="52" y1="22" x2="186" y2="222" gradientUnits="userSpaceOnUse"><stop className="metal-light"/><stop offset=".38" className="metal-mid"/><stop offset=".55" className="metal-light"/><stop offset="1" className="metal-deep"/></linearGradient>
      </defs>
      {tier>=5&&<path pathLength="1" className="crest-cage emblem-detail" d="M120 10 218 66v110l-98 57-98-57V66Zm0 15v-15M39 72l-17-6m179 6 17-6M39 168l-17 8m179-8 17 8m-98 40v17" stroke={`url(#${metal})`}/>}
      {tier===10&&<><path className="crest-outer-facets emblem-detail" d="m120 3 108 62v111l-108 62L12 176V65Zm0 7L12 65l10 111 98 57 98-57 10-111-108-55" stroke={`url(#${metal})`}/><path className="crest-flying-facets" d="m22 129-14 20 31-10Zm196 0 14 20-31-10Z"/></>}
      {tier===15&&<g className="rank-mantle" fill={`url(#${metal})`} stroke="var(--crest-metal-deep)" strokeWidth="1.5"><path d={wing}/><path d={wing} transform="translate(240 0) scale(-1 1)"/><path className="rank-cut" d="m23 84 28 24m-28 20 30 21m-13 17 18 9m159-91-28 24m28 20-30 21m13 17-18 9"/></g>}
      {tier===20&&<g className="rank-laurel" fill={`url(#${metal})`} stroke="var(--crest-metal-mid)" strokeWidth="2"><path d={leaves}/><path d={leaves} transform="translate(240 0) scale(-1 1)"/><path className="rank-crown" d="m81 35-6-23 25 16 20-24 20 24 25-16-6 23Z"/></g>}
      {tier===25&&<g className="rank-regalia" fill={`url(#${metal})`} stroke="var(--crest-metal-deep)" strokeWidth="1.5"><path d="m54 81-41-39 7 38 28 29L5 85l11 35 34 24-37-10 23 34 23 11Zm132 0 41-39-7 38-28 29 43-24-11 35-34 24 37-10-23 34-23 11Z"/><path className="rank-cut" d="m22 64 28 34m-33 9 33 26m-20 18 22 14m166-101-28 34m33 9-33 26m20 18-22 14"/><path d="m54 164-23 12 32 35 57 26 57-26 32-35-23-12-66 58Z"/><path className="rank-crown" d="m73 38-5-30 24 16 10-21 18 20 18-20 10 21 24-16-5 30Z"/><path className="rank-jewel" d="m78 35 7 7 7-7-7-7Zm70 0 7 7 7-7-7-7Z"/></g>}
      {advanced&&<g className="rank-advanced" fill={`url(#${metal})`} stroke="var(--crest-metal-deep)" strokeWidth="1.5" strokeLinejoin="round">
        {advanced.frame&&<path className="rank-frame" d={advanced.frame} fill="none" stroke={`url(#${metal})`} strokeWidth={tier===100?3:2}/>}
        {advanced.left&&<><path d={advanced.left}/><path d={advanced.left} transform="translate(240 0) scale(-1 1)"/></>}
        {advanced.bottom&&<path d={advanced.bottom}/>}
        {advanced.top&&<path className="rank-crown" d={advanced.top}/>}
        {tier>=50&&<path className="rank-jewel" d="m120 7 5 7-5 7-5-7Z"/>}
      </g>}
      <path className="crest-face" d={shield} fill={`url(#${surface})`}/>
      <path className="crest-facet emblem-detail" d="m120 30 75 43-75 44-75-44Z"/>
      <path className="crest-side-facet emblem-detail" d="m47 73 24 76 49 73-73-59Zm146 0-24 76-49 73 73-59Z"/>
      <path className="crest-lattice emblem-detail" d="m47 73 73 44 73-44m-146 90 73-46 73 46M120 30v87m0 0v105"/>
      <path pathLength="1" className="crest-rim" d={shield} style={{stroke:`url(#${metal})`}}/>
      <path className="crest-inner-rim emblem-detail" d={shield} transform="translate(120 124) scale(.87) translate(-120 -124)" style={{stroke:`url(#${metal})`}}/>
      {tier>=15&&<g className="rank-shoulders" fill={`url(#${metal})`}><path d="m47 72 11 14v67l14 27-23-20Z"/><path d="m193 72-11 14v67l-14 27 23-20Z"/></g>}
      <g className="crest-gem">
        <path className="gem-outline" d="m120 13 30 47-30 43-30-43Z" stroke={`url(#${metal})`}/>
        <path className="gem-light" d="m120 22 22 38-22 32-22-32Z"/><path className="gem-deep" d="M120 22v70l22-32Z"/>
        {tier>=5&&<path className="gem-pink" d="m94 49 26 37 26-37-7 24-19 30-19-30Z"/>}
        <path className="gem-facet emblem-detail" d="m120 22-22 38 22 7 22-7Z"/>
      </g>
      <g className="crest-arrow" transform="translate(110 41) scale(.8333)"><path d={arrow}/></g>
      <g className="crest-signature"><path d={tier===1?'m120 205-3 4 3 4 3-4Z':tier===5?'m120 204-5 5 5 5 5-5Z':'m120 203-7 8 7 8 7-8Z'}/></g>
      {step>0&&<g className="rank-progress" fill={`url(#${metal})`}>{Array.from({length:step},(_,i)=><path key={i} d={`m${120+(i-(step-1)/2)*12} 188 3 4-3 4-3-4Z`}/>)}</g>}
    </svg>
    <span className="emblem-level" key={level}>{String(level).padStart(2,'0')}</span>
  </div>;
}
