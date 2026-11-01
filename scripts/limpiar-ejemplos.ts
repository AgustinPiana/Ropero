/**
 * Borra las remeras de ejemplo (ids que empiezan con "ejemplo-"):
 * sus entradas en data/prendas.json y sus fotos en public/prendas/.
 * Uso: npm run limpiar-ejemplos
 */
import fs from "node:fs";
import path from "node:path";
import type { PrendaEntrada } from "../lib/schema";

const RAIZ = path.resolve(__dirname, "..");
const archivo = path.join(RAIZ, "data", "prendas.json");
const datos: PrendaEntrada[] = JSON.parse(fs.readFileSync(archivo, "utf8"));
const ejemplos = datos.filter((p) => p.id.startsWith("ejemplo-"));

for (const p of ejemplos) {
  fs.rmSync(path.join(RAIZ, "public", "prendas", p.id), { recursive: true, force: true });
}
fs.writeFileSync(archivo, JSON.stringify(datos.filter((p) => !p.id.startsWith("ejemplo-")), null, 2) + "\n");
console.log(`✓ Borré ${ejemplos.length} remera(s) de ejemplo. Quedan ${datos.length - ejemplos.length}.`);
