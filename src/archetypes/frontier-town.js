// Frontier town: a handful of timber houses inside a palisade, a watchtower, fields cut from the wild.
export default function compose(S, K, C) {
  C.setupTerrain(S);
  const R = 1.2 + S.scale * 0.35;
  const p = S.find(0.35, { spread: 1, tries: 20 }) || [0, 0];
  K.tower(S, { x: p[0], z: p[1], r: 0.22, h: 1.5, shape: 'square', roof: 'cone', color: S.pal.wood, roofColor: K.shade(S.pal.wood, -0.25) });
  C.cityCore(S, { radius: R, walls: S.has('walls'), palisade: true, keep: S.has('keep'), towers: 0, houses: 6 + S.scale * 5, wallColors: [K.mixHex(S.pal.wood, S.pal.plaster, 0.5), S.pal.plaster], roofs: [K.shade(S.pal.wood, -0.2), S.pal.roof] });
  C.decorate(S, new Set(['walls', 'keep', 'palisade', 'towers']), { treeCount: 20 });
}
