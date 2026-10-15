"use client";
import { useRef, useState } from "react";
import { ajustarRecebimento } from "@/app/(pt)/crm/acoes-caixa";
import type { ParcelaPainel, Recebimento } from "@/lib/crm/tipos";
import { METODOS, NOME_METODO } from "@/lib/crm/tipos";
import { dinheiroExato, centavos } from "@/lib/crm/financeiro";
import { alocacoesDoRecebimento } from "@/lib/caixa/recebimentos";
import { valorRetido } from "@/lib/sistema/indicadores";
import { Dialogo } from "./Dialogo";
import s from "@/components/sistema/sistema.module.css";
import o from "@/components/financeiro/operacao.module.css";
export function Ajustar({
  recebimento: r,
  modo,
  hoje,
  parcelas,
  clientes,
  fechar,
  salvo,
}: {
  recebimento: Recebimento;
  modo: "corrigir" | "identificar";
  hoje: string;
  parcelas: ParcelaPainel[];
  clientes: { id: string; nome: string; empresa: string | null }[];
  fechar: () => void;
  salvo: () => void;
}) {
  const [request] = useState(() => crypto.randomUUID()),
    [erro, setErro] = useState(""),
    [ocupado, setOcupado] = useState(false),
    enviando = useRef(false);
  const alocadas = alocacoesDoRecebimento(r),
    [lead, setLead] = useState(r.lead_id ?? ""),
    [valor, setValor] = useState(String(r.valor)),
    [liquido, setLiquido] = useState(
      r.valor_liquido == null ? "" : String(r.valor_liquido),
    );
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(alocadas.map((a) => [a.parcela_id, String(a.valor)])),
  );
  const total = centavos(
    Object.values(valores).reduce((s, v) => s + Number(v || 0), 0),
  );
  const [anular, setAnular] = useState(false);
  const disponiveis = parcelas.filter(
    (p) =>
      p.lead_id === lead &&
      !p.cancelada_em &&
      p.valor -
        p.recebido +
        (alocadas.find((a) => a.parcela_id === p.id)?.valor ?? 0) >
        0.005,
  );
  return (
    <Dialogo
      titulo={
        modo === "corrigir"
          ? "Corrigir lançamento manual"
          : "Identificar e distribuir pagamento"
      }
      ocupado={ocupado}
      fechar={fechar}
    >
      <p className={o.nota}>
        {modo === "corrigir"
          ? "Corrige um erro de lançamento e preserva os valores anteriores no histórico. Para dinheiro que voltou ao cliente, use Registrar devolução."
          : "O pagamento já existe: o vínculo não cria outra entrada. Distribua o valor entre as parcelas do mesmo cliente."}
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
            const resultado = await ajustarRecebimento({
              id: r.id,
              request,
              motivo: String(d.get("motivo")),
              ...(modo === "corrigir"
                ? {
                    valor: Number(valor),
                    dia: String(d.get("dia")),
                    metodo: String(d.get("metodo")),
                    liquido: liquido === "" ? null : Number(liquido),
                    anular,
                  }
                : {
                    lead,
                    alocacoes: Object.entries(valores)
                      .filter(([, v]) => Number(v) > 0)
                      .map(([parcela_id, v]) => ({
                        parcela_id,
                        valor: Number(v),
                      })),
                  }),
            });
            if (resultado.ok) salvo();
            else setErro(resultado.erro);
          } catch {
            setErro("Não consegui salvar. Tente novamente neste formulário.");
          } finally {
            enviando.current = false;
            setOcupado(false);
          }
        }}
      >
        <fieldset disabled={ocupado}>
          {modo === "corrigir" ? (
            <>
              <label className={`${o.check} ${o.inteiro}`}>
                <input
                  type="checkbox"
                  checked={anular}
                  onChange={(e) => setAnular(e.target.checked)}
                />
                Anular lançamento feito por engano, preservando o histórico.
              </label>
              <label>
                Valor bruto
                <input
                  disabled={anular}
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </label>
              <label>
                Líquido confirmado
                <input
                  disabled={anular}
                  type="number"
                  step="0.01"
                  min="0"
                  max={valor}
                  value={liquido}
                  onChange={(e) => setLiquido(e.target.value)}
                />
              </label>
              <label>
                Data do recebimento
                <input
                  required
                  name="dia"
                  type="date"
                  max={hoje}
                  defaultValue={r.recebido_em.slice(0, 10)}
                />
              </label>
              <label>
                Forma de pagamento
                <select name="metodo" defaultValue={r.metodo}>
                  {METODOS.map((m) => (
                    <option key={m} value={m}>
                      {NOME_METODO[m]}
                    </option>
                  ))}
                </select>
              </label>
              <p className={`${o.mensagem} ${o.inteiro}`}>
                {anular ? (
                  "A entrada sai dos totais e reabre o saldo vinculado. O valor original permanece no histórico. Não registra devolução."
                ) : (
                  <>
                    Bruto: {dinheiroExato(r.valor)} →{" "}
                    {dinheiroExato(Number(valor))}. A diferença de{" "}
                    {dinheiroExato(Math.abs(centavos(Number(valor) - r.valor)))}{" "}
                    recalcula o saldo das parcelas vinculadas.
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              <label className={o.inteiro}>
                Cliente
                <select
                  required
                  value={lead}
                  onChange={(e) => {
                    setLead(e.target.value);
                    setValores({});
                  }}
                >
                  <option value="">Selecione</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                      {c.empresa ? ` · ${c.empresa}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              {disponiveis.map((p) => {
                const saldo = centavos(
                  p.valor -
                    p.recebido +
                    (alocadas.find((a) => a.parcela_id === p.id)?.valor ?? 0),
                );
                return (
                  <label key={p.id} className={o.inteiro}>
                    {p.contrato_titulo} · {p.rotulo} · saldo{" "}
                    {dinheiroExato(saldo)}
                    <input
                      aria-label={`Alocar em ${p.rotulo}`}
                      type="number"
                      min="0"
                      max={saldo}
                      step="0.01"
                      value={valores[p.id] ?? ""}
                      onChange={(e) =>
                        setValores((v) => ({ ...v, [p.id]: e.target.value }))
                      }
                    />
                  </label>
                );
              })}
              {lead && !disponiveis.length && (
                <p className={o.nota}>
                  Este cliente não tem parcelas em aberto. Você pode identificar
                  o cliente e manter o crédito sem alocação.
                </p>
              )}
              <p className={`${o.mensagem} ${o.inteiro}`}>
                Disponível: {dinheiroExato(valorRetido(r))} · Distribuído:{" "}
                {dinheiroExato(total)} · Sem parcela:{" "}
                {dinheiroExato(centavos(valorRetido(r) - total))}. Devoluções
                desfazem as últimas alocações primeiro.
              </p>
            </>
          )}
          <label className={o.inteiro}>
            Motivo da alteração
            <textarea name="motivo" required maxLength={1000} rows={3} />
          </label>
          {erro && (
            <p className={o.mensagem} data-erro="true" role="alert">
              {erro}
            </p>
          )}
          <div className={o.rodape}>
            <button type="button" className={s.botao} onClick={fechar}>
              Cancelar
            </button>
            <button
              className={`${s.botao} ${s.primario}`}
              disabled={modo === "identificar" && total > valorRetido(r)}
            >
              {ocupado ? "Salvando…" : "Salvar com histórico"}
            </button>
          </div>
        </fieldset>
      </form>
    </Dialogo>
  );
}
