/* ============================================================
   A FILA DE SEGUNDA (09/10/2026)

   O resumo da semana de cada loja com o Performance liberado, pronto para
   mandar: o texto que a dona também vê no cartão "Sua semana" do painel,
   e um botão que abre o WhatsApp dela com a mensagem escrita. O envio é um
   toque do Rafael (o leitor do WhatsApp do estúdio só lê).
   ============================================================ */

import { linkWhatsapp } from "@/lib/crm/regras";
import { frasesDaSemana, mensagemDaSemana, semanasParaMandar } from "@/lib/performance/semana";
import p from "@/app/(pt)/crm/performance.module.css";

export async function FilaDaSemana() {
  const lojas = await semanasParaMandar();
  if (!lojas.length) return null;

  return (
    <section className={p.nova} aria-labelledby="fila-semana">
      <h2 id="fila-semana">A semana de cada loja, para mandar na segunda</h2>
      <p className={p.novaNota}>
        O mesmo texto aparece no cartão &quot;Sua semana&quot; do painel delas. Só as lojas com o Performance liberado.
      </p>
      <ul className={p.lista}>
        {lojas.map((l) => {
          const frases = l.semana ? frasesDaSemana(l.semana) : [];
          const texto = frases.length ? mensagemDaSemana(l.primeiroNome, frases) : null;
          const link = texto ? linkWhatsapp(l.whatsapp, texto) : null;
          return (
            <li key={l.loja_id} className={p.linha}>
              <b>{l.nome}</b>
              {texto ? <p style={{ whiteSpace: "pre-line", margin: 0, fontSize: 14, lineHeight: 1.5 }}>{texto}</p> : <p className={p.novaNota}>Sem visita nos últimos 7 dias: nada a mandar.</p>}
              {link ? (
                <a href={link} target="_blank" rel="noreferrer">
                  Mandar no WhatsApp
                </a>
              ) : texto ? (
                <p className={p.erro}>A loja não tem lead com WhatsApp no CRM: amarre o lead na ficha da loja.</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
