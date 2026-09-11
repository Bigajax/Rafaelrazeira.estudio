"use client";

import { FormEvent, useEffect, useState } from "react";
import s from "./registrar.module.css";

/* ============================================================
   Formulário de registro de venda fechada.

   A SENHA NÃO VIVE NO CÓDIGO. Se o VENDA_TOKEN fosse embutido aqui, ele iria
   no pacote JavaScript e qualquer pessoa que abrisse a página teria a chave
   da rota. Em vez disso o Rafael digita uma vez e o navegador dele guarda,
   como qualquer senha. O servidor continua sendo o único que sabe se está
   certa.
   ============================================================ */

const CHAVE_SENHA = "venda_token";

type Resposta = {
  ok?: boolean;
  erro?: string;
  teste?: boolean;
  amarrado_a_visita?: boolean;
  registrado?: { telefone: string; valor: number; moeda: string; data: string };
  validacao?: string;
  meta?: unknown;
};

const hoje = () => new Date().toISOString().slice(0, 10);

const reais = (v?: number, moeda = "BRL") => {
  if (typeof v !== "number") return "-";
  try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(v); }
  catch { return `${moeda} ${v}`; }
};

export default function RegistrarVenda() {
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [teste, setTeste] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [r, setR] = useState<Resposta | null>(null);
  const [data, setData] = useState("");

  /* a data só depois da montagem: calcular no render faria o HTML do servidor
     e o do browser diferirem quando o build e o acesso caem em dias
     diferentes, e o React reclama de hidratação */
  useEffect(() => {
    setData(hoje());
    try {
      const guardada = localStorage.getItem(CHAVE_SENHA);
      if (guardada) setSenha(guardada);
    } catch {}
  }, []);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEnviando(true);
    setR(null);

    try {
      if (lembrar) localStorage.setItem(CHAVE_SENHA, senha);
      else localStorage.removeItem(CHAVE_SENHA);
    } catch {}

    /* valor aceito como a pessoa digita: "999", "R$ 999", "1.499,00" */
    const bruto = String(f.get("valor") || "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");

    const corpo: Record<string, unknown> = {
      telefone: f.get("telefone"),
      valor: Number(bruto),
      data: f.get("data"),
    };
    const nome = String(f.get("nome") || "").trim();
    const ref = String(f.get("ref") || "").trim();
    const codigo = String(f.get("test_event_code") || "").trim();
    if (nome) corpo.nome = nome;
    if (ref) corpo.ref = ref;
    if (teste && codigo) corpo.test_event_code = codigo;

    try {
      const res = await fetch("/api/venda-fechada", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-venda-token": senha },
        body: JSON.stringify(corpo),
      });
      setR(await res.json());
    } catch {
      setR({ ok: false, erro: "não deu para falar com o servidor. Confira a conexão e tente de novo." });
    } finally {
      setEnviando(false);
    }
  }

  return <div className={s.tela}>
    <div className={s.wrap}>
      <p className={s.marca}>RAFAEL RAZEIRA · ESTÚDIO</p>
      <h1 className={s.titulo}>Registrar venda</h1>
      <p className={s.sub}>
        Avisa a Meta que esta pessoa comprou, para a campanha procurar gente
        parecida com quem paga. Registre em até 7 dias.
      </p>

      <form className={s.form} onSubmit={enviar}>
        <div className={s.campo}>
          <label htmlFor="telefone">TELEFONE DO CLIENTE</label>
          <input id="telefone" name="telefone" required inputMode="tel" autoComplete="off" placeholder="44 98888-1234" />
          <span className={s.dica}>Como estiver no WhatsApp. Com ou sem parênteses, tanto faz.</span>
        </div>

        <div className={s.dupla}>
          <div className={s.campo}>
            <label htmlFor="valor">VALOR</label>
            <input id="valor" name="valor" required inputMode="decimal" autoComplete="off" placeholder="999" defaultValue="999" />
          </div>
          <div className={s.campo}>
            <label htmlFor="data">DATA DA VENDA</label>
            <input id="data" name="data" type="date" value={data} onChange={e => setData(e.target.value)} max={hoje()} />
          </div>
        </div>

        <div className={s.campo}>
          <label htmlFor="ref">CÓDIGO DA VISITA</label>
          <input id="ref" name="ref" autoComplete="off" placeholder="CFK7KLS8" />
          <span className={s.dica}>
            A última linha da mensagem que chegou, depois de &quot;Ref:&quot;. Sem ela a venda
            ainda conta, só não amarra no anúncio que trouxe a pessoa.
          </span>
        </div>

        <div className={s.campo}>
          <label htmlFor="nome">NOME</label>
          <input id="nome" name="nome" autoComplete="off" placeholder="Ana" />
          <span className={s.dica}>Opcional. Ajuda a Meta a reconhecer a pessoa.</span>
        </div>

        <label className={s.modo}>
          <input type="checkbox" checked={teste} onChange={e => setTeste(e.target.checked)} />
          MODO TESTE (NÃO CONTA COMO VENDA)
        </label>
        {teste && <div className={s.campo}>
          <label htmlFor="test_event_code">CÓDIGO DO TESTE</label>
          <input id="test_event_code" name="test_event_code" autoComplete="off" placeholder="TEST58158" />
          <span className={s.dica}>Events Manager, aba Testar eventos.</span>
        </div>}

        <div className={s.acesso}>
          <div className={s.campo}>
            <label htmlFor="senha">SENHA DA FERRAMENTA</label>
            <input id="senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} required autoComplete="current-password" />
          </div>
          <label className={s.lembrar}>
            <input type="checkbox" checked={lembrar} onChange={e => setLembrar(e.target.checked)} />
            lembrar neste aparelho
          </label>
        </div>

        <button className={`${s.botao} ${teste ? s.botaoTeste : ""}`} disabled={enviando}>
          {enviando ? "REGISTRANDO…" : teste ? "ENVIAR TESTE ↗" : "REGISTRAR VENDA ↗"}
        </button>
      </form>

      {r && <Resultado r={r} />}
    </div>
  </div>;
}

