/* ============================================================
   A REPAGINADA DOS TEMPLATES DE WHATSAPP (25/11/2026)

   O Rafael, olhando a mensagem de entrega da WFS Store: "esses templates não
   estão surtindo efeito, parece que está muito monótono e perguntas que os
   clientes não respondem". O que muda, e SÓ no texto (`conteudo`):
   - uma ideia por parágrafo, mais curto;
   - a pergunta do fim se responde com sim ou não (ou com uma palavra);
   - o preço abre pelos R$ 199 (o número do anúncio h27u), com o total junto;
   - sai quem fingia ser cliente (proibido desde 06/11 e ainda no banco).
   O que NÃO muda: título, categoria e ordem (a escada do silêncio escolhe o
   template pelo começo do título e pela posição, ver lib/crm/regras.ts), e
   nenhum valor, prazo ou condição.

   Fora desta leva, de propósito: os da Black (acabam em 30/11), os da Loja
   online escolhidos em 06 e 10/11 (menos a entrega da amostra, que tinha a
   mesma frase do investimento), a loja de celular (garimpo parado) e as
   objeções de desconto (são condição, não forma).

   USO (no repo do estúdio):
     node scripts/repaginar-templates-2026-11-25.mjs            só mostra o antes e o depois
     node scripts/repaginar-templates-2026-11-25.mjs --gravar   grava no banco e confere
     node scripts/repaginar-templates-2026-11-25.mjs --voltar   devolve o texto de antes
   O texto de antes fica em supabase/templates-antes-2026-11-25.json.
   ============================================================ */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
  }),
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ANTES = "supabase/templates-antes-2026-11-25.json";

