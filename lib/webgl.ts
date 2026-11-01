let cache: boolean | undefined;

/** ¿El navegador puede dibujar 3D? Se calcula una sola vez. */
export function soportaWebGL(): boolean {
  if (cache !== undefined) return cache;
  try {
    const canvas = document.createElement("canvas");
    cache = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    cache = false;
  }
  return cache;
}
