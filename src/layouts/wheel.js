// Wheel: the Planes as the Outlands seen from above. Sigil hangs over the centre on top of the Spire; the
// sixteen gate-towns sit on an inner ring at their `ring.order` angle (clockwise from the north, Excelsior at
// 0); each Outer Plane's signature site sits on the outer ring at the same angle as its gate-town. Places
// without a ring (the City of Brass, any extra) go to the board's corners.
import { TILE, STEP } from './common.js';

export const WHEEL = { R1: 40, R2: 68, SPIRE_H: 15, N: 16 };

const isSigil = (p) => p.id === 'ps-sigil' || (p.visual?.motifs || []).includes('ring-city') || p.archetype === 'ring-city';
const isSpire = (p) => p.id === 'ps-the-spire' || /\bspire\b/i.test(p.name) && p.type === 'landmark' && !p.ring;
const isGate = (p) => p.ring && (p.ring.plane != null || p.region === 'outlands' || p.region === 'gate-towns');
const angleOf = (order) => (order / WHEEL.N) * Math.PI * 2;

export function wheel(places) {
  const { R1, R2, SPIRE_H } = WHEEL;
  const items = new Array(places.length);
  const used = new Map(); // ring|order -> count (two places at one angle are nudged apart)
  const corners = [[1, -1], [-1, -1], [1, 1], [-1, 1]];
  let corner = 0, sigil = -1, spire = -1;
  places.forEach((p, i) => {
    if (sigil < 0 && isSigil(p)) { sigil = i; items[i] = { x: 0, z: 0, y: SPIRE_H, s: 1.25, ry: 0 }; return; }
    if (spire < 0 && isSpire(p)) { spire = i; items[i] = { x: 0, z: 0, s: 1.3, ry: 0 }; return; }
    if (p.ring && Number.isInteger(p.ring.order)) {
      const inner = isGate(p);
      const R = inner ? R1 : R2;
      const key = `${inner}|${p.ring.order}`;
      const k = used.get(key) || 0;
      used.set(key, k + 1);
      const a = angleOf(p.ring.order) + (k ? (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (STEP * 0.9) / R : 0);
      items[i] = { x: Math.sin(a) * R, z: -Math.cos(a) * R, s: inner ? 0.92 : 1.05, ry: 0, angle: a };
      return;
    }
    const [cx, cz] = corners[corner++ % 4];
    const d = R2 * 0.98 + Math.floor((corner - 1) / 4) * STEP;
    items[i] = { x: cx * d, z: cz * d, s: 1.05, ry: 0 };
  });
  // if there is no explicit spire, Sigil still rises above the board centre
  // tour: Sigil, the Spire, then round the wheel — each gate-town followed by its plane
  const rank = (i) => {
    if (i === sigil) return -2;
    if (i === spire) return -1;
    const p = places[i];
    if (p.ring && Number.isInteger(p.ring.order)) return p.ring.order * 2 + (isGate(p) ? 0 : 1);
    return 100 + i;
  };
  const order = places.map((_, i) => i).sort((a, b) => rank(a) - rank(b));
  const half = Math.max(...items.map((it) => Math.max(Math.abs(it.x), Math.abs(it.z)))) + TILE * 1.9;
  const bounds = { x0: -half, x1: half, z0: -half, z1: half };
  return { name: 'wheel', items, labels: [], order, bounds, R1, R2, sigil, spire };
}
