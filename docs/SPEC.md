# Realms Atlas — project spec

An explorable three.js "diorama board" of ~80 notable Forgotten Realms cities, towns, and landmarks, with a
Dalereckoning (DR) time scrubber that shows the Realms changing over history. Inspired by
https://p.migdal.pl/invisible-cities-opus-5.5/ (code: https://github.com/stared/invisible-cities-opus-5.5):
one procedural diorama per place built from a shared architecture kit, arranged on a board with several
animated layouts, keyboard navigation, tour mode, deep links, night mode.

Scope now: Faerûn only (Toril). **Planescape (Sigil, Outlands gate-towns, Great Wheel) is deferred** to a
later phase. Leave room in the data model (`world` field) and layout system (a future "Wheel" layout) for it.

Canon: through 1496 DR (Baldur's Gate 3 era). Include 4e-era events (Spellplague 1385, Mount Hotenow 1451,
Second Sundering 1482–1487) as history, not skipped.

## Constraints

- No official WotC map imagery, no copied wiki text. All descriptions are original paraphrase.
  Source: Forgotten Realms Wiki (https://forgottenrealms.fandom.com, CC BY-SA 3.0) — cite the page URL per place.
- Stack: Vite + three.js + plain JS modules (no framework). `npm` (pnpm not installed). Output must build to a
  static `dist/` deployable to GitHub Pages and publishable as a claude.ai artifact (index.html + assets).
- Single shared visual language. Think "ink-and-vellum cartographer's cabinet": warm parchment base, dark
  ink linework, one accent per region. Night mode = lantern-lit deep blue.
- Must run at 60fps on an integrated GPU with all ~80 dioramas on the board (instancing / low poly, no
  per-diorama textures, shared materials). Target < 3 MB JS total excluding three.js.

## Data model — one record per place

Files: `data/places/<region>.json`, each an array of records. Merged by `scripts/build-data.mjs` into
`src/generated/places.json` after validation against `scripts/schema.mjs`.

```jsonc
{
  "id": "waterdeep",                 // kebab-case, unique, used in deep links (#waterdeep)
  "name": "Waterdeep",
  "aliases": ["City of Splendors"],
  "world": "toril",                  // later: "sigil", "outlands", "outer-planes"
  "region": "sword-coast-north",     // see roster regions below
  "type": "metropolis",              // metropolis | city | town | fortress | ruin | underdark-city | landmark | island | dungeon
  "archetype": "harbor-metropolis",  // visual generator family, see list below
  "map": { "x": 0.18, "y": 0.42 },  // normalized 0..1 on the schematic Faerûn canvas; x east, y south. See docs/MAP.md
  "founded": 1032,                   // DR year (negative for pre-DR). null if unknown/timeless (landmarks)
  "foundedNote": "Ahghairon becomes first Open Lord; traditional date for the city as a unified polity",
  "status": [                        // state timeline; the visualizer uses this to fade/erode dioramas
    { "from": 1032, "to": null, "state": "thriving" }
  ],
  // state values: thriving | troubled | ruined | abandoned | destroyed | hidden | relocated
  "events": [                        // 3–6 dated events, most significant first in importance
    { "year": 1358, "title": "Time of Troubles", "summary": "Myrkul's forces assault the city; Midnight ascends as Mystra atop Blackstaff Tower.", "importance": 3 }
  ],                                 // importance 1 (minor) – 3 (world-shaking)
  "description": "2–4 original sentences. Evocative but factual. Present tense as of ~1490s DR.",
  "population": 1300000,             // approx, latest canon; null if unknown
  "ruler": "Open Lord Laeral Silverhand (1490s)",
  "tags": ["lords-alliance", "harbor", "undermountain"],
  "visual": {
    "palette": { "base": "#d8c9a6", "accent": "#2a4d69", "ink": "#2b2420" },
    "scale": 3,                      // 1 (hamlet) – 5 (metropolis)
    "motifs": ["harbor", "mountain", "castle", "walls", "towers", "spires"],  // from the motif vocabulary
    "terrain": "coast",              // coast | plain | forest | mountain | desert | cavern | island | swamp | tundra | river
    "notes": "Mount Waterdeep looms west; Castle Waterdeep on its flank; walled with many towers; harbor to the south."
  },
  "sources": ["https://forgottenrealms.fandom.com/wiki/Waterdeep"]
}
```

### Archetypes (visual generator families)

`harbor-metropolis`, `walled-city`, `market-town`, `frontier-town`, `fortress`, `tower-keep`, `elven-city`
(trees fused with spires), `dwarven-hold` (mountain with gate), `drow-city` (stalactite spires, faerie fire),
`underdark-city` (non-drow cavern), `ruin`, `floating-enclave`, `desert-city` (domes, minarets), `wizard-city`
(spires, arcane glow), `island-haven`, `jungle-city`, `library-fortress`, `landmark-mountain`,
`landmark-forest`, `landmark-desert`, `landmark-sea`, `landmark-monolith`, `frozen-town`.

### Motif vocabulary

harbor, walls, towers, spires, domes, minarets, castle, keep, bridge, river, lake, canal, docks, mountain,
cavern, stalactites, trees, giant-trees, ruins, rubble, lighthouse, library, temple, arena, pyramid, ziggurat,
tents, palisade, snow, lava, waterfall, floating, glow, faerie-fire, mythal, statue, gate, mines, ships,
windmill, farms, graveyard, obelisk, standing-stone.

## Roster (regions → places)

Each data agent owns one region file. IDs are given; keep them exactly.

**sword-coast-north** (`data/places/sword-coast-north.json`): waterdeep, neverwinter, luskan, mirabar,
bryn-shander (Ten-Towns, Icewind Dale), phandalin, daggerford, skullport, undermountain, dragonspear-castle,
spine-of-the-world (landmark), longsaddle, triboar, yartar

**silver-marches** (`data/places/silver-marches.json`): silverymoon, everlund, sundabar, citadel-adbar,
mithral-hall, gauntlgrym, hellgate-keep (Ascalhorn), evereska, high-forest (landmark), evermeet (Leuthilspar),
luruar-moonwood? → NO, skip. Add: citadel-felbarr, nesme

**underdark** (`data/places/underdark.json`): menzoberranzan, ched-nasad, blingdenstone, gracklstugh,
mantol-derith, araumycos (landmark, fungal mass)

**western-heartlands** (`data/places/western-heartlands.json`): baldurs-gate, candlekeep, elturel, berdusk,
iriaebor, scornubel, darkhold, beregost, soubar → NO skip soubar. Add: boareskyr-bridge (landmark),
the-way-inn? → NO skip. Add: hluthvar? → NO. Final: baldurs-gate, candlekeep, elturel, berdusk, iriaebor,
scornubel, darkhold, beregost, boareskyr-bridge, athkatla, darromar, zazesspur, calimport, memnon, almraiven

**heartlands-east** (`data/places/heartlands-east.json`) — Cormyr, Dalelands, Sembia, Dragon Coast:
suzail, arabel, tilverton, marsember, shadowdale, myth-drannor, standing-stone (landmark), cormanthor
(landmark forest), selgaunt, saerloon, ordulin, westgate, high-horn

**moonsea-and-north-east** (`data/places/moonsea-and-north-east.json`) — Moonsea, Anauroch, Vaasa/Damara,
Vast, Impiltur: zhentil-keep, mulmaster, hillsfar, phlan, melvaunt, citadel-of-the-raven, thultanthar
(Shade Enclave), anauroch (landmark), castle-perilous, helgabal (Heliogabalus), ravens-bluff, procampur,
tantras, lyrabar

**east-and-south** (`data/places/east-and-south.json`) — Unapproachable East, Old Empires, Vilhon,
Shining South, Chult, islands: eltabbar (Thay), bezantur, immilmar (Rashemen), velprintalar (Aglarond),
skuld (Mulhorand), unthalass (Unther), cimbar (Chessenta), arrabar (Chondath), alaghon (Turmish),
halarahh (Halruaa), port-nyanzaru, omu, mezro, caer-callidyrr (Moonshaes), lantan (island/nation),
sea-of-fallen-stars (landmark)

Total ≈ 88 places. Landmarks get `founded: null` and a status of `thriving` from the earliest relevant date
(use -35000 as the "always" sentinel for geography).

## Global timeline (`data/timeline.json`)

~25 world events with `year`, `title`, `summary`, `importance`, `placeIds` (places affected). Must include:
Netheril founded (-3859), Karsus's Folly / fall of Netheril (-339), Dalereckoning established (1, the Standing
Stone), Weeping War / fall of Myth Drannor (714), Waterdeep's first Open Lord (1032), Zhentil Keep & the
Zhentarim rise (~1260s), Time of Troubles (1358), Tilverton destroyed (1372), Return of the Shades (1372),
Shadowstorm / Ordulin destroyed (1374), Spellplague (1385), Mount Hotenow / Neverwinter destroyed (1451),
Second Sundering (1482–1487), Thultanthar crashes into Myth Drannor (1487), Descent into Avernus / Elturel
taken (1492), Absolute crisis at Baldur's Gate (1492).

