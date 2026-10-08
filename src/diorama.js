// A Diorama wraps one place's built content with its layout transform and the STATUS machinery:
// setYear(year) picks the place's state and tweens a small parameter vector (rise, tall, low, ruin, desat,
// scorch, fade, glow, ghost, lift, float, flicker) over ~600 ms; apply() maps it onto layer scales, uniforms
// and visibility. No allocations per frame.
import * as THREE from 'three';
import { build } from './archetypes/index.js';
import { setGhost } from './kit/index.js';
import { stateAt } from './time.js';
import { HALF, BOTTOM_Y } from './kit/site.js';

const KEYS = ['rise', 'tall', 'low', 'ruin', 'desat', 'scorch', 'fade', 'glow', 'ghost', 'lift', 'float', 'flicker', 'sink'];
const BASE = { rise: 1, tall: 1, low: 1, ruin: 0, desat: 0, scorch: 0, fade: 0, glow: 1, ghost: 0, lift: 0, float: 1, flicker: 0, sink: 0 };
export const LOOK = {
  unfounded: { rise: 0, glow: 0 },
  thriving: {},
  troubled: { desat: 0.42, flicker: 1, glow: 0.65, tall: 0.97 },
  ruined: { tall: 0.22, low: 0.62, ruin: 1, desat: 0.55, scorch: 0.12, glow: 0.18, float: 0 },
  destroyed: { tall: 0.04, low: 0.22, ruin: 1, desat: 0.35, scorch: 0.6, glow: 0, float: 0 },
  abandoned: { desat: 0.65, fade: 0.38, glow: 0, tall: 0.9 },
  hidden: { ghost: 1, desat: 0.25, fade: 0.15, glow: 0.7 },
  relocated: { ghost: 0.7, lift: 1, glow: 0.5 },
};
const DUR = 0.6;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// shared geometry for the empty-site marker (dashed ink outline of a tile)
const siteGeo = (() => {
  const h = HALF, pts = [];
  const seg = (x1, z1, x2, z2) => {
    const n = 14;
    for (let i = 0; i < n; i += 2) {
      pts.push(x1 + ((x2 - x1) * i) / n, 0, z1 + ((z2 - z1) * i) / n, x1 + ((x2 - x1) * (i + 1)) / n, 0, z1 + ((z2 - z1) * (i + 1)) / n);
    }
  };
  seg(-h, -h, h, -h); seg(h, -h, h, h); seg(h, h, -h, h); seg(-h, h, -h, -h);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
})();
const siteMat = new THREE.LineBasicMaterial({ color: '#5a4a3a', transparent: true, opacity: 0.5 });

export class Diorama {
  constructor(place, index) {
    this.place = place;
    this.index = index;
    this.root = new THREE.Group(); // positioned by layouts
    this.root.name = place.id;
    this.pivot = new THREE.Group(); // status rise / lift
    this.root.add(this.pivot);
    const { group, ctx } = build(place);
    this.content = group;
    this.pivot.add(group);
    this.ctx = ctx;
    this.mats = ctx.mats;
    this.u = ctx.mats.u;
    this.layers = ctx.layers;
    this.animators = ctx.animators;
    this.floatGroup = ctx.floatGroup;
    this.underground = /underdark|drow/.test(place.archetype) || place.region === 'underdark' || place.visual?.terrain === 'cavern';
    this.marker = new THREE.LineSegments(siteGeo, siteMat);
    this.marker.position.y = BOTTOM_Y + 0.02;
    this.marker.visible = false;
    this.root.add(this.marker);
    // a hit box for picking (cheap raycasts)
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, 3, HALF * 2).translate(0, 0.6, 0), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.userData.diorama = this;
    this.root.add(this.hit);

