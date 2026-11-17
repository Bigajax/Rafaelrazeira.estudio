import { reaisCentavos } from "./raspadinha";
import { BENEFICIOS_SORTEIO, VALOR_SITE_CENTAVOS, type ResultadoBilhete } from "./sorteio-arquitetos";

// Imagem local: nenhum código, nome ou imagem é enviado a outro serviço.
export async function imagemBilhete({ resultado, codigo, previa, utilizado, entregue }: {
  resultado: ResultadoBilhete; codigo?: string; previa: boolean; utilizado?: boolean; entregue?: boolean;
}): Promise<Blob> {
  if (!previa && !codigo) throw new Error("Código indisponível. Reabra seu bilhete.");
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível gerar a imagem neste navegador.");
  const oliva = "#625222", papel = "#fcf8ec";
  const oferta = BENEFICIOS_SORTEIO[resultado];
  const site = resultado === "site";
  const texto = (valor: string, y: number, fonte: string, cor = oliva, largura = 720) => {
    ctx.font = fonte; ctx.fillStyle = cor; ctx.textAlign = "center";
    ctx.fillText(valor, 540, y, largura);
  };
  ctx.fillStyle = "#f4f3ef"; ctx.fillRect(0, 0, 1080, 1350);
  ctx.shadowColor = "#373f2430"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#fffefb"; ctx.fillRect(64, 70, 952, 1210);
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = "#f4f3ef";
  for (let x = 76; x < 1016; x += 24) for (const y of [70, 1280]) {
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = oliva; ctx.fillRect(88, 98, 904, 1154);
  ctx.strokeStyle = "#c1b88b"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(102, 112, 876, 1126, 14); ctx.stroke();
  texto("✧", 173, "28px Georgia", papel);
  texto("RAFAEL RAZEIRA", 236, "52px Georgia", papel);
  texto("E S T Ú D I O", 272, "19px Arial", papel);
  texto("Um novo espaço para os seus projetos.", 320, "23px Georgia", papel);
  ctx.fillStyle = papel; ctx.fillRect(154, 366, 772, 752);
  texto(site ? "O prêmio principal é seu" : resultado === "cupom50" ? "Cupom especial" : "Um presente do estúdio", 430, "23px Arial");
  if (site) {
    texto("É seu!", 570, "110px Georgia");
    texto("Você ganhou um site!", 637, "38px Arial");
    texto(`Uma criação de ${reaisCentavos(VALOR_SITE_CENTAVOS)}`, 731, "28px Arial");
    texto("de presente para o seu escritório.", 776, "25px Arial");
  } else {
    texto("Você ganhou", 493, "26px Arial");
    texto(oferta.destaque, 631, `${resultado === "cupom50" ? 150 : 124}px Georgia`);
    texto("de desconto!", 688, "40px Arial");
    texto("No site do seu escritório.", 735, "25px Arial");
    texto(`De ${reaisCentavos(VALOR_SITE_CENTAVOS)} por`, 802, "24px Arial");
    texto(reaisCentavos(oferta.finalCentavos), 862, "bold 47px Arial");
  }
  ctx.strokeStyle = "#d7cba4"; ctx.beginPath(); ctx.moveTo(210, 899); ctx.lineTo(870, 899); ctx.stroke();
  texto(previa ? "Prévia sem validade" : "Seu código individual", 945, "24px Arial");
  if (!previa && codigo) texto(codigo, 993, "24px monospace", oliva, 680);
  texto(previa ? "Esta imagem não concede um benefício." : site ? "Combine a entrega com o Rafael pelo WhatsApp." : "Uso único. Não cumulativo com outros descontos.", 1057, "21px Arial");
  texto(previa ? "Demonstração da experiência" : utilizado ? "Cupom já utilizado" : entregue ? "Site já entregue" : "Benefício individual. Validação pelo código.", 1178, "22px Arial", papel);
  texto("Na palestra da Bloco Arquitetura", 1213, "19px Arial", papel);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Não foi possível salvar a imagem.")), "image/png"));
}
