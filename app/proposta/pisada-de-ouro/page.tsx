import type { Metadata } from "next";
import { Archivo, Inter, Space_Mono } from "next/font/google";
import s from "./proposta.module.css";
import CheckoutLoader from "./CheckoutLoader";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: { absolute: "Proposta — Pisada de Ouro | Rafael Razeira Estúdio" },
  description:
    "Proposta comercial de e-commerce de calçados para a Pisada de Ouro: escopo, investimento, prazo e planos mensais opcionais.",
  robots: { index: false, follow: false },
};

const WA = "https://wa.me/5544999997219?text=";
const WA_TALK = WA + encodeURIComponent(
  "Olá Rafael, tenho uma dúvida sobre a proposta da Pisada de Ouro antes de aprovar."
);

const entregas = [
  <><b>Design personalizado</b> da Pisada de Ouro: página inicial, catálogo de calçados, categorias e marcas.</>,
  <><b>Busca e filtros</b> por marca, gênero, cor, preço e numeração.</>,
  <><b>Página de cada produto</b> com seleção de cor e numeração, e controle de estoque por número.</>,
  <><b>Carrinho e checkout completos</b>, com pagamento por Pix e cartão via gateway.</>,
  <><b>Cálculo de frete</b> na hora, para qualquer endereço.</>,
  <><b>Painel administrativo</b> para gerir produtos e acompanhar os pedidos.</>,
  <><b>Versão desktop e mobile</b> e integração com WhatsApp para suporte.</>,
  <><b>Configuração do domínio</b> e <b>cadastro completo dos produtos</b> nesta primeira versão.</>,
  <><b>Testes do fluxo de compra</b>, orientação de uso do painel e <b>uma rodada de ajustes</b>.</>,
];

const foraDoEscopo = [
  "Produção das fotografias dos calçados.",
  "Tráfego pago e gestão de anúncios.",
  "Aplicativo de celular e marketplace.",
  "Integração com ERP ou estoque externo e emissão fiscal automática.",
  "Mensalidades de hospedagem, domínio e serviços externos.",
  "Taxas do meio de pagamento e do frete.",
];

const jornada = [
  { t: "Acessa a loja", d: "A cliente entra pelo link, pelo Instagram ou pela busca." },
  { t: "Encontra o tênis", d: "Navega pelo catálogo e filtra por marca, cor, gênero e numeração." },
  { t: "Escolhe cor e numeração", d: "Vê a disponibilidade real por número antes de decidir." },
  { t: "Calcula o frete", d: "Informa o CEP e recebe o valor e o prazo na hora." },
  { t: "Realiza o pagamento", d: "Paga por Pix ou cartão, direto na loja." },
  { t: "Recebe a confirmação", d: "O pedido é confirmado automaticamente para a cliente." },
  { t: "A Pisada de Ouro recebe o pedido", d: "Você recebe tudo organizado para separar e enviar." },
];

const responsabilidades = [
  <>Enviar as <b>fotos e os dados</b> dos produtos.</>,
  <>Informar <b>preços e estoque</b>.</>,
  <>Disponibilizar os <b>dados comerciais</b> da loja.</>,
  <>Criar ou fornecer as <b>contas dos serviços externos</b> (pagamento, frete e domínio).</>,
  <>Validar as <b>políticas de troca, entrega e privacidade</b>.</>,
  <>Aprovar o projeto <b>dentro dos prazos combinados</b>.</>,
];

