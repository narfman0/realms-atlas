// The architecture kit. Every function takes a Site `S` (see site.js) and options, and adds geometry to the
// site's Builder (S.b) in the current or given layer. Sizes are in tile units (the tile is 9.2 wide);
// most pieces scale with S.scale (1 hamlet … 5 metropolis) where it makes sense.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { HALF, WATER_Y, SEABED_Y, BOTTOM_Y } from './site.js';
import { mixHex, shade } from './palette.js';
import { noise2 } from './rng.js';

const TAU = Math.PI * 2;
const tmpC = new THREE.Color();

/* ================================================================ GROUND == */

/** The tile: a heightfield (land, shores, seabed) with skirts down to the tile bottom, plus a water plane. */
export function groundTile(S, { res = 30 } = {}) {
  const b = S.b, P = S.pal;
  const step = (HALF * 2) / res;
  const H = new Float32Array((res + 1) * (res + 1));
  for (let i = 0; i <= res; i++) for (let j = 0; j <= res; j++) H[i * (res + 1) + j] = S.height(-HALF + i * step, -HALF + j * step);
  const pos = [];
  const col = [];
  const push = (x, y, z) => pos.push(x, y, z);
  const faceColor = (y, slope, x, z) => {
    const n = noise2(x * 1.7 + S.seed, z * 1.7);
    if (S.pits.length && y < -0.18 && S.isLand(x, z, -0.05)) return y < -0.55 ? '#1e1614' : mixHex(P.rockDark, '#2a1d17', 0.4);
    if (y < WATER_Y - 0.02) return mixHex(P.sand, P.waterDeep, Math.min(1, (WATER_Y - y) * 3));
    if (y < 0.03 && S.water.length && !S.isLand(x, z, 0.45)) return P.sand;
    if (S.pal.snowy && y > 0.0) return mixHex(P.snow, P.ground, 0.15 + n * 0.15);
    let c = n > 0.62 ? P.groundDark : P.ground;
    if (y > 0.35) c = mixHex(c, P.rock, Math.min(1, (y - 0.35) * 1.4 + slope));
    return c;
  };
  for (let i = 0; i < res; i++) for (let j = 0; j < res; j++) {
    const x0 = -HALF + i * step, z0 = -HALF + j * step, x1 = x0 + step, z1 = z0 + step;
    const a = H[i * (res + 1) + j], bb = H[(i + 1) * (res + 1) + j], c = H[i * (res + 1) + j + 1], d = H[(i + 1) * (res + 1) + j + 1];
    const tris = (i + j) % 2 ? [[x0, a, z0, x0, c, z1, x1, bb, z0], [x1, bb, z0, x0, c, z1, x1, d, z1]] : [[x0, a, z0, x0, c, z1, x1, d, z1], [x0, a, z0, x1, d, z1, x1, bb, z0]];
    for (const t of tris) {
      const ym = (t[1] + t[4] + t[7]) / 3;
      const slope = Math.abs(Math.max(t[1], t[4], t[7]) - Math.min(t[1], t[4], t[7])) / step;
      tmpC.set(faceColor(ym, slope, (t[0] + t[3] + t[6]) / 3, (t[2] + t[5] + t[8]) / 3));
      push(t[0], t[1], t[2]); push(t[3], t[4], t[5]); push(t[6], t[7], t[8]);
      for (let k = 0; k < 3; k++) col.push(tmpC.r, tmpC.g, tmpC.b);
    }
  }
  // skirts
  const side = new THREE.Color(P.side);
  const sideW = new THREE.Color(shade(P.waterDeep, -0.2));
  const edge = (xa, za, ya, xb, zb, yb) => {
    const wa = Math.max(ya, S.water.length && ya < WATER_Y ? WATER_Y : ya), wb = Math.max(yb, S.water.length && yb < WATER_Y ? WATER_Y : yb);
    const c = (ya < WATER_Y || yb < WATER_Y) ? sideW : side;
    pos.push(xa, wa, za, xb, BOTTOM_Y, zb, xb, wb, zb, xa, wa, za, xa, BOTTOM_Y, za, xb, BOTTOM_Y, zb);
    for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
  };
  for (let i = 0; i < res; i++) {
    const xa = -HALF + i * step, xb = xa + step;
    edge(xa, HALF, H[i * (res + 1) + res], xb, HALF, H[(i + 1) * (res + 1) + res]); // south (+z)
    edge(xb, -HALF, H[(i + 1) * (res + 1)], xa, -HALF, H[i * (res + 1)]); // north
    edge(HALF, xb, H[res * (res + 1) + i + 1], HALF, xa, H[res * (res + 1) + i]); // east
    edge(-HALF, xa, H[i], -HALF, xb, H[i + 1]); // west
  }
  // bottom plate
  const bc = new THREE.Color(shade(P.side, -0.3));
  pos.push(-HALF, BOTTOM_Y, -HALF, HALF, BOTTOM_Y, -HALF, HALF, BOTTOM_Y, HALF, -HALF, BOTTOM_Y, -HALF, HALF, BOTTOM_Y, HALF, -HALF, BOTTOM_Y, HALF);
  for (let k = 0; k < 6; k++) col.push(bc.r, bc.g, bc.b);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // ensure the skirt winding renders from outside: flat normals are computed per face, material is FrontSide
  addColored(b, g, col, 'base', 'solid');
  // water plane
  if (S.water.length && !S.pits.length) {
    const wg = new THREE.PlaneGeometry(HALF * 2, HALF * 2, 12, 12).rotateX(-Math.PI / 2).translate(0, WATER_Y, 0);
    b.geo(wg, { kind: 'water', layer: 'water', color: P.water });
  } else if (S.water.length) {
    // with a chasm on the tile, water only where it is wet (so the rift stays dry and dark)
    const n = 24, st = (HALF * 2) / n, wp = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x0 = -HALF + i * st, z0 = -HALF + j * st;
      if (S.wetness(x0 + st / 2, z0 + st / 2) < -0.35) continue;
      wp.push(x0, WATER_Y, z0, x0, WATER_Y, z0 + st, x0 + st, WATER_Y, z0, x0 + st, WATER_Y, z0, x0, WATER_Y, z0 + st, x0 + st, WATER_Y, z0 + st);
    }
    if (wp.length) {
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
      b.geo(wg, { kind: 'water', layer: 'water', color: P.water });
    }
  }
}

