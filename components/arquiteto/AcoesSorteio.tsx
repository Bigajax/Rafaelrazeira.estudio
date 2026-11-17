"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { abrirSorteioArquitetos, entregarSiteSorteado, sortearSiteArquitetos, utilizarCupomSorteado } from "@/app/(pt)/crm/acoes-sorteio-arquitetos";
import s from "./painel-raspadinha.module.css";

export function AcoesSorteio({ aberto, sorteado, entregue, inscritos, distribuido }: { aberto: boolean; sorteado: boolean; entregue: boolean; inscritos: number; distribuido: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [confirmar, setConfirmar] = useState<"sorteio" | "entrega" | null>(null);
  function executar(acao: () => Promise<{ erro?: string }>) {
    iniciar(async () => { setErro(""); const r = await acao(); if (r.erro) setErro(r.erro); else { setConfirmar(null); router.refresh(); } });
  }
  return <div>
    <div className={s.acoes}>
      {!aberto && <button className={s.primario} disabled={pendente} onClick={() => executar(abrirSorteioArquitetos)}>{pendente ? "Abrindo…" : "Abrir inscrições e gerar QR code"}</button>}
      {aberto && <button className={s.secundario} disabled={pendente} onClick={() => router.refresh()}>Atualizar participantes</button>}
      {aberto && (!sorteado || !distribuido) && <button className={s.primario} disabled={pendente || inscritos === 0} onClick={() => setConfirmar("sorteio")}>{sorteado ? "Concluir distribuição dos cupons" : "Sortear site e cupons"}</button>}
      {sorteado && !entregue && <button className={s.secundario} disabled={pendente} onClick={() => setConfirmar("entrega")}>Registrar entrega do site</button>}
    </div>
    {confirmar && <div className={s.aviso}>
      <p>{confirmar === "sorteio" ? sorteado ? "Manter o ganhador do site e distribuir até dois cupons de 50% e R$ 300 de desconto aos demais? Os benefícios serão definitivos." : "Encerrar as inscrições e distribuir um site de presente, até dois cupons de 50% e R$ 300 de desconto aos demais? Cada pessoa recebe um único benefício, e o resultado será definitivo." : "Confirme quando o site do ganhador tiver sido entregue. O registro de entrega será definitivo."}</p>
      <div className={s.acoes}><button className={s.primario} disabled={pendente} onClick={() => executar(confirmar === "sorteio" ? sortearSiteArquitetos : entregarSiteSorteado)}>{pendente ? "Confirmando…" : confirmar === "sorteio" ? "Confirmar distribuição" : "Confirmar entrega"}</button><button className={s.secundario} disabled={pendente} onClick={() => setConfirmar(null)}>Voltar</button></div>
    </div>}
    {erro && <p role="alert">{erro}</p>}
  </div>;
}

export function UsoCupomSorteio({ id, nome, utilizadoEm }: { id: string; nome: string; utilizadoEm: string | null }) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  if (utilizadoEm) return <span>Utilizado em {new Date(utilizadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>;
  return <div>
    {confirmar ? <>
      <p>O desconto já foi aplicado à contratação de {nome}?</p>
      <div className={s.acoes}><button className={s.primario} disabled={pendente} onClick={() => iniciar(async () => {
        const r = await utilizarCupomSorteado(id);
        if (r.erro) setErro(r.erro); else { setConfirmar(false); router.refresh(); }
      })}>{pendente ? "Salvando…" : "Confirmar uso"}</button><button className={s.secundario} disabled={pendente} onClick={() => setConfirmar(false)}>Voltar</button></div>
    </> : <button className={s.secundario} onClick={() => setConfirmar(true)}>Registrar uso</button>}
    {erro && <p role="alert">{erro}</p>}
  </div>;
}
