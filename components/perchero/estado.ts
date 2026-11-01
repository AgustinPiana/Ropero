import { create } from "zustand";
import type { FamiliaColor } from "@/lib/colores";
import type { Prenda } from "@/lib/schema";

/**
 * Estado compartido entre el 3D y la interfaz HTML.
 *
 * Hay dos tipos:
 * - `useEstado`: cosas que la interfaz muestra (filtros, remera centrada...).
 *   Cuando cambian, React redibuja.
 * - `riel`: números que cambian 60 veces por segundo (posición de la barra,
 *   giro). Se leen en cada cuadro del 3D sin redibujar React.
 */

type Estado = {
  filtroTag: string | null;
  filtroColor: FamiliaColor | null;
  setFiltroTag: (t: string | null) => void;
  setFiltroColor: (c: FamiliaColor | null) => void;
  /** id de la remera que está en el centro del perchero. */
  centrada: string | null;
  setCentrada: (id: string | null) => void;
  hover: string | null;
  setHover: (id: string | null) => void;
  /** ¿La remera abierta está mostrando la espalda? */
  vistaEspalda: boolean;
  setVistaEspalda: (v: boolean) => void;
  /** Ya arrastró / scrolleó alguna vez: oculta la ayuda. */
  interactuo: boolean;
  marcarInteraccion: () => void;
  /** Anterior y siguiente de la remera abierta (para los botones de la ficha). */
  vecinas: { anterior: Prenda | null; siguiente: Prenda | null };
};

export const useEstado = create<Estado>()((set) => ({
  filtroTag: null,
  filtroColor: null,
  setFiltroTag: (filtroTag) => set({ filtroTag }),
  setFiltroColor: (filtroColor) => set({ filtroColor }),
  centrada: null,
  setCentrada: (centrada) => set({ centrada }),
  hover: null,
  setHover: (hover) => set({ hover }),
  vistaEspalda: false,
  setVistaEspalda: (vistaEspalda) => set({ vistaEspalda }),
  interactuo: false,
  marcarInteraccion: () => set({ interactuo: true }),
  vecinas: { anterior: null, siguiente: null },
}));

export const riel = {
  /** Desplazamiento actual de la barra (en metros de la escena). */
  actual: 0,
  /** Hacia dónde va (la barra lo persigue suavemente: eso es la inercia). */
  objetivo: 0,
  /** Velocidad actual: las remeras se balancean en contra. */
  velocidad: 0,
  /** Posiciones de la barra que centran cada remera visible. */
  paradas: [] as number[],
  /** Cuánto se movió el puntero desde que se apretó (para distinguir clic de arrastre). */
  arrastre: 0,
  /** Giro de la remera abierta (radianes). */
  giro: 0,
  giroObjetivo: 0,
};

/** Índice de la parada más cercana a una posición de barra. */
export function paradaMasCercana(x: number): number {
  let mejor = 0;
  riel.paradas.forEach((p, i) => {
    if (Math.abs(p - x) < Math.abs(riel.paradas[mejor] - x)) mejor = i;
  });
  return mejor;
}

/** Mueve la barra n remeras (negativo = hacia la izquierda). */
export function moverRiel(n: number) {
  if (riel.paradas.length === 0) return;
  const i = paradaMasCercana(riel.objetivo);
  const j = Math.min(riel.paradas.length - 1, Math.max(0, i + n));
  riel.objetivo = riel.paradas[j];
  useEstado.getState().marcarInteraccion();
}

/** Gira la remera abierta para mostrar frente o espalda (por el camino corto). */
export function mostrarLado(espalda: boolean) {
  const vuelta = Math.PI * 2;
  const base = espalda ? Math.PI : 0;
  riel.giroObjetivo = base + Math.round((riel.giro - base) / vuelta) * vuelta;
}

/** Navegación (abrir/cerrar ficha). La conecta el Perchero con el router de Next. */
export const navegacion: { abrir: (p: Prenda) => void; cerrar: () => void } = {
  abrir: () => {},
  cerrar: () => {},
};
