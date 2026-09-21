"use client";

/* ============================================================
   MANDAR A MENSAGEM

   Escolher o template, ver o texto com os dados deste lead já dentro, e
   sair para a conversa. Três passos numa tela só, e a tela some depois.
   A saída é o WhatsApp quando há número; sem número, o direct do
   Instagram assume (com o texto copiado no clique, porque o Instagram
   não aceita mensagem pré-escrita na URL).

   ---------- por que o botão do WhatsApp é um <a> e não um <button> ----------
   Abrir o WhatsApp precisa ser o efeito DIRETO de um clique. Se a saída
   acontecesse depois de um `await` (registrar a interação e só então
   `window.open`), o navegador já teria perdido o vínculo com o gesto e o
   bloqueador de pop-up engoliria a janela em silêncio. Com um link de
   verdade, a navegação é do navegador e nada pode barrá-la; a interação é
   registrada em paralelo, no mesmo clique.

   E se o registro falhar, a conversa acontece do mesmo jeito: a mensagem é
   o que importa, o registro é a contabilidade. Nessa ordem.

   ---------- as lacunas ----------
   Um template que usa {empresa} num lead sem empresa vira "a [empresa] de
   vocês". A prévia mostra o colchete, e um aviso diz quais faltam. Nunca
   substituir por vazio: "Oi, !" já foi mandado por CRM demais.

   ---------- os dois toques ----------
   A pesquisa escreve DUAS mensagens, e a ordem entre elas é a regra que
   decide se alguém lê: a ABERTURA é o primeiro toque (duas linhas, uma
   pergunta, sem oferta e sem link, cabendo inteira na notificação) e a
   MENSAGEM é o segundo, com a apresentação, a prévia e o exemplo, para
   depois que a pessoa responder. Por isso a abertura é a opção de
   partida, e escolher a mensagem 2 num lead que nunca respondeu levanta
   um aviso: link e oferta antes da resposta é exatamente o que faz a
   conversa ser reconhecida como propaganda antes de ser aberta.
   ============================================================ */

import { useEffect, useState } from "react";
import { registrarToque } from "@/app/(pt)/crm/acoes";
import { dadosDaOficina } from "@/app/(pt)/crm/acoes-producao";
import {
  aplicarSaudacao,
  type DadosOficina,
  degrauDoSilencio,
  lacunas,
  linkDirectInstagram,
  linkWhatsapp,
  renderTemplate,
  templateDaEtapa,
} from "@/lib/crm/regras";
import {
  CATEGORIAS_TEMPLATE,
  NOME_CANAL,
  NOME_CATEGORIA,
  type Canal,
  type CategoriaTemplate,
  type LeadPainel,
  type Template,
} from "@/lib/crm/tipos";
import s from "@/app/(pt)/crm/crm.module.css";

/* As duas mensagens da pesquisa entram no seletor como se fossem
   templates, com estes ids reservados. Elas já vêm escritas para ESTE
   lead, então não passam pelo render de variáveis nem pela checagem de
   lacunas; só pela saudação, que é do relógio e não do cadastro. */
const ID_ABERTURA = "__abertura";
const ID_PESQUISA = "__pesquisa";

