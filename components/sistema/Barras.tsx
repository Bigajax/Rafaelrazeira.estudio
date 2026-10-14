import Link from "next/link";
import s from "./sistema.module.css";
export function Barras({
  linhas,
  rotulo,
}: {
  linhas: { nome: string; valor: number; texto: string; href: string }[];
  rotulo: string;
}) {
  const max = Math.max(1, ...linhas.map((l) => l.valor));
  return (
    <ul className={s.barrasLista} aria-label={rotulo}>
      {linhas.map((l) => (
        <li key={l.nome}>
          <Link href={l.href}>
            <span>{l.nome}</span>
            <b>{l.texto}</b>
            <span className={s.trilhoBarra} aria-hidden="true">
              <i style={{ width: (Math.max(0, l.valor) / max) * 100 + "%" }} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
