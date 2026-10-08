// Landmark mountain: a range of snowy peaks filling the tile, conifers on the foothills.
export default function compose(S, K, C) {
  C.setupTerrain(S, { hills: false });
  if (S.terrain === 'cavern') {
    K.cavern(S, { h: 4, stalactites: 20 });
  } else {
    const n = 3 + Math.floor(S.scale / 2);
    for (let i = 0; i < n; i++) {
      const x = -3 + (6 * i) / (n - 1) + S.r.range(-0.4, 0.4), z = S.r.range(-2.2, 0.2) - Math.abs(x) * 0.1;
      K.mountain(S, { x, z, r: S.r.range(1.6, 2.3), h: S.r.range(2.6, 4.2) + S.scale * 0.2, snowLine: 0.5, salt: i * 11 });
    }
    K.mountain(S, { x: 0, z: -2.6, r: 2.6, h: 4.6 + S.scale * 0.25, snowLine: 0.45, salt: 99 });
  }
  C.decorate(S, new Set(['mountain', 'snow']), { treeCount: 24 });
}