export function ModalMensagem({
  lead,
  templates,
  aoFechar,
}: {
  lead: LeadPainel;
  templates: Template[];
  aoFechar: () => void;
}) {
  const pesquisaOk = lead.dossie?.status === "ok";
  const aAbertura = pesquisaOk ? (lead.dossie?.abertura ?? null) : null;
  const daPesquisa = pesquisaOk ? (lead.dossie?.mensagem ?? null) : null;

  /* QUAL DEGRAU É A VEZ. Um lead em Contatado não quer a abertura de novo,
     quer o primeiro retorno; um com quatro toques no vácuo não quer o
     quinto pedido, quer a saída honrosa. A escada mora em regras.ts e o
     modal só a lê, para a mesma resposta valer aqui e em qualquer tela
     que venha a mostrar a sugestão. */
  const degrau = degrauDoSilencio(lead);

  /* DE PRÉVIA EM DIANTE, A ETAPA ESCOLHE. A mensagem 2 da pesquisa é texto
     de apresentação, e um lead em Negociação já foi apresentado faz tempo:
     abrir nela era o modal oferecendo a revelação do primeiro contato a
     quem está ajustando preço (caso Carina Melo, 24/08). A regra mora em
     regras.ts; aqui só se procura o template da categoria que ela devolve,
     com o índice clampado porque objeção e reativação têm um texto só. */
  const daEtapa = templateDaEtapa(lead);
  const naCategoria = daEtapa ? templates.filter((t) => t.categoria === daEtapa.categoria) : [];
  const sugeridoEtapa = naCategoria[Math.min(daEtapa?.indice ?? 0, naCategoria.length - 1)] ?? null;

  /* O degrau pode pedir um TÍTULO dentro da categoria (o "Chegou pelo
     anúncio" entre as aberturas mornas); sem ele, ou sem achar, vale o
     índice na ordem de sempre. */
  const naEscada = degrau ? templates.filter((t) => t.categoria === degrau.categoria) : [];
  const sugeridoEscada =
    degrau
      ? ((degrau.titulo ? naEscada.find((t) => t.titulo.startsWith(degrau.titulo!)) : null) ??
        naEscada[degrau.indice] ??
        null)
      : null;
  const sugerido = sugeridoEtapa ?? sugeridoEscada;
  const motivoDaSugestao = sugeridoEtapa ? daEtapa?.porque : degrau?.porque;

  /* A ORDEM DA ESCOLHA DE PARTIDA, do mais específico para o mais genérico:
     (1) de Prévia em diante, o template da etapa; (2) quem já respondeu
     abre na mensagem 2 da pesquisa, que é a que continua a conversa; (3)
     quem nunca respondeu e nunca foi tocado abre na abertura sob medida;
     (4) quem está no meio da escada abre no degrau dela; (5) o resto cai
     no primeiro template, que é como era antes. */
  const dePartida = () => {
    if (sugeridoEtapa) return sugeridoEtapa.id;
    if (lead.toques_entrada > 0 && daPesquisa) return ID_PESQUISA;
    if (degrau?.categoria === "abertura_fria" && aAbertura) return ID_ABERTURA;
    if (sugeridoEscada) return sugeridoEscada.id;
    if (aAbertura) return ID_ABERTURA;
    if (daPesquisa) return ID_PESQUISA;
    return templates[0]?.id ?? "";
  };

  const partida = dePartida();
  const [escolhido, setEscolhido] = useState(partida);

  /* O SELETOR EM GRUPOS. Uma lista corrida de "Título · Categoria" com
     dezesseis linhas obrigava a ler tudo para achar o toque da vez. Agora
     a lista abre com o grupo "A vez deste card" (o sugerido, sozinho, com
     o porquê no rótulo), depois as duas mensagens da pesquisa, e o resto
     agrupado por categoria na ordem do funil, que é a ordem de
     CATEGORIAS_TEMPLATE. O sugerido não sai do grupo dele: aparece duas
     vezes, uma no topo e outra no lugar, e o <option> repete o value de
     propósito, porque é o mesmo template. */
  const porCategoria = CATEGORIAS_TEMPLATE.map((c) => ({
    categoria: c as CategoriaTemplate,
    itens: templates.filter((t) => t.categoria === c),
  })).filter((g) => g.itens.length > 0);
  const semCategoria = templates.filter((t) => !t.categoria);
  const [copiado, setCopiado] = useState(false);

  /* O QUE A OFICINA SABE. Os toques da prévia levam o link, a contagem e
     as estreladas da loja vinculada a este card ({link}, {pecas},
     {destaques}, {topo}); isso mora na oficina, não no cadastro, e vem
     numa chamada só quando o modal abre. Enquanto não chega, o texto
     mostra as lacunas, que é o mesmo que mostraria sem oficina. */
  const [oficina, setOficina] = useState<DadosOficina | null>(null);
  useEffect(() => {
    let vivo = true;
    void dadosDaOficina(lead.id).then((d) => vivo && setOficina(d));
    return () => {
      vivo = false;
    };
  }, [lead.id]);
  const dados = { ...lead, oficina };

  const doDossie = escolhido === ID_ABERTURA || escolhido === ID_PESQUISA;
  const template = doDossie ? null : (templates.find((t) => t.id === escolhido) ?? null);
  const texto =
    escolhido === ID_ABERTURA && aAbertura
      ? aplicarSaudacao(aAbertura)
      : escolhido === ID_PESQUISA && daPesquisa
        ? aplicarSaudacao(daPesquisa)
        : template
          ? renderTemplate(template.conteudo, dados)
          : "";
  const faltando = template ? lacunas(template.conteudo, dados) : [];

  /* O aviso da ordem: a mensagem 2 leva oferta e link, e antes de uma
     resposta é justamente ela que faz a pessoa não abrir. `toques_entrada`
     vem da view e conta o que ENTROU: zero significa que este lead nunca
     respondeu nada, por nenhum canal. */
  const foraDeOrdem = escolhido === ID_PESQUISA && Boolean(aAbertura) && lead.toques_entrada === 0;
  const link = linkWhatsapp(lead.whatsapp, texto);

  /* O plano B quando o número não dá link: o direct. Só entra em campo sem
     WhatsApp, porque duas saídas para a mesma mensagem seriam duas
     primeiras ações. Foi o caso real do nove3: sem número, o modal não
     tinha saída nenhuma, a mensagem foi no braço pelo Instagram e o toque
     ficou sem registro, com o card parado na Lista. */
  const linkInsta = !link ? linkDirectInstagram(lead.instagram) : null;

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* Sem permissão de área de transferência (acontece em navegador
         embutido): selecionar o texto é a saída manual, e ela funciona
         sempre. */
      setCopiado(false);
    }
  };

  /* Registra e fecha. Não espera a resposta para fechar: o link já levou a
     pessoa para o WhatsApp, e segurar o modal aberto atrás de uma requisição
     que ela não vai ver é atrito puro. */
  const registrar = (canal: Canal) => {
    void registrarToque(lead.id, {
      canal,
      direcao: "saida",
      resumo:
        escolhido === ID_ABERTURA
          ? "Abertura da pesquisa (primeiro toque)"
          : escolhido === ID_PESQUISA
            ? "Mensagem da pesquisa"
            : (template?.titulo ?? `Mensagem no ${NOME_CANAL[canal]}`),
    });
    aoFechar();
  };

  return (
    <div className={s.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="msg-titulo">
        <p className={s.modalRot}>Mandar mensagem</p>
        <h2 id="msg-titulo">{lead.nome}</h2>

        {templates.length === 0 && !daPesquisa && !aAbertura ? (
          <p>
            Você ainda não tem template nenhum. Crie o primeiro em Templates e ele aparece aqui.
          </p>
        ) : (
          <>
            <label className={s.campo}>
              <span className={s.campoRot}>Template</span>
              <select value={escolhido} onChange={(e) => setEscolhido(e.target.value)}>
                {sugerido ? (
                  <optgroup label="A vez deste card">
                    <option value={sugerido.id}>
                      ★ {sugerido.titulo}
                      {motivoDaSugestao ? ` · ${motivoDaSugestao}` : ""}
                    </option>
                  </optgroup>
                ) : null}
                {aAbertura || daPesquisa ? (
                  <optgroup label="Da pesquisa, escritas para este lead">
                    {aAbertura ? (
                      <option value={ID_ABERTURA}>
                        Abertura · primeiro toque, sem link
                        {!sugeridoEtapa && degrau?.categoria === "abertura_fria" ? " · sugerido" : ""}
                      </option>
                    ) : null}
                    {daPesquisa ? (
                      <option value={ID_PESQUISA}>
                        {aAbertura
                          ? "Mensagem 2 · depois que responder"
                          : "Mensagem da pesquisa · feita para este lead"}
                      </option>
                    ) : null}
                  </optgroup>
                ) : null}
                {porCategoria.map((g) => (
                  <optgroup key={g.categoria} label={NOME_CATEGORIA[g.categoria]}>
                    {g.itens.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titulo}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {semCategoria.length ? (
                  <optgroup label="Sem categoria">
                    {semCategoria.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titulo}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>

            {/* POR QUE ESTE, e não "sugerido" sozinho. O rótulo no seletor
                diz qual; esta linha diz o fato que escolheu (quantos toques
                foram no vácuo), que é o que permite discordar com base em
                alguma coisa. Sugestão sem motivo é ordem disfarçada. */}
            {motivoDaSugestao && escolhido === partida ? (
              <p className={s.nota}>{motivoDaSugestao}</p>
            ) : null}

            <p className={s.previa}>{texto}</p>

            {/* Dito na hora de mandar, e não num manual: a abertura só faz
                sentido se quem manda souber que ela é curta DE PROPÓSITO, e
                que a oferta tem hora para entrar. */}
            {escolhido === ID_ABERTURA ? (
              <p className={s.nota}>
                Curta de propósito: cabe inteira na notificação, e é lá que a pessoa decide se abre.
                A apresentação, a prévia e o link do exemplo estão na mensagem 2, para mandar depois
                que ela responder.
              </p>
            ) : null}

            {foraDeOrdem ? (
              <p className={s.erro}>
                Este lead ainda não respondeu nada. A mensagem 2 leva a oferta e o link, e o cartão
                de preview aparece na lista de conversas antes da primeira palavra ser lida: é ela
                que faz a pessoa não abrir. A abertura é o primeiro toque.
              </p>
            ) : null}

            {faltando.length ? (
              <p className={s.erro}>
                Sem {faltando.join(", ")}
                {faltando.some((f) => ["link", "pecas", "destaques", "topo"].includes(f))
                  ? ": vem da oficina (o link da prévia fica na ficha da loja, as peças e as estrelas do catálogo). O texto vai sair com o colchete."
                  : " no cadastro: o texto vai sair com o colchete."}
              </p>
            ) : null}
          </>
        )}

        {!link && linkInsta ? (
          <p className={s.nota}>
            Sem WhatsApp no cadastro: a saída deste lead é o direct. O texto vai copiado no clique,
            é só colar na conversa.
          </p>
        ) : null}
        {!link && !linkInsta ? (
          <p className={s.erro}>
            {lead.whatsapp
              ? "O WhatsApp cadastrado não tem número suficiente."
              : "Este lead não tem WhatsApp nem Instagram no cadastro. Preencha um dos dois em Ver todos os dados."}
          </p>
        ) : null}

        <div className={s.modalPe}>
          <button type="button" className={s.btn} onClick={aoFechar}>
            Fechar
          </button>
          <button type="button" className={s.btn} onClick={copiar} disabled={!texto}>
            {copiado ? "Copiado" : "Copiar texto"}
          </button>
          {link ? (
            <a
              className={s.btnAcao}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => registrar("whatsapp")}
            >
              Abrir no WhatsApp
            </a>
          ) : null}
          {linkInsta ? (
            /* O texto não cabe na URL (o Instagram não aceita mensagem
               pré-escrita), então o MESMO clique copia antes de sair. E
               continua sendo um <a> pelo mesmo motivo do WhatsApp: a
               navegação precisa ser o efeito direto do gesto, ou o
               bloqueador de pop-up engole a janela. */
            <a
              className={s.btnAcao}
              href={linkInsta}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void navigator.clipboard.writeText(texto).catch(() => {});
                registrar("instagram");
              }}
            >
              Copiar e abrir no direct
            </a>
          ) : null}
        </div>

        {/* Dito antes de acontecer, e não depois: o botão faz duas coisas, e
            uma delas grava no histórico. Descobrir isso pela timeline seria
            o CRM agindo pelas costas de quem o usa. */}
        {link || linkInsta ? (
          <p className={s.nota}>
            {link ? "Abrir no WhatsApp" : "Copiar e abrir no direct"} registra o toque na linha do
            tempo
          </p>
        ) : null}
      </div>
    </div>
  );
}
