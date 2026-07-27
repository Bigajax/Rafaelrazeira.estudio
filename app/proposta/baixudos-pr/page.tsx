import type { Metadata } from "next";
import { Archivo, Inter, Space_Mono } from "next/font/google";
import s from "./proposta.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { absolute: "Proposta — Campanha Gol Vermelho | Rafael Razeira Estúdio" },
  description:
    "Proposta comercial da campanha Gol Vermelho integrada ao evento Baixudos.PR: escopo, prazo, investimento e condições.",
  robots: { index: false, follow: false },
};

const WA = "https://wa.me/5544999997219?text=";
const WA_TALK =
  WA +
  encodeURIComponent(
    "Olá Rafael, sou o Xande da Baixudos.PR. Tenho uma dúvida sobre a proposta da campanha antes de aprovar.",
  );
const WA_OK =
  WA +
  encodeURIComponent("Olá Rafael, é o Xande da Baixudos.PR. Aprovei a proposta da campanha e quero começar.");

/* ---------------- Conteúdo ---------------- */

const escopoCampanha = [
  "Página da campanha com apresentação do prêmio e informações oficiais",
  "Valor por número, quantidade total e disponibilidade",
  "Grade de números com busca",
  "Seleção manual e seleção aleatória",
  "Packs de números configuráveis pelo painel",
  "Cálculo de preços no servidor",
  "Resumo da compra antes do pagamento",
  "Cadastro do participante e aceite do regulamento",
  "Pagamento por Pix, com QR Code e copia e cola",
  "Reserva temporária dos números, com expiração automática",
  "Prevenção de duplicidade na venda dos números",
  "Confirmação do pagamento por webhook",
  "Consulta do pedido e dos números adquiridos",
];

const escopoIntegracaoBase = [
  "Apresentação do evento na Baixudos.PR: data, horário, local e imagem",
  "Preço inicial do ingresso, quando informado pela organização",
  "Botão de compra com redirecionamento para o checkout oficial",
  "Parâmetros de rastreamento na URL, quando a plataforma suportar",
  "Conexão visual entre a campanha e o evento",
];

const escopoApuracao = [
  "Acesso restrito pelo painel administrativo",
  "Encerramento das vendas e bloqueio de novas participações",
  "Consolidação dos números com pagamento aprovado",
  "Exclusão das reservas expiradas da contagem",
  "Geração da lista final de participações válidas",
  "Registro do método oficial de apuração",
  "Inserção ou importação do resultado vindo da fonte prevista no regulamento",
  "Aplicação da regra oficial configurada",
  "Conferência do número contemplado antes de publicar",
  "Registro das ações administrativas realizadas",
  "Publicação do resultado",
  "Modo telão para apresentação no evento",
];

const escopoPainel = [
  "Campanha: abertura e encerramento das vendas",
  "Packs: nome, quantidade, preço, ordem e status",
  "Números: consulta, reservas e bloqueio",
  "Pedidos, participantes e pagamentos",
  "Configurações e relatórios básicos",
  "Aba Apuração: status da campanha, participações válidas, pendências de pagamento, registro do resultado, conferência, modo telão e publicação",
];

const telaoItens = [
  "Identidade da campanha",
  "Campanha encerrada",
  "Quantidade de participações válidas",
  "Método utilizado",
  "Resultado de origem",
  "Número contemplado",
  "Confirmação da apuração",
];

const resultadoItens = [
  "Número contemplado e data da apuração",
  "Método utilizado",
  "Nome mascarado do contemplado",
  "Link para o regulamento",
  "Situação da entrega do prêmio",
];

