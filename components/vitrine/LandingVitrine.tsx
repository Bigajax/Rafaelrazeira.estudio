"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Selo } from "@/components/performance/Selo";
import { CampoIsca, useGuardaDeFormulario } from "@/components/form-guarda";
import { mascararWhatsapp, whatsappValido } from "@/components/telefone";
import { perfilParaProposta } from "@/lib/vitrine-proposta";
import { projetos } from "@/data/portfolio";
import { ligarAncoras } from "./ancora";
import { initTracking, mpTrack } from "./tracking";
import { pedirPropostaVitrine } from "./proposta-flow";
import s from "./landing.module.css";
import { Demonstracao, ComoFunciona } from "./ExperienciaLoja";

export type OfertaLanding = {
  total: number; entrada: number; saldo: number; avista: number | null;
  performance: number; pagamento: number; ecommerce: number; ecommerceMensal: number;
};
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: Number.isInteger(v) ? 0 : 2 });
export const recursos = [
  ["busca", "Encontre a peça certa", "Categorias, busca e filtros por tamanho ajudam o cliente a chegar ao que procura."],
  ["peca", "Escolha com as informações à vista", "Fotos, preço, descrição e tamanhos disponíveis juntos na página da peça."],
  ["whats", "Receba a conversa com a peça escolhida", "O cliente toca no botão e abre o WhatsApp com o produto e o tamanho na mensagem."],
  ["painel", "Atualize no seu tempo", "Cadastre peças, ajuste preços e estoque e troque os banners pelo painel da loja."],
] as const;

