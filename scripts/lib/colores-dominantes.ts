import sharp from "sharp";
import { rgbAHex, type RGB } from "../../lib/colores";

/**
 * Colores dominantes de una imagen con fondo transparente.
 * Es un k-means clásico (como un clustering en Power BI / Python):
 * agrupa los píxeles en k grupos de color y devuelve los más grandes.
 */
export async function coloresDominantes(
  entrada: string | Buffer,
  { maximo = 3, k = 6, minimoPorcentaje = 0.03 } = {},
): Promise<string[]> {
  const { data, info } = await sharp(entrada)
    .resize(96, 96, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixeles: RGB[] = [];
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 200) continue; // ignora fondo transparente y bordes
    pixeles.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  if (pixeles.length === 0) return [];

  const dist = (a: RGB, b: RGB) => (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;

  // Inicialización determinística (k-means++ sin azar): siempre da lo mismo.
  const centros: RGB[] = [pixeles[Math.floor(pixeles.length / 2)]];
  while (centros.length < Math.min(k, pixeles.length)) {
    let mejor = pixeles[0], mejorD = -1;
    for (const p of pixeles) {
      const d = Math.min(...centros.map((c) => dist(p, c)));
      if (d > mejorD) { mejorD = d; mejor = p; }
    }
    if (mejorD === 0) break;
    centros.push(mejor);
  }

  let asignacion = new Array<number>(pixeles.length).fill(0);
  for (let iter = 0; iter < 12; iter++) {
    asignacion = pixeles.map((p) => {
      let idx = 0, min = Infinity;
      centros.forEach((c, j) => { const d = dist(p, c); if (d < min) { min = d; idx = j; } });
      return idx;
    });
    centros.forEach((_, j) => {
      const grupo = pixeles.filter((_, i) => asignacion[i] === j);
      if (grupo.length === 0) return;
      centros[j] = {
        r: grupo.reduce((s, p) => s + p.r, 0) / grupo.length,
        g: grupo.reduce((s, p) => s + p.g, 0) / grupo.length,
        b: grupo.reduce((s, p) => s + p.b, 0) / grupo.length,
      };
    });
  }

  const tamanios = centros.map((_, j) => asignacion.filter((a) => a === j).length);
  const grupos = centros
    .map((c, j) => ({ c, n: tamanios[j] }))
    .sort((a, b) => b.n - a.n);

  // Junta grupos casi iguales (sombras del mismo color de tela).
  const finales: { c: RGB; n: number }[] = [];
  for (const g of grupos) {
    const parecido = finales.find((f) => dist(f.c, g.c) < 40 ** 2);
    if (parecido) parecido.n += g.n;
    else finales.push({ ...g });
  }

  return finales
    .filter((g) => g.n / pixeles.length >= minimoPorcentaje)
    .slice(0, maximo)
    .map((g) => rgbAHex(g.c));
}
