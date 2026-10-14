"use client";
import s from "@/components/sistema/sistema.module.css";
export default function ErroCRM({ reset }: { reset: () => void }) {
  return (
    <div className={s.tela}>
      <section className={s.painel}>
        <h1>Não foi possível carregar esta área</h1>
        <p className={s.descricao}>
          A consulta falhou. Os dados não serão apresentados como zero. Tente novamente; se a sessão expirou,
          entre no CRM.
        </p>
        <div className={s.links}>
          <button className={s.botao} onClick={reset}>
            Tentar novamente
          </button>
          <a href="/crm/login">Entrar no CRM</a>
        </div>
      </section>
    </div>
  );
}
