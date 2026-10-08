// Frozen town: snow-roofed houses behind a palisade on a white plain by a frozen lake, conifers, a mountain.
export default function compose(S, K, C) {
  S.pal.snowy = true;
  S.pal.water = '#c9dfe6';
  C.setupTerrain(S, { lake: true });
  K.mountain(S, { x: S.r.sign() * 2.4, z: -3.1, r: 1.7, h: 2.6, snow: true, snowLine: 0.4 });
  const R = 1.4 + S.scale * 0.35;
  C.cityCore(S, { radius: R, cz: 0.4, walls: S.has('walls'), palisade: !S.has('walls'), keep: S.has('keep') || S.has('castle'), towers: S.has('towers') ? 2 : 0 });
  C.decorate(S, new Set(['walls', 'palisade', 'keep', 'castle', 'towers', 'mountain', 'snow', 'lake']), { treeCount: 16 });
}