/** add a pre-coloured geometry to the builder (bypassing the single-colour path) */
export function addColored(b, g, colors, layer, kind) {
  b.geo(g, { layer, kind, color: '#ffffff' });
  const L = b.parts.get(layer).get(kind);
  const last = L[L.length - 1];
  last.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

/** a flat coloured patch on the ground (fields, plazas, sand, scorched earth) */
export function patch(S, { x = 0, z = 0, w = 1, d = 1, color, ry = 0, layer = 'land', y } = {}) {
  S.b.box(w, 0.03, d, { x, z, ry, y: (y ?? S.y(x, z)) + 0.005, color: color || S.pal.groundDark, layer });
}

/* ============================================================== BUILDINGS == */

/** round or square tower with a roof: cone | spire | flat | crenel | dome | onion */
export function tower(S, o = {}) {
  const P = S.pal, b = S.b;
  const { x = 0, z = 0, r = 0.35, h = 2, shape = 'round', roof = 'cone', layer = 'tall' } = o;
  const y = o.y ?? S.y(x, z);
  const color = o.color || P.stone;
  const roofColor = o.roofColor || P.roof;
  const seg = shape === 'round' ? 8 : 4;
  const ry = shape === 'square' ? Math.PI / 4 + (o.ry || 0) : 0;
  b.cyl(r * 0.92, r, h, { x, y, z, seg, ry, color, layer });
  const top = y + h;
  if (roof === 'cone' || roof === 'spire') {
    const rh = roof === 'spire' ? r * 5 : r * 2.2;
    b.cyl(r * 1.12, r * 1.12, 0.12, { x, y: top, z, seg, ry, color: shade(color, -0.1), layer });
    b.cone(r * 1.15, rh, { x, y: top + 0.12, z, seg, ry, color: roofColor, layer });
  } else if (roof === 'dome' || roof === 'onion') {
    b.cyl(r * 1.05, r * 1.05, 0.1, { x, y: top, z, seg, ry, color: shade(color, -0.1), layer });
    b.dome(r * 1.02, { x, y: top + 0.1, z, sy: roof === 'onion' ? 1.6 : 1, color: roofColor, layer });
    if (roof === 'onion') b.cone(r * 0.2, r * 0.9, { x, y: top + 0.1 + r * 1.5, z, seg: 5, color: P.gold, layer });
  } else if (roof === 'crenel' || roof === 'flat') {
    b.cyl(r * 1.15, r * 1.0, 0.22, { x, y: top, z, seg, ry, color, layer });
    if (roof === 'crenel') {
      const n = shape === 'round' ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + ry;
        b.box(r * 0.35, 0.18, r * 0.35, { x: x + Math.cos(a) * r * 0.95, y: top + 0.22, z: z + Math.sin(a) * r * 0.95, ry: -a, color, layer });
      }
    }
  }
  if (o.banner) banner(S, { x, z, y: top + (roof === 'spire' ? r * 5 : roof === 'cone' ? r * 2.2 : 0.3) + 0.1, color: o.bannerColor || P.roof });
  if (o.window !== false && h > 1.2) b.box(r * 0.5, 0.22, 0.03, { x, y: y + h * 0.72, z: z + r * 0.92, color: '#ffc477', kind: 'glow', glow: 1.6, layer: 'glow' });
  S.towers.push([x, z, r, h]);
  return top;
}

/** slender needle spire, optionally with a glowing tip */
export function spire(S, o = {}) {
  const P = S.pal, b = S.b;
  const { x = 0, z = 0, r = 0.22, h = 3, layer = 'tall' } = o;
  const y = o.y ?? S.y(x, z);
  const color = o.color || P.stone;
  b.cyl(r * 0.75, r, h * 0.62, { x, y, z, seg: 6, color, layer });
  b.cyl(r * 0.95, r * 0.95, 0.08, { x, y: y + h * 0.62, z, seg: 6, color: shade(color, -0.12), layer });
  b.cone(r * 0.78, h * 0.38, { x, y: y + h * 0.62 + 0.08, z, seg: 6, color: o.tipColor || color, layer });
  if (o.glowTip) b.oct(r * 0.45, { x, y: y + h + 0.15, z, kind: 'glow', layer: 'glow', color: o.glowColor || P.glow, glow: 2.5 });
  S.towers.push([x, z, r, h]);
}

/** a domed hall: drum + dome (+ optional lantern) */
export function domeHall(S, o = {}) {
  const P = S.pal, b = S.b;
  const { x = 0, z = 0, r = 0.7, h = 0.8, layer = 'low' } = o;
  const y = o.y ?? S.y(x, z);
  b.cyl(r, r * 1.04, h, { x, y, z, seg: 10, color: o.color || P.plaster, layer });
  b.dome(r * 0.96, { x, y: y + h, z, seg: 12, sy: o.sy ?? 1, color: o.domeColor || P.roof, layer: o.domeLayer || 'tall' });
  b.cone(r * 0.12, r * 0.5, { x, y: y + h + r * (o.sy ?? 1) * 0.95, z, seg: 5, color: P.gold, layer: o.domeLayer || 'tall' });
  S.towers.push([x, z, r, h + r]);
}

/** minaret: slender shaft, balcony, small dome, finial */
export function minaret(S, o = {}) {
  const P = S.pal, b = S.b;
  const { x = 0, z = 0, h = 2.6, r = 0.14 } = o;
  const y = o.y ?? S.y(x, z);
  const color = o.color || P.plaster;
  b.cyl(r * 0.85, r, h, { x, y, z, seg: 8, color, layer: 'tall' });
  b.cyl(r * 1.6, r * 1.2, 0.1, { x, y: y + h * 0.72, z, seg: 8, color: shade(color, -0.1), layer: 'tall' });
  b.cyl(r * 0.7, r * 0.7, h * 0.15, { x, y: y + h, z, seg: 8, color, layer: 'tall' });
  b.dome(r * 0.85, { x, y: y + h * 1.15, z, sy: 1.5, color: o.domeColor || P.roof, layer: 'tall' });
  b.cone(r * 0.2, r * 1.2, { x, y: y + h * 1.15 + r * 1.2, z, seg: 4, color: P.gold, layer: 'tall' });
  S.towers.push([x, z, r * 1.5, h]);
}