const estado: { what: string; badge: "ready" | "partial" | "pending" }[] = [
  { what: "Site institucional e páginas de conteúdo, no ar e responsivos", badge: "ready" },
  { what: "Página da campanha, grade de números lida do banco de dados", badge: "ready" },
  { what: "Seleção manual e seleção aleatória de números", badge: "ready" },
  { what: "Packs de números, com gestão pelo painel", badge: "ready" },
  { what: "Cálculo de preços no servidor", badge: "ready" },
  { what: "Reserva de números com controle de duplicidade no banco", badge: "ready" },
  { what: "Painel: dashboard, packs, pedidos e números", badge: "ready" },
  { what: "Consulta do pedido e dos números pelo código", badge: "ready" },
  { what: "Aba Apuração: encerramento das vendas, registro do método e do resultado", badge: "ready" },
  { what: "Conferência do titular do número antes da publicação", badge: "ready" },
  { what: "Modo telão para apresentação no evento", badge: "partial" },
  { what: "Consolidação da lista final de participações válidas", badge: "partial" },
  { what: "Página pública de resultado com método, data e nome mascarado", badge: "partial" },
  { what: "Aplicação da regra oficial e registro das ações administrativas", badge: "pending" },
  { what: "Checkout com Pix: fluxo completo em ambiente de teste", badge: "partial" },
  { what: "Pagamento pelo gateway real, com credenciais de produção", badge: "partial" },
  { what: "Webhook de confirmação, com validação de assinatura", badge: "partial" },
  { what: "Liberação automática de reservas expiradas", badge: "pending" },
  { what: "Proteção contra excesso de requisições no checkout", badge: "pending" },
  { what: "Confirmação por e-mail para o participante", badge: "pending" },
  { what: "Integração com a plataforma externa de ingressos", badge: "pending" },
  { what: "Ambiente de produção, backup e monitoramento", badge: "pending" },
];

const seguranca = [
  "Valores recalculados no servidor, nunca enviados pelo navegador",
  "Proteção contra venda duplicada do mesmo número",
  "Reserva temporária durante o pagamento",
  "Confirmação do pagamento por webhook",
  "Liberação automática das reservas expiradas",
  "Proteção dos dados pessoais dos participantes",
  "Acesso administrativo controlado por login",
];

const entregaveis = [
  "Campanha Gol Vermelho responsiva",
  "Packs e escolha de números",
  "Checkout com Pix",
  "Módulo de apuração e exibição do resultado, com modo telão",
  "Painel administrativo da campanha",
  "Integração com a plataforma externa de ingressos",
  "Ambiente de produção",
  "Configuração do domínio",
  "Documentação básica",
  "Treinamento de uso do painel",
  "Período inicial de correções",
];

const naoIncluso = [
  "Contratação da plataforma de ingressos e as taxas cobradas por ela",
  "Emissão, armazenamento e gestão dos ingressos",
  "Operação de check-in e suporte presencial no evento",
  "Suporte e alterações internas da plataforma terceira",
  "Funcionalidades não permitidas pela API da plataforma terceira",
  "Desenvolvimento de sistema próprio de ingressos",
  "Autorização da campanha e elaboração do regulamento",
  "Definição jurídica do método de apuração e validação legal do resultado",
  "Auditoria jurídica e prestação de contas",
  "Definição de suplentes e do tratamento de número não vendido",
  "Hospedagem, banco de dados, domínio e taxas do meio de pagamento",
  "Mídia paga e produção de conteúdo",
];

const responsabilidades = [
  "Definição da plataforma de ingressos e o link oficial de compra",
  "Acesso técnico, documentação da API e credenciais, caso existam",
  "Contato do suporte da plataforma terceira",
  "Informações do evento: data, horário, local e imagem",
  "Preços oficiais da campanha e do ingresso",
  "Conteúdos, regulamento e documentos da campanha",
  "Definição formal do método de apuração e da regra a ser aplicada",
  "Conta do gateway de pagamento",
  "Aprovação de cada etapa dentro dos prazos combinados",
];

const badgeMap = {
  ready: { cls: "bReady", label: "Pronto" },
  partial: { cls: "bPartial", label: "Parcial" },
  pending: { cls: "bPending", label: "Pendente" },
} as const;

