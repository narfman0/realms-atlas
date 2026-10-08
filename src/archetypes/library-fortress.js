// Library fortress (Candlekeep): a tall many-tiered central tower on a sea crag behind a single wall, candle-lit.
export default function compose(S, K, C) {
  C.setupTerrain(S, { coast: true, coastAt: 2.3 });
  K.mountain(S, { x: 0, z: -0.6, r: 2.0, h: 0.8, rings: 4, sharp: 0.5, snow: false });
  S.claim(0, -0.6, 1.6);
  const y = 0.7;
  // stacked tiers like a candle
  let h = y;
  for (let i = 0; i < 4; i++) {
    const r = 0.75 - i * 0.12, th = 0.9 - i * 0.08;
    S.b.cyl(r * 0.95, r, th, { x: 0, z: -0.6, y: h, seg: 8, color: S.pal.stone, layer: 'tall' });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      S.b.box(0.08, 0.14, 0.02, { x: Math.cos(a) * r * 0.98, z: -0.6 + Math.sin(a) * r * 0.98, y: h + th * 0.5, ry: -a + Math.PI / 2, kind: 'glow', layer: 'glow', color: '#ffc477', glow: 2 });
    }
    h += th;
  }
  S.b.cone(0.4, 1.0, { x: 0, z: -0.6, y: h, seg: 8, color: S.pal.roof, layer: 'tall' });
  S.b.oct(0.1, { x: 0, z: -0.6, y: h + 1.15, kind: 'glow', layer: 'glow', color: '#ffd58a', glow: 3 });
  S.towers.push([0, -0.6, 0.75, h]);
  K.walls(S, { cx: 0, cz: -0.4, rx: 2.0, rz: 1.7, sides: 9, h: 0.6 });
  for (let i = 0; i < 4; i++) {
    const p = S.find(0.4, { cx: 0, cz: -0.4, spread: 1.6, tries: 20 });
    if (p) K.hall(S, { x: p[0], z: p[1], w: 0.6, d: 0.45, h: 0.45, ry: S.r.range(0, 1) });
  }
  K.houses(S, { cx: 0, cz: 1.4, spread: 1.0, n: 4 });
  C.decorate(S, new Set(['library', 'walls', 'towers', 'keep', 'mountain']), { treeCount: 6 });
}
