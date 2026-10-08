
## moonsea-and-north-east

- Sourcing: WebFetch returned HTTP 402 for every fandom page, so wikitext was pulled from the same wiki's MediaWiki API (api.php?action=parse) with curl. The `sources` URLs are the normal /wiki/ pages.
- Thultanthar is a flying city (archetype `floating-enclave`, motif `floating`) in two periods: -1471 to -339, and 1372 to 1487. From -339 to 1372 it is `hidden` (in the Plane of Shadow). After 1487 it is `destroyed` and should be shown as rubble on the ground. The status enum has no "floating" state, so the visualizer has to work out the float from the archetype plus non-hidden/non-destroyed status.
- Anauroch: the wiki puts the greening *during* Shadovar rule (by c. 1479), and says the land turned back into desert after Netheril fell (1487 onward). That contradicts the brief's "greens after 1487". I followed the wiki: event 1479 "The greening", event 1487 desert returns.
- Zhentil Keep: all but the Foreign Quarter destroyed 1368 → `troubled`; razed again by the Shadovar 1383 → `ruined`; retaken by the Zhentarim c. 1491 → `troubled`. Population left null because the wiki gives no figure for the 1490s.
- Castle Perilous: ruined 1359–1477. After the 1477 earthquake it "renews itself" in black stone because an Abyssal portal reopened. That is the "rebuilt" phase, shown as `troubled` (intact but sinister).
- Phlan has 10 status segments (destroyed/ruined/rebuilt cycle). 1306–1340 is `ruined` (monster-held under Tyranthraxus). From 1486 it is `troubled` (martial law, then the 1489 Cult of the Dragon occupation).
- Uncertain dates: Melvaunt founded = 902 (earliest attested; real founding unknown). Tantras founded = 649 (start of the Time of Glorious Fools). Procampur founded = -153 (Proeskampalar); the surface city dates from 523. Citadel of the Raven = -18000 (traditional dating). The Vesperin union has no canon year: Ravens Bluff's event uses 1450 as a placeholder, and Tantras's uses "by 1479".
- Rulers for Ravens Bluff (O'Kane) and Procampur (Rendeth) are the last ones attested, not confirmed 1490s rulers. Helgabal's ruler is from 1479.

## underdark

- WebFetch returned HTTP 402 from fandom.com; I pulled page wikitext via the wiki's MediaWiki API (`api.php?action=parse&prop=wikitext`) instead. Same pages and content, cited by their normal /wiki/ URLs.
- Blingdenstone: the wiki says resettlement started in **1440 DR** (not the 1480s) and the gnomes had "reclaimed their land" by the late 15th century. I used abandoned 1371→1440, troubled 1440→1487, thriving 1487→. The 1487 cutoff is my own call, set just after the Out of the Abyss years (1486–87).
- Menzoberranzan: troubled 1372–1373 (slave revolt and siege) and again 1485–1490 (Quenthel's demons, Demogorgon in 1486, the Baenre civil war ending in 1490). Population 20,000 counts drow only (c. 1486); slaves are uncounted for that date.
- Ched Nasad: destroyed 1372→1373, then ruined (not thriving), because the wiki says in 1463 that it was "never rebuilt" even though a council of about 7,500 people exists by 1479. The archetype stays `drow-city` so the web silhouette stays recognizable while erosion shows the ruin. Type is `ruin`.
- Gracklstugh: troubled 1486–1490 for demonic madness and the mind flayer's control of the Deepking (cleared c. 1490 according to the Themberchaud page). Population 12,050 = 1486 free count (10,000 duergar, 2,000 derro, 50 giants). Themberchaud has left for Dolblunde by the late 1490s.
- Mantol-Derith: the wiki gives no founding date. `founded: null` and status starts at 1372 (earliest dated mention), so the visualizer will show it from 1372 only unless it treats null as "always". Type is `town` (it is a caravan market, not a city).
- Araumycos uses the `landmark-forest` archetype (giant-trees motif rendered as fungal masses) because no fungus archetype exists. The Ammarindar event (-4100) is the founding of the dwarven kingdom; the wiki gives no date for when the fungus took its mines.
- Palette accents vary by people instead of one shared regional hue: drow violet (Menzoberranzan), amber (Ched Nasad's faerie fire), ember orange (duergar forges), teal/blue gem tones (gnomes, Mantol-Derith), fungal grey-green (Araumycos). All `map` coordinates are null, waiting for the cartographer to place each site beneath its surface neighbor (Menzo/Blingdenstone under the Surbrin and Silver Marches; Gracklstugh under the Evermoors; Ched Nasad under the Graypeaks/High Gap; Araumycos under the High Forest).

## silver-marches

- Source access: fandom HTML returned 402/403 to WebFetch; all pages were read as wikitext via the MediaWiki API (`api.php?action=parse`). Cited URLs are the normal /wiki/ pages.
- Mithral Hall: the wiki only says Shimmergloom took the Hall "in the 1100s" (and its infobox gives 10,000 people in 1183); I used c. 1104 as instructed and flagged it in the event summary. `founded` is null (pre-0 DR, date unknown), so the first status entry has `from: null`. The High Forest (timeless landmark) uses `from: null` too; the validator should allow this.
- Sundabar: fell to Hartusk in 1484 and its surface people were wiped out. The wiki says nothing about what happened after the war, so I set it to ruined 1484–1486, then troubled 1486–present ("recovering", my own call).
- Nesmé: troll sack (ruined 1370–1372), then destroyed in 1484 and never rebuilt. Gauntlgrym is listed under Sword Coast North on the wiki but sits in this file by roster. It is "ruined" from 153 to 1486 (illithid-held, lost to the dwarves). A later, undated loss to the beholder Felbris is not modeled.
- Hellgate Keep: the infobox gives 880 for Ascalhorn's fall, but the demons only won in 882; I used 882. Destroyed in 1369 and became a crater ("Hellgate Dell") that treants are reforesting, so the diorama should show a gulch, not a standing keep. Uses a demonic accent (#7a3b2e).
- Evermeet is modeled on Leuthilspar. It is "hidden" 1385–1487 (moved into the Feywild); the wiki says only that it returned at the end of the Second Sundering "in the 1480s", so I used 1487. Founding year is the island's creation (-17600); Leuthilspar has no founding date of its own.
- Evereska is "hidden" until humans found it in 244 and "troubled" during the phaerimm siege and its aftermath (1371–1375). The elven places (Evereska, High Forest, Evermeet) use green/blue accents; the rest use the regional silver-blue #5b7a99.
## sword-coast-north

- Source access: WebFetch got HTTP 402 from fandom, so every page was pulled as wikitext through the wiki's MediaWiki API (`api.php?action=parse`). The URLs in `sources` are the canonical page links.
- Approximate founding dates (the wiki gives none): Bryn Shander 1080 (Ten Towns founded "during the 11th c.", and Bryn Shander was the last), Phandalin 900 (old farming town in Phandelver's Pact c. 10th c.), Triboar 1040 (settled after 1032, named in a mid-11th-c. tale), Yartar 1000 (Dessarin villages c. 1000). Neverwinter -10 is the date of the Halueth Never legend.
- Neverwinter: destroyed 1451→1468 (the wiki gives 1468 for Neverember's rebuilding, not the brief's 1467), troubled 1468→1484 (Chasm sealed c. 1484–85), thriving after that. The Wailing Death in 1372 is listed as an event but does not change its status.
- Luskan: founded 1302, when the orcs were driven out of Illusk. thriving→1376 (Hosttower falls), troubled→1385, ruined 1385→1486 (century of anarchy, about 4,000 people in 1480), troubled after 1486 (Hosttower rebuilt and the Brotherhood back; the High Captains are Jarlaxle's puppets).
- Skullport: `founded` is -750 (the Netherese Sargauth Enclave) so the diorama exists in the Netheril era. It is ruined -339→1148, Shradin's port 1148→1384, buried and ruined by the Spellplague 1384→1480, and troubled during the revival from 1480. The wiki says only "latter 15th c." for the revival, so 1480 is my guess. It is thriving again from 1492 under the Xanathar. Population is null because the only figure is 2,250 (1372) and the post-Spellplague count was "hundreds".
- Phandalin: thriving 900→951, abandoned 951→1370 (orcs), troubled 1370→1385 (first resettlement, "some years before 1374"), ruined 1385→1486, troubled 1486→1492 (Redbrands, Cryovain), thriving after that.
- Undermountain uses archetype `ruin` (there is no dungeon archetype). It is `hidden` 211→1302 (Halaster's sealed era) and `troubled` from 1302, when the Yawning Portal opens it to adventurers. Visualizer: a cutaway mountain with stacked levels. It sits under Waterdeep, and Skullport sits inside it, so map coordinates will nearly overlap.
- Dragonspear Castle is a ruin held by one occupier after another (devils, the Shining Crusade, undead, vampires), so it stays `ruined` from 1354. The Avernus portal glow is its key motif. Waterdeep's population (1,347,680, from 1372) includes the surrounding region; the city proper is about 100k+.

## east-and-south

- Wiki pages were fetched through the MediaWiki API (`api.php?action=parse&prop=wikitext`) because WebFetch got HTTP 402. Source URLs are the normal /wiki/ pages.
- Spellplague arcs: Halarahh, Lantan and Cimbar are `hidden` 1385→1487 (sent to Abeir and returned in the Sundering). Cimbar came back as a ruin (Chessenta page says "in ruins as of the 15th c."), so it is `ruined` from 1487. Mezro is `hidden` twice: 863→1363 (invisibility wall) and 1385→1489 (demiplane).
- Skuld is `destroyed` 1385→1487, not hidden: the city itself was reduced to rubble. It is `troubled` (rebuilding) after Mulhorand's restoration in 1487. Unthalass is `ruined` 1385→1487 because lamias held the ruins on Toril the whole time; it is `troubled` after Gilgeam's return in 1487 (war with Tymanther).
- Arrabar is `ruined` 1385→1487 ("seemingly destroyed", healed when Mystra returned), not hidden.
- Mezro's return in 1489 is inferred: canon only says it can't return while Ras Nsi lives, and Ras Nsi is defeated in Tomb of Annihilation. Tomb of Annihilation and the death curse are set to 1489 (canon places them between 1488 and 1492). Port Nyanzaru's independence from Amn is put at c. 1480 (nine years before the adventure).
- Undated foundings use `founded: null` with status starting at -35000: Immilmar (built on Narfell ruins), Port Nyanzaru, Omu, Lantan, and the Sea of Fallen Stars. Omu's dates are estimates: Ubtao leaves c. 1280, Acererak takes over c. 1370, the yuan-ti arrive c. 1450. Cimbar's c. -526 comes from "500 years before Cormyr". Halarahh uses 1263 (the year it became capital). Bezantur uses -150 (its earliest mention, as Kensten).
- Velprintalar was renamed Veltalar between 1374 and 1479. Its waterfront moved out onto the drained seabed after 1385. Visualizer: the Sea of Fallen Stars is `troubled` 1385→1486 to show the lowered sea, and it refills with the Great Rain (1485–86).
- All 16 places use the regional accent #b5562b (burnt sienna).

## heartlands-east

- Source access: WebFetch returns HTTP 402 for fandom.com. All pages were read as wikitext through the MediaWiki API (`https://forgottenrealms.fandom.com/api.php?action=parse&page=<Page>&prop=wikitext`). The `sources` URLs are the normal /wiki/ pages.
- Myth Drannor: the wiki dates the city of Cormanthor to -3983 DR and the renaming/mythal ("the Opening") to 261 DR. I used `founded: -3983`, which differs from the brief's example of 261. Status: thriving -3983→714, ruined 714→1374, troubled 1374→1377 (the Elven Crusade retakes it and restoration starts), thriving 1377→1487 (Ilsevele draws the Rulers' Blade), destroyed 1487→null (Thultanthar crashes onto it). If the Chronicle layout should place it at 261, change only `founded`.
- Tilverton: no founding date exists, so `founded: null` and the status starts at c. 1300 DR (Gharri's arrival). It is destroyed from 1372→null. It shows as a crater (the Tilverton Scar). After 1385 it is a plagueland with a shadow and blue-fire spiral. New Tilverton (1373) is mentioned only in events.
- High Horn: no construction year. It was dug by dwarven emigrants from Anauria, so the status starts at 111 DR (Anauria's fall) as an approximation. Population ≈400 is the garrison.
- Ordulin: `founded: 1` (Moondale, settled "just after" the Standing Stone). It was renamed and made capital c. 1067. Destroyed 1374→1484 (the shadow maelstrom, with the floating Sakkors citadel above it), ruined 1484→1487, troubled (rebuilding) 1487→null. It is capital again by 1499, just past the canon cutoff.
- Standing Stone: built monument, so `founded: 1` rather than null. Destroyed by the fey'ri in 1374. Rebuilt "just over 50 years later", which I set to c. 1425.
- Marsember: abandoned 289→c.400 (flooded after a siege; "abandoned twice" and in ruins by 376) and abandoned again 1486→1487 (Shadovar invasion). Reoccupied after both, with shipbuilders active in the 1490s.
- Westgate: Orlak's overthrow is -157 on the main page and -137 on History of Westgate. I used -137. The early status is "troubled" while the topaz dragon ruled (-1000 to -349).
- Selgaunt/Saerloon: "troubled" 1374→1487 stands for Netherese vassalage. Arabel and Suzail have short troubled spans for the Goblin War (1371) and the Siege of Suzail (1486). All places use the shared regional accent #5b3f7d.

## western-heartlands

- Sourcing: WebFetch returned HTTP 402 for every fandom page, so pages were pulled as wikitext through the wiki's MediaWiki API (`api.php?action=parse&prop=wikitext`) with curl. Same pages, same CC BY-SA source. The `sources` URLs are the canonical /wiki/ links.
- Candlekeep: the wiki dates the founding to c. -200 DR, not the 400s; Alaundo arrived in 75 DR. Its troubled status runs 1486–1488, covering Shadovar infiltration and the 1487 mythal battle with Larloch.
- Elturel: follows the brief's pattern exactly: thriving→1492, relocated 1492→1492, thriving 1492→null. The wiki says only that it "eventually" returned, so the same-year return is the brief's call. A glowing orb (the Companion) should hover over the city from 1444 until 1492. Founding uses 1090, the earliest dated mention; the site is much older.
- Placeholder founding years (no canonical date on the wiki): Baldur's Gate 204 (Gray Harbor attested; Loklee predates 0 DR), Berdusk 241, Iriaebor 1264, Elturel 1090, Darromar -370 (capture of Calimaronn, renamed Ithmong). Scornubel, Darkhold and Boareskyr Bridge have `founded: null`, and their first status entries begin at 1358, -339 and c. 1350. The visualizer should treat a null `founded` as "exists from the first status entry", or Scornubel will pop in late.
- Calimport and Memnon are troubled 1385–1489. That covers the genie wars (Second Era of Skyfire, 1385–1450), when genasi held Calimport (windsoul) and Memnon (firesoul), and the warlord years until the slave revolts of c. 1489. Calimport is abandoned from -3332 to -3232 (Sunset Plague). Memnon is ruined from -6100 to -5960 (fall of Memnonnar).
- Zazesspur and Darromar are troubled during the Tethyrian Interregnum (1347–1369). The rename from Ithmong to Darromar is undated on the wiki; I put it c. 1370.
- Iriaebor's 1363 Zhentarim takeover is described as "brief", so it is modelled as troubled 1363→1364. Darkhold is troubled 1372–1374 (Sememmon leaves, Bane/Cyric schism) and the Zhentarim HQ from then on.
- All 15 records share one regional accent (#9c4a2c, terracotta) and vary only `base`. Calishite cities (Calimport, Memnon, Almraiven) use desert terrain and lighter sand bases.

## realmspace

- Source pages were pulled as wikitext through the MediaWiki API: Realmspace, The sun, Anadia, Coliar, Toril, Selûne (moon), Tears of Selûne, Rock of Bral, Bral, Andru, Karpri, Chandos, Glyth, Garden, H'Catha, Crystal sphere. The bare "Selûne" page is the goddess, so the moon data comes from "Selûne (moon)".
- Orbit: `radius = index / 8` by planetary order (sun 0, Anadia 1, Coliar 2, Toril 3, Karpri 4, Chandos 5, Glyth 6, Garden 7, H'Catha 8 = 1.0). The crystal shell is index 9 with radius 1.0 (`type: landmark`, it is the board's rim). Selûne, the Tears and the Rock of Bral share Toril's index/radius (3, 0.375) and carry `satelliteOf: "sj-toril"`. The Rock of Bral sits inside the Tears cluster, so the layout may offset it from the Tears too.
- New motifs used: `sphere`, `rings`, `asteroid`, `gas-giant`, `ice`, `station`. Until the engineer adds them they produce warnings only. Terrain has no "space" value, so it is a nearest fit: sun desert, Coliar/Tears/Bral/Chandos island, Glyth cavern (flayer cities are underground), Garden forest, H'Catha mountain (the Spindle), shell plain.
- Timeless bodies use `founded: null`, thriving from -35000. Exceptions: the Tears exist only from c. -3500 (the draconic weapon strike). The Rock of Bral has `founded: 1200` (Captain Bral). Glyth is `troubled` from c. 1267, when the current illithid colonies arrived ("about a century" before the 1367 sourcebook).
- Rock of Bral ruler dates are inferred, because the wiki gives centuries and reign lengths, not years: Bral c. 1200, Cozar c. 1290 ("end of the 13th century"), Frun c. 1310 (35-year reign), Calar's six days and Andru's accession c. 1345, before the Second Unhuman War (1360). The 5e era (Light of Xaryxis, Spelljammer Academy) is placed at c. 1492. The 5e books may relocate Bral to the Astral Sea, but the wiki pages read don't say so, so no `relocated` status was used.
- Sun, Karpri, Chandos and Garden have only 1–2 events. Their canon is mostly the 1367-era sourcebook snapshot, and I didn't invent dates. Toril's events (Time of Troubles, Spellplague, Second Sundering) are pointers to the Faerûn atlas. `sj-toril` carries `drill: "toril"`.
- Palette: all records share accent #4a6fa5 (star-blue) and ink #1c1f2b, and vary only `base` by body colour (sun amber, Karpri sapphire, Glyth dull grey, and so on).

## kara-tur

- Calendars: Shou Year = DR + 1250 (SY 2607 = 1357 DR). Wa Year = DR + 418 (WY 1803 = 1385 DR). Kozakuran Year = DR + 74 (KY 1459 = 1385 DR). These follow the Grand History convention the wiki uses. Each summary gives the original-calendar year in parentheses.
- Roster substitutions (the `kt-` prefix is kept):
  - `kt-kuo-meilan` → `kt-kuo-te-lung`. No Kuo Meilan exists on the wiki; Kuo Te' Lung is the Shou capital, though its wiki page is a stub, so Shou Lung and Hungtse Province pages fill it out.
  - `kt-xi-hu` → `kt-xi-hulang`, the actual Koryo capital.
  - `kt-celestial-sea` → `kt-dragonwall`. The Celestial Sea page is a two-line stub. The Dragonwall has dated history: breached in 1359 and destroyed by the Spellplague in 1385.
  - `scripts/roster.mjs` and `data/maps/kara-tur.json` still use the old ids and need updating.
- Post-1385 Kara-Tur is thin in canon. Shou Lung cities, Uwaji and Saikhoi are `troubled` from the Spellplague (or the 1360 undead conquest, for Saikhoi) to the present, because no recovery is attested. Dojyu recovers in 1479, when the Kozakuran civil war "faded" (KY 1553).
- Guessed spans: Saikhoi/Thakos is `ruined` -1943→-1000 (in ruins by -1377; the rebuild is undated). Wai is `troubled` 1116–1117 (assassination) and 1352–1375 (twin-heir strife, ending when a tenth emperor is on the throne). U'Chan Gompa's founding is -665, the first year of the -665 to -610 monastic exodus.
- Undated starts: Uwaji's status begins at 1245, when the capital moved there (the castle is older). Xi Hulang begins at the 1330s Sillan unification.
- Visual: the Dragonwall uses the `fortress` archetype as a long serpentine wall and should break into rubble from 1385. The Plain of Horses uses `landmark-desert` with plain terrain and yurts, because there is no grassland landmark archetype. Regional accent is #b23a2e (lacquer red).

## zakhara

- Al-Qadim describes a "present" of 1367 DR, so most Zakharan events can only be dated to then. Events marked as pinned say so in their summary ("Pinned to the 1367 DR present..."). Truly dated items: the Loregiver's scrolls c. 800, the genie rout at Huzuz on 12 Nau 1327, Khalil's accession in 1345 (infobox ruler year), Hiyal's sultan dying in 1362, Qudra's fleet failing at Hawa c. 1357, and the minaret scandal in 1366.
- Every city has `founded: null`. Except Hawa (1357, its first mention), city status timelines start at c. 800 DR, the unification under the first Grand Caliph. This is a placeholder so the cities don't all pop in at 1367. Muluk (pre-Enlightenment In'aash) and Huzuz (a village at 800) are clearly older.
- Umara's coup against its old caliph (which ended his planned war on Muluk) is put at 1366, "shortly before 1367". Umara is `troubled` 1366–1368 and Muluk 1366–1367. Hiyal is `troubled` 1362–1363 for the succession.
- No Spellplague or Sundering effects on Zakhara are recorded, so everything stays `thriving` after 1367.
- zk-afyal is the island kingdom: type `island`, archetype `jungle-city`. Its one city, Medina al-Afyal, is listed as an alias. Hawa uses `island-haven` (stilt town). Regional accent is #1c7c8c (turquoise tile).
