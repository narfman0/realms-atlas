// Market town: an open cluster of houses round a square with a market hall, fields and a windmill.
export default function compose(S, K, C) {
  C.setupTerrain(S);
  const R = C.cityRadius(S) * 0.85;
  K.patch(S, { x: 0, z: 0, w: 0.9, d: 0.9, color: K.mixHex(S.pal.sand, S.pal.stone, 0.4), layer: 'low' });
  S.claim(0, 0, 0.45);
  K.hall(S, { x: 0.8, z: -0.2, w: 1.0, d: 0.6, h: 0.55 });
  S.claim(0.8, -0.2, 0.6);
  C.cityCore(S, { radius: R, walls: S.has('walls'), keep: S.has('castle') || S.has('keep'), towers: S.has('towers') ? 1 : 0 });
  if (!S.has('farms')) S.motifs.add('farms');
  C.decorate(S, new Set(['walls', 'keep', 'castle', 'towers', 'temple', 'domes']), { treeCount: 14 });
}
