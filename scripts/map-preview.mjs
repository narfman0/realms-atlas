#!/usr/bin/env node
// Renders a schematic map to an SVG for human sanity-checking, and prints basic validation
// (bounds, spacing, land/water placement, relative order).
// Usage: node scripts/map-preview.mjs           data/map.json        -> docs/map-preview.svg (Faerûn)
//        node scripts/map-preview.mjs <world>   data/maps/<world>.json -> docs/map-preview-<world>.svg
// (no dependencies)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv[2];
const world = !arg || arg === 'toril' ? null : arg; // null = Faerûn (the original behaviour)
const mapFile = world ? `data/maps/${world}.json` : 'data/map.json';
const svgFile = world ? `docs/map-preview-${world}.svg` : 'docs/map-preview.svg';
if (!existsSync(join(root, mapFile))) {
  console.error(`no such map: ${mapFile}`);
  process.exit(2);
}
const map = JSON.parse(readFileSync(join(root, mapFile), 'utf8'));
const H = 1000;
const W = Math.round(H * map.canvas.aspect);

// Per-world checks. Faerûn's live inline below, unchanged; `rules` holds the phase-2 worlds'.
// water: ids meant to sit on water; islands: ids that must sit on an island outline;
// order: [a, 'x<'|'y<', b]; radius: [ids, r] for ring/orbit layouts (distance from the centre (0.5, 0.5)).
const GATES = ['excelsior', 'tradegate', 'ecstasy', 'faunel', 'sylvania', 'glorium', 'xaos', 'bedlam', 'plague-mort',
  'curst', 'hopeless', 'torch', 'ribcage', 'rigus', 'automata', 'fortitude'].map((s) => `ps-${s}`);
const OUTER = ['mount-celestia', 'bytopia', 'elysium', 'beastlands', 'arborea', 'ysgard', 'limbo', 'pandemonium',
  'the-abyss', 'carceri', 'gray-waste', 'gehenna', 'baator', 'acheron', 'mechanus', 'arcadia'].map((s) => `ps-${s}`);
