// Time: the piecewise-linear Dalereckoning axis, eras, and status lookup per place.
import timelineData from './generated/timeline.json';

export const YEAR_MIN = -3900;
export const YEAR_MAX = 1496;
export const PRESENT = 1496;
export const ALWAYS = -35000;

// [yearFrom, yearTo, trackFrom, trackTo]
const SEG = [
  [YEAR_MIN, 0, 0, 0.15],
  [0, 1000, 0.15, 0.35],
  [1000, YEAR_MAX, 0.35, 1],
];

export function yearToTrack(y) {
  y = Math.max(YEAR_MIN, Math.min(YEAR_MAX, y));
  for (const [a, b, ta, tb] of SEG) if (y <= b) return ta + ((y - a) / (b - a)) * (tb - ta);
  return 1;
}
export function trackToYear(t) {
  t = Math.max(0, Math.min(1, t));
  for (const [a, b, ta, tb] of SEG) if (t <= tb) return Math.round(a + ((t - ta) / (tb - ta)) * (b - a));
  return YEAR_MAX;
}
/** years per unit of track at a given year (for adaptive play speed) */
export function yearsPerTrack(y) {
  for (const [a, b, ta, tb] of SEG) if (y < b) return (b - a) / (tb - ta);
  const [a, b, ta, tb] = SEG[SEG.length - 1];
  return (b - a) / (tb - ta);
}

const DEFAULT_ERAS = [
  { id: 'days-of-thunder', name: 'Days of Thunder', from: -35000, to: -3859 },
  { id: 'netheril', name: 'Netheril', from: -3859, to: -339 },
  { id: 'fall-of-netheril', name: 'Fall of Netheril', from: -339, to: 1 },
  { id: 'dalereckoning', name: 'Dalereckoning', from: 1, to: 261 },
  { id: 'myth-drannor', name: 'Myth Drannor', from: 261, to: 714 },
  { id: 'age-of-kingdoms', name: 'Age of Kingdoms', from: 714, to: 1358 },
  { id: 'era-of-upheaval', name: 'Era of Upheaval', from: 1358, to: 1385 },
  { id: 'spellplague', name: 'Spellplague', from: 1385, to: 1482 },
  { id: 'second-sundering', name: 'Sundering', from: 1482, to: 1487 },
  { id: 'present', name: 'Present', from: 1487, to: 1496 },
];
// short tick labels for the scrubber (SPEC era names)
const SHORT = {
  'days-of-thunder': 'Days of Thunder', netheril: 'Netheril', 'fall-of-netheril': 'Fall of Netheril',
  dalereckoning: 'Dalereckoning', 'myth-drannor': 'Myth Drannor', 'age-of-kingdoms': 'Age of Kingdoms',
  'era-of-upheaval': 'Era of Upheaval', spellplague: 'Spellplague', 'second-sundering': 'Sundering', present: 'Present',
};

export const ERAS = (timelineData.eras && timelineData.eras.length ? timelineData.eras : DEFAULT_ERAS)
  .map((e) => ({ ...e, short: SHORT[e.id] || e.name }))
  .sort((a, b) => a.from - b.from);
export const EVENTS = (timelineData.events || []).slice().sort((a, b) => a.year - b.year);

export function eraOf(year) {
  if (year == null) return ERAS[0];
  let best = ERAS[0];
  for (const e of ERAS) if (year >= e.from) best = e;
  return best;
}

/** first year a place exists on the board */
export function appearYear(p) {
  let y = Infinity;
  for (const s of p.status || []) y = Math.min(y, s.from ?? ALWAYS);
  if (p.founded != null) y = Math.min(y, p.founded);
  return Number.isFinite(y) ? y : ALWAYS;
}

/** state of a place at a year: 'unfounded' | one of the 7 SPEC states */
export function stateAt(p, year) {
  if (year < appearYear(p)) return 'unfounded';
  const st = p.status || [];
  // instantaneous entries (from === to) win on their year
  for (const s of st) if (s.from === s.to && s.from === year) return s.state;
  let cur = null;
  for (const s of st) {
    const from = s.from ?? ALWAYS;
    if (from <= year && (s.to == null || year < s.to)) cur = s;
  }
  if (cur) return cur.state;
  // before the first entry but after founding, or after the last closed entry: nearest entry
  let best = st[0];
  for (const s of st) if ((s.from ?? ALWAYS) <= year) best = s;
  return best ? best.state : 'thriving';
}

export function fmtYear(y) {
  if (y == null) return 'timeless';
  if (y <= ALWAYS) return 'time immemorial';
  return y < 0 ? `${-y} before DR` : `${y} DR`;
}
export const fmtYearShort = (y) => (y == null ? '—' : y <= ALWAYS ? '∞' : y < 0 ? `−${-y}` : `${y}`);
