"use client";

import { useActionState } from "react";
import { entrar } from "../acoes";
import s from "../crm.module.css";

export function Login({ destino }: { destino: string }) {
  const [erro, agir, enviando] = useActionState(entrar, null);

  return (
    <form action={agir} className={s.loginCartao}>
      <h1>
        Entrar no CRM<i className={s.ponto}>.</i>
      </h1>
      <p>A área de prospecção do estúdio. Só você entra aqui.</p>

      <input type="hidden" name="destino" value={destino} />

      <label className={s.campo}>
        <span className={s.campoRot}>E-mail</span>
        <input type="email" name="email" autoComplete="username" required autoFocus />
      </label>

      <label className={s.campo}>
        <span className={s.campoRot}>Senha</span>
        <input type="password" name="senha" autoComplete="current-password" required />
      </label>

      {/* `role="alert"` para o leitor de tela anunciar o erro sem que a
          pessoa precise voltar procurando o que mudou na tela. */}
      {erro ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}

      <button type="submit" className={s.btnAcao} disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