/** keep: a massive block with corner turrets and a pitched or crenellated top */
export function keep(S, o = {}) {
  const P = S.pal, b = S.b;
  const { x = 0, z = 0, w = 1.4, d = 1.2, h = 1.6, ry = 0 } = o;
  const y = o.y ?? S.y(x, z);
  const color = o.color || P.stone;
  b.push({ x, y, z, ry });
  b.box(w, h, d, { color, layer: 'tall' });
  b.box(w * 1.04, 0.18, d * 1.04, { y: h, color: shade(color, -0.08), layer: 'tall' });
  if (o.roof === 'pitched') b.prism(w * 0.95, h * 0.45, d * 0.9, { y: h + 0.18, color: o.roofColor || P.roof, layer: 'tall' });
  else for (let i = 0; i < Math.round(w / 0.32); i++) {
    b.box(0.14, 0.16, 0.14, { x: -w / 2 + 0.16 + i * 0.32, y: h + 0.18, z: d / 2, color, layer: 'tall' });
    b.box(0.14, 0.16, 0.14, { x: -w / 2 + 0.16 + i * 0.32, y: h + 0.18, z: -d / 2, color, layer: 'tall' });
  }
  const tr = Math.min(w, d) * 0.2;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    b.cyl(tr, tr, h + 0.55, { x: (sx * w) / 2, z: (sz * d) / 2, seg: 8, color, layer: 'tall' });
    b.cone(tr * 1.25, tr * 2.4, { x: (sx * w) / 2, y: h + 0.55, z: (sz * d) / 2, seg: 8, color: o.roofColor || P.roof, layer: 'tall' });
  }
  // door + windows
  b.box(w * 0.18, h * 0.3, 0.04, { y: 0, z: d / 2 + 0.01, color: shade(P.ink, 0.1), layer: 'tall' });
  b.box(w * 0.5, 0.1, 0.03, { y: h * 0.65, z: d / 2 + 0.02, color: '#ffc477', kind: 'glow', glow: 1.4, layer: 'glow' });
  b.pop();
  S.towers.push([x, z, Math.max(w, d) / 2, h]);
  if (o.banner !== false) banner(S, { x, z, y: y + h + 0.34, color: o.bannerColor || P.roof });
}

/** a ring (polygon/ellipse) of curtain walls with towers at the corners; skips segments over water */
export function walls(S, o = {}) {
  const P = S.pal, b = S.b;
  const { cx = 0, cz = 0, rx = 3, rz = 3, sides = 8, h = 0.7, t = 0.22, rot = 0, towerR = 0.26, gate = true } = o;
  const color = o.color || P.stoneDark;
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * TAU;
    pts.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]);
  }
  const gateIdx = gate ? pts.reduce((best, p, i) => (p[1] + pts[(i + 1) % sides][1] > pts[best][1] + pts[(best + 1) % sides][1] ? i : best), 0) : -1;
  const solid = [];
  for (let i = 0; i < sides; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % sides];
    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const ok = S.isLand(mx, mz, -0.1) && S.inside(mx, mz, 0, 0.05);
    solid.push(ok);
    if (!ok) continue;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ang = Math.atan2(z2 - z1, x2 - x1);
    const y = Math.min(S.y(x1, z1), S.y(x2, z2), S.y(mx, mz));
    if (i === gateIdx) {
      // split around a gatehouse
      const gw = 0.5;
      const seg = (len - gw) / 2;
      for (const sgn of [-1, 1]) {
        b.box(seg, h, t, { x: mx + Math.cos(ang) * sgn * (gw / 2 + seg / 2), z: mz + Math.sin(ang) * sgn * (gw / 2 + seg / 2), y, ry: -ang, color, layer: 'low' });
      }
      b.box(gw + 0.3, h * 1.5, t * 1.8, { x: mx, z: mz, y, ry: -ang, color, layer: 'low' });
      b.box(gw * 0.6, h * 0.9, t * 1.9, { x: mx, z: mz, y, ry: -ang, color: shade(P.ink, 0.15), layer: 'low' });
      b.box(gw + 0.4, 0.12, t * 2, { x: mx, z: mz, y: y + h * 1.5, ry: -ang, color: shade(color, -0.1), layer: 'low' });
      S.gate = [mx, mz, ang];
    } else {
      b.box(len + t * 0.5, h, t, { x: mx, z: mz, y, ry: -ang, color, layer: 'low' });
      b.box(len + t * 0.5, 0.08, t * 1.35, { x: mx, z: mz, y: y + h, ry: -ang, color: shade(color, -0.1), layer: 'low' });
    }
    S.claim(mx, mz, 0.3);
  }
  for (let i = 0; i < sides; i++) {
    if (!solid[i] && !solid[(i + sides - 1) % sides]) continue;
    const [x, z] = pts[i];
    if (!S.inside(x, z, towerR, 0.05)) continue;
    tower(S, { x, z, r: towerR, h: h * 1.6, roof: o.towerRoof || 'crenel', color, roofColor: P.roof, layer: 'low', window: false });
    S.claim(x, z, towerR + 0.1);
  }
  return pts;
}

/** palisade ring of stakes */
export function palisade(S, { cx = 0, cz = 0, r = 2.6, h = 0.45, gap = 0.6 } = {}) {
  const n = Math.round((TAU * r) / 0.16);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    if (Math.abs(((a - Math.PI / 2 + TAU) % TAU) - 0) < gap / r) continue; // gate facing +z
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (!S.isLand(x, z, 0) || !S.inside(x, z, 0.1)) continue;
    S.b.cyl(0.05, 0.06, h * S.r.range(0.85, 1.1), { x, z, y: S.y(x, z), seg: 4, color: S.pal.wood, layer: 'low' });
  }
}

