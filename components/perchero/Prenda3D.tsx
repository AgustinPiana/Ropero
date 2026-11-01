"use client";

import { useTexture } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Prenda } from "@/lib/schema";
import { ALTO_PRENDA, ANGULO_LADO, HUECO_FOCO, RADIO_FOCO, Y_BARRA, Y_HOMBROS } from "./constantes";
import { navegacion, riel, useEstado } from "./estado";
import { crearGeometriasPrenda } from "./geometriaTela";
import { crearMaterialTela, type UniformesTela } from "./materialTela";
import { Percha } from "./Percha";
import { poseDePresentacion } from "./presentacion";

const { damp, clamp } = THREE.MathUtils;
/** Más de esto (en px) ya es arrastre, no clic. */
export const UMBRAL_CLIC = 8;

/** Un número estable por remera, para que no se balanceen todas sincronizadas. */
const faseDe = (id: string) => [...id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 1000, 7) / 100;

type Props = {
  prenda: Prenda;
  /** Posición sobre la barra, o null si el filtro la oculta. */
  x: number | null;
  abierta: boolean;
};

/** Una remera colgada en su percha. Frente con la foto de frente, atrás la de espalda. */
export function Prenda3D({ prenda, x, abierta }: Props) {
  const { fotos, colores } = prenda;
  const urls = fotos.espalda ? [fotos.frente, fotos.espalda] : [fotos.frente];
  const texturas = useTexture(urls, (cargadas) => {
    for (const t of [cargadas].flat()) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4; // three lo limita a lo que soporte la placa
    }
  });

  const { geometrias, materiales, uniformes, ancho } = useMemo(() => {
    const [texFrente, texEspalda] = texturas;
    const imagen = texFrente.image as HTMLImageElement;
    const ancho = ALTO_PRENDA * (imagen.width / imagen.height);
    const uniformes: UniformesTela = { uTiempo: { value: 0 }, uEnergia: { value: 0 } };
    return {
      ancho,
      uniformes,
      geometrias: crearGeometriasPrenda(imagen, ancho, ALTO_PRENDA),
      materiales: {
        frente: crearMaterialTela({ map: texFrente, uniformes }),
        // Sin foto de espalda: silueta del frente pintada con el color dominante.
        espalda: texEspalda
          ? crearMaterialTela({ map: texEspalda, uniformes })
          : crearMaterialTela({ map: texFrente, uniformes, soloSilueta: true, color: colores[0] ?? "#777777" }),
      },
    };
  }, [texturas, colores]);

  useEffect(
    () => () => {
      geometrias.frente.dispose();
      geometrias.espalda.dispose();
      materiales.frente.dispose();
      materiales.espalda.dispose();
    },
    [geometrias, materiales],
  );

  // El mouse solo "toca" donde hay tela, no el rectángulo transparente de la foto.
  const raycast = useMemo(() => {
    const filtrar = (espejo: boolean) =>
      function (this: THREE.Mesh, raycaster: THREE.Raycaster, hits: THREE.Intersection[]) {
        const propios: THREE.Intersection[] = [];
        THREE.Mesh.prototype.raycast.call(this, raycaster, propios);
        for (const h of propios) {
          if (!h.uv) continue;
          const u = espejo ? 1 - h.uv.x : h.uv.x;
          if (geometrias.esTela(u, h.uv.y)) hits.push(h);
        }
      };
    return { frente: filtrar(false), espalda: filtrar(true) };
  }, [geometrias]);

  // --- Animación (todo en refs: corre 60 veces por segundo sin redibujar React) ---
  const pivote = useRef<THREE.Group>(null);
  const columpio = useRef<THREE.Group>(null);
  const giro = useRef<THREE.Group>(null);
  const fisica = useRef({ angulo: 0, vel: 0, energia: 0, fase: faseDe(prenda.id), ultimaX: x ?? 0 });
  const hover = useEstado((s) => s.hover === prenda.id);

  useFrame(({ camera, size, clock }, delta) => {
    const g = pivote.current, gc = columpio.current, gg = giro.current;
    if (!g || !gc || !gg) return;
    const dt = Math.min(delta, 1 / 20);
    const f = fisica.current;
    const t = clock.elapsedTime;

    // 1) Dónde tiene que estar el gancho y hacia dónde mira.
    // Efecto "foco": la remera del centro mira de frente; las demás giran
    // ~60° hacia el centro y se corren para dejarle lugar (como pasar discos en una batea).
    const xBarra = x ?? f.ultimaX;
    const s = clamp((xBarra + riel.actual) / RADIO_FOCO, -1, 1); // -1 izquierda … 1 derecha
    const lado = Math.sin((s * Math.PI) / 2);
    const foco = 1 - Math.abs(lado);
    const enHover = hover && !abierta ? 1 : 0;
    let tx: number, ty: number, tz: number;
    // El giro se mide respecto de la línea de mirada: una remera a la izquierda ya la
    // vemos "desde la derecha", así que se suma ese ángulo para que se vea de costado de verdad.
    const xMundo = g.position.x + riel.actual;
    const haciaCamara = Math.atan2(camera.position.x - xMundo, camera.position.z - g.position.z);
    let rotY = haciaCamara - ANGULO_LADO * lado * (1 - 0.35 * enHover);
    if (abierta) {
      rotY = 0;
      const pose = poseDePresentacion(camera as THREE.PerspectiveCamera, size.width, size.height, ancho);
      tx = pose.x - riel.actual; // la barra se mueve; compensamos
      ty = pose.y;
      tz = pose.z;
    } else if (x === null) {
      tx = f.ultimaX; ty = Y_BARRA + 4; tz = 0; // la saca el filtro: sube y desaparece
    } else {
      f.ultimaX = x;
      tx = x + HUECO_FOCO * lado;
      ty = Y_BARRA;
      tz = 0.3 * foco * foco + 0.14 * enHover; // la del centro (y la del hover) sobresale
    }
    const rapidez = abierta ? 5 : 9;
    g.position.set(damp(g.position.x, tx, rapidez, dt), damp(g.position.y, ty, rapidez, dt), damp(g.position.z, tz, rapidez, dt));
    g.rotation.y = damp(g.rotation.y, rotY, abierta ? 5 : 8, dt);
    g.visible = !(x === null && !abierta && g.position.y > Y_BARRA + 3);

    // 2) Péndulo: se balancea en contra del movimiento de la barra + un vaivén suave idle
    const reposo = abierta ? 0 : Math.sin(t * 0.7 + f.fase) * 0.012;
    const empuje = abierta ? 0 : THREE.MathUtils.clamp(-riel.velocidad * 0.028, -0.16, 0.16);
    const aceleracion = 28 * (reposo + empuje - f.angulo) - 3.2 * f.vel;
    f.vel += aceleracion * dt;
    f.angulo += f.vel * dt;
    gc.rotation.z = f.angulo;
    gc.rotation.x = abierta ? damp(gc.rotation.x, 0, 4, dt) : Math.sin(t * 0.5 + f.fase) * 0.015;

    // 3) Giro para ver la espalda (solo la abierta)
    gg.rotation.y = abierta ? riel.giro : damp(gg.rotation.y, 0, 5, dt);

    // 4) Energía de la tela para el shader
    const energiaObjetivo = Math.min(1, Math.abs(f.vel) * 2.5 + (hover ? 0.35 : 0) + Math.abs(riel.velocidad) * 0.08);
    f.energia = damp(f.energia, energiaObjetivo, 3, dt);
    uniformes.uTiempo.value = t + f.fase;
    uniformes.uEnergia.value = f.energia;
  });

  const alEntrar = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    useEstado.getState().setHover(prenda.id);
    // Empujoncito en la dirección en que entra el mouse
    fisica.current.vel += (e.movementX >= 0 ? 1 : -1) * 0.35;
    document.body.style.cursor = "pointer";
  };
  const alSalir = () => {
    if (useEstado.getState().hover === prenda.id) useEstado.getState().setHover(null);
    document.body.style.cursor = "";
  };
  const alClic = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (riel.arrastre > UMBRAL_CLIC || abierta) return;
    navegacion.abrir(prenda);
  };

  return (
    <group
      ref={pivote}
      position={[x ?? 0, Y_BARRA, 0]}
      onPointerOver={alEntrar}
      onPointerOut={alSalir}
      onClick={alClic}
    >
      <group ref={columpio}>
        <group ref={giro} position={[0, Y_HOMBROS - Y_BARRA, 0]}>
          <mesh geometry={geometrias.frente} material={materiales.frente} raycast={raycast.frente} castShadow />
          <mesh geometry={geometrias.espalda} material={materiales.espalda} raycast={raycast.espalda} castShadow />
          <Percha hombros={geometrias.hombros} anio={prenda.anio} />
        </group>
      </group>
    </group>
  );
}
