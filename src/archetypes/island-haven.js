// Island haven: a green island ringed by sea, a harbour town and a hilltop citadel or spires.
export default function compose(S, K, C) {
  C.setupTerrain(S, { island: true, coast: false, islandR: 3.0 + (S.scale > 3 ? 0.3 : 0) });
  S.addHill(-0.6, -0.9, 2.0, 0.6);
  const top = S.y(-0.6, -0.9);
  if (S.has('spires') || S.has('mythal')) {
    for (let i = 0; i < 3 + S.scale; i++) {
      const p = S.find(0.25, { cx: -0.6, cz: -0.9, spread: 1.4, tries: 30 });
      if (p) K.spire(S, { x: p[0], z: p[1], r: 0.16, h: 2.4 + S.r() * 1.5, glowTip: true });
    }
  } else {
    K.tower(S, { x: -0.6, z: -0.9, y: top, r: 0.35, h: 1.6 + S.scale * 0.2, roof: 'cone', banner: true });
    S.claim(-0.6, -0.9, 0.5);
  }
  K.houses(S, { cx: 0.6, cz: 0.9, spread: 1.6, n: 6 + S.scale * 6 });
  C.decorate(S, new Set(['spires', 'towers', 'walls', 'keep']), { treeCount: 16 });
}
