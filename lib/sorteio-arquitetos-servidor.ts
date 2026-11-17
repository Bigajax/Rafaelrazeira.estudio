import "server-only";
import { bancoRaspadinha, hashRecibo } from "./raspadinha-servidor";
import { tokenValido } from "./raspadinha";
import { BENEFICIOS_SORTEIO, SORTEIO_ARQUITETOS, type CampanhaSorteio, type EstadoSorteio, type ResultadoBilhete } from "./sorteio-arquitetos";

export async function conferirRegrasCupons() {
  const { error } = await bancoRaspadinha().from("arquiteto_participantes").select("beneficio,final_centavos,utilizado_em").limit(0);
  if (error) throw new Error("Aplique supabase/sorteio-arquitetos-cupons.sql antes de abrir ou sortear.");
}

export async function campanhaSorteio(): Promise<CampanhaSorteio | null> {
  const { data, error } = await bancoRaspadinha().from("arquiteto_sorteios").select("*")
    .eq("campanha", SORTEIO_ARQUITETOS).eq("owner_id", process.env.CRM_OWNER_ID!).maybeSingle();
  if (error) throw new Error("Banco do sorteio indisponível.");
  return data;
}

export async function consultarParticipacao(recibo?: string): Promise<EstadoSorteio> {
  const campanha = await campanhaSorteio();
  if (!campanha) return { estado: "nao-aberto" };
  if (!recibo || !tokenValido(recibo)) return { estado: campanha.sorteado_em ? "encerrado" : "inscricoes-abertas" };
  const { data: pessoa, error } = await bancoRaspadinha().from("arquiteto_participantes")
    .select("id,nome,codigo,entregue_em,beneficio,utilizado_em,final_centavos,desconto_centavos").eq("campanha", SORTEIO_ARQUITETOS).eq("recibo_hash", hashRecibo(recibo)).maybeSingle();
  if (error) throw new Error("Não foi possível consultar a participação.");
  if (!pessoa) return { estado: campanha.sorteado_em ? "encerrado" : "inscricoes-abertas" };
  if (!campanha.sorteado_em) return { estado: "aguardando", nome: pessoa.nome };
  const ganhou = campanha.ganhador_id === pessoa.id;
  const beneficio = pessoa.beneficio as ResultadoBilhete;
  if (!Object.hasOwn(BENEFICIOS_SORTEIO, beneficio)) throw new Error("Distribuição ainda não concluída.");
  const oferta = BENEFICIOS_SORTEIO[beneficio];
  if (oferta.finalCentavos !== pessoa.final_centavos || oferta.descontoCentavos !== pessoa.desconto_centavos || ganhou !== (beneficio === "site"))
    throw new Error("Oferta do participante inconsistente.");
  return { estado: "resultado", nome: pessoa.nome, ganhou, beneficio, codigo: pessoa.codigo, entregue: !!pessoa.entregue_em, utilizado: !!pessoa.utilizado_em };
}
