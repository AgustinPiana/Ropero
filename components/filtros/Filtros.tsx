"use client";

import type { FamiliaColor } from "@/lib/colores";
import { opcionesDeFiltro } from "@/lib/filtros";
import type { Prenda } from "@/lib/schema";
import { navegacion, useEstado } from "@/components/perchero/estado";

/** Color de muestra para cada familia (solo para pintar el botoncito). */
const MUESTRA: Record<FamiliaColor, string> = {
  negro: "#141414", blanco: "#f2efe8", gris: "#8a8a8a", beige: "#d8c7a4", marron: "#6b4a2f",
  rojo: "#b3261e", naranja: "#e07a2e", amarillo: "#e2c044", verde: "#5f7a3a", azul: "#2f5a9e",
  violeta: "#6f4a9e", rosa: "#e59bb4",
};

const chip =
  "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors whitespace-nowrap";
const chipOn = "border-laton bg-laton text-fondo";
const chipOff = "border-borde bg-fondo/60 text-texto-suave hover:border-texto-suave hover:text-texto";

/** Filtros por etiqueta y por color. Al cambiar un filtro se cierra la ficha abierta. */
export function Filtros({ prendas, abierta }: { prendas: Prenda[]; abierta: boolean }) {
  const { tags, colores } = opcionesDeFiltro(prendas);
  const { filtroTag, filtroColor, setFiltroTag, setFiltroColor } = useEstado();

  const cambiar = (fn: () => void) => {
    fn();
    if (abierta) navegacion.cerrar();
  };

  if (tags.length === 0 && colores.length < 2) return null;

  return (
    <div
      role="group"
      aria-label="Filtros"
      className="flex max-w-full items-center gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:justify-center"
    >
      <button
        type="button"
        aria-pressed={!filtroTag && !filtroColor}
        onClick={() => cambiar(() => { setFiltroTag(null); setFiltroColor(null); })}
        className={`${chip} ${!filtroTag && !filtroColor ? chipOn : chipOff}`}
      >
        Todas
      </button>
      {tags.map(([t, n]) => (
        <button
          key={t}
          type="button"
          aria-pressed={filtroTag === t}
          onClick={() => cambiar(() => setFiltroTag(filtroTag === t ? null : t))}
          className={`${chip} ${filtroTag === t ? chipOn : chipOff}`}
        >
          {t} <span className="opacity-60">{n}</span>
        </button>
      ))}
      {colores.length > 1 && (
        <>
          <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-borde" />
          {colores.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={filtroColor === c}
              aria-label={`Color ${c}`}
              title={c}
              onClick={() => cambiar(() => setFiltroColor(filtroColor === c ? null : c))}
              className={`size-7 shrink-0 rounded-full border-2 transition-transform hover:scale-110 ${
                filtroColor === c ? "scale-110 border-laton" : "border-transparent"
              }`}
            >
              <span
                className="block size-full rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: MUESTRA[c] }}
              />
            </button>
          ))}
        </>
      )}
    </div>
  );
}
