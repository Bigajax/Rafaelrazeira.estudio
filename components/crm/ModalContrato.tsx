"use client";

/* ============================================================
   MONTAR O CONTRATO

   Dois caminhos, e o primeiro é o que fecha o circuito que o estúdio não
   tinha: a constante PROPOSTAS (lib/propostas.ts) guarda os planos de
   pagamento EXATOS de cada cliente, porque é ela quem cobra de verdade nos
   botões da página da proposta. Até 20/08 o CRM não sabia dela, e montar o
   contrato da vérít.lab significava redigitar R$ 199 e R$ 800 na mão,
   torcendo para bater com o que o botão cobra.

   ---------- por que caixas de marcar e não "importar tudo" ----------
   Os itens de uma proposta não somam: `avista_pix` é ALTERNATIVA a
   `entrada_pix + saldo_card`, não um terceiro pagamento. Importar todos
   criaria um contrato de R$ 1.998 para uma venda de R$ 999. Quem escolheu
   foi o cliente, então quem marca é o Rafael.

   ---------- e o item é UM recebimento, sempre ----------
   "No cartão, em até 4x" é UMA linha aqui. O Mercado Pago repassa de uma
   vez e quem parcela é o banco do cliente; `maxParcelas` descreve como ele
   paga, não o cronograma do que entra. Errar isso multiplicaria o plano por
   quatro, e é o erro mais fácil de cometer nesta tela.
   ============================================================ */

import { useEffect, useMemo, useState, useTransition } from "react";
import { contratosAtivosDoLead, fecharContrato, fecharVenda, voltarParaGanho } from "@/app/(pt)/crm/acoes";
import { lojasParaContrato } from "@/app/(pt)/crm/acoes-performance";
import { PROPOSTAS } from "@/lib/propostas";
import { centavos, dinheiroExato, gerarMensalidades, gerarParcelas } from "@/lib/crm/financeiro";
import { somarDias, somarMeses } from "@/lib/crm/regras";
import type { LeadPainel } from "@/lib/crm/tipos";
import s from "@/app/(pt)/crm/crm.module.css";

/* "mensal" (06/10): a recorrência do Performance. Valor por mês, quantas
   gerar agora (três, e o cartão do contrato gera mais), e a loja da
   contagem que o recebimento vai liberar. Sem proposta por enquanto: o
   preço ainda está em teste, e escrevê-lo em lib/propostas.ts seria
   publicar um número que não existe. */
type Modo = "proposta" | "manual" | "mensal";

const SLUGS = Object.keys(PROPOSTAS).sort();

/* ---------- a proposta do lead, quando o nome diz qual é (06/10) ----------
   O slug da proposta é o nome da loja ("sneakerspot", "japa-modas"), e o
   card carrega o mesmo nome no @, no nome ou na empresa. Compara sem
   acento, ponto, traço, sublinhado e espaço, e só escolhe quando UM slug
   bate: dois candidatos, ou nenhum, deixa o select para o Rafael. Nunca
   chutar por semelhança: @snekerspot não é sneakerspot para esta função,
   e um contrato na proposta errada cobra o preço de outro cliente. */
const limpo = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
function slugDoLead(lead: LeadPainel): string {
  const nomes = [lead.instagram, lead.nome, lead.empresa].map(limpo).filter(Boolean);
  const achados = SLUGS.filter((sl) => {
    const alvo = limpo(sl);
    return nomes.some((n) => n === alvo || (alvo.length >= 6 && n.startsWith(alvo)));
  });
  return achados.length === 1 ? achados[0] : "";
}

