// Fabricates placeholder records for every id in the SPEC roster so the app can be built and tested before
// (or without) the real data files. Coordinates and archetypes are rough guesses; years are random.
// Usage: imported by build-data.mjs (--stub), or `node scripts/stub-data.mjs` to print JSON.
import { ROSTER } from './roster.mjs';
import { ARCHETYPES, MOTIFS, STATES, TERRAINS } from './schema.mjs';

// id: [x, y, archetype, terrain]   (x east, y south, 0..1 — rough schematic guesses only)
const HINT = {
  waterdeep: [0.17, 0.4, 'harbor-metropolis', 'coast'], neverwinter: [0.14, 0.31, 'harbor-metropolis', 'coast'],
  luskan: [0.12, 0.25, 'harbor-metropolis', 'coast'], mirabar: [0.16, 0.19, 'dwarven-hold', 'mountain'],
  'bryn-shander': [0.12, 0.1, 'frozen-town', 'tundra'], phandalin: [0.17, 0.33, 'frontier-town', 'plain'],
  daggerford: [0.19, 0.45, 'market-town', 'river'], skullport: [0.18, 0.41, 'underdark-city', 'cavern'],
  undermountain: [0.16, 0.42, 'landmark-mountain', 'cavern'], 'dragonspear-castle': [0.22, 0.5, 'fortress', 'plain'],
  'spine-of-the-world': [0.2, 0.12, 'landmark-mountain', 'mountain'], longsaddle: [0.2, 0.3, 'market-town', 'plain'],
  triboar: [0.22, 0.32, 'market-town', 'plain'], yartar: [0.25, 0.29, 'walled-city', 'river'],
  silverymoon: [0.29, 0.24, 'elven-city', 'river'], everlund: [0.29, 0.29, 'walled-city', 'plain'],
  sundabar: [0.33, 0.24, 'dwarven-hold', 'mountain'], 'citadel-adbar': [0.36, 0.18, 'dwarven-hold', 'mountain'],
  'mithral-hall': [0.28, 0.2, 'dwarven-hold', 'mountain'], gauntlgrym: [0.15, 0.29, 'dwarven-hold', 'mountain'],
  'hellgate-keep': [0.31, 0.32, 'ruin', 'forest'], evereska: [0.34, 0.37, 'elven-city', 'mountain'],
  'high-forest': [0.27, 0.34, 'landmark-forest', 'forest'], evermeet: [0.03, 0.45, 'island-haven', 'island'],
  'citadel-felbarr': [0.33, 0.2, 'dwarven-hold', 'mountain'], nesme: [0.26, 0.26, 'frontier-town', 'plain'],
  menzoberranzan: [0.29, 0.21, 'drow-city', 'cavern'], 'ched-nasad': [0.36, 0.42, 'drow-city', 'cavern'],
  blingdenstone: [0.3, 0.22, 'underdark-city', 'cavern'], gracklstugh: [0.25, 0.4, 'underdark-city', 'cavern'],
  'mantol-derith': [0.33, 0.48, 'underdark-city', 'cavern'], araumycos: [0.36, 0.3, 'landmark-forest', 'cavern'],
  'baldurs-gate': [0.2, 0.56, 'harbor-metropolis', 'coast'], candlekeep: [0.18, 0.6, 'library-fortress', 'coast'],
  elturel: [0.29, 0.54, 'walled-city', 'river'], berdusk: [0.33, 0.55, 'market-town', 'river'],
  iriaebor: [0.38, 0.52, 'wizard-city', 'plain'], scornubel: [0.3, 0.52, 'market-town', 'river'],
  darkhold: [0.37, 0.46, 'fortress', 'mountain'], beregost: [0.21, 0.62, 'market-town', 'plain'],
  'boareskyr-bridge': [0.27, 0.5, 'landmark-monolith', 'river'], athkatla: [0.2, 0.7, 'harbor-metropolis', 'coast'],
  darromar: [0.3, 0.68, 'walled-city', 'plain'], zazesspur: [0.17, 0.77, 'harbor-metropolis', 'coast'],
  calimport: [0.23, 0.86, 'desert-city', 'desert'], memnon: [0.2, 0.82, 'desert-city', 'desert'],
  almraiven: [0.32, 0.86, 'desert-city', 'coast'], suzail: [0.5, 0.52, 'harbor-metropolis', 'coast'],
  arabel: [0.52, 0.45, 'walled-city', 'plain'], tilverton: [0.53, 0.41, 'ruin', 'plain'],
  marsember: [0.48, 0.53, 'harbor-metropolis', 'coast'], shadowdale: [0.57, 0.38, 'market-town', 'forest'],
  'myth-drannor': [0.59, 0.36, 'elven-city', 'forest'], 'standing-stone': [0.56, 0.42, 'landmark-monolith', 'forest'],
  cormanthor: [0.6, 0.39, 'landmark-forest', 'forest'], selgaunt: [0.61, 0.49, 'harbor-metropolis', 'coast'],
  saerloon: [0.58, 0.51, 'harbor-metropolis', 'coast'], ordulin: [0.59, 0.46, 'ruin', 'plain'],
  westgate: [0.45, 0.55, 'harbor-metropolis', 'coast'], 'high-horn': [0.47, 0.45, 'fortress', 'mountain'],
  'zhentil-keep': [0.6, 0.3, 'fortress', 'coast'], mulmaster: [0.65, 0.31, 'walled-city', 'coast'],
  hillsfar: [0.62, 0.34, 'walled-city', 'coast'], phlan: [0.63, 0.28, 'frontier-town', 'coast'],
  melvaunt: [0.68, 0.28, 'harbor-metropolis', 'coast'], 'citadel-of-the-raven': [0.64, 0.25, 'fortress', 'mountain'],
  thultanthar: [0.48, 0.32, 'floating-enclave', 'desert'], anauroch: [0.45, 0.25, 'landmark-desert', 'desert'],
  'castle-perilous': [0.73, 0.18, 'fortress', 'tundra'], helgabal: [0.77, 0.21, 'walled-city', 'plain'],
  'ravens-bluff': [0.71, 0.37, 'harbor-metropolis', 'coast'], procampur: [0.73, 0.42, 'walled-city', 'coast'],
  tantras: [0.71, 0.4, 'harbor-metropolis', 'coast'], lyrabar: [0.77, 0.32, 'harbor-metropolis', 'coast'],
  eltabbar: [0.84, 0.43, 'wizard-city', 'plain'], bezantur: [0.82, 0.5, 'harbor-metropolis', 'coast'],
  immilmar: [0.86, 0.32, 'frozen-town', 'forest'], velprintalar: [0.79, 0.45, 'elven-city', 'coast'],
  skuld: [0.9, 0.58, 'desert-city', 'river'], unthalass: [0.8, 0.57, 'desert-city', 'coast'],
  cimbar: [0.73, 0.55, 'walled-city', 'coast'], arrabar: [0.62, 0.6, 'harbor-metropolis', 'coast'],
  alaghon: [0.68, 0.57, 'harbor-metropolis', 'coast'], halarahh: [0.6, 0.85, 'wizard-city', 'plain'],
  'port-nyanzaru': [0.33, 0.95, 'jungle-city', 'coast'], omu: [0.35, 0.98, 'ruin', 'swamp'],
  mezro: [0.37, 0.96, 'jungle-city', 'river'], 'caer-callidyrr': [0.05, 0.62, 'fortress', 'island'],
  lantan: [0.43, 0.78, 'island-haven', 'island'], 'sea-of-fallen-stars': [0.66, 0.5, 'landmark-sea', 'coast'],
};

