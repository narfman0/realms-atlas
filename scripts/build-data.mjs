// Validate and merge the data files into src/generated/{places,timeline,maps,stories}.json.
// Phase 2: every world (data/worlds.json) is merged; data/places/<world>.json holds a world's records (the
// Faerûn region files are world "toril"), data/maps/<world>.json its chart, data/stories.json the tales.
//
//   node scripts/build-data.mjs            real data from data/ (falls back to the stub if data/places is empty)
//   node scripts/build-data.mjs --stub     placeholder records for every roster id (scripts/stub-data.mjs)
//   node scripts/build-data.mjs --fill     real data, plus stub records for roster ids that have no record yet
//   node scripts/build-data.mjs --strict   exit 1 if any record is rejected
//   node scripts/build-data.mjs --if-missing   only (re)build when outputs are missing or older than data/
//   node scripts/build-data.mjs --world planes  add stub records for a world that has no file yet
//                                               (repeatable; --world all stubs every missing world)
//
// Invalid records are reported (console + docs/DATA-ERRORS.md) and skipped; the data files are never edited.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePlace, validateTimeline, validateStories, TERRAINS, TYPES } from './schema.mjs';
import { REGIONS, ALL_IDS, DEFAULT_WORLDS, WORLD_PREFIX } from './roster.mjs';
import { stubPlaces, stubTimeline, stubWorld, stubWorldMap, stubStories } from './stub-data.mjs';
import { stubMap } from './stub-map.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'src', 'generated');
const ERR_DOC = path.join(ROOT, 'docs', 'DATA-ERRORS.md');
const argv = process.argv.slice(2);
const args = new Set(argv);
const stubWorlds = new Set(argv.flatMap((a, i) => (a === '--world' && argv[i + 1] ? [argv[i + 1]] : [])));

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
  const outT = Math.min(...['places.json', 'timeline.json', 'maps.json', 'stories.json'].map((f) => mtime(path.join(OUT, f))));
  const inT = Math.max(newestIn(DATA), mtime(path.join(ROOT, 'scripts')) , newestIn(path.join(ROOT, 'scripts')));
  if (outT && outT >= inT) process.exit(0);
}

const placeFiles = fs.existsSync(path.join(DATA, 'places'))
  ? fs.readdirSync(path.join(DATA, 'places')).filter((f) => f.endsWith('.json')).sort()
  : [];
const useStub = args.has('--stub') || placeFiles.length === 0;

const report = { rejected: [], warnings: [], fileErrors: [], timeline: [], map: [], missing: [], duplicates: [], stories: [] };
let places = [];
let source;

function readJson(p) {
  const txt = fs.readFileSync(p, 'utf8');
  return JSON.parse(txt);
}

/* ----------------------------------------------------------- worlds.json -- */
let worlds = DEFAULT_WORLDS;
const worldsPath = path.join(DATA, 'worlds.json');
if (fs.existsSync(worldsPath)) {
  try {
    const raw = readJson(worldsPath);
    const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.worlds) ? raw.worlds : null;
    if (!list) throw new Error('top level must be an array of worlds');
    const ok = list.filter((w) => w && typeof w.id === 'string' && typeof w.name === 'string');
    if (ok.length !== list.length) report.fileErrors.push('data/worlds.json: some entries lack id/name and were skipped');
    // keep the default worlds the file does not mention (so a partial file never hides a board)
    const byId = new Map(ok.map((w) => [w.id, w]));
    worlds = [...ok, ...DEFAULT_WORLDS.filter((w) => !byId.has(w.id))];
  } catch (e) { report.fileErrors.push(`data/worlds.json: ${e.message}`); }
}
if (!worlds.some((w) => w.id === 'toril')) worlds.unshift(DEFAULT_WORLDS[0]);
const WORLD_IDS = worlds.map((w) => w.id);
/** which world a data/places file belongs to: <world>.json for the other worlds, else Faerûn (toril) */
const worldOfFile = (f) => { const b = f.replace(/\.json$/, ''); return WORLD_IDS.includes(b) && b !== 'toril' ? b : 'toril'; };

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
    const fileWorld = worldOfFile(f);
    arr.forEach((p, i) => {
      const label = `${rel}[${i}]${p && p.id ? ` (${p.id})` : ''}`;
      if (p && typeof p === 'object' && p.world == null) p.world = fileWorld;
      const { errors, warnings } = validatePlace(p, { knownRegions: p?.world === 'toril' ? REGIONS : null, worlds: WORLD_IDS, world: p?.world });
      if (p && p.world && p.world !== fileWorld) warnings.push(`world "${p.world}" differs from its file's world "${fileWorld}"`);
      const pre = WORLD_PREFIX[p?.world];
      if (pre && typeof p.id === 'string' && !p.id.startsWith(pre)) warnings.push(`id should start with "${pre}" in world ${p.world}`);
      warnings.forEach((w) => report.warnings.push(`${label}: ${w}`));
      if (errors.length) { report.rejected.push({ label, errors }); return; }
      if (seen.has(p.id)) { report.duplicates.push(`${label}: duplicate id, already defined in ${seen.get(p.id)}`); return; }
      seen.set(p.id, label);
      places.push(p);
    });
  }
  const have = new Set(places.map((p) => p.id));
  // only Faerûn has a fixed roster; for the other worlds the ids in their files are the roster of record
  report.missing = ALL_IDS.filter((id) => !have.has(id));
  if (args.has('--fill') && report.missing.length) {
    const stubs = stubPlaces().filter((p) => report.missing.includes(p.id));
    places.push(...stubs);
    source = 'data+stub';
  }
}

