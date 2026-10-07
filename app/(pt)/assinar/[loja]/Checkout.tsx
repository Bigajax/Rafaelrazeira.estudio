"use client";

import { useEffect, useRef, useState } from "react";
import s from "./assinar.module.css";

/**
 * O CHECKOUT DO PERFORMANCE (07/10/2026). Escolhe o jeito de pagar e paga
 * sem sair da página: Pix com QR e copia e cola (consulta o status a cada 4
 * segundos), cartão pelo Brick do Mercado Pago (os campos do cartão são
 * dele, o número nunca passa por nós). O valor exibido vem do servidor; o
 * cobrado também, pela rota /api/performance-pagamento.
 */
/* (07/10) os upgrades usam o mesmo checkout: o id é o do plano ou do
   upgrade, e `preco`/`diz` trazem a linha quando não é um dos três do Performance */
export type Plano = { id: string; rotulo: string; valor: number; dias?: number; metodo: "pix" | "assinatura" | "cartao"; maxParcelas?: number; preco?: string; diz?: string };

declare global {
  interface Window {
    MercadoPago?: new (chave: string, opcoes: { locale: string }) => {
      bricks: () => { create: (tipo: string, id: string, opcoes: unknown) => Promise<{ unmount: () => void }> };
    };
  }
}

const API = "/api/performance-pagamento";
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: v % 1 ? 2 : 0 });

/* o que cada jeito promete, em uma linha; nunca "sem juros" (regra da casa) */
const LINHA: Record<string, { preco: (p: Plano) => string; diz: string }> = {
  pix_mensal: { preco: (p) => `${brl(p.valor)} por mês`, diz: "Cada Pix vale 30 dias. O painel avisa antes de acabar." },
  cartao_mensal: { preco: (p) => `${brl(p.valor)} por mês`, diz: "Renova sozinho todo mês. Cancele quando quiser." },
  cartao_anual: { preco: (p) => brl(p.valor), diz: "O ano todo pelo preço de 10 meses, em até 12x." },
};

/* o desconto do anual, em contas sobre o mensal (07/10, "o cliente tem que
   ver o desconto"): 12 meses cheios, a economia e quanto dá por mês. Nenhum
   número novo: tudo sai dos dois valores de lib/oferta-performance.ts. */
function descontoDoAnual(planos: Plano[]) {
  const mes = planos.find((p) => p.id === "pix_mensal")?.valor ?? 0;
  const ano = planos.find((p) => p.id === "cartao_anual")?.valor ?? 0;
  const cheio = mes * 12;
  return { cheio, economia: cheio - ano, porMes: ano / 12 };
}

/* embutida no painel, a página conta ao painel a altura dela e o pagamento */
function avisarPainel(msg: { tipo: "perf-altura"; h: number } | { tipo: "perf-pago" }) {
  try {
    if (window.parent !== window) window.parent.postMessage(msg, "*");
  } catch {
    /* fora de um iframe, ninguém escuta */
  }
}

export function Checkout({ loja, planos, inicial, renovaSozinho, embutida = false }: { loja: string; planos: Plano[]; inicial: Plano["id"]; renovaSozinho: boolean; embutida?: boolean }) {
  const [escolha, setEscolha] = useState<Plano["id"]>(inicial);
  const plano = planos.find((p) => p.id === escolha)!;
  const d = descontoDoAnual(planos);

  /* a altura, a cada mudança: o painel ajusta o modal sem barra dupla */
  useEffect(() => {
    if (!embutida) return;
    const mandar = () => avisarPainel({ tipo: "perf-altura", h: document.documentElement.scrollHeight });
    mandar();
    const ro = new ResizeObserver(mandar);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [embutida]);

  return (
    <section className={s.checkout} aria-label="Como pagar">
      <div className={s.planos} role="radiogroup" aria-label="Jeito de pagar">
        {planos.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={p.id === escolha} className={s.plano} onClick={() => setEscolha(p.id)}>
            {p.id === "cartao_anual" ? <span className={s.selo}>2 meses de presente</span> : null}
            <span className={s.planoNome}>{p.rotulo}</span>
            {p.id === "cartao_anual" && d.economia > 0 ? <s className={s.planoCheio}>{brl(d.cheio)}</s> : null}
            <b className={s.planoPreco}>{p.preco ?? LINHA[p.id]?.preco(p) ?? brl(p.valor)}</b>
            {p.id === "cartao_anual" && d.economia > 0 ? (
              <span className={s.planoEconomia}>
                Você economiza {brl(d.economia)}. Dá {brl(Math.round(d.porMes))} por mês.
              </span>
            ) : null}
            <span className={s.planoDiz}>{p.diz ?? LINHA[p.id]?.diz}</span>
          </button>
        ))}
      </div>

      {escolha === "cartao_mensal" && renovaSozinho ? (
        <p className={s.aviso}>Esta loja já tem a assinatura no cartão ativa. Ela renova sozinha: não precisa assinar de novo.</p>
      ) : plano.metodo === "pix" ? (
        <Pix key={plano.id} loja={loja} plano={plano} />
      ) : (
        <Cartao key={plano.id} loja={loja} plano={plano} />
      )}
    </section>
  );
}

