"use client";

/* ============================================================
   O CHECKLIST DO CLIENTE, DE DENTRO DO PROJETO

   Sem checklist: o formulário que cria um, com o endereço da vitrine e as
   perguntas que valem para esta loja (loja que não vai mostrar preço não
   precisa ser perguntada do preço). Com checklist: o link, o botão que
   manda para o WhatsApp do cliente com a mensagem pronta, o "Atualizar as
   peças" (a vitrine mudou) e, embaixo, o que ele já respondeu.
   ============================================================ */

import { useState, useTransition } from "react";
import { criarChecklistCliente } from "@/app/(pt)/crm/acoes-projetos";
import { Material } from "@/components/projetos/Material";
import p from "@/app/(pt)/crm/projetos.module.css";

const PERGUNTAS: [string, string][] = [
  ["preco", "Preço das peças"],
  ["tamanhos", "Tamanhos"],
  ["cores", "Cores"],
  ["fotos", "Mais fotos das peças"],
  ["novas", "Peças que faltam no site"],
  ["marcas", "Marcas e logos"],
  ["banners", "Aprovar os banners"],
  ["dominio", "Domínio"],
  ["contato", "WhatsApp dos pedidos e e-mail do painel"],
];

const mensagem = (link: string) =>
  `Oi! Pra gente terminar a sua loja, fiz um checklist do que eu preciso de você. Vai preenchendo peça por peça e manda as fotos por lá mesmo, que salva sozinho e chega direto pra mim:\n\n${link}`;

export function ChecklistCliente({
  leadId,
  site,
  material,
  whatsapp,
}: {
  leadId: string;
  site: string | null;
  material: string | null;
  whatsapp: string | null;
}) {
  const [endereco, setEndereco] = useState(site ?? "");
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>(Object.fromEntries(PERGUNTAS.map(([k]) => [k, true])));
  const [abrirForm, setAbrirForm] = useState(!material);
  const [chave, setChave] = useState(material);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [copiado, setCopiado] = useState(false);

  const legado = chave === "fulltime";
  const link = chave ? (legado ? `https://rafaelrazeira.com.br/entrega/${chave}-checklist.html` : `https://rafaelrazeira.com.br/checklist/${chave}`) : "";
  const numero = whatsapp ? (whatsapp.startsWith("55") ? whatsapp : `55${whatsapp}`) : "";

  function criar() {
    setResultado(null);
    iniciar(async () => {
      const r = await criarChecklistCliente(leadId, endereco, marcadas);
      if (r.ok) {
        setChave(r.chave);
        setAbrirForm(false);
        setResultado({
          ok: true,
          texto: r.pecas ? `Pronto: ${r.pecas} peças da vitrine no checklist.` : "Pronto, mas não achei peças no site: o checklist sai só com as perguntas gerais.",
        });
      } else setResultado({ ok: false, texto: r.erro });
    });
  }

  return (
    <div>
      {chave ? (
        <div className={p.linkCliente}>
          <a href={link} target="_blank" rel="noopener" className={p.linkUrl}>
            {link.replace("https://", "")}
          </a>
          <div className={p.linkAcoes}>
            <button
              type="button"
              className={p.btnSecundario}
              onClick={() => {
                navigator.clipboard?.writeText(link).then(() => {
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 1800);
                });
              }}
            >
              {copiado ? "Copiado" : "Copiar link"}
            </button>
            {numero ? (
              <a
                className={p.btnEntregue}
                href={`https://wa.me/${numero}?text=${encodeURIComponent(mensagem(link))}`}
                target="_blank"
                rel="noopener"
              >
                Mandar no WhatsApp dele
              </a>
            ) : null}
            {!legado && !abrirForm ? (
              <button type="button" className={p.btnLeve} onClick={() => setAbrirForm(true)}>
                Atualizar as peças
              </button>
            ) : null}
          </div>
          {legado ? <p className={p.entregueNota}>Checklist feito à mão, antes do gerador. Continua valendo como está.</p> : null}
        </div>
      ) : null}

      {abrirForm ? (
        <form
          className={p.criar}
          onSubmit={(e) => {
            e.preventDefault();
            criar();
          }}
        >
          <label className={p.campo}>
            <span>A vitrine no ar</span>
            <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="https://loja.vercel.app" />
          </label>
          <fieldset className={p.perguntas}>
            <legend>O que perguntar a ele</legend>
            {PERGUNTAS.map(([k, rotulo]) => (
              <label key={k}>
                <input type="checkbox" checked={!!marcadas[k]} onChange={(e) => setMarcadas({ ...marcadas, [k]: e.target.checked })} />
                <span className={p.caixinha} aria-hidden="true" />
                {rotulo}
              </label>
            ))}
          </fieldset>
          <div className={p.linkAcoes}>
            <button type="submit" className={p.btnEntregue} disabled={pendente}>
              {pendente ? "Lendo as peças da vitrine…" : chave ? "Atualizar o checklist" : "Criar o checklist"}
            </button>
            {chave ? (
              <button type="button" className={p.btnLeve} onClick={() => setAbrirForm(false)}>
                Cancelar
              </button>
            ) : null}
          </div>
          <p className={p.entregueNota}>
            As peças vêm do site no ar. As respostas que ele já deu continuam quando você atualiza.
          </p>
        </form>
      ) : null}

      {resultado ? <p className={resultado.ok ? p.salvo : p.naoSalvo}>{resultado.texto}</p> : null}

      {chave ? (
        <div className={p.respostas}>
          <Material loja={chave} />
        </div>
      ) : null}
    </div>
  );
}
