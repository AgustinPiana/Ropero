import * as THREE from "three";
import { ALTO_PRENDA } from "./constantes";

export type UniformesTela = {
  uTiempo: { value: number };
  /** 0 = quieta, 1 = flameando (hover, arrastre). */
  uEnergia: { value: number };
};

/**
 * Material de la tela: la foto como textura, con retoques en el shader:
 * - ondulación de la tela (vértices), más fuerte abajo que arriba, como
 *   una remera colgada: arriba la sostiene la percha;
 * - la cara interna (lo que se ve por el cuello) se oscurece, como la
 *   sombra dentro de una remera real;
 * - la ESPALDA siempre se recorta con la silueta del FRENTE: las dos fotos
 *   nunca están sacadas igual, y si cada cara usara su propia silueta, una
 *   asomaría por detrás de la otra. La foto de espalda pone el dibujo y,
 *   donde no llega, se rellena con el color de la remera.
 *
 * Frente y espalda usan la misma onda, así los bordes siguen pegados.
 */
export function crearMaterialTela(opciones: {
  /** Foto de esta cara (para la espalda sin foto, null). */
  foto: THREE.Texture | null;
  /** Foto de frente: de ahí sale la silueta. */
  silueta: THREE.Texture;
  uniformes: UniformesTela;
  /** Es la cara de atrás (su UV está espejada). */
  esEspalda?: boolean;
  /** Color dominante, para rellenar donde la foto de espalda no llega. */
  relleno?: string;
}): THREE.MeshStandardMaterial {
  const { foto, silueta, uniformes, esEspalda = false, relleno = "#777777" } = opciones;
  const material = new THREE.MeshStandardMaterial({
    map: foto ?? silueta,
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
    // Bordes suaves en vez de serruchados (usa el antialiasing de la placa).
    alphaToCoverage: true,
  });
  const uSilueta = { value: silueta };
  const uRelleno = { value: new THREE.Color(relleno) };
  const modo = !esEspalda ? "frente" : foto ? "espalda" : "relleno";

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = uniformes.uTiempo;
    shader.uniforms.uEnergia = uniformes.uEnergia;
    shader.uniforms.uSilueta = uSilueta;
    shader.uniforms.uRelleno = uRelleno;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        uniform float uTiempo;
        uniform float uEnergia;`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        // 0 en los hombros, 1 en el ruedo: abajo se mueve más.
        float caida = clamp(-position.y / ${ALTO_PRENDA.toFixed(3)}, 0.0, 1.0);
        float peso = caida * caida;
        float amplitud = 0.006 + 0.045 * uEnergia;
        transformed.z += sin(position.y * 4.5 + position.x * 1.7 + uTiempo * 2.1) * amplitud * peso;
        transformed.x += sin(position.y * 3.1 + uTiempo * 1.6) * 0.018 * uEnergia * peso;`,
      );

    const caras = {
      frente: "vec4 texel = texture2D( map, vMapUv ); diffuseColor *= texel;",
      // La UV de la espalda está espejada: la silueta del frente se lee des-espejada.
      espalda: /* glsl */ `
        vec4 texel = texture2D( map, vMapUv );
        float sil = texture2D( uSilueta, vec2( 1.0 - vMapUv.x, vMapUv.y ) ).a;
        diffuseColor.rgb *= mix( uRelleno, texel.rgb, smoothstep( 0.3, 0.9, texel.a ) );
        diffuseColor.a *= sil;`,
      relleno: /* glsl */ `
        float sil = texture2D( uSilueta, vec2( 1.0 - vMapUv.x, vMapUv.y ) ).a;
        diffuseColor.rgb *= uRelleno;
        diffuseColor.a *= sil;`,
    };

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        uniform sampler2D uSilueta;
        uniform vec3 uRelleno;`,
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        #ifdef USE_MAP
          ${caras[modo]}
        #endif
        if ( !gl_FrontFacing ) diffuseColor.rgb *= 0.4;
        `,
      );
  };
  material.customProgramCacheKey = () => `tela-${modo}`;
  return material;
}
