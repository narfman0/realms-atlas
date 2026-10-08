// Orbit: Realmspace as an orrery. The sun at the centre, each body on its own circle at `orbit.radius`
// (0 = the sun, 1 = the outermost world), satellites (`satelliteOf`) set along their primary's circle a little
// ahead of and behind it, and the crystal shell as a fragment out at the rim. Every item carries its orbit
// (r, a0, w) so the board can draw the circles and the app can let the bodies drift.
import { TILE, STEP } from './common.js';

export const ORBIT = { R0: 16, RMAX: 80 };
const GOLDEN = 2.399963;

const isShell = (p) => /crystal-shell|crystal-sphere/.test(p.id) || /crystal (shell|sphere)/i.test(p.name);

export function orbit(places) {
  const { R0, RMAX } = ORBIT;
  const items = new Array(places.length);
  const byId = new Map(places.map((p, i) => [p.id, i]));
  const radiusOf = (p) => {
    const r = p.orbit?.radius;
    if (!(r > 0)) return 0;
    return R0 + Math.min(1, r) * (RMAX - R0);
  };
  // angular speed: Kepler-ish (slower further out), very slow
  const speed = (r) => (r > 0 ? 0.035 * Math.pow(R0 / r, 1.5) : 0);
  const sats = [];
  let shells = 0;
  places.forEach((p, i) => {
    if (isShell(p)) {
      const a = Math.PI * 0.25 + shells++ * 0.5;
      items[i] = { x: Math.sin(a) * (RMAX + 13), z: -Math.cos(a) * (RMAX + 13), s: 1.2, ry: 0, orbit: { r: RMAX + 13, a0: a, w: 0 }, shell: true };
      return;
    }
    const sat = p.satelliteOf && byId.has(p.satelliteOf) && p.satelliteOf !== p.id;
    if (sat) { sats.push(i); return; }
    const r = radiusOf(p);
    const idx = p.orbit?.index ?? i;
    const a = r > 0 ? idx * GOLDEN + 0.9 : 0;
    items[i] = { x: Math.sin(a) * r, z: -Math.cos(a) * r, s: r > 0 ? 1.3 : 1.7, ry: 0, orbit: { r, a0: a, w: speed(r) } };
  });
  // satellites: alternate ahead / behind the primary along its circle, at distinct angles
  const count = new Map();
  for (const i of sats) {
    const pi = byId.get(places[i].satelliteOf);
    const P = items[pi];
    if (!P) { items[i] = { x: 0, z: 0, s: 0.7, ry: 0, orbit: { r: 0, a0: 0, w: 0 } }; continue; }
    const k = (count.get(pi) || 0) + 1;
    count.set(pi, k);
    const r = Math.max(P.orbit.r, STEP);
    const da = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (STEP * 0.95) / r;
    const a = P.orbit.a0 + da;
    items[i] = { x: Math.sin(a) * r, z: -Math.cos(a) * r, s: 0.95, ry: 0, orbit: { r, a0: a, w: P.orbit.w }, satellite: pi };
  }
  const order = places.map((_, i) => i).sort((a, b) => items[a].orbit.r - items[b].orbit.r || items[a].orbit.a0 - items[b].orbit.a0);
  const rings = [...new Set(items.filter((it) => !it.shell && it.orbit.r > 0).map((it) => +it.orbit.r.toFixed(2)))].sort((a, b) => a - b);
  const half = RMAX + TILE * 2.2;
  return { name: 'orbit', items, labels: [], order, bounds: { x0: -half, x1: half, z0: -half, z1: half }, rings, RMAX };
}

/** advance every item along its circle to time t (seconds); returns the items for chaining */
export function orbitAt(L, t) {
  for (const it of L.items) {
    const o = it.orbit;
    if (!o || !o.w) continue;
    const a = o.a0 + o.w * t;
    it.x = Math.sin(a) * o.r;
    it.z = -Math.cos(a) * o.r;
  }
  return L;
}
