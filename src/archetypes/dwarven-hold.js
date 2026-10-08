// Dwarven hold: a great mountain with a carved gate flanked by statues, a stair, forge-glow and mine mouths.
// On cavern terrain the hold is a cutaway hall under the rock.
export default function compose(S, K, C) {
  const P = S.pal;
  const cave = S.terrain === 'cavern';
  C.setupTerrain(S, { hills: false, river: S.has('river') });
  if (cave) {
    S.pal.ground = K.mixHex(P.rock, '#4a4450', 0.5);
    S.pal.groundDark = K.shade(S.pal.ground, -0.15);
    K.cavern(S, { h: 4, stalactites: 14, stalagmites: 4 });
  } else {
    K.mountain(S, { x: 0, z: -2.0, r: 3.2, h: 3.2 + S.scale * 0.35, rings: 6, segs: 16, snowLine: 0.55 });
    for (const s of [-1, 1]) K.mountain(S, { x: s * 2.9, z: -3.0, r: 1.5, h: 2.3, salt: s * 5 });
  }
  // the gate: a carved facade at the foot of the mountain
  const gz = cave ? -1.2 : -0.35;
  const fw = 1.2 + S.scale * 0.15, fh = 1.0 + S.scale * 0.18;
  S.b.box(fw + 0.6, fh + 0.3, 0.5, { x: 0, z: gz - 0.1, color: K.shade(P.stoneDark, -0.05), layer: 'tall' });
  S.b.box(fw * 0.45, fh * 0.75, 0.52, { x: 0, z: gz - 0.08, color: '#1e1a1c', layer: 'tall' });
  S.b.prism(fw + 0.8, 0.45, 0.6, { x: 0, z: gz - 0.1, y: fh + 0.3, color: P.stoneDark, layer: 'tall' });
  S.b.box(fw * 0.3, 0.05, 0.05, { x: 0, z: gz + 0.17, y: fh * 0.15, kind: 'glow', layer: 'glow', color: '#ff9a3c', glow: 1.6 });
  S.towers.push([0, gz, fw / 2, fh]);
  for (const s of [-1, 1]) {
    // guardian statues
    S.b.box(0.42, 0.25, 0.42, { x: s * (fw / 2 + 0.55), z: gz + 0.45, color: P.stoneDark, layer: 'low' });
    S.b.cyl(0.14, 0.2, 1.0 + S.scale * 0.12, { x: s * (fw / 2 + 0.55), z: gz + 0.45, y: 0.25, seg: 6, color: K.shade(P.stone, -0.15), layer: 'tall' });
    S.b.sphere(0.13, { x: s * (fw / 2 + 0.55), z: gz + 0.45, y: 1.4 + S.scale * 0.12, color: K.shade(P.stone, -0.15), layer: 'tall' });
    S.towers.push([s * (fw / 2 + 0.55), gz + 0.45, 0.25, 1.3]);
  }
  // stair / causeway down to the plain
  for (let i = 0; i < 5; i++) S.b.box(fw * 0.6, 0.06, 0.25, { x: 0, z: gz + 0.35 + i * 0.25, y: 0.3 - i * 0.06, color: P.stoneDark, layer: 'low' });
  S.claim(0, gz + 0.6, 1.0);
  for (let i = 0; i < Math.ceil(S.scale / 2); i++) {
    const p = S.find(0.4, { tries: 30, zone: (x, z) => z > 0.4 });
    if (p) K.keep(S, { x: p[0], z: p[1], w: 0.7, d: 0.6, h: 0.8, roof: 'crenel', banner: false });
  }
  K.houses(S, { cx: 0, cz: 1.9, spread: 1.6, n: 4 + S.scale * 3, flat: true, walls: [P.stoneDark, P.stone], roofs: [K.shade(P.stoneDark, -0.1)] });
  if (S.has('walls')) K.walls(S, { cx: 0, cz: 1.2, rx: 2.6, rz: 1.6, sides: 8, h: 0.5 });
  if (!S.has('mines')) S.motifs.add('mines');
  C.decorate(S, new Set(['mountain', 'gate', 'keep', 'castle', 'walls', 'statue', 'cavern', 'towers']), { treeCount: cave ? 0 : 6 });
}
