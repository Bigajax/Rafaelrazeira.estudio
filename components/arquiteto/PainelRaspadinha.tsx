"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarRaspadinha, utilizarRaspadinha } from "@/app/(pt)/crm/acoes-raspadinha";
import s from "./painel-raspadinha.module.css";

export function AcoesRaspadinha({ existe, resgatado, utilizado }: { existe: boolean; resgatado: boolean; utilizado: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [confirmandoUso, setConfirmandoUso] = useState(false);
  function executar(acao: () => Promise<{ erro?: string }>) {
    iniciar(async () => { setErro(""); const r = await acao(); if (r.erro) setErro(r.erro); else { setConfirmandoUso(false); router.refresh(); } });
  }
  return <div>
    <div className={s.acoes}>
      {!existe && <button className={s.primario} disabled={pendente} onClick={() => executar(criarRaspadinha)}>{pendente ? "Gerando…" : "Gerar o único prêmio e QR code"}</button>}
      {existe && <button className={s.secundario} disabled={pendente} onClick={() => router.refresh()}>Atualizar resgate</button>}
      {resgatado && !utilizado && !confirmandoUso && <button className={s.secundario} onClick={() => setConfirmandoUso(true)}>Marcar cupom como utilizado</button>}
    </div>
    {confirmandoUso && <div className={s.aviso}><p>Confirme quando o desconto já tiver sido aplicado à contratação. O cupom ficará encerrado.</p><div className={s.acoes}><button className={s.primario} disabled={pendente} onClick={() => executar(utilizarRaspadinha)}>{pendente ? "Salvando…" : "Confirmar uso do cupom"}</button><button className={s.secundario} disabled={pendente} onClick={() => setConfirmandoUso(false)}>Voltar</button></div></div>}
    {erro && <p role="alert">{erro}</p>}
  </div>;
}

export function QrRaspadinha({ imagem, link, publico = false }: { imagem: string; link: string; publico?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [aviso, setAviso] = useState("");
  async function copiar() {
    try { await navigator.clipboard.writeText(link); setAviso("Link copiado."); }
    catch { setAviso("Selecione e copie o link abaixo."); }
  }
  return <div className={s.qrBloco}>
    {/* eslint-disable-next-line @next/next/no-img-element */}<img className={s.qr} src={imagem} width={360} height={360} alt={publico ? "QR code para todos participarem do sorteio" : "QR code exclusivo para a pessoa sorteada abrir a raspadinha"} />
    <div className={s.acoes}>
      <button className={s.primario} onClick={() => dialog.current?.showModal()}>{publico ? "Exibir QR code no telão" : "Exibir QR code para o ganhador"}</button>
      <a className={s.secundario} href={imagem} download={publico ? "sorteio-site-palestra.png" : "raspadinha-ganhador.png"}>Baixar QR code</a>
      <button className={s.secundario} onClick={copiar}>{publico ? "Copiar link para participar" : "Copiar link exclusivo"}</button>
    </div>
    <p className={s.micro}>{publico ? "O mesmo QR code para todos. Cada WhatsApp participa uma vez. As inscrições encerram quando você realizar o sorteio." : "Entregue este link somente à pessoa sorteada. Qualquer pessoa com ele poderá fazer o primeiro resgate."}</p>
    <input className={s.link} readOnly value={link} aria-label={publico ? "Link público para participar do sorteio" : "Link exclusivo da raspadinha"} onFocus={e => e.currentTarget.select()} />
    <span role="status">{aviso}</span>
    <dialog ref={dialog} className={s.projecao} aria-label={publico ? "QR code para participar do sorteio" : "QR code para a pessoa sorteada"} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <button className={s.fechar} onClick={() => dialog.current?.close()} aria-label="Fechar QR code">×</button>
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/marca/rr-nome.webp" alt="Rafael Razeira Estúdio" width={240} height={40} />
      <h2>{publico ? "Um site pode ser seu." : "Este presente é seu."}</h2>
      <p>{publico ? "Aponte a câmera, cadastre seu nome e participe do sorteio." : "Pessoa sorteada: aponte a câmera e raspe para descobrir."}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}<img className={s.qrGrande} src={imagem} width={640} height={640} alt="Escaneie para abrir a raspadinha" />
      <p>Um presente para o seu escritório de arquitetura.</p>
    </dialog>
  </div>;
}
