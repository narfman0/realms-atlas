// Builder: accumulates small geometries into named LAYERS (which the status system manipulates: e.g. "tall"
// collapses when a place is ruined, "ruin" appears) and material KINDS (solid / water / glow / aura). On build()
// every (layer, kind) pair is merged into ONE mesh, so a whole diorama is a handful of draw calls.
// Houses and trees go through instance(): one InstancedMesh per prototype per diorama.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PROTOS } from './protos.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _n = new THREE.Vector3();

export function placement(o = {}, out = new THREE.Matrix4()) {
  _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
  _q.setFromEuler(_e);
  _p.set(o.x || 0, o.y || 0, o.z || 0);
  const s = o.s ?? 1;
  _s.set(o.sx ?? s, o.sy ?? s, o.sz ?? s);
  return out.compose(_p, _q, _s);
}

/** Layers the status system knows about (others are allowed, they are just never touched). */
export const LAYERS = ['base', 'land', 'low', 'tall', 'ruin', 'glow', 'water'];
/** layers that get ink edge lines */
const INKED = new Set(['low', 'tall', 'ruin']);

const geoCache = new Map();
function cached(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}

export class Builder {
  constructor() {
    this.layer = 'low';
    this.parts = new Map(); // layer -> Map(kind -> geometry[])
    this.inst = new Map(); // layer|proto -> { proto, items: [{m, c}] }
    this.stack = [];
  }

  in(layer) { this.layer = layer; return this; }

  push(o) {
    const m = placement(o, new THREE.Matrix4());
    const top = this.stack[this.stack.length - 1];
    this.stack.push(top ? top.clone().multiply(m) : m);
    return this;
  }
  pop() { this.stack.pop(); return this; }