export default function PropostaBaixudos() {
  return (
    <div className={`${s.page} ${display.variable} ${body.variable} ${mono.variable}`}>
      <div className={s.gridLines} aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>

      <div className={s.doc}>
        <header className={s.header}>
          <div className={s.brand}>RAFAEL RAZEIRA <small>ESTÚDIO</small></div>
          <div className={s.date}>27/07/2026</div>
        </header>

        {/* ---------- Capa ---------- */}
        <section className={s.opening}>
          <div className={s.eyebrow}>
            <span className={s.dot} />
            <span className={s.status}>PROPOSTA COMERCIAL</span>
            <span aria-hidden="true">·</span>
            <span>CAMPANHA DIGITAL</span>
          </div>

          <h1 className={s.h1}>
            CAMPANHA<br />GOL VERMELHO<br />
            <span className={s.accentClient}>BAIXUDOS.PR</span>
          </h1>

          <p className={s.sub}>
            Participação digital, pagamento por Pix e conexão com a plataforma oficial de ingressos
          </p>

          <p className={s.meta}>
            Este documento apresenta o escopo desta etapa, o que já está construído, o prazo,
            o investimento e as condições. Feito para ser lido de uma vez e aprovado sem dúvida.
          </p>

          <div className={s.fiche}>
            <div className={s.ficheRow}>
              <span className={s.ficheKey}>Cliente</span>
              <span className={s.ficheVal}><b className={s.clientMark}>Baixudos.PR</b></span>
            </div>
            <div className={s.ficheRow}>
              <span className={s.ficheKey}>Responsável</span>
              <span className={s.ficheVal}>
                Alexandre Henrique
                <small>Xande</small>
              </span>
            </div>
            <div className={s.ficheRow}>
              <span className={s.ficheKey}>Desenvolvimento</span>
              <span className={s.ficheVal}>Rafael Razeira Estúdio</span>
            </div>
            <div className={s.ficheRow}>
              <span className={s.ficheKey}>Escopo desta etapa</span>
              <span className={s.ficheVal}>
                Campanha Gol Vermelho e integração com ingresso externo
                <small>Os ingressos são vendidos pela plataforma oficial da organização</small>
              </span>
            </div>
            <div className={s.ficheRow}>
              <span className={s.ficheKey}>Data do evento</span>
              <span className={s.ficheVal}>
                08 de novembro de 2026
                <small>Race Park Maringá Motorsport</small>
              </span>
            </div>
          </div>
        </section>

        {/* ---------- 01 Contexto ---------- */}
        <section className={s.sec}>
          <div className={s.num}>01</div>
          <div>
            <h2 className={s.h2}>CONTEXTO</h2>
            <div className={s.body}>
              <p>
                A Baixudos.PR está estruturando uma campanha digital para o Gol Vermelho e
                precisa conectar essa experiência à venda de ingressos do evento.
              </p>
              <p>
                Esta etapa tem como objetivo colocar a campanha em operação, organizar os
                pagamentos e oferecer um caminho claro entre a participação na campanha e a
                compra do ingresso.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- 02 Solução ---------- */}
        <section className={s.sec}>
          <div className={s.num}>02</div>
          <div>
            <h2 className={s.h2}>O QUE SERÁ ENTREGUE</h2>
            <div className={s.body}>
              <p>
                Uma campanha digital completa, desenvolvida e operada na plataforma
                Baixudos.PR: o participante escolhe seus números, paga por Pix e recebe a
                confirmação automaticamente, com tudo acompanhado por um painel próprio.
              </p>
              <p>
                Na mesma jornada, a página apresenta o evento e leva o comprador até a{" "}
                <b>plataforma oficial de ingressos</b> escolhida pela organização. A
                Baixudos.PR não emite, não armazena e não valida ingressos: essa
                responsabilidade permanece com a plataforma contratada.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- 03 Escopo ---------- */}
        <section className={s.sec}>
          <div className={s.num}>03</div>
          <div>
            <h2 className={s.h2}>ESCOPO INCLUSO</h2>
            <div className={`${s.body} ${s.wide}`}>
              <div className={s.scopeGrid}>
                <div className={`${s.scope} ${s.scopeClient}`}>
                  <span className={s.scopeTag}>FRENTE 01 · NA PLATAFORMA BAIXUDOS.PR</span>
                  <h3>Campanha Gol Vermelho</h3>
                  <ul className={s.scopeFeats}>
                    {escopoCampanha.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>

                <div className={`${s.scope} ${s.scopeClient}`}>
                  <span className={s.scopeTag}>FRENTE 02 · PLATAFORMA EXTERNA</span>
                  <h3>Integração com plataforma externa de ingressos</h3>
                  <ul className={s.scopeFeats}>
                    {escopoIntegracaoBase.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <p className={s.pNote}>
                    Condicionado à plataforma escolhida: consulta de preço, lotes e
                    disponibilidade por API, criação de sessão de checkout, webhook de compra
                    aprovada, identificação do comprador e retorno automático.
                  </p>
                </div>
              </div>

              <div className={`${s.scope} ${s.scopeClient} ${s.scopeFull}`}>
                <span className={s.scopeTag}>TERCEIRO BLOCO DA CAMPANHA</span>
                <div className={s.scopeHead}>
                  <span className={s.scopeIcon} aria-hidden="true">
                    {/* Telão com marca de conferência */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                      <path d="M8 10l3 3 5-5" />
                    </svg>
                  </span>
                  <div>
                    <h3>Apuração e resultado</h3>
                    <p className={s.scopeSub}>Controle restrito, conferência e apresentação no evento</p>
                  </div>
                </div>
                <ul className={s.scopeFeats}>
                  {escopoApuracao.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>

              <div className={`${s.scope} ${s.scopeFull}`}>
                <span className={s.scopeTag}>PAINEL DA CAMPANHA</span>
                <h3>Gestão da operação</h3>
                <ul className={s.scopeFeats}>
                  {escopoPainel.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <p className={s.pNote}>
                  O painel não gerencia lotes, estoque, compradores ou check-in de ingresso.
                  Havendo API da plataforma externa, poderá exibir apenas as informações
                  sincronizadas que ela permitir.
                </p>
              </div>

              <div className={s.warn}>
                <span className={s.warnLab}>SOBRE A INTEGRAÇÃO</span>
                <h3>A PROFUNDIDADE DEPENDE DA PLATAFORMA</h3>
                <p>
                  A profundidade da integração dependerá da API, dos webhooks e das permissões
                  disponibilizadas pela plataforma de ingressos escolhida. Na ausência desses
                  recursos, a integração será realizada por <b>redirecionamento seguro</b>,
                  que é o que está incluso no investimento principal.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 04 Apuração e resultado ---------- */}
        <section className={s.sec}>
          <div className={s.num}>04</div>
          <div>
            <h2 className={s.h2}>APURAÇÃO E RESULTADO</h2>
            <div className={`${s.body} ${s.wide}`}>
              <p style={{ maxWidth: "64ch" }}>
                A plataforma contará com uma área restrita para apoiar o encerramento da
                campanha e a apresentação do resultado. O responsável autorizado poderá
                consolidar as participações válidas, registrar o resultado da fonte oficial,
                conferir a aplicação da regra prevista no regulamento e apresentar a apuração
                em modo telão durante o evento.
              </p>

              <div className={s.warn}>
                <span className={s.warnLab}>LIMITAÇÃO IMPORTANTE</span>
                <h3>A PLATAFORMA NÃO ESCOLHE O CONTEMPLADO</h3>
                <p>
                  A plataforma não permitirá a escolha manual do vencedor. A definição do
                  número contemplado seguirá exclusivamente o método previsto no regulamento
                  oficial da campanha. A implementação final da regra dependerá do
                  fornecimento do regulamento, da documentação da campanha e da definição
                  formal do método de apuração.
                </p>
              </div>

              <div className={s.scopeGrid} style={{ marginTop: "clamp(20px, 3.5vw, 28px)" }}>
                <div className={s.scope}>
                  <span className={s.scopeTag}>APURAÇÃO NO EVENTO</span>
                  <h3>Modo telão</h3>
                  <p className={s.scopeSub}>Tela de apresentação para TV ou projeção</p>
                  <ul className={s.scopeFeats}>
                    {telaoItens.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <p className={s.pNote}>
                    As animações da tela são recurso visual de apresentação. Elas não geram e
                    não interferem no resultado, que vem da fonte oficial.
                  </p>
                </div>

                <div className={s.scope}>
                  <span className={s.scopeTag}>DEPOIS DA APURAÇÃO</span>
                  <h3>Página pública de resultado</h3>
                  <p className={s.scopeSub}>Transparência sem expor dados pessoais</p>
                  <ul className={s.scopeFeats}>
                    {resultadoItens.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <p className={s.pNote}>
                    Não são publicados CPF, telefone, e-mail, endereço ou qualquer dado
                    completo do participante.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 05 Conexão ---------- */}
        <section className={s.sec}>
          <div className={s.num}>05</div>
          <div>
            <h2 className={s.h2}>CONEXÃO ENTRE CAMPANHA E INGRESSO</h2>
            <div className={s.body}>
              <p className={s.leadIn}>
                Durante ou depois da compra dos números, o participante recebe um convite
                claro e transparente:
              </p>
              <aside className={s.highlight}>
                <span className={s.gLabel}>NA CONFIRMAÇÃO DA COMPRA</span>
                <h3>&ldquo;DESEJA TAMBÉM ADQUIRIR SEU INGRESSO?&rdquo;</h3>
                <p>
                  A apuração e a premiação acontecerão durante o evento da Baixudos.PR. O
                  botão <b>Comprar ingresso</b> leva o participante direto para a plataforma
                  oficial. A participação na campanha e o ingresso são apresentados sempre
                  como produtos distintos.
                </p>
              </aside>
              <p style={{ marginTop: "clamp(20px, 3vw, 26px)" }}>
                O caminho inverso, oferecer a campanha a quem já comprou o ingresso, depende
                dos recursos da plataforma contratada. Pode ser feito por link na página de
                confirmação, banner, e-mail pós-compra ou webhook. Só será confirmado depois
                de verificarmos o que a plataforma escolhida permite.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- 06 Estado atual ---------- */}
        <section className={s.sec}>
          <div className={s.num}>06</div>
          <div>
            <h2 className={s.h2}>O QUE JÁ ESTÁ CONSTRUÍDO</h2>
            <div className={`${s.body} ${s.wide}`}>
              <p className={s.leadIn}>
                A campanha não começa do zero. Situação verificada diretamente no projeto:
              </p>
              <ul className={s.stateList}>
                {estado.map((e, i) => {
                  const b = badgeMap[e.badge];
                  return (
                    <li key={i}>
                      <span className={s.stateWhat}>{e.what}</span>
                      <span className={`${s.badge} ${s[b.cls]}`}>{b.label}</span>
                    </li>
                  );
                })}
              </ul>
              <p className={s.legend}>
                PRONTO: funcionando no projeto. PARCIAL: construído, ainda sem operar com
                dados e pagamentos reais. PENDENTE: a desenvolver nesta etapa.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- 07 Segurança ---------- */}
        <section className={s.sec}>
          <div className={s.num}>07</div>
          <div>
            <h2 className={s.h2}>SEGURANÇA</h2>
            <div className={s.body}>
              <ul className={`${s.list} ${s.listIn}`}>
                {seguranca.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
              <div className={s.warn}>
                <span className={s.warnLab}>IMPORTANTE</span>
                <h3>O SISTEMA NÃO SORTEIA</h3>
                <p>
                  A apuração é feita pelo método oficial definido no regulamento da
                  Baixudos.PR. O painel apenas <b>registra e publica</b> o número contemplado.
                  A autorização da campanha, o regulamento, a validação jurídica, a prestação
                  de contas e a entrega do prêmio são de responsabilidade da contratante.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 08 Entregáveis ---------- */}
        <section className={s.sec}>
          <div className={s.num}>08</div>
          <div>
            <h2 className={s.h2}>ENTREGÁVEIS</h2>
            <div className={s.body}>
              <ul className={`${s.list} ${s.listIn}`}>
                {entregaveis.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- 09 Prazo ---------- */}
        <section className={s.sec}>
          <div className={s.num}>09</div>
          <div>
            <h2 className={s.h2}>PRAZO</h2>
            <div className={s.body}>
              <aside className={s.highlight}>
                <span className={s.gLabel}>PRAZO DE ENTREGA</span>
                <h3>19 DIAS ÚTEIS.</h3>
                <p>
                  Contados a partir da aprovação e do recebimento dos <b>valores oficiais da
                  campanha, das informações do evento, do link da plataforma de ingressos, do
                  regulamento com o método de apuração</b> e dos acessos ao gateway de
                  pagamento e ao domínio.
                </p>
              </aside>
              <p style={{ marginTop: "clamp(20px, 3vw, 26px)" }}>
                O evento é em 08 de novembro, mas o prazo que decide o resultado da campanha é
                o da <b>abertura das vendas</b>: quanto mais cedo a campanha entra no ar, mais
                tempo ela tem para vender. Aprovando agora, as vendas abrem ainda em agosto.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- 10 Investimento ---------- */}
        <section className={s.sec}>
          <div className={s.num}>10</div>
          <div>
            <h2 className={s.h2}>INVESTIMENTO</h2>
            <div className={s.body}>
              <span className={s.wasTag}>ESCOPO PRINCIPAL</span>
              <div className={s.price}>R$ 6.500</div>
              <p className={s.priceNote}>
                Campanha Gol Vermelho completa, em produção recebendo pagamentos reais, o
                módulo de apuração e resultado em estrutura básica, e a integração com a
                plataforma de ingressos por redirecionamento.
              </p>

              <span className={s.payLabel}>Formas de pagamento</span>
              <div className={s.payCards}>
                <div className={`${s.payCard} ${s.payCardRec}`}>
                  <div className={`${s.payHead} ${s.payHeadRec}`}>Pix à vista</div>
                  <div className={s.payBody}>
                    <div className={s.payCtx}>
                      <span className={s.offOld}><s>R$ 6.500</s></span>
                      <span className={s.offPill}>−10%</span>
                    </div>
                    <div className={s.payPrice}>R$ 5.850</div>
                    <span className={s.paySave}>Economia de R$ 650</span>
                    <ul className={s.payFeats}>
                      <li>Pagamento único, sem parcelas</li>
                      <li>O prazo começa a contar no mesmo dia</li>
                    </ul>
                  </div>
                </div>

                <div className={s.payCard}>
                  <div className={s.payHead}>Em três etapas</div>
                  <div className={s.payBody}>
                    <div className={s.payCtx}>Acompanha a entrega</div>
                    <div className={s.payPrice}>R$ 2.600 <small>entrada</small></div>
                    <ul className={s.payFeats}>
                      <li><span><b className={s.nb}>R$ 1.950</b> na aprovação funcional, com a compra por Pix testada</span></li>
                      <li><span><b className={s.nb}>R$ 1.950</b> na publicação, com as vendas abertas</span></li>
                      <li><span className={s.nb}>Total de R$ 6.500, sem juros</span></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className={s.warn} style={{ borderColor: "var(--line)", background: "transparent" }}>
                <span className={s.gLabel}>ADICIONAL OPCIONAL · R$ 2.900</span>
                <h3>APURAÇÃO EM ESTRUTURA AVANÇADA</h3>
                <p>
                  Dupla conferência por dois responsáveis, arquivos de integridade da lista
                  final, histórico completo das ações, relatórios da apuração e níveis de
                  permissão por usuário. <b>Não está incluído no valor principal</b> e pode ser
                  contratado depois. A importação automática do resultado depende de a fonte
                  oficial oferecer um canal de consulta, o que será verificado antes de entrar
                  no escopo.
                </p>
              </div>

              <div className={s.warn} style={{ borderColor: "var(--line)", background: "transparent" }}>
                <span className={s.gLabel}>ADICIONAL CONDICIONADO</span>
                <h3>INTEGRAÇÃO AVANÇADA POR API</h3>
                <p>
                  Consulta de lotes e disponibilidade, sessão de checkout, webhook de compra
                  aprovada e retorno automático do comprador. <b>O valor será orçado depois</b>{" "}
                  de conhecermos a plataforma escolhida, sua documentação, a autenticação, os
                  webhooks disponíveis e o ambiente de testes. Não é possível precificar com
                  honestidade antes disso, e não é necessário para colocar a campanha no ar.
                </p>
              </div>

              <span className={s.payLabel}>Acompanhamento mensal, opcional</span>
              <div className={s.planCards}>
                <div className={s.plan}>
                  <span className={s.pTag}>PLANO BÁSICO</span>
                  <h3>Campanha no ar</h3>
                  <div className={s.pPrice}>R$ 397 <small>/mês</small></div>
                  <ul className={s.feats}>
                    <li>Monitoramento e acompanhamento da hospedagem</li>
                    <li>Correção de falhas do sistema</li>
                    <li>Atualizações de segurança</li>
                  </ul>
                </div>
                <div className={`${s.plan} ${s.planRec}`}>
                  <span className={s.pTag}>PLANO OPERAÇÃO</span>
                  <h3>Campanha acompanhada</h3>
                  <div className={s.pPrice}>R$ 797 <small>/mês</small></div>
                  <ul className={s.feats}>
                    <li><b>Tudo do Plano Básico</b></li>
                    <li>Suporte a pedidos e pagamentos</li>
                    <li>Ajustes de valores, textos e imagens</li>
                  </ul>
                  <p className={s.pNote}>Recomendado durante o período de vendas.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 11 Não incluído ---------- */}
        <section className={s.sec}>
          <div className={s.num}>11</div>
          <div>
            <h2 className={s.h2}>O QUE NÃO ESTÁ INCLUÍDO</h2>
            <div className={s.body}>
              <ul className={`${s.list} ${s.listOut}`}>
                {naoIncluso.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- 12 Responsabilidades ---------- */}
        <section className={s.sec}>
          <div className={s.num}>12</div>
          <div>
            <h2 className={s.h2}>O QUE FICA COM A BAIXUDOS.PR</h2>
            <div className={s.body}>
              <ul className={`${s.list} ${s.listTodo}`}>
                {responsabilidades.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- 13 Aceite ---------- */}
        <section className={s.sec}>
          <div className={s.num}>13</div>
          <div>
            <h2 className={s.h2}>VALIDADE E ACEITE</h2>
            <div className={`${s.body} ${s.wide}`}>
              <p className={s.closing}>
                Colocar a campanha do Gol Vermelho{" "}
                <em>vendendo sozinha, a tempo de vender.</em>
              </p>

              <ol className={s.next}>
                <li><span>Você aprova a proposta e escolhe a forma de pagamento.</span></li>
                <li><span>Eu envio o contrato e a lista do que preciso receber.</span></li>
                <li><span>Você envia os <b>valores oficiais, os dados do evento, o link da plataforma de ingressos, o regulamento</b> e os acessos.</span></li>
                <li><span>Em <b>19 dias úteis</b> as vendas abrem, com treinamento do painel feito.</span></li>
              </ol>

              <div className={s.validity}>
                <span>Validade desta proposta</span>
                <strong>até 06/08/2026</strong>
              </div>

              <div className={s.accept}>
                <span className={s.gLabel}>ACEITE</span>
                <p style={{ marginTop: 10, fontSize: "clamp(.94rem, 3.7vw, 1.02rem)", color: "var(--ink-70)", lineHeight: 1.55 }}>
                  A assinatura abaixo formaliza a aprovação do escopo, do prazo, do
                  investimento e das condições descritas neste documento.
                </p>

                <div className={s.acceptGrid}>
                  <div className={s.sign}>
                    <div className={s.signWho}>Contratante</div>
                    <div className={s.signName}>
                      Alexandre Henrique
                      <small>Baixudos.PR</small>
                    </div>
                  </div>
                  <div className={s.sign}>
                    <div className={s.signWho}>Contratado</div>
                    <div className={s.signName}>
                      Rafael Razeira
                      <small>Rafael Razeira Estúdio</small>
                    </div>
                  </div>
                </div>

                <div className={s.acceptDate}>
                  <span>Local</span>
                  <span>Data</span>
                </div>
              </div>

              <a className={s.linkWa} href={WA_TALK} target="_blank" rel="noopener noreferrer">
                Ficou com uma dúvida? Fala comigo no WhatsApp <span aria-hidden="true">→</span>
              </a>
              <br />
              <a className={s.linkWa} href={WA_OK} target="_blank" rel="noopener noreferrer">
                Aprovar e começar <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <footer className={s.footer}>
          <span>RAFAEL RAZEIRA ESTÚDIO</span>
          <span>rafael.rbarbon@gmail.com</span>
          <span>(44) 99999-7219</span>
          <span>@rafaelrazeira.estudio</span>
        </footer>
      </div>
    </div>
  );
}
