// Ring city (Sigil, the City of Doors): a torus of dark stone hanging in the air, its city built on the top
// and inner faces, bladed spikes round the outside rim, lanterns, and the tip of the Spire rising beneath it
// into the hole. No ground tile: the ring floats (on the Wheel it sits atop the Spire's needle).
import * as THREE from 'three';

export default function compose(S, K) {
  const P = S.pal, r = S.r;
  S.noTile = true;
  const F = new K.Site(S.place, S.ctx);
  F.r = r.fork('ring');
  F.pal = P;
  const R = 2.9, tube = 1.05, sy = 0.62, Y = 1.55;
  const stone = K.mixHex('#5d5650', P.base, 0.25), stoneDark = K.shade(stone, -0.25);
  const b = F.b;
  b.in('land');
  // the torus: flat-shaded, a little squashed so its top is a broad street
  b.geo(new THREE.TorusGeometry(R, tube, 7, 30).rotateX(Math.PI / 2).scale(1, sy, 1), { y: Y, colorFn: (n) => (n.y > 0.5 ? K.shade(stone, 0.12) : n.y < -0.3 ? stoneDark : stone) });
  // the city: houses on the top and the inner slope, packed tight, rooftops rust and slate
  const roofs = [K.mixHex('#7a3a2a', P.accent, 0.3), '#4c4652', K.mixHex('#6a5a4a', P.base, 0.2)];
  const walls = [K.mixHex('#b7a88e', P.base, 0.3), K.mixHex('#9a8c78', P.base, 0.2), '#8a8078'];
  const N = 70 + S.scale * 12;
  const surf = (a, phi) => {
    const rr = R + tube * Math.cos(phi);
    return new THREE.Vector3(Math.cos(a) * rr, tube * Math.sin(phi) * sy, Math.sin(a) * rr);
  };
  const norm = (a, phi) => new THREE.Vector3(Math.cos(phi) * Math.cos(a) * sy, Math.sin(phi), Math.cos(phi) * Math.sin(a) * sy).normalize();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 * 3.7 + F.r() * 0.3;
    const phi = F.r.range(0.25, 2.6); // from the outer top over to the inner side
    const p = surf(a, phi), n = norm(a, phi);
    const o = { x: p.x, y: p.y + Y - 0.02, z: p.z, ...K.alignTo(n, F.r() * 6) };
    const s = F.r.range(0.24, 0.4), hk = F.r.range(0.9, 1.7);
    b.push(o);
    b.instance('house-wall', { sx: s, sy: s * hk, sz: s, color: F.r.pick(walls), layer: 'low' });
    b.instance('house-roof', { s, y: 0.8 * s * (hk - 1), color: F.r.pick(roofs), layer: 'low' });
    b.pop();
  }
  // spires and towers on the top
  const nSp = 6 + S.scale * 2;
  for (let i = 0; i < nSp; i++) {
    const a = (i / nSp) * Math.PI * 2 + F.r() * 0.4, phi = F.r.range(1.2, 1.9);
    const p = surf(a, phi);
    K.spire(F, { x: p.x, z: p.z, y: p.y + Y - 0.05, r: F.r.range(0.08, 0.14), h: F.r.range(0.9, 1.7), color: K.shade(stone, 0.2), tipColor: roofs[0], glowTip: S.has('glow') && F.r.chance(0.4), glowColor: '#ffcf7a' });
  }
  // the blades: on the outer rim, pointing outwards and a little down
  b.in('tall');
  const blades = 30;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    const phi = F.r.range(-0.5, 0.25);
    const p = surf(a, phi), n = norm(a, phi);
    b.cone(0.07, F.r.range(0.5, 0.9), { x: p.x, y: p.y + Y, z: p.z, ...K.alignTo(n), seg: 3, color: '#3a3438' });
  }
  // portals: a few arches of light on the inner face (the city of doors)
  const doors = S.has('gate') ? 7 : 4;
  for (let i = 0; i < doors; i++) {
    const a = F.r() * Math.PI * 2, p = surf(a, Math.PI * 0.92), n = norm(a, Math.PI * 0.92);
    b.torus(0.16, 0.025, { x: p.x, y: p.y + Y + 0.1, z: p.z, ry: -a + Math.PI / 2, arc: Math.PI, seg: 8, kind: 'glow', layer: 'glow', color: '#ffcf7a', glow: 2.6 });
    void n;
  }
  // lantern light on the inner face
  for (let i = 0; i < 26; i++) {
    const a = F.r() * Math.PI * 2, phi = F.r.range(1.4, 2.8), p = surf(a, phi);
    b.oct(0.045, { x: p.x, y: p.y + Y + 0.12, z: p.z, kind: 'glow', layer: 'glow', color: '#ffbf6a', glow: 3 });
  }
  const g = b.build(S.ctx, 'ring');
  for (const e of F.extra) g.add(e);
  S.animators.push(...F.animators);
  S.extra.push(g);
  S.towers.push(...F.towers);
  // the tip of the Spire, rising under the ring into its hole (lighter: it fades to nothing at the top)
  S.b.in('base');
  S.b.cone(0.5, Y + 0.9 - K.BOTTOM_Y, { y: K.BOTTOM_Y, seg: 7, color: '#8d806c' });
  S.b.cyl(1.0, 1.25, 0.18, { y: K.BOTTOM_Y, seg: 7, color: '#6e6456' });
  // a slow turn, as if seen from a passing cart
  const ph = r() * 6;
  S.animate((t) => { g.rotation.y = ph + t * 0.02; });
  S.hitHeight = Y + tube + 0.6;
}
