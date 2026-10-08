// Tower keep: one tall wizard's or lord's tower, maybe a domed annex, on a crag.
export default function compose(S, K, C) {
  C.setupTerrain(S, { hills: false });
  K.mountain(S, { x: 0, z: -0.5, r: 1.9, h: 0.9, rings: 4, sharp: 0.6, snow: false });
  S.claim(0, -0.5, 1.5);
  const y = 0.75;
  K.tower(S, { x: 0, z: -0.5, y, r: 0.45, h: 2.6 + S.scale * 0.4, roof: 'spire', banner: true });
  for (const s of [-1, 1]) K.tower(S, { x: s * 0.75, z: -0.25, y: y - 0.15, r: 0.25, h: 1.6, roof: 'cone' });
  if (S.has('domes')) K.domeHall(S, { x: 0.2, z: 0.4, y: 0.35, r: 0.45, h: 0.5 });
  K.walls(S, { cx: 0, cz: -0.3, rx: 1.6, rz: 1.4, sides: 7, h: 0.45 });
  K.houses(S, { cx: 0.5, cz: 2.0, spread: 1.2, n: 3 + S.scale });
  if (S.has('mountain')) K.mountain(S, { x: -2.6, z: -3.0, r: 1.7, h: 2.8 });
  C.decorate(S, new Set(['keep', 'towers', 'domes', 'walls', 'mountain', 'gate']), { treeCount: 8 });
}
