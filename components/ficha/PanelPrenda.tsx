"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { mostrarLado, navegacion, useEstado } from "@/components/perchero/estado";
import type { Prenda } from "@/lib/schema";
import { soportaWebGL } from "@/lib/webgl";
import { FichaPrenda } from "./FichaPrenda";

const sinSuscripcion = () => () => {};

/**
 * Tarjeta flotante con la ficha de la remera abierta. A la derecha en
 * pantallas anchas, abajo en el celular. Se cierra con la X, Esc o clic afuera.
 */
export function PanelPrenda({ prenda }: { prenda: Prenda }) {
  const router = useRouter();
  const webgl = useSyncExternalStore(sinSuscripcion, soportaWebGL, () => null);
  const vistaEspalda = useEstado((s) => s.vistaEspalda);
  const { anterior, siguiente } = useEstado((s) => s.vecinas);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    // El foco va al panel al abrir y vuelve a donde estaba al cerrar.
    const antes = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/", { scroll: false });
    };
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("keydown", tecla);
      if (antes && document.contains(antes)) antes.focus({ preventScroll: true });
    };
  }, [router, prenda.id]);

  const fotos = [
    { src: prenda.fotos.frente, alt: `${prenda.nombre}, vista de frente` },
    ...(prenda.fotos.espalda ? [{ src: prenda.fotos.espalda, alt: `${prenda.nombre}, vista de espalda` }] : []),
  ];

  return (
    <aside
      ref={panel}
      role="dialog"
      tabIndex={-1}
      aria-labelledby="titulo-prenda"
      className="panel-prenda fixed inset-x-3 bottom-3 z-30 flex max-h-[44dvh] flex-col overflow-y-auto rounded-3xl border border-borde bg-superficie/88 px-6 pt-4 pb-6 shadow-[0_20px_70px_rgba(0,0,0,0.6)] outline-none backdrop-blur-xl sm:top-28 sm:right-6 sm:bottom-auto sm:left-auto sm:max-h-[calc(100dvh-9rem)] sm:w-[400px] sm:max-w-[45vw] sm:px-8 sm:pt-8 sm:pb-7"
    >
      {/* manija del bottom sheet en celular */}
      <div aria-hidden className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-borde sm:hidden" />
      <button
        type="button"
        onClick={() => router.push("/", { scroll: false })}
        aria-label="Cerrar ficha"
        className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full text-texto-suave transition-colors hover:bg-superficie-2 hover:text-texto sm:top-5 sm:right-5"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* Sin 3D: mostramos las fotos acá */}
      {webgl === false && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          {fotos.map((f) => (
            <div key={f.src} className="relative aspect-[8/9]">
              <Image src={f.src} alt={f.alt} fill sizes="200px" className="object-contain" />
            </div>
          ))}
        </div>
      )}

      {/* el padding deja lugar a la X para que no se pise con el año */}
      <div className="[&_header]:pr-12 sm:[&_header]:pr-6">
        <FichaPrenda prenda={prenda} idTitulo="titulo-prenda" />
      </div>

      {webgl && (
        <div className="mt-7 flex items-center gap-3 border-t border-borde pt-5">
          <button
            type="button"
            onClick={() => mostrarLado(!vistaEspalda)}
            className="shrink-0 whitespace-nowrap rounded-full bg-laton px-5 py-2.5 text-sm font-medium text-fondo transition-opacity hover:opacity-90"
          >
            {vistaEspalda ? "Ver frente" : prenda.fotos.espalda ? "Ver espalda" : "Girar"}
          </button>
          <div className="ml-auto flex gap-2">
            {[
              { p: anterior, etiqueta: "Remera anterior", d: "M15 5l-7 7 7 7" },
              { p: siguiente, etiqueta: "Remera siguiente", d: "M9 5l7 7-7 7" },
            ].map(({ p, etiqueta, d }) => (
              <button
                key={etiqueta}
                type="button"
                aria-label={p ? `${etiqueta}: ${p.nombre}` : etiqueta}
                disabled={!p}
                onClick={() => p && navegacion.abrir(p)}
                className="flex size-10 items-center justify-center rounded-full border border-borde text-texto-suave transition-colors hover:border-laton hover:text-laton disabled:opacity-30 disabled:hover:border-borde disabled:hover:text-texto-suave"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d={d} />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
      {webgl && (
        <p className="mt-3 hidden text-[11px] text-texto-suave sm:block">
          Arrastrá la remera para girarla · <kbd className="font-sans">←</kbd> <kbd className="font-sans">→</kbd> para pasar · Esc para cerrar
        </p>
      )}
    </aside>
  );
}