const rules = {
  'ten-towns': {
    water: ['tt-sea-of-moving-ice'],
    order: [
      ['tt-targos', 'x<', 'tt-bryn-shander'], ['tt-bryn-shander', 'x<', 'tt-easthaven'], ['tt-bremen', 'x<', 'tt-targos'],
      ['tt-lonelywood', 'y<', 'tt-termalaine'], ['tt-termalaine', 'y<', 'tt-targos'], ['tt-caer-konig', 'y<', 'tt-caer-dineval'],
      ['tt-caer-dineval', 'y<', 'tt-easthaven'], ['tt-kelvins-cairn', 'y<', 'tt-bryn-shander'], ['tt-bryn-shander', 'y<', 'tt-good-mead'],
      ['tt-good-mead', 'y<', 'tt-dougans-hole'], ['tt-easthaven', 'x<', 'tt-reghed-glacier'], ['tt-sea-of-moving-ice', 'x<', 'tt-bremen'],
    ],
  },
  'kara-tur': {
    islands: ['kt-uwaji', 'kt-dojyu'],
    order: [
      ['kt-karatin', 'x<', 'kt-xi-hulang'], ['kt-xi-hulang', 'x<', 'kt-dojyu'], ['kt-dojyu', 'y<', 'kt-uwaji'],
      ['kt-u-chan-gompa', 'x<', 'kt-karatin'], ['kt-karatin', 'y<', 'kt-u-chan-gompa'], ['kt-saikhoi', 'x<', 'kt-u-chan-gompa'],
      ['kt-karatin', 'y<', 'kt-wai'], ['kt-plain-of-horses', 'y<', 'kt-dragonwall'], ['kt-dragonwall', 'y<', 'kt-kuo-te-lung'],
      ['kt-kuo-te-lung', 'x<', 'kt-karatin'],
    ],
  },
  zakhara: {
    water: ['zk-golden-gulf'],
    islands: ['zk-afyal', 'zk-hawa'],
    order: [['zk-qudra', 'y<', 'zk-huzuz'], ['zk-hawa', 'x<', 'zk-huzuz'], ['zk-huzuz', 'x<', 'zk-afyal'], ['zk-hiyal', 'x<', 'zk-huzuz'],
      ['zk-huzuz', 'y<', 'zk-golden-gulf'], ['zk-golden-gulf', 'y<', 'zk-jumlat'], ['zk-huzuz', 'x<', 'zk-haunted-lands']],
  },
  maztica: {
    islands: ['mz-nexal'],
    order: [['mz-nexal', 'x<', 'mz-ulatos'], ['mz-nexal', 'x<', 'mz-helmsport'], ['mz-huacli', 'x<', 'mz-nexal'],
      ['mz-kultaka', 'y<', 'mz-nexal'], ['mz-nexal', 'y<', 'mz-house-of-tezca'], ['mz-ulatos', 'x<', 'mz-far-payit'],
      ['mz-nexal', 'x<', 'mz-pezelac'], ['mz-pezelac', 'x<', 'mz-ulatos']],
  },
  laerakond: {
    order: [['la-fimbrul', 'y<', 'la-tarmalune'], ['la-melabrauth', 'y<', 'la-sambral'], ['la-harglast', 'x<', 'la-imdolphyn'],
      ['la-imdolphyn', 'x<', 'la-tarmalune'], ['la-tarmalune', 'x<', 'la-ramekho'], ['la-ramekho', 'x<', 'la-sambral']],
  },
  planes: {
    exempt: [],
    radius: [[GATES, 0.33], [OUTER, 0.46], [['ps-sigil'], 0]],
    order: [['ps-excelsior', 'y<', 'ps-sigil'], ['ps-sigil', 'y<', 'ps-plague-mort']],
  },
  realmspace: { dark: true },
};
const R = (world && rules[world]) || {};
let landPoly = null; // phase-2 worlds: the land side of the mainland coast, for the preview fill

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
const waterIds = new Set(world ? R.water || [] : ['sea-of-fallen-stars']); // landmarks that are meant to sit on water
const islandIds = new Set(world ? R.islands || [] : ['evermeet', 'caer-callidyrr', 'lantan']);
for (const [id, { x, y }] of places) {
  map.coast.forEach((line, i) => {
    const m = meta[i] || {};
    const isle = world && map.coast.some((l2, k) => (meta[k] || {}).kind === 'island' && inPoly(x, y, l2));
    if (m.kind === 'water' && inPoly(x, y, line) && !waterIds.has(id) && !isle) problems.push(`on water (${m.name}): ${id}`);
  });
  if (islandIds.has(id)) {
    const ok = map.coast.some((line, i) => (meta[i] || {}).kind === 'island' && inPoly(x, y, line));
    if (!ok) problems.push(`island place not on an island outline: ${id}`);
  }
}
if (!world) {
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
} else {
  const P = map.places;
  for (const [a, op, b] of R.order || []) {
    const k = op[0];
    if (!P[a] || !P[b]) { problems.push(`order rule names a missing place: ${!P[a] ? a : b}`); continue; }
    if (!(P[a][k] < P[b][k])) problems.push(`order violated: ${a}.${k} < ${b}.${k}`);
  }
  for (const [ids, r] of R.radius || []) {
    for (const id of ids) {
      if (!P[id]) { problems.push(`ring place missing: ${id}`); continue; }
      const d = Math.hypot(P[id].x - 0.5, P[id].y - 0.5);
      if (Math.abs(d - r) > 0.002) problems.push(`off its ring: ${id} at r=${d.toFixed(3)}, want ${r}`);
    }
  }
  // Land side: close the mainland line(s) along the frame the way the board does (the side holding more
  // places is land); every place must be on land or an island, except the water landmarks.
  const mainland = map.coast.filter((_, i) => (meta[i] || {}).kind === 'mainland').flat();
  if (mainland.length) {
    const per = ([x, y]) => { const d = [y, 1 - x, 1 - y, x]; const e = d.indexOf(Math.min(...d)); return [x, 1 + y, 3 - x, 4 - y][e] % 4; };
    const corner = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const walk = (from, to, dir) => {
      const a = per(from), b = per(to), o = [];
      if (dir > 0) { const e = b > a ? b : b + 4; for (let c = Math.floor(a) + 1; c < e; c++) o.push(corner[c % 4]); }
      else { const e = b < a ? b : b - 4; for (let c = Math.ceil(a) - 1; c > e; c--) o.push(corner[((c % 4) + 4) % 4]); }
      return o;
    };
    const end = mainland[mainland.length - 1], start = mainland[0];
    const opts = [1, -1].map((dir) => [...mainland, ...walk(end, start, dir)]);
    const count = (poly) => places.filter(([, { x, y }]) => inPoly(x, y, poly)).length;
    const land = count(opts[0]) >= count(opts[1]) ? opts[0] : opts[1];
    landPoly = land;
    for (const [id, { x, y }] of places) {
      const onIsland = map.coast.some((line, i) => (meta[i] || {}).kind === 'island' && inPoly(x, y, line));
      const onLand = inPoly(x, y, land) || onIsland;
      if (waterIds.has(id) && onLand) problems.push(`water landmark on land: ${id}`);
      if (!waterIds.has(id) && !onLand) problems.push(`in the sea: ${id}`);
    }
  }
  // Roster: every place of this world has a position, and nothing extra is placed.
  const pf = join(root, `data/places/${world}.json`);
  if (existsSync(pf)) {
    let recs = JSON.parse(readFileSync(pf, 'utf8'));
    if (!Array.isArray(recs)) recs = recs.places || [];
    const ids = new Set(recs.map((r) => r.id));
    for (const id of ids) if (!P[id]) problems.push(`no position for ${id} (in data/places/${world}.json)`);
    for (const [id] of places) if (!ids.has(id)) problems.push(`placed but not in data/places/${world}.json: ${id}`);
    for (const r of recs) {
      if (r.map && Number.isFinite(r.map.x) && P[r.id] && (Math.abs(r.map.x - P[r.id].x) > 1e-6 || Math.abs(r.map.y - P[r.id].y) > 1e-6)) {
        console.log(`note: ${r.id} map field (${r.map.x}, ${r.map.y}) differs from ${mapFile}; the map file wins`);
      }
    }
  } else console.log(`note: data/places/${world}.json not found; roster not cross-checked`);
}