/* título exato → texto novo */
const NOVOS = {
  /* ── quem chegou pelo anúncio: a abertura já funcionava (metade responde);
        só ficou mais curta ── */
  "Chegou pelo anúncio: quem sou e o que ela pediu":
    "Fala, {nome}! Rafael aqui, do estúdio. Chegou o seu pedido da vitrine grátis da {instagram}, já tô com o perfil aberto.\n\nMonto hoje a prévia do site da loja, com as fotos do Instagram de vocês. De graça.\n\nQual peça mais sai aí? Começo por ela.",
  "Chegou pelo anúncio, mas o @ não abriu":
    "Fala, {nome}! Rafael aqui, do estúdio. Chegou o seu pedido da vitrine grátis, mas o {instagram} não abriu aqui.\n\nMe manda o @ certo da loja que eu começo hoje?",

  /* ── a entrega: o link, e UMA pergunta de sim ou não. O "tem um
        investimento, se fizer sentido te passo como funciona" saiu: ficou
        "é uma amostra por enquanto", que avisa sem virar comunicado ── */
  "Prévia pronta, mensagem 1: só o presente":
    "{nome}, olha como ficou a {empresa}:\n\n{link}\n\nÉ uma amostra por enquanto. Ficou com a cara de vocês?",
  "Loja online: amostra pronta, só o presente":
    "{nome}, olha a amostra da loja online da {empresa}:\n\n{link}\n\nÉ uma amostra por enquanto. Ficou com a cara de vocês?",

  /* ── o preço: abre pelos R$ 199 e termina pedindo uma ação ── */
  "Prévia, mensagem 2: o preço (só depois que responder)":
    "Pra ela virar o site da loja, no número de vocês, começa com R$ 199 no Pix. Os outros R$ 800 só na entrega. R$ 999 no total, sem mensalidade.\n\nVem com um painel no celular pra vocês mesmos trocarem peça e preço.\n\nTe mando o Pix dos R$ 199?",
  "Quero colocar no ar: o botão da amostra":
    "Boa! Pra ela ir pro ar no número de vocês: R$ 199 no Pix pra começar e R$ 800 na entrega. R$ 999 no total, sem mensalidade.\n\nTe mando o Pix dos R$ 199?",
  "Gostou e não perguntou: o próximo passo":
    "Que bom que curtiu! Te explico em duas linhas como ela vai pro número de vocês?",

  /* ── as dúvidas de depois do preço ── */
  "Eu consigo atualizar? O painel":
    "Consegue, pelo celular: tira a foto, põe nome, preço e numeração, e a peça aparece no site na hora. Acabou um número, é só marcar que ele some.",
  "Dá pra comprar direto no site? A compra fecha no WhatsApp":
    "Nessa vitrine a compra fecha no WhatsApp: a cliente escolhe a peça e o tamanho, e o pedido chega pronto pra vocês. O pagamento vocês combinam na conversa, como já fazem hoje.",
  "Vou ver com o sócio: o resumo pra encaminhar":
    "Deixo pronto pra você só encaminhar:\n\nA vitrine da {empresa}: {link}\nÉ o site da loja: a cliente escolhe a peça e o pedido chega pronto no WhatsApp. Vem com painel pra trocar as peças pelo celular.\nR$ 199 pra começar e R$ 800 na entrega. R$ 999 no total, sem mensalidade.\n\nVocês conseguem conversar até amanhã?",

  /* ── as voltas ── */
  "Prévia sem resposta: volta com novidade":
    "{nome}, {saudacao}! Atualizei a vitrine com o que entrou de novo no feed de vocês, e {topo} tá no topo:\n\n{link}\n\nFaltou alguma peça?",
  "Disse que ia fazer e sumiu: um dado, sem Pix":
    "Oi, {nome}! Tô deixando a vitrine da {instagram} pronta pra ligar no número de vocês.\n\nOs pedidos caem neste WhatsApp mesmo?",
  "Amostra pronta: condição única R$ 899":
    "Oi, {nome}! A vitrine da {instagram} continua no ar:\n\n{link}\n\nComo ela já tá montada, consigo fazer por R$ 899 em vez de R$ 999: R$ 199 pra começar e R$ 700 na entrega, ou em até 12x no cartão (com os juros do cartão). Sem mensalidade.\n\nFecho a de vocês, ou posso tirar do ar?",

  /* ── o frio: saem os dois que fingiam ser cliente ("entrei no perfil
        procurando e não achei os preços"), proibidos desde 06/11 ── */
  "Primeiro toque, só a pergunta":
    "Oi, {saudacao}! Aqui é o Rafael, de Maringá, faço site pra loja. Vi a {empresa} e fiquei com uma dúvida: vocês vendem só pelo direct ou já têm site?",
  "Segundo toque, depois que responder":
    "Entendi! Então posso montar uma prévia do site da {empresa} com as fotos de vocês, de graça, pra você ver como fica antes de decidir qualquer coisa.\n\nQuer?",
  "Depois de curtir ou comentar":
    "Oi, {nome}! Vi que você passou por aqui. Eu monto a prévia do site da loja de graça, com as fotos do Instagram.\n\nQuer ver como ficaria a {empresa}?",
  "Retorno 1, a hora ruim (2 a 3 dias)":
    "{nome}, {saudacao}! Acho que te peguei na correria. Era só isto: posso montar a prévia do site da {empresa}, de graça, pra você ver?",
  "Retorno 2, mostra em vez de pedir (4 a 6 dias)":
    "{nome}, última por aqui. Olha uma loja que eu fiz, pra você ver o tipo de coisa:\n\n[link]\n\nSe um dia quiser uma assim pra {empresa}, é só me chamar.",
  "Retorno 3, a saída honrosa (8 a 10 dias)":
    "{nome}, {saudacao}. Vou parar de te chamar pra não virar chateação. Se um dia a {empresa} precisar de site, é só me mandar mensagem aqui.\n\nSucesso aí!",

  /* ════ A SEGUNDA LEVA, no mesmo dia (o Rafael: "Não só esse e sim todos os
     templates!"): os 22 que tinham ficado de fora. Mesma trava: nenhum valor,
     prazo ou condição muda (os R$ 100 da entrada cortada, os 5 dias úteis, o
     "até amanhã", a Black até 30/11, os valores da Loja online). ════ */

  /* ── o frio ── */
  "Loja de celular: direto na prévia":
    "Oi, {saudacao}! Aqui é o Rafael, faço vitrine digital pra loja. Achei a {empresa} no Google.\n\nMonto de graça uma prévia do site de vocês: os aparelhos com foto e preço, e o pedido caindo no WhatsApp da loja.\n\nPosso montar?",
  "Loja online: o que eu faço, com saída":
    "Oi, {saudacao}! Aqui é o Rafael, de Maringá. Eu faço loja online pra loja como a sua: a cliente escolhe a peça, paga no Pix ou no cartão, e o pedido cai no seu painel.\n\nTe mostro como ficaria com as suas peças? Se não for a hora, tranquilo.",
  "Loja online: achei no Google":
    "Oi, {saudacao}! Achei a sua loja procurando {nicho} em {cidade}.\n\nEu faço loja online pra cliente pagar direto no site, sem passar pelo direct.\n\nTe mostro como funciona?",
  "Chegou por indicação":
    "Oi, {nome}! Aqui é o Rafael, de Maringá, faço site pra loja. Me passaram o contato da {empresa}.\n\nVocês já têm site?",
  "Reativar contato antigo (mais de 30 dias)":
    "Oi, {nome}! Rafael aqui, a gente conversou um tempo atrás sobre o site da {empresa}.\n\nAinda faz sentido pra vocês?",

  /* ── a Loja online ── */
  "Loja online: chegou pelo anúncio, a amostra":
    "Fala, {nome}! Rafael aqui, do estúdio. Chegou o seu pedido da amostra da loja online da {instagram}, já tô com o perfil aberto.\n\nMonto com as peças de vocês e te mando até amanhã.\n\nQual peça mais sai aí? Começo por ela.",
  "Loja online: depois do sim, a amostra":
    "Fechou! Vou montar uma amostra com as suas peças, pra você ver como fica antes de decidir.\n\nQual peça mais sai aí? Começo por ela.",
  "Loja online: o preço (só depois que responder)":
    "São dois valores: R$ 1.990 pra montar a loja, no Pix ou em até 12x no cartão (com os juros do cartão), e R$ 249,90 por mês depois que ela estiver no ar.\n\nO mensal cobre o sistema, o relatório das vendas e o suporte.\n\nTe mando a proposta com tudo escrito?",
  "Loja online: quem já tem a vitrine (R$ 991)":
    "Oi, {nome}! Dá pra cliente pagar direto na vitrine da {empresa}: Pix, cartão e frete calculado, sem passar pelo WhatsApp.\n\nComo vocês já têm a vitrine, são R$ 991 pra ligar e R$ 249,90 por mês depois de entregue.\n\nQuer ver como fica na de vocês?",
  "Depois do preço: a amostra da loja online":
    "Oi, {nome}! A amostra da loja online da {empresa} ainda tá no ar:\n\n{link}\n\nDeixo mais uns dias ou posso tirar?",
  "Loja online: por que tem mensalidade? (só se perguntar)":
    "A vitrine é uma vez só porque o pedido fecha no WhatsApp. Na loja online o pagamento passa pelo site, então tem sistema rodando todo dia.\n\nO mensal paga isso, mais o relatório e o suporte.",

  /* ── as objeções ── */
  "Quando o preço trava":
    "Entendo, {nome}. No valor eu não mexo, mas na entrada sim: R$ 100 pra começar e o resto só quando estiver no ar.\n\nAssim dá?",
  "Desconto de 10% (escreva o motivo deste caso)":
    "{nome}, consigo 10% de desconto por [o motivo deste caso]: R$ 899 em vez de R$ 999, uma vez só, sem mensalidade. R$ 199 pra começar e R$ 700 na entrega.\n\nO resto não muda: o pedido no seu WhatsApp e o painel pra trocar preço e foto.\n\nFecho assim?",
  "Último recurso: R$ 799 à vista no Pix":
    "{nome}, a menor condição que eu faço: R$ 799 à vista no Pix, em vez dos R$ 999. Ela só existe porque o pagamento vem inteiro na frente.\n\nO resto fica igual: pronta em 5 dias úteis, com o pedido no seu WhatsApp e o painel pra trocar preço e foto.\n\nTe mando o Pix?",
  "É mensal? (só se a pessoa perguntar)":
    "Não é mensal: paga uma vez e acabou.\n\nO único custo à parte é o domínio, o endereço .com.br: R$ 40 por ano no registro.br, no seu nome.",

  /* ── as voltas de depois do preço e a Black (até 30/11) ── */
  "Depois do preço: uma volta, com a saída":
    "Oi, {nome}! A vitrine da {instagram} ainda tá no ar:\n\n{link}\n\nDeixo mais uns dias ou posso tirar?",
  "Depois da Black: uma volta, com a data":
    "Oi, {nome}! A Black da vitrine da {instagram}, R$ 799 à vista, vai até dia 30.\n\nSeguro a de vocês ou posso tirar do ar?",
  "Black R$ 799 até 30/11: só a amostra":
    "Oi! 🔥 Condição de Black pra vocês: a vitrine que eu montei da loja vai pro ar por R$ 799 à vista, em vez de R$ 999.\n\n{link}\n\nVale até 30/11. Seguro a de vocês?",
  "Black R$ 799 até 30/11: já viu o preço":
    "Oi! 🔥 Lembra da vitrine que eu montei pra vocês? Na Black ela vai pro ar por R$ 799 à vista, em vez de R$ 999.\n\n{link}\n\nVale até 30/11. Seguro a de vocês?",

  /* ── a proposta e a cobrança ── */
  "Enviando a proposta":
    "Aqui o orçamento da vitrine da {empresa}, com tudo escrito:\n\n[link da proposta]",
  "Proposta sem resposta":
    "Oi, {nome}! Conseguiu ver a proposta da {empresa}?\n\nSe não for pra agora, me fala sem cerimônia.",
  "Cobrança da parcela":
    "Oi, {nome}! Tudo certo com a vitrine aí?\n\nFalta só o restante, {saldo}. Te mando o Pix por aqui?",
};

