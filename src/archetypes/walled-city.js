// Walled city: a full ring of curtain walls with a gatehouse facing the viewer, central keep, temple, towers.
export default function compose(S, K, C) {
  C.setupTerrain(S);
  const R = C.cityRadius(S);
  C.cityCore(S, { radius: R, cz: S.terrain === 'coast' ? -0.6 : 0, walls: true, keep: true, wallSides: 8 + (S.scale > 3 ? 2 : 0) });
  C.decorate(S, new Set(['walls', 'keep', 'castle', 'towers', 'spires', 'temple', 'domes', 'gate']), { treeCount: 12 });
}
