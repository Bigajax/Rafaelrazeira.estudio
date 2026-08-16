/* O slot do modal fica vazio em toda rota que não é uma ficha de lead.
   Sem este arquivo o Next não sabe o que renderizar no slot quando a rota
   atual não casa com nenhuma página dentro dele, e a navegação quebra com
   404 em vez de simplesmente não mostrar modal nenhum. */
export default function SemModal() {
  return null;
}