const VARIAVEIS = new Set(["nome", "saudacao", "empresa", "instagram", "link", "topo", "saldo", "nicho", "cidade", "pecas", "destaques"]);
const variaveisDe = (t) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

const { data: atuais, error } = await sb.from("crm_templates").select("id,titulo,categoria,ordem,conteudo").order("categoria").order("ordem");
if (error) throw error;

if (process.argv.includes("--voltar")) {
  const antes = JSON.parse(fs.readFileSync(ANTES, "utf8"));
  for (const a of antes) {
    const agora = atuais.find((x) => x.id === a.id);
    if (agora && agora.conteudo !== a.conteudo) {
      const r = await sb.from("crm_templates").update({ conteudo: a.conteudo }).eq("id", a.id);
      if (r.error) throw r.error;
      console.log("voltou:", a.titulo);
    }
  }
  process.exit(0);
}

let problemas = 0;
const mudancas = [];
for (const [titulo, novo] of Object.entries(NOVOS)) {
  const linhas = atuais.filter((t) => t.titulo === titulo);
  if (linhas.length !== 1) { console.log(`✗ "${titulo}": ${linhas.length} linhas com esse título`); problemas++; continue; }
  const t = linhas[0];
  /* nenhuma variável desconhecida, e nenhuma das que dependem da oficina ou
     do contrato ({link}, {topo}, {saldo}...) num template que não a tinha:
     a que o CRM não preenche sai como [variável] na mensagem */
  const DO_CADASTRO = new Set(["nome", "saudacao", "empresa", "instagram"]);
  const novas = variaveisDe(novo).filter((v) => !VARIAVEIS.has(v) || (!DO_CADASTRO.has(v) && !variaveisDe(t.conteudo).includes(v)));
  if (novas.length) { console.log(`✗ "${titulo}": variável que o texto antigo não tinha: ${novas.join(", ")}`); problemas++; continue; }
  if (novo.includes("—")) { console.log(`✗ "${titulo}": travessão`); problemas++; continue; }
  /* todo valor em reais e toda data do texto de antes continuam no de agora
     (repaginar é forma: condição não muda aqui) */
  const original = fs.existsSync(ANTES) ? JSON.parse(fs.readFileSync(ANTES, "utf8")).find((x) => x.id === t.id)?.conteudo ?? t.conteudo : t.conteudo;
  const numeros = (s) => new Set([...s.matchAll(/R\$ ?[\d.,]*\d|\d{1,2}\/\d{1,2}|\d+x|\d+%|\d+ dias/g)].map((m) => m[0]));
  const sumiram = [...numeros(original)].filter((n) => !numeros(novo).has(n));
  const entraram = [...numeros(novo)].filter((n) => !numeros(original).has(n));
  if (sumiram.length || entraram.length) console.log(`! "${titulo}": número que saiu [${sumiram.join(", ")}], que entrou [${entraram.join(", ")}]`);
  if (t.conteudo === novo) continue; // já está assim (a primeira leva)
  mudancas.push({ ...t, novo });
}
if (problemas) { console.log(`\n${problemas} problema(s). Nada gravado.`); process.exit(1); }

