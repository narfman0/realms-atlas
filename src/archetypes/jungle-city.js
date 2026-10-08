// Jungle city: a stepped ziggurat over a harbour town, palms and dense green.
export default function compose(S, K, C) {
  C.setupTerrain(S);
  const P = S.pal;
  const zp = S.find(1.1, { cz: -1.2, spread: 1.2, tries: 40 }) || [0, -1.4];
  K.pyramid(S, { x: zp[0], z: zp[1], w: 2.0, h: 1.6, steps: 5, color: K.mixHex(P.stone, '#b7a27a', 0.5) });
  C.cityCore(S, { radius: C.cityRadius(S) * 0.9, cz: 0.2, walls: S.has('walls'), keep: false, towers: 0, roofs: ['#b28a4a', '#9c7a42', P.roof], wallColors: [P.plaster, '#e5cfa0'] });
  K.trees(S, { n: 30, type: 'palm', size: 1.1 });
  C.decorate(S, new Set(['ziggurat', 'walls', 'keep', 'towers', 'temple', 'domes']), { treeCount: 18 });
}
