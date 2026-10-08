// Phase-2 kit pieces: the Planes and Realmspace (gears, chasms, ice, spheres, rings, floating rock tiles,
// orrery stands). Same conventions as pieces.js: every function takes a Site and adds to its Builder.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { HALF, WATER_Y, SEABED_Y, BOTTOM_Y } from './site.js';
import { mixHex, shade } from './palette.js';
import { noise2 } from './rng.js';
import { addColored } from './pieces.js';

const TAU = Math.PI * 2;
const tmpC = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _n = new THREE.Vector3();

/** Euler (YXZ, as placement() wants) that turns +y onto the unit vector n, then spins by `spin` about it */
export function alignTo(n, spin = 0) {
  _q.setFromUnitVectors(UP, _n.copy(n).normalize());
  if (spin) _q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, spin));
  _e.setFromQuaternion(_q, 'YXZ');
  return { rx: _e.x, ry: _e.y, rz: _e.z };
}

/* ================================================================= GEARS == */
/** one gear wheel into builder b (centred at the origin of b's current frame, axis +y) */
function gearGeo(b, { r = 1, thick = 0.18, teeth, color, hub }) {
  const n = teeth ?? Math.max(8, Math.round(r * 9));
  b.cyl(r, r, thick, { y: -thick / 2, seg: Math.max(12, n), color });
  b.cyl(r * 0.72, r * 0.72, thick * 1.08, { y: -thick * 0.54, seg: Math.max(12, n), color: shade(color, -0.12) });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    b.box(r * 0.2, thick, (TAU * r) / n * 0.5, { x: Math.cos(a) * (r + r * 0.08), z: Math.sin(a) * (r + r * 0.08), y: -thick / 2, ry: -a, color });
  }
  for (let i = 0; i < 4; i++) b.box(r * 1.3, thick * 1.2, r * 0.08, { y: -thick * 0.6, ry: (i * Math.PI) / 4, color: shade(color, 0.1) });
  b.cyl(r * 0.16, r * 0.16, thick * 2.2, { y: -thick * 1.1, seg: 8, color: hub || shade(color, -0.3) });
  return n;
}
/** a train of interlocking gears: horizontal ones on the ground, upright ones standing behind; they turn */
export function gearworks(S, { n = 4, cx = 0, cz = -0.6, upright = true, color } = {}) {
  const P = S.pal;
  const metal = color || mixHex('#b08a3a', P.accent, 0.25);
  const iron = mixHex('#6a6460', P.ink, 0.2);
  let x = cx - 1.6, z = cz, dir = 1, prevR = 0;
  for (let i = 0; i < n; i++) {
    const r = S.r.range(0.55, 1.15) * (i === 0 ? 1.2 : 1);
    const stand = upright && i % 2 === 0;
    if (i) { const a = S.r.range(-0.6, 0.6); x += Math.cos(a) * (prevR + r) * 0.98; z += Math.sin(a) * (prevR + r) * 0.6; }
    if (!S.inside(x, z, stand ? 0.3 : r * 0.6)) break;
    const b = new Builder();
    b.in('tall');
    const teeth = gearGeo(b, { r, color: i % 2 ? iron : metal });
    const g = b.build(S.ctx, 'gear');
    const y = S.y(x, z);
    const pivot = new THREE.Group();
    pivot.position.set(x, stand ? y + r + 0.12 : y + 0.22 + (i % 3) * 0.05, z);
    if (stand) {
      pivot.rotation.x = Math.PI / 2; pivot.rotation.z = S.r.range(-0.4, 0.4);
      // a trestle under the upright gear
      S.b.box(0.18, r + 0.12, 0.18, { x, z, y, color: iron, layer: 'low' });
    }
    pivot.add(g);
    S.extra.push(pivot);
    const speed = (dir * 0.6) / r;
    S.animate((t) => { g.rotation.y = t * speed; });
    S.claim(x, z, stand ? 0.4 : r);
    S.towers.push([x, z, Math.min(r, 0.5), stand ? r * 2 : 0.3]);
    dir = -dir; prevR = r;
    void teeth;
  }
}

