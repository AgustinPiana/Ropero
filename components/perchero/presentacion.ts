import * as THREE from "three";
import { ALTO_PRENDA, Y_BARRA, Y_HOMBROS } from "./constantes";

/** En pantallas angostas la ficha va abajo; en las anchas, a la derecha. */
export const esPantallaAngosta = (ancho: number) => ancho < 640;
/** Ancho de la tarjeta de ficha + su margen. */
export const ANCHO_PANEL = 450;
/** Fracción del alto que ocupa la ficha abajo en celular. */
export const ALTO_PANEL_MOVIL = 0.47;
const ALTO_ENCABEZADO = 110;
/** El velo que oscurece el perchero está en z = 0.5; la remera abierta va siempre delante. */
export const Z_VELO = 0.5;
const Z_MINIMO = Z_VELO + 0.18;

const destino = new THREE.Vector3();

/**
 * Dónde poner la remera abierta: frente a la cámara, centrada en la parte
 * de la pantalla que NO tapa la ficha, y grande pero entera.
 * Devuelve la posición del gancho (el punto del que cuelga la remera).
 */
export function poseDePresentacion(
  camara: THREE.PerspectiveCamera,
  anchoPx: number,
  altoPx: number,
  anchoPrenda: number,
): THREE.Vector3 {
  const angosta = esPantallaAngosta(anchoPx);
  const panelLateral = angosta ? 0 : Math.min(ANCHO_PANEL, anchoPx * 0.45);
  const panelInferior = angosta ? altoPx * ALTO_PANEL_MOVIL : 0;
  const libreAncho = anchoPx - panelLateral;
  const libreAlto = altoPx - panelInferior - ALTO_ENCABEZADO;

  const t = Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2);
  // Distancia a la cámara para que entre en el espacio libre con aire alrededor.
  const porAlto = ALTO_PRENDA / (0.78 * (libreAlto / altoPx)) / (2 * t);
  const porAncho = anchoPrenda / (0.8 * (libreAncho / anchoPx)) / (2 * t * camara.aspect);
  // Nunca más atrás que Z_MINIMO: tiene que quedar delante del velo oscuro.
  const d = Math.min(Math.max(porAlto, porAncho, 1.4), camara.position.z - Z_MINIMO);

  const altoVisible = 2 * t * d;
  const anchoVisible = altoVisible * camara.aspect;
  // Centro del espacio libre, medido desde el centro de la pantalla (en px).
  const cxPx = libreAncho / 2 - anchoPx / 2;
  const cyPx = ALTO_ENCABEZADO + libreAlto / 2 - altoPx / 2;

  const centroX = camara.position.x + (cxPx / anchoPx) * anchoVisible;
  const centroY = camara.position.y - (cyPx / altoPx) * altoVisible;
  // Del centro de la remera al gancho: media remera + lo que cuelga de la barra.
  return destino.set(centroX, centroY + ALTO_PRENDA / 2 + (Y_BARRA - Y_HOMBROS), camara.position.z - d);
}
