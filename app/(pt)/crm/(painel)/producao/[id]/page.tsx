import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FichaLoja } from "@/components/producao/FichaLoja";
import { lojaCompleta, urlDoAtivo } from "@/lib/producao/dados";

export const metadata: Metadata = { title: "Oficina" };

export default async function PaginaLoja({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dados = await lojaCompleta(id);
  if (!dados) notFound();

  /* A URL pública é montada no servidor e desce pronta. O componente do
     navegador não precisa saber onde fica o bucket, e o dia em que o
     Storage mudar de endereço muda um arquivo só. */
  const urls: Record<string, string> = {};
  for (const a of dados.ativos) urls[a.id] = urlDoAtivo(a.caminho);

  /* A tela precisa saber por onde a leitura vai ANTES de você clicar: com
     a chave da Anthropic ela olha as fotos, sem ela vai pelo OpenRouter e
     enxerga só legenda, que em loja de moda costuma ser nada. Ler isso do
     ambiente só é possível aqui, no servidor. */
  const comVisao = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <FichaLoja
      loja={dados.loja}
      ativos={dados.ativos}
      produtos={dados.produtos}
      urls={urls}
      versoes={dados.versoes}
      comVisao={comVisao}
    />
  );
}
