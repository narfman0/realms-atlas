// A Site is the working context for building one diorama: the place, its palette, a seeded RNG, the main
// Builder, a terrain height function (land / water / hills) and a coarse occupancy grid so pieces do not
// overlap. Archetypes compose kit pieces onto a Site; kit.finish(site) turns it into a THREE.Group.
import { Builder } from './builder.js';
import { makePalette } from './palette.js';
import { rng, noise2 } from './rng.js';

export const HALF = 4.6; // tile half-size (world units); the tile is 9.2 × 9.2
export const WATER_Y = -0.1; // water surface
export const SEABED_Y = -0.42;
export const BOTTOM_Y = -0.9; // underside of the tile

const CELL = 0.15;
const N = Math.ceil((HALF * 2) / CELL);

export class Site {
  constructor(place, ctx) {
    this.place = place;
    this.ctx = ctx;
    this.id = place.id;
    this.r = rng(place.id);
    this.pal = makePalette(place);
    const v = place.visual || {};
    this.scale = Math.min(5, Math.max(1, v.scale || 3));
    this.motifs = new Set(v.motifs || []);
    this.terrain = this.pal.terrain;
    this.b = new Builder();
    this.extra = []; // extra groups (animated sub-builders), each { group }
    this.animators = []; // (t, dt) => void
    this.grid = new Uint8Array(N * N);
    this.water = []; // water features: fns (x,z) -> depth contribution (>0 means below water)
    this.hills = []; // [x, z, r, h]
    this.flatten = []; // [x, z, r] areas forced flat at y=0
    this.towers = []; // [x, z, r, h] for ruin stubs
    this.blocks = []; // [x, z, r] built-up areas for rubble
    this.pits = []; // chasms: {x, z, len, w, ang, seed} (see kit/cosmos.js chasm())
    this.landFloor = 0; // land level
    this.noiseAmp = 0.06;
    this.seed = this.r.int(0, 1000);
  }

  has(m) { return this.motifs.has(m); }
  any(...ms) { return ms.some((m) => this.motifs.has(m)); }