export function ModalContrato({
  lead,
  hoje,
  aoFechar,
  ganhar = false,
}: {
  lead: LeadPainel;
  hoje: string;
  aoFechar: () => void;
  /* "Fechou" (06/10): o mesmo modal leva o lead para Ganho, monta o
     contrato e dá baixa no que já caiu, num passo só (`fecharVenda`). */
  ganhar?: boolean;
}) {
  const slugInicial = useMemo(() => slugDoLead(lead), [lead]);
  const [modo, setModo] = useState<Modo>(slugInicial ? "proposta" : ganhar ? "manual" : "proposta");
  const [slug, setSlug] = useState(slugInicial);
  /* O que já caiu na conta, pelo número da parcela, e em que dia. */
  const [pagas, setPagas] = useState<number[]>([]);
  const [caiuEm, setCaiuEm] = useState(hoje);
  const [fechadoEm, setFechadoEm] = useState(lead.fechado_em ?? hoje);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [titulo, setTitulo] = useState("");

  /* O manual: total, entrada e em quantas vezes o SALDO se divide. É o
     caminho do Pix na chave direta e da venda que nunca passou por
     proposta nenhuma. */
  const [total, setTotal] = useState("999");
  const [entrada, setEntrada] = useState("199");
  const [vezes, setVezes] = useState("1");
  const [primeiro, setPrimeiro] = useState(hoje);

  /* A mensalidade: valor por mês, quantas gerar agora, a loja do Performance. */
  const [mensal, setMensal] = useState("");
  const [mesesGerar, setMesesGerar] = useState("3");
  const [lojaPerf, setLojaPerf] = useState("");
  const [lojas, setLojas] = useState<{ id: string; nome: string; slug: string; doLead: boolean }[] | null>(null);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();

  const proposta = slug ? PROPOSTAS[slug] : null;

  /* ---------- JÁ TEM CONTRATO (06/10) ----------
     O lead que saiu de Ganho por engano e volta já tem o plano. Montar
     outro dobrava o "Contratado" e as parcelas no Caixa. No "Fechou", o
     modal pergunta ao servidor antes de desenhar o plano e, havendo
     contrato de projeto de pé, troca o formulário por um aviso e o botão
     por "Voltar para Ganho". `null` é "ainda não sei": o formulário espera. */
  const [jaTem, setJaTem] = useState<{ id: string; titulo: string; valor_total: number | null }[] | null>(ganhar ? null : []);
  useEffect(() => {
    if (!ganhar) return;
    let vivo = true;
    contratosAtivosDoLead(lead.id)
      .then((lista) => vivo && setJaTem(lista))
      .catch(() => vivo && setJaTem([]));
    return () => {
      vivo = false;
    };
  }, [ganhar, lead.id]);

  const voltar = () => {
    setErro(null);
    comecar(async () => {
      const r = await voltarParaGanho(lead.id);
      if (r.ok) aoFechar();
      else setErro("erro" in r ? r.erro : "Não deu para voltar para Ganho.");
    });
  };

  useEffect(() => {
    if (modo !== "mensal" || lojas !== null) return;
    lojasParaContrato(lead.id).then((lista) => {
      setLojas(lista);
      const doLead = lista.find((l) => l.doLead);
      if (doLead) setLojaPerf(doLead.id);
    });
  }, [modo, lojas, lead.id]);

  useEffect(() => {
    if (modo === "mensal" && !titulo) setTitulo("Performance");
  }, [modo, titulo]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  /* O título vem da proposta e continua editável: "Rafael Razeira Estúdio —
     Vitrine Digital ArraZou Semijoias" é o nome comercial do documento, e
     dentro do CRM o que se lê é o projeto. Corta o prefixo da casa, que é
     redundante numa ferramenta que só tem uma casa. */
  useEffect(() => {
    if (!proposta) return;
    setTitulo(proposta.titulo.replace(/^Rafael Razeira Est[úu]dio\s*[—,-]\s*/, ""));
    setMarcados([]);
  }, [proposta]);

  /* As parcelas que vão ser gravadas, calculadas na tela e refeitas no
     servidor. Sempre visíveis antes de confirmar: um plano de pagamento é
     a coisa mais fácil de errar em silêncio nesta ferramenta. */
  const previa = useMemo(() => {
    if (modo === "proposta") {
      if (!proposta) return [];
      return marcados.map((id, i) => {
        const item = proposta.itens[id];
        return {
          numero: i + 1,
          de: marcados.length,
          rotulo: item.label,
          valor: centavos(item.valor),
          /* A primeira vence hoje (a entrada se paga na hora de aceitar), e
             cada seguinte trinta dias depois. Datas são chute honesto e
             editáveis depois, na ficha: o que não pode é a parcela nascer
             sem data e some da fila. */
          vence_em: somarDias(primeiro, 30 * i),
          item_slug: id,
          metodo_previsto: item.metodo === "card" ? "cartao" : "pix",
        };
      });
    }
    if (modo === "mensal") {
      const v = Number(mensal) || 0;
      if (v <= 0) return [];
      return gerarMensalidades({ valor: v, meses: Math.max(1, Math.min(12, Number(mesesGerar) || 3)), primeiro, somarMeses });
    }
    const t = Number(total) || 0;
    const e = Number(entrada) || 0;
    if (t <= 0) return [];
    return gerarParcelas({
      total: t,
      entrada: Math.min(e, t),
      vezes: Math.max(1, Number(vezes) || 1),
      primeiro,
      somarDias,
    });
  }, [modo, proposta, marcados, primeiro, total, entrada, vezes, mensal, mesesGerar]);

  const somaPrevia = centavos(previa.reduce((acc, p) => acc + p.valor, 0));

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    setErro(null);
    comecar(async () => {
      const contrato = {
        titulo: titulo.trim() || lead.nome,
        valor_total: modo === "proposta" ? somaPrevia : modo === "mensal" ? somaPrevia : Number(total),
        proposta_slug: modo === "proposta" ? slug : null,
        tipo: modo === "mensal" ? ("recorrencia" as const) : ("projeto" as const),
        valor_ciclo: modo === "mensal" ? Number(mensal) : null,
        dia_vencimento: modo === "mensal" ? Number(primeiro.slice(8, 10)) : null,
        perf_loja_id: modo === "mensal" ? lojaPerf || null : null,
        parcelas: previa,
      };
      if (ganhar) {
        const r = await fecharVenda(
          lead.id,
          { ...contrato, assinado_em: fechadoEm },
          previa
            .filter((p) => pagas.includes(p.numero))
            .map((p) => ({ numero: p.numero, recebido_em: caiuEm, metodo: p.metodo_previsto ?? "pix" })),
        );
        if (r.ok) aoFechar();
        else setErro("erro" in r ? r.erro : "Faltou o valor ou a data do fechamento.");
        return;
      }
      const r = await fecharContrato(lead.id, contrato);
      if (r.ok) aoFechar();
      else setErro(r.erro);
    });
  };

  return (
    <div className={s.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="contrato-titulo">
        <p className={s.modalRot}>{ganhar ? "Fechou" : "Montar contrato"}</p>
        <h2 id="contrato-titulo">{lead.nome}</h2>
        <p>
          {ganhar
            ? "Monte o plano e marque o que já caiu na conta: é isso que leva a venda para o Caixa, o Financeiro e o Plano."
            : "O plano de pagamento é o que faz o sistema saber se você recebeu, e não só se vendeu."}
        </p>

        {jaTem === null ? (
          <p className={s.campoNota}>Conferindo se já existe contrato…</p>
        ) : jaTem.length ? (
          <>
            <div className={s.blocoPergunta}>
              <p className={s.perguntaTitulo}>Este lead já tem contrato de pé</p>
              {jaTem.map((c) => (
                <p key={c.id} className={s.previaLinha}>
                  <span>{c.titulo}</span>
                  <i />
                  <b>{dinheiroExato(c.valor_total ?? 0)}</b>
                </p>
              ))}
              <p className={s.campoNota}>
                Fechar só devolve o lead para Ganho, com o valor destes contratos. Para um plano novo de verdade, use
                &ldquo;Montar outro contrato&rdquo; na ficha.
              </p>
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
              <button type="button" className={s.btnAcao} onClick={voltar} disabled={salvando}>
                {salvando ? "Voltando…" : "Voltar para Ganho"}
              </button>
            </div>
          </>
        ) : (
        <form onSubmit={enviar}>
          <fieldset className={s.grupo}>
            <legend className={s.campoRot}>De onde vem o plano</legend>
            <div className={s.opcoes}>
              <button
                type="button"
                className={`${s.opcao} ${modo === "proposta" ? s.opcaoAtiva : ""}`}
                onClick={() => setModo("proposta")}
                aria-pressed={modo === "proposta"}
              >
                De uma proposta
              </button>
              <button
                type="button"
                className={`${s.opcao} ${modo === "manual" ? s.opcaoAtiva : ""}`}
                onClick={() => setModo("manual")}
                aria-pressed={modo === "manual"}
              >
                À mão
              </button>
              <button
                type="button"
                className={`${s.opcao} ${modo === "mensal" ? s.opcaoAtiva : ""}`}
                onClick={() => setModo("mensal")}
                aria-pressed={modo === "mensal"}
              >
                Mensalidade
              </button>
            </div>
          </fieldset>

          {modo === "mensal" ? (
            <>
              <div className={s.dupla}>
                <label className={s.campo}>
                  <span className={s.campoRot}>Valor por mês</span>
                  <input type="number" step="0.01" min="0" value={mensal} onChange={(e) => setMensal(e.target.value)} placeholder="0,00" />
                </label>
                <label className={s.campo}>
                  <span className={s.campoRot}>Quantos meses gerar agora</span>
                  <input type="number" min="1" max="12" value={mesesGerar} onChange={(e) => setMesesGerar(e.target.value)} />
                </label>
                <label className={s.campo}>
                  <span className={s.campoRot}>Primeira vence em</span>
                  <input type="date" value={primeiro} onChange={(e) => setPrimeiro(e.target.value)} />
                </label>
                <label className={s.campo}>
                  <span className={s.campoRot}>Loja no Performance</span>
                  <select value={lojaPerf} onChange={(e) => setLojaPerf(e.target.value)}>
                    <option value="">{lojas === null ? "Carregando…" : "Nenhuma (só cobrar)"}</option>
                    {(lojas ?? []).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                        {l.doLead ? " (deste lead)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className={s.campoNota}>
                Cada mensalidade quitada no Caixa libera a aba Desempenho da loja por um mês (e cinco dias de folga). Gere poucas: o
                cartão do contrato gera mais quando estiverem acabando.
              </p>
            </>
          ) : modo === "proposta" ? (
            <>
              <label className={s.campo}>
                <span className={s.campoRot}>Qual proposta</span>
                <select value={slug} onChange={(e) => setSlug(e.target.value)}>
                  <option value="">Escolha…</option>
                  {SLUGS.map((sl) => (
                    <option key={sl} value={sl}>
                      {sl}
                    </option>
                  ))}
                </select>
              </label>

              {proposta ? (
                <div className={s.blocoPergunta}>
                  <p className={s.perguntaTitulo}>O que ele escolheu pagar?</p>
                  {/* Os itens não somam: à vista é ALTERNATIVA a entrada mais
                      saldo. Marcar os dois criaria um contrato do dobro. */}
                  {Object.entries(proposta.itens).map(([id, item]) => (
                    <label key={id} className={s.itemPlano}>
                      <input
                        type="checkbox"
                        checked={marcados.includes(id)}
                        onChange={(e) =>
                          setMarcados((atual) =>
                            e.target.checked ? [...atual, id] : atual.filter((x) => x !== id),
                          )
                        }
                      />
                      <span className={s.itemPlanoRot}>
                        {item.label}
                        {item.maxParcelas ? (
                          <i className={s.itemPlanoNota}>
                            até {item.maxParcelas}x no cartão dele: entra de uma vez aqui
                          </i>
                        ) : null}
                      </span>
                      <b className={s.itemPlanoValor}>{dinheiroExato(item.valor)}</b>
                    </label>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className={s.dupla}>
              <label className={s.campo}>
                <span className={s.campoRot}>Valor total</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>Entrada</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>O saldo em quantas vezes</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={vezes}
                  onChange={(e) => setVezes(e.target.value)}
                />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>Primeira vence em</span>
                <input
                  type="date"
                  value={primeiro}
                  onChange={(e) => setPrimeiro(e.target.value)}
                />
              </label>
            </div>
          )}

          <div className={ganhar ? s.dupla : undefined}>
            <label className={s.campo}>
              <span className={s.campoRot}>Nome do projeto</span>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Vitrine Digital"
              />
            </label>
            {ganhar ? (
              <label className={s.campo}>
                <span className={s.campoRot}>Fechou em</span>
                <input type="date" value={fechadoEm} onChange={(e) => setFechadoEm(e.target.value)} required />
              </label>
            ) : null}
          </div>

          {/* ---------- a prévia ----------
              Ela não é enfeite: é a última chance de ver que a data ficou no
              passado ou que o total não é o que se combinou, e o custo de
              descobrir isso depois é cobrar o valor errado de um cliente. */}
          {previa.length ? (
            <div className={s.blocoPergunta}>
              <p className={s.perguntaTitulo}>
                Vão nascer {previa.length} {previa.length === 1 ? "parcela" : "parcelas"}, somando{" "}
                {dinheiroExato(somaPrevia)}
              </p>
              {ganhar
                ? /* No "Fechou" cada parcela vira uma caixa: marcada, ela
                     nasce paga (a baixa entra no Caixa no dia de "caiu em"). */
                  previa.map((p) => (
                    <label key={p.numero} className={s.itemPlano}>
                      <input
                        type="checkbox"
                        checked={pagas.includes(p.numero)}
                        onChange={(e) =>
                          setPagas((atual) =>
                            e.target.checked ? [...atual, p.numero] : atual.filter((x) => x !== p.numero),
                          )
                        }
                      />
                      <span className={s.itemPlanoRot}>
                        {p.rotulo}
                        <i className={s.itemPlanoNota}>
                          {pagas.includes(p.numero)
                            ? "já recebi"
                            : `vence ${p.vence_em.split("-").reverse().slice(0, 2).join("/")}`}
                        </i>
                      </span>
                      <b className={s.itemPlanoValor}>{dinheiroExato(p.valor)}</b>
                    </label>
                  ))
                : previa.map((p) => (
                    <p key={p.numero} className={s.previaLinha}>
                      <span>{p.rotulo}</span>
                      <i>{p.vence_em.split("-").reverse().slice(0, 2).join("/")}</i>
                      <b>{dinheiroExato(p.valor)}</b>
                    </p>
                  ))}
              {ganhar ? (
                pagas.some((n) => previa.some((p) => p.numero === n)) ? (
                  <label className={s.campo}>
                    <span className={s.campoRot}>Caiu na conta em</span>
                    <input type="date" value={caiuEm} onChange={(e) => setCaiuEm(e.target.value)} required />
                  </label>
                ) : (
                  <p className={s.campoNota}>Marque o que já caiu na conta. O resto fica cobrando sozinho no Caixa e na fila do dia.</p>
                )
              ) : null}
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
            <button
              type="submit"
              className={s.btnAcao}
              disabled={salvando || !previa.length}
            >
              {salvando ? "Montando…" : ganhar ? "Fechar a venda" : "Montar contrato"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