for (const m of mudancas) {
  console.log(`\n=== [${m.categoria} ${m.ordem}] ${m.titulo}  (${m.conteudo.length} → ${m.novo.length} caracteres)`);
  console.log("ANTES:\n" + m.conteudo + "\n\nDEPOIS:\n" + m.novo);
}
console.log(`\n${mudancas.length} templates mudam, ${atuais.length - mudancas.length} ficam como estão.`);

if (!process.argv.includes("--gravar")) { console.log("Nada gravado: rode com --gravar."); process.exit(0); }

if (!fs.existsSync(ANTES)) fs.writeFileSync(ANTES, JSON.stringify(atuais, null, 1));
for (const m of mudancas) {
  const r = await sb.from("crm_templates").update({ conteudo: m.novo }).eq("id", m.id).select("id");
  if (r.error || r.data.length !== 1) throw new Error(`não gravou: ${m.titulo}`);
}
/* a conferência: ler de volta e comparar */
const { data: depois } = await sb.from("crm_templates").select("id,titulo,categoria,ordem,conteudo");
let ok = 0;
for (const m of mudancas) if (depois.find((x) => x.id === m.id)?.conteudo === m.novo) ok++;
const intactos = atuais.filter((a) => !mudancas.some((m) => m.id === a.id)).every((a) => {
  const d = depois.find((x) => x.id === a.id);
  return d && d.conteudo === a.conteudo && d.titulo === a.titulo && d.ordem === a.ordem && d.categoria === a.categoria;
});
console.log(`\nGravado: ${ok} de ${mudancas.length} conferem no banco. Os outros ${atuais.length - mudancas.length} ${intactos ? "estão intactos" : "MUDARAM, conferir"}. Total: ${depois.length}.`);

/* o registro para o supabase/crm.sql */
const q = (s) => "E'" + s.replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\n/g, "\\n") + "'";
const sql = mudancas.map((m) => `update public.crm_templates\n   set conteudo = ${q(m.novo)}\n where titulo = ${q(m.titulo)};`).join("\n");
fs.writeFileSync("supabase/templates-2026-11-25-registro.sql", sql + "\n");
console.log("O registro em SQL está em supabase/templates-2026-11-25-registro.sql");
