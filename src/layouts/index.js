import { atlas } from './atlas.js';
import { mapLayout } from './map.js';
import { chronicle } from './chronicle.js';
import { wheel } from './wheel.js';
import { orbit } from './orbit.js';

export const LAYOUTS = { atlas, map: mapLayout, chronicle, wheel, orbit };
export const LAYOUT_KEYS = ['atlas', 'map', 'chronicle', 'wheel', 'orbit'];
export const LAYOUT_TITLES = { atlas: 'Atlas', map: 'Map', chronicle: 'Chronicle', wheel: 'Wheel', orbit: 'Orbit' };
export { TILE, STEP, regionName } from './common.js';
