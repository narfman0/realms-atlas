// Shared composition helpers for archetypes: terrain setup from `visual.terrain`/motifs, a generic city core,
// and `decorate()` which sprinkles the remaining motifs into free spots.
import * as K from '../kit/index.js';

const { HALF } = K;

/** city radius and house count from visual.scale */
export const cityRadius = (S) => 1.3 + S.scale * 0.48;
export const houseCount = (S) => Math.round(6 + S.scale * S.scale * 3.6);

/** shape the land: coasts, rivers, lakes, islands. `skip` = set of motifs the archetype handles itself */
export function setupTerrain(S, o = {}) {
  const t = S.terrain;
  if (o.coast ?? (t === 'coast' || (S.any('harbor') && t !== 'island' && t !== 'cavern'))) S.addCoast(o.coastSide || 'south', o.coastAt ?? (S.scale >= 4 ? 2.2 : 2.0), 0.35);
  if (o.island ?? (t === 'island')) S.addIsland(o.islandR ?? 3.2);
  if (o.river ?? (t === 'river' || S.has('river'))) {
    const ang = S.r.range(-0.5, 0.5);
    S.addRiver(ang, S.r.range(0.3, 0.9) * S.r.sign(), 0.36);
  }
  if (o.lake ?? S.has('lake')) S.addLake(S.r.sign() * 2.6, -2.4, 1.0);
  if (S.has('canal')) {
    S.addCanal(-3.5, 0.4, 3.5, 0.6, 0.16);
    S.addCanal(0.3, -3.2, 0.5, 3.8, 0.14);
  }
  if (t === 'swamp') {
    for (let i = 0; i < 4; i++) S.addLake(S.r.range(-3.5, 3.5), S.r.range(-3.5, 3.5), S.r.range(0.4, 0.8));
    S.noiseAmp = 0.04;
  }
  if (t === 'mountain' && o.hills !== false) { S.addHill(-2.8, -3.0, 2.2, 0.7); S.addHill(2.6, -3.2, 2.0, 0.6); }
  if (t === 'desert') S.noiseAmp = 0.12;
}

/** a generic town core: optional walls, houses, a keep/castle, towers and spires */
export function cityCore(S, o = {}) {
  const P = S.pal, r = S.r;
  const R = o.radius ?? cityRadius(S);
  const cx = o.cx ?? 0, cz = o.cz ?? (S.water.length && S.terrain === 'coast' ? -0.5 : 0);
  // centrepiece first so it gets its spot
  if (o.keep ?? S.any('keep', 'castle')) {
    const p = S.find(0.9, { cx: cx + (o.keepAt?.[0] ?? 0), cz: cz + (o.keepAt?.[1] ?? -R * 0.35), spread: 0.8, tries: 40 }) || [cx, cz - R * 0.3];
    K.keep(S, { x: p[0], z: p[1], w: 0.9 + S.scale * 0.12, d: 0.8 + S.scale * 0.1, h: 1.0 + S.scale * 0.22, ry: r.range(-0.2, 0.2), roof: S.has('castle') ? 'crenel' : 'pitched' });
    S.claim(p[0], p[1], 1.0);
  }
  if (o.temple ?? S.has('temple')) {
    const p = S.find(0.75, { cx, cz, spread: R * 0.6, tries: 40 });
    if (p) K.temple(S, { x: p[0], z: p[1], ry: r.range(-0.3, 0.3) });
  }
  if (o.domes ?? S.has('domes')) {
    const n = 1 + Math.floor(S.scale / 2);
    for (let i = 0; i < n; i++) {
      const p = S.find(0.6, { cx, cz, spread: R * 0.7, tries: 30 });
      if (p) K.domeHall(S, { x: p[0], z: p[1], r: r.range(0.4, 0.65), h: r.range(0.5, 0.9) });
    }
  }
  const nTowers = o.towers ?? (S.has('towers') ? 2 + S.scale : S.has('spires') ? 1 : 0);
  for (let i = 0; i < nTowers; i++) {
    const p = S.find(0.35, { cx, cz, spread: R * 0.85, tries: 30 });
    if (p) K.tower(S, { x: p[0], z: p[1], r: r.range(0.2, 0.32), h: r.range(1.2, 1.8) + S.scale * 0.25, shape: r.chance(0.7) ? 'round' : 'square', roof: o.towerRoof || r.pick(['cone', 'cone', 'crenel', 'spire']), banner: r.chance(0.3) });
  }
  const nSpires = o.spires ?? (S.has('spires') ? 1 + Math.floor(S.scale * 0.8) : 0);
  for (let i = 0; i < nSpires; i++) {
    const p = S.find(0.25, { cx, cz, spread: R * 0.7, tries: 30 });
    if (p) K.spire(S, { x: p[0], z: p[1], r: r.range(0.14, 0.22), h: r.range(2.2, 3.4) + S.scale * 0.3, glowTip: S.any('glow', 'mythal') });
  }
  if (o.walls ?? S.any('walls')) {
    K.walls(S, { cx, cz, rx: R + 0.35, rz: (R + 0.35) * r.range(0.8, 1), sides: o.wallSides ?? (6 + Math.min(4, S.scale)), rot: r.range(0, 1), h: 0.45 + S.scale * 0.08 });
  } else if (o.palisade ?? S.has('palisade')) {
    K.palisade(S, { cx, cz, r: R + 0.3 });
  }
  K.houses(S, { cx, cz, spread: R, n: o.houses ?? houseCount(S), flat: o.flat, snow: S.pal.snowy, roofs: o.roofs, walls: o.wallColors, zone: o.zone });
  return { cx, cz, R };
}

