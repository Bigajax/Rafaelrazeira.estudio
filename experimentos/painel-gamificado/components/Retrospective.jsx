export default function Retrospective({summary}){
  if(summary.decisions>0)return <div className="retrospective" aria-label="Cuidados registrados até esta conquista"><div><strong>{summary.records}</strong><span>Cuidados registrados</span></div><div><strong>{summary.improvements}</strong><span>Melhorias realizadas</span></div><div><strong>{summary.decisions}</strong><span>Decisões registradas</span></div></div>;
  return <div className="retrospective" aria-label="Melhorias registradas até esta conquista"><div><strong>{summary.improvements}</strong><span>Melhorias concluídas</span></div><div><strong>{summary.products}</strong><span>Peças aprimoradas</span></div><div><strong>{summary.stockReviews}</strong><span>Conferências de estoque</span></div></div>;
}
