import { NextRequest, NextResponse } from "next/server";
import { apenasDigitos, whatsappValido } from "@/components/telefone";
import { CAMPANHA_RASPADINHA, tokenValido } from "@/lib/raspadinha";
import { bancoRaspadinha, buscarCupom, cookieRecibo, estadoPublico, hashRecibo, novoSegredo } from "@/lib/raspadinha-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Contexto = { params: Promise<{ token: string }> };
const responder = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" },
});

/* Consultar, inclusive por um robô de preview, nunca reserva o prêmio. */
export async function GET(req: NextRequest, { params }: Contexto) {
  const { token } = await params;
  try {
    const cupom = await buscarCupom(token);
    if (!cupom) return responder({ erro: "Este link de raspadinha não existe." }, 404);
    const anterior = req.cookies.get(cookieRecibo(token))?.value;
    const recibo = anterior && tokenValido(anterior) ? anterior : novoSegredo();
    const resposta = responder(estadoPublico(cupom, recibo));
    if (recibo !== anterior) resposta.cookies.set(cookieRecibo(token), recibo, {
      httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "strict",
      path: `/api/arquitetos/raspadinha/${token}`, maxAge: 60 * 60 * 24 * 365,
    });
    return resposta;
  } catch {
    return responder({ erro: "Não consegui consultar o prêmio. Tente novamente em instantes." }, 503);
  }
}

export async function POST(req: NextRequest, { params }: Contexto) {
  if (req.headers.get("origin") !== req.nextUrl.origin) return responder({ erro: "Origem inválida." }, 403);
  if (!req.headers.get("content-type")?.startsWith("application/json")) return responder({ erro: "Envio inválido." }, 415);
  const { token } = await params;
  if (!tokenValido(token)) return responder({ erro: "Link inválido." }, 404);
  const recibo = req.cookies.get(cookieRecibo(token))?.value;
  if (!recibo || !tokenValido(recibo)) return responder({ erro: "Reabra a página para preparar o resgate. Permita os cookies deste site." }, 400);
  let dados;
  try {
    const texto = await req.text();
    if (texto.length > 2000) return responder({ erro: "Envio muito grande." }, 413);
    dados = JSON.parse(texto);
  } catch { return responder({ erro: "Confira os dados e tente novamente." }, 400); }
  const nome = typeof dados?.nome === "string" ? dados.nome.trim().replace(/\s+/g, " ") : "";
  const whatsapp = typeof dados?.whatsapp === "string" ? dados.whatsapp : "";
  if (nome.length < 2 || nome.length > 100 || !whatsappValido(whatsapp))
    return responder({ erro: "Preencha seu nome e um WhatsApp válido com DDD." }, 400);
  try {
    const cupom = await buscarCupom(token);
    if (!cupom) return responder({ erro: "Este link de raspadinha não existe." }, 404);
    const atual = estadoPublico(cupom, recibo);
    if (atual.estado !== "disponivel") return responder(atual, atual.estado === "indisponivel" ? 409 : 200);
    /* Compare-and-set no Postgres: duas confirmações simultâneas nunca
       escolhem dois ganhadores. O próprio UPDATE detém o lock da linha. */
    const { data, error } = await bancoRaspadinha().from("arquiteto_cupom_evento")
      .update({ nome, whatsapp: apenasDigitos(whatsapp), recibo_hash: hashRecibo(recibo), resgatado_em: new Date().toISOString() })
      .eq("campanha", CAMPANHA_RASPADINHA).eq("owner_id", process.env.CRM_OWNER_ID!)
      .eq("token", token).is("resgatado_em", null).select("campanha").maybeSingle();
    if (error) throw new Error("Falha ao resgatar.");
    const final = await buscarCupom(token);
    if (!final) throw new Error("Prêmio não encontrado.");
    const estado = estadoPublico(final, recibo);
    return responder(estado, !data && estado.estado === "indisponivel" ? 409 : 200);
  } catch {
    return responder({ erro: "Não consegui confirmar agora. Tente novamente; o mesmo resgate não cria outro cupom." }, 503);
  }
}
