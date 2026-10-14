"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  contextoCliente,
  criarFichaCliente,
  vincularFichaCliente,
  vincularConteudo,
} from "@/app/(pt)/crm/acoes-clientes";
import s from "./sistema.module.css";
export function ClienteConectado({ leadId }: { leadId: string }) {
  const [dados, setDados] = useState<Awaited<ReturnType<typeof contextoCliente>> | null>(null);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  useEffect(() => {
    let vivo = true;
    contextoCliente(leadId)
      .then((d) => {
        if (vivo) setDados(d);
      })
      .catch(() => {
        if (vivo) setErro("Não foi possível carregar a ficha integrada.");
      });
    return () => {
      vivo = false;
    };
  }, [leadId]);
  function abrir(acao: () => ReturnType<typeof criarFichaCliente>) {
    iniciar(async () => {
      const r = await acao();
      if (r.ok) router.push("/crm/clientes/" + r.id);
      else setErro(r.erro);
    });
  }
  return (
    <div className={s.links}>
      {erro ? (
        <span role="alert">{erro}</span>
      ) : !dados ? (
        <span>Carregando vínculo do cliente…</span>
      ) : !dados.disponivel ? (
        <span>Ficha integrada aguardando instalação do módulo.</span>
      ) : dados.clienteId ? (
        <div>
          <Link href={"/crm/clientes/" + dados.clienteId}>Cliente · contratos, entregas e lojas ↗</Link>
          <details className={s.detalhes}>
            <summary>Revisar vínculo do cliente</summary>
            <form
              className={s.form}
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const id = String(form.get("cliente"));
                if (
                  id !== dados.clienteId &&
                  !window.confirm(
                    "Mover este negócio para a ficha do cliente selecionado? Contratos e pagamentos continuam ligados ao negócio.",
                  )
                )
                  return;
                abrir(() => vincularFichaCliente(leadId, id));
              }}
            >
              <label>
                Cliente
                <select required name="cliente" defaultValue={dados.clienteId}>
                  {dados.clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={pendente} className={s.botao}>
                Salvar vínculo
              </button>
            </form>
          </details>
        </div>
      ) : (
        <>
          <button
            disabled={pendente}
            className={s.botao}
            onClick={() => abrir(() => criarFichaCliente(leadId))}
          >
            Criar ficha de cliente
          </button>
          {dados.clientes.length ? (
            <form
              className={s.form}
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                abrir(() => vincularFichaCliente(leadId, String(d.get("cliente"))));
              }}
            >
              <label>
                Vincular a cliente existente
                <select required name="cliente">
                  <option value="">Escolher cliente</option>
                  {dados.clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={pendente} className={s.botao}>
                Vincular
              </button>
            </form>
          ) : null}
        </>
      )}
      {dados?.disponivel && dados.conteudos.length ? (
        <details className={s.detalhes}>
          <summary>Conteúdo de origem do negócio</summary>
          <p>Associe quando souber qual conteúdo trouxe este contato. Esta associação é manual.</p>
          <form
            className={s.form}
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              iniciar(async () => {
                const r = await vincularConteudo(leadId, String(form.get("peca")));
                if (r.ok) {
                  setDados(await contextoCliente(leadId));
                  setErro("");
                } else setErro(r.erro);
              });
            }}
          >
            <label>
              Conteúdo publicado
              <select name="peca" defaultValue={dados.origemId ?? ""}>
                <option value="">Origem não identificada</option>
                {dados.conteudos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.gancho || "Sem título"}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={pendente} className={s.botao}>
              Salvar origem
            </button>
          </form>
        </details>
      ) : null}
    </div>
  );
}
