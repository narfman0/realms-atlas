// Layout result: { name, items: [{x, z, s, ry}], labels: [{text, sub, x, z, kind}], bounds: {x0, x1, z0, z1} }
export const TILE = 9.2;
export const GAP = 3.0;
export const STEP = TILE + GAP;

export const REGION_NAMES = {
  'sword-coast-north': 'Sword Coast North',
  'silver-marches': 'Silver Marches',
  underdark: 'Underdark',
  'western-heartlands': 'Western Heartlands',
  'heartlands-east': 'Cormyr & the Dales',
  'moonsea-and-north-east': 'Moonsea & North-East',
  'east-and-south': 'East & South',
};
export const REGION_ORDER = Object.keys(REGION_NAMES);
export const regionName = (r) => REGION_NAMES[r] || r.replace(/-/g, ' ');

export function boundsOf(items, pad = TILE) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const it of items) {
    const h = (TILE * it.s) / 2;
    x0 = Math.min(x0, it.x - h); x1 = Math.max(x1, it.x + h);
    z0 = Math.min(z0, it.z - h); z1 = Math.max(z1, it.z + h);
  }
  return { x0: x0 - pad * 0.2, x1: x1 + pad * 0.2, z0: z0 - pad * 0.2, z1: z1 + pad * 0.2 };
}