  /** add a BufferGeometry (cloned + transformed). o: placement, color, kind, layer, colorFn(normal,pos)->Color */
  geo(geometry, o = {}) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    const m = placement(o, new THREE.Matrix4());
    if (this.stack.length) m.premultiply(this.stack[this.stack.length - 1]);
    g.applyMatrix4(m);
    const kind = o.kind || 'solid';
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    if (o.colorFn) {
      const pos = g.attributes.position, nor = g.attributes.normal;
      for (let i = 0; i < n; i += 3) {
        // per-face colour (flat look): use the first vertex normal and the face centroid
        _n.set(nor.getX(i), nor.getY(i), nor.getZ(i));
        _p.set((pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3, (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3);
        _c.set(o.colorFn(_n, _p) ?? o.color ?? '#ffffff');
        if (kind === 'glow') _c.multiplyScalar(o.glow ?? 2.2);
        for (let j = 0; j < 3; j++) { col[(i + j) * 3] = _c.r; col[(i + j) * 3 + 1] = _c.g; col[(i + j) * 3 + 2] = _c.b; }
      }
    } else {
      _c.set(o.color ?? '#efe4cf');
      if (kind === 'glow' || kind === 'aura') _c.multiplyScalar(o.glow ?? 2.2);
      for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const layer = o.layer || this.layer;
    if (!this.parts.has(layer)) this.parts.set(layer, new Map());
    const L = this.parts.get(layer);
    if (!L.has(kind)) L.set(kind, []);
    L.get(kind).push(g);
    return this;
  }

  /* ----- primitives. box/cyl/cone/prism/pyramid/dome: bottom sits at y. sphere/oct: centred. ----- */
  box(w, h, d, o = {}) {
    return this.geo(cached('box', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)), { ...o, sx: w * (o.sx ?? 1), sy: h, sz: d });
  }
  cyl(rt, rb, h, o = {}) {
    const seg = o.seg ?? 8;
    return this.geo(cached(`cyl${rt / rb}|${seg}`, () => new THREE.CylinderGeometry(rt / rb, 1, 1, seg, 1).translate(0, 0.5, 0)), { ...o, sx: rb, sy: h, sz: rb });
  }
  cone(r, h, o = {}) {
    const seg = o.seg ?? 8;
    return this.geo(cached(`cone${seg}`, () => new THREE.ConeGeometry(1, 1, seg, 1).translate(0, 0.5, 0)), { ...o, sx: r, sy: h, sz: r });
  }
  pyramid(w, h, o = {}) { return this.cone(w * 0.7071, h, { ...o, seg: 4, ry: (o.ry || 0) + Math.PI / 4 }); }
  /** gable roof: ridge along x, width w (x), depth d (z), height h */
  prism(w, h, d, o = {}) {
    const g = cached('prism', () => {
      const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
      const e = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
      e.translate(0, 0, -0.5); e.rotateY(Math.PI / 2);
      return e;
    });
    return this.geo(g, { ...o, sx: w, sy: h, sz: d });
  }
  dome(r, o = {}) {
    const seg = o.seg ?? 10;
    return this.geo(cached(`dome${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(3, seg >> 1), 0, Math.PI * 2, 0, Math.PI / 2)), { ...o, sx: r, sy: (o.sy ?? 1) * r, sz: r });
  }
  sphere(r, o = {}) {
    const seg = o.seg ?? 8;
    return this.geo(cached(`sph${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(3, seg >> 1))), { ...o, sx: r * (o.sx ?? 1), sy: r * (o.sy ?? 1), sz: r * (o.sz ?? 1) });
  }
  oct(r, o = {}) {
    return this.geo(cached('oct', () => new THREE.OctahedronGeometry(1, 0)), { ...o, sx: r * (o.sx ?? 1), sy: r * (o.sy ?? 1), sz: r * (o.sz ?? 1) });
  }
  rock(r, o = {}) {
    return this.geo(cached('ico', () => new THREE.IcosahedronGeometry(1, 0)), { ...o, sx: r * (o.sx ?? 1), sy: r * (o.sy ?? 0.7), sz: r * (o.sz ?? 1) });
  }
  torus(R, r, o = {}) {
    return this.geo(cached(`tor${o.seg ?? 16}|${(r / R).toFixed(3)}|${o.arc ?? 6.2832}`, () => new THREE.TorusGeometry(1, r / R, 4, o.seg ?? 16, o.arc ?? Math.PI * 2)), { ...o, sx: R, sy: R, sz: R });
  }

  /** instanced prototype (see protos.js): house-wall/house-roof/tree-*, etc. */
  instance(proto, o = {}) {
    const layer = o.layer || this.layer;
    const k = `${layer}|${proto}`;
    if (!this.inst.has(k)) this.inst.set(k, { layer, proto, items: [] });
    const m = placement(o, new THREE.Matrix4());
    if (this.stack.length) m.premultiply(this.stack[this.stack.length - 1]);
    this.inst.get(k).items.push({ m, c: new THREE.Color(o.color ?? '#ffffff') });
    return this;
  }

  /**
   * Merge everything into a Group. ctx = { mats, layers: {name: Group[]}, shadows: bool }.
   * Returned group has one child group per layer.
   */
  build(ctx, name = 'piece') {
    const root = new THREE.Group();
    root.name = name;
    const layerGroup = (layer) => {
      let g = root.children.find((c) => c.name === layer);
      if (!g) {
        g = new THREE.Group();
        g.name = layer;
        root.add(g);
        (ctx.layers[layer] ||= []).push(g);
      }
      return g;
    };
    for (const [layer, kinds] of this.parts) {
      const lg = layerGroup(layer);
      for (const [kind, geos] of kinds) {
        const merged = mergeGeometries(geos, false);
        geos.forEach((g) => g.dispose());
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, ctx.mats[kind]);
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        if (kind === 'solid') {
          mesh.castShadow = layer !== 'base';
          mesh.receiveShadow = true;
        }
        lg.add(mesh);
        if (kind === 'solid' && INKED.has(layer) && ctx.ink !== false) {
          const edges = new THREE.EdgesGeometry(merged, 38);
          const lines = new THREE.LineSegments(edges, ctx.mats.ink);
          lines.matrixAutoUpdate = false;
          lines.updateMatrix();
          lines.raycast = () => {};
          lg.add(lines);
        }
      }
    }
    for (const { layer, proto, items } of this.inst.values()) {
      const P = PROTOS[proto];
      if (!P) continue;
      const im = new THREE.InstancedMesh(P.geometry, ctx.mats.solid, items.length);
      items.forEach((it, i) => { im.setMatrixAt(i, it.m); im.setColorAt(i, it.c); });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = P.castShadow !== false;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      im.matrixAutoUpdate = false;
      im.updateMatrix();
      layerGroup(layer).add(im);
    }
    return root;
  }
}
