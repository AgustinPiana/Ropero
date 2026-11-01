"use client";

import { Environment, Lightformer, useProgress } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Prenda } from "@/lib/schema";
import { Barra } from "./Barra";
import { COLOR_PARED, xDePrenda } from "./constantes";
import { Prenda3D } from "./Prenda3D";
import { Z_VELO } from "./presentacion";
import { useEstado } from "./estado";
import { Riel } from "./Riel";
import { SinErrores } from "./SinErrores";
import { Vestidor } from "./Vestidor";

const sinRaycast = () => null;

const MIRA = new THREE.Vector3(0, 0.05, 0);
const DURACION_ENTRADA = 2.8;
const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Cámara: se ajusta a la pantalla (en celular vertical abre el ángulo) y
 * hace una entrada al terminar de cargar: arranca cerca y de costado,
 * mirando las perchas, y se acomoda de frente.
 */
function Camara() {
  const aspecto = useThree((s) => s.size.width / s.size.height);
  const { active, progress } = useProgress();
  const cargado = !active && progress === 100;
  const entrada = useRef({ inicio: -1, hecha: false });
  const desde = useRef(new THREE.Vector3(-1.9, 0.95, 2.6));
  const mirarDesde = useRef(new THREE.Vector3(-0.6, 0.35, 0));
  const mirar = useRef(new THREE.Vector3());
  const reposo = useRef(new THREE.Vector3());

  useFrame(({ camera, clock }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const vertical = aspecto < 0.8;
    const fov = vertical ? 44 : 32;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    reposo.current.set(0, vertical ? 0.28 : 0.36, vertical ? 4.9 : 5.4);

    const e = entrada.current;
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!e.hecha && cargado && e.inicio < 0) e.inicio = clock.elapsedTime;
    let k = 1;
    if (!e.hecha && !sinMovimiento) {
      k = e.inicio < 0 ? 0 : Math.min(1, (clock.elapsedTime - e.inicio) / DURACION_ENTRADA);
      if (k >= 1) e.hecha = true;
    }
    const t = suave(k);
    cam.position.lerpVectors(desde.current, reposo.current, t);
    mirar.current.lerpVectors(mirarDesde.current, MIRA, t);
    cam.lookAt(mirar.current);
  });

  return null;
}

/** Velo oscuro entre el perchero y la remera abierta: le da foco sin esconder el resto. */
function Velo({ activo }: { activo: boolean }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, delta) => {
    if (!material.current) return;
    material.current.opacity = THREE.MathUtils.damp(material.current.opacity, activo ? 0.62 : 0, 5, delta);
  });
  return (
    <mesh position={[0, 0, Z_VELO]} raycast={sinRaycast} renderOrder={1}>
      <planeGeometry args={[60, 30]} />
      <meshBasicMaterial ref={material} color="#0b0907" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

type Props = {
  prendas: Prenda[];
  visibles: Prenda[];
  abierta: Prenda | null;
};

/** Cuántas remeras a cada lado de la del centro se cargan (las demás, cuando te acercás). */
const VENTANA = 9;

export function Escena({ prendas, visibles, abierta }: Props) {
  const posiciones = useMemo(() => visibles.map((_, i) => xDePrenda(i, visibles.length)), [visibles]);
  const xPorId = useMemo(() => new Map(visibles.map((p, i) => [p.id, posiciones[i]])), [visibles, posiciones]);

  // Carga por cercanía: solo se dibujan (y bajan su foto) las remeras cerca de la vista.
  const idCentrada = useEstado((s) => s.centrada);
  const centro = Math.max(0, visibles.findIndex((p) => p.id === idCentrada));
  const cercanas = new Set(visibles.slice(Math.max(0, centro - VENTANA), centro + VENTANA + 1).map((p) => p.id));
  if (abierta) cercanas.add(abierta.id);

  return (
    <>
      <Camara />
      <color attach="background" args={[COLOR_PARED]} />
      <fog attach="fog" args={[COLOR_PARED, 6.5, 14]} />

      {/* Luz de vestidor: un foco cálido al frente, relleno suave y un halo en la pared.
          El foco es casi blanco para que los colores de la ropa se vean reales. */}
      <hemisphereLight args={["#fff8ef", "#2a1d12", 0.8]} />
      <spotLight
        position={[0, 3.2, 6]}
        angle={0.55}
        penumbra={1}
        intensity={70}
        color="#ffe9d0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-radius={6}
      />
      <directionalLight position={[-4, 2, 5]} intensity={0.7} color="#fff0de" />
      <pointLight position={[0, 0.3, -0.95]} intensity={1.6} distance={6} color="#ffad66" />

      {/* Reflejos para el latón (se genera acá, no baja nada de internet). */}
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffd9a8" position={[0, 4, 3]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1} color="#ffb98a" position={[-5, 1, 2]} scale={[2, 4, 1]} />
        <Lightformer form="rect" intensity={1} color="#ffb98a" position={[5, 1, 2]} scale={[2, 4, 1]} />
      </Environment>

      <Vestidor />
      <Barra />

      <Velo activo={abierta !== null} />

      <Riel visibles={visibles} posiciones={posiciones} abierta={abierta}>
        {prendas
          // Las que saca un filtro siguen montadas para animar su salida (si el ropero no es enorme).
          .filter((p) => cercanas.has(p.id) || (!xPorId.has(p.id) && prendas.length <= 2 * VENTANA + 1))
          .map((p) => (
            <SinErrores key={p.id} nombre={p.nombre}>
              <Suspense fallback={null}>
                <Prenda3D prenda={p} x={xPorId.get(p.id) ?? null} abierta={abierta?.id === p.id} />
              </Suspense>
            </SinErrores>
          ))}
      </Riel>
    </>
  );
}