/* ── o Pix ─────────────────────────────────────────────────── */

function Pix({ loja, plano }: { loja: string; plano: Plano }) {
  const [dados, setDados] = useState({ nome: "", email: "", cpf: "" });
  const [estado, setEstado] = useState<"form" | "gerando" | "qr" | "pago" | "erro">("form");
  const [erro, setErro] = useState("");
  const [qr, setQr] = useState<{ id: number; qr_code: string; qr_code_base64: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  /* o status do Pix, a cada 4 segundos, até pagar ou expirar */
  useEffect(() => {
    if (estado !== "qr" || !qr) return;
    const t = setInterval(async () => {
      const r = await fetch(`${API}?status=${qr.id}`).then((x) => x.json()).catch(() => null);
      if (r?.status === "approved") setEstado("pago");
    }, 4000);
    return () => clearInterval(t);
  }, [estado, qr]);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("gerando");
    setErro("");
    const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ loja, plano: plano.id, payer: dados }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.qr_code) {
      setErro(j.error || "Não foi possível gerar o Pix.");
      setEstado("erro");
      return;
    }
    setQr(j);
    setEstado("qr");
  }

  if (estado === "pago") return <Pago />;

  if (estado === "qr" && qr) {
    return (
      <div className={s.fluxo}>
        <p className={s.passo}>Pague {brl(plano.valor)} no app do banco</p>
        <div className={s.qr}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${qr.qr_code_base64}`} alt="QR do Pix" width={220} height={220} />
          <div>
            <p>Aponte a câmera do app do banco, ou copie o código.</p>
            <button
              type="button"
              className={s.botaoLinha}
              onClick={() => {
                void navigator.clipboard?.writeText(qr.qr_code);
                setCopiado(true);
              }}
            >
              {copiado ? "Código copiado" : "Copiar o código Pix"}
            </button>
            <p className={s.espera}>Esperando o pagamento. Esta página muda sozinha quando o Pix cair.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className={s.fluxo} onSubmit={gerar}>
      <p className={s.passo}>Quem paga</p>
      <div className={s.campos}>
        <label>
          <span>Nome</span>
          <input required value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} autoComplete="name" />
        </label>
        <label>
          <span>E-mail</span>
          <input required type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} autoComplete="email" />
        </label>
        <label>
          <span>CPF</span>
          <input required inputMode="numeric" value={dados.cpf} onChange={(e) => setDados({ ...dados, cpf: e.target.value })} placeholder="000.000.000-00" />
        </label>
      </div>
      {estado === "erro" ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}
      <button type="submit" className={s.carimbo} disabled={estado === "gerando"}>
        {estado === "gerando" ? "Gerando o Pix…" : `Gerar o Pix de ${brl(plano.valor)}`}
      </button>
    </form>
  );
}

/* ── o cartão (Brick do Mercado Pago) ──────────────────────── */

let sdk: Promise<void> | null = null;
function carregarSdk() {
  if (sdk) return sdk;
  sdk = new Promise((ok, falha) => {
    if (window.MercadoPago) return ok();
    const el = document.createElement("script");
    el.src = "https://sdk.mercadopago.com/js/v2";
    el.onload = () => ok();
    el.onerror = () => falha(new Error("Não foi possível carregar o Mercado Pago."));
    document.head.appendChild(el);
  });
  return sdk;
}

function Cartao({ loja, plano }: { loja: string; plano: Plano }) {
  const [estado, setEstado] = useState<"carregando" | "pronto" | "pago" | "analise" | "erro">("carregando");
  const [erro, setErro] = useState("");
  const montado = useRef<{ unmount: () => void } | null>(null);
  const id = `brick-${plano.id}`;

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const cfg = await fetch(`${API}?loja=${loja}`).then((r) => r.json());
        /* sem a chave pública (Mercado Pago fora do ar, ou a máquina local sem as variáveis), a frase é de gente, não do SDK */
        if (!cfg || typeof cfg.publicKey !== "string") throw new Error("O cartão não está disponível agora. Pague pelo Pix, ou tente de novo em alguns minutos.");
        await carregarSdk();
        if (!vivo || !window.MercadoPago) return;
        const mp = new window.MercadoPago(cfg.publicKey, { locale: "pt-BR" });
        montado.current = await mp.bricks().create("cardPayment", id, {
          initialization: { amount: plano.valor },
          customization: {
            paymentMethods: { minInstallments: 1, maxInstallments: plano.metodo === "assinatura" ? 1 : plano.maxParcelas || 1 },
            visual: {
              texts: { formSubmit: plano.metodo === "assinatura" ? `Assinar por ${brl(plano.valor)} por mês` : `Pagar ${brl(plano.valor)}` },
              style: { customVariables: { baseColor: "#e31b62", borderRadiusMedium: "0px", borderRadiusLarge: "0px", borderRadiusFull: "0px" } },
            },
          },
          callbacks: {
            onReady: () => vivo && setEstado("pronto"),
            onError: () => {
              setErro("O formulário do cartão não carregou. Recarregue a página.");
              setEstado("erro");
            },
            onSubmit: async (data: { formData?: Record<string, unknown> } & Record<string, unknown>) => {
              const fd = (data && data.formData) || data || {};
              const r = await fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ loja, plano: plano.id, card: { token: fd.token, payment_method_id: fd.payment_method_id, issuer_id: fd.issuer_id, installments: fd.installments, payer: fd.payer } }),
              });
              const j = await r.json().catch(() => ({}));
              if (!r.ok) {
                setErro(j.error || "O cartão foi recusado. Confira os dados ou tente outro cartão.");
                setEstado("erro");
                return;
              }
              if (j.status === "approved") setEstado("pago");
              else if (j.status === "in_process" || j.status === "pending") setEstado("analise");
              else {
                setErro("O cartão foi recusado. Confira os dados ou tente outro cartão.");
                setEstado("erro");
              }
            },
          },
        });
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível carregar o pagamento.");
        setEstado("erro");
      }
    })();
    return () => {
      vivo = false;
      montado.current?.unmount();
    };
  }, [loja, plano, id]);

  if (estado === "pago") return <Pago assinatura={plano.metodo === "assinatura"} />;
  if (estado === "analise")
    return (
      <div className={s.fluxo}>
        <p className={s.passo}>Pagamento em análise</p>
        <p>O banco está conferindo a compra. Assim que aprovar, o Performance liga sozinho no seu painel.</p>
      </div>
    );

  return (
    <div className={s.fluxo}>
      <p className={s.passo}>{plano.metodo === "assinatura" ? "O cartão da assinatura" : "O cartão"}</p>
      {plano.metodo === "assinatura" ? <p className={s.nota}>A cobrança se repete todo mês no mesmo cartão, até você cancelar.</p> : null}
      {estado === "carregando" ? <p className={s.espera}>Carregando o formulário seguro do Mercado Pago…</p> : null}
      {estado === "erro" ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}
      <div id={id} className={s.brick} />
    </div>
  );
}

function Pago({ assinatura = false }: { assinatura?: boolean }) {
  useEffect(() => avisarPainel({ tipo: "perf-pago" }), []);
  return (
    <div className={`${s.fluxo} ${s.pago}`}>
      <p className={s.passo}>Pago</p>
      <h2>O Performance está ligado.</h2>
      <p>{assinatura ? "A assinatura renova sozinha todo mês. " : ""}Abra a aba Desempenho do seu painel: os números completos já aparecem.</p>
    </div>
  );
}
