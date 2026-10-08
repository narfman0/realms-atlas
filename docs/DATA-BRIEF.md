# Brief for data agents

You own one region file under `data/places/`. Read `docs/SPEC.md` first (data model, archetypes, motifs, roster).

## Process per place

1. Fetch the Forgotten Realms Wiki page (https://forgottenrealms.fandom.com/wiki/<Name>) with WebFetch. If a
   page is thin, also fetch the relevant history/region page. Do not rely on memory alone for dates.
2. Fill every field of the schema. Rules:
   - `description`: 2–4 ORIGINAL sentences, your own words, no copied phrasing. Evocative, concrete, factual.
     Present tense as of the 1490s DR unless the place is gone (then describe what remains).
   - `events`: 3–6 dated events with DR years (negative for pre-DR). Prefer events that change the place's
     status or are famous (sieges, founding, destruction, Spellplague/Sundering effects, 5e adventure hooks).
     If a year is approximate, use the best single integer and note "c." in the summary.
   - `status`: a contiguous state timeline from `founded` (or earliest known) to `null` (present). Every
     place MUST have at least one entry. Use the 7 states in SPEC. Examples: Myth Drannor thriving 261→714,
     ruined 714→1377, thriving 1377→1487, destroyed 1487→null. Neverwinter thriving →1451, destroyed
     1451→1467, troubled 1467→1479, thriving 1479→null. Elturel thriving →1492, relocated 1492→1492(back
     end of year), thriving 1492→null (it returned).
   - `founded`: integer DR year or null. For ancient/legendary founding, give the canonical year if the wiki
     has one; else earliest attested and say so in `foundedNote`.
   - `map`: leave as `{"x": null, "y": null}` — a separate cartographer agent fills coordinates.
   - `visual`: choose archetype/motifs/terrain/palette that a procedural generator could act on. `notes` is
     1–2 sentences of concrete silhouette guidance (what a 3D diorama should show at a glance).
     Palette: `base` (ground/parchment tint), `accent` (one regional hue), `ink` (dark line color).
   - `sources`: the wiki URLs you actually read.
3. Validate: JSON must parse. Run `node -e "JSON.parse(require('fs').readFileSync('data/places/<file>','utf8'))"`.
4. Append 3–8 lines to `docs/DATA-NOTES.md` under a heading for your region: judgement calls, uncertain dates,
   anything the visualizer should know (e.g. "Thultanthar floats; it is a flying city until 1487").

Do not touch other regions' files or `src/`. Do not ask questions; make the call and note it in DATA-NOTES.
Finish with a short report: places done, any you could not source, notable judgement calls.
