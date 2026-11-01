/**
 * Genera 3 remeras de ejemplo (imágenes con fondo transparente, como
 * las que va a dejar `npm run procesar`) para probar la web sin fotos reales.
 * Uso: npm run ejemplos
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { coloresDominantes } from "./lib/colores-dominantes";
import type { PrendaEntrada } from "../lib/schema";

const RAIZ = path.resolve(__dirname, "..");
const ANCHO = 800;
const ALTO = 900;

// Silueta de remera estirada. El cuello de atrás es más alto que el de adelante.
const silueta = (cuello: number) =>
  `M300 42 Q400 ${cuello} 500 42 L652 88 L786 238 L690 332 L626 282 L636 866 Q400 884 164 866 L174 282 L110 332 L14 238 L148 88 Z`;

type Ejemplo = {
  id: string;
  nombre: string;
  base: string;
  frente: string;
  espalda?: string;
  datos: Partial<PrendaEntrada>;
};

function remera(base: string, cuello: number, estampa: string, oscura: boolean): string {
  const s = silueta(cuello);
  const sombra = oscura ? 0.5 : 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}">
  <defs>
    <clipPath id="c"><path d="${s}"/></clipPath>
    <linearGradient id="lados" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity="${sombra}"/>
      <stop offset="0.22" stop-color="#000" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="${oscura ? 0.05 : 0.08}"/>
      <stop offset="0.78" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="${sombra}"/>
    </linearGradient>
    <linearGradient id="alto" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="${oscura ? 0.06 : 0.1}"/>
      <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="${sombra * 0.6}"/>
    </linearGradient>
    <filter id="tela" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.10"/></feComponentTransfer>
    </filter>
    <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <g clip-path="url(#c)">
    <rect width="${ANCHO}" height="${ALTO}" fill="${base}"/>
    ${estampa}
    <g filter="url(#blur)" fill="none" stroke="#000" stroke-opacity="${sombra * 0.55}" stroke-width="22">
      <path d="M250 420 Q300 600 270 860"/>
      <path d="M560 360 Q520 560 545 860"/>
      <path d="M180 300 Q160 250 120 300"/>
      <path d="M620 300 Q640 250 680 300"/>
    </g>
    <rect width="${ANCHO}" height="${ALTO}" fill="url(#lados)"/>
    <rect width="${ANCHO}" height="${ALTO}" fill="url(#alto)"/>
    <rect width="${ANCHO}" height="${ALTO}" filter="url(#tela)"/>
    <path d="M300 42 Q400 ${cuello} 500 42" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="16"/>
  </g>
</svg>`;
}

const EJEMPLOS: Ejemplo[] = [
  {
    id: "ejemplo-eclipse-gira-97",
    nombre: "Eclipse — Gira 97",
    base: "#17171b",
    frente: `
      <circle cx="400" cy="400" r="128" fill="none" stroke="#d9a441" stroke-width="10"/>
      <circle cx="430" cy="388" r="118" fill="#17171b"/>
      <circle cx="400" cy="400" r="150" fill="none" stroke="#d9a441" stroke-opacity="0.35" stroke-width="2"/>
      <text x="400" y="610" text-anchor="middle" font-family="Georgia, serif" font-size="78" letter-spacing="14" fill="#efe6d2">ECLIPSE</text>
      <text x="400" y="664" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" letter-spacing="12" fill="#d9a441">GIRA · 1997</text>`,
    espalda: `
      <text x="400" y="250" text-anchor="middle" font-family="Georgia, serif" font-size="44" letter-spacing="10" fill="#d9a441">GIRA 97</text>
      ${["ROSARIO 12.03", "CÓRDOBA 15.03", "MENDOZA 19.03", "LA PLATA 22.03", "BUENOS AIRES 28.03", "MONTEVIDEO 02.04"]
        .map((t, i) => `<text x="400" y="${330 + i * 56}" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" letter-spacing="6" fill="#efe6d2">${t}</text>`)
        .join("")}`,
    datos: {
      banda_o_tema: "Eclipse (banda inventada)",
      anio: 1997,
      marca: "Sin marca",
      anecdota: "Remera de ejemplo para probar el perchero. Borrala cuando cargues las tuyas.",
      tags: ["ejemplo", "banda", "vintage"],
    },
  },
  {
    id: "ejemplo-lunes-crema",
    nombre: "Lunes",
    base: "#ebe4d6",
    frente: `
      <text x="505" y="250" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="40" fill="#2a2620">lunes.</text>`,
    datos: {
      marca: "Básica",
      anecdota: "Ejemplo sin foto de espalda: atrás se usa el color dominante.",
      tags: ["ejemplo", "basica", "diaria"],
    },
  },
  {
    id: "ejemplo-altura-oliva",
    nombre: "Altura 4810",
    base: "#596140",
    frente: `
      <g fill="none" stroke="#efe6d2" stroke-width="7" stroke-linejoin="round">
        <path d="M250 520 L340 400 L385 450 L455 340 L555 520"/>
        <path d="M430 378 L455 340 L480 380 L466 372 L455 390 L444 372 Z" fill="#efe6d2"/>
      </g>
      <line x1="230" y1="540" x2="570" y2="540" stroke="#c7653a" stroke-width="7"/>
      <text x="400" y="610" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="46" letter-spacing="18" fill="#efe6d2">ALTURA</text>`,
    espalda: `
      <text x="400" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" letter-spacing="10" fill="#efe6d2">4810 m s. n. m.</text>
      <line x1="320" y1="226" x2="480" y2="226" stroke="#c7653a" stroke-width="5"/>`,
    datos: {
      marca: "Club de montaña",
      anio: 2021,
      tags: ["ejemplo", "montaña", "outdoor"],
    },
  },
];

async function exportar(svg: string, destino: string) {
  await sharp(Buffer.from(svg))
    .resize({ height: 1024 })
    .webp({ quality: 84, alphaQuality: 90, effort: 6 })
    .toFile(destino);
}

async function main() {
  const archivoDatos = path.join(RAIZ, "data", "prendas.json");
  const actuales: PrendaEntrada[] = JSON.parse(await fs.readFile(archivoDatos, "utf8").catch(() => "[]"));
  const hoy = new Date().toISOString().slice(0, 10);

  for (const e of EJEMPLOS) {
    const carpeta = path.join(RAIZ, "public", "prendas", e.id);
    await fs.mkdir(carpeta, { recursive: true });
    const oscura = e.base === "#17171b";
    const svgFrente = remera(e.base, 132, e.frente, oscura);
    await exportar(svgFrente, path.join(carpeta, "frente.webp"));
    if (e.espalda) await exportar(remera(e.base, 74, e.espalda, oscura), path.join(carpeta, "espalda.webp"));

    const entrada: PrendaEntrada = {
      id: e.id,
      nombre: e.nombre,
      categoria: "remera",
      fotos: {
        frente: `/prendas/${e.id}/frente.webp`,
        espalda: e.espalda ? `/prendas/${e.id}/espalda.webp` : null,
      },
      colores: await coloresDominantes(path.join(carpeta, "frente.webp")),
      marca: null,
      banda_o_tema: null,
      anio: null,
      anecdota: null,
      tags: [],
      agregada: hoy,
      ...e.datos,
    };
    const i = actuales.findIndex((p) => p.id === e.id);
    if (i >= 0) actuales[i] = entrada;
    else actuales.push(entrada);
    console.log(`✓ ${e.id}  ${entrada.colores?.join(" ")}`);
  }

  await fs.writeFile(archivoDatos, JSON.stringify(actuales, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
