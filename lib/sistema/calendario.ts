const DIA_SP = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Datas de negócio já são locais; timestamps são convertidos antes do recorte. */
export function diaLocal(valor: string | Date): string {
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const data = new Date(valor);
  if (!Number.isFinite(data.getTime())) throw new Error("Data inválida");
  return DIA_SP.format(data);
}
export const mesLocal = (valor: string | Date) => diaLocal(valor).slice(0, 7);
export function proximoMes(mes: string, passo = 1): string {
  const [ano, n] = mes.split("-").map(Number);
  const data = new Date(Date.UTC(ano, n - 1 + passo, 1));
  return data.toISOString().slice(0, 7);
}
export function limitesAno(ano: number) {
  return { inicio: `${ano}-01-01`, fim: `${ano + 1}-01-01` };
}
export function limitesMes(mes: string) {
  return { inicio: `${mes}-01`, fim: `${proximoMes(mes)}-01` };
}
export function instanteSP(dia: string) {
  return `${dia}T00:00:00-03:00`;
}
export function dataValida(dia: unknown): dia is string {
  if (typeof dia !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const data = new Date(`${dia}T12:00:00Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === dia;
}