// stub records for worlds that have no file yet (--world <id> | all); with --stub every world is stubbed
{
  const haveWorld = new Set(places.map((p) => p.world || 'toril'));
  const want = useStub ? WORLD_IDS.filter((w) => w !== 'toril') : stubWorlds.has('all') ? WORLD_IDS : [...stubWorlds];
  for (const w of want) {
    if (w === 'toril' || haveWorld.has(w)) continue;
    const recs = stubWorld(w);
    if (!recs.length) continue;
    places.push(...recs);
    report.warnings.push(`world ${w}: no data/places/${w}.json yet — ${recs.length} stub records`);
    if (source === 'data') source = 'data+stub';
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

const maps = {};
for (const w of WORLD_IDS) {
  const rel = w === 'toril' ? 'data/map.json' : `data/maps/${w}.json`;
  const mp = path.join(ROOT, rel);
  let m = null;
  if (!useStub && fs.existsSync(mp)) {
    try { m = normaliseMap(readJson(mp)); m.source = 'data'; } catch (e) { report.map.push(`${rel}: ${e.message}`); }
  }
  if (!m) { m = w === 'toril' ? stubMap() : stubWorldMap(w); m.source = 'stub'; m.places ||= {}; }
  if (w === 'toril' && !m.polylines.length) m.source = 'stub';
  maps[w] = m;
}
const map = maps.toril;

// merge coordinates into records (each from its own world's chart); validate them now
for (const p of places) {
  const c = (maps[p.world || 'toril'] || map).places[p.id];
  if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) p.map = { x: c[0], y: c[1] };
}
const noCoords = [];
const stubHints = Object.fromEntries(stubPlaces().map((s) => [s.id, s.map]));
for (const p of places) {
  const ok = p.map && Number.isFinite(p.map.x) && Number.isFinite(p.map.y);
  if (!ok) {
    // the wheel and the orbit compute their own geometry; a chart point is only a fallback there
    if (p.world !== 'planes' && p.world !== 'realmspace') noCoords.push(p.id);
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

/* --------------------------------------------------------- stories.json -- */
let stories = [];
const stPath = path.join(DATA, 'stories.json');
let storiesSource = 'none';
if (fs.existsSync(stPath)) {
  try {
    const titles = new Set(timeline.map((e) => e.title));
    const { errors, warnings, stories: ok } = validateStories(readJson(stPath), { knownIds: ids, worlds: WORLD_IDS, titles });
    report.stories.push(...errors);
    warnings.forEach((w) => report.warnings.push(`data/stories.json: ${w}`));
    stories = ok;
    storiesSource = 'data';
  } catch (e) { report.stories.push(`data/stories.json: ${e.message}`); }
} else if (useStub || stubWorlds.size) { stories = stubStories(); storiesSource = 'stub'; }
for (const s of stories) {
  s.placeIds = (s.placeIds || []).filter((id) => ids.has(id));
  s.worldId ??= places.find((p) => p.id === s.placeIds[0])?.world || 'toril';
  // a clip that is named but not on disk would only fail at play time: fall back to browser speech now
  if (s.audio && !fs.existsSync(path.join(ROOT, 'public', s.audio))) {
    report.warnings.push(`data/stories.json (${s.id}): audio ${s.audio} not found in public/ — browser speech will read it`);
    s.audio = null;
  }
}
stories.sort((a, b) => a.year - b.year);

/* ------------------------------------------------------------- output -- */
// stable order: Faerûn roster order, then the other worlds in worlds.json order, each in its file's order
const order = new Map(ALL_IDS.map((id, i) => [id, i]));
const wRank = new Map(WORLD_IDS.map((w, i) => [w, i]));
const seq = new Map(places.map((p, i) => [p, i]));
places.sort((a, b) => (wRank.get(a.world || 'toril') ?? 99) - (wRank.get(b.world || 'toril') ?? 99) || (order.get(a.id) ?? 1e6) - (order.get(b.id) ?? 1e6) || seq.get(a) - seq.get(b));
// a world's parentPlace drills into it, unless the place says otherwise
for (const w of worlds) {
  if (!w.parentPlace) continue;
  const p = places.find((q) => q.id === w.parentPlace);
  if (p && p.drill == null) p.drill = w.id;
}
// the other worlds may use terrain words outside the phase-1 vocabulary: map them onto the generator's
// (in the generated output only; the data stays as written)
const TERRAIN_ALIAS = {
  lake: (p) => ((p.visual.motifs || []).includes('snow') ? 'tundra' : 'coast'), sea: 'coast', ocean: 'coast', water: 'coast',
  ice: 'tundra', glacier: 'tundra', snow: 'tundra', arctic: 'tundra', jungle: 'forest', hills: 'plain', steppe: 'plain',
  grassland: 'plain', underground: 'cavern', volcanic: 'mountain', space: 'void', astral: 'void', wildspace: 'void',
};
for (const p of places) {
  const v = p.visual;
  if (v && !TERRAINS.includes(v.terrain)) {
    const a = TERRAIN_ALIAS[v.terrain];
    v.terrainAsWritten = v.terrain;
    v.terrain = typeof a === 'function' ? a(p) : a || 'plain';
    if (v.terrainAsWritten === 'lake' && !(v.motifs || []).includes('lake')) v.motifs = [...(v.motifs || []), 'lake'];
  }
  if (!TYPES.includes(p.type)) p.type = 'landmark';
}
for (const p of places) {
  p.world ??= 'toril';
  p.aliases ??= [];
  if (p.drill && !WORLD_IDS.includes(p.drill)) delete p.drill;
  for (const s of p.status) if (s.from === null) s.from = -35000; // null = since forever
  p.status.sort((a, b) => a.from - b.from);
  p.events.sort((a, b) => a.year - b.year);
  p.visual.motifs = (p.visual.motifs || []);
}

fs.mkdirSync(OUT, { recursive: true });
const meta = { source, timelineSource, mapSource: map.source, storiesSource, count: places.length, builtAt: new Date().toISOString() };
const worldsOut = worlds.map((w) => ({ ...w, count: places.filter((p) => p.world === w.id).length, mapSource: maps[w.id]?.source }));
fs.writeFileSync(path.join(OUT, 'places.json'), JSON.stringify({ meta, worlds: worldsOut, places }));
fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({ eras, events: timeline }));
const mapsOut = Object.fromEntries(Object.entries(maps).map(([w, { places: _omit, ...m }]) => [w, m]));
fs.writeFileSync(path.join(OUT, 'maps.json'), JSON.stringify(mapsOut));
fs.writeFileSync(path.join(OUT, 'stories.json'), JSON.stringify({ stories }));
try { fs.rmSync(path.join(OUT, 'map.json')); } catch { /* phase-1 output, superseded by maps.json */ }

/* ------------------------------------------------------------- report -- */
const nErr = report.rejected.length + report.fileErrors.length + report.duplicates.length + report.timeline.length + report.stories.length;
if (report.fileErrors.length) { console.error(red('File errors:')); report.fileErrors.forEach((e) => console.error(red(`  ✗ ${e}`))); }
if (report.rejected.length) {
  console.error(red(`Rejected ${report.rejected.length} record(s):`));
  for (const r of report.rejected) { console.error(red(`  ✗ ${r.label}`)); r.errors.forEach((e) => console.error(red(`      - ${e}`))); }
}
report.duplicates.forEach((d) => console.error(red(`  ✗ ${d}`)));
report.timeline.forEach((d) => console.error(red(`  ✗ ${d}`)));
report.stories.forEach((d) => console.error(red(`  ✗ ${d}`)));
if (report.map.length) report.map.forEach((m) => console.warn(yellow(`  ! map: ${m}`)));
if (source !== 'stub' && report.missing.length) console.warn(yellow(`  ! ${report.missing.length} roster id(s) have no record${args.has('--fill') ? ' (stubbed)' : ''}: ${report.missing.join(', ')}`));
if (report.warnings.length) console.warn(yellow(`  ! ${report.warnings.length} warning(s) (see docs/DATA-ERRORS.md)`));
console.log(green(`✓ ${places.length} places (${source}), ${timeline.length} timeline events (${timelineSource}), ${stories.length} stories (${storiesSource}), map linework: ${map.source} → src/generated/`));
console.log(`  worlds: ${worldsOut.map((w) => `${w.id} ${w.count}${w.count ? '' : ' (empty)'}${w.mapSource === 'stub' && w.count && w.layoutDefault === 'map' ? ' [stub chart]' : ''}`).join(' · ')}`);

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
  sec('Story errors', report.stories);
  sec('Map', report.map);
  sec('Roster ids without a record', report.missing);
  sec('Warnings (records accepted)', report.warnings);
  fs.writeFileSync(ERR_DOC, L.join('\n'));
}
if (args.has('--strict') && nErr) process.exit(1);
