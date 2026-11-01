"use client";

import { COLOR_LATON, RADIO_BARRA, Y_BARRA, Z_PARED } from "./constantes";

const sinRaycast = () => null;
const LARGO = 36;
const CADA = 2.4; // un soporte cada tanto, como un barral de placard

/**
 * Barral de latón amurado a la pared. Es fijo y largo: lo que se
 * arrastra son las perchas, que se deslizan por él.
 */
export function Barra() {
  const soportes: number[] = [];
  for (let x = -LARGO / 2 + CADA / 2; x < LARGO / 2; x += CADA) soportes.push(x);
  const largoSoporte = Math.abs(Z_PARED);

  return (
    <group>
      <mesh position={[0, Y_BARRA, 0]} rotation={[0, 0, Math.PI / 2]} castShadow raycast={sinRaycast}>
        <cylinderGeometry args={[RADIO_BARRA, RADIO_BARRA, LARGO, 20]} />
        <meshStandardMaterial color={COLOR_LATON} metalness={1} roughness={0.28} />
      </mesh>
      {soportes.map((x) => (
        <group key={x} position={[x, Y_BARRA, 0]}>
          <mesh position={[0, 0, -largoSoporte / 2]} rotation={[Math.PI / 2, 0, 0]} raycast={sinRaycast}>
            <cylinderGeometry args={[0.011, 0.011, largoSoporte, 10]} />
            <meshStandardMaterial color={COLOR_LATON} metalness={1} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, -largoSoporte + 0.01]} rotation={[Math.PI / 2, 0, 0]} raycast={sinRaycast}>
            <cylinderGeometry args={[0.045, 0.045, 0.02, 24]} />
            <meshStandardMaterial color={COLOR_LATON} metalness={1} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
