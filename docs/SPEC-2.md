# Realms Atlas — phase 2 spec: sub-atlases and narration

Extends `docs/SPEC.md`. Two features:

1. **Worlds (drill-in sub-atlases).** Beyond Faerûn, the atlas gets additional boards: Ten-Towns (a zoom into
   Icewind Dale), the Planes (Sigil, the Outlands gate-towns, the Outer Planes), Realmspace (Spelljammer: the
   crystal sphere around Toril), and the other continents of Toril (Kara-Tur, Zakhara, Maztica, Laerakond).
2. **Narration.** ~16 short in-world story vignettes tied to significant events, with pre-rendered
   text-to-speech audio and a browser-speech fallback, surfaced as "Hear the tale" moments in the atlas.

## Worlds

`data/worlds.json`:

```jsonc
[
  { "id": "toril",      "name": "Faerûn",     "kind": "continent", "layoutDefault": "map",   "parent": null },
  { "id": "ten-towns",  "name": "Ten-Towns",  "kind": "region",    "layoutDefault": "map",   "parent": "toril", "parentPlace": "bryn-shander" },
  { "id": "planes",     "name": "The Planes", "kind": "planar",    "layoutDefault": "wheel", "parent": null },
  { "id": "realmspace", "name": "Realmspace", "kind": "space",     "layoutDefault": "orbit", "parent": null },
  { "id": "kara-tur",   "name": "Kara-Tur",   "kind": "continent", "layoutDefault": "map",   "parent": null },
  { "id": "zakhara",    "name": "Zakhara",    "kind": "continent", "layoutDefault": "map",   "parent": null },
  { "id": "maztica",    "name": "Maztica",    "kind": "continent", "layoutDefault": "map",   "parent": null },
  { "id": "laerakond",  "name": "Laerakond",  "kind": "continent", "layoutDefault": "map",   "parent": null }
]
```

Place records for a world live in `data/places/<world>.json` (same schema as SPEC; `world` set accordingly;
ids prefixed per world: `tt-`, `ps-`, `sj-`, `kt-`, `zk-`, `mz-`, `la-`). A Toril-level place may carry
`"drill": "<world id>"` (bryn-shander → ten-towns) and the UI shows an "Enter" affordance on it. Maps per
world live in `data/maps/<world>.json` (same shape as `data/map.json`; for `planes` and `realmspace` the
coast arrays are empty and `ring`/`orbit` geometry is computed by the layout, see below). The global
timeline is shared and stays in DR; add world events with `worldIds` where relevant.

### Rosters

