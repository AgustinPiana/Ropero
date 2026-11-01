/**
 * Utilidades de color. Hoy las usan los filtros; en la Fase 2
 * las va a usar el combinador de outfits.
 */

export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number };

export function hexARgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbAHex({ r, g, b }: RGB): string {
  const h = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function rgbAHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

/** Familias de color legibles para filtrar ("negro", "azul"...). */
export const FAMILIAS = [
  "negro", "blanco", "gris", "beige", "marron", "rojo", "naranja",
  "amarillo", "verde", "azul", "violeta", "rosa",
] as const;
export type FamiliaColor = (typeof FAMILIAS)[number];

export function familiaDe(hex: string): FamiliaColor {
  const { h, s, l } = rgbAHsl(hexARgb(hex));
  if (l < 0.13) return "negro";
  if (l > 0.9 && s < 0.35) return "blanco";
  if (s < 0.12) return l > 0.75 ? "blanco" : "gris";
  if (h >= 20 && h < 50 && s < 0.45 && l > 0.55) return "beige";
  if (h >= 10 && h < 45 && l < 0.45) return "marron";
  if (h < 12 || h >= 345) return l > 0.7 ? "rosa" : "rojo";
  if (h < 40) return "naranja";
  if (h < 65) return "amarillo";
  if (h < 170) return "verde";
  if (h < 255) return "azul";
  if (h < 300) return "violeta";
  return "rosa";
}

/** Luminancia relativa (0 = negro, 1 = blanco), para decidir contraste. */
export function luminancia(hex: string): number {
  const { r, g, b } = hexARgb(hex);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
