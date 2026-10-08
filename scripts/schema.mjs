// Validation for place records, timeline events and the map file.
// Each validator returns an array of human-readable error strings ([] = valid).

export const WORLDS = ['toril', 'sigil', 'outlands', 'outer-planes'];
export const TYPES = ['metropolis', 'city', 'town', 'fortress', 'ruin', 'underdark-city', 'landmark', 'island', 'dungeon'];
export const ARCHETYPES = [
  'harbor-metropolis', 'walled-city', 'market-town', 'frontier-town', 'fortress', 'tower-keep', 'elven-city',
  'dwarven-hold', 'drow-city', 'underdark-city', 'ruin', 'floating-enclave', 'desert-city', 'wizard-city',
  'island-haven', 'jungle-city', 'library-fortress', 'landmark-mountain', 'landmark-forest', 'landmark-desert',
  'landmark-sea', 'landmark-monolith', 'frozen-town',
];
export const STATES = ['thriving', 'troubled', 'ruined', 'abandoned', 'destroyed', 'hidden', 'relocated'];
export const MOTIFS = [
  'harbor', 'walls', 'towers', 'spires', 'domes', 'minarets', 'castle', 'keep', 'bridge', 'river', 'lake', 'canal',
  'docks', 'mountain', 'cavern', 'stalactites', 'trees', 'giant-trees', 'ruins', 'rubble', 'lighthouse', 'library',
  'temple', 'arena', 'pyramid', 'ziggurat', 'tents', 'palisade', 'snow', 'lava', 'waterfall', 'floating', 'glow',
  'faerie-fire', 'mythal', 'statue', 'gate', 'mines', 'ships', 'windmill', 'farms', 'graveyard', 'obelisk',
  'standing-stone',
];
export const TERRAINS = ['coast', 'plain', 'forest', 'mountain', 'desert', 'cavern', 'island', 'swamp', 'tundra', 'river'];

