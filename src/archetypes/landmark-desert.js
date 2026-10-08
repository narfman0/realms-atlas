// Landmark desert: rolling dunes, wind-carved rocks, a half-buried ruin, a caravan of tents.
export default function compose(S, K, C) {
  const P = S.pal;
  S.terrain = 'desert';
  S.noiseAmp = 0.05;
  for (let i = 0; i < 7; i++) S.addHill(S.r.range(-3.8, 3.8), S.r.range(-3.8, 3.8), S.r.range(1.0, 2.0), S.r.range(0.2, 0.55));
  for (let i = 0; i < 4; i++) {
    const p = S.find(0.6, { tries: 20 });
    if (p) K.mountain(S, { x: p[0], z: p[1], r: S.r.range(0.4, 0.8), h: S.r.range(0.8, 1.6), rings: 3, segs: 6, sharp: 0.3, snow: false, color: K.mixHex(P.rock, '#b88a5a', 0.5), salt: i, bare: true });
  }
  if (S.has('snow')) { K.mountain(S, { x: -2.6, z: -3.0, r: 1.5, h: 2.0, snowLine: 0.5 }); }
  C.decorate(S, new Set(['snow']), { treeCount: 0 });
}
