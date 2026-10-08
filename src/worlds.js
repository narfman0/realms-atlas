// The worlds of the atlas (data/worlds.json via src/generated/places.json): which places belong to which
// board, and which layout is a world's own (Map for continents, Wheel for the Planes, Orbit for Realmspace).
import data from './generated/places.json';
import mapsData from './generated/maps.json';
import storiesData from './generated/stories.json';

export const ALL_PLACES = data.places;
const listed = data.worlds || [{ id: 'toril', name: 'Faerûn', kind: 'continent', layoutDefault: 'map', parent: null }];
/** worlds that have at least one place (an empty world would be an empty board) */
export const WORLDS = listed.filter((w) => w.id === 'toril' || ALL_PLACES.some((p) => (p.world || 'toril') === w.id));
export const WORLD_BY_ID = Object.fromEntries(WORLDS.map((w) => [w.id, w]));
export const PLACE_BY_ID = new Map(ALL_PLACES.map((p) => [p.id, p]));
export const MAPS = mapsData;
export const STORIES = (storiesData.stories || []).slice().sort((a, b) => a.year - b.year);

export const worldOf = (id) => PLACE_BY_ID.get(id)?.world || 'toril';
export const worldName = (w) => WORLD_BY_ID[w]?.name || w;
export const placesOf = (w) => ALL_PLACES.filter((p) => (p.world || 'toril') === w);

/** a world's own layout: map | wheel | orbit */
export function primaryLayout(w) {
  const d = WORLD_BY_ID[w]?.layoutDefault;
  return d === 'wheel' || d === 'orbit' ? d : 'map';
}
/** chart size for a world's Map layout: Faerûn is the big board; the others are smaller and more crowded */
export const mapOpts = (w) => (w === 'toril' ? { W: 300, s: 0.66 } : { W: 215, s: 1.2 });

/** stories touching a place (by placeIds) */
const byPlace = new Map();
for (const s of STORIES) for (const id of s.placeIds || []) { if (!byPlace.has(id)) byPlace.set(id, []); byPlace.get(id).push(s); }
export const storiesOf = (id) => byPlace.get(id) || [];
/** the world a tale opens in: that of its first place, else its worldId */
export const storyWorld = (s) => (s.placeIds?.length ? worldOf(s.placeIds[0]) : s.worldId || 'toril');