const TYPE_OF = {
  'harbor-metropolis': 'metropolis', 'walled-city': 'city', 'market-town': 'town', 'frontier-town': 'town',
  fortress: 'fortress', 'tower-keep': 'fortress', 'elven-city': 'city', 'dwarven-hold': 'fortress',
  'drow-city': 'underdark-city', 'underdark-city': 'underdark-city', ruin: 'ruin', 'floating-enclave': 'city',
  'desert-city': 'city', 'wizard-city': 'city', 'island-haven': 'island', 'jungle-city': 'city',
  'library-fortress': 'fortress', 'frozen-town': 'town',
};
const MOTIFS_OF = {
  'harbor-metropolis': ['harbor', 'walls', 'towers', 'ships', 'docks', 'castle', 'lighthouse'],
  'walled-city': ['walls', 'towers', 'keep', 'temple', 'gate'], 'market-town': ['farms', 'windmill', 'river', 'bridge'],
  'frontier-town': ['palisade', 'farms', 'mines'], fortress: ['walls', 'keep', 'towers', 'gate'],
  'tower-keep': ['towers', 'keep'], 'elven-city': ['giant-trees', 'spires', 'mythal', 'glow'],
  'dwarven-hold': ['mountain', 'gate', 'mines', 'statue'], 'drow-city': ['cavern', 'stalactites', 'faerie-fire', 'spires'],
  'underdark-city': ['cavern', 'stalactites', 'lava', 'mines'], ruin: ['ruins', 'rubble', 'graveyard'],
  'floating-enclave': ['floating', 'spires', 'glow', 'towers'], 'desert-city': ['domes', 'minarets', 'walls', 'pyramid'],
  'wizard-city': ['spires', 'glow', 'towers', 'obelisk'], 'island-haven': ['harbor', 'ships', 'lighthouse', 'trees'],
  'jungle-city': ['trees', 'ziggurat', 'harbor', 'docks'], 'library-fortress': ['library', 'walls', 'towers', 'keep'],
  'landmark-mountain': ['mountain', 'snow'], 'landmark-forest': ['giant-trees', 'trees'],
  'landmark-desert': ['pyramid', 'ruins'], 'landmark-sea': ['ships', 'lighthouse'],
  'landmark-monolith': ['standing-stone', 'obelisk'], 'frozen-town': ['snow', 'palisade', 'lake'],
};
const REGION_ACCENT = {
  'sword-coast-north': '#2a4d69', 'silver-marches': '#5a7f8f', underdark: '#6b3fa0', 'western-heartlands': '#8a4b2b',
  'heartlands-east': '#3f6b3a', 'moonsea-and-north-east': '#5b5f6b', 'east-and-south': '#a0522d',
};
const TERRAIN_BASE = {
  coast: '#d9c9a2', plain: '#cfc58f', forest: '#a9b07f', mountain: '#b9b2a2', desert: '#e0c58e', cavern: '#6e6876',
  island: '#cfd2a0', swamp: '#9da27a', tundra: '#e6e9ea', river: '#c8c894',
};