/** instanced house cluster around (cx, cz). Fills free cells; returns how many were placed. */
export function houses(S, o = {}) {
  const P = S.pal, r = S.r;
  const { cx = 0, cz = 0, spread = 2.5, n = 20, size = 0.42, flat = false, grid = true } = o;
  const ang = o.ang ?? r.range(0, Math.PI / 2);
  const roofs = o.roofs || [P.roof, P.roofAlt, shade(P.roof, -0.15), mixHex(P.roof, P.plaster, 0.3)];
  const wallsC = o.walls || [P.plaster, mixHex(P.plaster, P.stone, 0.5), shade(P.plaster, -0.06)];
  let placed = 0;
  for (let i = 0; i < n * 9 && placed < n; i++) {
    const a = r() * TAU, d = Math.pow(r(), 0.7) * spread;
    let x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (o.zone && !o.zone(x, z)) continue;
    if (grid) { // snap to a street grid rotated by ang
      const c = Math.cos(ang), s = Math.sin(ang);
      const u = Math.round((x * c + z * s) / 0.55) * 0.55, v = Math.round((-x * s + z * c) / 0.5) * 0.5;
      x = u * c - v * s; z = u * s + v * c;
    }
    const sz = size * r.range(0.8, 1.25);
    if (!S.free(x, z, sz * 0.62)) continue;
    S.claim(x, z, sz * 0.62);
    const y = S.y(x, z);
    const hh = r.range(0.85, 1.5) * (o.tall ?? 1);
    const ry = -(ang + (grid ? 0 : r.range(-0.4, 0.4))) + (r.chance(0.5) ? Math.PI / 2 : 0);
    const wc = o.snow ? mixHex(r.pick(wallsC), '#ffffff', 0.15) : r.pick(wallsC);
    S.b.instance('house-wall', { x, y, z, ry, sx: sz, sy: sz * hh, sz: sz, color: wc, layer: o.layer || 'low' });
    S.b.instance(flat ? 'house-flat' : 'house-roof', { x, y: y + sz * hh * 0.8 - sz * 0.8, z, ry, sx: sz, sy: flat ? sz : sz * r.range(0.9, 1.3), sz: sz, color: o.snow ? P.snow : r.pick(roofs), layer: o.layer || 'low' });
    placed++;
  }
  S.blocks.push([cx, cz, spread]);
  return placed;
}

/** generic rectangular hall with gable roof (guildhall, barn, temple base) */
export function hall(S, o = {}) {
  const P = S.pal, b = S.b;
  const { x = 0, z = 0, w = 1.2, d = 0.7, h = 0.7, ry = 0, layer = 'low' } = o;
  const y = o.y ?? S.y(x, z);
  b.box(w, h, d, { x, y, z, ry, color: o.color || P.plaster, layer });
  b.prism(w * 1.08, h * 0.6, d * 1.12, { x, y: y + h, z, ry, color: o.roofColor || P.roof, layer });
}

/** temple: stepped base, columns, pediment */
export function temple(S, o = {}) {
  const P = S.pal, b = S.b;
  const { x = 0, z = 0, w = 1.3, d = 0.9, h = 0.65, ry = 0 } = o;
  const y = o.y ?? S.y(x, z);
  const c = o.color || mixHex(P.stone, '#ffffff', 0.4);
  b.push({ x, y, z, ry });
  b.box(w + 0.2, 0.08, d + 0.2, { color: c, layer: 'low' });
  b.box(w + 0.1, 0.08, d + 0.1, { y: 0.08, color: c, layer: 'low' });
  const nc = Math.max(4, Math.round(w / 0.22));
  for (let i = 0; i < nc; i++) for (const sz of [-1, 1]) b.cyl(0.05, 0.05, h, { x: -w / 2 + 0.08 + (i * (w - 0.16)) / (nc - 1), y: 0.16, z: (sz * d) / 2 - sz * 0.06, seg: 6, color: c, layer: 'tall' });
  b.box(w * 0.7, h * 0.9, d * 0.6, { y: 0.16, color: shade(c, -0.08), layer: 'low' });
  b.box(w + 0.05, 0.08, d + 0.05, { y: 0.16 + h, color: c, layer: 'tall' });
  b.prism(w + 0.05, 0.3, d + 0.1, { y: 0.24 + h, color: o.roofColor || c, layer: 'tall' });
  b.pop();
  S.towers.push([x, z, w / 2, h]);
}

/** arena: elliptical ring of tiers */
export function arena(S, { x = 0, z = 0, r = 0.9 } = {}) {
  const P = S.pal, y = S.y(x, z);
  for (let i = 0; i < 3; i++) S.b.torus(r - i * 0.12, 0.12, { x, y: y + 0.1 + i * 0.16, z, rx: Math.PI / 2, seg: 18, sy: 0.9, color: shade(P.stone, -i * 0.06), layer: 'low' });
  patch(S, { x, z, w: r * 1.1, d: r * 1.1, color: P.sand, layer: 'low' });
  S.towers.push([x, z, r, 0.5]);
}

/** windmill with turning sails (sub-piece) */
export function windmill(S, { x = 0, z = 0, h = 1.1 } = {}) {
  const P = S.pal;
  const y = S.y(x, z);
  S.b.cyl(0.22, 0.32, h, { x, y, z, seg: 8, color: P.plaster, layer: 'low' });
  S.b.cone(0.3, 0.35, { x, y: y + h, z, seg: 8, color: P.roof, layer: 'low' });
  const sb = new Builder();
  sb.in('low');
  for (let i = 0; i < 4; i++) sb.box(0.12, 0.75, 0.02, { ry: 0, rz: (i * Math.PI) / 2, y: 0, color: '#efe6d2', x: 0 });
  const g = sb.build(S.ctx, 'windmill');
  // sails are built around the origin; the box bottom sits at y=0 so rotating rz swings them as blades
  g.position.set(x, y + h * 0.85, z + 0.34);
  S.extra.push(g);
  const ph = S.r() * 6;
  S.animate((t) => { g.rotation.z = t * 0.8 + ph; });
}

/** banner on a pole that sways */
export function banner(S, { x, y, z, color }) {
  const sb = new Builder();
  sb.in('tall');
  sb.cyl(0.015, 0.015, 0.4, { seg: 3, color: S.pal.ink });
  sb.box(0.22, 0.13, 0.01, { x: 0.11, y: 0.25, color: color || S.pal.roof });
  const g = sb.build({ ...S.ctx, ink: false }, 'banner');
  g.position.set(x, y, z);
  S.extra.push(g);
  const ph = S.r() * 6;
  S.animate((t) => { g.rotation.y = Math.sin(t * 1.3 + ph) * 0.35 + 0.4; });
}

