import {useEffect,useRef,useState} from 'react';
import Dialog from './Dialog';
import {Icon} from './Icons';
export function IntelligenceMark(){return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m12 2 6 10-6 10-6-10Zm-6 10h12M12 2v20m0-15 3 5-3 5-3-5Z"/></svg>;}
const tabs=[['explain','Entender'],['decide','Decidir'],['execute','Executar']];
export default function IntelligencePanel({mission,request,onClose,onReturn,onUseDescription,onChooseDecision,revision}){
  const [tab,setTab]=useState('explain'),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[question,setQuestion]=useState(''),[facts,setFacts]=useState({cut:'',finish:'',colour:'',use:''}),[dirty,setDirty]=useState(false);
  const requestRef=useRef(request),control=useRef(null),sequence=useRef(0),alive=useRef(true),last=useRef({intent:'explain'}),heading=useRef(null),initialRevision=useRef(revision);
  requestRef.current=request;
  const outdated=revision!==initialRevision.current;
  async function run(intent,args={}){
    const id=++sequence.current;control.current?.abort();const abort=new AbortController();control.current=abort;
    const payload={intent,...args};last.current=payload;setBusy(true);setError('');
    try{
      const next=await requestRef.current({...payload,missionId:mission.id},abort.signal);
      if(alive.current&&id===sequence.current){setResult(next);if(intent==='execute')setDirty(false);}
    }catch(e){if(alive.current&&id===sequence.current&&e.name!=='AbortError')setError(e.message||'Não foi possível carregar a ajuda. Tente novamente.');}
    finally{if(alive.current&&id===sequence.current)setBusy(false);}
  }
  useEffect(()=>{alive.current=true;heading.current?.focus();run('explain');return()=>{alive.current=false;sequence.current++;control.current?.abort();};},[]);
  const data=result?.analysis;
  function changeTab(value){setTab(value);run(value);}
  function editFact(key,value){setFacts(current=>({...current,[key]:value}));setDirty(true);}
  return <Dialog id="intelligence" className="intelligence-panel" labelId="intelligence-title" onClose={onClose}>
    <header className="intelligence-header"><div className="intelligence-brand"><IntelligenceMark/><div><span className="eyebrow">Performance Intelligence</span><h2 id="intelligence-title" tabIndex={-1} ref={heading}>Uma ajuda para seu próximo passo.</h2></div></div><button className="icon-button" aria-label="Fechar assistente" onClick={onClose}>×</button></header>
    <div className="intelligence-body"><p className="intelligence-simulation">IA simulada · dados fictícios · sugestões para sua revisão</p><p className="intelligence-entity">{result?.context.entityName??mission.productName??mission.title}</p>
      <div className="intelligence-tabs" role="group" aria-label="Tipo de ajuda">{tabs.map(([id,label])=><button key={id} disabled={busy||outdated} aria-pressed={tab===id} onClick={()=>changeTab(id)}>{label}</button>)}</div>
      {outdated?<p className="inline-error" role="alert">A loja recebeu uma atualização. Volte à missão para consultar os dados atuais.</p>:<>
        {busy&&<p className="intelligence-loading" role="status">Preparando uma orientação para este cuidado…</p>}
        {error&&<div className="inline-error" role="alert" data-intelligence-error><p>{error}</p><button className="text-button" disabled={busy} onClick={()=>run(last.current.intent,last.current)}>Tentar novamente</button></div>}
        {data&&<div className="intelligence-response" data-intelligence-response aria-busy={busy}>
          <section className="intelligence-observed"><span className="eyebrow">O que sabemos</span><p>{data.observed}</p>{mission.type==='esgotado'&&<p>Esta variação está indisponível agora.</p>}{result.context.period&&<small>Período concluído: {new Date(result.context.period.start).toLocaleDateString('pt-BR',{timeZone:'UTC'})} a {new Date(Date.parse(result.context.period.end)-1).toLocaleDateString('pt-BR',{timeZone:'UTC'})}.</small>}</section>
          <section className="intelligence-suggestion"><span className="eyebrow">Minha sugestão</span>{tab==='decide'&&data.options.length?<div className="intelligence-choices">{data.options.map(option=><article key={option.id}><h3>{option.label}</h3><p>{option.advice}</p>{onChooseDecision&&<button className="text-button" disabled={busy||Boolean(error)} data-assistant-choice={option.id} onClick={()=>onChooseDecision(option.id)}>Escolher no formulário<Icon name="arrow"/></button>}</article>)}</div>:<p>{data.execution}</p>}{mission.type==='esgotado'&&<p className="intelligence-caution">Ainda faltam custo, margem e confirmação do fornecedor para decidir sobre reposição.</p>}</section>
          <details className="intelligence-reason" data-intelligence-reason><summary>Por que essa sugestão?</summary><section><span className="eyebrow">Por que merece atenção</span><p>{data.why}</p></section><section className="intelligence-unknown"><span className="eyebrow">O que ainda não sabemos</span><ul>{data.unknown.map(text=><li key={text}>{text}</li>)}</ul></section>{tab==='decide'&&result.context.alternatives.length>0&&<section className="intelligence-alternatives"><h3>Outras peças disponíveis na mesma categoria</h3><ul>{result.context.alternatives.map(p=><li key={`${p.name}:${p.size}`}>{p.name} · tamanho {p.size}</li>)}</ul><small>Confira se atendem à cliente. Mesma categoria não comprova equivalência.</small></section>}</details>
        </div>}
        {tab==='execute'&&mission.type==='descricao'&&<form className="description-help" onSubmit={e=>{e.preventDefault();run('execute',{facts});}}><h3>Conte o que você sabe da peça.</h3><p>A sugestão usa estas características. Informe somente o que você conferiu.</p>{[['cut','Modelagem','reta, com cintura alta'],['finish','Acabamento','costuras reforçadas'],['colour','Cor','bege'],['use','Uso','ocasiões casuais']].map(([key,label,placeholder])=><label key={key} htmlFor={`ai-${key}`}>{label}{key!=='cut'&&<small> · opcional</small>}<input id={`ai-${key}`} value={facts[key]} minLength={key==='cut'?3:undefined} maxLength={160} required={key==='cut'} disabled={busy} placeholder={placeholder} onChange={e=>editFact(key,e.target.value)}/></label>)}{result?.context.product?.material&&<p className="field-help">Composição cadastrada: {result.context.product.material}.</p>}<button className="button secondary" disabled={busy} type="submit">Preparar sugestão</button>{data?.description&&<div className="description-draft" data-description-draft><span className="eyebrow">Rascunho para revisar</span><p>{data.description}</p>{dirty?<p className="field-help">As características mudaram. Prepare uma nova sugestão antes de usá-la.</p>:<button className="button primary" type="button" disabled={busy||Boolean(error)} data-use-description onClick={()=>onUseDescription?.(data.description)}>Levar ao formulário<Icon name="arrow"/></button>}<small>Este texto ainda não foi salvo na peça.</small></div>}</form>}
        {data&&<form className="intelligence-question" onSubmit={e=>{e.preventDefault();run('question',{question});}}><label htmlFor="intelligence-question">Uma dúvida sobre este cuidado?<textarea id="intelligence-question" minLength={5} maxLength={240} required rows={2} value={question} disabled={busy} onChange={e=>setQuestion(e.target.value)} placeholder="Ex.: preciso repor esta peça?"/></label><p className="field-help">Use apenas informações da peça. Não informe dados de clientes.</p><button className="text-button" type="submit" disabled={busy}>Perguntar sobre este cuidado<Icon name="arrow"/></button>{data.followup&&<p className="intelligence-followup" role="status" data-intelligence-followup>{data.followup}</p>}</form>}
      </>}
    </div>
    <footer className="intelligence-footer"><span>Você decide. O cuidado é salvo na missão.</span><button className="button primary" onClick={onReturn??onClose}>{onReturn?({esgotado:'Analisar reposição',campanha:'Analisar campanha',buscas:'Analisar busca'}[mission.type]??mission.action):'Voltar à missão'}<Icon name="arrow"/></button></footer>
  </Dialog>;
}