// ---------- render ----------
const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Georgia, serif">`);
out.push(`<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#7a6a50" stroke-width="1"/></pattern></defs>`);
const dark = !!R.dark;
const INK = dark ? '#c9c2ae' : '#3b2f24';
if (dark) {
  out.push(`<rect width="${W}" height="${H}" fill="#121726"/>`);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) out.push(`<circle cx="${(rnd() * W).toFixed(1)}" cy="${(rnd() * H).toFixed(1)}" r="${(0.4 + rnd() * 1.2).toFixed(2)}" fill="#e8e2cf" opacity="${(0.25 + rnd() * 0.6).toFixed(2)}"/>`);
} else if (world && landPoly) {
  out.push(`<rect width="${W}" height="${H}" fill="#b9c7c4"/>`);
  out.push(`<polygon data-name="land" points="${pts(landPoly)}" fill="#e9dcbc" stroke="none"/>`);
} else out.push(`<rect width="${W}" height="${H}" fill="#e9dcbc"/>`);
if (world && Array.isArray(map.guides)) {
  out.push(`<g id="guides">`);
  for (const g of map.guides) {
    if (g.kind === 'circle') {
      out.push(`<circle data-name="${esc(g.name || '')}" cx="${X(g.cx)}" cy="${Y(g.cy)}" r="${(g.r * H).toFixed(1)}" fill="none" stroke="${INK}" stroke-opacity="${dark ? 0.35 : 0.55}" stroke-width="${dark ? 1.2 : 2}"/>`);
    } else if (g.kind === 'spokes') {
      for (let k = 0; k < g.count; k++) {
        const a = ((g.startDeg + (360 * k) / g.count) * Math.PI) / 180;
        out.push(`<line x1="${X(g.cx + g.r0 * Math.cos(a))}" y1="${Y(g.cy + g.r0 * Math.sin(a))}" x2="${X(g.cx + g.r1 * Math.cos(a))}" y2="${Y(g.cy + g.r1 * Math.sin(a))}" stroke="${INK}" stroke-opacity="0.3" stroke-dasharray="4 6"/>`);
      }
    }
  }
  out.push(`</g>`);
}
out.push(`<g id="coast">`);
map.coast.forEach((line, i) => {
  const m = meta[i] || {};
  if (m.closed) {
    const fill = m.kind === 'water' ? '#b9c7c4' : '#e3d3ac';
    out.push(`<polygon data-name="${esc(m.name)}" points="${pts(line)}" fill="${fill}" stroke="#3b2f24" stroke-width="2"/>`);
  } else if (m.kind === 'ice') {
    out.push(`<polyline data-name="${esc(m.name || 'ice ' + i)}" points="${pts(line)}" fill="none" stroke="#5f7f8c" stroke-width="2.5" stroke-dasharray="10 5" stroke-linejoin="round"/>`);
  } else {
    out.push(`<polyline data-name="${esc(m.name || 'coast ' + i)}" points="${pts(line)}" fill="none" stroke="#3b2f24" stroke-width="2.5" stroke-linejoin="round"/>`);
  }
});
if (world && Array.isArray(map.rivers)) {
  out.push(`</g><g id="rivers">`);
  map.rivers.forEach((rv, i) => out.push(`<polyline data-name="${esc((map.riversMeta || [])[i]?.name || 'river')}" points="${pts(rv)}" fill="none" stroke="#4f6f78" stroke-width="2" stroke-linejoin="round"/>`));
}
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
  let st = featStyle[f.kind] || '';
  if (world && f.size) st = st.replace(/font-size="(\d+)"/, (_, n) => `font-size="${Math.round(n * f.size)}"`);
  if (dark) st = st.replace(/fill="#[0-9a-f]+"/, 'fill="#a9b8c9"');
  out.push(`<text data-kind="${f.kind}" x="${X(f.x)}" y="${Y(f.y)}" text-anchor="middle" ${st}>${esc(f.label.toUpperCase())}</text>`);
}
out.push(`</g><g id="places">`);
for (const [id, { x, y }] of places) {
  if (dark) out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="5" fill="#e0a83a" stroke="#f3ead2"/><text x="${X(x) + 7}" y="${Y(y) + 4}" font-size="13" fill="#f3ead2">${esc(id)}</text>`);
  else if (world) out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="5" fill="#8b1e1e" stroke="#2b2420"/><text x="${X(x) + 7}" y="${Y(y) + 4}" font-size="13" fill="#2b2420">${esc(id)}</text>`);
  else out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="4" fill="#8b1e1e" stroke="#2b2420"/><text x="${X(x) + 6}" y="${Y(y) + 3}" font-size="10" fill="#2b2420">${esc(id)}</text>`);
}
out.push(`</g>`);
out.push(`<text x="12" y="${H - 12}" font-size="12" fill="${dark ? '#a9b8c9' : '#5a3d2b'}">Realms Atlas schematic preview${world ? ` (${world})` : ''} — ${places.length} places — our own stylization, not a WotC map</text>`);
out.push(`</svg>`);

writeFileSync(join(root, svgFile), out.join('\n') + '\n');
console.log(`wrote ${svgFile} (${W}x${H}), ${places.length} places, ${map.coast.length} coast lines, ${map.ranges.length} ranges, ${map.features.length} features`);
if (problems.length) {
  console.log(`${problems.length} problem(s):\n  ` + problems.join('\n  '));
  process.exitCode = 1;
} else console.log('no problems found');
