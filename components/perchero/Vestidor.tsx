"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { COLOR_LATON, COLOR_MADERA, Y_ESTANTE, Z_PARED } from "./constantes";

const sinRaycast = () => null;

const ANCHO_TOTAL = 36;
const ANCHO_LISTON = 0.11;
const JUNTA = 0.014;
const Y_CORNISA = 2.15;

/**
 * El cuarto: pared de listones de madera, una cornisa con tira de luz
 * arriba y un mueble con estante abajo (el estante queda vacío por ahora).
 */
export function Vestidor() {
  return (
    <group>
      <Listones />

      {/* Fondo detrás de las juntas de los listones */}
      <mesh position={[0, 0, Z_PARED - 0.03]} raycast={sinRaycast}>
        <planeGeometry args={[ANCHO_TOTAL + 10, 12]} />
        <meshStandardMaterial color="#0c0907" roughness={1} />
      </mesh>

      {/* Cornisa con tira de luz cálida */}
      <mesh position={[0, Y_CORNISA + 0.12, Z_PARED + 0.35]} raycast={sinRaycast}>
        <boxGeometry args={[ANCHO_TOTAL, 0.24, 0.7]} />
        <meshStandardMaterial color="#120d09" roughness={0.9} />
      </mesh>
      <mesh position={[0, Y_CORNISA - 0.005, Z_PARED + 0.62]} raycast={sinRaycast}>
        <boxGeometry args={[ANCHO_TOTAL, 0.012, 0.05]} />
        <meshStandardMaterial color="#ffd9a8" emissive="#ffcf94" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <LavadoDePared />

      {/* Mueble bajo con estante */}
      <group position={[0, Y_ESTANTE, 0]}>
        {/* tapa del estante */}
        <mesh position={[0, -0.03, Z_PARED + 0.45]} receiveShadow raycast={sinRaycast}>
          <boxGeometry args={[ANCHO_TOTAL, 0.06, 0.9]} />
          <meshStandardMaterial color={COLOR_MADERA} roughness={0.55} />
        </mesh>
        {/* filo de latón */}
        <mesh position={[0, -0.03, Z_PARED + 0.905]} raycast={sinRaycast}>
          <boxGeometry args={[ANCHO_TOTAL, 0.062, 0.012]} />
          <meshStandardMaterial color={COLOR_LATON} metalness={1} roughness={0.35} />
        </mesh>
        {/* frente del mueble */}
        <mesh position={[0, -1.06, Z_PARED + 0.86]} raycast={sinRaycast}>
          <boxGeometry args={[ANCHO_TOTAL, 2, 0.06]} />
          <meshStandardMaterial color="#1a120c" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/** La tira de luz "lava" la pared de arriba hacia abajo. */
function LavadoDePared() {
  const [destino] = useState(() => {
    const o = new THREE.Object3D();
    o.position.set(0, -1.5, Z_PARED);
    return o;
  });
  return (
    <>
      <primitive object={destino} />
      <spotLight
        position={[0, Y_CORNISA - 0.05, Z_PARED + 0.75]}
        target={destino}
        angle={1.2}
        penumbra={1}
        intensity={6}
        distance={6}
        color="#ffc98c"
      />
    </>
  );
}

/** Listones verticales de madera, uno por uno (en una sola llamada a la placa). */
function Listones() {
  const malla = useRef<THREE.InstancedMesh>(null);
  const cantidad = Math.ceil(ANCHO_TOTAL / (ANCHO_LISTON + JUNTA));
  const geometria = useMemo(() => new THREE.BoxGeometry(ANCHO_LISTON, 6, 0.03), []);

  useLayoutEffect(() => {
    const m = malla.current;
    if (!m) return;
    const matriz = new THREE.Matrix4();
    const color = new THREE.Color();
    const base = new THREE.Color(COLOR_MADERA);
    for (let i = 0; i < cantidad; i++) {
      const x = -ANCHO_TOTAL / 2 + i * (ANCHO_LISTON + JUNTA);
      matriz.makeTranslation(x, 0, Z_PARED);
      m.setMatrixAt(i, matriz);
      // Cada listón con un tono un poco distinto, como madera real.
      const ruido = Math.sin(i * 12.9898) * 43758.5453;
      const variacion = (ruido - Math.floor(ruido) - 0.5) * 0.05;
      color.copy(base).offsetHSL(variacion * 0.15, 0, variacion);
      m.setColorAt(i, color);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [cantidad]);

  return (
    <instancedMesh ref={malla} args={[geometria, undefined, cantidad]} receiveShadow raycast={sinRaycast}>
      <meshStandardMaterial color="#ffffff" roughness={0.75} />
    </instancedMesh>
  );
}
