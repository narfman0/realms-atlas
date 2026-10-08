// Chronicle: places sorted by when they first appear, left → right, one row (or more, wrapped) per era.
import { STEP, boundsOf } from './common.js';
import { ERAS, appearYear, fmtYearShort } from '../time.js';

export function chronicle(places) {
  const items = new Array(places.length);
  const labels = [];
  const order = [];
  const MAX = 14;
  const sorted = places.map((p, i) => [appearYear(p), i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const rows = [];
  for (const era of ERAS) {
    const inEra = sorted.filter(([y]) => y >= era.from && (y < era.to || era === ERAS[ERAS.length - 1]) || (era === ERAS[0] && y < era.from));
    if (!inEra.length) continue;
    for (let k = 0; k < inEra.length; k += MAX) rows.push({ era, list: inEra.slice(k, k + MAX), first: k === 0 });
  }
  const width = Math.max(...rows.map((r) => r.list.length)) * STEP;
  let z = 0;
  const startX = -width / 2 + STEP / 2;
  for (const row of rows) {
    if (row.first && z > 0) z += STEP * 0.35; // a little air between eras
    row.list.forEach(([, i], c) => { items[i] = { x: startX + c * STEP, z, s: 1, ry: 0 }; order.push(i); });
    if (row.first) labels.push({ text: row.era.short || row.era.name, sub: `${fmtYearShort(row.era.from)} – ${fmtYearShort(row.era.to)} DR`, x: startX - STEP * 0.95, z, kind: 'era' });
    row.z = z;
    z += STEP;
  }
  const oz = -(z - STEP) / 2;
  for (const it of items) it.z += oz;
  for (const l of labels) l.z += oz;
  const b = boundsOf(items);
  b.x0 -= STEP * 1.6; // room for the era captions on the left
  return { name: 'chronicle', items, labels, order, bounds: b };
}