  /* --------------------------------------------------------- terrain -- */
  /** sea beyond a wavy line on one side. side: 'south'|'north'|'east'|'west'; at = distance from centre */
  addCoast(side = 'south', at = 1.8, wav = 0.35) {
    const s = this.seed;
    const f = {
      south: (x, z) => z - (at + Math.sin(x * 0.9 + s) * wav + Math.sin(x * 2.3 + s * 2) * wav * 0.4),
      north: (x, z) => -z - (at + Math.sin(x * 0.9 + s) * wav),
      east: (x, z) => x - (at + Math.sin(z * 0.9 + s) * wav + Math.sin(z * 2.1 + s) * wav * 0.4),
      west: (x, z) => -x - (at + Math.sin(z * 0.9 + s) * wav),
    }[side];
    this.water.push((x, z) => f(x, z));
    return this;
  }
  /** island: land within radius R (wobbly), sea elsewhere */
  addIsland(R = 3.3, cx = 0, cz = 0, wob = 0.5) {
    const s = this.seed;
    this.water.push((x, z) => {
      const a = Math.atan2(z - cz, x - cx);
      const rr = R + Math.sin(a * 3 + s) * wob * 0.6 + Math.sin(a * 5 + s * 2) * wob * 0.4;
      return Math.hypot(x - cx, z - cz) - rr;
    });
    return this;
  }
  /** river: band of half-width w along a sinuous line through the tile at angle ang (radians from x axis) */
  addRiver(ang = 0.35, off = 0.6, w = 0.45) {
    const s = this.seed;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    this.water.push((x, z) => {
      const u = x * ca + z * sa; // along
      const v = -x * sa + z * ca; // across
      const c = off + Math.sin(u * 0.8 + s) * 0.35;
      return w - Math.abs(v - c);
    });
    this.riverAng = ang; this.riverOff = off; this.riverW = w;
    return this;
  }
  addLake(cx, cz, R) {
    const fn = (x, z) => R - Math.hypot(x - cx, (z - cz) * 1.15) + Math.sin(Math.atan2(z - cz, x - cx) * 4 + this.seed) * 0.15;
    fn.isChannel = true;
    this.water.push(fn);
    return this;
  }
  /** canal: straight thin channel */
  addCanal(x1, z1, x2, z2, w = 0.18) {
    const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz;
    const fn = (x, z) => {
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / L2));
      return w - Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));
    };
    fn.isChannel = true;
    this.water.push(fn);
    return this;
  }
  addHill(x, z, r, h) { this.hills.push([x, z, r, h]); return this; }

  /** >0 = under water (by how much, in "distance" units); coasts/islands are "outside" fns, channels are "inside" */
  wetness(x, z) {
    let w = -Infinity;
    for (const f of this.water) w = Math.max(w, f(x, z));
    return w;
  }
  height(x, z) {
    let h = this.landFloor + (noise2(x * 0.9 + this.seed, z * 0.9) - 0.5) * this.noiseAmp * 2;
    for (const [hx, hz, r, hh] of this.hills) {
      const d = Math.hypot(x - hx, z - hz) / r;
      if (d < 1) h += hh * (0.5 + 0.5 * Math.cos(d * Math.PI));
    }
    if (this.pits.length) h = this.pitDepth(x, z, h);
    for (const [fx, fz, r] of this.flatten) {
      const d = Math.hypot(x - fx, z - fz);
      if (d < r) h = Math.min(h, this.landFloor + 0.02);
    }
    const w = this.water.length ? this.wetness(x, z) : -1;
    if (w > -0.25) {
      // shore slopes down into the water
      const k = Math.min(1, (w + 0.25) / 0.6);
      h = h * (1 - k) + SEABED_Y * k;
    }
    return h;
  }
  /** chasms: the ground falls away inside each rift's jagged outline */
  pitDepth(x, z, h) {
    for (const p of this.pits) {
      const ca = Math.cos(p.ang), sa = Math.sin(p.ang);
      const u = (x - p.x) * ca + (z - p.z) * sa, v = -(x - p.x) * sa + (z - p.z) * ca;
      const half = p.len / 2;
      if (Math.abs(u) >= half) continue;
      const taper = Math.sqrt(1 - (u / half) ** 2);
      const wob = 1 + (noise2(u * 2.3 + p.seed, 0.5) - 0.5) * 0.7;
      const vv = Math.abs(v - Math.sin(u * 1.7 + p.seed) * 0.25) / (p.w * 0.5 * taper * wob + 1e-3);
      if (vv < 1) h = h * vv + -0.78 * (1 - vv) ** 0.4;
    }
    return h;
  }
  isLand(x, z, margin = 0.1) {
    return !this.water.length || this.wetness(x, z) < -margin;
  }
  /** ground height at a point (for placing buildings) */
  y(x, z) { return Math.max(this.height(x, z), WATER_Y); }

  /* --------------------------------------------------------- occupancy -- */
  _cells(x, z, r, fn) {
    const i0 = Math.max(0, Math.floor((x - r + HALF) / CELL)), i1 = Math.min(N - 1, Math.floor((x + r + HALF) / CELL));
    const j0 = Math.max(0, Math.floor((z - r + HALF) / CELL)), j1 = Math.min(N - 1, Math.floor((z + r + HALF) / CELL));
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (fn(i * N + j) === false) return false;
    return true;
  }
  inside(x, z, r = 0, m = 0.25) { return Math.abs(x) + r < HALF - m && Math.abs(z) + r < HALF - m; }
  free(x, z, r, { water = false } = {}) {
    if (!this.inside(x, z, r)) return false;
    if (!water && !this.isLand(x, z, r * 0.6 + 0.08)) return false;
    return this._cells(x, z, r * 0.85, (k) => this.grid[k] === 0);
  }
  claim(x, z, r) { this._cells(x, z, r * 0.85, (k) => { this.grid[k] = 1; }); return [x, z]; }
  /** find a free spot of radius r; zone(x,z) optional filter; returns [x,z] or null */
  find(r, { zone, tries = 60, water = false, cx = 0, cz = 0, spread = HALF } = {}) {
    for (let i = 0; i < tries; i++) {
      const a = this.r() * Math.PI * 2, d = Math.sqrt(this.r()) * spread;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (zone && !zone(x, z)) continue;
      if (this.free(x, z, r, { water })) return this.claim(x, z, r);
    }
    return null;
  }
  /** register an animated sub-piece */
  animate(fn) { this.animators.push(fn); }
}