export default function PropostaPisadaDeOuro() {
  return (
    <div className={`${s.page} ${display.variable} ${body.variable} ${mono.variable}`}>
      <div className={s.gridLines} aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>

      <CheckoutLoader />


      <div className={s.doc}>
        <header className={s.header}>
          <div className={s.brand}>RAFAEL RAZEIRA <small>ESTÚDIO</small></div>
          <div className={s.date}>22/07/2026</div>
        </header>

        {/* Abertura */}
        <section className={s.opening}>
          <div className={s.eyebrow}>
            <span className={s.dot} />
            <span className={s.status}>PROPOSTA COMERCIAL</span>
            <span aria-hidden="true">·</span>
            <span>E-COMMERCE DE CALÇADOS</span>
          </div>
          <h1 className={s.h1}>
            A PISADA DE OURO<br />VENDENDO TÊNIS<br />
            <span className={s.accent}>SOZINHA, ONLINE.</span>
          </h1>
          <p className={s.meta}>
            Preparada para <b>Débora</b>, da <b>Pisada de Ouro</b>. Este documento resume o que a loja precisa,
            o que será entregue, o investimento, o prazo e os planos mensais opcionais. Simples de ler, fácil de aprovar.
          </p>
        </section>

        {/* 01 · Contexto */}
        <section className={s.sec}>
          <div className={s.num}>01</div>
          <div>
            <h2 className={s.h2}>O QUE ENTENDI DA PISADA DE OURO</h2>
            <div className={s.body}>
              <p>
                Hoje cada venda passa pela sua mão, Débora. A cliente vê um tênis, manda mensagem, pergunta se tem
                a numeração, espera a resposta, combina o frete e só então fecha. Tudo depende de você estar por perto
                para atender.
              </p>
              <p>
                A loja precisa de uma operação em que a própria cliente <b>escolhe o modelo, a cor e a numeração,
                calcula o frete, paga e gera o pedido</b>, sem passar pelo WhatsApp. Você recebe tudo pronto para
                separar e enviar.
              </p>
            </div>
          </div>
        </section>

        {/* 02 · Solução */}
        <section className={s.sec}>
          <div className={s.num}>02</div>
          <div>
            <h2 className={s.h2}>A SOLUÇÃO</h2>
            <div className={s.body}>
              <p>
                Um e-commerce personalizado da Pisada de Ouro: com a cara da sua loja, fácil de administrar no dia a dia
                e preparado para vender calçados para todo o Brasil.
              </p>
              <p>
                A cliente navega pelo catálogo, escolhe cor e numeração, o estoque é controlado por número, o frete é
                calculado na hora e o pagamento acontece por <b>Pix ou cartão</b>. O pedido cai organizado no seu painel.
              </p>
            </div>
          </div>
        </section>

        {/* 03 · O que será entregue */}
        <section className={s.sec}>
          <div className={s.num}>03</div>
          <div>
            <h2 className={s.h2}>O QUE SERÁ ENTREGUE</h2>
            <div className={s.body}>
              <ul className={`${s.list} ${s.listIn}`}>
                {entregas.map((item, i) => <li key={i}><span>{item}</span></li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* 04 · O que não está incluso */}
        <section className={s.sec}>
          <div className={s.num}>04</div>
          <div>
            <h2 className={s.h2}>O QUE NÃO ESTÁ INCLUSO</h2>
            <div className={s.body}>
              <ul className={`${s.list} ${s.listOut}`}>
                {foraDoEscopo.map((item, i) => <li key={i}><span>{item}</span></li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* 05 · Jornada da cliente */}
        <section className={s.sec}>
          <div className={s.num}>05</div>
          <div>
            <h2 className={s.h2}>A JORNADA DA CLIENTE</h2>
            <div className={s.body}>
              <p className={s.leadIn}>Cada compra segue o mesmo caminho, sem você precisar responder no meio:</p>
              <ol className={s.steps}>
                {jornada.map((p, i) => (
                  <li key={i}>
                    <h3>{p.t}</h3>
                    <p>{p.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* 06 · Investimento e prazo */}
        <section className={s.sec}>
          <div className={s.num}>06</div>
          <div>
            <h2 className={s.h2}>INVESTIMENTO E PAGAMENTO</h2>
            <div className={s.body}>
              <p className={s.wasLine}>
                <span className={s.was}><s>R$ 3.490</s></span>
                <span className={s.wasTag}>Valor de tabela</span>
              </p>
              <div className={s.price}>R$ 2.990 <small>· condição Pisada de Ouro</small></div>

              <span className={s.payLabel}>Formas de pagamento</span>
              <div className={s.payCards}>
                <div className={`${s.payCard} ${s.payCardRec}`}>
                  <div className={`${s.payHead} ${s.payHeadRec}`}>Pix à vista</div>
                  <div className={s.payBody}>
                    <div className={s.payCtx}>
                      <span className={s.offOld}><s>R$ 2.990</s></span>
                      <span className={s.offPill}>−10%</span>
                    </div>
                    <div className={s.payPrice}>R$ 2.691</div>
                    <span className={s.paySave}>Você economiza R$ 299</span>
                    <ul className={s.payFeats}>
                      <li>Pagamento único, sem parcelas</li>
                      <li>Confirmação na hora</li>
                    </ul>
                    <button className={s.btnPay} type="button" data-checkout-item="avista_pix">
                      Pagar por Pix <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>

                <div className={s.payCard}>
                  <div className={s.payHead}>Pix em 2x</div>
                  <div className={s.payBody}>
                    <div className={s.payCtx}>Entrada + saldo</div>
                    <div className={s.payPrice}>R$ 1.495 <small>entrada</small></div>
                    <ul className={s.payFeats}>
                      <li>Mais <b>R$ 1.495 na entrega</b> da loja</li>
                      <li>Total R$ 2.990, sem juros</li>
                    </ul>
                    <button className={`${s.btnPay} ${s.btnPayGhost}`} type="button" data-checkout-item="entrada_pix">
                      Pagar a entrada <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className={s.payCardsOne}>
                <div className={s.payCard}>
                  <div className={`${s.payHead} ${s.payHeadDark}`}>Cartão</div>
                  <div className={s.payBody}>
                    <div className={s.payCtx}>Parcele em até 6x</div>
                    <div className={s.payPrice}>R$ 2.990</div>
                    <ul className={s.payFeats}>
                      <li><b>Você escolhe</b> as parcelas no checkout</li>
                      <li>Juros calculados na hora pelo cartão</li>
                    </ul>
                    <button className={`${s.btnPay} ${s.btnPayGhost}`} type="button" data-checkout-item="avista_card">
                      Pagar no cartão <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </div>

              <p className={s.payNote}>
                O pagamento acontece <b>aqui mesmo</b>, com segurança pelo Mercado Pago. Assim que confirma, o
                WhatsApp <b>abre sozinho</b> para você me avisar e a gente já começa.
              </p>

              <aside className={s.highlight}>
                <span className={s.gLabel}>PRAZO DE ENTREGA</span>
                <h3>20 A 30 DIAS ÚTEIS.</h3>
                <p>
                  Contados a partir do recebimento de <b>todas as fotos, preços, numerações, pesos, dimensões e
                  informações dos produtos</b>. Com o material completo em mãos, o relógio começa a correr.
                </p>
              </aside>
            </div>
          </div>
        </section>

        {/* 07 · Planos mensais */}
        <section className={s.sec}>
          <div className={s.num}>07</div>
          <div>
            <h2 className={s.h2}>PLANOS MENSAIS OPCIONAIS</h2>
            <div className={s.body}>
              <p className={s.leadIn}>
                Depois da entrega, se você quiser continuar com a gente cuidando da loja. São opcionais: a loja é sua
                e continua funcionando sem eles.
              </p>
              <div className={s.planCards}>
                <div className={s.plan}>
                  <span className={s.pTag}>PLANO TÉCNICO</span>
                  <h3>LOJA NO AR, SEMPRE</h3>
                  <div className={s.pPrice}>R$ 297 <small>/mês</small></div>
                  <ul className={s.feats}>
                    <li>Hospedagem e acompanhamento técnico</li>
                    <li>Monitoramento básico e correção de erros do sistema</li>
                    <li>Atualizações de segurança</li>
                    <li>Suporte relacionado ao funcionamento da loja</li>
                    <li>Pequenos ajustes técnicos</li>
                  </ul>
                  <p className={s.pNote}>Não inclui cadastro recorrente de produtos nem criação de novas funcionalidades.</p>
                </div>
                <div className={`${s.plan} ${s.planRec}`}>
                  <span className={s.pTag}>PLANO GESTÃO</span>
                  <h3>A LOJA CUIDADA POR NÓS</h3>
                  <div className={s.pPrice}>R$ 497 <small>/mês</small></div>
                  <ul className={s.feats}>
                    <li><b>Tudo do Plano Técnico</b></li>
                    <li>Cadastro ou atualização de até <b>15 produtos por mês</b></li>
                    <li>Atualização de preços, cores e numerações</li>
                    <li>Controle das informações de disponibilidade</li>
                    <li>Troca de até <b>dois banners por mês</b> e organização de lançamentos</li>
                    <li>Pequenos ajustes visuais e de conteúdo</li>
                  </ul>
                  <p className={s.pNote}>Produtos excedentes e novas funcionalidades são orçados à parte.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 08 · Responsabilidades */}
        <section className={s.sec}>
          <div className={s.num}>08</div>
          <div>
            <h2 className={s.h2}>O QUE FICA COM VOCÊ</h2>
            <div className={s.body}>
              <p className={s.leadIn}>Para o projeto andar no prazo, a Débora cuida de:</p>
              <ul className={`${s.list} ${s.listTodo}`}>
                {responsabilidades.map((item, i) => <li key={i}><span>{item}</span></li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* 09 · Para começar */}
        <section className={s.sec}>
          <div className={s.num}>09</div>
          <div>
            <h2 className={s.h2}>DEPOIS DO PAGAMENTO</h2>
            <div className={s.body}>
              <p className={s.closing}>
                Transformar a Pisada de Ouro em uma operação{" "}
                <em>organizada, marcante e pronta para vender calçados online.</em>
              </p>
              <ol className={s.next}>
                <li><span>Você escolhe a forma de pagamento acima e <b>paga aqui mesmo</b>, com segurança pelo Mercado Pago.</span></li>
                <li><span>Na confirmação, o <b>WhatsApp abre sozinho</b> para você me avisar; eu envio o contrato para assinatura.</span></li>
                <li><span>Você envia <b>fotos, preços e numerações</b>, e o prazo começa assim que o material chega completo.</span></li>
              </ol>
              <a className={s.linkWa} href={WA_TALK} target="_blank" rel="noopener noreferrer">
                Ficou com uma dúvida? Fala comigo no WhatsApp <span aria-hidden="true">→</span>
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
