/* ============================================================
   Normalização e hash das chaves de casamento da Meta.

   Vive fora das rotas de propósito: o Lead (que sai do browser) e a venda
   fechada (que você registra depois) PRECISAM hashear exatamente do mesmo
   jeito. Se o telefone virar um hash diferente nos dois caminhos, a Meta não
   amarra a venda na visita, e o ganho inteiro de ensinar quem compra se perde
   sem nenhum erro aparecer em lugar nenhum.
   ============================================================ */
import crypto from "crypto";

export const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");

/* minúsculo e sem espaço nas pontas, como a Meta exige antes do hash */
export const normEmail = (e) => String(e || "").trim().toLowerCase();

/* E.164 sem o "+", com DDI do Brasil quando o número vier sem */
export function normPhone(p) {
  let d = String(p || "").replace(/\D/g, "").replace(/^0+/, "");
  if (d && !d.startsWith("55")) d = "55" + d;
  return d;
}

/* A Meta casa por primeiro nome, minúsculo e sem pontuação */
export const normNome = (n) =>
  String(n || "").trim().toLowerCase().replace(/[^\p{L}\s]/gu, "").split(/\s+/)[0] || "";

/* user_data espera array de hashes; ausente é diferente de vazio */
export const hashArray = (v) => (v ? [sha256(v)] : undefined);