/** add remaining motifs into free space. `done` = motifs already handled. */
export function decorate(S, done = new Set(), o = {}) {
  const P = S.pal, r = S.r;
  const want = (m) => S.has(m) && !done.has(m);
  const wet = S.water.length > 0;
  if (wet && (want('ships') || want('harbor'))) K.ships(S, { n: Math.min(6, 1 + Math.ceil(S.scale * 0.9)) });
  if (wet && (want('docks') || want('harbor'))) K.docks(S, { n: 2 + Math.floor(S.scale / 2) });
  if (want('lighthouse') && wet) {
    for (let i = 0; i < 60; i++) {
      const x = r.range(-HALF + 0.6, HALF - 0.6), z = r.range(-HALF + 0.6, HALF - 0.6);
      const w = S.wetness(x, z);
      if (w > -0.35 && w < 0 && S.free(x, z, 0.4, { water: true })) { S.claim(x, z, 0.4); K.lighthouse(S, { x, z, h: 1.4 + S.scale * 0.15 }); break; }
    }
  }
  if (want('bridge') && S.riverAng !== undefined) {
    // span the river near the centre
    const a = S.riverAng, ca = Math.cos(a), sa = Math.sin(a);
    const u = r.range(-1.2, 1.2);
    for (let du = 0; du < 3; du++) {
      const uu = u + du * 0.7;
      let v1 = null, v2 = null;
      for (let v = -3; v <= 3; v += 0.05) {
        const x = uu * ca - v * sa, z = uu * sa + v * ca;
        const wet2 = S.wetness(x, z) > -0.05;
        if (wet2 && v1 === null) v1 = v - 0.25;
        if (!wet2 && v1 !== null && v2 === null) { v2 = v + 0.2; break; }
      }
      if (v1 !== null && v2 !== null) {
        K.bridge(S, { x1: uu * ca - v1 * sa, z1: uu * sa + v1 * ca, x2: uu * ca - v2 * sa, z2: uu * sa + v2 * ca });
        break;
      }
    }
  }
  if (want('windmill')) { const p = S.find(0.4, { tries: 40 }); if (p) K.windmill(S, { x: p[0], z: p[1] }); }
  if (want('farms')) K.farms(S, { n: 3 + S.scale, zone: (x, z) => Math.hypot(x, z) > cityRadius(S) * 0.8 });
  if (want('graveyard')) { const p = S.find(0.65, { tries: 40 }); if (p) K.graveyard(S, { x: p[0], z: p[1] }); }
  if (want('statue')) { const p = S.find(0.3, { spread: 2.5, tries: 40 }); if (p) K.statue(S, { x: p[0], z: p[1], h: 0.8 + S.scale * 0.15 }); }
  if (want('obelisk')) { const p = S.find(0.3, { spread: 3, tries: 40 }); if (p) K.obelisk(S, { x: p[0], z: p[1], h: 1.2 + S.scale * 0.2 }); }
  if (want('standing-stone')) { const p = S.find(0.5, { spread: 3, tries: 40 }); if (p) K.standingStone(S, { x: p[0], z: p[1], h: 1.0 }); }
  if (want('temple')) { const p = S.find(0.75, { tries: 40 }); if (p) K.temple(S, { x: p[0], z: p[1] }); }
  if (want('library')) { const p = S.find(0.7, { tries: 40 }); if (p) K.domeHall(S, { x: p[0], z: p[1], r: 0.55, h: 0.9, domeColor: P.trim }); }
  if (want('arena')) { const p = S.find(1.0, { tries: 40 }); if (p) K.arena(S, { x: p[0], z: p[1], r: 0.8 }); }
  if (want('pyramid')) { const p = S.find(1.0, { tries: 40 }); if (p) K.pyramid(S, { x: p[0], z: p[1], w: 1.5, h: 1.3 }); }
  if (want('ziggurat')) { const p = S.find(1.0, { tries: 40 }); if (p) K.pyramid(S, { x: p[0], z: p[1], w: 1.6, h: 1.2, steps: 4 }); }
  if (want('tents')) K.tents(S, { n: 6, spread: 3.2 });
  if (want('mines')) { const p = S.find(0.6, { tries: 40, zone: (x, z) => z < 0 }); if (p) K.mineEntrance(S, { x: p[0], z: p[1] }); }
  if (want('lava')) { const p = S.find(0.8, { tries: 40 }); if (p) K.lava(S, { x: p[0], z: p[1], r: 0.6 }); }
  if (want('ruins') || want('rubble')) {
    const p = S.find(0.8, { tries: 30, zone: (x, z) => Math.hypot(x, z) > 2 });
    if (p) { K.brokenTower(S, { x: p[0], z: p[1], r: 0.3, h: 0.6, layer: 'land' }); K.rubble(S, { cx: p[0], cz: p[1], spread: 0.7, n: 8, layer: 'land' }); }
  }
  if (want('mountain')) {
    const p = S.find(1.4, { tries: 40, zone: (x, z) => z < -1.5 }) || [r.range(-2.5, 2.5), -3.2];
    K.mountain(S, { x: p[0], z: p[1], r: 1.6, h: 1.8 + S.scale * 0.3 });
  }
  if (want('waterfall')) {
    const p = S.find(0.8, { tries: 40, zone: (x, z) => z < -1.5 }) || [r.range(-2, 2), -3.4];
    K.mountain(S, { x: p[0], z: p[1] - 0.3, r: 1.1, h: 1.8, salt: 3 });
    K.waterfall(S, { x: p[0], z: p[1] + 0.55, h: 1.2 });
  }
  if (want('gears')) K.gearworks(S, { n: 3 + Math.min(3, Math.floor(S.scale / 2)), cz: S.r.range(-1.2, 0.4) });
  if (want('chasm') && !S.pits.length) K.chasm(S, { x: S.r.range(-0.6, 0.6), z: S.r.range(0.8, 2.2), glow: S.any('lava', 'glow') || /abyss|baator|gehenna|carceri/.test(S.place.id) ? '#ff4a1a' : null });
  if (want('ice')) {
    S.pal.water = '#9fc4d4';
    if (S.water.length) K.iceFloes(S, { n: 8 + S.scale * 2 });
    else K.glacier(S);
  }
  if (want('glow') || want('faerie-fire')) K.glowPoints(S, { n: 8 + S.scale * 2, color: want('faerie-fire') ? '#c47aff' : P.glow, spread: 3 });
  if (want('mythal')) K.mythal(S, { r: 4.2, h: 4.2 });
  if (want('giant-trees')) K.trees(S, { n: 3 + S.scale, type: 'giant' });
  if (o.trees !== false) {
    const t = S.terrain;
    const type = t === 'tundra' || t === 'mountain' ? 'con' : t === 'jungle' || (t === 'coast' && S.place.region === 'east-and-south' && S.place.archetype === 'jungle-city') ? 'palm' : t === 'cavern' ? 'mushroom' : 'mixed';
    const n = o.treeCount ?? (want('trees') ? 22 : t === 'forest' ? 26 : t === 'desert' ? 2 : t === 'cavern' ? 0 : 10);
    if (n) K.trees(S, { n, type: t === 'desert' ? 'palm' : type, size: t === 'cavern' ? 0.8 : 1 });
  }
  if (S.terrain !== 'cavern' && S.terrain !== 'desert') K.boulders(S, { n: 3, size: 0.2 });
}
