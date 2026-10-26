/**
 * NEXUS — Image-based lighting (IBL) for realistic reflections.
 *
 * A CC0 urban HDRI (public/hdri/city.exr, from @pmndrs/assets / Poly Haven) is
 * converted to a prefiltered environment map and assigned to scene.environment,
 * so wet asphalt, glass, car paint and armour reflect a believable city sky.
 */

import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

const BASE = import.meta.env?.BASE_URL ?? './';

let sourceTexture = null;
let loading = null;

/** Load the equirectangular HDRI once. Resolves to null if unavailable (lighting falls back). */
export function preloadEnvironment() {
  if (!loading) {
    loading = new EXRLoader()
      .loadAsync(BASE + 'hdri/city.exr')
      .then((tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        sourceTexture = tex;
        return tex;
      })
      .catch((err) => {
        console.warn(`[Environment] HDRI unavailable (${err?.message ?? err}); using analytic lights only.`);
        return null;
      });
  }
  return loading;
}

/** Convert the loaded HDRI to a PMREM environment and assign it to the scene. */
export function applyImageBasedLighting(renderer, scene) {
  if (!sourceTexture) return null;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(sourceTexture).texture;
  pmrem.dispose();
  scene.environment = env;
  return env;
}
