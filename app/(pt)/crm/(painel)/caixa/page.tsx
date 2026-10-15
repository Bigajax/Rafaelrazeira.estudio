import { carregarCaixa } from "@/lib/caixa/dados";
import { Caixa } from "@/components/caixa/Caixa";
import { hojeSP } from "@/lib/crm/regras";
export const metadata = { title: "Caixa" };
export default async function PaginaCaixa({
  searchParams,
}: {
  searchParams: Promise<{
    mes?: string;
    ano?: string;
    aba?: string;
    filtro?: string;
    atraso?: string;
  }>;
}) {
  const p = await searchParams,
    atual = hojeSP().slice(0, 7);
  const mes = /^20\d{2}-(0[1-9]|1[0-2])$/.test(p.mes ?? "")
    ? p.mes!
    : /^20\d{2}$/.test(p.ano ?? "")
      ? p.ano + "-" + atual.slice(5)
      : atual;
  const aba =
    p.aba === "conferir" || p.aba === "agenda" || p.aba === "historico"
      ? p.aba
      : "cobrar";
  const pedido = p.filtro ?? p.atraso ?? "";
  const filtro = [
    "vencidas",
    "hoje",
    "mes",
    "1-7",
    "8-30",
    "31-90",
    "90+",
  ].includes(pedido)
    ? pedido
    : "";
  return (
    <Caixa
      key={mes + aba + filtro}
      dados={await carregarCaixa(Number(mes.slice(0, 4)))}
      mes={mes}
      abaInicial={aba}
      filtroInicial={filtro}
    />
  );
}
