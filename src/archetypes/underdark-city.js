// Underdark (non-drow) city: a cavern of squat stone houses, fungus forests, a black lake or lava, lantern glow.
export default function compose(S, K, C) {
  const P = S.pal;
  S.pal.ground = K.mixHex('#59535f', P.base, 0.2);
  S.pal.groundDark = K.shade(S.pal.ground, -0.2);
  S.pal.rock = '#6e6876';
  S.pal.water = '#2c4a55';
  const wet = S.any('docks', 'ships', 'lake', 'river');
  C.setupTerrain(S, { hills: false, coast: false, lake: false, river: S.has('river') });
  if (wet && !S.has('river')) S.addLake(0.8, 2.5, 1.6);
  K.cavern(S, { h: 4.0, stalactites: 16, stalagmites: 5 });
  if (S.has('keep')) K.keep(S, { x: -0.8, z: -0.9, w: 0.9, d: 0.8, h: 1.0, roof: 'crenel', color: '#6e6874', banner: false });
  C.cityCore(S, { radius: 1.3 + S.scale * 0.35, cz: -0.2, flat: true, keep: false, walls: S.has('walls'), towers: S.has('towers') ? 2 : 0, wallColors: ['#77707c', '#6a6470', '#827a86'], roofs: ['#4c4652'] });
  K.trees(S, { n: 8, type: 'mushroom', size: 1.2, colors: ['#9b7fc7', '#c08bb0', '#7fa6b5'] });
  K.glowPoints(S, { n: 10, color: '#ffbf6a', spread: 2.6, y0: 0.3, y1: 1.2, size: 0.06 });
  C.decorate(S, new Set(['cavern', 'stalactites', 'keep', 'walls', 'towers', 'glow']), { treeCount: 0 });
}
