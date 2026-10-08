// The board: an endless vellum floor, a framed inlay for the current layout, and the parchment Map —
// the one canvas texture in the app — drawn in code from data/map.json (our own stylisation).
import * as THREE from 'three';
import { rng } from './kit/rng.js';
import { MAP_W } from './layouts/map.js';

export const FLOOR_Y = -0.9;

export function makeFloor() {
  const mat = new THREE.MeshStandardMaterial({ color: '#d9ccae', roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1400, 48), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = FLOOR_Y - 0.06;
  mesh.receiveShadow = true;
  return mesh;
}

/** a double ink frame around a rectangle (for Atlas/Chronicle boards) */
export function makeFrame() {
  const mat = new THREE.LineBasicMaterial({ color: '#4a3b2c', transparent: true, opacity: 0.55 });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 3 * 2), 3));
  const lines = new THREE.LineSegments(geo, mat);
  lines.position.y = FLOOR_Y + 0.005;
  lines.frustumCulled = false;
  lines.setBounds = (b, pad = 4) => {
    const a = geo.attributes.position.array;
    let k = 0;
    const rect = (x0, z0, x1, z1) => {
      const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
      for (let i = 0; i < 4; i++) {
        const p = pts[i], q = pts[(i + 1) % 4];
        a[k++] = p[0]; a[k++] = 0; a[k++] = p[1]; a[k++] = q[0]; a[k++] = 0; a[k++] = q[1];
      }
    };
    rect(b.x0 - pad, b.z0 - pad, b.x1 + pad, b.z1 + pad);
    rect(b.x0 - pad - 1.2, b.z0 - pad - 1.2, b.x1 + pad + 1.2, b.z1 + pad + 1.2);
    while (k < a.length) a[k++] = 0;
    geo.attributes.position.needsUpdate = true;
  };
  return lines;
}

/* ---------------------------------------------------------- parchment -- */

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** close the open mainland coastline(s) into a SEA polygon by walking the frame the way that keeps places out */
function seaPolygon(mainland, placesXY) {
  if (!mainland.length) return null;
  const line = mainland.flatMap((p) => p.points);
  const start = line[0], end = line[line.length - 1];
  // perimeter parameter, clockwise from the top-left corner: top 0..1, right 1..2, bottom 2..3, left 3..4
  const per = ([x, y]) => {
    const d = [y, 1 - x, 1 - y, x];
    const e = d.indexOf(Math.min(...d));
    return [x, 1 + y, 3 - x, 4 - y][e] % 4;
  };
  const cornerAt = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const walk = (from, to, dir) => {
    const a = per(from), b = per(to), out = [];
    if (dir > 0) { const e = b > a ? b : b + 4; for (let c = Math.floor(a) + 1; c < e; c++) out.push(cornerAt[c % 4]); }
    else { const e = b < a ? b : b - 4; for (let c = Math.ceil(a) - 1; c > e; c--) out.push(cornerAt[((c % 4) + 4) % 4]); }
    return out;
  };
  const options = [1, -1].map((dir) => [...line, ...walk(end, start, dir)]);
  const score = (poly) => placesXY.reduce((n, [x, y]) => n + (pointInPoly(x, y, poly) ? 1 : 0), 0);
  return score(options[0]) <= score(options[1]) ? options[0] : options[1];
}

/**
 * Draw the parchment map onto a canvas. map = {polylines, labels, aspect}; places = records (for site dots).
 */