/* =============================================================== NATURE == */

const TREE_PROTO = { dec: 'tree-dec', con: 'tree-con', giant: 'tree-giant', palm: 'tree-palm', mushroom: 'mushroom' };

/** instanced trees scattered in a zone. type: dec | con | giant | palm | mushroom | mixed */
export function trees(S, o = {}) {
  const P = S.pal, r = S.r;
  const { n = 12, cx = 0, cz = 0, spread = HALF, type = 'dec', size = 1, layer = 'land' } = o;
  let placed = 0;
  for (let i = 0; i < n * 5 && placed < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * spread;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (o.zone && !o.zone(x, z)) continue;
    const t = type === 'mixed' ? (r.chance(0.5) ? 'dec' : 'con') : type;
    const rad = t === 'giant' ? 0.7 * size : t === 'mushroom' ? 0.45 * size : 0.28 * size;
    if (!S.free(x, z, rad)) continue;
    S.claim(x, z, rad * (o.dense ? 0.6 : 1));
    const s = size * r.range(0.75, 1.3) * (t === 'giant' ? 1 : 1);
    const leaf = o.colors ? r.pick(o.colors) : (S.pal.snowy && t === 'con' ? mixHex(P.leafDark, '#ffffff', 0.25) : r.chance(0.5) ? P.leaf : P.leafDark);
    S.b.instance(TREE_PROTO[t] || 'tree-dec', { x, y: S.y(x, z), z, ry: r() * TAU, s, color: leaf, layer });
    placed++;
  }
  return placed;
}

