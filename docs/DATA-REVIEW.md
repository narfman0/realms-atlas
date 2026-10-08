# Data review: fact-check pass

A cross-region consistency and accuracy pass over `data/places/*.json` and `data/timeline.json`.
Every claim was checked against Forgotten Realms Wiki wikitext pulled through the MediaWiki API
(`api.php?action=parse&prop=wikitext`), since WebFetch gets HTTP 402 and plain curl gets 403.

How it was checked:
- `scripts/check-consistency.mjs` (node built-ins only) pulls every (year, title keyword) pair from each
  place. It flags three things: status boundaries with no matching event, timeline events whose places
  never mention that year, and known world events dated differently in different files. Its remaining WARN
  lines are mostly a status period ending, or a world event touching a place without its own event entry.
  Those were reviewed and left as they are.
- For every place: `founded`/`foundedNote`, at least two events, and `ruler` were checked against the wiki.
- Descriptions and event summaries were tested for verbatim copying: every 6- and 8-word run was matched
  against the wikitext of all cited pages. Matches that were only proper names ("the League of the Silver
  Marches", "the Sea of Fallen Stars") were left. Copied sentences were rewritten.
- `node scripts/build-data.mjs --strict`: 0 rejected records before and after.

## Changes

| place | field | old → new | source |
|---|---|---|---|
| timeline | 1490 "Tomb of Annihilation: the death curse" year | 1490 → 1489 (the wiki gives only "between 1488 and 1492"; aligned with port-nyanzaru, omu and mezro, which already used 1489) | https://forgottenrealms.fandom.com/wiki/Death_curse , https://forgottenrealms.fandom.com/wiki/Tomb_of_Annihilation |
| timeline | 1385 Spellplague summary | "Halruaa is gutted, Lantan and Unther are exchanged with lands from Abeir…" → Halruaa, Lantan and Unther carried off to Abeir, Skuld buried, the sea drains, Evermeet withdraws to the Feywild (the wiki says Halruaa was shifted into Abeir, not gutted) | https://forgottenrealms.fandom.com/wiki/Halruaa , https://forgottenrealms.fandom.com/wiki/Unther , https://forgottenrealms.fandom.com/wiki/Lantan |
| timeline | 1385 Spellplague placeIds | added skuld, evermeet, mezro, cimbar, arrabar, luskan (every place whose status changes in 1385) | https://forgottenrealms.fandom.com/wiki/Spellplague |
| timeline | -339 Karsus's Folly summary | "Thultanthar alone escapes" → "Thultanthar escapes destruction" (the wiki counts it as the fourth surviving city) | https://forgottenrealms.fandom.com/wiki/Karsus%27s_Folly |
| timeline | 1261 Zhentarim summary | "creates the Black Network with Fzoul Chembryl…into Darkhold" → Fzoul joins in 1263, and the network takes Darkhold later | https://forgottenrealms.fandom.com/wiki/Zhentarim |
| timeline | 747 title + summary | "Zhentil Keep founded" → "Zhentil Keep fortified"; the summary now notes the trading camp from c. 640, which matches the place's founded = 640 | https://forgottenrealms.fandom.com/wiki/Zhentil_Keep |
| timeline | 1359 Tuigan Horde | added yearEnd 1360 (Yamun Khahan killed by Azoun IV in 1360) | https://forgottenrealms.fandom.com/wiki/Yamun_Khahan |
| timeline | 1482 Second Sundering | title "The Second Sundering begins" → "The Second Sundering"; added yearEnd 1487 (infobox date 1482–1487) | https://forgottenrealms.fandom.com/wiki/Second_Sundering |
| timeline | 1485 Rage of Demons | added yearEnd 1486 (demons summoned in 1485 and 1486) | https://forgottenrealms.fandom.com/wiki/Rage_of_Demons |
| timeline | 1373 Rage of Dragons placeIds | [] → [caer-callidyrr] (Hoondarrh burned Caer Callidyrr during the 1373 Dracorage) | https://forgottenrealms.fandom.com/wiki/Caer_Callidyrr |
| cimbar | founded, status[0].from | -526 → -474 ("500 years before Cormyr", and Cormyr dates from 26 DR, not -26) | https://forgottenrealms.fandom.com/wiki/Cimbar |
| cimbar | foundedNote | "(Cormyr dates from -26 DR), so c. -526 DR" → "(Cormyr dates from 26 DR), so c. -474 DR" | https://forgottenrealms.fandom.com/wiki/Cimbar |
| iriaebor | ruler | "Merchant oligarchy, an independent city-state (1480s)" → "Lord Bron with a forty-member merchant council (last recorded, 1360s); independent city-state in the late 15th century" | https://forgottenrealms.fandom.com/wiki/Iriaebor |
| iriaebor | description | copied phrase "a long ridge called the Tor above the north fork of the Chionthar" → "the Tor, a long ridge overlooking the Chionthar's northern branch" | https://forgottenrealms.fandom.com/wiki/Iriaebor |
| beregost | description | copied "A small town of about forty main buildings straddles the Coast Way halfway between Baldur's Gate and Amn" → "Some forty sizeable buildings line the Coast Way at the midpoint of the road from Baldur's Gate to Amn" | https://forgottenrealms.fandom.com/wiki/Beregost |
| boareskyr-bridge | description | copied "a statue of Cyric at one end and of Bhaal at the other…" and "to drink from the west side of the bridge" → paraphrased both sentences | https://forgottenrealms.fandom.com/wiki/Boareskyr_Bridge |
| westgate | events[Great Rain].year | 1487 → 1486 (the Great Rain runs autumn 1485 to late 1486) | https://forgottenrealms.fandom.com/wiki/Great_Rain |
| westgate | events[Great Rain].summary | "…revives the Night Masks." → "…in 1487 the vampire Kirenkirsalai revives the Night Masks." | https://forgottenrealms.fandom.com/wiki/History_of_Westgate |
| hillsfar | ruler | "First Lord Torin Nomerthal (late 15th c.)" → "First Lord Vuhm Yestral (1490)" (infobox ruler4, 1490; Torin is the 1479 ruler) | https://forgottenrealms.fandom.com/wiki/Hillsfar |
| phlan | ruler | "Lord Regent Ector Brahms of the Black Fist (c. 1489)" → none recorded after 1492; Vorgansharax held the city 1489–1492 after Brahms died in 1489 | https://forgottenrealms.fandom.com/wiki/Ector_Brahms , https://forgottenrealms.fandom.com/wiki/Vorgansharax |
| phlan | events[1489].summary | "…a Moonsea alliance retakes Valjevo Castle." → "…retakes Valjevo Castle by 1492." | https://forgottenrealms.fandom.com/wiki/Vorgansharax |
| melvaunt | ruler | added "(last attested 1373)" | https://forgottenrealms.fandom.com/wiki/Melvaunt |
| ravens-bluff | ruler | "…O'Kane (last attested)" → "…O'Kane (last attested 1372); by 1479 under Vesperin's Golden Lords in Calaunt" | https://forgottenrealms.fandom.com/wiki/Ravens_Bluff |
| cormanthor | events[1377].summary | copied "reclaims rule of Cormanthyr for the first time in seven centuries" → paraphrased | https://forgottenrealms.fandom.com/wiki/Cormanthor |
| tilverton | events[1372].summary | copied "a rift to the Plane of Shadow that devours Tilverton" → paraphrased | https://forgottenrealms.fandom.com/wiki/Tilverton |
| undermountain | status[1].to / status[2].from | 211 → 309 (Halaster becomes ruler of the Underhalls in 309; 211 is not on the wiki) | https://forgottenrealms.fandom.com/wiki/Undermountain |
| mithral-hall | events[0].year, status[0].to / status[1].from | 1104 → 1190 (c.). The wiki says the Hall fell "towards the end of the 1100s" and had 10,000 dwarves in 1183. 1104 is Felbarr's Battle of Many Arrows | https://forgottenrealms.fandom.com/wiki/Mithral_Hall |
| mithral-hall | events[0].summary | date caveat rewritten to match the wiki wording | https://forgottenrealms.fandom.com/wiki/Mithral_Hall |
| gauntlgrym | events[1462].summary | "…Bruenor reseals Maegera but dies of his wounds." → "…Sylora Salm and the Ashmadai are turned back, but Bruenor and Pwent are fatally wounded." (the wiki has no resealing in 1462) | https://forgottenrealms.fandom.com/wiki/Gauntlgrym |
| high-forest | sources | added Morgwais (the ruler is not named on the High Forest page) | https://forgottenrealms.fandom.com/wiki/Morgwais |

## Could not verify

- **Estimated years (no wiki date; kept, already listed in DATA-NOTES):**
  - Mithral Hall's fall, now c. 1190; Mezro's return in 1489; Skullport's revival in 1480.
  - Phandalin's first resettlement in 1370; the Vesperin union (Ravens Bluff) in 1450.
  - Omu's 1280, 1370 and 1450; Araumycos and Zuggtmoy's wedding in 1486; "950 Galath's raids" (wiki: "the 900s").
  - Placeholder foundings: Baldur's Gate, Berdusk, Iriaebor, Elturel, Bryn Shander, Phandalin, Triboar, Yartar, Melvaunt, Tantras, High Horn.
- **Death curse:** the wiki gives only 1488–1492. 1489 is a convention, now applied everywhere.
- **Undermountain:** Halaster's 1485 return is speculation on the wiki ("the 1480s").
- **Evereska:** the Feywild event is 1385 here, but the wiki sentence says 1384.
- **Mantol-Derith:** "1373 Trade Resumes" is inferred, and "1486 Out of the Abyss" rests only on an appearances list.
- **Blingdenstone:** "1486 Reclaiming" rests on an adventure title. Its 1487 switch to thriving and Sundabar's 1486 switch to troubled are the data agents' own calls.
- **Immilmar, 934 Gauros:** confirmed only on the wiki's "934 DR" year page, not the place page.
- **Rulers that are the last ones attested, not confirmed for the 1490s:** Procampur (Rendeth, 1372), Helgabal (1479), Westgate (Bleth, 1479–1487), Selgaunt (Uskevren), Melvaunt (1373), Ravens Bluff (1372), Beregost (1368–72), Berdusk (1370s), Iriaebor (Bron, 1360s), Mezro (Osaw I, 1372). Calimport and Memnon: no ruler named after 1489.
- **Phlan:** the event title "Tears of Virulence" is really the name of the loyalist Black Fist faction. The year is right, so the title was not changed.
- **DATA-NOTES.md** still says "Cimbar c. -526" and "Mithral Hall c. 1104". This pass did not edit it; the data files are now authoritative.
- **Remaining checker warnings:**
  - Status boundaries that end a troubled period with no event of their own.
  - Timeline places that take part in a world event without listing it, for example Suzail and the Tuigan, or Evereska and the shades.
  - All were reviewed and are consistent with the wiki.

## Roster candidates to drop

- **Mantol-Derith** is the weakest record. It has no founding date, its status starts at 1372, the wiki dates only one of its events, and the other two are inferred. Drop it, or keep it with its events marked approximate.
- **Thin but defensible (keep):** Boareskyr Bridge, Citadel of the Raven, Castle Perilous, Longsaddle, Spine of the World and Omu. Each rests on one fairly short page, but every claim in them was confirmed.
