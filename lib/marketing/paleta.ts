/* ============================================================
   AS CORES QUE SAEM DA IMAGEM (navegador)

   A imagem 1 é reduzida a 80x100, cada pixel cai num balde de cor (4 bits
   por canal) e os baldes competem por área E por saturação: o fundo verde
   da mulher no pedestal ganha por área, o laranja da sacola ganha por
   vivacidade. Sobem quatro cores bem diferentes entre si, e a primeira é
   sempre a que domina a imagem (é ela que vira o fundo da abertura).
   ============================================================ */

function hex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export async function coresDaImagem(url: string, quantas = 4): Promise<string[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = 80;
  c.height = 100;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const { data } = ctx.getImageData(0, 0, c.width, c.height);

  const baldes = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let k = 0; k < data.length; k += 4) {
    const [r, g, b] = [data[k], data[k + 1], data[k + 2]];
    const chave = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bal = baldes.get(chave) ?? { n: 0, r: 0, g: 0, b: 0 };
    bal.n++;
    bal.r += r;
    bal.g += g;
    bal.b += b;
    baldes.set(chave, bal);
  }

  const cores = [...baldes.values()].map((x) => {
    const [r, g, b] = [x.r / x.n, x.g / x.n, x.b / x.n];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const luz = max / 255;
    return { r, g, b, n: x.n, sat, luz };
  });

  const dist = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) =>
    Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);

  /* a dominante: a maior área entre as que não são quase pretas nem quase brancas */
  const porArea = [...cores].sort((a, b) => b.n - a.n);
  const dominante = porArea.find((x) => x.luz > 0.12 && !(x.sat < 0.08 && x.luz > 0.9)) ?? porArea[0];
  const escolhidas = [dominante];

  /* só entra cor VIVA: o marrom do paletó e o vinho da sombra perdiam o
     carrossel da lupa para tons apagados (bancada de 30/09). */
  const porVida = [...cores].sort((a, b) => b.n * b.sat ** 3 - a.n * a.sat ** 3);
  for (const x of porVida) {
    if (escolhidas.length >= quantas) break;
    if (x.luz < 0.3 || x.sat < 0.45) continue;
    if (escolhidas.every((e) => dist(e, x) > 150)) escolhidas.push(x);
  }
  /* imagem de poucas cores: completa com preto e papel */
  const reserva = [
    { r: 17, g: 17, b: 17 },
    { r: 242, g: 239, b: 230 },
  ];
  for (const x of reserva) if (escolhidas.length < quantas && escolhidas.every((e) => dist(e, x) > 150)) escolhidas.push(x as (typeof escolhidas)[number]);

  return escolhidas.map((x) => hex(x.r, x.g, x.b));
}
