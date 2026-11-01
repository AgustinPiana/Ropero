"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { COLOR_LATON, RADIO_BARRA, Y_BARRA, Y_HOMBROS } from "./constantes";

const RADIO_CHAPITA = 0.048;

/**
 * Percha de madera con gancho de latón. Se dibuja en coordenadas
 * de la prenda: (0,0,0) es el centro del borde de arriba.
 * La madera sigue la línea de hombros de la foto, así queda escondida
 * adentro de la remera; asoman el gancho y una chapita con el año.
 */
export function Percha({ hombros, anio }: { hombros: THREE.Vector3[]; anio: number | null }) {
  const { madera, gancho, yChapita } = useMemo(() => crearGeometriasPercha(hombros), [hombros]);
  const textura = useMemo(() => (anio ? texturaChapita(anio) : null), [anio]);

  useEffect(
    () => () => {
      madera.dispose();
      gancho.dispose();
    },
    [madera, gancho],
  );
  useEffect(() => () => textura?.dispose(), [textura]);

  return (
    <group>
      <mesh geometry={madera} castShadow>
        <meshStandardMaterial color="#4a3423" roughness={0.55} />
      </mesh>
      <mesh geometry={gancho} castShadow>
        <meshStandardMaterial color={COLOR_LATON} metalness={1} roughness={0.3} />
      </mesh>
      {textura && (
        <group position={[0, yChapita, 0]}>
          {/* canto */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[RADIO_CHAPITA, RADIO_CHAPITA, 0.006, 32]} />
            <meshStandardMaterial color={COLOR_LATON} metalness={1} roughness={0.35} />
          </mesh>
          {/* las dos caras grabadas */}
          {[0, Math.PI].map((r) => (
            <mesh key={r} rotation={[0, r, 0]} position={[0, 0, r ? -0.0031 : 0.0031]}>
              <circleGeometry args={[RADIO_CHAPITA, 32]} />
              <meshStandardMaterial map={textura} metalness={0.85} roughness={0.38} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

function crearGeometriasPercha(hombros: THREE.Vector3[]) {
  const madera = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hombros), 32, 0.016, 8, false);

  // Gancho: sube desde el centro de la percha y abraza la barra por arriba.
  const centro = hombros[Math.floor(hombros.length / 2)];
  const yBarra = Y_BARRA - Y_HOMBROS;
  const radio = RADIO_BARRA + 0.008;
  const puntos = [
    new THREE.Vector3(0, centro.y, 0),
    new THREE.Vector3(0, centro.y + 0.06, 0.004),
    new THREE.Vector3(0, yBarra - 0.07, 0.022),
  ];
  for (let t = -0.6; t <= Math.PI + 0.7; t += 0.25) {
    puntos.push(new THREE.Vector3(0, yBarra + radio * Math.sin(t), radio * Math.cos(t)));
  }
  const gancho = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos), 48, 0.0065, 6, false);

  // La chapita cuelga del cuello del gancho, entre la remera y la barra.
  const yChapita = (centro.y + 0.06 + yBarra - 0.07) / 2;
  return { madera, gancho, yChapita };
}

/** Chapita de latón con el año grabado (ej. ’97). */
function texturaChapita(anio: number): THREE.CanvasTexture {
  const lado = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = lado;
  const ctx = canvas.getContext("2d")!;
  const brillo = ctx.createRadialGradient(lado * 0.35, lado * 0.3, 4, lado / 2, lado / 2, lado / 2);
  brillo.addColorStop(0, "#ecd29c");
  brillo.addColorStop(1, "#a07a42");
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, lado, lado);
  ctx.strokeStyle = "rgba(60,38,14,0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(lado / 2, lado / 2, lado / 2 - 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#3a2410";
  ctx.font = "600 52px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`’${String(anio).slice(-2)}`, lado / 2, lado / 2 + 3);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