/* ================================================================= CHASM == */
/** a jagged rift through the tile (terrain drops away), with a glow at the bottom (red for fire planes) */
export function chasm(S, { x = 0, z = 0.6, len = 3.4, w = 0.9, ang = S.r.range(-0.5, 0.5), glow = '#ff4a1a' } = {}) {
  S.pits.push({ x, z, len, w, ang, seed: S.seed });
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let t = -len / 2; t <= len / 2; t += 0.3) S.claim(x + ca * t, z + sa * t, w * 0.7);
  if (glow) {
    for (let t = -len / 2 + 0.3; t <= len / 2 - 0.3; t += 0.45) {
      S.b.box(0.5, 0.03, w * 0.5, { x: x + ca * t, z: z + sa * t, y: -0.7, ry: -ang, kind: 'glow', layer: 'glow', color: glow, glow: 2 });
    }
  }
}
/* =================================================================== ICE == */
/** ice floes and small bergs on the water */
export function iceFloes(S, { n = 14 } = {}) {
  for (let i = 0; i < n * 3 && n > 0; i++) {
    const x = S.r.range(-HALF + 0.5, HALF - 0.5), z = S.r.range(-HALF + 0.5, HALF - 0.5);
    if (S.wetness(x, z) < 0.25 || !S.free(x, z, 0.3, { water: true })) continue;
    S.claim(x, z, 0.3);
    const berg = S.r.chance(0.3);
    if (berg) S.b.rock(S.r.range(0.25, 0.45), { x, z, y: WATER_Y - 0.05, sy: S.r.range(1.2, 2.2), ry: S.r() * 6, color: S.r.chance(0.5) ? '#f4f8fa' : '#d6e8f0', layer: 'land' });
    else S.b.cyl(S.r.range(0.2, 0.45), S.r.range(0.25, 0.5), 0.06, { x, z, y: WATER_Y - 0.01, seg: 6, ry: S.r() * 6, color: '#eef5f7', layer: 'land' });
    n--;
  }
}
/** a glacier tongue along the north edge: stepped white-blue slabs with crevasse lines */
export function glacier(S, { z0 = -HALF + 0.2, depth = 2.4 } = {}) {
  const cols = ['#f2f7f9', '#e3eef3', '#d2e4ec'];
  for (let i = 0; i < 9; i++) {
    const x = -HALF + 0.55 + i * ((HALF * 2 - 1.1) / 8);
    const d = depth * S.r.range(0.65, 1);
    const h = S.r.range(0.45, 0.9);
    S.b.box(1.15, h, d, { x, z: z0 + d / 2, y: S.y(x, z0 + d / 2) - 0.05, ry: S.r.range(-0.08, 0.08), color: S.r.pick(cols), layer: 'land' });
    S.b.box(1.0, 0.03, 0.05, { x, z: z0 + d * 0.6, y: S.y(x, z0) + h - 0.02, color: '#9dbccc', layer: 'land' });
    S.claim(x, z0 + d / 2, 0.6);
  }
}

/* ======================================================== FLOATING TILE == */
/** For rocks adrift (asteroids, earthbergs, planes adrift): the tile is a round slab of land over a jagged
 *  rock underside instead of a square board; Site.water already holds the disc edge. */
