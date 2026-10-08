// Landmark forest: a sea of trees with a few giants. On cavern terrain (Araumycos) the "trees" are fungal
// masses: giant pale mushrooms under a cave roof, glowing spores.
export default function compose(S, K, C) {
  const P = S.pal;
  const fungal = S.terrain === 'cavern' || /fung|mushroom|myc/i.test(`${S.place.visual?.notes || ''} ${(S.place.tags || []).join(' ')}`);
  C.setupTerrain(S, { hills: false });
  if (fungal) {
    S.pal.ground = K.mixHex('#5c5466', P.base, 0.2);
    S.pal.groundDark = K.shade(S.pal.ground, -0.15);
    K.cavern(S, { h: 4.2, stalactites: 14, stalagmites: 2 });
    K.trees(S, { n: 10, type: 'mushroom', size: 2.4, colors: ['#e0d4e8', '#c9b5d9', '#d8c2c9'] });
    K.trees(S, { n: 26, type: 'mushroom', size: 1.2, colors: ['#b49ccc', '#d4b8c8', '#9fb0c8'] });
    K.glowPoints(S, { n: 26, color: '#a8f0d0', spread: 3.6, y0: 0.4, y1: 3.2, size: 0.05 });
    C.decorate(S, new Set(['cavern', 'giant-trees', 'glow', 'stalactites']), { trees: false });
    return;
  }
  if (S.has('mountain')) { K.mountain(S, { x: S.r.sign() * 2.6, z: -3, r: 1.6, h: 2.4 }); }
  K.trees(S, { n: 4 + S.scale, type: 'giant', size: 1.1 });
  K.trees(S, { n: 110, type: 'mixed', size: 1.05, dense: true });
  C.decorate(S, new Set(['giant-trees', 'trees', 'mountain']), { trees: false });
}
