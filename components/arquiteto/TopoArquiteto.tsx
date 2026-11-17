import { linkWhatsApp } from "@/lib/contato";
import s from "./arquiteto.module.css";

export function TopoArquiteto({ raspadinha = false }: { raspadinha?: boolean }) {
  return <header className={s.topo} data-header-arquiteto>
    <a className={s.marca} href={raspadinha ? "/arquitetos" : "#topo"} aria-label={raspadinha ? "Rafael Razeira Estúdio — sites para arquitetos" : "Rafael Razeira Estúdio, voltar ao topo"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/marca/rr-monograma.webp" width={55} height={30} alt="" />
    </a>
    <nav className={s.topoNav} aria-label={raspadinha ? "Bilhete e site para arquitetos" : "Seções"}>
      {raspadinha ? <><a href="#bilhete">Seu bilhete</a><a href="/arquitetos#o-que-vem">O site</a><a href="/arquitetos#como-funciona">Como funciona</a></> : <><a href="#o-que-vem">O site</a><a href="#como-funciona">Como funciona</a><a href="#oferta">Preço</a></>}
    </nav>
    {raspadinha ? <a className={`${s.topoCta} ${s.topoCtaRosa}`} href="/arquitetos">Conhecer o site</a> : <a className={s.topoCta} href={linkWhatsApp("Oi Rafael! Vim pela página do site para arquiteto e quero tirar uma dúvida.")} target="_blank" rel="noopener" data-cta="topo_whatsapp" data-cta-dest="whatsapp">Conversar</a>}
  </header>;
}
