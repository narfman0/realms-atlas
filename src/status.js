// Pure status logic (no imports), shared by the app and scripts/check-states.mjs.
export const ALWAYS = -35000;

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

