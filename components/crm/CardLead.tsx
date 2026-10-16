"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { dataCurta, dinheiro, sinalDaFicha, urgencia } from "@/lib/crm/regras";
import {
  ESTAGIOS,
  NOME_ESTAGIO,
  NOME_TIPO,
  type Estagio,
  type LeadPainel,
} from "@/lib/crm/tipos";
import { IconePipeline } from "./IconePipeline";
import p from "./pipeline.module.css";

type Props = {
  lead: LeadPainel;
  hoje: string;
  assentando: boolean;
  desabilitado?: boolean;
  aoTrocarEstagio: (lead: LeadPainel, estagio: Estagio) => void;
};
export function CardLead({
  lead,
  hoje,
  assentando,
  desabilitado = false,
  aoTrocarEstagio,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { estagio: lead.estagio },
    disabled: desabilitado,
  });
  return (
    <article
      ref={setNodeRef}
      data-lead={lead.id}
      data-etapa={lead.estagio}
      data-urgencia={urgencia(lead, hoje)}
      className={`${p.card} ${isDragging ? p.cardArrastando : ""} ${assentando ? p.cardAssentado : ""}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className={p.cardEtiqueta}>
        <span className={p.tipoProjeto}>
          {lead.tipo_projeto ? NOME_TIPO[lead.tipo_projeto] : "Oportunidade"}
        </span>
        {lead.dossie?.status === "ok" && lead.dossie.veredito === "quente" && (
          <span
            className={p.potencial}
            title="Potencial alto na pesquisa do perfil"
          >
            Potencial alto
          </span>
        )}
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          className={p.arrastador}
          disabled={desabilitado}
          aria-label={`Arrastar ${lead.nome}`}
        >
          <svg
            width="14"
            height="18"
            viewBox="0 0 14 18"
            fill="currentColor"
            aria-hidden="true"
          >
            {[5, 10, 15].flatMap((y) =>
              [4, 10].map((x) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="1.25" />
              )),
            )}
          </svg>
        </button>
      </div>
      <Link
        href={`/crm/lead/${lead.id}`}
        className={p.cardLink}
        aria-label={`Abrir ficha de ${lead.nome}`}
      >
        <Conteudo lead={lead} hoje={hoje} />
      </Link>
      <div className={p.cardRodape}>
        <Status lead={lead} hoje={hoje} />
        <label
          className={p.mover}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span className={p.srOnly}>Mover {lead.nome} para</span>
          <select
            value=""
            disabled={desabilitado}
            onChange={(e) => aoTrocarEstagio(lead, e.target.value as Estagio)}
          >
            <option value="" disabled>
              Mover para…
            </option>
            {ESTAGIOS.map((e) => (
              <option key={e} value={e} disabled={e === lead.estagio}>
                {NOME_ESTAGIO[e]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}

function Conteudo({ lead, hoje }: { lead: LeadPainel; hoje: string }) {
  const encerrado = lead.estagio === "ganho" || lead.estagio === "perdido";
  const valor =
    lead.estagio === "ganho" ? lead.valor_fechado : lead.ticket_estimado;
  const empresa =
    lead.empresa?.trim().toLocaleLowerCase("pt-BR") !==
    lead.nome.trim().toLocaleLowerCase("pt-BR")
      ? lead.empresa
      : null;
  const contexto = [empresa, lead.nicho, lead.cidade]
    .filter(Boolean)
    .join(" · ");
  const iniciais = lead.nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
  return (
    <>
      <div className={p.identidade}>
        <span className={p.avatar} aria-hidden="true">
          {iniciais || "L"}
        </span>
        <div>
          <h3 className={p.cardNome}>{lead.nome}</h3>
          {contexto && (
            <p className={p.cardContexto} title={contexto}>
              {contexto}
            </p>
          )}
        </div>
      </div>
      <div className={p.cardValor}>
        <span>
          {lead.estagio === "ganho" ? "Valor fechado" : "Valor estimado"}
        </span>
        <strong>
          {valor == null ? "Sem estimativa" : dinheiro(valor) || "R$ 0"}
        </strong>
      </div>
      {!encerrado ? (
        <div
          className={p.proximaAcao}
          data-vazia={!lead.proximo_passo || undefined}
        >
          <div className={p.acaoCabeca}>
            <span>Próxima ação</span>
            <span>
              <IconePipeline nome="relogio" />
              {lead.proxima_acao_em
                ? dataCurta(lead.proxima_acao_em).slice(0, 5)
                : "Sem data"}
            </span>
          </div>
          <p>{lead.proximo_passo || "Definir o próximo passo"}</p>
        </div>
      ) : (
        <p className={p.encerrado}>{sinalDaFicha(lead, hoje).texto}</p>
      )}
    </>
  );
}
function Status({ lead, hoje }: { lead: LeadPainel; hoje: string }) {
  const sinal = sinalDaFicha(lead, hoje);
  return (
    <span className={p.status} data-tom={sinal.tom}>
      <i aria-hidden="true" />
      {sinal.texto}
    </span>
  );
}
export function CardVoando({
  lead,
  hoje,
  falta,
}: {
  lead: LeadPainel;
  hoje: string;
  falta: string;
}) {
  return (
    <div
      data-etapa={lead.estagio}
      className={`${p.card} ${p.cardVoo}`}
      aria-hidden="true"
    >
      <div className={p.cardEtiqueta}>
        <span className={p.tipoProjeto}>
          {lead.tipo_projeto ? NOME_TIPO[lead.tipo_projeto] : "Oportunidade"}
        </span>
      </div>
      <Conteudo lead={lead} hoje={hoje} />
      {falta && <p className={p.vooFalta}>{falta}</p>}
    </div>
  );
}
