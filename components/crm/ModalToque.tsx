"use client";

/* ============================================================
   REGISTRAR TOQUE (regra 6)

   O formulário mais usado da ferramenta, e por isso o mais curto: direção,
   canal, uma linha de resumo. Nada mais.

   ---------- a direção vem primeiro, e é um par de botões ----------
   Não é um <select> por dois motivos. Primeiro: é a informação que muda o
   significado de tudo o que vem depois ("eu falei" e "me responderam" são
   dois fatos diferentes, e um deles zera a regra dos 2 retornos). Segundo:
   dois botões grandes são um toque no celular, contra três num select.

   ---------- e a segunda metade da regra 6 ----------
   "o sistema pergunta pelo próximo passo se não houver um futuro agendado".
   A pergunta aparece DENTRO deste formulário, não depois dele: registrar o
   toque e marcar o retorno são o mesmo pensamento, e separá-los em dois
   envios é como se perde metade dos retornos.
   ============================================================ */

import { useEffect, useState, useTransition } from "react";
import { registrarToque } from "@/app/crm/acoes";
import { hojeSP, linkWhatsapp, somarDias } from "@/lib/crm/regras";
import { CANAIS, NOME_CANAL, type Canal, type Direcao, type LeadPainel } from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

export function ModalToque({
  lead,
  direcaoInicial = "saida",
  aoFechar,
}: {
  lead: LeadPainel;
  direcaoInicial?: Direcao;
  aoFechar: () => void;
}) {
  const hoje = hojeSP();
  const [direcao, setDirecao] = useState<Direcao>(direcaoInicial);
  /* O canal de partida é o canal que o lead TEM: sem número, a conversa
     real está acontecendo no direct, e nascer em "WhatsApp" é um erro de
     registro esperando um esquecimento. */
  const [canal, setCanal] = useState<Canal>(
    linkWhatsapp(lead.whatsapp) ? "whatsapp" : lead.instagram ? "instagram" : "whatsapp",
  );
  const [resumo, setResumo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();

  /* Um retorno marcado para hoje ainda não venceu, então "hoje" conta como
     futuro agendado e a pergunta não aparece. */
  const precisaDePasso = !lead.proxima_acao_em || lead.proxima_acao_em < hoje;
  const [passo, setPasso] = useState(lead.proximo_passo ?? "");
  const [data, setData] = useState(somarDias(hoje, 3));

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    comecar(async () => {
      const r = await registrarToque(lead.id, {
        canal,
        direcao,
        resumo,
        proximo_passo: precisaDePasso ? passo : undefined,
        proxima_acao_em: precisaDePasso ? data : undefined,
      });
      if (r.ok) aoFechar();
      else setErro("erro" in r ? r.erro : "Não foi possível registrar.");
    });
  };

  return (
    <div className={s.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="toque-titulo">
        <p className={s.modalRot}>Registrar toque</p>
        <h2 id="toque-titulo">{lead.nome}</h2>

        <form onSubmit={enviar}>
          <fieldset className={s.grupo}>
            <legend className={s.campoRot}>O que aconteceu</legend>
            <div className={s.opcoes}>
              <button
                type="button"
                className={`${s.opcao} ${direcao === "saida" ? s.opcaoAtiva : ""}`}
                onClick={() => setDirecao("saida")}
                aria-pressed={direcao === "saida"}
              >
                Eu falei
              </button>
              <button
                type="button"
                className={`${s.opcao} ${direcao === "entrada" ? s.opcaoAtiva : ""}`}
                onClick={() => setDirecao("entrada")}
                aria-pressed={direcao === "entrada"}
              >
                Me responderam
              </button>
            </div>
          </fieldset>

          <label className={s.campo}>
            <span className={s.campoRot}>Canal</span>
            <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>
              {CANAIS.map((c) => (
                <option key={c} value={c}>
                  {NOME_CANAL[c]}
                </option>
              ))}
            </select>
          </label>

          <label className={s.campo}>
            <span className={s.campoRot}>Resumo</span>
            <input
              type="text"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder="Pediu para retomar depois do dia 20"
              autoFocus
            />
          </label>

          {precisaDePasso ? (
            <div className={s.blocoPergunta}>
              <p className={s.perguntaTitulo}>E agora, qual é o próximo passo?</p>
              <label className={s.campo}>
                <span className={s.campoRot}>Próximo passo</span>
                <input
                  type="text"
                  value={passo}
                  onChange={(e) => setPasso(e.target.value)}
                  placeholder="Mandar a proposta com os dois prazos"
                />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>Me cobre em</span>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </label>
            </div>
          ) : null}

          {erro ? (
            <p role="alert" className={s.erro}>
              {erro}
            </p>
          ) : null}

          <div className={s.modalPe}>
            <button type="button" className={s.btn} onClick={aoFechar}>
              Cancelar
            </button>
            <button type="submit" className={s.btnAcao} disabled={salvando}>
              {salvando ? "Registrando…" : "Registrar toque"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
