// Desert city: flat-roofed sandstone houses, great domes and slender minarets, a pyramid or ziggurat, palms.
export default function compose(S, K, C) {
  C.setupTerrain(S);
  const P = S.pal;
  const R = C.cityRadius(S);
  const sand = K.mixHex(P.sand, P.base, 0.4);
  const p0 = S.find(1.0, { spread: 1, tries: 30 }) || [0, -0.4];
  K.domeHall(S, { x: p0[0], z: p0[1], r: 0.8 + S.scale * 0.06, h: 0.8, color: K.mixHex(P.plaster, sand, 0.3), domeColor: P.accent, sy: 1.15 });
  for (let i = 0; i < 2 + Math.floor(S.scale / 1.5); i++) {
    const p = S.find(0.25, { cx: p0[0], cz: p0[1], spread: R * 0.9, tries: 30 });
    if (p) K.minaret(S, { x: p[0], z: p[1], h: 2.0 + S.scale * 0.3, color: K.mixHex(P.plaster, sand, 0.2), domeColor: P.accent });
  }
  if (S.has('pyramid')) { const p = S.find(1.1, { tries: 40, zone: (x, z) => Math.hypot(x, z) > 1.5 }); if (p) K.pyramid(S, { x: p[0], z: p[1], w: 1.8, h: 1.5 }); }
  if (S.has('ziggurat')) { const p = S.find(1.1, { tries: 40 }); if (p) K.pyramid(S, { x: p[0], z: p[1], w: 1.8, h: 1.4, steps: 5 }); }
  C.cityCore(S, { radius: R, flat: true, walls: S.has('walls'), keep: S.has('keep') || S.has('castle'), towers: 0, spires: 0, domes: true, wallColors: [K.mixHex(P.plaster, sand, 0.5), sand, K.shade(sand, 0.15)], roofs: [K.mixHex(P.plaster, sand, 0.3), sand] });
  C.decorate(S, new Set(['domes', 'minarets', 'pyramid', 'ziggurat', 'walls', 'keep', 'castle']), { treeCount: 6 });
}