function rng(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const title = (id) => id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

export function stubPlaces() {
  const out = [];
  for (const [region, ids] of Object.entries(ROSTER)) {
    for (const id of ids) {
      const r = rng(id);
      const pick = (a) => a[Math.floor(r() * a.length)];
      const h = HINT[id] || [r(), r(), pick(ARCHETYPES), pick(TERRAINS)];
      const [x, y, archetype, terrain] = h;
      const landmark = archetype.startsWith('landmark');
      const founded = landmark ? null : pick([-3500, -2000, -700, -100, 100, 300, 700, 900, 1000, 1100, 1200, 1250, 1300, 1350]) + Math.floor(r() * 40);
      const start = founded ?? -35000;
      const status = [];
      let y0 = start;
      const n = landmark ? 0 : Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const y1 = Math.min(1495, y0 + 50 + Math.floor(r() * (1490 - y0) * 0.6));
        if (y1 <= y0 || y1 >= 1495) break;
        status.push({ from: y0, to: y1, state: i === 0 ? 'thriving' : pick(['troubled', 'ruined', 'thriving']) });
        y0 = y1;
      }
      status.push({ from: y0, to: null, state: archetype === 'ruin' ? 'ruined' : r() < 0.15 ? pick(STATES) : 'thriving' });
      const evYears = [...new Set(Array.from({ length: 3 }, () => Math.min(1495, Math.max(start === -35000 ? -3000 : start, start + Math.floor(r() * (1495 - Math.max(start, -3000)))))))].sort((a, b) => a - b);
      out.push({
        id, name: title(id), aliases: [], world: 'toril', region, type: landmark ? 'landmark' : TYPE_OF[archetype] || 'city',
        archetype, map: { x, y }, founded, foundedNote: 'STUB — placeholder record', status,
        events: evYears.map((yr, i) => ({ year: yr, title: `Placeholder event ${i + 1}`, summary: 'Stub data: replace with the real record.', importance: 1 + Math.floor(r() * 3) })),
        description: `Placeholder description for ${title(id)}. The real record will be written by a data agent from the Forgotten Realms Wiki.`,
        population: landmark ? null : Math.floor(500 + r() * 200000), ruler: landmark ? null : 'Unknown (stub)',
        tags: ['stub'],
        visual: {
          palette: { base: TERRAIN_BASE[terrain], accent: REGION_ACCENT[region], ink: '#2b2420' },
          scale: landmark ? 3 : 1 + Math.floor(r() * 5),
          motifs: MOTIFS_OF[archetype] || [pick(MOTIFS)], terrain, notes: 'stub',
        },
        sources: [`https://forgottenrealms.fandom.com/wiki/${title(id).replace(/ /g, '_')}`],
      });
    }
  }
  return out;
}

export function stubTimeline() {
  const E = (year, title, importance, placeIds, yearEnd) => ({ year, ...(yearEnd ? { yearEnd } : {}), title, summary: 'Stub timeline entry.', importance, placeIds });
  return [
    E(-3859, 'Netheril founded', 3, ['anauroch', 'thultanthar']),
    E(-339, "Karsus's Folly", 3, ['anauroch', 'thultanthar']),
    E(1, 'Dalereckoning established', 2, ['standing-stone', 'cormanthor', 'shadowdale']),
    E(714, 'Weeping War ends', 3, ['myth-drannor', 'cormanthor']),
    E(1032, 'First Open Lord of Waterdeep', 2, ['waterdeep']),
    E(1262, 'Zhentarim rise', 2, ['zhentil-keep', 'darkhold']),
    E(1358, 'Time of Troubles', 3, ['waterdeep', 'baldurs-gate', 'zhentil-keep', 'tantras']),
    E(1372, 'Tilverton destroyed', 2, ['tilverton']),
    E(1372, 'Return of the Shades', 3, ['thultanthar', 'anauroch']),
    E(1374, 'Shadowstorm', 2, ['ordulin']),
    E(1385, 'Spellplague', 3, ['halarahh', 'myth-drannor', 'unthalass', 'skuld', 'lantan']),
    E(1451, 'Mount Hotenow erupts', 3, ['neverwinter']),
    E(1482, 'Second Sundering', 3, ['evermeet', 'lantan', 'halarahh'], 1487),
    E(1487, 'Thultanthar falls on Myth Drannor', 3, ['thultanthar', 'myth-drannor']),
    E(1492, 'Descent into Avernus', 3, ['elturel']),
    E(1492, 'Absolute crisis at Baldur\'s Gate', 2, ['baldurs-gate']),
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(JSON.stringify({ places: stubPlaces(), timeline: stubTimeline() }, null, 2));
}