/** a low-poly mountain built from a jagged radial mesh; optional snow cap */
export function mountain(S, o = {}) {
  const P = S.pal;
  const { x = 0, z = 0, r = 2.2, h = 3, rings = 6, segs = 14, snow = S.pal.snowy || S.has('snow'), layer = 'land' } = o;
  const seed = S.seed + (o.salt || 0);
  const pos = [];
  const col = [];
  const pt = (i, j) => {
    const t = i / rings, a = (j / segs) * TAU;
    const wob = 1 + (noise2(Math.cos(a) * 2 + seed, Math.sin(a) * 2 + i) - 0.5) * 0.5;
    const rr = r * t * wob * (o.sx ?? 1);
    const hh = i === 0 ? h : h * Math.pow(1 - t, o.sharp ?? 1.3) * (0.82 + noise2(a * 3 + seed, t * 4) * 0.36);
    return [x + Math.cos(a) * rr, (o.y ?? 0) + hh - 0.05, z + Math.sin(a) * rr * (o.sz ?? 1)];
  };
  const rockC = o.color || P.rock;
  const colorFor = (y, ny) => {
    const k = (y - (o.y ?? 0)) / h;
    if (snow && k > (o.snowLine ?? 0.62)) return P.snow;
    if (k < 0.18 && !o.bare) return mixHex(P.groundDark, rockC, 0.5);
    return ny > 0.75 ? shade(rockC, 0.06) : ny > 0.4 ? rockC : shade(rockC, -0.18);
  };
  const tri = (p, q, w) => {
    pos.push(...p, ...q, ...w);
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = w[0] - p[0], vy = w[1] - p[1], vz = w[2] - p[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    tmpC.set(colorFor((p[1] + q[1] + w[1]) / 3, Math.abs(ny / nl)));
    for (let k = 0; k < 3; k++) col.push(tmpC.r, tmpC.g, tmpC.b);
  };
  const top = pt(0, 0);
  for (let j = 0; j < segs; j++) {
    tri(top, pt(1, j + 1), pt(1, j));
    for (let i = 1; i < rings; i++) {
      const a = pt(i, j), bq = pt(i, j + 1), c = pt(i + 1, j), d = pt(i + 1, j + 1);
      tri(a, bq, d); tri(a, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  addColored(S.b, g, col, layer, 'solid');
  S.claim(x, z, r * 0.8);
}

/** scattered boulders */
export function boulders(S, { n = 6, cx = 0, cz = 0, spread = HALF, size = 0.25, color, layer = 'land', zone } = {}) {
  for (let i = 0; i < n; i++) {
    const p = S.find(size, { cx, cz, spread, zone, tries: 20 });
    if (!p) continue;
    S.b.rock(size * S.r.range(0.6, 1.4), { x: p[0], z: p[1], y: S.y(p[0], p[1]), ry: S.r() * 6, color: color || S.pal.rock, layer });
  }
}

/** farm fields: coloured strips */
export function farms(S, { n = 5, zone } = {}) {
  const cols = ['#c9b56a', '#a8ad62', '#d1bf7c', '#9aa35a', '#bfa863'];
  for (let i = 0; i < n; i++) {
    const w = S.r.range(0.7, 1.3), d = S.r.range(0.4, 0.8);
    const p = S.find(Math.max(w, d) * 0.55, { zone, tries: 30 });
    if (!p) continue;
    patch(S, { x: p[0], z: p[1], w, d, ry: S.r.range(-0.3, 0.3), color: S.r.pick(cols) });
  }
}

/* ============================================================ UNDERGROUND == */

/** cutaway cavern: a back wall arc and overhanging ceiling lip with stalactites; dark floor */
export function cavern(S, o = {}) {
  const P = S.pal;
  const { h = 4.2, stalactites = 18, open = 'south' } = o;
  // back wall: a ring of rocky columns forming a horseshoe around north/east/west
  const ring = 18;
  for (let i = 0; i < ring; i++) {
    const a = Math.PI + (i / (ring - 1)) * Math.PI; // from west round north to east
    const rr = HALF - 0.45;
    const x = Math.cos(a) * rr * 1.05, z = Math.sin(a) * rr * 0.98;
    mountain(S, { x: Math.max(-HALF + 0.6, Math.min(HALF - 0.6, x)), z: Math.max(-HALF + 0.6, z), r: 1.15, h: h * S.r.range(0.85, 1.1), rings: 3, segs: 7, sharp: 0.45, snow: false, color: P.rock, salt: i * 7, bare: true });
  }
  // ceiling lip: a broad slab over the back third with stalactites
  const lip = new Builder();
  lip.in('land');
  const segs = 9;
  for (let i = 0; i < segs; i++) {
    const a = Math.PI + (i / (segs - 1)) * Math.PI;
    const x = Math.cos(a) * 3.0, z = Math.sin(a) * 2.6 - 0.8;
    lip.rock(1.6, { x, z, y: h + 0.25, sy: 0.35, ry: i, color: shade(P.rock, -0.1) });
  }
  for (let i = 0; i < stalactites; i++) {
    const a = Math.PI + S.r() * Math.PI, rr = S.r.range(1.4, 3.8);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr * 0.9 - 0.5;
    const l = S.r.range(0.6, 1.8);
    lip.cone(S.r.range(0.08, 0.2), l, { x, z, y: h + 0.1, rx: Math.PI, color: shade(P.rock, -0.05), seg: 5 });
  }
  const g = lip.build({ ...S.ctx, ink: false }, 'ceiling');
  g.traverse((o) => { o.castShadow = false; });
  S.extra.push(g);
  // stalagmites
  for (let i = 0; i < (o.stalagmites ?? 8); i++) {
    const p = S.find(0.15, { tries: 15 });
    if (p) S.b.cone(S.r.range(0.07, 0.15), S.r.range(0.3, 0.9), { x: p[0], z: p[1], y: S.y(p[0], p[1]), seg: 5, color: P.rock, layer: 'land' });
  }
}

/** stalactite-like hanging city spires (drow): cones pointing down from the ceiling, and up from the floor */
export function stalagSpire(S, { x, z, h = 2.4, r = 0.3, color, glow } = {}) {
  const P = S.pal, y = S.y(x, z);
  S.b.cone(r, h, { x, z, y, seg: 6, color: color || shade(P.rock, 0.1), layer: 'tall' });
  for (let k = 0; k < 3; k++) {
    const yy = y + h * (0.25 + k * 0.2);
    S.b.cyl(r * (0.9 - k * 0.2) * 1.4, r * (0.9 - k * 0.2) * 1.4, 0.05, { x, z, y: yy, seg: 6, color: shade(color || P.rock, -0.15), layer: 'tall' });
    if (glow) S.b.box(0.06, 0.06, 0.06, { x: x + r * (1 - k * 0.25), z, y: yy + 0.08, kind: 'glow', layer: 'glow', color: glow, glow: 2.6 });
  }
  S.towers.push([x, z, r, h]);
}

/** a glowing lava pool */
export function lava(S, { x = 0, z = 0, r = 0.8 } = {}) {
  const y = S.y(x, z);
  S.b.cyl(r, r, 0.04, { x, y: y + 0.01, z, seg: 10, sx: 1.4, kind: 'glow', layer: 'glow', color: '#ff6a1f', glow: 2.2 });
  S.b.torus(r * 1.02, 0.08, { x, y: y + 0.03, z, rx: Math.PI / 2, seg: 12, color: '#3a2620', layer: 'land' });
  S.claim(x, z, r);
}

/* ================================================================= GLOW == */

/** floating glow motes (faerie fire / mythal sparks); flicker is applied to the whole glow layer */
export function glowPoints(S, { n = 10, color, cx = 0, cz = 0, spread = 3, y0 = 0.6, y1 = 3, size = 0.07 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = S.r() * TAU, d = Math.sqrt(S.r()) * spread;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (!S.inside(x, z, 0)) continue;
    S.b.oct(size * S.r.range(0.7, 1.4), { x, z, y: S.y(x, z) + S.r.range(y0, y1), kind: 'glow', layer: 'glow', color: color || S.pal.glow, glow: 3 });
  }
}

/** a mythal: a faint dome of light over the city */
export function mythal(S, { r = 3.8, h = 3.6, color = '#b9d6ff' } = {}) {
  S.b.dome(r, { y: 0, sy: h / r, seg: 16, kind: 'aura', layer: 'aura', color, glow: 1.0 });
}

/* =========================================================== WATERCRAFT == */

/** a group of ships that bob and drift (separate sub-piece) */
export function ships(S, { n = 3, zone } = {}) {
  const P = S.pal;
  const sb = new Builder();
  sb.in('low');
  let placed = 0;
  const spots = [];
  for (let i = 0; i < 80 && placed < n; i++) {
    const x = S.r.range(-HALF + 0.6, HALF - 0.6), z = S.r.range(-HALF + 0.6, HALF - 0.6);
    if (zone && !zone(x, z)) continue;
    if (S.wetness(x, z) < 0.5) continue;
    if (spots.some(([a, c]) => Math.hypot(a - x, c - z) < 1.0)) continue;
    spots.push([x, z]);
    const ry = S.r() * TAU, s = S.r.range(0.8, 1.2);
    sb.push({ x, z, y: WATER_Y, ry, s });
    sb.box(0.9, 0.16, 0.3, { y: -0.02, color: P.wood });
    sb.prism(0.9, 0.12, 0.3, { y: -0.04, rx: Math.PI, color: shade(P.wood, -0.2) });
    sb.cyl(0.02, 0.025, 0.85, { y: 0.14, seg: 4, color: shade(P.wood, -0.3) });
    sb.box(0.02, 0.5, 0.42, { x: 0.02, y: 0.3, color: S.r.chance(0.5) ? '#efe6d2' : P.roof });
    sb.pop();
    placed++;
  }
  if (!placed) return;
  const g = sb.build({ ...S.ctx, ink: false }, 'ships');
  S.extra.push(g);
  const ph = S.r() * 6;
  S.animate((t) => {
    g.position.x = Math.sin(t * 0.13 + ph) * 0.12;
    g.position.y = Math.sin(t * 1.1 + ph) * 0.02;
    g.rotation.z = Math.sin(t * 0.9 + ph) * 0.006;
  });
}

/** stone piers into the water */
export function docks(S, { n = 3, zone } = {}) {
  const P = S.pal;
  let placed = 0;
  for (let i = 0; i < 120 && placed < n; i++) {
    const x = S.r.range(-HALF + 0.5, HALF - 0.5), z = S.r.range(-HALF + 0.5, HALF - 0.5);
    if (zone && !zone(x, z)) continue;
    const w = S.wetness(x, z);
    if (w < -0.05 || w > 0.2) continue;
    // direction towards deeper water
    const e = 0.2;
    const gx = S.wetness(x + e, z) - S.wetness(x - e, z), gz = S.wetness(x, z + e) - S.wetness(x, z - e);
    const ang = Math.atan2(gz, gx);
    const len = S.r.range(0.8, 1.3);
    S.b.box(len, 0.08, 0.18, { x: x + Math.cos(ang) * len * 0.45, z: z + Math.sin(ang) * len * 0.45, y: WATER_Y + 0.02, ry: -ang, color: P.wood, layer: 'low' });
    placed++;
  }
}

/** lighthouse on a rocky base with a glowing lamp */
export function lighthouse(S, { x, z, h = 2.0 } = {}) {
  const P = S.pal;
  const y = S.y(x, z);
  S.b.rock(0.45, { x, z, y: y + 0.05, color: P.rock, layer: 'land' });
  S.b.cyl(0.16, 0.24, h, { x, z, y: y + 0.15, seg: 8, color: '#efe8da', layer: 'tall' });
  S.b.cyl(0.25, 0.25, 0.05, { x, z, y: y + 0.15 + h * 0.5, seg: 8, color: P.roof, layer: 'tall' });
  S.b.cyl(0.2, 0.2, 0.22, { x, z, y: y + 0.15 + h, seg: 8, kind: 'glow', layer: 'glow', color: '#ffd38a', glow: 3 });
  S.b.cone(0.24, 0.3, { x, z, y: y + 0.37 + h, seg: 8, color: P.roof, layer: 'tall' });
  S.towers.push([x, z, 0.24, h]);
}

/** arched bridge between two points */
export function bridge(S, { x1, z1, x2, z2, w = 0.32 } = {}) {
  const P = S.pal;
  const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
    const lift = Math.sin(t * Math.PI) * 0.22;
    S.b.box(len / n + 0.02, 0.1, w, { x, z, y: 0.05 + lift, ry: -ang, rz: Math.cos(t * Math.PI) * 0.18, color: P.stoneDark, layer: 'low' });
  }
  S.b.box(0.14, 0.3, w * 1.1, { x: (x1 + x2) / 2, z: (z1 + z2) / 2, y: WATER_Y - 0.2, ry: -ang, color: P.stoneDark, layer: 'low' });
}

/* ============================================================ MONUMENTS == */

export function obelisk(S, { x, z, h = 1.6, color } = {}) {
  const y = S.y(x, z);
  S.b.box(0.3, 0.1, 0.3, { x, z, y, color: S.pal.stoneDark, layer: 'low' });
  S.b.cyl(0.08, 0.13, h, { x, z, y: y + 0.1, seg: 4, ry: Math.PI / 4, color: color || shade(S.pal.stone, -0.15), layer: 'tall' });
  S.b.pyramid(0.12, 0.16, { x, z, y: y + 0.1 + h, color: S.pal.gold, layer: 'tall' });
  S.towers.push([x, z, 0.15, h]);
}

export function standingStone(S, { x = 0, z = 0, h = 1.5, ring = 0 } = {}) {
  const y = S.y(x, z), P = S.pal;
  S.b.box(0.42, h, 0.22, { x, z, y: y - 0.05, ry: 0.3, rz: 0.04, color: shade(P.rock, 0.05), layer: 'tall' });
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * TAU;
    S.b.box(0.22, h * 0.45, 0.14, { x: x + Math.cos(a) * 1.3, z: z + Math.sin(a) * 1.3, y: y - 0.03, ry: -a, color: P.rock, layer: 'low' });
  }
  S.towers.push([x, z, 0.3, h]);
}

export function statue(S, { x, z, h = 1.0, color } = {}) {
  const y = S.y(x, z), c = color || shade(S.pal.stone, -0.1);
  S.b.box(0.34, 0.25, 0.34, { x, z, y, color: S.pal.stoneDark, layer: 'low' });
  S.b.cyl(0.08, 0.13, h * 0.6, { x, z, y: y + 0.25, seg: 6, color: c, layer: 'tall' });
  S.b.sphere(0.09, { x, z, y: y + 0.25 + h * 0.68, color: c, layer: 'tall' });
  S.b.box(0.5, 0.05, 0.05, { x, z, y: y + 0.25 + h * 0.5, color: c, layer: 'tall' });
}

export function pyramid(S, { x = 0, z = 0, w = 2, h = 1.6, color, steps = 0 } = {}) {
  const y = S.y(x, z), c = color || mixHex(S.pal.sand, S.pal.stone, 0.3);
  if (steps) {
    for (let i = 0; i < steps; i++) {
      const k = 1 - i / steps;
      S.b.box(w * k, h / steps, w * k, { x, z, y: y + (i * h) / steps, color: shade(c, -i * 0.03), layer: i < steps / 2 ? 'low' : 'tall' });
    }
    S.b.box(w * 0.22, h * 0.18, w * 0.22, { x, z, y: y + h, color: S.pal.roof, layer: 'tall' });
  } else S.b.pyramid(w, h, { x, z, y, color: c, layer: 'tall' });
  S.claim(x, z, w * 0.6);
  S.towers.push([x, z, w / 2, h]);
}

export function tents(S, { n = 8, cx = 0, cz = 0, spread = 2, colors } = {}) {
  const cs = colors || ['#e8dcc0', S.pal.roof, '#c9a77a', '#d9c49a'];
  for (let i = 0; i < n; i++) {
    const p = S.find(0.35, { cx, cz, spread, tries: 20 });
    if (!p) continue;
    S.b.instance('tent', { x: p[0], z: p[1], y: S.y(p[0], p[1]), s: S.r.range(0.8, 1.3), ry: S.r() * 6, color: S.r.pick(cs), layer: 'low' });
  }
}

export function graveyard(S, { x, z, n = 12 } = {}) {
  patch(S, { x, z, w: 1.1, d: 0.9, color: S.pal.groundDark });
  for (let i = 0; i < n; i++) S.b.instance('gravestone', { x: x + ((i % 4) - 1.5) * 0.24, z: z + (Math.floor(i / 4) - 1) * 0.24, y: S.y(x, z), ry: S.r.range(-0.2, 0.2), rz: S.r.range(-0.15, 0.15), color: '#cfc8b8', layer: 'low' });
  S.claim(x, z, 0.6);
}

/** mine entrance: a timber frame in a rocky bump */
export function mineEntrance(S, { x, z, ry = 0 } = {}) {
  const y = S.y(x, z);
  S.b.rock(0.6, { x, z: z - 0.15, y, sy: 0.9, color: S.pal.rock, layer: 'land' });
  S.b.box(0.34, 0.36, 0.08, { x, z: z + 0.3, y, ry, color: '#20191a', layer: 'low' });
  S.b.box(0.44, 0.06, 0.12, { x, z: z + 0.32, y: y + 0.36, ry, color: S.pal.wood, layer: 'low' });
  for (const s of [-1, 1]) S.b.box(0.06, 0.38, 0.12, { x: x + s * 0.2, z: z + 0.32, y, ry, color: S.pal.wood, layer: 'low' });
  S.b.box(0.08, 0.06, 0.06, { x, z: z + 0.36, y: y + 0.18, kind: 'glow', layer: 'glow', color: '#ffb35a', glow: 2 });
}

/** waterfall: a sheet of water down a cliff face */
export function waterfall(S, { x, z, h = 1.5, w = 0.5 } = {}) {
  S.b.box(w, h, 0.05, { x, z, y: WATER_Y, kind: 'water', layer: 'water', color: '#9cc6d2' });
  S.b.cyl(w * 0.7, w * 0.7, 0.04, { x, z: z + 0.2, y: WATER_Y + 0.01, seg: 8, kind: 'glow', layer: 'glow', color: '#e8f2f2', glow: 1.1 });
}

/* ================================================================ RUINS == */

/** broken tower stub with a jagged top */
export function brokenTower(S, { x, z, r = 0.35, h = 0.9, layer = 'ruin', color } = {}) {
  const y = S.y(x, z), c = color || shade(S.pal.stone, -0.1);
  S.b.cyl(r * 0.95, r, h, { x, z, y, seg: 8, color: c, layer });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + S.r();
    S.b.box(r * 0.5, S.r.range(0.1, 0.45), r * 0.3, { x: x + Math.cos(a) * r * 0.7, z: z + Math.sin(a) * r * 0.7, y: y + h, ry: -a, color: c, layer });
  }
}

/** rubble field (instanced) */
export function rubble(S, { cx = 0, cz = 0, spread = 2, n = 30, layer = 'ruin', color } = {}) {
  const cs = color ? [color] : [S.pal.stoneDark, shade(S.pal.stone, -0.2), S.pal.rock];
  for (let i = 0; i < n; i++) {
    const a = S.r() * TAU, d = Math.sqrt(S.r()) * spread;
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (!S.inside(x, z, 0.1) || !S.isLand(x, z, 0)) continue;
    S.b.instance('rubble', { x, z, y: S.y(x, z), s: S.r.range(0.5, 1.6), ry: S.r() * 6, rx: S.r(), color: S.r.pick(cs), layer });
  }
}

/** broken wall fragments along a line or ring */
export function brokenWalls(S, { cx = 0, cz = 0, r = 2.5, n = 7, layer = 'ruin' } = {}) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + S.r() * 0.3;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (!S.inside(x, z, 0.3) || !S.isLand(x, z, 0)) continue;
    const len = S.r.range(0.5, 1.2);
    S.b.box(len, S.r.range(0.2, 0.6), 0.2, { x, z, y: S.y(x, z), ry: -(a + Math.PI / 2), color: S.pal.stoneDark, layer });
  }
}

