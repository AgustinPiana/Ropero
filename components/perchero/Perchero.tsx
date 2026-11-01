"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { GrillaPrendas } from "@/components/fallback/GrillaPrendas";
import { Filtros } from "@/components/filtros/Filtros";
import { filtrarPrendas } from "@/lib/filtros";
import { urlPrenda } from "@/lib/rutas";
import type { Prenda } from "@/lib/schema";
import { soportaWebGL } from "@/lib/webgl";
import { Cargando } from "./Cargando";
import { Escena } from "./Escena";
import { moverRiel, navegacion, riel, useEstado } from "./estado";
import { UMBRAL_CLIC } from "./Prenda3D";

const sinSuscripcion = () => () => {};

/**
 * El perchero. Vive en el layout, así que no se desmonta al abrir una
 * remera: la URL cambia a /remera/<id> y el 3D reacciona.
 * Si el dispositivo no soporta WebGL, muestra la grilla 2D.
 */
export function Perchero({ prendas }: { prendas: Prenda[] }) {
  const webgl = useSyncExternalStore(sinSuscripcion, soportaWebGL, () => null);
  const router = useRouter();
  const pathname = usePathname();
  // Resolución: arranca nítida y baja sola si el dispositivo no llega a los cuadros por segundo.
  const [dpr, setDpr] = useState(1.75);
  const filtroTag = useEstado((s) => s.filtroTag);
  const filtroColor = useEstado((s) => s.filtroColor);

  const visibles = useMemo(
    () => filtrarPrendas(prendas, { tag: filtroTag, color: filtroColor }),
    [prendas, filtroTag, filtroColor],
  );
  const idEnUrl = pathname.split("/")[2];
  const abierta = prendas.find((p) => p.id === idEnUrl) ?? null;

  // Anterior / siguiente de la abierta, para los botones de la ficha.
  useEffect(() => {
    const i = abierta ? visibles.findIndex((p) => p.id === abierta.id) : -1;
    useEstado.setState({
      vecinas: { anterior: i > 0 ? visibles[i - 1] : null, siguiente: i >= 0 ? (visibles[i + 1] ?? null) : null },
    });
  }, [abierta, visibles]);

  // Conecta "abrir/cerrar ficha" con el router de Next.
  useEffect(() => {
    navegacion.abrir = (p) => router.push(urlPrenda(p), { scroll: false });
    navegacion.cerrar = () => router.push("/", { scroll: false });
  }, [router]);

  const filtrado = filtroTag !== null || filtroColor !== null;
  const encabezado = (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-1 px-5 pt-5 text-center sm:pt-7">
      <Link href="/" scroll={false} className="pointer-events-auto font-display text-3xl tracking-tight sm:text-5xl">
        <h1>Mi ropero</h1>
      </Link>
      <p className="text-[11px] tracking-[0.3em] text-laton uppercase" aria-live="polite">
        Remeras · {filtrado ? `${visibles.length} de ${prendas.length}` : prendas.length}
      </p>
    </header>
  );

  if (webgl === null) return <div className="absolute inset-0 bg-fondo" />;

  if (!webgl) {
    return (
      <div className="absolute inset-0 overflow-y-auto">
        {encabezado}
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-28 pb-10 sm:px-8">
          <Filtros prendas={prendas} abierta={abierta !== null} />
          <GrillaPrendas prendas={visibles} />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 select-none">
      <Canvas
        shadows="percentage"
        dpr={dpr}
        camera={{ position: [0, 0.22, 6], fov: 32 }}
        onCreated={({ gl }) => {
          // Neutral: respeta los colores reales de la ropa (otros "estilizan" la imagen).
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
        // Clic en el vacío (no en una remera) con una abierta: cerrar.
        onPointerMissed={() => {
          if (abierta && riel.arrastre <= UMBRAL_CLIC) navegacion.cerrar();
        }}
        style={{ touchAction: "none", cursor: abierta ? "grab" : undefined }}
        aria-hidden
      >
        <PerformanceMonitor
          onDecline={() => setDpr((d) => Math.max(1, d - 0.5))}
          onIncline={() => setDpr((d) => Math.min(2, d + 0.25))}
          flipflops={3}
          onFallback={() => setDpr(1)}
        />
        <Escena prendas={prendas} visibles={visibles} abierta={abierta} />
      </Canvas>

      {/* Degradé arriba para que el título se lea sobre la madera */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-fondo/90 to-transparent" />
      {/* Viñeta: oscurece los bordes y lleva la mirada al centro */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_45%,rgba(8,6,4,0.75)_100%)]"
      />
      {encabezado}
      <Interfaz prendas={prendas} visibles={visibles} abierta={abierta} />
      <Cargando />

      {/* Lista accesible: lectores de pantalla y teclado (Tab) llegan a cada remera. */}
      <nav aria-label="Remeras" className="sr-only">
        <ul>
          {visibles.map((p) => (
            <li key={p.id}>
              <Link href={urlPrenda(p)} scroll={false}>
                {p.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Lo que va encima del 3D: nombre de la remera del centro, flechas, ayuda y filtros. */
function Interfaz({ prendas, visibles, abierta }: { prendas: Prenda[]; visibles: Prenda[]; abierta: Prenda | null }) {
  const centrada = useEstado((s) => visibles.find((p) => p.id === s.centrada) ?? null);
  const interactuo = useEstado((s) => s.interactuo);
  const flecha =
    "pointer-events-auto hidden size-12 items-center justify-center rounded-full border border-borde bg-fondo/50 text-texto-suave backdrop-blur transition-colors hover:border-laton hover:text-laton disabled:opacity-0 sm:flex";

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 flex flex-col justify-end transition-opacity duration-500 ${
        abierta ? "opacity-0 [&_*]:!pointer-events-none" : "opacity-100"
      }`}
      aria-hidden={abierta !== null}
    >
      {/* Flechas a los costados */}
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-4 sm:px-8">
        <button type="button" aria-label="Remera anterior" className={flecha} onClick={() => moverRiel(-1)}
          disabled={visibles[0]?.id === centrada?.id}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button type="button" aria-label="Remera siguiente" className={flecha} onClick={() => moverRiel(1)}
          disabled={visibles.at(-1)?.id === centrada?.id}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="flex flex-col items-center gap-4 pb-6 sm:pb-8">
        {visibles.length === 0 ? (
          <p className="font-display text-lg italic text-texto-suave">No hay remeras con ese filtro.</p>
        ) : (
          centrada && (
            <div className="flex flex-col items-center gap-1 text-center" aria-live="polite">
              <p className="font-display text-xl sm:text-2xl">{centrada.nombre}</p>
              <p className="text-xs tracking-[0.2em] text-texto-suave uppercase">
                {[centrada.anio, centrada.banda_o_tema ?? centrada.marca].filter(Boolean).join(" · ") || " "}
              </p>
            </div>
          )
        )}
        <div className="pointer-events-auto max-w-full">
          <Filtros prendas={prendas} abierta={abierta !== null} />
        </div>
      </div>
      <p
        className={`absolute right-5 bottom-3 hidden text-[10px] tracking-[0.25em] text-texto-suave uppercase transition-opacity duration-700 sm:block sm:right-10 sm:bottom-6 ${interactuo ? "opacity-40" : "opacity-90"}`}
      >
        Arrastrá la barra · clic para ver
      </p>
      <p
        className={`absolute inset-x-0 top-24 text-center text-xs text-texto-suave transition-opacity duration-700 sm:hidden ${interactuo ? "opacity-0" : "opacity-80"}`}
      >
        Deslizá para recorrer · tocá para ver
      </p>
    </div>
  );
}