**ten-towns** (`tt-`): tt-bryn-shander, tt-targos, tt-termalaine, tt-lonelywood, tt-bremen, tt-easthaven,
tt-caer-dineval, tt-caer-konig, tt-good-mead, tt-dougans-hole, tt-kelvins-cairn (landmark), tt-reghed-glacier
(landmark), tt-sea-of-moving-ice (landmark), tt-dwarven-valley (Battlehammer hold under Kelvin's Cairn).
Timeline hooks: Akar Kessell / Crystal Shard (1351), Rime of the Frostmaiden's Everlasting Rime (c. 1489–1492).

**planes** (`ps-`): ps-sigil, ps-the-spire (landmark), the sixteen gate-towns: ps-excelsior, ps-tradegate,
ps-ecstasy, ps-faunel, ps-sylvania, ps-glorium, ps-xaos, ps-bedlam, ps-plague-mort, ps-ribcage, ps-rigus,
ps-curst, ps-hopeless, ps-torch, ps-automata, ps-fortitude; one signature site per Outer Plane:
ps-mount-celestia, ps-bytopia, ps-elysium, ps-beastlands, ps-arborea, ps-ysgard, ps-limbo, ps-pandemonium,
ps-the-abyss, ps-carceri, ps-gray-waste, ps-gehenna, ps-baator, ps-acheron, ps-mechanus, ps-arcadia; plus
ps-city-of-brass (Elemental Plane of Fire). Each gate-town record carries `"ring": {"order": 0..15,
"plane": "ps-mount-celestia"}` (order clockwise from Excelsior) so the Wheel layout can place it; each plane
record carries `"ring": {"order": n}` matching its gate-town. Dates: Planescape is largely timeless; use
`founded: null`, status thriving from -35000, and only add dated events with real DR correlations (Faction War
c. 1370s DR; Elturel dragged into Avernus 1492; the Blood War is ongoing). Sigil's wards go in `description`.

**realmspace** (`sj-`): sj-the-sun (landmark), sj-anadia, sj-coliar, sj-toril (the world as seen from
wildspace; `drill: "toril"`), sj-selune, sj-tears-of-selune, sj-rock-of-bral, sj-karpri, sj-chandos,
sj-glyth, sj-garden, sj-hcatha, sj-crystal-shell (landmark: the sphere wall). Each carries
`"orbit": {"index": n, "radius": 0..1}` (0 = the sun; the Rock of Bral and Tears share Toril's orbit as
satellites via `"satelliteOf": "sj-toril"`).

**kara-tur** (`kt-`): the data agent verifies each on the wiki and may substitute better-attested cities:
kt-kuo-meilan (Shou Lung capital), kt-karatin, kt-wai (T'u Lung capital), kt-uwaji (Wa), kt-dojyu
(Kozakura), kt-u-chan-gompa (Tabot), kt-saikhoi (Ra-Khati), kt-xi-hu (Koryo), kt-plain-of-horses
(landmark), kt-celestial-sea (landmark). Convert Shou calendar years to DR (Shou Year 2607 = 1357 DR).

**zakhara** (`zk-`): zk-huzuz, zk-qudra, zk-hiyal, zk-muluk, zk-afyal, zk-jumlat, zk-hawa, zk-umara,
zk-haunted-lands (landmark), zk-golden-gulf (landmark).

**maztica** (`mz-`): mz-nexal, mz-ulatos, mz-helmsport, mz-huacli, mz-kultaka, mz-pezelac, mz-house-of-tezca
(landmark), mz-far-payit (landmark). Timeline hooks: Golden Legion lands 1361; Maztica swapped to Abeir 1385,
returned 1487.

**laerakond** (`la-`): la-tarmalune, la-harglast, la-imdolphyn, la-ramekho, la-sambral, la-melabrauth
(dragon realm, landmark), la-fimbrul (landmark). Arrived with Abeir in 1385; returned to Abeir in 1487 →
status `hidden` outside 1385–1487.

### Layouts

- **Wheel** (planes): Sigil at the centre on the Spire (raised); the 16 gate-towns on a ring at their
  `ring.order` angle; their Outer Plane sites on an outer ring at the same angle; City of Brass off to one
  side. Board drawn as the Outlands: concentric ink rings, spokes, the Spire as a tall needle.
- **Orbit** (realmspace): the sun at centre; planets on concentric orbits at `orbit.radius`; satellites
  offset from their primary; board is deep blue-black vellum with star pricks; orbits as faint ink circles;
  the crystal shell as the board's rim. Slow orbital animation optional.
- **Map** for the continents uses `data/maps/<world>.json` exactly as Faerûn does.

### Navigation

A world switcher in the top bar (Faerûn · Ten-Towns · Planes · Realmspace · Kara-Tur · Zakhara · Maztica ·
Laerakond). Switching worlds swaps the board (fade out / fade in; the camera re-frames). A Toril place with
`drill` shows "Enter Ten-Towns" in its panel and on hover; Realmspace's Toril diorama drills back to Faerûn.
Deep links: `?world=planes`, `#ps-sigil` implies its world. Search spans all worlds. The time scrubber is
global; places outside the current world still resolve their state (so the Chronicle of a world is per
world). Contents overlay lists worlds as sections.

## Narration

`data/stories.json`: array of

```jsonc
{
  "id": "karsus-folly",
  "title": "The Folly of Karsus",
  "year": -339,
  "worldId": "toril",
  "placeIds": ["thultanthar", "anauroch"],
  "eventTitle": "Karsus's Folly",      // matches a timeline.json event title where one exists
  "narrator": "an Avowed of Candlekeep", // in-world voice, consistent across stories
  "text": "120–180 words of original prose ...",
  "audio": "narration/karsus-folly.mp3", // or null when no pre-rendered file exists
  "durationSec": 62
}
```

Audio files live in `public/narration/` (Vite copies them to dist). Pre-render with a local open-weights
TTS if one can be installed (preferred order: Kokoro via pip in a venv → Piper → none); `scripts/tts.py`
regenerates all clips from `data/stories.json`; mp3 at 48 kbps mono via ffmpeg. Browser fallback: the Web
Speech API (`speechSynthesis`) reading `text` when `audio` is null or fails to load.

UI: a story marker (small open-book glyph) on the scrubber at each story year and on the affected
dioramas' labels. Clicking opens a "Tale" card over the panel with title, year, the text (scrollable,
drop-cap), and Play/Pause with a progress bar. Playing a tale jumps the year to the story's year, flies
the camera to the first `placeId` diorama, and pulses the others. Tour mode (`T`) pauses at story years and
plays the tale if narration is enabled (toggle in the top bar: "Narration on/off", default on, remembered
in localStorage). `S` opens a stories index. Respect `prefers-reduced-motion` and never autoplay audio
without a user gesture (browsers block it): the first Play click arms audio.
