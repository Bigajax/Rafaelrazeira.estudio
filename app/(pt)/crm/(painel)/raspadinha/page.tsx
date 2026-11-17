import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { usuarioAtual } from "@/lib/crm/supabase";
import { bancoRaspadinha } from "@/lib/raspadinha-servidor";
import { campanhaSorteio, conferirRegrasCupons } from "@/lib/sorteio-arquitetos-servidor";
import { BENEFICIOS_SORTEIO, ROTA_SORTEIO, SORTEIO_ARQUITETOS, type CampanhaSorteio, type ParticipanteSorteio } from "@/lib/sorteio-arquitetos";
import { reaisCentavos } from "@/lib/raspadinha";
import { SITE } from "@/lib/idiomas";
import { AcoesSorteio, UsoCupomSorteio } from "@/components/arquiteto/AcoesSorteio";
import { QrRaspadinha } from "@/components/arquiteto/PainelRaspadinha";
import s from "@/components/arquiteto/painel-raspadinha.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sorteio do site na palestra", robots: { index: false, follow: false }, referrer: "no-referrer" };
const data = (valor: string) => new Date(valor).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function PainelRaspadinha() {
  const usuario = await usuarioAtual();
  if (!usuario || !process.env.CRM_OWNER_ID || usuario.id !== process.env.CRM_OWNER_ID) notFound();
  let campanha: CampanhaSorteio | null = null, pessoas: ParticipanteSorteio[] = [], especiais: ParticipanteSorteio[] = [], ganhador: ParticipanteSorteio | null = null;
  let erro = "", total = 0;
  try {
    await conferirRegrasCupons();
    campanha = await campanhaSorteio();
    if (campanha) {
      const { data: inscritos, error, count } = await bancoRaspadinha().from("arquiteto_participantes")
        .select("id,campanha,nome,whatsapp,criado_em,codigo,entregue_em,beneficio,faixa50,utilizado_em,final_centavos,desconto_centavos", { count: "exact" }).eq("campanha", SORTEIO_ARQUITETOS)
        .order("criado_em", { ascending: false }).limit(500);
      if (error) throw new Error("Participantes indisponíveis.");
      pessoas = inscritos || []; total = count || 0;
      if (campanha.ganhador_id) {
        const r = await bancoRaspadinha().from("arquiteto_participantes").select("id,campanha,nome,whatsapp,criado_em,codigo,entregue_em,beneficio,faixa50,utilizado_em,final_centavos,desconto_centavos")
          .eq("campanha", SORTEIO_ARQUITETOS).eq("id", campanha.ganhador_id).single();
        if (r.error) throw new Error("Resultado indisponível.");
        ganhador = r.data;
        const cupons = await bancoRaspadinha().from("arquiteto_participantes").select("id,campanha,nome,whatsapp,criado_em,codigo,entregue_em,beneficio,faixa50,utilizado_em,final_centavos,desconto_centavos")
          .eq("campanha", SORTEIO_ARQUITETOS).eq("beneficio", "cupom50").order("faixa50");
        if (cupons.error) throw new Error("Cupons indisponíveis.");
        especiais = cupons.data || [];
      }
    }
  } catch { erro = "O sorteio não está disponível. Confira a configuração e aplique sorteio-arquitetos.sql e depois sorteio-arquitetos-cupons.sql no Supabase."; }
  const distribuido = !!campanha?.sorteado_em && pessoas.length > 0 && pessoas.every(p => !!p.beneficio);
  const link = `${SITE}${ROTA_SORTEIO}`;
  const qr = campanha && !campanha.sorteado_em ? await QRCode.toDataURL(link, { width: 1000, margin: 4, errorCorrectionLevel: "M", color: { dark: "#39452e", light: "#ffffff" } }) : "";
  return <div className={s.page}>
    <div className={s.cabeca}><h1>Um site de presente</h1><a className={s.secundario} href="/arquitetos/raspadinha" target="_blank" rel="noreferrer">Ver a experiência e os cupons</a></div>
    <p className={s.intro}>O mesmo QR code para todos na palestra da Bloco Arquitetura. Um site de presente, dois cupons de 50% e R$ 300 de desconto para os demais. Cada participante recebe um único benefício.</p>
    <section className={s.cartao}>
      <span className={s.status}>{ganhador?.entregue_em ? "Site entregue" : campanha?.sorteado_em ? "Sorteio realizado" : campanha ? "Inscrições abertas" : "Inscrições ainda não abertas"}</span>
      <p className={s.preco}>{total} {total === 1 ? "participante" : "participantes"}</p>
      {!campanha?.sorteado_em && total > 0 && <p className={s.micro}>Com os inscritos atuais: 1 site de presente, {Math.min(2, total - 1)} {total === 2 ? "cupom de 50%" : "cupons de 50%"} e {Math.max(0, total - 3)} {total === 4 ? "cupom de R$ 300" : "cupons de R$ 300"}. Os bilhetes são liberados após confirmar o sorteio.</p>}
      {erro ? <div className={s.aviso} role="alert">{erro}</div> : <>
        {ganhador ? <>
          <h2>{ganhador.nome} ganhou o site.</h2>
          <dl className={s.dados}><dt>WhatsApp</dt><dd>{ganhador.whatsapp}</dd><dt>Código do prêmio</dt><dd><code>{ganhador.codigo}</code></dd><dt>Sorteado em</dt><dd>{data(campanha!.sorteado_em!)}</dd>{ganhador.entregue_em && <><dt>Entregue em</dt><dd>{data(ganhador.entregue_em)}</dd></>}</dl>
          <p className={s.micro}>Atualizar a página ou repetir o comando mantém este mesmo resultado.</p>
        </> : campanha ? <QrRaspadinha imagem={qr} link={link} publico /> : <p>Abra as inscrições antes de apresentar o QR code. O sorteio será feito entre os inscritos quando você encerrar a participação.</p>}
        <AcoesSorteio aberto={!!campanha} sorteado={!!campanha?.sorteado_em} entregue={!!ganhador?.entregue_em} inscritos={total} distribuido={distribuido} />
      </>}
    </section>
    <aside className={s.aviso}><strong>Condições dos benefícios</strong><p>Site de presente para uma pessoa. Até duas pessoas contratam por R$ 749,50 com 50% de desconto. Os demais contratam por R$ 1.199 com R$ 300 de desconto. Cupons individuais, com uso único e sem acúmulo. Registre o uso quando aplicar o desconto à contratação.</p></aside>
    {especiais.length > 0 && <section className={s.cartao}><h2>Cupons de 50%</h2><p className={s.micro}>Essas pessoas receberam a condição de R$ 749,50.</p>{especiais.map(p => <p key={p.id}><strong>{p.nome}</strong> — {p.whatsapp}<br /><code>{p.codigo}</code></p>)}</section>}
    {pessoas.length > 0 && <section className={s.cartao}><h2>Participantes e benefícios</h2>{total > pessoas.length && <p className={s.micro}>Mostrando as {pessoas.length} inscrições mais recentes.</p>}<div className={s.tabelaWrap}><table className={s.tabela}><thead><tr><th>Nome</th><th>WhatsApp</th><th>Inscrição</th><th>Benefício</th><th>Preço final</th><th>Código</th><th>Situação</th></tr></thead><tbody>{pessoas.map(p => <tr key={p.id}><td>{p.nome}</td><td>{p.whatsapp}</td><td>{data(p.criado_em)}</td><td>{p.beneficio ? BENEFICIOS_SORTEIO[p.beneficio].rotulo : "Aguardando sorteio"}</td><td>{p.final_centavos === null ? "—" : reaisCentavos(p.final_centavos)}</td><td><code>{p.beneficio ? p.codigo : "—"}</code></td><td>{p.beneficio && p.beneficio !== "site" ? <UsoCupomSorteio id={p.id} nome={p.nome} utilizadoEm={p.utilizado_em} /> : p.beneficio === "site" ? p.entregue_em ? "Site entregue" : "Site sorteado" : "—"}</td></tr>)}</tbody></table></div></section>}
  </div>;
}
