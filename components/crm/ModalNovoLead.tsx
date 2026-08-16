"use client";

/* ============================================================
   ANOTAR UM LEAD

   O formulário mais curto que ainda serve: nome obrigatório e o resto
   opcional. Prospecção ativa começa com um perfil do Instagram e às vezes
   nem o nome verdadeiro da pessoa; um formulário que exige telefone e nicho
   para aceitar um nome é um formulário que faz o Rafael anotar no bloco de
   notas do celular, e aí o CRM já perdeu.

   O campo de WhatsApp reaproveita a máscara e a validação de
   components/telefone.ts, a MESMA do formulário do site. Duas réguas para
   o mesmo telefone é como o banco acaba com o mesmo contato duas vezes.
   ============================================================ */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarLead } from "@/app/crm/acoes";
import { mascararWhatsapp } from "@/components/telefone";
import {
  NOME_ORIGEM,
  NOME_TIPO,
  ORIGENS,
  TIPOS_PROJETO,
  type Origem,
  type TipoProjeto,
} from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

export function ModalNovoLead({ aoFechar }: { aoFechar: () => void }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();

  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [nicho, setNicho] = useState("");
  const [cidade, setCidade] = useState("Maringá");
  const [tipo, setTipo] = useState<TipoProjeto | "">("");
  const [origem, setOrigem] = useState<Origem>("prospeccao");

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    comecar(async () => {
      const r = await criarLead({
        nome,
        empresa,
        whatsapp,
        instagram,
        nicho,
        cidade,
        tipo_projeto: tipo || null,
        origem,
      });
      if (r.ok) {
        aoFechar();
        /* Vai direto para a ficha: quem acabou de anotar um nome quase
           sempre quer escrever a primeira mensagem em seguida. */
        router.push(`/crm/lead/${r.id}`);
      } else {
        setErro(r.erro);
      }
    });
  };

  return (
    <div className={s.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="novo-titulo">
        <p className={s.modalRot}>Prospecção</p>
        <h2 id="novo-titulo">Anotar um lead</h2>
        <p>Só o nome é obrigatório. O resto você completa quando souber.</p>

        <form onSubmit={enviar}>
          <label className={s.campo}>
            <span className={s.campoRot}>Nome</span>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
          </label>

          <label className={s.campo}>
            <span className={s.campoRot}>Empresa</span>
            <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
          </label>

          <div className={s.dupla}>
            <label className={s.campo}>
              <span className={s.campoRot}>WhatsApp</span>
              <input
                type="tel"
                inputMode="numeric"
                value={whatsapp}
                onChange={(e) => setWhatsapp(mascararWhatsapp(e.target.value))}
                placeholder="(44) 99999-7219"
              />
            </label>
            <label className={s.campo}>
              <span className={s.campoRot}>Instagram</span>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@perfil"
              />
            </label>
          </div>

          <div className={s.dupla}>
            <label className={s.campo}>
              <span className={s.campoRot}>Nicho</span>
              <input
                type="text"
                value={nicho}
                onChange={(e) => setNicho(e.target.value)}
                placeholder="Joalheria"
              />
            </label>
            <label className={s.campo}>
              <span className={s.campoRot}>Cidade</span>
              <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </label>
          </div>

          <div className={s.dupla}>
            <label className={s.campo}>
              <span className={s.campoRot}>Tipo de projeto</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoProjeto)}>
                <option value="">Ainda não sei</option>
                {TIPOS_PROJETO.map((t) => (
                  <option key={t} value={t}>
                    {NOME_TIPO[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.campo}>
              <span className={s.campoRot}>Origem</span>
              <select value={origem} onChange={(e) => setOrigem(e.target.value as Origem)}>
                {ORIGENS.map((o) => (
                  <option key={o} value={o}>
                    {NOME_ORIGEM[o]}
                  </option>
                ))}
              </select>
            </label>
          </div>

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
              {salvando ? "Salvando…" : "Anotar lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
