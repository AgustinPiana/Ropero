/**
 * Revisa data/prendas.json antes de cada build (también en Vercel):
 * que cumpla el modelo de datos y que existan todas las fotos.
 * Uso: npm run validar
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ListaPrendasSchema } from "../lib/schema";

const RAIZ = path.resolve(__dirname, "..");
const datos = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "prendas.json"), "utf8"));
const resultado = ListaPrendasSchema.safeParse(datos);

if (!resultado.success) {
  console.error(`\n✗ data/prendas.json tiene errores:\n${z.prettifyError(resultado.error)}\n`);
  process.exit(1);
}

const faltantes: string[] = [];
for (const p of resultado.data) {
  for (const foto of [p.fotos.frente, p.fotos.espalda]) {
    if (foto && !fs.existsSync(path.join(RAIZ, "public", foto))) faltantes.push(`${p.id}: no existe public${foto}`);
  }
}
if (faltantes.length) {
  console.error(`\n✗ Faltan fotos:\n  ${faltantes.join("\n  ")}\n(¿corriste npm run procesar?)\n`);
  process.exit(1);
}

console.log(`✓ ${resultado.data.length} prendas OK`);
