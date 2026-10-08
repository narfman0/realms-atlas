// Island keep: a castle crowning a sheer, wooded spire of rock in the middle of a wide river, joined to both
// banks by drawbridges; a town on one bank, conifers and mountains behind (Castle Hartwick on the Clear Whirl).
import { WATER_Y } from '../kit/index.js';

export default function compose(S, K, C) {
  const P = S.pal, r = S.r, s = S.seed;
  S.pal.water = S.pal.snowy ? '#a9c6d2' : P.water;
  // the river runs north-south through the middle; the island is a dry disc inside it
  const W = 1.25, IR = 0.95;
  const centre = (z) => Math.sin(z * 0.55 + s) * 0.25;
  S.water.push((x, z) => Math.min(W - Math.abs(x - centre(z)), Math.hypot(x - centre(0), z) - IR));
  S.riverAng = Math.PI / 2; // for decorate(): along z
  const ix = centre(0);

  // the granite spire, then the keep on its flat top
  const top = 1.9 + S.scale * 0.15;
  K.mountain(S, { x: ix, z: 0, r: IR * 1.02, h: top + 0.05, rings: 5, segs: 12, sharp: 0.35, snow: false, color: P.rock, bare: true });
  S.claim(ix, 0, IR + 0.2);
  const kw = 0.8, kd = 0.66, kh = 0.6 + S.scale * 0.1;
  K.keep(S, { x: ix, z: -0.05, y: top, w: kw, d: kd, h: kh, roof: 'crenel', color: P.stone });
  for (const [sx, sz] of [[-1, 0.7], [1, 0.7], [0.9, -0.8]]) {
    K.tower(S, { x: ix + sx * 0.5, z: sz * 0.42, y: top - 0.05, r: 0.16, h: kh + 0.45, roof: 'cone', color: P.stone, window: false });
  }
  // spruce clinging to the rock's shoulders, below the keep
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.4, d = IR * r.range(0.62, 0.85);
    const x = ix + Math.cos(a) * d, z = Math.sin(a) * d;
    const y = top * Math.pow(1 - d / (IR * 1.02), 0.35) * 0.82;
    S.b.instance('tree-con', { x, y: Math.max(WATER_Y, y - 0.08), z, ry: r() * 6, s: r.range(0.55, 0.8), color: P.leafDark, layer: 'land' });
  }

  // two drawbridges, west and east, from the rock's foot to the banks
  for (const sgn of [-1, 1]) {
    const z = 0.25;
    const x1 = ix + sgn * (IR * 0.75), x2 = centre(z) + sgn * (W + 0.25);
    K.bridge(S, { x1, z1: z, x2, z2: z, w: 0.26 });
    S.claim(x2 + sgn * 0.2, z, 0.3);
  }

  // the town on the west bank
  const tx = -W - 1.55;
  K.houses(S, { cx: tx, cz: 0.6, spread: 1.4, n: 7 + S.scale * 4, snow: P.snowy, zone: (x) => x < -W - 0.35 });
  if (S.has('palisade')) K.palisade(S, { cx: tx - 0.2, cz: 0.6, r: 1.55 });
  if (S.has('standing-stone')) {
    const p = S.find(0.45, { tries: 60, zone: (x, z) => x > W + 0.8 && z > 0.6 });
    if (p) K.standingStone(S, { x: p[0], z: p[1], h: 1.3 });
  }
  if (S.has('mountain')) {
    K.mountain(S, { x: -2.9, z: -3.3, r: 1.6, h: 2.6, snowLine: 0.45 });
    K.mountain(S, { x: 3.0, z: -3.0, r: 1.4, h: 2.1, snowLine: 0.45, salt: 7 });
  }
  K.trees(S, { n: 26, type: 'con', zone: (x) => Math.abs(x - centre(0)) > W + 0.4 });
  C.decorate(S, new Set(['castle', 'keep', 'towers', 'bridge', 'river', 'trees', 'mountain', 'palisade', 'standing-stone', 'snow']), { trees: false });
}
