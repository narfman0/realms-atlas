import { atlas } from './atlas.js';
import { mapLayout } from './map.js';
import { chronicle } from './chronicle.js';
import { wheel } from './wheel.js';

export const LAYOUTS = { atlas, map: mapLayout, chronicle };
export const LAYOUT_KEYS = ['atlas', 'map', 'chronicle'];
export const LAYOUT_TITLES = { atlas: 'Atlas', map: 'Map', chronicle: 'Chronicle', wheel: 'Wheel' };
export { wheel };
export { TILE, STEP, regionName } from './common.js';