    // level of detail: ink outlines, banners and windmill sails only draw when the camera is close
    this.lod = [];
    group.traverse((o) => { if (o.isLineSegments || o.name === 'banner' || o.name === 'windmill') this.lod.push(o); });
    this.detail = true;
    this.cur = { ...BASE };
    this.from = { ...BASE };
    this.tgt = { ...BASE };
    this.t0 = -1;
    this.state = 'thriving';
    this.pulse = 0;
    this.hover = 0;
    this.year = null;
    this.layoutScale = 1;
    this.apply();
  }

  /** set the year; animate=false snaps */
  setYear(year, animate = true, now = performance.now() / 1000) {
    this.year = year;
    const st = stateAt(this.place, year);
    const changed = st !== this.state;
    this.state = st;
    const look = LOOK[st] || {};
    for (const k of KEYS) this.tgt[k] = look[k] ?? BASE[k];
    if (this.underground) this.tgt.sink = 1;
    if (!animate) {
      for (const k of KEYS) this.cur[k] = this.tgt[k];
      this.t0 = -1;
      this.apply();
    } else if (changed || this.t0 < 0) {
      for (const k of KEYS) this.from[k] = this.cur[k];
      this.t0 = now;
    }
    return changed;
  }

  apply() {
    const c = this.cur;
    const L = this.layers;
    const rise = c.rise;
    this.pivot.visible = rise > 0.01;
    this.marker.visible = rise < 0.99;
    this.pivot.scale.set(1, Math.max(0.01, rise), 1);
    this.pivot.position.y = -(1 - rise) * 1.0 + c.lift * 3.2 - c.sink * 0.35;
    this.pivot.rotation.z = c.lift * 0.08;
    if (L.tall) for (const g of L.tall) g.scale.y = Math.max(0.001, c.tall);
    if (L.low) for (const g of L.low) g.scale.y = Math.max(0.001, c.low);
    if (L.ruin) for (const g of L.ruin) { g.visible = c.ruin > 0.02; g.scale.y = Math.max(0.001, c.ruin); }
    if (L.glow) for (const g of L.glow) g.visible = c.glow > 0.03;
    if (L.aura) for (const g of L.aura) g.visible = c.glow > 0.5 && c.ghost < 0.5;
    this.u.uDesat.value = c.desat;
    this.u.uScorch.value = c.scorch;
    this.u.uFade.value = c.fade;
    this.u.uGlow.value = c.glow;
    setGhost(this.mats, c.ghost);
    const casts = c.ghost < 0.5;
    if (casts !== this.casts) { this.casts = casts; this.content.traverse((o) => { if (o.isMesh && o.userData.cast === undefined) o.userData.cast = o.castShadow; if (o.isMesh) o.castShadow = casts && o.userData.cast; }); }
    if (this.floatGroup) {
      // a floating enclave falls when its state drops it (float -> 0)
      const fg = this.floatGroup;
      fg.userData.lift = c.float;
      fg.userData.grounded = c.float < 0.02;
      if (fg.userData.grounded) { fg.position.y = 0.3; fg.rotation.set(0.12, 0.4, -0.08); }
      else fg.rotation.x = fg.rotation.z = (1 - c.float) * 0.1;
    }
  }

  /** per-frame: tween, flicker, pulse, animators. t = seconds */
  setDetail(on) {
    if (on === this.detail) return;
    this.detail = on;
    for (let i = 0; i < this.lod.length; i++) this.lod[i].visible = on;
  }

  update(t, dt, animateDetails) {
    if (this.t0 >= 0) {
      const k = Math.min(1, (t - this.t0) / DUR);
      const e = ease(k);
      for (const key of KEYS) this.cur[key] = this.from[key] + (this.tgt[key] - this.from[key]) * e;
      if (k >= 1) this.t0 = -1;
      this.apply();
    }
    if (!this.pivot.visible) return;
    if (this.cur.flicker > 0.01) {
      const f = this.cur.flicker;
      const n = Math.sin(t * 7.3 + this.index) * Math.sin(t * 3.1 + this.index * 2);
      this.u.uBright.value = 1 - f * (0.05 + 0.07 * Math.max(0, n));
      this.u.uGlow.value = this.cur.glow * (1 - f * 0.6 * Math.max(0, Math.sin(t * 11 + this.index)));
    } else if (this.u.uBright.value !== 1) this.u.uBright.value = 1;
    else if (this.place.visual?.motifs?.includes('faerie-fire') && this.cur.glow > 0.03) {
      this.u.uGlow.value = this.cur.glow * (0.82 + 0.18 * Math.sin(t * 2.3 + this.index));
    }
    if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 0.45);
    const p = Math.max(this.pulse > 0 ? this.pulse * (0.6 + 0.4 * Math.sin(t * 9)) : 0, this.hover * 0.12);
    this.u.uPulse.value = p * 0.55;
    if (animateDetails) for (let i = 0; i < this.animators.length; i++) this.animators[i](t, dt);
  }
}

