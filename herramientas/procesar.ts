/**
 * Procesa las fotos crudas de fotos-crudas/<id>/ y las deja listas para la web.
 *
 *   npm run procesar                    → procesa las carpetas nuevas o con fotos cambiadas
 *   npm run procesar -- --todo          → reprocesa todas
 *   npm run procesar -- remera-negra    → solo esa (se pueden poner varias)
 *   npm run procesar -- --con-fondo     → no quita el fondo (fotos que ya vienen recortadas, PNG transparente)
 *
 * Por cada remera:
 *   1. quita el fondo (modelo de IA que corre en tu compu, gratis),
 *   2. recorta justo al borde de la tela, achica y exporta a WebP,
 *   3. saca 3 colores dominantes,
 *   4. crea o actualiza su entrada en data/prendas.json (sin pisar lo que completaste a mano).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import heicConvert from "heic-convert";
import { removeBackground } from "@imgly/background-removal-node";
import { coloresDominantes } from "../scripts/lib/colores-dominantes";
import { ListaPrendasSchema, type PrendaEntrada } from "../lib/schema";

const RAIZ = path.resolve(__dirname, "..");
const CRUDAS = path.join(RAIZ, "fotos-crudas");
const SALIDA = path.join(RAIZ, "public", "prendas");
const DATOS = path.join(RAIZ, "data", "prendas.json");
const LADO_MAXIMO = 1600;
const EXTENSIONES = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
// Dónde están los archivos del modelo de IA (dentro de herramientas/node_modules).
const MODELO = pathToFileURL(path.join(__dirname, "node_modules", "@imgly", "background-removal-node", "dist") + path.sep).href;

const args = process.argv.slice(2);
const todo = args.includes("--todo");
const conFondo = args.includes("--con-fondo");
const soloIds = args.filter((a) => !a.startsWith("--"));

const verde = (s: string) => `\x1b[32m${s}\x1b[0m`;
const amarillo = (s: string) => `\x1b[33m${s}\x1b[0m`;
const rojo = (s: string) => `\x1b[31m${s}\x1b[0m`;
const gris = (s: string) => `\x1b[90m${s}\x1b[0m`;

/** "Remera Negra AC/DC" → "remera-negra-ac-dc" */
const aId = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** "remera-negra-ac-dc" → "Remera negra ac dc" (después lo cambiás en el JSON) */
const aNombre = (id: string) => {
  const s = id.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

async function buscarFoto(carpeta: string, nombres: string[]): Promise<string | null> {
  const archivos = await fs.readdir(carpeta);
  for (const n of nombres) {
    const f = archivos.find((a) => path.parse(a).name.toLowerCase() === n && EXTENSIONES.includes(path.extname(a).toLowerCase()));
    if (f) return path.join(carpeta, f);
  }
  return null;
}

async function fechaModificacion(f: string): Promise<number> {
  try {
    return (await fs.stat(f)).mtimeMs;
  } catch {
    return 0;
  }
}

/** Abre la foto. Las HEIC del iPhone se convierten a JPG en memoria (el original no se toca). */
async function abrir(archivo: string): Promise<string | Buffer> {
  if (!/.hei[cf]$/i.test(archivo)) return archivo;
  const jpg = await heicConvert({ buffer: await fs.readFile(archivo), format: "JPEG", quality: 0.95 });
  return Buffer.from(jpg);
}

/** Quita el fondo y devuelve un PNG con transparencia. */
async function quitarFondo(archivo: string): Promise<Buffer> {
  // Enderezar según la orientación de la cámara y achicar un poco: el modelo va más rápido.
  const entrada = await sharp(await abrir(archivo)).rotate().resize(2000, 2000, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  if (conFondo) return sharp(entrada).ensureAlpha().png().toBuffer();
  const blob = await removeBackground(new Blob([new Uint8Array(entrada)], { type: "image/png" }), {
    publicPath: MODELO,
    model: "medium",
    output: { format: "image/png" },
  });
  return Buffer.from(await blob.arrayBuffer());
}

/** Limpia la transparencia (sin neblina en los bordes) y recorta justo a la tela. */
async function limpiarYRecortar(png: Buffer): Promise<sharp.Sharp> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  for (let i = 3; i < data.length; i += c) {
    const a = data[i];
    data[i] = a < 90 ? 0 : a > 215 ? 255 : a;
  }

  // Nos quedamos solo con la pieza más grande (la remera, con su percha si la tiene):
  // los restos sueltos (un gancho a medio borrar, una pelusa del fondo) se descartan.
  const pieza = new Int32Array(w * h).fill(-1);
  const tamanios: number[] = [];
  const pila: number[] = [];
  for (let p = 0; p < w * h; p++) {
    if (pieza[p] !== -1 || data[p * c + 3] === 0) continue;
    const id = tamanios.length;
    let n = 0;
    pieza[p] = id;
    pila.push(p);
    while (pila.length) {
      const q = pila.pop()!;
      n++;
      const qx = q % w, qy = (q - qx) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = qx + dx, ny = qy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const r = ny * w + nx;
        if (pieza[r] === -1 && data[r * c + 3] > 0) {
          pieza[r] = id;
          pila.push(r);
        }
      }
    }
    tamanios.push(n);
  }
  const mayor = tamanios.indexOf(Math.max(...tamanios));

  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (pieza[p] !== mayor) {
        data[p * c + 3] = 0;
        continue;
      }
      {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("no encontré la remera en la foto (¿quedó todo transparente?)");
  return sharp(data, { raw: { width: w, height: h, channels: c } }).extract({
    left: x0,
    top: y0,
    width: x1 - x0 + 1,
    height: y1 - y0 + 1,
  });
}

async function exportar(imagen: sharp.Sharp, destino: string, tamanio?: { width: number; height: number }) {
  const redimensionada = tamanio
    ? imagen.resize(tamanio.width, tamanio.height, { fit: "fill" })
    : imagen.resize(LADO_MAXIMO, LADO_MAXIMO, { fit: "inside", withoutEnlargement: true });
  const info = await redimensionada.webp({ quality: 84, alphaQuality: 90, effort: 5 }).toFile(destino);
  return { width: info.width, height: info.height, kb: Math.round(info.size / 1024) };
}

async function main() {
  await fs.mkdir(CRUDAS, { recursive: true });
  const carpetas = (await fs.readdir(CRUDAS, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  if (carpetas.length === 0) {
    console.log(`No hay carpetas en fotos-crudas/. Creá una por remera, ej: ${amarillo("fotos-crudas/remera-negra-ac-dc/frente.jpg")}`);
    return;
  }

  const datos: PrendaEntrada[] = JSON.parse(await fs.readFile(DATOS, "utf8"));
  const hoy = new Date().toISOString().slice(0, 10);
  let procesadas = 0, salteadas = 0, errores = 0;

  for (const carpeta of carpetas) {
    const id = aId(carpeta);
    if (soloIds.length && !soloIds.includes(id) && !soloIds.includes(carpeta)) continue;
    const dirCruda = path.join(CRUDAS, carpeta);

    let frente = await buscarFoto(dirCruda, ["frente", "front", "adelante"]);
    const espalda = await buscarFoto(dirCruda, ["espalda", "dorso", "back", "atras"]);
    if (!frente) {
      // Si hay una sola foto, la tomamos como frente.
      const fotos = (await fs.readdir(dirCruda)).filter((a) => EXTENSIONES.includes(path.extname(a).toLowerCase()));
      if (fotos.length === 1) frente = path.join(dirCruda, fotos[0]);
    }
    if (!frente) {
      console.log(rojo(`✗ ${carpeta}: `) + "no encontré la foto de frente (llamala frente.jpg; también vale .heic/.png/.webp).");
      errores++;
      continue;
    }

    const dirSalida = path.join(SALIDA, id);
    const salidaFrente = path.join(dirSalida, "frente.webp");
    const salidaEspalda = path.join(dirSalida, "espalda.webp");
    const cambio =
      (await fechaModificacion(frente)) > (await fechaModificacion(salidaFrente)) ||
      (espalda !== null && (await fechaModificacion(espalda)) > (await fechaModificacion(salidaEspalda)));
    const existente = datos.find((p) => p.id === id);
    if (!todo && !soloIds.length && !cambio && existente) {
      salteadas++;
      continue;
    }

    try {
      process.stdout.write(`${carpeta}${carpeta !== id ? gris(` → ${id}`) : ""}: quitando fondo… `);
      await fs.mkdir(dirSalida, { recursive: true });
      const inicio = Date.now();
      const f = await exportar(await limpiarYRecortar(await quitarFondo(frente)), salidaFrente);
      let textoEspalda = gris("sin espalda");
      if (espalda) {
        // La espalda se lleva al mismo tamaño que el frente para que los bordes coincidan en 3D.
        const e = await exportar(await limpiarYRecortar(await quitarFondo(espalda)), salidaEspalda, f);
        textoEspalda = `espalda ${e.kb} KB`;
      } else {
        await fs.rm(salidaEspalda, { force: true });
      }
      const colores = await coloresDominantes(salidaFrente);

      const fotos = {
        frente: `/prendas/${id}/frente.webp`,
        espalda: espalda ? `/prendas/${id}/espalda.webp` : null,
      };
      if (existente) {
        // Solo actualizamos lo que sale de las fotos; lo que escribiste a mano queda igual.
        existente.fotos = fotos;
        existente.colores = colores;
      } else {
        datos.push({
          id,
          nombre: aNombre(id),
          categoria: "remera",
          fotos,
          colores,
          marca: null,
          banda_o_tema: null,
          anio: null,
          anecdota: null,
          tags: [],
          agregada: hoy,
        });
      }
      console.log(
        verde("✓ ") + `frente ${f.width}×${f.height} ${f.kb} KB · ${textoEspalda} · colores ${colores.join(" ")} ` +
          gris(`(${((Date.now() - inicio) / 1000).toFixed(1)} s)`),
      );
      procesadas++;
    } catch (err) {
      console.log(rojo("✗ ") + (err instanceof Error ? err.message : String(err)));
      errores++;
    }
  }

  // Validamos antes de guardar, así nunca queda un JSON roto.
  const valido = ListaPrendasSchema.safeParse(datos);
  if (!valido.success) {
    console.log(rojo("\nEl archivo de datos quedó con errores; no lo guardo:"), valido.error.issues);
    process.exit(1);
  }
  await fs.writeFile(DATOS, JSON.stringify(datos, null, 2) + "\n");

  console.log(
    `\n${verde(`${procesadas} procesada(s)`)}` +
      (salteadas ? gris(` · ${salteadas} sin cambios`) : "") +
      (errores ? rojo(` · ${errores} con error`) : ""),
  );
  if (procesadas) {
    console.log(`Ahora completá nombre, año, marca, tags… en ${amarillo("data/prendas.json")} y mirala con ${amarillo("npm run dev")}.`);
  }
}

main().catch((err) => {
  console.error(rojo(String(err?.stack ?? err)));
  process.exit(1);
});
