"use client";

import { useId } from "react";
import { MESES_LONGOS, formatar, situacaoDoDegrau, type Degrau } from "@/lib/plano/tipos";
import p from "@/app/(pt)/crm/plano.module.css";

const CHAO = 380;
const PICO = { x: 250, y: 58 };
const faceEsq = (y: number) => ((400 - y) * PICO.x) / (400 - PICO.y);
const crista = (y: number) => PICO.x + ((y - PICO.y) * 42) / (400 - PICO.y);

export function Subida({ ano, ate, ateFechado = ate, degraus, recebido, vendido = {}, visao, horizonte }: {
  ano: number; ate: number; ateFechado?: number; degraus: Degrau[];
  recebido: Partial<Record<number, number>>; vendido?: Partial<Record<number, number>>;
  visao: string | null; horizonte: number | null;
}) {
  const gradiente = useId();
  const lista = [...degraus].filter((d) => Number.isFinite(d.patamar) && d.patamar > 0).sort((a, b) => a.patamar - b.patamar || a.meses - b.meses);
  const marcos = lista.map((d, i) => {
    // Espaço próprio para cada marco, inclusive quando os valores são iguais.
    const y = CHAO - ((i + 1) / (lista.length + 1)) * 280;
    const x = faceEsq(y) + (crista(y) - faceEsq(y)) * (i % 2 ? .72 : .38);
    return { d, x, y, s: situacaoDoDegrau(d, recebido, ate, ateFechado) };
  });
  const indice = marcos.findIndex((m) => !m.s.destravado);
  const alvo = marcos[indice];
  const conquistados = marcos.filter((m) => m.s.destravado).length;
  const doMes = Number.isFinite(recebido[ate]) ? recebido[ate]! : 0;
  const anterior = indice > 0 ? marcos[indice - 1] : { x: 45, y: CHAO };
  const fracao = alvo?.s.progresso ?? 0;
  const voce = !marcos.length ? { x: 45, y: CHAO } : !alvo ? { x: PICO.x - 4, y: PICO.y + 16 } : { x: anterior.x + (alvo.x - anterior.x) * fracao, y: anterior.y + (alvo.y - anterior.y) * fracao };
  const pontos = [{ x: 45, y: CHAO }, ...marcos, { x: PICO.x - 4, y: PICO.y + 16 }];
  const trilha = pontos.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ");
  return <div className={p.subida}>
    <div className={p.subidaTexto}>
      <p className={p.subidaAno}>SUA TRILHA DE {ano} · {conquistados}/{marcos.length} MARCOS CONFIRMADOS</p>
      <h3 className={p.subidaFrase}>{!marcos.length ? "Qual será sua próxima conquista?" : !alvo ? "Todos os marcos foram alcançados." : alvo.d.nome}</h3>
      <p className={p.subidaApoio}>{!alvo ? marcos.length ? "As conquistas foram confirmadas pelos meses já concluídos." : "Defina marcos de crescimento: equipamento, estrutura ou equipe, ligados a um valor recebido por mês." : alvo.s.provisorio ? "Patamar atingido no mês em andamento. A conquista será confirmada depois que o mês terminar." : alvo.d.meses > 1 ? `${alvo.s.atuais} de ${alvo.d.meses} meses concluídos seguidos com pelo menos ${formatar(alvo.d.patamar, "R$")}.` : `${formatar(Math.max(0, alvo.d.patamar - doMes), "R$")} para alcançar o patamar deste mês.`}</p>
      <dl className={p.altitude}><div><dt>{ate ? `Recebido em ${MESES_LONGOS[ate - 1]}` : "Ano ainda não iniciado"}</dt><dd>{ate ? formatar(doMes, "R$") : "A começar"}</dd></div>{alvo && <div><dt>Patamar do próximo marco</dt><dd>{formatar(alvo.d.patamar, "R$")} / mês</dd></div>}</dl>
      <p className={p.subidaNota}>Recebimentos menos devoluções, nas datas do Caixa. Contratos assinados não somam conquistas. O marcador representa o avanço pelos marcos.{ate > 0 && vendido[ate] !== undefined ? ` Contratado no mês: ${formatar(vendido[ate], "R$")}.` : ""}</p>
      {visao && <p className={p.subidaVisao}>O destino{horizonte ? ` em ${horizonte}` : ""}: {visao}</p>}
    </div>
    <div className={p.montanha}>
      <svg viewBox="0 0 640 400" role="img" aria-label={`Montanha de ${ano}: ${conquistados} de ${marcos.length} marcos confirmados${alvo ? `; próximo: ${alvo.d.nome}` : ""}`}>
        <defs><linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a4fbc" /><stop offset="1" stopColor="#5e86de" /></linearGradient></defs>
        <rect width="640" height="400" fill={`url(#${gradiente})`} />
        <path d="M0 262 Q70 226 140 246 T290 214 T450 236 T640 204 L640 400 L0 400 Z" className={p.serraLonge} />
        <path d="M0 318 L70 272 L120 296 L186 250 L240 290 L400 300 L468 246 L530 288 L640 260 L640 400 L0 400 Z" className={p.serra} />
        <path d="M250 58 L446 400 L292 400 Z" className={p.faceSombra} />
        <path d="M250 58 L292 400 L0 400 Z" className={p.faceLuz} />
        <path d="M250 58 L294 114 L292 140 L284 128 L270 146 L262 130 L260 142 Z" className={p.neveSombra} />
        <path d={`M250 58 L${faceEsq(122)} 122 L218 116 L212 136 L230 126 L240 144 L${crista(142)} 142 Z`} className={p.neve} />
        <path d={trilha} className={p.trilha} />
        {marcos.map((m, i) => <g key={i} className={m.s.destravado ? p.campoFeito : i === indice ? p.campoProximo : p.campoLonge}><title>{`${i + 1}. ${m.d.nome}: ${formatar(m.d.patamar, "R$")} / ${m.d.meses} mes(es)${m.s.destravado ? ", confirmado" : ", pendente"}`}</title><line x1={m.x} y1={m.y} x2={m.x} y2={m.y - 17} className={p.mastro} /><path d={`M${m.x} ${m.y - 17} L${m.x + 14} ${m.y - 12} L${m.x} ${m.y - 7} Z`} className={p.bandeira} /><circle cx={m.x} cy={m.y} r="4" className={p.base} /><text x={m.x + 22} y={m.y - 8} className={p.numeroMarco}>{i + 1}</text></g>)}
        <line x1="250" y1="58" x2="250" y2="28" className={p.mastroCume} /><path d="M250 28 L274 35 L250 42 Z" className={p.cumeBandeira} />
        <g className={p.voce} data-marcador-montanha style={{ ["--sobe" as string]: `${CHAO - voce.y}px` }}><circle cx={voce.x} cy={voce.y} r="10" className={p.voceHalo} /><circle cx={voce.x} cy={voce.y} r="6" className={p.voceBola} /></g>
        <text x="425" y="340" className={p.legendaMontanha}>SEU AVANÇO</text><circle cx="433" cy="357" r="5" className={p.voceBola} /><text x="446" y="361" className={p.legendaMontanha}>progresso atual</text>
      </svg>
    </div>
    {marcos.length > 0 && <ol className={p.marcosLista} aria-label="Marcos da Montanha">{marcos.map((m, i) => <li key={i} data-marco-confirmado={m.s.destravado} data-marco-proximo={i === indice}><span className={p.marcoNumero}>{m.s.destravado ? "✓" : i + 1}</span><div><b>{m.d.nome}</b><span>{formatar(m.d.patamar, "R$")} / mês{m.d.meses > 1 ? ` por ${m.d.meses} meses seguidos` : " em um mês concluído"}</span><small>{m.s.destravado ? `Confirmado em ${MESES_LONGOS[m.s.quando! - 1]}` : m.s.provisorio ? "Atingido provisoriamente; mês em andamento" : `${m.s.atuais}/${m.d.meses} meses concluídos${i === indice ? " · próximo marco" : ""}`}</small></div></li>)}</ol>}
  </div>;
}
