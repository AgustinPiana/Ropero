import * as THREE from "three";

/**
 * Geometría de una remera a partir de su foto.
 *
 * La idea: la foto ya viene sin fondo, así que su transparencia ES la
 * silueta. Para cada punto de la tela medimos la distancia al borde más
 * cercano (en cualquier dirección) y "inflamos" la lámina como una
 * almohada: cero en el borde, máximo hacia el centro. Así el frente y la
 * espalda se tocan en TODO el contorno (axilas, cuello, ruedo) y de
 * costado no queda ningún hueco.
 */

/** ¿Hay tela en este punto de la foto? (u, v de 0 a 1, v hacia arriba) */
type EsTela = (u: number, v: number) => boolean;
type Lectura = {
  /** Distancia al borde de la silueta, como fracción del ancho (0 = borde o afuera). */
  distancia: (u: number, v: number) => number;
  /** Para una columna u (0..1), a qué fracción del alto empieza la tela (0 = arriba). */
  borde: (u: number) => number;
  esTela: EsTela;
};

const COLUMNAS = 64;
const FILAS = 72;
/** Resolución con la que se mide la silueta. */
const MUESTRA = 128;
/** Qué tan "redondeado" es el borde (fracción del ancho). */
const RADIO_BORDE = 0.2;
/** Franja plana junto al borde (≈1,6 celdas de la malla): garantiza que las caras se toquen. */
const FRANJA = 1.6 / COLUMNAS;
/**
 * Separación mínima entre caras (2 mm). Si frente y espalda quedan en el MISMO
 * plano, la placa no sabe cuál dibujar adelante y el borde se ve serruchado
 * ("z-fighting"). 2 mm no se ven pero alcanzan para que no pase.
 */
const SEPARACION_CARAS = 0.002;

