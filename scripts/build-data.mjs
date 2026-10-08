// Validate and merge the data files into src/generated/{places,timeline,map}.json.
//
//   node scripts/build-data.mjs            real data from data/ (falls back to the stub if data/places is empty)
//   node scripts/build-data.mjs --stub     placeholder records for every roster id (scripts/stub-data.mjs)
//   node scripts/build-data.mjs --fill     real data, plus stub records for roster ids that have no record yet
//   node scripts/build-data.mjs --strict   exit 1 if any record is rejected
//   node scripts/build-data.mjs --if-missing   only (re)build when outputs are missing or older than data/
//
// Invalid records are reported (console + docs/DATA-ERRORS.md) and skipped; the data files are never edited.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePlace, validateTimeline } from './schema.mjs';
import { ROSTER, REGIONS, ALL_IDS } from './roster.mjs';
import { stubPlaces, stubTimeline } from './stub-data.mjs';
import { stubMap } from './stub-map.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'src', 'generated');
const ERR_DOC = path.join(ROOT, 'docs', 'DATA-ERRORS.md');
const args = new Set(process.argv.slice(2));

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

function mtime(p) { try { return fs.statSync(p).mtimeMs; } catch { return 0; } }
function newestIn(dir) {
  let t = mtime(dir);
  if (!fs.existsSync(dir)) return t;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    t = Math.max(t, f.isDirectory() ? newestIn(p) : mtime(p));
  }
  return t;
}

if (args.has('--if-missing')) {
  const outT = Math.min(...['places.json', 'timeline.json', 'map.json'].map((f) => mtime(path.join(OUT, f))));
  const inT = Math.max(newestIn(DATA), mtime(path.join(ROOT, 'scripts')) , newestIn(path.join(ROOT, 'scripts')));
  if (outT && outT >= inT) process.exit(0);
}

const placeFiles = fs.existsSync(path.join(DATA, 'places'))
  ? fs.readdirSync(path.join(DATA, 'places')).filter((f) => f.endsWith('.json')).sort()
  : [];
const useStub = args.has('--stub') || placeFiles.length === 0;

const report = { rejected: [], warnings: [], fileErrors: [], timeline: [], map: [], missing: [], duplicates: [] };
let places = [];
let source;

function readJson(p) {
  const txt = fs.readFileSync(p, 'utf8');
  return JSON.parse(txt);
}

if (useStub) {
  source = 'stub';
  places = stubPlaces();
  if (!args.has('--stub')) console.log(yellow('data/places/ is empty — using stub records (scripts/stub-data.mjs).'));
} else {
  source = 'data';
  const seen = new Map();
  for (const f of placeFiles) {
    const rel = `data/places/${f}`;
    let arr;
    try { arr = readJson(path.join(DATA, 'places', f)); } catch (e) {
      report.fileErrors.push(`${rel}: JSON parse error — ${e.message}`);
      continue;
    }
    if (!Array.isArray(arr)) { report.fileErrors.push(`${rel}: top level must be an array of records`); continue; }
    arr.forEach((p, i) => {
      const label = `${rel}[${i}]${p && p.id ? ` (${p.id})` : ''}`;
      const { errors, warnings } = validatePlace(p, { knownRegions: REGIONS });
      warnings.forEach((w) => report.warnings.push(`${label}: ${w}`));
      if (errors.length) { report.rejected.push({ label, errors }); return; }
      if (seen.has(p.id)) { report.duplicates.push(`${label}: duplicate id, already defined in ${seen.get(p.id)}`); return; }
      seen.set(p.id, label);
      places.push(p);
    });
  }
  const have = new Set(places.map((p) => p.id));
  report.missing = ALL_IDS.filter((id) => !have.has(id));
  if (args.has('--fill') && report.missing.length) {
    const stubs = stubPlaces().filter((p) => report.missing.includes(p.id));
    places.push(...stubs);
    source = 'data+stub';
  }
}