export function Icone({ tipo }: { tipo: string }) {
  const desenhos: Record<string, ReactNode> = {
    busca: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    peca: <><path d="M3 3h9l9 9-9 9-9-9Z" /><circle cx="8" cy="8" r="1" /></>,
    whats: <><path d="M5 18.5 3 22l5-1.5A9 9 0 1 0 5 18.5Z" /><path d="M8 7c0 4 2 7 7 9l2-2-3-2-1 1c-2-1-3-2-3-4l1-1-2-2Z" /></>,
    painel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11M13 13h4M13 16h3" /></>,
    grafico: <><path d="M4 3v17h17M7 14l4-4 4 2 6-7" /></>,
    seta: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{desenhos[tipo] ?? desenhos.seta}</svg>;
}
export function Botao({ children = "Quero minha vitrine", lugar, secundario = false, href = "#contratar" }: { children?: ReactNode; lugar: string; secundario?: boolean; href?: string }) {
  return <a className={secundario ? s.botaoSecundario : s.botao} href={href} data-cta={lugar} data-cta-dest={href === "#oferta" ? "oferta" : "form"}>{children}<Icone tipo="seta" /></a>;
}

export function Painel() {
  const [aba, setAba] = useState("inicio");
  const abas = [{ id: "inicio", titulo: "Início" }, { id: "pecas", titulo: "Peças e estoque" }, { id: "desempenho", titulo: "Desempenho" }];
  const indice = abas.findIndex(a => a.id === aba);
  return <section id="painel" className={`${s.secao} ${s.painel}`} aria-labelledby="painel-titulo">
    <div className={s.secaoCabeca}><div><p className={s.rotulo}>02 / O painel da sua loja</p><h2 id="painel-titulo">Você mesma atualiza.</h2></div><p>Chegou uma peça, mudou o preço, acabou um tamanho? Você atualiza pelo painel e a vitrine acompanha.</p></div>
    <div className={s.painelLayout}><div>
      <div role="tablist" aria-label="Telas do painel" className={s.abas}>{abas.map((a, i) => <button key={a.id} id={`aba-${a.id}`} type="button" role="tab" aria-selected={aba === a.id} aria-controls="tela-painel" tabIndex={aba === a.id ? 0 : -1} onClick={() => setAba(a.id)} onKeyDown={e => { let next = indice; if(e.key === "ArrowRight") next = (indice + 1) % abas.length; else if(e.key === "ArrowLeft") next = (indice + abas.length - 1) % abas.length; else if(e.key === "Home") next=0; else if(e.key === "End") next=abas.length-1; else return; e.preventDefault();setAba(abas[next].id);document.getElementById(`aba-${abas[next].id}`)?.focus(); }}>{a.titulo}</button>)}</div>
      <div id="tela-painel" role="tabpanel" aria-labelledby={`aba-${aba}`} tabIndex={0} className={s.painelTela}><Image src={`/assets/vitrine/painel-${aba}.webp`} width={1440} height={1000} sizes="(max-width: 900px) 100vw, 800px" alt={`Exemplo da tela ${abas[indice].titulo} do novo painel da loja, com dados ilustrativos`} /></div>
      <p className={s.legenda}>Exemplo do novo painel · dados ilustrativos. A tela de Desempenho mostra também recursos do Performance, contratado à parte.</p>
    </div><div className={s.painelPontos}><div><Icone tipo="peca" /><h3>Seu catálogo sob controle</h3><p>Produtos, fotos, preço e disponibilidade por tamanho.</p></div><div><Icone tipo="painel" /><h3>Uma vitrine sempre atual</h3><p>Banners, textos editáveis e contato da loja em um lugar só.</p></div><div><Icone tipo="grafico" /><h3>Uma leitura do movimento</h3><p>Acompanhe visitas, peças vistas e cliques no WhatsApp. A análise básica acompanha a vitrine.</p></div><span className={s.incluso}><Icone tipo="check" /> Painel incluído, sem mensalidade</span></div></div>
  </section>;
}

const CHAVE_RASCUNHO = "vitrine-proposta-rascunho-v3";
function Formulario({ oferta }: { oferta: OfertaLanding }) {
  const [dados, setDados] = useState({ nome: "", whatsapp: "", instagram: "" });
  const [pronto, setPronto] = useState(false), [guardado, setGuardado] = useState(false), [enviando, setEnviando] = useState(false), [enviado, setEnviado] = useState(false);
  const [erros, setErros] = useState<Record<string,string>>({}), [falha, setFalha] = useState(false), [link, setLink] = useState("");
  const enviandoRef = useRef(false), confirmouRef = useRef(false);
  const guarda = useGuardaDeFormulario();
  useEffect(() => {
    try { const r = JSON.parse(sessionStorage.getItem(CHAVE_RASCUNHO) ?? "null"); if (r && typeof r.quando === "number" && Date.now()-r.quando < 24*3600000 && ["nome","whatsapp","instagram"].every(k => typeof r.dados?.[k] === "string")) {setDados({ nome:r.dados.nome.slice(0,100), whatsapp:r.dados.whatsapp.slice(0,25), instagram:r.dados.instagram.slice(0,100) });setGuardado(true);} else sessionStorage.removeItem(CHAVE_RASCUNHO); } catch {}
    setPronto(true);
  }, []);
  useEffect(() => {
    if (!pronto || enviado || confirmouRef.current) return;
    try { if (dados.nome || dados.whatsapp || dados.instagram) sessionStorage.setItem(CHAVE_RASCUNHO,JSON.stringify({quando:Date.now(),dados})); else sessionStorage.removeItem(CHAVE_RASCUNHO); } catch {}
  }, [dados, pronto, enviado]);
  function mudar(campo: keyof typeof dados, valor: string) { setDados(d => ({ ...d, [campo]: valor }));setErros(e => ({ ...e, [campo]: "" })); setFalha(false); }
  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (enviandoRef.current) return;
    const problemas: Record<string,string> = {};
    if (!dados.nome.trim()) problemas.nome = "Escreva seu nome para eu saber com quem falar.";
    if (!whatsappValido(dados.whatsapp)) problemas.whatsapp = "Confira o WhatsApp: escreva o número completo com DDD.";
    const perfil = perfilParaProposta(dados.instagram);
    if (!perfil) problemas.instagram = "Escreva o @ da loja ou cole o link do perfil no Instagram.";
    setErros(problemas);
    const primeiro = Object.keys(problemas)[0];
    if (primeiro) { document.getElementById(`proposta-${primeiro}`)?.focus(); mpTrack("ErroFormularioProposta", { campo: primeiro }); return; }
    enviandoRef.current = true;setEnviando(true);setFalha(false);
    const plano = `Entrada de ${reais(oferta.entrada)} + saldo de ${reais(oferta.saldo)} após aprovação`;
    try {
      const resultado = await pedirPropostaVitrine({nome:dados.nome.trim(),whatsapp:dados.whatsapp,instagram:perfil!,plano}, guarda(e.currentTarget));
      setLink(resultado.link);
      if (!resultado.salvo) { setFalha(true);mpTrack("FalhaFormularioProposta", { versao: "vitrine-v3" });return; }
      confirmouRef.current=true;setEnviado(true);setGuardado(false);try {sessionStorage.removeItem(CHAVE_RASCUNHO);} catch {}
    } catch {setFalha(true);} finally {enviandoRef.current=false;setEnviando(false);}
  }
  useEffect(() => {if(enviado) document.getElementById("proposta-confirmada")?.focus({preventScroll:true});},[enviado]);
  if (enviado) return <div id="contratar" className={s.formConfirmado} role="status"><span className={s.confirmacaoIcone}><Icone tipo="check" /></span><h3 id="proposta-confirmada" tabIndex={-1}>Recebi seu pedido de proposta.</h3><p>Vou conhecer sua loja e falar com você pelo WhatsApp para combinar o projeto e os próximos passos.</p><p className={s.nota}>A contratação acontece depois dessa conversa.</p><a className={s.botaoSecundario} href={link} target="_blank" rel="noreferrer" data-cta="proposal_success" data-cta-dest="link">Quero falar com o Rafael<Icone tipo="seta" /></a></div>;
  return <form id="contratar" className={s.formulario} onSubmit={e => void enviar(e)} noValidate aria-busy={enviando}>
    <p className={s.rotulo}>Sua próxima vitrine começa aqui</p><h3>Vamos conhecer sua loja.</h3><p>Deixe seu contato. Eu te chamo no WhatsApp para preparar a proposta.</p>
    {guardado ? <p className={s.rascunho} role="status">Seu preenchimento foi recuperado nesta aba.</p> : null}
    <fieldset disabled={enviando}>
      <label htmlFor="proposta-nome">Seu nome</label><input id="proposta-nome" name="nome" value={dados.nome} onChange={e=>mudar("nome",e.target.value)} autoComplete="name" maxLength={100} required aria-invalid={Boolean(erros.nome)} aria-describedby={erros.nome ? "erro-nome" : undefined} />{erros.nome ? <small id="erro-nome" role="alert">{erros.nome}</small> : null}
      <label htmlFor="proposta-whatsapp">WhatsApp com DDD</label><input id="proposta-whatsapp" name="whatsapp" value={dados.whatsapp} onChange={e=>mudar("whatsapp",mascararWhatsapp(e.target.value))} autoComplete="tel" type="tel" inputMode="tel" placeholder="(44) 99999-0000" maxLength={16} required aria-invalid={Boolean(erros.whatsapp)} aria-describedby={erros.whatsapp ? "erro-whatsapp" : undefined} />{erros.whatsapp ? <small id="erro-whatsapp" role="alert">{erros.whatsapp}</small> : null}
      <label htmlFor="proposta-instagram">Instagram da loja</label><input id="proposta-instagram" name="instagram" value={dados.instagram} onChange={e=>mudar("instagram",e.target.value)} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="@sualoja" maxLength={100} required aria-invalid={Boolean(erros.instagram)} aria-describedby={erros.instagram ? "erro-instagram" : "ajuda-instagram"} />{erros.instagram ? <small id="erro-instagram" role="alert">{erros.instagram}</small> : <small id="ajuda-instagram" className={s.ajuda}>Pode ser o @ ou o link do perfil.</small>}
      <CampoIsca /><button type="submit" className={s.botao} data-cta="form" data-cta-dest="form" disabled={enviando}>{enviando ? "Enviando seu pedido…" : "Receber minha proposta"}{!enviando ? <Icone tipo="seta" /> : null}</button>
    </fieldset>
    {falha ? <div className={s.erroRede} role="alert"><p>Não consegui enviar agora. Seus dados continuam aqui. Tente novamente ou envie o pedido pelo WhatsApp.</p>{link ? <a href={link} target="_blank" rel="noreferrer" data-cta="proposal_fallback" data-cta-dest="link">Enviar pelo WhatsApp ↗</a> : null}</div> : null}
    <p className={s.nota}>Você solicita uma proposta. Nenhum pagamento é cobrado nesta etapa. <a href="/privacidade">Como cuido dos seus dados</a>.</p>
  </form>;
}