function leerImagen(imagen: CanvasImageSource, aspecto: number): Lectura | null {
  const ancho = MUESTRA;
  const alto = Math.max(8, Math.round(ancho / aspecto));
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  const { data } = ctx.getImageData(0, 0, ancho, alto);
  const opaco = (x: number, y: number) => data[(y * ancho + x) * 4 + 3] > 128;

  // Transformada de distancia (dos pasadas "chamfer"): para cada píxel de tela,
  // a cuántos píxeles está el fondo más cercano. El borde de la imagen cuenta como fondo.
  const D = new Float32Array(ancho * alto);
  const INF = 1e6;
  for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) D[y * ancho + x] = opaco(x, y) ? INF : 0;
  const d1 = 1, d2 = Math.SQRT2;
  const leer = (x: number, y: number) => (x < 0 || y < 0 || x >= ancho || y >= alto ? 0 : D[y * ancho + x]);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      if (D[i] === 0) continue;
      D[i] = Math.min(D[i], leer(x - 1, y) + d1, leer(x, y - 1) + d1, leer(x - 1, y - 1) + d2, leer(x + 1, y - 1) + d2);
    }
  }
  for (let y = alto - 1; y >= 0; y--) {
    for (let x = ancho - 1; x >= 0; x--) {
      const i = y * ancho + x;
      if (D[i] === 0) continue;
      D[i] = Math.min(D[i], leer(x + 1, y) + d1, leer(x, y + 1) + d1, leer(x + 1, y + 1) + d2, leer(x - 1, y + 1) + d2);
    }
  }

  // Lectura con interpolación bilineal, en fracción del ancho.
  const distancia = (u: number, v: number) => {
    const fx = Math.min(ancho - 1, Math.max(0, u * ancho - 0.5));
    const fy = Math.min(alto - 1, Math.max(0, (1 - v) * alto - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(ancho - 1, x0 + 1), y1 = Math.min(alto - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const a = D[y0 * ancho + x0] * (1 - tx) + D[y0 * ancho + x1] * tx;
    const b = D[y1 * ancho + x0] * (1 - tx) + D[y1 * ancho + x1] * tx;
    return (a * (1 - ty) + b * ty) / ancho;
  };

  // Para cada columna: primera fila con tela (el contorno de hombros y cuello).
  const arriba = new Float32Array(ancho).fill(NaN);
  for (let x = 0; x < ancho; x++) {
    for (let y = 0; y < alto; y++) {
      if (opaco(x, y)) { arriba[x] = y / alto; break; }
    }
  }
  const borde = (u: number) => {
    const x = Math.min(ancho - 1, Math.max(0, Math.floor(u * ancho)));
    return Number.isNaN(arriba[x]) ? 0 : arriba[x];
  };

  const esTela: EsTela = (u, v) => {
    const x = Math.min(ancho - 1, Math.max(0, Math.floor(u * ancho)));
    const y = Math.min(alto - 1, Math.max(0, Math.floor((1 - v) * alto)));
    return opaco(x, y);
  };

  return { distancia, borde, esTela };
}

/** Valores genéricos si no se pudo leer la imagen. */
const lecturaGenerica: Lectura = {
  distancia: (u, v) => Math.min(u, 1 - u, v, 1 - v),
  borde: (u) => 0.03 + Math.abs(u - 0.5) * 0.2,
  esTela: () => true,
};

export type GeometriasPrenda = {
  frente: THREE.BufferGeometry;
  espalda: THREE.BufferGeometry;
  /** Recorrido de la percha: debajo de la línea de hombros, de manga a manga. */
  hombros: THREE.Vector3[];
  /** Para que el mouse solo "toque" la tela y no el rectángulo transparente. */
  esTela: EsTela;
};

/**
 * Crea las dos caras de la prenda con el origen en el centro del borde
 * superior (donde va la percha).
 */
export function crearGeometriasPrenda(
  imagen: CanvasImageSource | null,
  ancho: number,
  alto: number,
): GeometriasPrenda {
  const { distancia, borde, esTela } = (imagen && leerImagen(imagen, ancho / alto)) || lecturaGenerica;
  const grosor = ancho * 0.09; // volumen máximo de cada cara

  // Volumen ("almohada") de cada cara: cero en el borde, sube rápido y se aplana adentro.
  const volumen = (u: number, v: number) => {
    const d = distancia(u, v);
    const k = Math.min(1, Math.max(0, (d - FRANJA) / RADIO_BORDE));
    const redondeo = 1 - (1 - k) * (1 - k);
    const panza = 0.85 + 0.15 * Math.min(1, d / 0.3); // el centro del torso un poco más lleno
    const caida = 0.72 + 0.28 * Math.min(1, v * 1.6); // abajo la tela cuelga más plana
    return grosor * redondeo * panza * caida;
  };
  // Pliegues que comparten las dos caras: la remera entera ondula,
  // así frente y espalda siguen pegados en el borde.
  const pliegues = (u: number, v: number) => {
    const abajo = Math.pow(1 - v, 1.6); // nada en los hombros, mucho en el ruedo
    const ondas =
      Math.sin(u * Math.PI * 5.2 + 0.6) * 0.6 +
      Math.sin(u * Math.PI * 9.1 + 2.1) * 0.25 +
      Math.sin(u * Math.PI * 2.3 + 4.0) * 0.4;
    return ondas * 0.032 * abajo * ancho;
  };

  const frente = new THREE.PlaneGeometry(ancho, alto, COLUMNAS, FILAS);
  frente.translate(0, -alto / 2, 0);
  const espalda = frente.clone();
  const pos = frente.attributes.position as THREE.BufferAttribute;
  const uv = frente.attributes.uv as THREE.BufferAttribute;
  // La espalda es el espejo: z hacia atrás, UV invertida en horizontal
  // (así la foto de espalda se ve derecha desde atrás) y triángulos dados vuelta.
  const posE = espalda.attributes.position as THREE.BufferAttribute;
  const uvE = espalda.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const vol = volumen(u, v);
    const p = pliegues(u, v);
    pos.setZ(i, vol + p + SEPARACION_CARAS);
    posE.setZ(i, -vol + p - SEPARACION_CARAS);
    uvE.setX(i, 1 - u);
  }
  frente.computeVertexNormals();
  const indice = espalda.index!;
  for (let i = 0; i < indice.count; i += 3) {
    const a = indice.getX(i + 1);
    indice.setX(i + 1, indice.getX(i + 2));
    indice.setX(i + 2, a);
  }
  espalda.computeVertexNormals();

  // La percha va unos cm por debajo del contorno (más en las puntas), donde la
  // tela ya tiene volumen, así queda escondida. En el centro promedia los dos
  // lados del cuello, porque ahí la foto tiene el hueco del escote.
  const yEn = (u: number) => -borde(u) * alto - 0.09 - Math.abs(u - 0.5) * 0.12;
  const yCuello = (yEn(0.38) + yEn(0.62)) / 2;
  const hombros = [0.25, 0.31, 0.37].map((u) => new THREE.Vector3((u - 0.5) * ancho, yEn(u), 0));
  hombros.push(new THREE.Vector3(0, yCuello, 0));
  for (const u of [0.63, 0.69, 0.75]) hombros.push(new THREE.Vector3((u - 0.5) * ancho, yEn(u), 0));

  return { frente, espalda, hombros, esTela };
}
