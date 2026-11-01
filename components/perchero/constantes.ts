/** Medidas del perchero en "metros" de la escena 3D. */
export const ALTO_PRENDA = 1.5;
/** Distancia entre perchas sobre la barra (apretadas, como en un placard). */
export const SEPARACION = 0.46;
/** Altura del borde superior (hombros) de las prendas. */
export const Y_HOMBROS = 0.78;
/** Altura del centro de la barra. */
export const Y_BARRA = Y_HOMBROS + 0.2;
export const RADIO_BARRA = 0.022;

/** Giro de las remeras que no están en foco (radianes, ~70°): miran hacia el centro. */
export const ANGULO_LADO = 1.22;
/** A qué distancia del centro una remera ya está totalmente girada. */
export const RADIO_FOCO = SEPARACION * 1.15;
/** Cuánto se corren las vecinas para dejarle lugar a la del centro. */
export const HUECO_FOCO = 0.8;

/** Pared de listones y estante. */
export const Z_PARED = -1.2;
export const Y_ESTANTE = -1.0;

export const COLOR_LATON = "#b8915a";
export const COLOR_PARED = "#1b1612";
export const COLOR_MADERA = "#2f2016";

/** Posición X de la prenda i dentro de una fila de n. */
export const xDePrenda = (i: number, n: number) => (i - (n - 1) / 2) * SEPARACION;
