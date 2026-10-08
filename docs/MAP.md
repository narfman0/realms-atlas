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
