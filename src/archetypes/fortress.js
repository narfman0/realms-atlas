// Fortress: a great keep inside concentric walls on a rise; few houses; banners.
export default function compose(S, K, C) {
  C.setupTerrain(S, { hills: false });
  S.addHill(0, -0.3, 2.6, 0.5);
  S.flatten.push([0, -0.3, 1.5]);
  S.landFloor = 0;
  const h = 1.4 + S.scale * 0.3;
  K.keep(S, { x: 0, z: -0.3, w: 1.4 + S.scale * 0.12, d: 1.2 + S.scale * 0.1, h, roof: 'crenel' });
  S.claim(0, -0.3, 1.1);
  K.walls(S, { cx: 0, cz: -0.3, rx: 1.75, rz: 1.55, sides: 6, h: 0.65 + S.scale * 0.06, rot: 0.3 });
  if (S.scale >= 3) K.walls(S, { cx: 0, cz: -0.1, rx: 2.9, rz: 2.6, sides: 8, h: 0.5, rot: 0.1, towerRoof: 'cone' });
  K.houses(S, { cx: 0, cz: 1.6, spread: 1.6, n: 4 + S.scale * 2 });
  if (S.has('mountain')) K.mountain(S, { x: S.r.sign() * 2.6, z: -3.0, r: 1.6, h: 2.6 });
  C.decorate(S, new Set(['walls', 'keep', 'castle', 'towers', 'gate', 'mountain']), { treeCount: 10 });
}
