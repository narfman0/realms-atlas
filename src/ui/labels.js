// HTML labels projected from 3D: one name label per diorama (decluttered), and layout captions
// (region columns / era rows). Updated every frame without allocations.
import * as THREE from 'three';
import { h, stateColor } from './dom.js';

const v = new THREE.Vector3();

export function createLabels(root, dioramas, { onClick, onHover }) {
  const names = dioramas.map((d, i) => {
    const dot = h('i', { class: 'st' });
    const el = h('div', { class: 'lbl name' }, dot, d.place.name);
    el.addEventListener('click', () => onClick(i));
    el.addEventListener('pointerenter', () => onHover(i));
    el.addEventListener('pointerleave', () => onHover(-1));
    root.append(el);
    return { el, dot, x: 0, y: 0, w: el.offsetWidth || 80, shown: true, tx: '', state: '' };
  });
  let caps = [];
  const rects = new Float32Array(dioramas.length * 4);
  const order = dioramas.map((_, i) => i);

  function setCaptions(list) {
    caps.forEach((c) => c.el.remove());
    caps = list.map((c) => {
      const el = h('div', { class: `lbl cap ${c.kind}` }, h('b', {}, c.text), c.sub ? h('span', {}, c.sub) : null);
      root.append(el);
      return { ...c, el, tx: '' };
    });
    requestAnimationFrame(() => caps.forEach((c) => { c.w = c.el.offsetWidth; }));
  }
  function setState(i, state) {
    const n = names[i];
    if (n.state === state) return;
    n.state = state;
    n.dot.style.background = stateColor(state);
    n.el.classList.toggle('gone', state === 'unfounded' || state === 'destroyed' || state === 'relocated');
  }

  /** per frame. camera, size {w,h}; visible(i) -> bool; prio(i) -> number; offsetY(i) world offset below tile */
  function update(camera, W, H, { focus = -1, hideAll = false, scaleOf }) {
    // priority: focused first, then by distance to camera (nearer first)
    let n = 0;
    for (let k = 0; k < order.length; k++) {
      const i = order[k];
      const d = dioramas[i];
      const lab = names[i];
      const s = scaleOf(i);
      v.set(d.root.position.x, d.root.position.y - 0.9 * s, d.root.position.z + 4.9 * s).project(camera);
      const on = !hideAll && v.z < 1 && v.x > -1.1 && v.x < 1.1 && v.y > -1.1 && v.y < 1.1;
      lab.x = (v.x * 0.5 + 0.5) * W;
      lab.y = (-v.y * 0.5 + 0.5) * H;
      lab.vis = on;
      lab.depth = v.z;
      void n;
    }
    order.sort((a, b) => (a === focus ? -1 : b === focus ? 1 : names[a].depth - names[b].depth));
    let placed = 0;
    for (let k = 0; k < order.length; k++) {
      const i = order[k];
      const lab = names[i];
      let show = lab.vis;
      const x0 = lab.x - lab.w / 2, y0 = lab.y, x1 = x0 + lab.w, y1 = y0 + 18;
      if (show) {
        for (let j = 0; j < placed; j++) {
          const o = j * 4;
          if (x0 < rects[o + 2] && x1 > rects[o] && y0 < rects[o + 3] && y1 > rects[o + 1]) { show = i === focus; break; }
        }
      }
      if (show) {
        const o = placed * 4;
        rects[o] = x0 - 4; rects[o + 1] = y0 - 2; rects[o + 2] = x1 + 4; rects[o + 3] = y1 + 2;
        placed++;
        const tx = `translate(${x0.toFixed(0)}px,${y0.toFixed(0)}px)`;
        if (tx !== lab.tx) { lab.el.style.transform = tx; lab.tx = tx; }
      }
      if (show !== lab.shown) { lab.el.classList.toggle('off', !show); lab.shown = show; }
    }
    for (const c of caps) {
      v.set(c.x, -0.9, c.z).project(camera);
      const on = !hideAll && c.active && v.z < 1;
      const px = (v.x * 0.5 + 0.5) * W, py = (-v.y * 0.5 + 0.5) * H;
      const ax = c.kind === 'era' ? px - (c.w || 120) : px - (c.w || 120) / 2;
      const tx = `translate(${ax.toFixed(0)}px,${(py - 20).toFixed(0)}px)`;
      if (tx !== c.tx) { c.el.style.transform = tx; c.tx = tx; }
      c.el.classList.toggle('off', !on);
    }
  }
  function measure() { names.forEach((n) => { n.w = n.el.offsetWidth || n.w; }); }
  return { setCaptions, setState, update, measure, get captions() { return caps; } };
}
