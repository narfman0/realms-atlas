// Harbor metropolis: dense city stepping down to a southern harbour full of ships; walls, towers, a castle on
// high ground (a mountain at the back if the motif asks for it), lighthouse on the mole.
export default function compose(S, K, C) {
  C.setupTerrain(S, { coast: S.terrain !== 'swamp' || S.has('harbor') });
  const done = new Set(['walls', 'towers', 'spires', 'keep', 'castle', 'temple', 'domes']);
  if (S.has('mountain')) {
    K.mountain(S, { x: -2.3, z: -2.9, r: 2.0, h: 2.6 + S.scale * 0.25 });
    done.add('mountain');
  }
  const R = C.cityRadius(S) * 1.05;
  C.cityCore(S, { cx: 0.3, cz: -0.4, radius: R, keep: S.any('castle', 'keep'), keepAt: S.has('mountain') ? [-1.4, -0.9] : [0, -1], towers: (S.has('towers') ? 2 : 1) + S.scale, spires: S.has('spires') ? 2 + S.scale : 0, walls: S.has('walls') });
  // a mole with a lighthouse if the city is large
  if (!S.has('lighthouse') && S.scale >= 4) done.add('lighthouse-auto');
  C.decorate(S, done, { treeCount: 6 });
}
