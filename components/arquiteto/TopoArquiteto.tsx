import { linkWhatsApp } from "@/lib/contato";
import s from "./arquiteto.module.css";

export function TopoArquiteto({ raspadinha = false }: { raspadinha?: boolean }) {
  return <header className={`${s.topo} ${!raspadinha ? s.topoComVolta : ""}`} data-header-arquiteto>
    <a className={s.marca} href={raspadinha ? "/arquitetos" : "#topo"} aria-label={raspadinha ? "Rafael Razeira Estúdio — sites para arquitetos" : "Rafael Razeira Estúdio, voltar ao topo"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/marca/rr-monograma.webp" width={55} height={30} alt="" />
    </a>
    <nav className={s.topoNav} aria-label={raspadinha ? "Bilhete e site para arquitetos" : "Seções"}>
      {raspadinha ? <><a href="#bilhete">Seu bilhete</a><a href="/arquitetos#o-que-vem">O site</a><a href="/arquitetos#como-funciona">Como funciona</a></> : <><a href="#o-que-vem">O site</a><a href="#como-funciona">Como funciona</a><a href="#oferta">Preço</a></>}
    </nav>
    {raspadinha ? <a className={`${s.topoCta} ${s.topoCtaRosa}`} href="/arquitetos">Conhecer o site</a> : <div className={s.topoAcoes}>
      <a className={s.topoVolta} href="/arquitetos/raspadinha/participar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>Voltar à raspadinha</a>
      <a className={`${s.topoCta} ${s.topoConversa}`} href={linkWhatsApp("Oi Rafael! Vim pela página do site para arquiteto e quero tirar uma dúvida.")} target="_blank" rel="noopener" data-cta="topo_whatsapp" data-cta-dest="whatsapp">Conversar</a>
    </div>}
  </header>;
}