/* ------------------------------------------------------------- map.json -- */
// Accepts the cartographer's file in a few plausible shapes and normalises it to
// { polylines: [{kind, closed, points:[[x,y]...]}], labels: [{text,x,y,size,kind,angle}], places: {id:[x,y]} }.
function normPoint(p) {
  if (Array.isArray(p)) return [+p[0], +p[1]];
  if (p && typeof p === 'object') return [+p.x, +p.y];
  return null;
}
function normPolyline(pl, kind) {
  if (Array.isArray(pl)) return { kind, closed: false, points: pl.map(normPoint).filter(Boolean) };
  if (pl && typeof pl === 'object') {
    const pts = pl.points || pl.path || pl.coords || pl.line || [];
    return {
      kind: pl.kind || pl.type || kind, closed: !!(pl.closed ?? pl.polygon ?? false), name: pl.name,
      points: pts.map(normPoint).filter(Boolean),
    };
  }
  return null;
}
function normaliseMap(raw) {
  const out = { polylines: [], labels: [], places: {}, aspect: 1.45 };
  if (!raw || typeof raw !== 'object') return out;
  if (raw.canvas && Number.isFinite(raw.canvas.aspect)) out.aspect = raw.canvas.aspect;
  // coordinates
  const pc = raw.places || raw.coords || raw.coordinates || raw.locations;
  if (Array.isArray(pc)) pc.forEach((e) => { if (e && e.id) out.places[e.id] = normPoint(e.map || e); });
  else if (pc && typeof pc === 'object') for (const [id, v] of Object.entries(pc)) out.places[id] = normPoint(v);
  // coast: array of polylines with a parallel coastMeta [{name, closed, kind: mainland|water|island}]
  const metaFor = (k) => (Array.isArray(raw[`${k}Meta`]) ? raw[`${k}Meta`] : []);
  const skip = new Set(['places', 'coords', 'coordinates', 'locations', 'labels', 'lettering', 'text', 'meta', 'canvas', 'version', 'features']);
  const addKind = (kind, val, metas = []) => {
    if (!Array.isArray(val)) return;
    const isSingle = val.length && (Array.isArray(val[0]) ? typeof val[0][0] === 'number' : typeof val[0]?.x === 'number');
    (isSingle ? [val] : val).forEach((pl, i) => {
      const n = normPolyline(pl, kind);
      if (!n || n.points.length < 2) return;
      const m = metas[i];
      if (m) { n.name ??= m.name; n.closed = !!(m.closed ?? n.closed); n.sub = m.kind; }
      out.polylines.push(n);
    });
  };
  for (const [k, v] of Object.entries(raw)) {
    if (skip.has(k) || k.endsWith('Meta')) continue;
    const kind = k === 'ranges' ? 'range' : k.replace(/s$/, '');
    if (Array.isArray(v)) addKind(kind, v, metaFor(k));
    else if (v && typeof v === 'object' && (k === 'linework' || k === 'layers')) {
      for (const [k2, v2] of Object.entries(v)) addKind(k2.replace(/s$/, ''), v2, metaFor(k2));
    }
  }
  // point features are lettering; line/area features are linework
  const pointish = [...(Array.isArray(raw.features) ? raw.features : []), ...(Array.isArray(raw.labels) ? raw.labels : [])];
  for (const l of pointish) {
    if (!l) continue;
    if (Array.isArray(l.points)) { const n = normPolyline(l, l.kind || 'feature'); if (n && n.points.length >= 2) out.polylines.push(n); }
    const text = l.label || l.text || l.name;
    const p = normPoint(l.at || l.pos || (Number.isFinite(l.x) ? l : null));
    if (!text || !p) continue;
    out.labels.push({ text, x: p[0], y: p[1], size: l.size ?? 1, kind: l.kind || l.type || 'label', angle: l.angle ?? l.rotate ?? 0, style: l.style });
  }
  return out;
}

let map;
const mapPath = path.join(DATA, 'map.json');
if (!useStub && fs.existsSync(mapPath)) {
  try { map = normaliseMap(readJson(mapPath)); } catch (e) { report.map.push(`data/map.json: ${e.message}`); }
}
if (!map) map = stubMap();
map.source = map.polylines.length && fs.existsSync(mapPath) && !useStub ? 'data' : 'stub';
if (map.source === 'stub') {
  // keep any place coords (none in stub); polylines from the stub
}

// merge coordinates into records; validate them now
for (const p of places) {
  const c = map.places[p.id];
  if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) p.map = { x: c[0], y: c[1] };
}
const noCoords = [];
const stubHints = Object.fromEntries(stubPlaces().map((s) => [s.id, s.map]));
for (const p of places) {
  const ok = p.map && Number.isFinite(p.map.x) && Number.isFinite(p.map.y);
  if (!ok) {
    noCoords.push(p.id);
    p.map = { ...(stubHints[p.id] || { x: 0.5, y: 0.5 }), approximate: true };
  } else if (p.map.x < 0 || p.map.x > 1 || p.map.y < 0 || p.map.y > 1) {
    report.map.push(`${p.id}: coordinates out of range (${p.map.x}, ${p.map.y}); clamped`);
    p.map.x = Math.min(1, Math.max(0, p.map.x)); p.map.y = Math.min(1, Math.max(0, p.map.y));
  }
}
if (noCoords.length && source !== 'stub') report.map.push(`no map coordinates for ${noCoords.length} place(s), using rough placeholders: ${noCoords.join(', ')}`);