/** The generic ruin overlay every diorama gets: stubs where tall pieces were, rubble in built-up areas. */
export function ruinOverlay(S) {
  const towers = S.towers.slice(0, 18);
  for (const [x, z, r, h] of towers) if (S.inside(x, z, 0)) brokenTower(S, { x, z, r: Math.min(r, 0.6), h: Math.min(h * 0.3, 0.9) });
  for (const [cx, cz, spread] of S.blocks.slice(0, 4)) rubble(S, { cx, cz, spread: spread * 0.9, n: Math.round(12 + spread * 6) });
  if (!S.blocks.length && !towers.length) rubble(S, { n: 14, spread: 2 });
}

/* ========================================================= FLOATING ISLE == */

/** an inverted, jagged rocky cone (the underside of a floating island) into builder b (sub-piece) */
export function floatingUnderside(S, b, { r = 3.2, depth = 3.2 } = {}) {
  const P = S.pal;
  const rings = 4, segs = 12;
  const pos = [], col = [];
  const pt = (i, j) => {
    const t = i / rings, a = (j / segs) * TAU;
    const wob = 1 + (noise2(Math.cos(a) * 2 + S.seed, Math.sin(a) * 2 + i * 3) - 0.5) * 0.45;
    const rr = r * (1 - t * t * 0.95) * wob;
    return [Math.cos(a) * rr, -t * depth * (0.8 + noise2(a * 2, t * 5 + S.seed) * 0.4), Math.sin(a) * rr];
  };
  const tri = (p, q, w, c) => { pos.push(...p, ...q, ...w); tmpC.set(c); for (let k = 0; k < 3; k++) col.push(tmpC.r, tmpC.g, tmpC.b); };
  const tip = [0, -depth * 1.05, 0];
  for (let j = 0; j < segs; j++) {
    for (let i = 0; i < rings; i++) {
      const a = pt(i, j), bq = pt(i, j + 1), c = pt(i + 1, j), d = pt(i + 1, j + 1);
      const shadeK = i % 2 ? -0.1 : 0;
      tri(a, d, bq, shade(i === 0 ? P.groundDark : P.rock, shadeK - i * 0.06));
      tri(a, c, d, shade(P.rock, shadeK - i * 0.07));
    }
    tri(pt(rings, j), tip, pt(rings, j + 1), P.rockDark);
  }
  // top cap
  for (let j = 0; j < segs; j++) tri([0, 0, 0], pt(0, j + 1), pt(0, j), P.ground);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  addColored(b, g, col, 'land', 'solid');
}
