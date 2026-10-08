// Wheel (reserved): the future Planescape layout — Sigil at the hub, the Outlands' gate-towns on a ring, the
// Outer Planes of the Great Wheel around them. Places with world !== 'toril' will be arranged here.
// Not active yet: it falls back to a simple ring so that the layout API stays exercised.
import { STEP, boundsOf } from './common.js';

export function wheel(places) {
  const n = places.length;
  const R = Math.max(STEP * 2, (n * STEP) / (2 * Math.PI));
  const items = places.map((_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: Math.cos(a) * R, z: Math.sin(a) * R, s: 1, ry: -a + Math.PI / 2 };
  });
  return { name: 'wheel', items, labels: [], order: places.map((_, i) => i), bounds: boundsOf(items) };
}
