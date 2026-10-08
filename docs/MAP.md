# Map layout: schematic Faerûn

The **Map** layout puts each diorama on a stylized parchment Faerûn drawn in code. All geometry lives in
`data/map.json`. It is our own simplified drawing, made from general knowledge of where places sit relative to
each other. It was not traced from, and does not embed, any WotC map.

## Coordinate system

- Every coordinate is normalized to **0..1** on both axes. `x` increases **eastward**, `y` increases **southward**,
  and the origin `(0,0)` is the north-west corner.
- `canvas.aspect` is **1.45** (width / height). To convert to pixels or world units, use
  `px = x * W, py = y * H` with `W = H * 1.45`. The axes are scaled differently, so one normalized unit of `x`
  is 1.45 times longer than one unit of `y` on screen. Distance checks in this doc use raw normalized units.
- The frame runs from Evermeet (west edge) to Thay and Rashemen (east), and from Icewind Dale (north) to the
  southern coast of Chult (south). Anything outside that frame, such as Kara-Tur, Zakhara or the Hordelands,
  is not represented.

## What is in `data/map.json`

| key | shape | use |
|---|---|---|
| `canvas` | `{aspect}` | canvas proportions |
| `places` | `{ id: {x, y} }` | one entry for every roster id in `docs/SPEC.md` (90 ids) |
| `coast` | `[[x,y], ...][]` | polylines. A closed shape repeats its first vertex at the end |
| `coastMeta` | `{name, closed, kind}[]` | matches `coast` by index. `kind` is `mainland`, `water` (fill as sea) or `island` (fill as land) |
| `features` | `{label, x, y, kind, style?}[]` | lettering. `kind` is one of `mountains, forest, desert, sea, region`. `style: "dashed-inset"` marks the Underdark label |
| `ranges` | `{name, points}[]` | mountain spines to draw with hatch or chevron marks |

The `map` field in each place's data file (`data/places/*.json`) should match `places[id]` here. **This file is
the source of truth for positions.** If the two disagree, the build should take the value from `map.json`.

## How the positions were worked out

1. We drew a skeleton from well-known relative geography: the Sword Coast running north to south and leaning
   slightly south-east, with the Sea of Fallen Stars in the middle-east and Chult as the southern peninsula.
2. We placed anchor cities on that skeleton in this order: Luskan, Neverwinter, Waterdeep, Baldur's Gate,
   Athkatla, Calimport on the west coast; Suzail on the Dragonmere; Zhentil Keep on the Moonsea; Eltabbar in
   Thay.
3. We placed every other site relative to the nearest anchors, using roads, rivers and borders: Long Road and
   Dessarin for the North; Chionthar and Trade Way for the Heartlands; Dalelands and Sembia around Cormanthor.
4. Underdark sites sit at the surface point above them, so they sit very close to surface places nearby.
5. Spacing rule: no two places closer than **0.035**. Minor places were moved outward to meet it, while keeping
   their relative order.

## Adding a place

1. Find two or three existing places it sits between and estimate `x, y` from them. Keep relative directions
   right before worrying about distances.
2. Add it to `places` in `data/map.json` and set the same value in the place's `map` field.
3. Run `node scripts/map-preview.mjs`. It writes `docs/map-preview.svg` and checks the following: coordinates
   are in bounds; places are at least 0.035 apart; no place sits inside a water polygon; island places are on
   an island outline; no mainland place is west of the Sword Coast line; and a set of relative-order rules
   hold. It exits non-zero if any check fails.
4. If it collides, move the **less important** place outward, away from the cluster.

## Known approximations

- **Distances are not to scale.** The Sword Coast and the North are stretched so their dense clusters fit;
  the Unapproachable East and the Shining South are compressed.
- **Underdark** sites are placed under the surface area that sources link them to, then moved to meet the
  spacing rule. Menzoberranzan sits slightly north-east of Mithral Hall. Blingdenstone and Mantol-Derith sit
  west of Mithral Hall. Gracklstugh is placed between Nesme and the High Forest, standing in for "under the
  Evermoors". Ched Nasad sits beside the Graypeaks hatch line. Araumycos is under the south-west High Forest.
- **Candlekeep / Baldur's Gate:** canon puts Candlekeep on the coast south-south-west of Baldur's Gate.
  Baldur's Gate is drawn slightly north-east of Candlekeep, at the Chionthar estuary, with Beregost to the
  south.
- **Lantan** is drawn as a small island west of Chult. **Nimbral** is a decorative island to the south-west
  with no place attached.
- **Moonshaes** are drawn as two islands (Alaron with Caer Callidyrr, and Gwynneth). The smaller isles are
  left out.
- **Thultanthar** is placed at its long-standing hover point over eastern Anauroch. Its 1487 crash into Myth
  Drannor is a status change, not a move.
- **Sea of Fallen Stars:** the Dragon Reach is a single northward arm. The Moonsea is a separate lake, and
  the River Lis connecting them is not drawn. Aglarond is a westward peninsula, and the Alamber Sea and the
  Vilhon Reach are simplified lobes. Turmish and Chessenta are both drawn on the south shore.
- **Storm Horns and Thunder Peaks** are drawn as one arc around Cormyr, with a gap at Tilverton. The Nether
  Mountains, Graypeaks and Sunset Mountains are short marker lines.
- The **Shining Sea** is drawn as a closed bay between Calimshan/the Lake of Steam and Chult's north coast. Chult is a
  peninsula joined to the mainland east of the bay's end. The Great Sea coast runs east from there, with
  Halruaa (Halarahh) inland on it, east of the Shining Sea.
- Coastlines of the far east (Rashemen, Mulhorand) and the northern ice are not drawn. The frame simply ends
  there.

## Phase 2: the other worlds