export function floatTile(S, { R = 3.5, depth = 2.3, rings = 9, segs = 28 } = {}) {
  const P = S.pal, b = S.b;
  const pos = [], col = [];
  const wetBeyond = S.water.length > 1;
  const pt = (i, j) => {
    const t = i / rings, a = (j / segs) * TAU;
    const rr = R * t * (1 + (noise2(Math.cos(a) * 2 + S.seed, Math.sin(a) * 2) - 0.5) * 0.12 * t);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    return [x, Math.max(S.height(x, z), i === rings ? SEABED_Y : -Infinity), z];
  };
  const color = (y, x, z, slope) => {
    const n = noise2(x * 1.7 + S.seed, z * 1.7);
    if (wetBeyond && S.wetness(x, z) > 0 && Math.hypot(x, z) < R * 0.9 && y < WATER_Y) return mixHex(P.sand, P.waterDeep, Math.min(1, (WATER_Y - y) * 3));
    if (y < 0.02 && Math.hypot(x, z) > R * 0.8) return shade(P.rock, -0.1);
    if (S.pal.snowy && y > 0) return mixHex(P.snow, P.ground, 0.15 + n * 0.15);
    let c = n > 0.62 ? P.groundDark : P.ground;
    if (y > 0.35) c = mixHex(c, P.rock, Math.min(1, (y - 0.35) * 1.4 + slope));
    return c;
  };
  const tri = (p, q, w) => {
    pos.push(...p, ...q, ...w);
    const ym = (p[1] + q[1] + w[1]) / 3;
    const slope = Math.abs(Math.max(p[1], q[1], w[1]) - Math.min(p[1], q[1], w[1]));
    tmpC.set(color(ym, (p[0] + q[0] + w[0]) / 3, (p[2] + q[2] + w[2]) / 3, slope));
    for (let k = 0; k < 3; k++) col.push(tmpC.r, tmpC.g, tmpC.b);
  };
  const centre = [0, S.height(0, 0), 0];
  for (let j = 0; j < segs; j++) {
    tri(centre, pt(1, j + 1), pt(1, j));
    for (let i = 1; i < rings; i++) { const a = pt(i, j), q = pt(i, j + 1), c = pt(i + 1, j), d = pt(i + 1, j + 1); tri(a, q, d); tri(a, d, c); }
  }
  // underside: jagged rock cone down from the rim
  const urings = 4;
  const rim = (j) => pt(rings, j);
  const up = (i, j) => {
    if (i === 0) return rim(j);
    const t = i / urings, a = (j / segs) * TAU;
    const wob = 1 + (noise2(Math.cos(a) * 3 + S.seed, Math.sin(a) * 3 + i * 2) - 0.5) * 0.5;
    const rr = R * (1 - t * t * 0.92) * wob;
    return [Math.cos(a) * rr, SEABED_Y - t * depth * (0.8 + noise2(a * 2, t * 5 + S.seed) * 0.4), Math.sin(a) * rr];
  };
  const tip = [0, SEABED_Y - depth * 1.12, 0];
  const utri = (p, q, w, c) => { pos.push(...p, ...q, ...w); tmpC.set(c); for (let k = 0; k < 3; k++) col.push(tmpC.r, tmpC.g, tmpC.b); };
  for (let j = 0; j < segs; j++) {
    for (let i = 0; i < urings; i++) {
      const a = up(i, j), q = up(i, j + 1), c = up(i + 1, j), d = up(i + 1, j + 1);
      const k = (i + j) % 3 === 0 ? -0.08 : 0;
      utri(a, d, q, shade(i === 0 ? P.groundDark : P.rock, k - i * 0.07));
      utri(a, c, d, shade(P.rock, k - i * 0.08));
    }
    utri(up(urings, j), tip, up(urings, j + 1), P.rockDark);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  addColored(b, g, col, 'base', 'solid');
  if (wetBeyond) b.geo(new THREE.CircleGeometry(R * 0.93, 28).rotateX(-Math.PI / 2).translate(0, WATER_Y, 0), { kind: 'water', layer: 'water', color: P.water });
  return SEABED_Y - depth * 1.12;
}

/** the orrery stand: a brass foot on the board and a rod up to `top` */
export function orreryStand(S, { top = 1, r = 1.1 } = {}) {
  const brass = '#a8792c', dark = '#6e4f22';
  S.b.cyl(r, r * 1.08, 0.14, { y: BOTTOM_Y, seg: 16, color: dark, layer: 'base' });
  S.b.cyl(r * 0.8, r * 0.85, 0.1, { y: BOTTOM_Y + 0.14, seg: 16, color: brass, layer: 'base' });
  S.b.cyl(0.07, 0.09, Math.max(0.1, top - BOTTOM_Y - 0.24), { y: BOTTOM_Y + 0.24, seg: 6, color: brass, layer: 'base' });
}

/* ============================================================== SPHERES == */
/** a faceted world: kind = earth | ocean | ice | desert | moon | rock | gas | sun; returns the builder */
export function sphereBody(b, { R = 2, kind = 'earth', pal, seed = 1, detail = 3, layer = 'land', snowCaps = false }) {
  const geo = new THREE.IcosahedronGeometry(R, detail);
  const sea = mixHex('#2f6a86', pal.accent, 0.15), seaDeep = shade(sea, -0.2);
  const n3 = (p, f = 1.3) => noise2(p.x * f / R * 1.6 + seed, p.z * f / R * 1.6 + p.y / R * 2.1) * 0.6 + noise2(p.y * f / R * 2.4 - seed, p.x * f / R * 2.1) * 0.4;
  const fn = {
    earth: (n, p) => {
      const lat = Math.abs(p.y / R);
      if (snowCaps && lat > 0.78) return '#f1f4f4';
      const k = n3(p);
      if (k < 0.5) return k < 0.4 ? seaDeep : sea;
      return k > 0.68 ? mixHex('#8a8f62', pal.base, 0.2) : k > 0.6 ? mixHex('#5f8a4c', pal.base, 0.15) : mixHex('#7da05a', pal.base, 0.2);
    },
    ocean: (n, p) => { const k = n3(p, 2); const lat = Math.abs(p.y / R); if (snowCaps && lat > 0.8) return '#eef4f6'; return k > 0.72 ? mixHex('#c9b98a', pal.base, 0.3) : k > 0.5 ? sea : seaDeep; },
    ice: (n, p) => { const k = n3(p, 2.2); return k > 0.6 ? '#f4f8fa' : k > 0.45 ? '#dbe9f0' : k > 0.35 ? '#b9d2df' : mixHex('#8fb3c8', pal.accent, 0.2); },
    desert: (n, p) => { const k = n3(p, 1.8); return k > 0.62 ? shade(mixHex('#c79a5a', pal.base, 0.3), -0.1) : k > 0.44 ? mixHex('#ddb877', pal.base, 0.3) : k > 0.38 ? '#7d8f58' : mixHex('#e6c88d', pal.base, 0.3); },
    moon: (n, p) => { const k = n3(p, 3); return k > 0.66 ? '#b8b6ae' : k < 0.32 ? '#9c9a94' : mixHex('#e2e0d8', pal.base, 0.15); },
    rock: (n, p) => { const k = n3(p, 2.5); return k > 0.6 ? shade(mixHex('#5d5464', pal.accent, 0.25), -0.15) : mixHex('#6e6876', pal.accent, 0.2); },
    gas: (n, p) => {
      const y = p.y / R + (noise2(p.x / R * 3 + seed, p.z / R * 3) - 0.5) * 0.18;
      const band = Math.floor((y + 1) * 6.5);
      const cols = [mixHex('#d9b98a', pal.base, 0.3), mixHex('#c68a5a', pal.accent, 0.3), '#e8d6b0', mixHex('#a86a4a', pal.accent, 0.4), '#f0e2c4', mixHex('#b8925e', pal.base, 0.2)];
      return cols[(band + 12) % cols.length];
    },
    sun: (n, p) => { const k = n3(p, 3); return k > 0.62 ? '#ffd27a' : k > 0.45 ? '#ffb347' : '#ff9a3a'; },
  }[kind] || ((n, p) => (n3(p) > 0.5 ? pal.ground : pal.groundDark));
  b.geo(geo, { colorFn: fn, kind: kind === 'sun' ? 'glow' : 'solid', glow: 1.25, layer: kind === 'sun' ? 'glow' : layer });
  return b;
}

/** a flat banded ring around a world (in builder b), tilted */
export function planetRing(b, { r0 = 2.6, r1 = 3.8, tilt = 0.4, color = '#d8c39a', layer = 'land' }) {
  const geo = new THREE.RingGeometry(r0, r1, 48, 3).rotateX(-Math.PI / 2);
  const cols = [color, shade(color, -0.15), shade(color, 0.12), shade(color, -0.3)];
  b.geo(geo, { rx: tilt, rz: tilt * 0.4, colorFn: (n, p) => cols[Math.floor(((Math.hypot(p.x, p.z) - r0) / (r1 - r0)) * 7) % cols.length], layer });
}

/** small buildings set on a sphere's surface, oriented along the normal */
export function sphereCity(b, { R, n = 8, seed = 1, colors = ['#e9dfc9', '#d2c4a8'], roof = '#8e2f1f', r = Math.random, spires = 0, glow = null }) {
  const v = new THREE.Vector3();
  for (let i = 0; i < n + spires; i++) {
    const u = r() * 2 - 1, a = r() * TAU;
    const lat = Math.max(-0.8, Math.min(0.85, u));
    v.set(Math.cos(a) * Math.sqrt(1 - lat * lat), lat, Math.sin(a) * Math.sqrt(1 - lat * lat));
    const o = { x: v.x * R * 0.98, y: v.y * R * 0.98, z: v.z * R * 0.98, ...alignTo(v, r() * TAU) };
    b.push(o);
    if (i < n) {
      const s = 0.14 + r() * 0.12;
      b.box(s * 1.4, s * 1.2, s, { color: colors[i % colors.length], layer: 'low' });
      b.cone(s * 0.9, s * 0.9, { y: s * 1.2, seg: 4, ry: Math.PI / 4, color: roof, layer: 'low' });
    } else {
      b.cyl(0.05, 0.08, 0.7 + r() * 0.5, { seg: 6, color: colors[0], layer: 'tall' });
      if (glow) b.oct(0.06, { y: 1.25, kind: 'glow', layer: 'glow', color: glow, glow: 2.5 });
    }
    b.pop();
  }
  void seed;
}

