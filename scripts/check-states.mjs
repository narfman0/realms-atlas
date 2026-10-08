// Prints the resolved state of every place at a set of probe years, and asserts it matches an independent
// reading of the place's status timeline. Reads the raw data files (so `from: null` is exercised).
//   node scripts/check-states.mjs           table + assertion summary (exit 1 on mismatch)
//   node scripts/check-states.mjs --quiet   assertions only
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateAt } from '../src/status.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const YEARS = [-4000, -339, 1, 714, 1358, 1372, 1385, 1400, 1451, 1487, 1492, 1496];
const quiet = process.argv.includes('--quiet');
const dir = path.join(ROOT, 'data', 'places');
const places = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));

/** The rule, written as plainly as possible:
 *  - absent before `founded` if it is set; if founded is null, absent before the first status `from`
 *    (a null `from` means "always", so such a place is always present)
 *  - an instantaneous entry (from === to) holds on exactly its year
 *  - otherwise the entry with from <= year < to (to null = open-ended); between founding and the first entry,
 *    the first entry's state */
function expected(p, y) {
  const st = (p.status || []).map((s) => ({ ...s, from: s.from ?? -Infinity })).sort((a, b) => a.from - b.from);
  const start = p.founded != null ? Math.min(p.founded, st[0]?.from ?? Infinity) : (st[0]?.from ?? -Infinity);
  if (y < start) return 'unfounded';
  const inst = st.find((s) => s.from === s.to && s.from === y);
  if (inst) return inst.state;
  const hit = st.filter((s) => s.from <= y && (s.to == null || y < s.to)).pop();
  if (hit) return hit.state;
  const before = st.filter((s) => s.from <= y).pop();
  return (before || st[0])?.state ?? 'thriving';
}

const short = { unfounded: '·', thriving: 'T', troubled: 't', ruined: 'R', destroyed: 'D', abandoned: 'a', hidden: 'h', relocated: 'L' };
let bad = 0;
if (!quiet) console.log(`${'place'.padEnd(22)} ${YEARS.map((y) => String(y).padStart(6)).join('')}`);
for (const p of places) {
  const row = YEARS.map((y) => {
    const got = stateAt(p, y), want = expected(p, y);
    if (got !== want) { bad++; console.error(`✗ ${p.id} @ ${y}: app says ${got}, timeline says ${want}`); }
    return short[got] || '?';
  });
  if (!quiet) console.log(`${p.id.padEnd(22)} ${row.map((c) => c.padStart(6)).join('')}`);
}
if (!quiet) console.log('legend: · not yet founded, T thriving, t troubled, R ruined, D destroyed, a abandoned, h hidden, L relocated');
console.log(bad ? `✗ ${bad} mismatches` : `✓ ${places.length} places × ${YEARS.length} years agree with their status timelines`);
process.exit(bad ? 1 : 0);
