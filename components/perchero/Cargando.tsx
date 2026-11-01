"use client";

import { useProgress } from "@react-three/drei";
import { useState } from "react";

/** Pantalla de carga mientras se bajan las fotos: una barra de latón que se llena. */
export function Cargando() {
  const { active, progress } = useProgress();
  // Una vez que cargó lo inicial, las fotos que bajan después (al recorrer) no vuelven a tapar todo.
  const [yaCargo, setYaCargo] = useState(false);
  if (!yaCargo && !active && progress === 100) setYaCargo(true);
  const listo = yaCargo;

  return (
    <div
      aria-hidden={listo}
      className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-fondo transition-opacity duration-700 ${
        listo ? "opacity-0" : "opacity-100"
      }`}
    >
      <p className="font-display text-lg italic text-texto-suave" role="status">
        Colgando la ropa…
      </p>
      <div className="h-px w-40 overflow-hidden bg-borde">
        <div
          className="h-full bg-laton transition-[width] duration-300"
          style={{ width: `${Math.max(4, progress)}%` }}
        />
      </div>
    </div>
  );
}
