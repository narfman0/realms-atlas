// Drow city: a cavern with hanging stalactite-palaces, spires grown from the floor and violet faerie fire.
export default function compose(S, K, C) {
  const P = S.pal;
  S.pal.ground = K.mixHex('#625a70', P.base, 0.2);
  S.pal.groundDark = K.shade(S.pal.ground, -0.2);
  S.pal.rock = '#6a6378';
  C.setupTerrain(S, { hills: false, coast: false, lake: S.has('lake') });
  K.cavern(S, { h: 4.6, stalactites: 22, stalagmites: 4 });
  const ff = ['#c47aff', '#ff6ad5', '#7a9cff'];
  const n = 3 + S.scale * 2;
  for (let i = 0; i < n; i++) {
    const p = S.find(0.35, { spread: 3.2, tries: 30, zone: (x, z) => z > -2.8 });
    if (p) K.stalagSpire(S, { x: p[0], z: p[1], h: S.r.range(1.6, 3.4) + S.scale * 0.2, r: S.r.range(0.22, 0.38), color: K.mixHex('#6a6474', P.accent, 0.2), glow: S.r.pick(ff) });
  }
  if (S.any('castle')) {
    const p = S.find(0.6, { tries: 30, zone: (x, z) => z < 0 });
    if (p) K.keep(S, { x: p[0], z: p[1], w: 0.8, d: 0.7, h: 1.2, color: '#5d5768', roofColor: P.accent, banner: false });
  }
  K.houses(S, { cx: 0, cz: 0.6, spread: 2.6, n: 6 + S.scale * 4, flat: true, walls: ['#8a8098', '#7c748a', '#958aa3'], roofs: ['#5a5068', '#6b4a7a'] });
  if (S.has('bridge')) for (let i = 0; i < 2; i++) S.b.box(2.6, 0.06, 0.16, { x: S.r.range(-1, 1), z: S.r.range(-1.5, 1.5), y: 1.6 + i * 0.6, ry: S.r.range(0, 3), color: '#6a6474', layer: 'tall' });
  K.glowPoints(S, { n: 16 + S.scale * 3, color: ff[0], spread: 3.6, y0: 0.4, y1: 3.8 });
  K.glowPoints(S, { n: 8, color: ff[1], spread: 3.2, y0: 0.4, y1: 3.0 });
  C.decorate(S, new Set(['cavern', 'stalactites', 'spires', 'faerie-fire', 'glow', 'castle', 'bridge']), { treeCount: 0 });
}
