// Ruin: broken walls and tower stumps among rubble and weeds; optionally a cutaway mountain (Undermountain)
// or a cavern. The ruin's "thriving" look is still a ruin; when the record says it was rebuilt, the
// archetype's sparse houses and the status system's full scale stand in for the restored town.
export default function compose(S, K, C) {
  const P = S.pal;
  const cave = S.terrain === 'cavern';
  C.setupTerrain(S, { hills: S.terrain !== 'cavern' });
  if (cave || (S.has('mountain') && S.has('cavern'))) {
    // cutaway mountain: a mountain at the back with a dark mouth and glowing depths
    K.mountain(S, { x: 0, z: -1.9, r: 3.0, h: 3.6, rings: 5, segs: 14 });
    S.b.box(1.4, 1.2, 0.4, { x: 0, z: -0.45, y: 0, color: '#1b1719', layer: 'land' });
    S.b.box(0.8, 0.12, 0.05, { x: 0, z: -0.24, y: 0.3, kind: 'glow', layer: 'glow', color: '#8affc4', glow: 2 });
    for (let i = 0; i < 4; i++) S.b.cone(0.08, 0.35, { x: -0.5 + i * 0.33, z: -0.3, y: 1.2, rx: Math.PI, seg: 5, color: P.rock, layer: 'land' });
    S.claim(0, -0.4, 0.9);
  }
  const R = 1.4 + S.scale * 0.4;
  K.brokenWalls(S, { r: R, n: 9 + S.scale, layer: 'low' });
  for (let i = 0; i < 2 + S.scale; i++) {
    const p = S.find(0.4, { spread: R, tries: 30 });
    if (p) K.brokenTower(S, { x: p[0], z: p[1], r: S.r.range(0.25, 0.45), h: S.r.range(0.4, 1.6), layer: 'tall' });
  }
  if (S.has('keep')) { const p = S.find(0.7, { spread: 1, tries: 30 }); if (p) K.brokenTower(S, { x: p[0], z: p[1], r: 0.6, h: 1.3, layer: 'tall' }); }
  K.rubble(S, { spread: R, n: 26 + S.scale * 6, layer: 'low' });
  K.houses(S, { spread: R * 0.7, n: 2 + S.scale, flat: true, walls: [P.stoneDark] });
  C.decorate(S, new Set(['ruins', 'rubble', 'walls', 'keep', 'mountain', 'cavern', 'stalactites']), { treeCount: 18 });
}
