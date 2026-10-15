"use client";
import { useRef, useState } from "react";
import { registrarCobranca, lembrarCobranca } from "@/app/(pt)/crm/acoes-caixa";
import { CANAIS, type ParcelaPainel } from "@/lib/crm/tipos";
import { dinheiroExato } from "@/lib/crm/financeiro";
import { dataCurta, somarDias } from "@/lib/crm/regras";
import { saldoParcela } from "@/lib/caixa/operacao";
import { Dialogo } from "./Dialogo";
import s from "@/components/sistema/sistema.module.css";
import o from "@/components/financeiro/operacao.module.css";
export function Cobranca({
  parcelas,
  hoje,
  soLembrete,
  fechar,
  salvo,
}: {
  parcelas: ParcelaPainel[];
  hoje: string;
  soLembrete: boolean;
  fechar: () => void;
  salvo: () => void;
}) {
  const [request] = useState(() => crypto.randomUUID()),
    [erro, setErro] = useState(""),
    [ocupado, setOcupado] = useState(false),
    [copiado, setCopiado] = useState(false),
    enviando = useRef(false);
  const nome = parcelas[0].lead_nome,
    telefone = parcelas[0].lead_whatsapp?.replace(/\D/g, "") ?? "";
  const [texto, setTexto] = useState(
    `Olá, ${nome}! Tudo bem? Podemos conferir os pagamentos abaixo?\n${parcelas.map((p) => `${p.contrato_titulo} · ${p.rotulo}, vencimento ${dataCurta(p.vence_em)}: falta ${dinheiroExato(saldoParcela(p))}.`).join("\n")}\nSe já pagou, pode me enviar o comprovante? Obrigado!`,
  );
  return (
    <Dialogo
      titulo={soLembrete ? "Lembrar depois" : "Preparar e registrar cobrança"}
      ocupado={ocupado}
      fechar={fechar}
    >
      <p className={o.nota}>
        {soLembrete
          ? "Altera somente o próximo lembrete. O vencimento e o atraso financeiro permanecem."
          : "Copiar ou abrir o WhatsApp não registra contato. Confirme abaixo depois de fazer a cobrança."}
      </p>
      <form
        className={o.form}
        onSubmit={async (e) => {
          e.preventDefault();
          if (enviando.current) return;
          enviando.current = true;
          setOcupado(true);
          setErro("");
          const d = new FormData(e.currentTarget);
          try {
            const ids = parcelas.map((p) => p.id),
              lembrete = String(d.get("lembrete") ?? "");
            const r = soLembrete
              ? await lembrarCobranca(parcelas[0].lead_id, ids, lembrete)
              : await registrarCobranca({
                  request,
                  lead: parcelas[0].lead_id,
                  parcelas: ids,
                  dia: String(d.get("dia")),
                  canal: String(d.get("canal")),
                  nota: String(d.get("nota") ?? ""),
                  lembrete,
                });
            if (r.ok) salvo();
            else setErro(r.erro);
          } catch {
            setErro("Não consegui salvar. Tente novamente neste formulário.");
          } finally {
            enviando.current = false;
            setOcupado(false);
          }
        }}
      >
        <fieldset disabled={ocupado}>
          {!soLembrete && (
            <>
              <label className={o.inteiro}>
                Mensagem sugerida
                <textarea
                  rows={6}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                />
              </label>
              <div className={`${o.acoes} ${o.inteiro}`}>
                <button
                  type="button"
                  className={s.botao}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(texto);
                      setCopiado(true);
                    } catch {
                      setErro("Selecione a mensagem e copie pelo teclado.");
                    }
                  }}
                >
                  {copiado ? "Copiado" : "Copiar mensagem"}
                </button>
                {telefone && (
                  <a
                    className={s.botao}
                    href={`https://wa.me/${telefone.startsWith("55") ? telefone : `55${telefone}`}?text=${encodeURIComponent(texto)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir WhatsApp
                  </a>
                )}
              </div>
              <label>
                Data do contato
                <input
                  name="dia"
                  type="date"
                  required
                  max={hoje}
                  defaultValue={hoje}
                />
              </label>
              <label>
                Canal
                <select name="canal">
                  {CANAIS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className={o.inteiro}>
                Observação do contato
                <textarea name="nota" maxLength={1000} rows={3} />
              </label>
            </>
          )}
          <label className={o.inteiro}>
            Próximo lembrete {soLembrete ? "" : "(opcional)"}
            <input
              name="lembrete"
              required={soLembrete}
              type="date"
              min={somarDias(hoje, 1)}
              defaultValue={soLembrete ? somarDias(hoje, 3) : ""}
            />
          </label>
          {!soLembrete && (
            <label className={`${o.check} ${o.inteiro}`}>
              <input type="checkbox" required />
              Confirmo que fiz este contato de cobrança.
            </label>
          )}
          {erro && (
            <p className={o.mensagem} data-erro="true" role="alert">
              {erro}
            </p>
          )}
          <div className={o.rodape}>
            <button type="button" className={s.botao} onClick={fechar}>
              Cancelar
            </button>
            <button className={`${s.botao} ${s.primario}`}>
              {ocupado
                ? "Salvando…"
                : soLembrete
                  ? "Salvar lembrete"
                  : "Registrar cobrança"}
            </button>
          </div>
        </fieldset>
      </form>
    </Dialogo>
  );
}
