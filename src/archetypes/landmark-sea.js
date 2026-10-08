// Landmark sea: open water filling the tile, sails, rocky islets, a lighthouse, glimmers.
export default function compose(S, K, C) {
  // everything is sea except two rocky islets
  S.water.push((x, z) => Math.min(1.5, Math.hypot(x + 2.6, z + 2.4) - 1.0, Math.hypot(x - 2.8, z - 2.6) - 0.6));
  S.landFloor = 0;
  K.lighthouse(S, { x: -2.6, z: -2.4, h: 1.8 });
  S.claim(-2.6, -2.4, 0.9);
  K.boulders(S, { n: 2, cx: 2.8, cz: 2.6, spread: 0.4, size: 0.3 });
  K.ships(S, { n: 4 + Math.floor(S.scale / 2) });
  if (S.has('glow')) K.glowPoints(S, { n: 10, color: '#bfe6ff', spread: 3.5, y0: 0.05, y1: 0.4 });
  C.decorate(S, new Set(['ships', 'harbor', 'lighthouse', 'glow', 'docks']), { treeCount: 3 });
}
