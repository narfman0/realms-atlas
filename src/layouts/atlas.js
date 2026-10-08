// Atlas: places grouped by region in columns (three tiles wide), in two bands: the west and north above,
// the heartlands and the east below. Inside a column places read north → south by their map position.
import { STEP, REGION_ORDER, regionName, boundsOf } from './common.js';

const BANDS = [
  ['sword-coast-north', 'silver-marches', 'underdark', 'western-heartlands'],
  ['heartlands-east', 'moonsea-and-north-east', 'east-and-south'],
];

export function atlas(places) {
  const present = new Set(places.map((p) => p.region));
  const extra = [...present].filter((r) => !REGION_ORDER.includes(r));
  const bands = BANDS.map((b) => b.filter((r) => present.has(r)));
  if (extra.length) bands.push(extra);
  const items = new Array(places.length);
  const labels = [];
  const order = [];
  const COLS = 3;
  const colGap = STEP * 0.6;
  const colW = (COLS - 1) * STEP;
  let z = 0;
  for (const band of bands.filter((b) => b.length)) {
    const width = band.length * colW + (band.length - 1) * (colGap + STEP);
    let x = -width / 2;
    let maxRows = 0;
    for (const r of band) {
      const idx = places.map((p, i) => [p, i]).filter(([p]) => p.region === r);
      idx.sort((a, b) => (a[0].map?.y ?? 0) - (b[0].map?.y ?? 0) || (a[0].map?.x ?? 0) - (b[0].map?.x ?? 0));
      idx.forEach(([, i], k) => {
        const c = k % COLS, row = Math.floor(k / COLS);
        items[i] = { x: x + c * STEP, z: z + row * STEP, s: 1, ry: 0 };
        order.push(i);
      });
      const rows = Math.ceil(idx.length / COLS);
      maxRows = Math.max(maxRows, rows);
      labels.push({ text: regionName(r), sub: `${idx.length} places`, x: x + colW / 2, z: z - STEP * 0.68, kind: 'region' });
      x += colW + STEP + colGap;
    }
    z += maxRows * STEP + STEP * 0.75;
  }
  const oz = -(z - STEP * 0.75 - STEP) / 2;
  for (const it of items) it.z += oz;
  for (const l of labels) l.z += oz;
  const b = boundsOf(items);
  b.z0 -= STEP * 0.6; // room for the region captions
  return { name: 'atlas', items, labels, order, bounds: b };
}