const isInt = (v) => Number.isInteger(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const isYear = (v) => isInt(v) && v >= -40000 && v <= 1600;

/**
 * Validate one place record.
 * @param {object} p
 * @param {{ requireMap?: boolean, knownRegions?: string[] }} opts
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validatePlace(p, opts = {}) {
  const errors = [];
  const warnings = [];
  const E = (m) => errors.push(m);
  const W = (m) => warnings.push(m);
  if (!p || typeof p !== 'object' || Array.isArray(p)) return { errors: ['record is not an object'], warnings };

  if (!isStr(p.id) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id)) E(`id must be kebab-case (got ${JSON.stringify(p.id)})`);
  if (!isStr(p.name)) E('name is required');
  if (p.aliases != null && !(Array.isArray(p.aliases) && p.aliases.every((a) => typeof a === 'string'))) E('aliases must be an array of strings');
  if (p.world != null && !WORLDS.includes(p.world)) E(`world "${p.world}" not in ${WORLDS.join('|')}`);
  if (!isStr(p.region)) E('region is required');
  else if (opts.knownRegions && !opts.knownRegions.includes(p.region)) W(`region "${p.region}" is not in the roster`);
  if (!TYPES.includes(p.type)) E(`type "${p.type}" not in ${TYPES.join('|')}`);
  if (!ARCHETYPES.includes(p.archetype)) E(`archetype "${p.archetype}" is not a known archetype`);

  // map is optional in place files (filled from map.json); validated after merge
  if (p.map != null) {
    if (typeof p.map !== 'object') E('map must be an object {x, y}');
    else for (const k of ['x', 'y']) {
      const v = p.map[k];
      if (v === null || v === undefined) { if (opts.requireMap) E(`map.${k} is missing`); }
      else if (typeof v !== 'number' || !(v >= 0 && v <= 1)) E(`map.${k} must be a number in 0..1 (got ${v})`);
    }
  } else if (opts.requireMap) E('map is missing');

  if (p.founded !== null && !isYear(p.founded)) E(`founded must be an integer DR year or null (got ${JSON.stringify(p.founded)})`);

  // status timeline
  if (!Array.isArray(p.status) || p.status.length === 0) E('status must be a non-empty array');
  else {
    p.status.forEach((s, i) => {
      const at = `status[${i}]`;
      if (!s || typeof s !== 'object') return E(`${at} is not an object`);
      if (s.from !== null && !isYear(s.from)) E(`${at}.from must be an integer year or null (= since forever) (got ${JSON.stringify(s.from)})`);
      if (s.to !== null && !isYear(s.to)) E(`${at}.to must be an integer year or null (got ${JSON.stringify(s.to)})`);
      if (isYear(s.from) && isYear(s.to) && s.to < s.from) E(`${at} ends (${s.to}) before it starts (${s.from})`);
      if (!STATES.includes(s.state)) E(`${at}.state "${s.state}" not in ${STATES.join('|')}`);
    });
    const open = p.status.filter((s) => s && s.to === null).length;
    if (open === 0) W('no status entry is open-ended (to: null); the place vanishes after its last entry');
    // gaps / overlaps (sorted by from); zero-length entries (from === to) are allowed as instants
    const sorted = p.status.filter((s) => s).map((s) => ({ ...s, from: s.from ?? -35000 })).sort((a, b) => a.from - b.from);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1], cur = sorted[i];
      if (prev.to === null) { if (cur.from !== prev.from) W(`status entry from ${cur.from} follows an open-ended entry`); continue; }
      if (prev.from === prev.to) continue;
      if (cur.from > prev.to) W(`status gap between ${prev.to} and ${cur.from}`);
      if (cur.from < prev.to) W(`status overlap: entry from ${cur.from} starts before ${prev.to}`);
    }
  }

  if (!Array.isArray(p.events)) E('events must be an array');
  else {
    if (p.events.length < 1) W('no events');
    p.events.forEach((e, i) => {
      const at = `events[${i}]`;
      if (!e || typeof e !== 'object') return E(`${at} is not an object`);
      if (!isYear(e.year)) E(`${at}.year must be an integer year (got ${JSON.stringify(e.year)})`);
      if (!isStr(e.title)) E(`${at}.title is required`);
      if (e.summary != null && typeof e.summary !== 'string') E(`${at}.summary must be a string`);
      if (e.importance != null && ![1, 2, 3].includes(e.importance)) E(`${at}.importance must be 1, 2 or 3`);
    });
  }
  if (!isStr(p.description)) E('description is required');
  if (p.population != null && !(typeof p.population === 'number' && p.population >= 0)) E('population must be a non-negative number or null');
  if (p.ruler != null && typeof p.ruler !== 'string') E('ruler must be a string or null');
  if (p.tags != null && !Array.isArray(p.tags)) E('tags must be an array');

  const v = p.visual;
  if (!v || typeof v !== 'object') E('visual is required');
  else {
    if (!v.palette || typeof v.palette !== 'object') E('visual.palette is required');
    else for (const k of ['base', 'accent', 'ink']) if (!isHex(v.palette[k])) E(`visual.palette.${k} must be #rrggbb (got ${JSON.stringify(v.palette[k])})`);
    if (!(isInt(v.scale) && v.scale >= 1 && v.scale <= 5)) E(`visual.scale must be an integer 1..5 (got ${JSON.stringify(v.scale)})`);
    if (!Array.isArray(v.motifs)) E('visual.motifs must be an array');
    else {
      const bad = v.motifs.filter((m) => !MOTIFS.includes(m));
      if (bad.length) W(`unknown motifs ignored: ${bad.join(', ')}`);
    }
    if (!TERRAINS.includes(v.terrain)) E(`visual.terrain "${v.terrain}" not in ${TERRAINS.join('|')}`);
  }
  if (!Array.isArray(p.sources) || p.sources.length === 0) E('sources must be a non-empty array of URLs');
  else p.sources.forEach((s, i) => { if (!/^https?:\/\//.test(s)) E(`sources[${i}] is not a URL`); });

  return { errors, warnings };
}

/** Validate timeline.json (array of events, or { events: [...] }). */
export function validateTimeline(t, knownIds) {
  const errors = [];
  const warnings = [];
  const list = Array.isArray(t) ? t : t && Array.isArray(t.events) ? t.events : null;
  if (!list) return { errors: ['timeline must be an array of events (or { events: [...] })'], warnings, events: [] };
  const events = [];
  list.forEach((e, i) => {
    const at = `timeline[${i}]${e && e.title ? ` "${e.title}"` : ''}`;
    const errs = [];
    if (!e || typeof e !== 'object') errs.push(`${at} is not an object`);
    else {
      if (!isYear(e.year)) errs.push(`${at}.year must be an integer year`);
      if (e.yearEnd != null && !isYear(e.yearEnd)) errs.push(`${at}.yearEnd must be an integer year`);
      if (!isStr(e.title)) errs.push(`${at}.title is required`);
      if (e.importance != null && ![1, 2, 3].includes(e.importance)) errs.push(`${at}.importance must be 1..3`);
      if (e.placeIds != null && !Array.isArray(e.placeIds)) errs.push(`${at}.placeIds must be an array`);
      else if (knownIds && e.placeIds) {
        const unk = e.placeIds.filter((id) => !knownIds.has(id));
        if (unk.length) warnings.push(`${at} references unknown place ids: ${unk.join(', ')}`);
      }
    }
    if (errs.length) errors.push(...errs);
    else events.push(e);
  });
  return { errors, warnings, events };
}
