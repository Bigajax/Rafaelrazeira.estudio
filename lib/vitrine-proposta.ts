/** A proposta pede um perfil legível; a conversa confirma o material da loja. */
export function perfilParaProposta(valor: string): string | null {
  const perfil = String(valor ?? "").trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "")
    .replace(/[?#].*$/, "").replace(/\/.*$/, "").replace(/^@+/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(perfil) && /[a-z0-9_]/.test(perfil) ? perfil : null;
}