`data/worlds.json` lists the boards (see `docs/SPEC-2.md`). Every world except Faerûn has its own schematic at
`data/maps/<world>.json`, in the same shape as `data/map.json`, with the same 0..1 coordinates (x east, y south).
Like Faerûn, each is our own simplified drawing made from relative geography in the place descriptions. None
of them is traced from or embeds a WotC map.

| world | aspect | what is drawn |
|---|---|---|
| `ten-towns` | 1.45 | Maer Dualdon, Lac Dinneshere and Redwaters as closed `water` polygons; Kelvin's Cairn as a short range; the Sea of Moving Ice as one open `mainland` shoreline in the north-west; the Reghed Glacier's edge as an open line with the new coast kind `ice` (inked, never filled, and not part of the mainland closure) |
| `kara-tur` | 1.45 | Shou Lung's coast with the Koryo peninsula, T'u Lung in the south, Kozakura and Wa as islands in the Celestial Sea, the Tabot heights, the Dragonwall as a `ranges` line along the northern frontier, and the Hungtse river (`rivers`) from Kuo Te Lung to Karatin |
| `zakhara` | 1.45 | the Land of Fate with the Golden Gulf cutting north into Suq Bay (Huzuz and Hiyal face each other across it, Jumlat at its mouth), the Crowded Sea to the west with Hawa on the Genie's Turban islands, Qudra on the north coast, the Pearl Cities on the east coast, and Afyal as an island to the east |
| `maztica` | 1.45 | the True World with Nexal on an `island` inside the closed Lakes of Nexal; Payit on the east coast (Ulatos and Helmsport by the Gulf of Cordell); Far Payit as the eastern peninsula; Kultaka north, the House of Tezca south, Huacli west behind the western sierra |
| `laerakond` | 1.45 | the Dragon Sea coast with the five Windrise Ports along it (Sambral on the Bay of Pearls), Fimbrul under the Howling Mountains, Melabrauth's jungle in the north-east |
| `planes` | 1.0 | no coast. Gate-towns on a circle of radius 0.33 around (0.5, 0.5) at angle `-90° + ring.order × 22.5°` (clockwise from Excelsior at the top); each Outer Plane site on radius 0.46 at its gate-town's angle; Sigil at the centre with the Spire's foot at (0.5, 0.545); the City of Brass at (0.9, 0.1) |
| `realmspace` | 1.0 | no coast. The sun at the centre; each planet at distance `0.44 × orbit.radius` from it, at a fixed per-planet angle chosen to spread the labels; Selûne, the Tears and the Rock of Bral at 0.05 from Toril, 120° apart; the crystal shell on the rim (r 0.48) |

Additions to the format (all optional; Faerûn uses none of them):

- `guides`: `{kind: "circle", cx, cy, r, name}` or `{kind: "spokes", cx, cy, r0, r1, count, startDeg, name}`. These
  are construction lines for the Wheel and Orbit layouts: the Outlands rings and spokes, and Realmspace's orbits
  and shell. Radii are in units of canvas height. The board is free to draw its own geometry instead.
- `rivers` with a parallel `riversMeta` `{name}[]`: open polylines. `scripts/build-data.mjs` already normalises
  any array key into linework, and `rivers` becomes kind `river`.
- Coast kind `ice`: an open line that is inked but never closed into land or sea.
- Feature `size`: a multiplier on the label's type size (default 1).

Positions are computed from the rules above for `planes` (read from `ring.order` in `data/places/planes.json`)
and `realmspace` (from `orbit.radius` and `satelliteOf`). The Wheel and Orbit layouts may recompute them, but the
map file must stay consistent with them.

### Preview

`node scripts/map-preview.mjs <world>` renders `data/maps/<world>.json` to `docs/map-preview-<world>.svg`.
`node scripts/map-preview.mjs` with no argument (or `toril`) still renders Faerûn exactly as before. For a
phase-2 world the script checks:

- bounds and the 0.035 spacing rule;
- that no place sits in a `water` polygon unless it is on an `island` inside it (Nexal);
- that every place is on the land side of the mainland coast or on an island, except declared water landmarks
  (Sea of Moving Ice, Golden Gulf). The land side is closed along the frame the same way the board does it;
- island membership (Wa, Kozakura, Afyal, Hawa, Nexal);
- per-world relative-order rules (in `rules` in the script);
- ring radii for the Planes;
- that the ids in `data/places/<world>.json` and the map match one-to-one.

The Realmspace preview uses a dark starfield.

### Phase-2 approximations

- **Ten-Towns:** Bryn Shander sits on its hill apart from the lakes. Targos, Termalaine, Lonelywood and Bremen
  are around Maer Dualdon (Bremen on the west at the Shaengarne); Caer-Konig, Caer-Dineval and Easthaven are on
  Lac Dinneshere; Good Mead and Dougan's Hole are on Redwaters' north-west and west shores. The Dwarven Valley
  sits at the south foot of Kelvin's Cairn. Distances are stretched so the labels fit.
- **Kara-Tur:** the continent is cropped to its eastern half. The Hordelands, Malatra and the far south are left
  out. Kuo Te Lung is placed inland up the Hungtse, with Karatin at its mouth.
- **Zakhara:** the Golden Gulf is drawn as one long inlet ending in Suq Bay. The Corsair Domains are reduced to
  one islet, and the Pearl Cities are only suggested by Muluk and Umara on the east coast.
- **Maztica:** Lake Pezel and the southern lands (Lopango, Kolan) are not drawn. The Valley of Nexal's lakes are
  drawn as one lake.
- **Laerakond:** only the Windrise coast and two interior realms are placed. The north edge of the frame is open
  land.
- **Planes:** the Spire is moved 0.045 below Sigil so the two do not coincide. The Wheel layout raises Sigil on
  top of it.
