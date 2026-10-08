// Landmark monolith: a single standing stone (or obelisk, or bridge) in a clearing, ringed by lesser stones.
export default function compose(S, K, C) {
  C.setupTerrain(S);
  S.flatten.push([0, 0, 1.6]);
  const isBridge = /bridge/.test(S.place.id) || (S.has('bridge') && S.riverAng !== undefined);
  if (isBridge) {
    S.motifs.add('bridge');
  } else if (S.has('obelisk') && !S.has('standing-stone')) {
    K.obelisk(S, { x: 0, z: 0, h: 2.6 });
    S.claim(0, 0, 1.0);
  } else {
    K.standingStone(S, { x: 0, z: 0, h: 2.0 + S.scale * 0.2, ring: 7 });
    S.claim(0, 0, 1.6);
    K.patch(S, { x: 0, z: 0, w: 2.8, d: 2.8, color: K.shade(S.pal.ground, 0.08) });
  }
  if (S.has('glow')) K.glowPoints(S, { n: 8, spread: 1.4, y0: 0.4, y1: 2.2 });
  C.decorate(S, new Set(['standing-stone', 'glow', isBridge ? '' : 'obelisk']), { treeCount: 26 });
}
