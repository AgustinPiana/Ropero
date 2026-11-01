"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { Prenda } from "@/lib/schema";
import { SEPARACION } from "./constantes";
import { moverRiel, navegacion, paradaMasCercana, riel, useEstado } from "./estado";

const { damp, clamp } = THREE.MathUtils;

type Props = {
  /** Remeras visibles (ya filtradas), en orden sobre la barra. */
  visibles: Prenda[];
  /** Posición X de cada visible sobre la barra. */
  posiciones: number[];
  abierta: Prenda | null;
  children: ReactNode;
};

/**
 * La barra que se arrastra. Maneja mouse, touch, rueda y teclado, y mueve
 * todo lo que tiene adentro (barra + remeras).
 *
 * Cómo funciona la inercia: el arrastre no mueve la barra directamente,
 * mueve un "objetivo". En cada cuadro la barra se acerca un poco al
 * objetivo (como un resorte amortiguado). Al soltar, el objetivo se
 * proyecta según la velocidad del gesto y se "imanta" a la remera más cercana.
 */
export function Riel({ visibles, posiciones, abierta, children }: Props) {
  const grupo = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);

  // Para saber "¿hay una abierta?" desde los listeners sin volver a engancharlos.
  const hayAbierta = useRef(false);
  useEffect(() => {
    hayAbierta.current = abierta !== null;
  }, [abierta]);

  // Paradas: la barra se corre al revés de la remera para centrarla.
  useEffect(() => {
    riel.paradas = posiciones.map((x) => -x);
    if (riel.paradas.length) riel.objetivo = riel.paradas[paradaMasCercana(riel.objetivo)];
  }, [posiciones]);

  // Al abrir una remera: centrarla y mostrarla de frente.
  const idAbierta = abierta?.id ?? null;
  useEffect(() => {
    if (!idAbierta) return;
    const i = visibles.findIndex((p) => p.id === idAbierta);
    if (i >= 0) riel.objetivo = riel.paradas[i] ?? riel.objetivo;
    riel.giro = 0;
    riel.giroObjetivo = 0;
  }, [idAbierta, visibles]);

  // ---------- Mouse y touch ----------
  useEffect(() => {
    const el = gl.domElement;
    let apretado = false;
    let ultimoX = 0, ultimoY = 0, ultimoT = 0;
    let vel = 0; // velocidad del gesto (px/s)
    let modo: "barra" | "giro" = "barra";
    let inicio = 0; // dónde estaba la barra al apretar

    // Cuántos metros de escena equivalen a 1 px (a la distancia de la barra).
    const metrosPorPx = () => {
      const { camera, size } = get();
      const cam = camera as THREE.PerspectiveCamera;
      return (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.position.z) / size.height;
    };
    // Más allá de los extremos la barra se resiste (efecto goma).
    const conGoma = (x: number) => {
      const min = Math.min(...riel.paradas), max = Math.max(...riel.paradas);
      if (x < min) return min - Math.sqrt(min - x) * 0.25;
      if (x > max) return max + Math.sqrt(x - max) * 0.25;
      return x;
    };

    const abajo = (e: PointerEvent) => {
      if (e.button !== 0) return;
      apretado = true;
      modo = hayAbierta.current ? "giro" : "barra";
      ultimoX = e.clientX; ultimoY = e.clientY; ultimoT = e.timeStamp; vel = 0;
      riel.arrastre = 0;
      inicio = riel.objetivo;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const mover = (e: PointerEvent) => {
      if (!apretado) return;
      const dx = e.clientX - ultimoX;
      const dt = Math.max(1, e.timeStamp - ultimoT) / 1000;
      riel.arrastre += Math.abs(dx) + Math.abs(e.clientY - ultimoY);
      vel = vel * 0.6 + (dx / dt) * 0.4;
      ultimoX = e.clientX; ultimoY = e.clientY; ultimoT = e.timeStamp;
      if (modo === "barra") {
        riel.objetivo = conGoma(riel.objetivo + dx * metrosPorPx());
        if (riel.arrastre > 8) useEstado.getState().marcarInteraccion();
      } else {
        riel.giroObjetivo += dx * 0.012;
      }
    };
    const arriba = (e: PointerEvent) => {
      if (!apretado) return;
      apretado = false;
      el.releasePointerCapture?.(e.pointerId);
      el.style.cursor = "";
      // Si soltó hace rato sin mover, no hay envión.
      if (e.timeStamp - ultimoT > 80) vel = 0;
      if (modo === "barra" && riel.paradas.length) {
        const proyectado = riel.objetivo + vel * metrosPorPx() * 0.35;
        let j = paradaMasCercana(proyectado);
        // Un deslizamiento corto pero claro igual pasa a la siguiente.
        const desde = paradaMasCercana(inicio);
        const movido = riel.objetivo - inicio;
        if (j === desde && Math.abs(movido) > SEPARACION * 0.35) {
          j = clamp(desde + (movido < 0 ? 1 : -1), 0, riel.paradas.length - 1);
        }
        riel.objetivo = riel.paradas[j];
      } else if (modo === "giro") {
        riel.giroObjetivo += vel * 0.012 * 0.3;
      }
    };

    // ---------- Rueda del mouse / trackpad ----------
    let imanTimer: ReturnType<typeof setTimeout> | undefined;
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      if (hayAbierta.current || !riel.paradas.length) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const min = Math.min(...riel.paradas), max = Math.max(...riel.paradas);
      riel.objetivo = clamp(riel.objetivo - d * metrosPorPx() * 0.9, min, max);
      useEstado.getState().marcarInteraccion();
      clearTimeout(imanTimer);
      imanTimer = setTimeout(() => {
        riel.objetivo = riel.paradas[paradaMasCercana(riel.objetivo)];
      }, 160);
    };

    el.addEventListener("pointerdown", abajo);
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerup", arriba);
    el.addEventListener("pointercancel", arriba);
    el.addEventListener("wheel", rueda, { passive: false });
    return () => {
      clearTimeout(imanTimer);
      el.removeEventListener("pointerdown", abajo);
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerup", arriba);
      el.removeEventListener("pointercancel", arriba);
      el.removeEventListener("wheel", rueda);
    };
  }, [gl, get]);

  // ---------- Teclado ----------
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement;
      if (e.altKey || e.ctrlKey || e.metaKey || destino.closest("input, textarea, select")) return;
      const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (abierta) {
        // Con una abierta: flechas pasan a la anterior / siguiente.
        if (!dir) return;
        e.preventDefault();
        const i = visibles.findIndex((p) => p.id === abierta.id);
        const otra = visibles[i + dir];
        if (otra) navegacion.abrir(otra);
        return;
      }
      if (dir) {
        e.preventDefault();
        moverRiel(dir);
      } else if (e.key === "Enter" && (destino === document.body || destino.tagName === "CANVAS")) {
        const p = visibles[paradaMasCercana(riel.objetivo)];
        if (p) navegacion.abrir(p);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta, visibles]);

  // ---------- Cada cuadro ----------
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const antes = riel.actual;
    riel.actual = damp(riel.actual, riel.objetivo, 6, dt);
    riel.velocidad = (riel.actual - antes) / dt;
    riel.giro = damp(riel.giro, riel.giroObjetivo, 6, dt);
    if (grupo.current) grupo.current.position.x = riel.actual;

    const estado = useEstado.getState();
    const centrada = visibles[paradaMasCercana(riel.actual)]?.id ?? null;
    if (centrada !== estado.centrada) estado.setCentrada(centrada);
    const espalda = Math.cos(riel.giro) < 0;
    if (espalda !== estado.vistaEspalda) estado.setVistaEspalda(espalda);
  });

  return <group ref={grupo}>{children}</group>;
}
