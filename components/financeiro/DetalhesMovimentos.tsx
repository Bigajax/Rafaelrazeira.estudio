"use client";
import {useState} from 'react';
import {informarLiquido,registrarDevolucao,type Feito} from '@/app/(pt)/crm/acoes-financeiro';
import s from '@/components/sistema/sistema.module.css';
type Rodar=(acao:()=>Promise<Feito>,depois?:(r:Feito)=>void)=>void;
export function Liquido({
  id,
  bruto,
  inicial,
  rodar,
}: {
  id: string;
  bruto: number;
  inicial: number | null;
  rodar: Rodar;
}) {
  const [v, setV] = useState(inicial?.toFixed(2) ?? "");
  return (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        rodar(() => informarLiquido(id, Number(v)));
      }}
    >
      <label>
        Líquido em reais
        <input
          required
          type="number"
          min="0"
          max={bruto}
          step="0.01"
          value={v}
          placeholder="Não informado"
          onChange={(e) => setV(e.target.value)}
        />
      </label>
      <button className={s.botao}>Confirmar</button>
    </form>
  );
}
export function Devolver({
  id,
  limite,
  rodar,
}: {
  id: string;
  limite: number;
  rodar: Rodar;
}) {
  const [aberto, setAberto] = useState(false);
  const [request, setRequest] = useState("");
  if (limite <= 0) return <span>Devolvido</span>;
  return aberto ? (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        if (
          !window.confirm(
            "Registrar a devolução e reabrir o saldo correspondente da parcela?",
          )
        )
          return;
        rodar(
          () =>
            registrarDevolucao(
              id,
              Number(d.get("valor")),
              String(d.get("dia")),
              request,
            ),
          (r) => {
            if (r.ok) setAberto(false);
          },
        );
      }}
    >
      <label>
        Valor devolvido
        <input
          name="valor"
          required
          type="number"
          min="0.01"
          max={limite}
          step="0.01"
        />
      </label>
      <label>
        Data
        <input required name="dia" type="date" />
      </label>
      <button className={s.botao}>Registrar</button>
      <button
        type="button"
        className={s.botao}
        onClick={() => setAberto(false)}
      >
        Cancelar
      </button>
    </form>
  ) : (
    <button
      type="button"
      className={s.botao}
      onClick={() => {
        setRequest(crypto.randomUUID());
        setAberto(true);
      }}
    >
      Devolver
    </button>
  );
}