/* O resultado tem uma pergunta só a responder: contou ou não contou.
   Quem usa isto está com o celular na mão entre um atendimento e outro, e
   não vai interpretar JSON para descobrir. */
function Resultado({ r }: { r: Resposta }) {
  if (r.ok) {
    return <div className={`${s.resultado} ${s.ok}`} role="status">
      <span className={`${s.selo} ${r.teste ? s.seloTeste : s.seloValendo}`}>
        {r.teste ? "TESTE · NÃO CONTOU" : "VALENDO · CONTOU"}
      </span>
      <h2>{r.teste ? "Teste enviado." : "Venda registrada."}</h2>
      <p>
        {r.teste
          ? "Abra a aba Testar eventos do Events Manager: o Purchase aparece lá em alguns segundos."
          : "A Meta recebeu a compra e vai usar esta pessoa como exemplo para achar compradores parecidos."}
      </p>
      <ul className={s.linhas}>
        <li><span>telefone</span><b>{r.registrado?.telefone}</b></li>
        {/* confirmação de dinheiro se lê em real, não em "BRL 1499" */}
        <li><span>valor</span><b>{reais(r.registrado?.valor, r.registrado?.moeda)}</b></li>
        <li><span>data</span><b>{r.registrado?.data}</b></li>
        <li><span>amarrado ao anúncio</span><b>{r.amarrado_a_visita ? "sim" : "não, só pelo telefone"}</b></li>
      </ul>
    </div>;
  }
  return <div className={`${s.resultado} ${s.falha}`} role="alert">
    <h2>Não registrou.</h2>
    <p>{r.erro || "erro desconhecido"}</p>
    {r.validacao === "passou" && <p>Os dados estavam certos: o que faltou foi a configuração do servidor.</p>}
  </div>;
}