function BarraCelular({ oferta }: { oferta: OfertaLanding }) {
  const [visivel,setVisivel]=useState(false);
  useEffect(()=>{
    const alvo=document.getElementById("oferta");if(!alvo)return;
    let perto=false,foco=false;
    const atualizar=()=>setVisivel(!perto&&!foco&&scrollY>200);
    const observar=new IntersectionObserver(([e])=>{perto=e.isIntersecting;atualizar();},{rootMargin:"0px 0px 100px 0px"});observar.observe(alvo);
    const aoFocar=(e:FocusEvent)=>{foco=Boolean((e.target as HTMLElement)?.closest("#contratar"));atualizar();};
    const aoSair=()=>{foco=false;atualizar();};
    addEventListener("scroll",atualizar,{passive:true});document.addEventListener("focusin",aoFocar);document.addEventListener("focusout",aoSair);atualizar();
    return()=>{observar.disconnect();removeEventListener("scroll",atualizar);document.removeEventListener("focusin",aoFocar);document.removeEventListener("focusout",aoSair);};
  },[]);
  return <div className={s.barraCelular} hidden={!visivel}><span><b>{reais(oferta.total)}</b><small>projeto sem mensalidade</small></span><Botao lugar="sticky_mobile">Quero minha vitrine</Botao></div>;
}

