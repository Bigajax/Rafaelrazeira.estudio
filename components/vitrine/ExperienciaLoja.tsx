"use client";

import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import { mpTrack } from "./tracking";
import s from "./landing.module.css";

export type LojaExemplo = "fulltime" | "japa";
const lojas = {
  fulltime: {
    nome: "Full Time Skateboards", curto: "Full Time", ramo: "Skate shop · Curitiba",
    url: "https://fulltimeskateboards.com.br", dominio: "fulltimeskateboards.com.br",
    produto: "Camiseta Full Time · FT Peito",
    mensagem: "Oi, Full Time! Quero separar esta peça:\n\nCamiseta Full Time – FT Peito\nTamanho: P\nQuantidade: 1\nComo receber: retirar na loja\n\nAinda tem?",
  },
  japa: {
    nome: "Japa Modas", curto: "Japa Modas", ramo: "Moda masculina · Ribeirão Preto",
    url: "https://japamodasurf.com.br", dominio: "japamodasurf.com.br",
    produto: "Tênis Nike Journey Run",
    mensagem: "Oi! Quero este tênis que vi no site:\n\nTênis Nike Journey Run preto e branco\n\nAinda tem disponível?",
  },
} as const;

function Seta() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>; }

export function Demonstracao({ loja }: { loja: LojaExemplo }) {
  const l = lojas[loja];
  return <div className={s.demonstracao} data-loja={loja}>
    <div className={s.demoCabeca}><span className={s.demoSerial}>Feita no estúdio / {loja === "fulltime" ? "01" : "02"}</span><span className={s.demoNoAr}><span /> No ar</span></div>
    <div className={s.demoTitulo}><span className={s.demoPalavra}>Sua loja.<br /><em>Seu jeito.</em></span><span className={s.demoAssinatura} aria-hidden="true"><Image src="/assets/favicon.png" width={36} height={36} alt="" /><span>Design com<br />identidade</span></span></div>
    <div className={s.demoComposicao}>
      <div className={s.telefone}><Image src={`/assets/vitrine/${loja}-listagem.webp`} width={780} height={1520} priority sizes="(max-width: 600px) 205px, 212px" alt={`Catálogo real da ${l.nome}, com fotos e preços dos produtos`} /></div>
    </div>
    <div className={s.demoEtiqueta}><span>Projeto de cliente</span><b>{l.curto}</b><small>{l.ramo}</small></div>
    <a className={s.demoVer} href="#como-funciona" data-cta="demo_como_funciona" data-cta-dest="section"><span>Ver como funciona<small>Da escolha ao WhatsApp, em 3 passos.</small></span><Seta /></a>
  </div>;
}

export function ComoFunciona({ loja }: { loja: LojaExemplo }) {
  const l = lojas[loja];
  const [etapa, setEtapa] = useState(0);
  const etapas = [
    { titulo: "Encontra o que procura.", texto: "A cliente entra na sua vitrine e explora o catálogo. Categorias e busca ajudam a encontrar a peça certa.", curto: "Catálogo" },
    { titulo: "Escolhe com tudo à vista.", texto: "Abre a peça, vê as fotos e as informações disponíveis. Na Full Time, também escolhe o tamanho antes de chamar.", curto: "A peça" },
    { titulo: "Chega com a peça na conversa.", texto: "O botão abre seu WhatsApp com a mensagem preenchida e o link do produto. A cliente confirma o envio e você segue o atendimento.", curto: "WhatsApp" },
  ];
  function escolher(i: number) { setEtapa(i); mpTrack("DemoVitrine", { loja, etapa: i + 1 }); }
  function teclado(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let proxima = i;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") proxima = (i + 1) % 3;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") proxima = (i + 2) % 3;
    else if (e.key === "Home") proxima = 0;
    else if (e.key === "End") proxima = 2;
    else return;
    e.preventDefault(); escolher(proxima); document.getElementById(`passo-${proxima}`)?.focus();
  }
  return <section id="como-funciona" className={`${s.secao} ${s.como}`} aria-labelledby="como-titulo" data-loja={loja}>
    <div className={s.secaoCabeca}><div><p className={s.rotulo}>01 / Da escolha à conversa</p><h2 id="como-titulo">Sua vitrine trabalha.<br /><em>Você atende.</em></h2></div><p>Veja o caminho na {l.nome}. Toque nas etapas para acompanhar.</p></div>
    <div className={s.comoLayout}>
      <div className={s.passos} role="tablist" aria-label={`Como funciona a vitrine da ${l.nome}`} aria-orientation="vertical">
        {etapas.map((p, i) => <button key={p.curto} id={`passo-${i}`} type="button" role="tab" aria-selected={etapa === i} aria-controls="passo-tela" tabIndex={etapa === i ? 0 : -1} onClick={() => escolher(i)} onKeyDown={e => teclado(e,i)}><span className={s.passoNumero}>0{i + 1}</span><span><b className={s.passoTitulo}>{p.titulo}</b><span className={s.passoCurto}>{p.curto}</span><span className={s.passoDescricao}>{i === 1 && loja === "japa" ? "Abre a peça e vê fotos, preço e descrição. As informações ficam juntas, antes de chamar a loja." : p.texto}</span></span><Seta /></button>)}
      </div>
      <div id="passo-tela" role="tabpanel" aria-labelledby={`passo-${etapa}`} tabIndex={0} className={s.comoTela}>
        <div className={s.comoTelaCabeca}><span>{l.curto}</span><span>0{etapa + 1} / 03</span></div>
        <div className={s.passoMobile}><h3>{etapas[etapa].titulo}</h3><p>{etapa === 1 && loja === "japa" ? "Fotos, preço e descrição juntos, antes de chamar a loja." : etapas[etapa].texto}</p></div>
        <div className={`${s.telefone} ${s.comoTelefone}`}>
          {etapa < 2 ? <Image key={etapa} src={`/assets/vitrine/${loja}-${etapa === 0 ? "listagem" : "peca"}.webp`} width={780} height={1520} sizes="(max-width: 600px) 230px, 250px" alt={`${etapas[etapa].curto}: captura real da vitrine da ${l.nome}`} /> : <div className={s.conversa}><div className={s.conversaCabeca}><span aria-hidden="true">←</span><span className={s.conversaAvatar}>{loja === "fulltime" ? "FT" : "JM"}</span><b>{l.curto}<small>Prévia da mensagem</small></b></div><span className={s.conversaAviso}>Exemplo de mensagem preenchida</span><div className={s.conversaMensagem}><p>{l.mensagem}</p><span className={s.conversaLink}>↗ Link da peça na vitrine</span></div><p className={s.conversaNota}>A cliente confirma o envio no WhatsApp. Você combina pagamento e entrega.</p></div>}
        </div>
        <div className={s.comoControles}><p>{etapas[etapa].curto}</p><button type="button" onClick={() => escolher((etapa + 1) % 3)} aria-label={etapa === 2 ? "Voltar ao catálogo" : `Ver etapa: ${etapas[etapa + 1].curto}`}>{etapa === 2 ? "Ver de novo" : "Próximo passo"}<Seta /></button></div>
      </div>
    </div>
    <div className={s.comoRodape}><p>Uma loja real. Uma identidade própria.<small>Capturas da vitrine. Mensagem ilustrativa, sem envio.</small></p><a href={l.url} target="_blank" rel="noreferrer" data-cta={`case_${loja}_como`} data-cta-dest="site">Visitar {l.curto}<Seta /></a></div>
  </section>;
}
