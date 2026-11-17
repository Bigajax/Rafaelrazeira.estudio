import { NextRequest, NextResponse } from "next/server";
import { apenasDigitos, whatsappValido } from "@/components/telefone";
import { tokenValido } from "@/lib/raspadinha";
import { COOKIE_SORTEIO } from "@/lib/sorteio-arquitetos";
import { bancoRaspadinha, hashRecibo, novoSegredo } from "@/lib/raspadinha-servidor";
import { consultarParticipacao } from "@/lib/sorteio-arquitetos-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const resposta = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: {
  "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow",
} });

export async function GET(req: NextRequest) {
  try {
    const anterior = req.cookies.get(COOKIE_SORTEIO)?.value;
    const recibo = anterior && tokenValido(anterior) ? anterior : novoSegredo();
    const r = resposta(await consultarParticipacao(recibo));
    if (recibo !== anterior) r.cookies.set(COOKIE_SORTEIO, recibo, {
      httpOnly: true, sameSite: "strict", secure: req.nextUrl.protocol === "https:",
      path: "/api/arquitetos/sorteio", maxAge: 60 * 60 * 24 * 365,
    });
    return r;
  } catch { return resposta({ erro: "Não foi possível consultar o sorteio. Tente novamente." }, 503); }
}

export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) return resposta({ erro: "Origem inválida." }, 403);
  if (!req.headers.get("content-type")?.startsWith("application/json")) return resposta({ erro: "Envio inválido." }, 415);
  const recibo = req.cookies.get(COOKIE_SORTEIO)?.value;
  if (!recibo || !tokenValido(recibo)) return resposta({ erro: "Reabra a página e permita os cookies deste site para participar." }, 400);
  let body;
  try { const texto = await req.text(); if (texto.length > 2000) return resposta({ erro: "Envio muito grande." }, 413); body = JSON.parse(texto); }
  catch { return resposta({ erro: "Confira os dados e tente novamente." }, 400); }
  const nome = typeof body?.nome === "string" ? body.nome.trim().replace(/\s+/g, " ") : "";
  const tel = typeof body?.whatsapp === "string" ? body.whatsapp : "";
  if (body?.website) return resposta({ erro: "Não foi possível confirmar a inscrição." }, 400);
  if (nome.length < 2 || nome.length > 100 || !whatsappValido(tel)) return resposta({ erro: "Preencha seu nome e um WhatsApp válido com DDD." }, 400);
  let whatsapp = apenasDigitos(tel);
  if (whatsapp.startsWith("55") && whatsapp.length > 11) whatsapp = whatsapp.slice(2);
  try {
    const { error } = await bancoRaspadinha().rpc("arquiteto_inscrever", {
      p_owner: process.env.CRM_OWNER_ID!, p_nome: nome, p_whatsapp: whatsapp, p_recibo_hash: hashRecibo(recibo),
    });
    if (error) {
      if (error.message.includes("whatsapp_ja_inscrito")) return resposta({ erro: "Este WhatsApp já está inscrito. Use o navegador da inscrição original ou fale com o Rafael." }, 409);
      if (error.message.includes("sorteio_encerrado")) return resposta({ estado: "encerrado" }, 409);
      if (error.message.includes("sorteio_nao_aberto")) return resposta({ estado: "nao-aberto" }, 409);
      throw new Error("Falha ao inscrever.");
    }
    return resposta(await consultarParticipacao(recibo));
  } catch { return resposta({ erro: "Não foi possível confirmar agora. Tente novamente; sua participação não será duplicada." }, 503); }
}
