// Floating enclave (Netherese "City of Shade"): an upturned mountain hanging well above the tile, bristling
// with a dense cluster of black needle-spires, stalactites dripping from its underside, a soft shadow on the
// sand below, bobbing slowly. The "float" group is what the status system brings down when the enclave
// crashes (it then lies tilted on the tile).
import * as THREE from 'three';

export default function compose(S, K, C) {
  const P = S.pal;
  C.setupTerrain(S, { coast: false, river: false, lake: false });
  K.trees(S, { n: 2, type: 'palm', zone: (x, z) => Math.hypot(x, z) > 3 });
  K.boulders(S, { n: 5, size: 0.3, zone: (x, z) => Math.hypot(x, z) > 2.6 });

  // the floating island is a sub-site sharing palette and (forked) RNG
  const F = new K.Site(S.place, S.ctx);
  F.r = S.r.fork('float');
  F.pal = S.pal;
  F.noiseAmp = 0.02;
  const R = 2.3;
  F.water = [(x, z) => Math.hypot(x, z) - (R - 0.15)]; // keep buildings on the disc
  const dark = K.mixHex('#2c2733', P.accent, 0.22);
  const darker = K.shade(dark, -0.3);
  // central needle, then rings of lesser needles getting shorter towards the rim
  K.spire(F, { x: 0, z: 0, r: 0.3, h: 3.6 + S.scale * 0.25, color: dark, tipColor: darker, glowTip: true, glowColor: '#b48cff' });
  F.claim(0, 0, 0.35);
  for (let i = 0; i < 14 + S.scale * 3; i++) {
    const p = F.find(0.16, { spread: R - 0.35, tries: 40 });
    if (!p) continue;
    const d = Math.hypot(p[0], p[1]) / R;
    K.spire(F, { x: p[0], z: p[1], r: F.r.range(0.1, 0.18), h: (1 - d * 0.7) * F.r.range(1.6, 2.8), color: F.r.chance(0.3) ? darker : dark, tipColor: darker, glowTip: F.r.chance(0.35), glowColor: '#b48cff' });
  }
  K.walls(F, { cx: 0, cz: 0, rx: R - 0.1, rz: R - 0.1, sides: 11, h: 0.35, color: K.shade(dark, 0.12), gate: false, towerR: 0.16 });
  K.houses(F, { spread: R - 0.3, n: 8 + S.scale * 3, flat: true, walls: [K.shade(dark, 0.22), K.shade(dark, 0.12)], roofs: [darker] });
  K.glowPoints(F, { n: 10, color: '#9a7cff', spread: R - 0.3, y0: 0.4, y1: 2.6, size: 0.05 });
  // underside: an inverted jagged cone with stalactites
  F.b.in('land');
  K.floatingUnderside(F, F.b, { r: R + 0.15, depth: 2.4 });
  for (let i = 0; i < 16; i++) {
    const a = F.r() * Math.PI * 2, rr = Math.sqrt(F.r()) * R * 0.8;
    const top = -2.2 * (1 - (rr / R) ** 2) * 0.8;
    F.b.cone(F.r.range(0.07, 0.16), F.r.range(0.4, 1.1), { x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: top + 0.05, rx: Math.PI, seg: 5, color: P.rockDark });
  }
  const g = F.b.build(S.ctx, 'float');
  for (const e of F.extra) g.add(e);
  S.animators.push(...F.animators);
  S.extra.push(g);
  S.floatGroup = g;
  S.floatHeight = 4.6;
  g.position.y = S.floatHeight;

  // a soft shadow blob on the sand under it (fades as it falls or vanishes into shadow)
  const blobMat = new THREE.MeshBasicMaterial({ color: '#2a1d14', transparent: true, opacity: 0.28, depthWrite: false });
  const blob = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24).rotateX(-Math.PI / 2), blobMat);
  blob.position.y = S.y(0, 0) + 0.04;
  blob.renderOrder = 1;
  S.extra.push(blob);
  g.userData.blob = blob;

  const ph = S.r() * 6;
  S.animate((t) => {
    if (g.userData.grounded) return;
    const lift = g.userData.lift ?? 1;
    g.position.y = 0.3 + (S.floatHeight - 0.3) * lift + Math.sin(t * 0.6 + ph) * 0.15 * lift;
    g.rotation.y = Math.sin(t * 0.08 + ph) * 0.12;
  });
  C.decorate(S, new Set(['floating', 'spires', 'walls', 'towers', 'glow', 'mountain', 'mythal']), { trees: false });
}
