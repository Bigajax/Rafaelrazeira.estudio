export const FAIXAS_ATRASO = [
  { id: "1-7", nome: "1 a 7 dias", de: 1, ate: 7 },
  { id: "8-30", nome: "8 a 30 dias", de: 8, ate: 30 },
  { id: "31-60", nome: "31 a 60 dias", de: 31, ate: 60 },
  { id: "61", nome: "Mais de 60 dias", de: 61, ate: Infinity },
];
export function diasDeAtraso(vence: string, hoje: string) {
  return Math.max(
    0,
    Math.round(
      (Date.parse(hoje + "T12:00:00Z") - Date.parse(vence + "T12:00:00Z")) /
        86400000,
    ),
  );
}
export function faixaDoAtraso(vence: string, hoje: string) {
  const dias = diasDeAtraso(vence, hoje);
  return FAIXAS_ATRASO.find((f) => dias >= f.de && dias <= f.ate)?.id ?? null;
}
