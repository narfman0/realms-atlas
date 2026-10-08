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
  hidden: { ghost: 1, desat: 0.5, fade: 0.55, glow: 0.5 },
  relocated: { lift: 1, glow: 0.8, scorch: 0.12 },
};
const DUR = 0.6;
const LIFT = 4.6; // how high a relocated place rises off the board

const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false });
// what a relocated place leaves behind: a scorched pit with a faint red glow from below (Avernus)
const pitGeo = {
  slab: new THREE.BoxGeometry(HALF * 2, 0.9, HALF * 2).translate(0, -0.45, 0),
  ring: new THREE.TorusGeometry(2.6, 0.35, 5, 20).rotateX(Math.PI / 2),
  hole: new THREE.CircleGeometry(2.5, 24).rotateX(-Math.PI / 2),
  glow: new THREE.CircleGeometry(4.2, 28).rotateX(-Math.PI / 2),
};
const pitMats = {
  slab: new THREE.MeshStandardMaterial({ color: '#4a3a2e', roughness: 1, flatShading: true }),
  ring: new THREE.MeshStandardMaterial({ color: '#1e1512', roughness: 1, flatShading: true }),
  hole: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a12').multiplyScalar(1.6), toneMapped: false }),
  glow: new THREE.MeshBasicMaterial({ color: '#ff4a1a', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
};
function makePit() {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(pitGeo.slab, pitMats.slab); slab.receiveShadow = true;
  const ring = new THREE.Mesh(pitGeo.ring, pitMats.ring); ring.position.y = 0.02;
  const hole = new THREE.Mesh(pitGeo.hole, pitMats.hole); hole.position.y = 0.03;
  const glow = new THREE.Mesh(pitGeo.glow, pitMats.glow); glow.position.y = 0.6;
  g.add(slab, ring, hole, glow);
  g.visible = false;
  return g;
}
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
    this.pit = makePit();
    this.root.add(this.pit);
    if (place.visual?.motifs?.includes('floating')) this.u.uFadeColor.value.set('#3a3448');
    this.depthMeshes = null;
    this.marker = new THREE.LineSegments(siteGeo, siteMat);
    this.marker.position.y = BOTTOM_Y + 0.02;
    this.marker.visible = false;
    this.root.add(this.marker);
    // a hit box for picking (cheap raycasts)
    const hh = Math.max(3, (ctx.hitHeight || 0) + 0.9);
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, hh, HALF * 2).translate(0, hh / 2 - 0.9, 0), new THREE.MeshBasicMaterial({ visible: false }));
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
    this.pivot.position.y = -(1 - rise) * 1.0 + c.lift * LIFT - c.sink * 0.35;
    this.pivot.rotation.z = c.lift * 0.05;
    this.pit.visible = c.lift > 0.02;
    if (this.pit.visible) this.pit.scale.set(1, Math.max(0.01, c.lift), 1);
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
    this.setDepthPass(c.ghost > 0.001);
    const casts = c.ghost < 0.5;
    if (casts !== this.casts) { this.casts = casts; this.content.traverse((o) => { if (o.isMesh && o.userData.cast === undefined) o.userData.cast = o.castShadow; if (o.isMesh) o.castShadow = casts && o.userData.cast; }); }
    if (this.floatGroup) {
      // a floating enclave falls when its state drops it (float -> 0)
      const fg = this.floatGroup;
      fg.userData.lift = c.float;
      fg.userData.grounded = c.float < 0.02;
      if (fg.userData.grounded) {
        // crashed: lying askew on the tile, one rim dug into the sand, needles snapped off
        fg.position.set(0.3, 1.2, 0.2); fg.rotation.set(-0.42, 0.6, 0.22);
        for (const ch of fg.children) if (ch.name === 'tall') ch.scale.y = 0.3;
      }
      else { fg.position.x = fg.position.z = 0; fg.rotation.x = fg.rotation.z = (1 - c.float) * 0.3; }
      const blob = fg.userData.blob;
      if (blob) { blob.visible = c.float > 0.02; blob.material.opacity = 0.28 * c.float * (1 - 0.8 * c.ghost); blob.scale.setScalar(0.7 + 0.3 * c.float); }
    }
  }

  /** depth-only copies of the solid meshes, drawn in the opaque pass, so the translucent "sketch" look of
   *  hidden places shows only the nearest surfaces */
  setDepthPass(on) {
    if (on && !this.depthMeshes) {
      this.depthMeshes = [];
      const solids = [];
      this.content.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.material === this.mats.solid) solids.push(o); });
      for (const o of solids) {
        let d;
        if (o.isInstancedMesh) { d = new THREE.InstancedMesh(o.geometry, depthMat, o.count); d.instanceMatrix = o.instanceMatrix; d.boundingSphere = o.boundingSphere; }
        else d = new THREE.Mesh(o.geometry, depthMat);
        d.matrixAutoUpdate = false;
        d.matrix.copy(o.matrix);
        d.raycast = () => {};
        o.parent.add(d);
        this.depthMeshes.push(d);
      }
    }
    if (this.depthMeshes && this.depthOn !== on) {
      this.depthOn = on;
      for (const d of this.depthMeshes) d.visible = on;
      this.setDetail(this.detail, true);
    }
  }

  /** level of detail: ink outlines etc. only near the camera (always for the sketch look of hidden places) */
  setDetail(on, force = false) {
    if (on === this.detail && !force) return;
    this.detail = on;
    const v = on || this.cur.ghost > 0.3;
    for (let i = 0; i < this.lod.length; i++) this.lod[i].visible = v;
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

