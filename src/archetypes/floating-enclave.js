// Floating enclave (Netherese): an upturned mountain hanging in the air carrying a walled city of black
// spires; it bobs gently. The board below shows the desert it floats over. The "float" group is what the
// status system lowers when the enclave crashes.
export default function compose(S, K, C) {
  const P = S.pal;
  C.setupTerrain(S, { coast: false, river: false, lake: false });
  K.trees(S, { n: 2, type: 'palm' });
  K.boulders(S, { n: 5, size: 0.3 });
  // the floating island is a sub-site sharing RNG and palette
  const F = new K.Site(S.place, S.ctx);
  F.r = S.r.fork('float');
  F.pal = S.pal;
  F.noiseAmp = 0.03;
  F.water = [(x, z) => Math.hypot(x, z) - 2.6]; // keep buildings on the disc
  const dark = K.mixHex('#3c3542', P.accent, 0.25);
  F.b.in('tall');
  K.tower(F, { x: 0, z: 0, r: 0.4, h: 1.8 + S.scale * 0.2, roof: 'spire', color: dark, roofColor: K.shade(dark, -0.3), window: true });
  F.claim(0, 0, 0.6);
  for (let i = 0; i < 4 + S.scale; i++) {
    const p = F.find(0.25, { spread: 2.0, tries: 30 });
    if (p) K.spire(F, { x: p[0], z: p[1], r: 0.16, h: 1.2 + F.r() * 1.0, color: dark, glowTip: true, glowColor: '#b48cff' });
  }
  K.walls(F, { cx: 0, cz: 0, rx: 2.3, rz: 2.3, sides: 9, h: 0.4, color: K.shade(dark, 0.1), gate: false });
  K.houses(F, { cx: 0, cz: 0, spread: 2.1, n: 10 + S.scale * 5, flat: true, walls: [K.shade(dark, 0.25), K.shade(dark, 0.15)], roofs: [dark] });
  K.floatingUnderside(F, F.b, { r: 2.8, depth: 3.0 });
  F.b.sphere(2.75, { y: -0.02, sy: 0.02, color: P.ground, layer: 'land', seg: 12 });
  const g = F.b.build(S.ctx, 'float');
  for (const e of F.extra) g.add(e);
  S.animators.push(...F.animators);
  S.extra.push(g);
  S.floatGroup = g;
  S.floatHeight = 3.0;
  g.position.y = S.floatHeight;
  g.scale.setScalar(0.85);
  const ph = S.r() * 6;
  S.animate((t) => {
    if (S.floatGroup.userData.grounded) return;
    g.position.y = S.floatHeight * (S.floatGroup.userData.lift ?? 1) + Math.sin(t * 0.6 + ph) * 0.12;
    g.rotation.y = Math.sin(t * 0.1 + ph) * 0.08;
  });
  C.decorate(S, new Set(['floating', 'spires', 'walls', 'towers', 'glow', 'mountain', 'mythal']), { trees: false });
}
