import { familiaDe, FAMILIAS, type FamiliaColor } from "./colores";
import type { Prenda } from "./schema";

export type Filtros = { tag: string | null; color: FamiliaColor | null };

/** Familia de color de una prenda: la de su color dominante. */
export const familiaDePrenda = (p: Prenda): FamiliaColor | null =>
  p.colores[0] ? familiaDe(p.colores[0]) : null;

export function filtrarPrendas(prendas: Prenda[], { tag, color }: Filtros): Prenda[] {
  return prendas.filter(
    (p) => (!tag || p.tags.includes(tag)) && (!color || familiaDePrenda(p) === color),
  );
}

/** Opciones disponibles para filtrar, con cuántas prendas tiene cada una. */
export function opcionesDeFiltro(prendas: Prenda[]) {
  const tags = new Map<string, number>();
  const colores = new Map<FamiliaColor, number>();
  for (const p of prendas) {
    for (const t of p.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
    const f = familiaDePrenda(p);
    if (f) colores.set(f, (colores.get(f) ?? 0) + 1);
  }
  return {
    tags: [...tags.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    colores: FAMILIAS.filter((f) => colores.has(f)),
  };
}