export function drawParchment(map, places, { width = 3000 } = {}) {
  const aspect = map.aspect || 1.45;
  const W = width, H = Math.round(width / aspect);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const R = rng('parchment');
  const X = (x) => x * W, Y = (y) => y * H;
  const INK = '#3a2c20';
  const SEA = '#c9cdc0';
  const LAND = '#ecdfc0';

  const coasts = map.polylines.filter((p) => p.kind === 'coast');
  const mainland = coasts.filter((p) => p.sub === 'mainland' || (!p.closed && !p.sub));
  const waters = coasts.filter((p) => p.sub === 'water');
  const islands = coasts.filter((p) => p.sub === 'island' || (p.closed && !p.sub && p !== waters[0]));
  const placesXY = places.map((p) => [p.map?.x ?? 0.5, p.map?.y ?? 0.5]);
  const sea = seaPolygon(mainland, placesXY);

  const path = (pts, close = true) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
    if (close) g.closePath();
  };
  const ripples = (polys, n = 5) => {
    for (let k = n; k >= 1; k--) {
      for (const pts of polys) {
        path(pts, true);
        g.lineJoin = 'round';
        g.strokeStyle = `rgba(58,44,32,${0.05 + 0.1 * (1 - k / n)})`;
        g.lineWidth = k * 16 + 3;
        g.stroke();
        g.strokeStyle = SEA;
        g.lineWidth = k * 16;
        g.stroke();
      }
    }
  };

  // 1. sea everywhere
  g.fillStyle = SEA;
  g.fillRect(0, 0, W, H);
  // 2. ripples along the outer sea and islands
  if (sea) ripples([sea]);
  ripples(islands.map((p) => p.points));
  // 3. land = frame minus the sea polygon
  g.fillStyle = LAND;
  g.beginPath();
  g.rect(0, 0, W, H);
  if (sea) sea.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.closePath();
  g.fill('evenodd');
  // 4. inland seas: fill with sea, ripples inside only
  for (const w of waters) {
    g.save();
    path(w.points); g.clip();
    g.fillStyle = SEA; g.fillRect(0, 0, W, H);
    ripples([w.points], 4);
    g.restore();
  }
  // 5. islands
  for (const isl of islands) { path(isl.points); g.fillStyle = LAND; g.fill(); }
  // 6. paper texture: blotches and fibres
  for (let i = 0; i < 260; i++) {
    const x = R() * W, y = R() * H, r = 20 + R() * 160;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(120,90,50,${0.015 + R() * 0.035})`);
    grd.addColorStop(1, 'rgba(120,90,50,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.strokeStyle = 'rgba(90,70,40,0.05)';
  g.lineWidth = 1;
  for (let i = 0; i < 1400; i++) {
    const x = R() * W, y = R() * H, l = 6 + R() * 26, a = R() * Math.PI;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // vignette
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(90,60,30,0)');
  vg.addColorStop(1, 'rgba(90,60,30,0.28)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  // graticule
  g.strokeStyle = 'rgba(58,44,32,0.12)';
  g.lineWidth = 2;
  g.setLineDash([10, 14]);
  for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo((W * i) / 10, 0); g.lineTo((W * i) / 10, H); g.stroke(); }
  for (let i = 1; i < 7; i++) { g.beginPath(); g.moveTo(0, (H * i) / 7); g.lineTo(W, (H * i) / 7); g.stroke(); }
  g.setLineDash([]);

  // 7. coast ink
  g.strokeStyle = INK;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  for (const c of coasts) {
    path(c.points, c.closed);
    g.lineWidth = 4.5;
    g.stroke();
  }
  // 8. rivers & other linework
  for (const p of map.polylines.filter((p) => p.kind === 'river')) {
    path(p.points, false);
    g.strokeStyle = 'rgba(58,44,32,0.7)'; g.lineWidth = 3; g.stroke();
  }
  // 9. mountain ranges: rows of little shaded peaks along each spine
  for (const rg of map.polylines.filter((p) => p.kind === 'range' || p.kind === 'mountain')) {
    const pts = rg.points.map(([x, y]) => [X(x), Y(y)]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const L = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(1, Math.floor(L / 30));
      for (let k = 0; k < n; k++) {
        const t = (k + R() * 0.4) / n;
        const x = x1 + (x2 - x1) * t + (R() - 0.5) * 16, y = y1 + (y2 - y1) * t + (R() - 0.5) * 16;
        peak(g, x, y, 16 + R() * 14, INK);
      }
    }
  }
  // 10. forests and deserts around their labels
  for (const f of map.labels.filter((l) => l.kind === 'forest')) {
    for (let i = 0; i < 70; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 120;
      const x = X(f.x) + Math.cos(a) * d * 1.3, y = Y(f.y) + Math.sin(a) * d * 0.85 + 22;
      tree(g, x, y, 7 + R() * 5, INK);
    }
  }
  for (const f of map.labels.filter((l) => l.kind === 'desert')) {
    g.fillStyle = 'rgba(58,44,32,0.35)';
    for (let i = 0; i < 900; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 220;
      g.fillRect(X(f.x) + Math.cos(a) * d * 1.2, Y(f.y) + Math.sin(a) * d * 0.9, 2.2, 2.2);
    }
  }
  // 11. lettering
  for (const l of map.labels) {
    const sea2 = l.kind === 'sea';
    const region = l.kind === 'region';
    const size = (sea2 ? 44 : region ? 40 : 34) * (l.size || 1);
    g.save();
    g.translate(X(l.x), Y(l.y));
    if (l.angle) g.rotate((l.angle * Math.PI) / 180);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `${sea2 ? 'italic 500' : region ? '600' : 'italic 600'} ${size}px "Cormorant Garamond", Georgia, serif`;
    const text = region ? spaced(l.text.toUpperCase()) : l.text;
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(236,223,192,0.85)';
    g.strokeText(text, 0, 0);
    g.fillStyle = sea2 ? 'rgba(42,60,72,0.85)' : 'rgba(58,44,32,0.92)';
    g.fillText(text, 0, 0);
    if (l.style === 'dashed-inset') {
      const w = g.measureText(text).width + 40;
      g.setLineDash([10, 8]);
      g.strokeStyle = 'rgba(58,44,32,0.7)';
      g.lineWidth = 2.5;
      g.strokeRect(-w / 2, -size * 0.8, w, size * 1.6);
      g.setLineDash([]);
    }
    g.restore();
  }
  // 12. site dots (the true position of every place)
  for (const p of places) {
    const x = X(p.map?.x ?? 0.5), y = Y(p.map?.y ?? 0.5);
    g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2);
    g.fillStyle = LAND; g.fill();
    g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(x, y, 2.5, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
  }
  // 13. frame, compass, cartouche
  g.strokeStyle = INK;
  g.lineWidth = 10; g.strokeRect(14, 14, W - 28, H - 28);
  g.lineWidth = 2.5; g.strokeRect(34, 34, W - 68, H - 68);
  for (let i = 0; i < 60; i++) { // tick border
    const t = i / 60;
    g.beginPath(); g.moveTo(34 + t * (W - 68), 34); g.lineTo(34 + t * (W - 68), i % 5 ? 44 : 52); g.stroke();
    g.beginPath(); g.moveTo(34 + t * (W - 68), H - 34); g.lineTo(34 + t * (W - 68), H - (i % 5 ? 44 : 52)); g.stroke();
  }
  compass(g, W - 230, 230, 130, INK);
  g.save();
  g.translate(220, H - 170);
  g.textAlign = 'left';
  g.fillStyle = INK;
  g.font = '600 92px "Cormorant Garamond", Georgia, serif';
  g.fillText(spaced('FAERÛN'), 0, 0);
  g.font = 'italic 500 40px "Cormorant Garamond", Georgia, serif';
  g.fillText('a schematic chart, not to scale', 6, 54);
  g.restore();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const spaced = (s) => s.split('').join(' ');

function peak(g, x, y, s, ink) {
  g.beginPath();
  g.moveTo(x - s, y + s * 0.5);
  g.lineTo(x - s * 0.1, y - s * 0.75);
  g.lineTo(x + s, y + s * 0.5);
  g.fillStyle = 'rgba(236,223,192,0.95)';
  g.fill();
  g.strokeStyle = ink;
  g.lineWidth = 2.6;
  g.stroke();
  // hatching on the east flank
  g.lineWidth = 1.4;
  for (let k = 1; k < 4; k++) {
    const t = k / 4;
    g.beginPath();
    g.moveTo(x - s * 0.1 + (s * 1.1) * t * 0.5, y - s * 0.75 + s * 1.25 * t * 0.5);
    g.lineTo(x - s * 0.1 + (s * 0.4) * t, y + s * 0.5);
    g.stroke();
  }
}
function tree(g, x, y, s, ink) {
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + s * 0.9);
  g.strokeStyle = ink; g.lineWidth = 1.6; g.stroke();
  g.beginPath(); g.arc(x, y - s * 0.2, s * 0.6, 0, Math.PI * 2);
  g.fillStyle = 'rgba(236,223,192,0.9)'; g.fill();
  g.lineWidth = 2; g.stroke();
}
function compass(g, x, y, r, ink) {
  g.save(); g.translate(x, y);
  g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 2.5;
  g.beginPath(); g.arc(0, 0, r * 0.62, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(0, 0, r * 0.68, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2, L = i % 2 ? r * 0.6 : r;
    g.beginPath();
    g.moveTo(Math.cos(a) * L, Math.sin(a) * L);
    g.lineTo(Math.cos(a + 0.3) * r * 0.16, Math.sin(a + 0.3) * r * 0.16);
    g.lineTo(Math.cos(a - 0.3) * r * 0.16, Math.sin(a - 0.3) * r * 0.16);
    g.closePath();
    if (i % 2) g.stroke(); else g.fill();
  }
  g.font = '600 46px "Cormorant Garamond", Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('N', 0, -r - 30);
  g.restore();
}

export function makeMapBoard(map, places) {
  const aspect = map.aspect || 1.45;
  const W = MAP_W, H = MAP_W / aspect;
  const tex = drawParchment(map, places);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 24, 16), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = FLOOR_Y + 0.04;
  mesh.receiveShadow = true;
  mesh.renderOrder = -1;
  // a wooden rim around it so it reads as a board (no slab underneath: coplanar faces z-fight at grazing angles)
  const rimMat = new THREE.MeshStandardMaterial({ color: '#5a4330', roughness: 0.8, transparent: true, opacity: 0 });
  const slab = new THREE.Group();
  const rim = 2.2, rh = 0.7;
  for (const [w, d, x, z] of [[W + rim * 2, rim, 0, -(H + rim) / 2], [W + rim * 2, rim, 0, (H + rim) / 2], [rim, H, -(W + rim) / 2, 0], [rim, H, (W + rim) / 2, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, rh, d), rimMat);
    m.position.set(x, FLOOR_Y - rh / 2 + 0.12, z);
    m.receiveShadow = true;
    slab.add(m);
  }
  slab.material = rimMat;
  const group = new THREE.Group();
  group.add(slab, mesh);
  group.userData.set = (k) => {
    mat.opacity = k; slab.material.opacity = k;
    group.visible = k > 0.01;
    mat.depthWrite = k > 0.99; slab.material.transparent = k < 0.99;
  };
  group.userData.set(0);
  return group;
}

/** leader lines from each place's true map point to its (nudged) diorama */
export function makeLeaders(n) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 6), 3));
  const mat = new THREE.LineBasicMaterial({ color: '#3a2c20', transparent: true, opacity: 0 });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.userData.update = (home, items) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < n; i++) {
      const [hx, hz] = home[i], it = items[i];
      const far = Math.hypot(it.x - hx, it.z - hz) > 0.8;
      a[i * 6] = hx; a[i * 6 + 1] = FLOOR_Y + 0.03; a[i * 6 + 2] = hz;
      a[i * 6 + 3] = far ? it.x : hx; a[i * 6 + 4] = FLOOR_Y + 0.03; a[i * 6 + 5] = far ? it.z : hz;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return lines;
}
