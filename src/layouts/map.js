// Map: each diorama shrunk and set at its map.x/y on the parchment board. Near-coincident places (Waterdeep,
// Undermountain, Skullport…) are nudged apart by a small relaxation; a leader line keeps them tied to their
// true spot (drawn by the board).
import { TILE, boundsOf } from './common.js';

export const MAP_W = 300;
export const MAP_S = 0.66;

export function mapLayout(places, aspect = 1.45) {
  const W = MAP_W, H = MAP_W / aspect;
  const s = MAP_S;
  const minD = TILE * s * 1.16;
  const home = places.map((p) => [((p.map?.x ?? 0.5) - 0.5) * W, ((p.map?.y ?? 0.5) - 0.5) * H]);
  const pos = home.map(([x, z]) => [x, z]);
  // deterministic tiny jitter so identical points separate
  pos.forEach((p, i) => { p[0] += Math.sin(i * 12.9898) * 0.05; p[1] += Math.cos(i * 78.233) * 0.05; });
  for (let it = 0; it < 220; it++) {
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[j][0] - pos[i][0], dz = pos[j][1] - pos[i][1];
        const d = Math.hypot(dx, dz);
        if (d < minD && d > 1e-6) {
          const push = (minD - d) * 0.5;
          const ux = dx / d, uz = dz / d;
          pos[i][0] -= ux * push; pos[i][1] -= uz * push;
          pos[j][0] += ux * push; pos[j][1] += uz * push;
        }
      }
    }
    // weak spring home
    for (let i = 0; i < pos.length; i++) {
      pos[i][0] += (home[i][0] - pos[i][0]) * 0.02;
      pos[i][1] += (home[i][1] - pos[i][1]) * 0.02;
    }
  }
  const items = pos.map(([x, z]) => ({ x, z, s, ry: 0 }));
  // tour order: west → east sweeping in bands north → south
  const order = places.map((_, i) => i).sort((a, b) => {
    const ba = Math.floor((places[a].map?.y ?? 0.5) * 4), bb = Math.floor((places[b].map?.y ?? 0.5) * 4);
    return ba - bb || (ba % 2 ? -1 : 1) * ((places[a].map?.x ?? 0) - (places[b].map?.x ?? 0));
  });
  const b = { x0: -W / 2, x1: W / 2, z0: -H / 2, z1: H / 2 };
  return { name: 'map', items, labels: [], order, home, bounds: b, W, H };
}