## Time axis

Piecewise-linear scrubber: -3900…0 compressed (≈15% of track), 0…1000 (≈20%), 1000…1500 (≈65%). Named
eras as ticks: Days of Thunder / Netheril / Fall of Netheril / Dalereckoning / Myth Drannor / Era of Upheaval
(1358–1385) / Spellplague / Sundering / Present (1496).

## App design

Board of dioramas (each diorama ≈ a 1×1 tile, built from `src/kit/`), layouts animate between each other:

1. **Atlas** — grouped by region in columns (like the original's Atlas).
2. **Map** — placed at `map.x/y` on a schematic parchment Faerûn (our own stylized coastline + major
   features, drawn in code; see `docs/MAP.md`).
3. **Chronicle** — sorted by `founded`, left→right, in rows per era.
4. (future) **Wheel** — reserved for Planescape.

Time scrubber at the bottom: dioramas appear when founded (rise from the board), erode/darken/grey when
`ruined`/`destroyed`, fade when `abandoned`, lift & glow when `floating` (Thultanthar), drop into the board
when `relocated` (Elturel 1492). Events marker row along the scrubber; clicking an event jumps there and
highlights affected dioramas.

Interaction: click diorama → focus camera + side panel (name, aliases, region, type, description, per-place
event strip, sources link). `←/→` prev/next, `1/2/3` layouts, `T` tour, `N` night, `H` hide UI, `Esc`
back to board, `/` search. Deep links `#waterdeep`, `?year=1358`. Mobile: usable but desktop is the target.

## Repo layout

```
realms-atlas/
  docs/SPEC.md  docs/MAP.md  docs/DATA-NOTES.md
  data/places/*.json  data/timeline.json
  scripts/schema.mjs  scripts/build-data.mjs  scripts/screenshot.mjs
  src/main.js  src/kit/*  src/archetypes/*  src/layouts/*  src/ui/*  src/time.js
  index.html  vite.config.js  package.json
```