export function LandingVitrine({ oferta }: { oferta: OfertaLanding }) {
  useEffect(()=>{initTracking({page:"vitrine-v3",valor:oferta.total,currency:"BRL",lang:"pt"});return ligarAncoras();},[oferta.total]);
  const clientes=projetos.filter(p=>["fulltime","japa-modas","verit-lab"].includes(p.slug));
  const duvidas=[
    ["Existe mensalidade?",`A vitrine e o painel não têm mensalidade. O projeto custa ${reais(oferta.total)}. Performance e e-commerce têm suas próprias condições, se você decidir contratar depois.`],
    ["Como funciona o pagamento?",`Você começa com ${reais(oferta.entrada)} depois de combinar o projeto e paga o saldo de ${reais(oferta.saldo)} após visualizar e aprovar.${oferta.avista ? ` Se preferir pagar de uma vez no Pix, o valor é ${reais(oferta.avista)}.` : ""} As condições do cartão são apresentadas na proposta.`],
    ["Quantos produtos posso cadastrar?","A vitrine não tem um limite de produtos definido pelo painel. Eu cadastro os 20 primeiros no lançamento. Você acrescenta os próximos pelo painel; se quiser que eu faça esse trabalho, combinamos o orçamento."],
    ["Preciso ter um domínio?","É opcional. Publico a vitrine em um endereço configurado. Se quiser sualoja.com.br, a compra e a renovação do domínio são pagas por você diretamente no registrador."],
    ["Quanto tempo leva para ficar pronta?","Até 7 dias úteis após o envio de todo o material: logo, fotos, produtos, preços e informações da loja. Você revisa a primeira versão e tem uma rodada de ajustes incluída."],
    ["A vitrine recebe pagamentos dos meus clientes?","Na vitrine inicial, a conversa vai para seu WhatsApp e você combina pagamento e entrega. Para receber Pix e cartão na página da peça, existe a vitrine com pagamento. Para sacola, frete e pedidos no painel, existe o e-commerce."],
    ["O que posso mudar pelo painel?","Produtos, fotos, preços, estoque e disponibilidade, banners, textos editáveis e o contato da loja. Mudanças na estrutura e no design podem ser solicitadas ao estúdio."],
  ];
  return <>
    <a href="#principal" className={s.pular}>Pular para o conteúdo</a>
    <header className={s.header}><a href="/estudio" className={s.marca} aria-label="Rafael Razeira Estúdio"><Image src="/assets/favicon.png" width={42} height={42} alt="" /><span>Rafael Razeira<small>Estúdio</small></span></a><nav aria-label="Navegação da vitrine"><a href="#como-funciona">Como funciona</a><a href="#painel">O painel</a><a href="#projetos">Lojas no ar</a><Botao lugar="nav">Quero minha vitrine</Botao></nav></header>
    <main id="principal" tabIndex={-1}>
      <section className={s.hero} aria-labelledby="vitrine-titulo"><div className={s.heroTexto}><p className={s.rotulo}><span className={s.ponto} /> Vitrine digital para lojas</p><h1 id="vitrine-titulo">Sua cliente chega no WhatsApp<br /><em>com a peça escolhida.</em></h1><p className={s.heroLead}>Uma vitrine profissional, desenhada para sua marca, com fotos, preços e tamanhos à vista. Eu preparo o site e cadastro os 20 primeiros produtos. Você cuida do dia a dia pelo painel.</p><div className={s.heroOferta}><b>{reais(oferta.total)}</b><span>pelo projeto completo<small>Sem mensalidade.</small></span></div><p className={s.heroCondicao}>Comece com {reais(oferta.entrada)}.<br />Pague os {reais(oferta.saldo)} restantes depois de ver e aprovar.</p><div className={s.acoes}><Botao lugar="hero">Quero minha vitrine</Botao><Botao lugar="hero_projetos" href="#projetos" secundario>Ver lojas no ar</Botao></div><p className={s.heroNota}>Você solicita uma proposta. Nenhum pagamento nesta etapa.</p><div className={s.heroQuem}><Image src="/assets/rafael-avatar.webp" width={40} height={40} alt="Rafael Razeira" /><p>Desenhada por mim. Atualizada por você.<small>Você fala com o Rafael do primeiro contato à publicação.</small></p></div></div><Demonstracao loja="fulltime" /></section>
      <div className={s.resumoEntrega}><span><Icone tipo="check" /> Design para sua marca</span><span><Icone tipo="check" /> 20 produtos cadastrados</span><span><Icone tipo="check" /> Painel incluído</span><span><Icone tipo="check" /> Até 7 dias úteis após o material</span></div>
      <ComoFunciona loja="fulltime" />
      <section className={`${s.secao} ${s.recursosSecao}`} aria-label="Recursos da vitrine"><div className={s.recursos}>{recursos.map(([icone,titulo,texto],i)=><article key={titulo}><div className={s.recursoTopo}><span className={s.iconeCaixa}><Icone tipo={icone} /></span><span>0{i+1}</span></div><h3>{titulo}</h3><p>{texto}</p></article>)}</div></section>
      <Painel />
      <section id="projetos" className={s.secao} aria-labelledby="projetos-titulo"><div className={s.secaoCabeca}><div><p className={s.rotulo}>03 / Projetos do estúdio</p><h2 id="projetos-titulo">Veja as lojas no ar.</h2></div><p>Abra as vitrines e faça o caminho do cliente: catálogo, peça e WhatsApp.</p></div><div className={s.projetos}>{clientes.map(p=><a key={p.slug} href={p.url!} target="_blank" rel="noreferrer" data-cta={`case_${p.slug}`} data-cta-dest="site" className={s.projeto}><div className={s.projetoImagem}><Image src={`/portfolio/${p.slug}.webp`} width={640} height={4500} sizes="(max-width: 700px) 90vw, 380px" alt={`Vitrine da ${p.nome}`} /></div><div><span className={s.rotulo}>Vitrine digital</span><h3>{p.nome}<Icone tipo="seta" /></h3><p>{p.ramo}</p><span className={s.projetoAbrir}>Abrir a vitrine ↗</span></div></a>)}</div><div className={s.quem}><Image src="/assets/rafael-avatar.webp" width={64} height={64} alt="Rafael Razeira" /><div><h3>Quem desenha e quem responde sou eu.</h3><p>Sou Rafael Razeira, de Maringá. Desenho, desenvolvo e publico sua vitrine. A gente conversa direto sobre o que sua loja precisa.</p></div><a href="/portfolio">Ver o portfólio ↗</a></div></section>
      <section id="oferta" className={`${s.secao} ${s.oferta}`} aria-labelledby="oferta-titulo"><div className={s.ofertaTexto}><p className={s.rotulo}>Sua vitrine, pronta para publicar</p><h2 id="oferta-titulo">Design, catálogo e painel.<br />Sua vitrine completa.</h2><p>Um projeto com a identidade da sua marca, entregue publicado e com um painel para você cuidar do dia a dia.</p><div className={s.preco}><b>{reais(oferta.total)}</b><span>pagamento pelo projeto · sem mensalidade</span></div><p className={s.condicao}>{reais(oferta.entrada)} para começar.<br />{reais(oferta.saldo)} após visualizar e aprovar.</p><ul className={s.listaInclui}>{["Design alinhado à sua marca","Página inicial, categorias e páginas de produto","Cadastro dos 20 primeiros produtos","WhatsApp com a peça escolhida na mensagem","Painel para produtos, estoque, banners e textos","Análise básica de visitas e interesse","Publicação e endereço configurado","Uma rodada de ajustes antes de publicar"].map(t=><li key={t}><Icone tipo="check" />{t}</li>)}</ul><details className={s.processo}><summary>Como a sua vitrine vai ao ar</summary><ol><li><b>A gente conversa.</b> Conheço sua loja e preparo a proposta com o escopo e as condições do projeto.</li><li><b>Você decide começar.</b> Com a proposta aceita, combinamos a entrada e você envia o material.</li><li><b>Eu preparo o projeto.</b> Após confirmar a entrada, desenho a vitrine e cadastro os primeiros produtos.</li><li><b>Você revisa e aprova.</b> Faço a rodada de ajustes e publico após o pagamento do saldo.</li></ol><p>Entrega em até 7 dias úteis após receber todo o material. <a href="/termos">Escopo e termos ↗</a></p></details></div><Formulario oferta={oferta} /></section>
      <section className={`${s.secao} ${s.crescimento}`} aria-labelledby="crescer-titulo"><div className={s.secaoCabeca}><div><p className={s.rotulo}>Quando fizer sentido para sua loja</p><h2 id="crescer-titulo">Sua loja pode crescer com você.</h2></div><p>Comece pela vitrine. Os próximos serviços têm seu próprio escopo e você escolhe quando contratar.</p></div><details className={s.servicos}><summary>Conheça os próximos passos<span aria-hidden="true">+</span></summary><div className={s.servicosGrid}><article><h3><Selo tamanho={20} rotulo="" /> Performance</h3><p>Análises mais completas, relatório mensal e acompanhamento do estúdio para melhorar sua vitrine.</p><b>{reais(oferta.performance)}<small>/mês · sem fidelidade</small></b></article><article><h3>Vitrine com pagamento</h3><p>Pix e cartão na página da peça. Entrega na sua região ou retirada na loja.</p><b>{reais(oferta.pagamento)}<small>projeto completo</small></b></article><article><h3>E-commerce</h3><p>Sacola, frete para o Brasil, estoque automático e pedidos no painel. Performance incluído.</p><b>{reais(oferta.ecommerce)}<small>+ {reais(oferta.ecommerceMensal)}/mês após a entrega</small></b></article></div><p className={s.nota}>Esses são os valores dos projetos completos. Quem já tem a vitrine recebe a condição de upgrade na proposta.</p></details></section>
      <section id="duvidas" className={`${s.secao} ${s.duvidas}`} aria-labelledby="duvidas-titulo"><div><p className={s.rotulo}>Antes de começar</p><h2 id="duvidas-titulo">Tudo combinado,<br />desde o primeiro passo.</h2></div><div>{duvidas.map(([p,r])=><details key={p}><summary>{p}<span aria-hidden="true">+</span></summary><p>{r}</p></details>)}</div></section>
      <section className={s.fim}><p className={s.rotulo}>Sua próxima vitrine</p><h2>Sua loja merece uma vitrine<br />à altura da sua marca.</h2><Botao lugar="final">Quero minha vitrine</Botao><p>{reais(oferta.total)} pelo projeto · painel incluído · sem mensalidade</p></section>
    </main>
    <footer className={s.footer}><span>Rafael Razeira Estúdio · Maringá, PR</span><div><a href="/portfolio">Portfólio</a><a href="/termos">Termos</a><a href="/privacidade">Privacidade</a></div></footer>
    <BarraCelular oferta={oferta} />
  </>;
}
