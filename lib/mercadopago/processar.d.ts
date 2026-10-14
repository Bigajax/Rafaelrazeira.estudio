export function processarPagamento(
  owner: string,
  pagamento: Record<string, unknown>,
  diaConfirmado?: string,
): Promise<Record<string, unknown>>;
