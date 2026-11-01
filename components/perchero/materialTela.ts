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
 * - "soloSilueta": cuando no hay foto de espalda usamos la foto de frente
 *   solo para recortar la forma y pintamos con el color dominante.
 *
 * Frente y espalda usan la misma onda, así los bordes siguen pegados.
 */
export function crearMaterialTela(opciones: {
  map: THREE.Texture;
  uniformes: UniformesTela;
  soloSilueta?: boolean;
  color?: string;
}): THREE.MeshStandardMaterial {
  const { map, uniformes, soloSilueta = false, color = "#ffffff" } = opciones;
  const material = new THREE.MeshStandardMaterial({
    map,
    color: soloSilueta ? color : "#ffffff",
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
    // Bordes suaves en vez de serruchados (usa el antialiasing de la placa).
    alphaToCoverage: true,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = uniformes.uTiempo;
    shader.uniforms.uEnergia = uniformes.uEnergia;

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

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      /* glsl */ `
      #ifdef USE_MAP
        ${
          soloSilueta
            ? // La espalda tiene la UV espejada; para recortar con la silueta del FRENTE
              // hay que des-espejarla, si no en fotos asimétricas asoma un borde.
              "vec4 texel = texture2D( map, vec2( 1.0 - vMapUv.x, vMapUv.y ) ); diffuseColor.a *= texel.a;"
            : "vec4 texel = texture2D( map, vMapUv ); diffuseColor *= texel;"
        }
      #endif
      if ( !gl_FrontFacing ) diffuseColor.rgb *= 0.4;
      `,
    );
  };
  material.customProgramCacheKey = () => (soloSilueta ? "tela-silueta" : "tela");
  return material;
}
