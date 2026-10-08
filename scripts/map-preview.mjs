#!/usr/bin/env node
// Renders data/map.json to docs/map-preview.svg for human sanity-checking,
// and prints basic validation (bounds, spacing, land/water placement).
// Usage: node scripts/map-preview.mjs   (no dependencies)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const map = JSON.parse(readFileSync(join(root, 'data/map.json'), 'utf8'));

const H = 1000;
const W = Math.round(H * map.canvas.aspect);
const X = (x) => +(x * W).toFixed(1);
const Y = (y) => +(y * H).toFixed(1);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pts = (line) => line.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');

// ---------- validation ----------
const MIN_DIST = 0.035;
const problems = [];
const places = Object.entries(map.places);
for (const [id, { x, y }] of places) {
  if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) problems.push(`out of bounds: ${id} (${x}, ${y})`);
}
for (let i = 0; i < places.length; i++) {
  for (let j = i + 1; j < places.length; j++) {
    const [a, pa] = places[i], [b, pb] = places[j];
    const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
    if (d < MIN_DIST - 1e-9) problems.push(`too close: ${a} / ${b} = ${d.toFixed(4)}`);
  }
}
const inPoly = (x, y, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const meta = map.coastMeta || [];
const waterIds = new Set(['sea-of-fallen-stars']); // landmarks that are meant to sit on water
const islandIds = new Set(['evermeet', 'caer-callidyrr', 'lantan']);
for (const [id, { x, y }] of places) {
  map.coast.forEach((line, i) => {
    const m = meta[i] || {};
    if (m.kind === 'water' && inPoly(x, y, line) && !waterIds.has(id)) problems.push(`on water (${m.name}): ${id}`);
  });
  if (islandIds.has(id)) {
    const ok = map.coast.some((line, i) => (meta[i] || {}).kind === 'island' && inPoly(x, y, line));
    if (!ok) problems.push(`island place not on an island outline: ${id}`);
  }
}
// West coast: mainland places must lie east of the Sword Coast line at their latitude.
const sword = map.coast[0];
const coastXAt = (y) => {
  for (let i = 1; i < sword.length; i++) {
    const [x0, y0] = sword[i - 1], [x1, y1] = sword[i];
    if ((y0 <= y && y <= y1) || (y1 <= y && y <= y0)) {
      if (y1 === y0) return Math.min(x0, x1);
      return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
    }
  }
  return null;
};
for (const [id, { x, y }] of places) {
  if (islandIds.has(id) || y > 0.78) continue;
  const cx = coastXAt(y);
  if (cx !== null && x < cx) problems.push(`west of the Sword Coast (in the sea): ${id}`);
}
// Relative-order assertions from docs/MAP.md.
const P = map.places;
const order = [
  ['luskan', 'y<', 'neverwinter'], ['neverwinter', 'y<', 'waterdeep'], ['waterdeep', 'y<', 'baldurs-gate'],
  ['baldurs-gate', 'y<', 'athkatla'], ['athkatla', 'y<', 'calimport'], ['evermeet', 'x<', 'caer-callidyrr'],
  ['caer-callidyrr', 'x<', 'waterdeep'], ['zhentil-keep', 'y<', 'suzail'], ['suzail', 'x<', 'selgaunt'],
  ['selgaunt', 'x<', 'eltabbar'], ['calimport', 'y<', 'port-nyanzaru'], ['lantan', 'x<', 'port-nyanzaru'],
];
for (const [a, op, b] of order) {
  const k = op[0];
  if (!(P[a][k] < P[b][k])) problems.push(`order violated: ${a}.${k} < ${b}.${k}`);
}

// ---------- render ----------
const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Georgia, serif">`);
out.push(`<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#7a6a50" stroke-width="1"/></pattern></defs>`);
out.push(`<rect width="${W}" height="${H}" fill="#e9dcbc"/>`);
out.push(`<g id="coast">`);
map.coast.forEach((line, i) => {
  const m = meta[i] || {};
  if (m.closed) {
    const fill = m.kind === 'water' ? '#b9c7c4' : '#e3d3ac';
    out.push(`<polygon data-name="${esc(m.name)}" points="${pts(line)}" fill="${fill}" stroke="#3b2f24" stroke-width="2"/>`);
  } else {
    out.push(`<polyline data-name="${esc(m.name || 'coast ' + i)}" points="${pts(line)}" fill="none" stroke="#3b2f24" stroke-width="2.5" stroke-linejoin="round"/>`);
  }
});
out.push(`</g><g id="ranges">`);
for (const r of map.ranges) {
  out.push(`<polyline data-name="${esc(r.name)}" points="${pts(r.points)}" fill="none" stroke="#6b5a42" stroke-width="2"/>`);
  // hatch ticks: short strokes perpendicular-ish ("^" marks) along each segment
  for (let i = 1; i < r.points.length; i++) {
    const [x0, y0] = r.points[i - 1], [x1, y1] = r.points[i];
    const n = Math.max(1, Math.round(Math.hypot((x1 - x0) * W, (y1 - y0) * H) / 12));
    for (let t = 0; t < n; t++) {
      const px = X(x0 + ((x1 - x0) * (t + 0.5)) / n), py = Y(y0 + ((y1 - y0) * (t + 0.5)) / n);
      out.push(`<path d="M${(px - 5).toFixed(1)},${(py + 4).toFixed(1)} L${px},${(py - 6).toFixed(1)} L${(px + 5).toFixed(1)},${(py + 4).toFixed(1)}" fill="none" stroke="#6b5a42" stroke-width="1.2"/>`);
    }
  }
}
out.push(`</g><g id="features">`);
const featStyle = {
  mountains: 'fill="#6b5a42" font-size="15" letter-spacing="2"',
  forest: 'fill="#4d6b3c" font-size="16" font-style="italic"',
  desert: 'fill="#9a6b2f" font-size="20" letter-spacing="6"',
  sea: 'fill="#3d5c66" font-size="17" font-style="italic" letter-spacing="3"',
  region: 'fill="#5a3d2b" font-size="17" letter-spacing="4" opacity="0.75"',
};
for (const f of map.features) {
  const dashed = f.style === 'dashed-inset';
  if (dashed) {
    const w = f.label.length * 12 + 20;
    out.push(`<rect x="${X(f.x) - w / 2}" y="${Y(f.y) - 18}" width="${w}" height="26" fill="none" stroke="#5a3d2b" stroke-dasharray="6 4"/>`);
  }
  out.push(`<text data-kind="${f.kind}" x="${X(f.x)}" y="${Y(f.y)}" text-anchor="middle" ${featStyle[f.kind] || ''}>${esc(f.label.toUpperCase())}</text>`);
}
out.push(`</g><g id="places">`);
for (const [id, { x, y }] of places) {
  out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="4" fill="#8b1e1e" stroke="#2b2420"/><text x="${X(x) + 6}" y="${Y(y) + 3}" font-size="10" fill="#2b2420">${esc(id)}</text>`);
}
out.push(`</g>`);
out.push(`<text x="12" y="${H - 12}" font-size="12" fill="#5a3d2b">Realms Atlas schematic preview — ${places.length} places — our own stylization, not a WotC map</text>`);
out.push(`</svg>`);

writeFileSync(join(root, 'docs/map-preview.svg'), out.join('\n') + '\n');
console.log(`wrote docs/map-preview.svg (${W}x${H}), ${places.length} places, ${map.coast.length} coast lines, ${map.ranges.length} ranges, ${map.features.length} features`);
if (problems.length) {
  console.log(`${problems.length} problem(s):\n  ` + problems.join('\n  '));
  process.exitCode = 1;
} else console.log('no problems found');
