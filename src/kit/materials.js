// Materials. There are a handful of template materials; every diorama gets light-weight clones that share the
// same shader programs (identical cache keys) but carry their own status uniforms (desaturate, scorch, fade,
// pulse, glow level). No textures: all colour comes from vertex colours / instance colours.
import * as THREE from 'three';

export const shared = {
  time: { value: 0 },
  night: { value: 0 },
};

const STATUS_FRAG = /* glsl */ `
  float raL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(raL) * vec3(1.02, 1.0, 0.96), uDesat);
  diffuseColor.rgb = mix(diffuseColor.rgb, uScorchColor * (0.55 + raL * 0.6), uScorch);
  diffuseColor.rgb = mix(diffuseColor.rgb, uFadeColor, uFade);
  diffuseColor.rgb *= uBright;
`;

function statusUniforms() {
  return {
    uDesat: { value: 0 },
    uScorch: { value: 0 },
    uScorchColor: { value: new THREE.Color('#2a1d17') },
    uFade: { value: 0 },
    uFadeColor: { value: new THREE.Color('#d9ccb0') },
    uBright: { value: 1 },
    uPulse: { value: 0 },
    uPulseColor: { value: new THREE.Color('#ffcf7a') },
    uGlow: { value: 1 },
  };
}

function solidCompile(shader) {
  Object.assign(shader.uniforms, this.userData.u);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
uniform float uDesat, uScorch, uFade, uBright, uPulse;
uniform vec3 uScorchColor, uFadeColor, uPulseColor;`)
    .replace('#include <color_fragment>', `#include <color_fragment>
${STATUS_FRAG}`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += uPulseColor * uPulse;`);
}
function waterCompile(shader) {
  Object.assign(shader.uniforms, this.userData.u, { uTime: shared.time });
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
uniform float uTime;
varying float vRipple;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
  vec4 raW = modelMatrix * vec4(position, 1.0);
  float raR = sin(raW.x * 2.1 + uTime * 1.3) * 0.5 + sin(raW.z * 2.7 - uTime * 1.1) * 0.5;
  transformed.y += raR * 0.025;
  vRipple = raR;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
uniform float uDesat, uScorch, uFade, uBright, uPulse;
uniform vec3 uScorchColor, uFadeColor, uPulseColor;
varying float vRipple;`)
    .replace('#include <color_fragment>', `#include <color_fragment>
  diffuseColor.rgb *= 0.92 + 0.16 * smoothstep(0.55, 1.0, vRipple);
${STATUS_FRAG}`);
}
function glowCompile(shader) {
  Object.assign(shader.uniforms, this.userData.u, { uNight: shared.night });
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
uniform float uGlow, uDesat, uNight;`)
    .replace('#include <color_fragment>', `#include <color_fragment>
  float raL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(raL), uDesat) * uGlow * (1.0 + 1.8 * uNight);`);
}

const key = (k) => () => k;

/** Make the material set for one diorama. All sets share programs. */
export function makeMaterialSet(inkColor = '#2b2420') {
  const u = statusUniforms();
  const solid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true, side: THREE.DoubleSide });
  solid.userData.u = u;
  solid.onBeforeCompile = solidCompile;
  solid.customProgramCacheKey = key('ra-solid');

  const water = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.88, flatShading: true });
  water.userData.u = u;
  water.onBeforeCompile = waterCompile;
  water.customProgramCacheKey = key('ra-water');

  const glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  glow.userData.u = u;
  glow.onBeforeCompile = glowCompile;
  glow.customProgramCacheKey = key('ra-glow');

  const aura = new THREE.MeshBasicMaterial({
    vertexColors: true, toneMapped: false, transparent: true, opacity: 0.1, depthWrite: false,
    side: THREE.FrontSide,
  });
  aura.userData.u = u;
  aura.onBeforeCompile = glowCompile;
  aura.customProgramCacheKey = key('ra-aura');

  const ink = new THREE.LineBasicMaterial({ color: inkColor, transparent: true, opacity: 0.5, depthWrite: false });

  const set = { solid, water, glow, aura, ink, u };
  set.all = [solid, water, glow, aura, ink];
  // base opacities, restored when leaving the "hidden"/"relocated" ghost look
  set.baseOpacity = new Map(set.all.map((m) => [m, m.opacity]));
  return set;
}

/** Set the ghostly transparency for a diorama (k = 0 opaque … 1 ghost). */
export function setGhost(set, k) {
  const want = k > 0.001;
  for (const m of set.all) {
    const base = set.baseOpacity.get(m);
    if (m === set.solid) {
      // sketch look: translucent fill that still writes depth; a depth pre-pass (see Diorama) makes only the
      // nearest faces draw, so there is no x-ray of interior faces
      if (m.transparent !== want) { m.transparent = want; m.depthWrite = true; m.needsUpdate = true; }
      m.opacity = 1 - 0.65 * k;
    } else if (m === set.ink) m.opacity = base + 0.35 * k;
    else m.opacity = base * (1 - 0.65 * k);
  }
}
