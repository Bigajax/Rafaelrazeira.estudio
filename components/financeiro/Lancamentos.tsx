"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { lancarRecebimento } from "@/app/(pt)/crm/acoes";
import { criarCompromisso, registrarDespesa } from "@/app/(pt)/crm/acoes-financeiro";
import { CATEGORIAS, FREQUENCIAS, reais, type Custo, type Recebimento } from "@/lib/financeiro/tipos";
import { dataCurta } from "@/lib/crm/regras";
import { METODOS, NOME_METODO } from "@/lib/crm/tipos";
import { datasDoCompromisso } from "@/lib/financeiro/ocorrencias";
import { contasAPagar, type ParcelaOperacional } from "@/lib/financeiro/operacao";
import type { Despesa } from "@/lib/sistema/indicadores";
import type { Ocorrencia } from "@/lib/financeiro/ocorrencias";
import s from "@/components/sistema/sistema.module.css";
import o from "./operacao.module.css";

export type TipoLancamento = "recebi" | "paguei" | "conta";
export type DadosLancamento = {
  hoje: string; clientes: { id: string; nome: string; empresa: string | null }[];
  parcelas: ParcelaOperacional[]; ocorrencias: Ocorrencia[]; despesas: Despesa[];
  custos: Custo[]; recebimentos: Recebimento[];
};
export function Lancamento({ tipo, dados, parcelaInicial, contaInicial, aoFechar, aoSalvar }: {
  tipo: TipoLancamento; dados: DadosLancamento; parcelaInicial?: string; contaInicial?: string; aoFechar: () => void; aoSalvar: (dia: string) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const id = useId();
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const enviando = useRef(false);
  const [erro, setErro] = useState("");
  const [request] = useState(() => crypto.randomUUID());
  const inicial = dados.parcelas.find((p) => p.id === parcelaInicial);
  const [cliente, setCliente] = useState(inicial?.lead_id ?? "");
  const [parcela, setParcela] = useState(parcelaInicial ?? "");
  const [conta, setConta] = useState(contaInicial ?? "");
  const contas = contasAPagar(dados.ocorrencias, dados.despesas, dados.hoje);
  const compromisso = contas.find((c) => c.id === conta);
  const [valor, setValor] = useState(inicial ? String(inicial.saldo) : compromisso?.moeda === "BRL" ? String(compromisso.saldo) : "");
  const [dia, setDia] = useState(dados.hoje);
  const [moeda, setMoeda] = useState(compromisso?.moeda ?? "BRL");
  const [frequencia, setFrequencia] = useState<Custo["frequencia"]>("mensal");
  const [quantas, setQuantas] = useState(6);
  const [semTaxa, setSemTaxa] = useState(false);
  const [outroPagamento, setOutroPagamento] = useState(false);
  const pendente = dados.parcelas.find((p) => p.id === parcela);
  const automaticos = tipo === "recebi" ? dados.recebimentos.filter((r) => r.mp_payment_id && !r.estornado_em &&
    r.lead_id === cliente && r.recebido_em.slice(0, 10) === dia && Number(r.valor) === Number(valor)) : [];
  const parcelasCliente = dados.parcelas.filter((p) => p.lead_id === cliente && p.saldo > 0);
  const titulo = tipo === "recebi" ? "Registrar recebimento" : tipo === "paguei" ? "Registrar pagamento" : "Cadastrar conta e vencimentos";
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    dialogo.current?.showModal();
    return () => { if (anterior?.isConnected) anterior.focus(); };
  }, []);
  useEffect(() => setOutroPagamento(false), [cliente, parcela, dia, valor]);
  const fechar = () => { if (!enviando.current) aoFechar(); };
  const alterarConta = (id: string) => {
    setConta(id);
    const c = contas.find((c) => c.id === id);
    setValor(c?.moeda === "BRL" ? String(c.saldo) : "");
    setMoeda(c?.moeda ?? "BRL");
  };
  let datas: string[] = [];
  if (tipo === "conta") {
    try { datas = datasDoCompromisso(dia, frequencia, frequencia === "unico" ? 1 : quantas); } catch { /* o formulário solicita os dados */ }
  }
  return <dialog ref={dialogo} className={o.dialogo} aria-labelledby={id} onCancel={(e) => { e.preventDefault(); fechar(); }}
    onClick={(e) => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) fechar(); } }}>
    <div className={o.dialogoCabeca}><h2 id={id}>{titulo}</h2><button type="button" className={s.botao} onClick={fechar} disabled={salvando} aria-label="Fechar lançamento">×</button></div>
    <p className={o.nota}>{tipo === "conta" ? "Cadastre uma vez. Os vencimentos aparecem em A pagar; a despesa só conta depois de paga." : "Informe o valor e a data em que o dinheiro realmente foi movimentado."}</p>
    <form className={o.form} onSubmit={async (e) => {
      e.preventDefault();
      if (enviando.current) return;
      enviando.current = true;
      setErro(""); setSalvando(true);
      const campos = Object.fromEntries(new FormData(e.currentTarget));
      try {
        let resultado;
        if (tipo === "recebi") {
          if (automaticos.length && !outroPagamento) { setErro("Confira o recebimento automático antes de registrar outro pagamento."); return; }
          resultado = await lancarRecebimento({
            request_id: request, lead_id: cliente, parcela_id: parcela || null,
            valor: Number(valor), recebido_em: dia, metodo: String(campos.metodo),
            valor_liquido: semTaxa ? Number(valor) : campos.liquido === "" ? null : Number(campos.liquido),
            notas: String(campos.notas ?? ""),
          });
        } else if (tipo === "paguei") {
          resultado = await registrarDespesa({ ...campos, request_id: request, valor, pago_em: dia,
            nome: compromisso?.descricao ?? campos.nome,
            categoria: dados.custos.find((c) => c.id === compromisso?.custo_id)?.categoria ?? campos.categoria,
            moeda_original: moeda, custo_id: compromisso?.custo_id, ocorrencia_id: compromisso?.id,
          });
        } else {
          resultado = await criarCompromisso({ ...campos, request_id: request, valor, moeda, frequencia,
            primeiro_vencimento: dia, quantas: frequencia === "unico" ? 1 : quantas,
          });
        }
        if (resultado.ok) { router.refresh(); aoSalvar(dia); }
        else setErro("erro" in resultado ? resultado.erro : "Confira os dados do lançamento.");
      } catch { setErro("Não consegui confirmar o lançamento. Tente novamente neste formulário para evitar duplicação."); }
      finally { enviando.current = false; setSalvando(false); }
    }}>
      <fieldset disabled={salvando}>
      {tipo === "recebi" ? <>
        <label className={o.inteiro}>Cliente<select required value={cliente} onChange={(e) => { setCliente(e.target.value); setParcela(""); setValor(""); }} autoFocus>
          <option value="">Escolha o cliente</option>{dados.clientes.map((c) => <option key={c.id} value={c.id}>{c.empresa || c.nome}</option>)}
        </select></label>
        <label className={o.inteiro}>Parcela<select value={parcela} onChange={(e) => { setParcela(e.target.value); const p = dados.parcelas.find((p) => p.id === e.target.value); setValor(p ? String(p.saldo) : ""); }}>
          <option value="">Recebimento avulso, sem parcela</option>{parcelasCliente.map((p) => <option key={p.id} value={p.id}>{p.rotulo} · {dataCurta(p.vence_em)} · falta {reais(p.saldo, true)}</option>)}
        </select></label>
        {!parcelasCliente.length && cliente ? <p className={o.nota + " " + o.inteiro}>Este cliente não tem parcelas abertas. O recebimento ficará identificado pelo cliente.</p> : null}
      </> : tipo === "paguei" ? <label className={o.inteiro}>Qual conta você pagou?<select value={conta} onChange={(e) => alterarConta(e.target.value)} autoFocus>
        <option value="">Despesa avulsa</option>{contas.filter((c) => c.saldo > 0).map((c) => <option key={c.id} value={c.id}>{c.descricao} · {dataCurta(c.vence_em)} · {c.moeda === "USD" ? "US$ " + c.saldo.toFixed(2) : reais(c.saldo, true)}</option>)}
      </select></label> : null}
      {tipo !== "recebi" && !compromisso ? <>
        <label className={o.inteiro}>Nome da conta ou fornecedor<input name="nome" required maxLength={80} placeholder="Ex.: hospedagem, contador, anúncio" autoFocus={tipo === "conta"} /></label>
        <label>Categoria<select name="categoria" defaultValue="ferramenta">{Object.entries(CATEGORIAS).map(([id, c]) => <option key={id} value={id}>{c.nome}</option>)}</select></label>
      </> : null}
      {tipo === "conta" || (tipo === "paguei" && !compromisso) ? <label>{tipo === "conta" ? "Moeda da conta" : "Moeda original"}<select value={moeda} onChange={(e) => setMoeda(e.target.value as "BRL" | "USD")}><option value="BRL">Reais (R$)</option><option value="USD">Dólar (US$)</option></select></label> : null}
      <label>{tipo === "conta" ? `Valor por vencimento (${moeda === "USD" ? "US$" : "R$"})` : tipo === "recebi" ? "Valor recebido (R$)" : "Valor pago em reais (R$)"}
        <input required type="number" inputMode="decimal" min="0.01" step="0.01" max={tipo === "recebi" ? pendente?.saldo : undefined} value={valor} onChange={(e) => setValor(e.target.value)} />
      </label>
      <label>{tipo === "conta" ? "Primeiro vencimento" : "Data do pagamento"}<input required type="date" value={dia} max={tipo === "conta" ? undefined : dados.hoje} onChange={(e) => setDia(e.target.value)} /></label>
      {tipo === "recebi" ? <>
        <label>Forma de pagamento<select name="metodo" defaultValue={inicial?.metodo_previsto ?? "pix"}>{METODOS.map((m) => <option key={m} value={m}>{NOME_METODO[m]}</option>)}</select></label>
        <label>Valor líquido (R$)<input type="number" name="liquido" min="0" max={valor || undefined} step="0.01" placeholder="Conferir depois" disabled={semTaxa} /></label>
        <label className={o.check + " " + o.inteiro}><input type="checkbox" checked={semTaxa} onChange={(e) => setSemTaxa(e.target.checked)} />Conferi: este pagamento não teve taxa.</label>
        {pendente && Number(valor) > 0 ? <p className={o.mensagem}>{Number(valor) < pendente.saldo ? `Após este recebimento, restarão ${reais(pendente.saldo - Number(valor), true)} nesta parcela.` : Number(valor) === pendente.saldo ? "Este recebimento quita a parcela selecionada." : `O valor supera o saldo em ${reais(Number(valor) - pendente.saldo, true)}. Confira a parcela e o valor antes de salvar.`}</p> : null}
        {automaticos.length ? <div className={o.mensagem + " " + o.inteiro} data-erro="true"><b>Já existe recebimento automático com este cliente, valor e data.</b><p>Confira no extrato antes de lançar novamente.</p><Link href="/crm/conciliacao">Conferir recebimento</Link><label className={o.check}><input type="checkbox" checked={outroPagamento} onChange={(e) => setOutroPagamento(e.target.checked)} />Conferi: este é outro pagamento.</label></div> : null}
      </> : null}
      {tipo === "paguei" && moeda === "USD" ? <label>Valor pago na moeda original (US$)<input name="valor_original" type="number" min="0.01" step="0.01" required defaultValue={compromisso?.saldo} /></label> : null}
      {tipo === "paguei" && compromisso ? <p className={o.nota + " " + o.inteiro}>O pagamento ficará vinculado a {compromisso.descricao}. Se for parcial, o restante continuará em A pagar.</p> : null}
      {tipo === "conta" ? <>
        <label>Repetir<select value={frequencia} onChange={(e) => setFrequencia(e.target.value as Custo["frequencia"])}>{Object.entries(FREQUENCIAS).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label>
        {frequencia !== "unico" ? <label>Quantos vencimentos gerar?<input type="number" required min="1" max="24" value={quantas} onChange={(e) => setQuantas(Number(e.target.value))} /></label> : null}
        {datas.length ? <p className={o.mensagem}>{datas.length} vencimento(s), de {dataCurta(datas[0])} a {dataCurta(datas[datas.length - 1])}, de {moeda === "USD" ? "US$ " + Number(valor || 0).toFixed(2) : reais(Number(valor || 0), true)} cada. Nenhum pagamento será registrado agora.</p> : null}
      </> : <label className={o.inteiro}>Observação (opcional)<input name="notas" maxLength={1000} /></label>}
      </fieldset>
      {erro ? <p role="alert" className={o.mensagem} data-erro="true">{erro}</p> : null}
      <div className={o.rodape}><button type="button" className={s.botao} onClick={fechar} disabled={salvando}>Cancelar</button><button className={s.botao + " " + s.primario} disabled={salvando || (automaticos.length > 0 && !outroPagamento)}>{salvando ? "Salvando…" : tipo === "conta" ? "Cadastrar e gerar vencimentos" : "Confirmar lançamento"}</button></div>
    </form>
  </dialog>;
}