/* -------------------------------------------------------- timeline.json -- */
let timeline = [];
let eras = null;
const tlPath = path.join(DATA, 'timeline.json');
const ids = new Set(places.map((p) => p.id));
if (!useStub && fs.existsSync(tlPath)) {
  try {
    const rawTl = readJson(tlPath);
    if (rawTl && Array.isArray(rawTl.eras)) eras = rawTl.eras;
    const { errors, warnings, events } = validateTimeline(rawTl, ids);
    report.timeline.push(...errors);
    warnings.forEach((w) => report.warnings.push(`data/timeline.json: ${w}`));
    timeline = events;
  } catch (e) { report.timeline.push(`data/timeline.json: ${e.message}`); }
} else timeline = stubTimeline();
timeline.sort((a, b) => a.year - b.year);
const timelineSource = !useStub && fs.existsSync(tlPath) ? 'data' : 'stub';

/* ------------------------------------------------------------- output -- */
// stable order: roster order, then any extras alphabetically
const order = new Map(ALL_IDS.map((id, i) => [id, i]));
places.sort((a, b) => (order.get(a.id) ?? 1e6) - (order.get(b.id) ?? 1e6) || a.id.localeCompare(b.id));
for (const p of places) {
  p.world ??= 'toril';
  p.aliases ??= [];
  for (const s of p.status) if (s.from === null) s.from = -35000; // null = since forever
  p.status.sort((a, b) => a.from - b.from);
  p.events.sort((a, b) => a.year - b.year);
  p.visual.motifs = (p.visual.motifs || []);
}

fs.mkdirSync(OUT, { recursive: true });
const meta = { source, timelineSource, mapSource: map.source, count: places.length, builtAt: new Date().toISOString() };
fs.writeFileSync(path.join(OUT, 'places.json'), JSON.stringify({ meta, places }));
fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({ eras, events: timeline }));
const { places: _omit, ...mapOut } = map;
fs.writeFileSync(path.join(OUT, 'map.json'), JSON.stringify(mapOut));

/* ------------------------------------------------------------- report -- */
const nErr = report.rejected.length + report.fileErrors.length + report.duplicates.length + report.timeline.length;
if (report.fileErrors.length) { console.error(red('File errors:')); report.fileErrors.forEach((e) => console.error(red(`  ✗ ${e}`))); }
if (report.rejected.length) {
  console.error(red(`Rejected ${report.rejected.length} record(s):`));
  for (const r of report.rejected) { console.error(red(`  ✗ ${r.label}`)); r.errors.forEach((e) => console.error(red(`      - ${e}`))); }
}
report.duplicates.forEach((d) => console.error(red(`  ✗ ${d}`)));
report.timeline.forEach((d) => console.error(red(`  ✗ ${d}`)));
if (report.map.length) report.map.forEach((m) => console.warn(yellow(`  ! map: ${m}`)));
if (source !== 'stub' && report.missing.length) console.warn(yellow(`  ! ${report.missing.length} roster id(s) have no record${args.has('--fill') ? ' (stubbed)' : ''}: ${report.missing.join(', ')}`));
if (report.warnings.length) console.warn(yellow(`  ! ${report.warnings.length} warning(s) (see docs/DATA-ERRORS.md)`));
console.log(green(`✓ ${places.length} places (${source}), ${timeline.length} timeline events (${timelineSource}), map linework: ${map.source} → src/generated/`));

if (source !== 'stub') {
  const L = ['# Data errors', '', `Generated by \`npm run data\` at ${meta.builtAt}. Data files are never edited by the build;`,
    'rejected records are skipped and the app is built from the valid ones.', ''];
  const sec = (t, arr, fmt = (x) => `- ${x}`) => { L.push(`## ${t} (${arr.length})`, ''); if (!arr.length) L.push('None.'); else arr.forEach((x) => L.push(fmt(x))); L.push(''); };
  sec('File errors', report.fileErrors);
  L.push(`## Rejected records (${report.rejected.length})`, '');
  if (!report.rejected.length) L.push('None.');
  report.rejected.forEach((r) => { L.push(`- **${r.label}**`); r.errors.forEach((e) => L.push(`  - ${e}`)); });
  L.push('');
  sec('Duplicate ids', report.duplicates);
  sec('Timeline errors', report.timeline);
  sec('Map', report.map);
  sec('Roster ids without a record', report.missing);
  sec('Warnings (records accepted)', report.warnings);
  fs.writeFileSync(ERR_DOC, L.join('\n'));
}
if (args.has('--strict') && nErr) process.exit(1);
