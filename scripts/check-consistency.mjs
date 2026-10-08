// Cross-file consistency checks for data/places/*.json and data/timeline.json.
//
//   node scripts/check-consistency.mjs          print findings, exit 0
//   node scripts/check-consistency.mjs --strict exit 1 if any ERROR-level finding exists
//
// Checks:
//  1. Status boundaries (from/to) that match no event year of the same place (WARN; ±1 year tolerated).
//  2. Timeline events whose placeIds' records mention neither that year (event or status boundary)
//     nor a title keyword of the timeline event (WARN).
//  3. Known world events (WORLD_EVENTS below) dated differently from their canonical year anywhere
//     in place events or the timeline (ERROR).
//  4. Identical normalized event titles that carry different years across places (WARN).
// Node built-ins only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');

// Canonical years for world events that several records mention. `match` is tested against
// "title — summary" of every place event and timeline event; `years` lists accepted years
// (a span like the Second Sundering accepts each year it covers when the text names a phase).
const WORLD_EVENTS = [
  { key: 'fall-of-netheril', match: /karsus'?s? folly|fall of netheril/i, years: [-339] },
  { key: 'dalereckoning', match: /dalereckoning (begins|established)|standing stone and dalereckoning/i, years: [1] },
  { key: 'opening', match: /\bthe opening\b/i, years: [261] },
  { key: 'fall-of-myth-drannor', match: /fall of myth drannor|weeping war|cormanthyr falls/i, years: [714] },
  { key: 'first-open-lord', match: /first (open )?lord of waterdeep|first open lord/i, years: [1032] },
  { key: 'time-of-troubles', match: /time of troubles|avatar crisis/i, years: [1358] },
  { key: 'return-of-the-shades', match: /return of the shades/i, years: [1372] },
  { key: 'shadowstorm', match: /shadowstorm/i, years: [1374] },
  { key: 'spellplague', match: /^spellplague|\bspellplague (strikes|begins|and collapse)|the spellplague$/i, years: [1385] },
  { key: 'hotenow', match: /hotenow/i, years: [1451] },
  { key: 'thultanthar-crash', match: /thultanthar (falls|crashes)|fall onto myth drannor/i, years: [1487] },
  { key: 'elturel-avernus', match: /dragged into avernus|elturel taken|descent into avernus/i, years: [1492] },
  { key: 'tuigan', match: /tuigan/i, years: [1359, 1360] },
  { key: 'war-of-silver-marches', match: /war of the silver marches/i, years: [1484] },
  { key: 'death-curse', match: /death curse|tomb of annihilation/i, years: [1489] },
  { key: 'great-rain', match: /great rain/i, years: [1485, 1486, 1487] },
];

const STATE_SENTINELS = new Set([-35000, null, undefined]);

const places = [];
for (const f of fs.readdirSync(path.join(ROOT, 'data/places')).filter((f) => f.endsWith('.json')).sort()) {
  for (const p of JSON.parse(fs.readFileSync(path.join(ROOT, 'data/places', f), 'utf8'))) places.push({ ...p, _file: f });
}
const byId = new Map(places.map((p) => [p.id, p]));
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/timeline.json'), 'utf8'));
const tEvents = Array.isArray(timeline) ? timeline : timeline.events;

const STOP = new Set(['the', 'of', 'a', 'an', 'and', 'in', 'to', 'at', 'on', 'by', 'into', 'from', 'with', 'for', 'is', 'as']);
const keywords = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9' -]/g, ' ').split(/\s+/).map((w) => w.replace(/'s?$/, '')).filter((w) => w.length > 2 && !STOP.has(w));
const norm = (s) => keywords(s).join(' ');

const findings = [];
const add = (level, check, msg) => findings.push({ level, check, msg });

// (year, keyword) pairs per place
const pairs = new Map();
for (const p of places) {
  pairs.set(p.id, p.events.map((e) => ({ year: e.year, kw: keywords(e.title), title: e.title })));
}

// 1. status boundaries without a matching event
for (const p of places) {
  const years = new Set(p.events.map((e) => e.year));
  const near = (y) => [y - 1, y, y + 1].some((v) => years.has(v));
  const bounds = new Set();
  for (const s of p.status) { bounds.add(s.from); bounds.add(s.to); }
  for (const b of bounds) {
    if (STATE_SENTINELS.has(b) || b === p.founded) continue;
    if (!near(b)) add('WARN', 'status-boundary', `${p.id}: status boundary ${b} matches no event year`);
  }
}

// 2. timeline events vs placeIds' records
for (const t of tEvents) {
  const tk = new Set(keywords(t.title));
  for (const id of t.placeIds || []) {
    const p = byId.get(id);
    if (!p) { add('ERROR', 'timeline-placeId', `timeline ${t.year} "${t.title}": unknown placeId ${id}`); continue; }
    const yrs = new Set([...p.events.map((e) => e.year), ...p.status.flatMap((s) => [s.from, s.to])]);
    const inSpan = t.yearEnd != null && [...yrs].some((y) => y >= t.year && y <= t.yearEnd);
    if (yrs.has(t.year) || inSpan) continue;
    const kwHit = p.events.some((e) => keywords(e.title).some((k) => tk.has(k) && k.length > 4));
    add(kwHit ? 'INFO' : 'WARN', 'timeline-place',
      `timeline ${t.year} "${t.title}": ${id} has no event/status at ${t.year}${kwHit ? ' (title keyword matches an event in another year — check)' : ''}`);
  }
}

// 3. known world events with conflicting years
const all = [
  ...places.flatMap((p) => p.events.map((e) => ({ where: p.id, year: e.year, text: `${e.title} — ${e.summary}`, title: e.title }))),
  ...tEvents.map((t) => ({ where: 'timeline', year: t.year, text: t.title, title: t.title })),
];
for (const w of WORLD_EVENTS) {
  for (const e of all) {
    if (!w.match.test(e.where === 'timeline' ? e.text : e.title)) continue;
    if (!w.years.includes(e.year)) add('ERROR', 'world-event', `${w.key}: ${e.where} dates "${e.title}" to ${e.year}, expected ${w.years.join('/')}`);
  }
}

// 4. identical normalized titles with different years
const groups = new Map();
for (const e of all) {
  const k = norm(e.title);
  if (!k) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(e);
}
for (const [k, list] of groups) {
  const ys = new Set(list.map((e) => e.year));
  if (ys.size > 1) add('WARN', 'same-title', `"${k}": ${list.map((e) => `${e.where}@${e.year}`).join(', ')}`);
}

const order = { ERROR: 0, WARN: 1, INFO: 2 };
findings.sort((a, b) => order[a.level] - order[b.level] || a.check.localeCompare(b.check));
for (const f of findings) console.log(`${f.level.padEnd(5)} [${f.check}] ${f.msg}`);
const errs = findings.filter((f) => f.level === 'ERROR').length;
console.log(`\n${places.length} places, ${tEvents.length} timeline events, ${[...pairs.values()].flat().length} (year, keyword) pairs; ` +
  `${errs} errors, ${findings.length - errs} warnings/info`);
if (strict && errs) process.exit(1);
