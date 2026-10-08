// Elven city: giant trees fused with pale spires, bridges between them, a mythal's faint dome of light.
export default function compose(S, K, C) {
  const P = S.pal;
  C.setupTerrain(S, { hills: S.terrain === 'mountain' });
  if (S.terrain === 'mountain') {
    for (const s of [-1, 1]) K.mountain(S, { x: s * 3.0, z: -2.6, r: 1.8, h: 2.8, salt: s });
  }
  const pale = K.mixHex('#f2efe6', P.accent, 0.12);
  const n = 3 + S.scale;
  const spots = [];
  for (let i = 0; i < n; i++) {
    const p = S.find(0.75, { spread: 2.8, tries: 40 });
    if (!p) continue;
    spots.push(p);
    // tree-tower: a great trunk with a spire rising from its crown
    const y = S.y(p[0], p[1]), h = S.r.range(2.2, 3.2) + S.scale * 0.2;
    S.b.cyl(0.2, 0.42, h, { x: p[0], z: p[1], y, seg: 7, color: '#7a6248', layer: 'land' });
    S.b.rock(0.95, { x: p[0], z: p[1], y: y + h, sy: 0.55, color: S.r.chance(0.5) ? P.leaf : P.leafDark, layer: 'land' });
    K.spire(S, { x: p[0], z: p[1], y: y + h * 0.75, r: 0.14, h: 1.8 + S.r() * 1.2, color: pale, tipColor: P.accent, glowTip: true });
  }
  // walkway bridges between neighbouring tree-towers
  for (let i = 1; i < spots.length; i++) {
    const [x1, z1] = spots[i - 1], [x2, z2] = spots[i];
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len > 3.2) continue;
    S.b.box(len, 0.05, 0.1, { x: (x1 + x2) / 2, z: (z1 + z2) / 2, y: 1.6 + (i % 2) * 0.3, ry: -Math.atan2(z2 - z1, x2 - x1), color: pale, layer: 'tall' });
  }
  for (let i = 0; i < 2 + S.scale; i++) {
    const p = S.find(0.4, { spread: 3, tries: 20 });
    if (p) K.domeHall(S, { x: p[0], z: p[1], r: 0.3, h: 0.35, color: pale, domeColor: P.accent });
  }
  K.trees(S, { n: 14, type: 'giant', size: 0.7 });
  if (!S.has('mythal') && S.scale >= 4) S.motifs.add('mythal');
  if (!S.has('glow')) S.motifs.add('glow');
  C.decorate(S, new Set(['spires', 'giant-trees', 'bridge', 'mountain']), { treeCount: 18 });
}
