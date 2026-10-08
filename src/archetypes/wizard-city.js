// Wizard city: impossible needle spires with glowing tips, floating motes, a central tower of arcane light.
export default function compose(S, K, C) {
  C.setupTerrain(S);
  const P = S.pal;
  const R = C.cityRadius(S);
  const p0 = S.find(0.6, { spread: 0.8, tries: 30 }) || [0, 0];
  K.tower(S, { x: p0[0], z: p0[1], r: 0.42, h: 3.0 + S.scale * 0.5, roof: 'spire', roofColor: P.accent, banner: false });
  S.b.oct(0.22, { x: p0[0], z: p0[1], y: S.y(p0[0], p0[1]) + 3.0 + S.scale * 0.5 + 2.6, kind: 'glow', layer: 'glow', color: P.glow, glow: 3 });
  S.claim(p0[0], p0[1], 0.7);
  C.cityCore(S, { radius: R, cx: p0[0] * 0.3, spires: 3 + S.scale, towers: 1 + Math.floor(S.scale / 2), towerRoof: 'spire', walls: S.has('walls'), keep: S.has('keep') });
  if (!S.has('glow')) S.motifs.add('glow');
  C.decorate(S, new Set(['spires', 'towers', 'walls', 'keep', 'domes', 'temple']), { treeCount: 10 });
}
