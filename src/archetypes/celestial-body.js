// Celestial body (Realmspace): a faceted world on a brass orrery stand. The look comes from motifs and the
// place's own palette: gas-giant (banded), sphere (earth / ocean / ice / desert / moon / cavern-rock), rings,
// floating (small isles circling), glow (a halo); the Sun is a glowing ball with a corona; the crystal shell
// is a curved wall of crystal with a portal.
import * as THREE from 'three';

function kindOf(S) {
  const p = S.place, id = p.id, m = S.motifs;
  if (/(^|-)sun$/.test(id) || (p.orbit && p.orbit.radius === 0)) return 'sun';
  if (m.has('gas-giant')) return 'gas';
  if (/selune|moon/.test(id) || p.type === 'moon') return 'moon';
  if (m.has('ice')) return p.archetype === 'landmark-sea' ? 'ocean' : 'ice';
  if (S.terrain === 'cavern' || p.archetype === 'underdark-city') return 'rock';
  if (p.archetype === 'landmark-sea' && !m.has('harbor')) return 'ocean';
  if (S.terrain === 'desert') return 'desert';
  if (p.archetype === 'landmark-sea' || m.has('harbor') || S.terrain === 'coast') return 'earth';
  if (S.terrain === 'plain' || S.terrain === 'mountain') return 'moon';
  return 'earth';
}

export function crystalShell(S, K) {
  S.noTile = true;
  const b = S.b;
  K.orreryStand(S, { top: -0.5, r: 1.6 });
  // a shard of the sphere's wall: part of a big sphere, faceted, pale
  const R = 9;
  const geo = new THREE.SphereGeometry(R, 9, 6, Math.PI / 2 - 0.42, 0.84, Math.PI / 2 - 0.42, 0.62);
  b.in('land');
  b.geo(geo, { z: -R - 0.8, y: 1.4, colorFn: (n, p) => ((Math.floor(p.x * 1.3) + Math.floor(p.y * 1.3)) % 3 === 0 ? '#e6f0fa' : (Math.floor(p.x * 1.3) + Math.floor(p.y * 1.3)) % 3 === 1 ? '#c6dbee' : '#a9c4de') });
  // crystals clustered at its foot, and a doorway of light (a portal through the shell)
  for (let i = 0; i < 14; i++) {
    const a = S.r.range(-1.2, 1.2), d = S.r.range(0.4, 2.6);
    b.oct(S.r.range(0.2, 0.5), { x: Math.sin(a) * d, z: -0.5 + Math.cos(a) * 0.6, y: -0.4 + S.r.range(0, 0.3), sy: S.r.range(1.6, 3), rz: S.r.range(-0.4, 0.4), color: S.r.pick(['#d8e8f6', '#b9d2ea', '#eef6fc']), layer: 'tall' });
  }
  b.torus(0.9, 0.08, { y: 1.6, z: -0.55, seg: 20, kind: 'glow', layer: 'glow', color: '#bfe0ff', glow: 2.4 });
  b.dome(0.85, { y: 1.6, z: -0.58, rx: -Math.PI / 2, kind: 'aura', layer: 'aura', color: '#9fd0ff', glow: 1.6 });
  K.glowPoints(S, { n: 18, color: '#f0e6c8', spread: 3.4, y0: -0.2, y1: 3.4, size: 0.05 });
  S.hitHeight = 4;
}

export default function compose(S, K) {
  if (/crystal-shell|crystal-sphere/.test(S.place.id)) return crystalShell(S, K);
  S.noTile = true;
  const P = S.pal, m = S.motifs;
  const kind = kindOf(S);
  const Rb = kind === 'sun' ? 3.1 : 1.15 + S.scale * 0.33;
  const cy = K.BOTTOM_Y + 0.5 + Rb + (kind === 'sun' ? 0.2 : 0.9);
  K.orreryStand(S, { top: cy - Rb * 0.6, r: kind === 'sun' ? 1.6 : 1.0 });
  const F = new K.Site(S.place, S.ctx);
  F.r = S.r.fork('body');
  F.pal = P;
  const b = F.b;
  K.sphereBody(b, { R: Rb, kind, pal: P, seed: S.seed % 97, snowCaps: m.has('snow') || m.has('ice'), detail: kind === 'sun' ? 2 : 3 });
  if (kind === 'sun') {
    // corona: flame tongues and a halo
    for (let i = 0; i < 26; i++) {
      const v = new THREE.Vector3(F.r() * 2 - 1, F.r() * 2 - 1, F.r() * 2 - 1).normalize();
      b.cone(0.28, F.r.range(0.5, 1.1), { x: v.x * Rb * 0.92, y: v.y * Rb * 0.92, z: v.z * Rb * 0.92, ...K.alignTo(v), seg: 4, kind: 'glow', layer: 'glow', color: F.r.pick(['#ffb347', '#ff8a2a', '#ffd27a']), glow: 2.2 });
    }
    b.sphere(Rb * 1.45, { seg: 16, kind: 'aura', layer: 'aura', color: '#ffbf6a', glow: 1.6 });
  } else {
    if (m.has('rings') || kind === 'gas') K.planetRing(b, { r0: Rb * 1.25, r1: Rb * (m.has('rings') ? 1.9 : 1.55), tilt: 0.42, color: kind === 'gas' ? K.mixHex('#d8c39a', P.base, 0.3) : K.mixHex('#b8b0c8', P.accent, 0.3) });
    const built = ['towers', 'domes', 'docks', 'harbor', 'castle', 'spires', 'walls', 'temple'].filter((x) => m.has(x)).length;
    if (built) K.sphereCity(b, { R: Rb, n: 4 + built * 3, r: F.r, spires: m.has('spires') || m.has('towers') ? 3 : 0, roof: P.accent, colors: [P.stone, P.plaster], glow: m.has('glow') ? P.glow : null });
    if (m.has('glow') || kind === 'moon') b.sphere(Rb * 1.18, { seg: 14, kind: 'aura', layer: 'aura', color: kind === 'moon' ? '#e8f0ff' : P.glow, glow: 1.2 });
    if (m.has('mountain')) {
      for (let i = 0; i < 5; i++) {
        const v = new THREE.Vector3(F.r() * 2 - 1, F.r() * 1.6 - 0.6, F.r() * 2 - 1).normalize();
        b.cone(Rb * 0.18, Rb * 0.22, { x: v.x * Rb * 0.95, y: v.y * Rb * 0.95, z: v.z * Rb * 0.95, ...K.alignTo(v), seg: 5, color: kind === 'moon' ? '#d6d4cc' : P.rock, layer: 'land' });
      }
    }
  }
  const g = b.build(S.ctx, 'body');
  g.position.y = cy;
  g.rotation.z = kind === 'sun' ? 0 : 0.35;
  S.extra.push(g);
  // floating isles (Coliar's earthmotes) or tumbling moonlets, circling on their own
  if (m.has('floating') || m.has('asteroid')) {
    const ob = new K.SubBuilder();
    ob.in('land');
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, d = Rb * F.r.range(1.45, 1.8);
      const x = Math.cos(a) * d, z = Math.sin(a) * d, y = F.r.range(-0.6, 0.6);
      ob.rock(F.r.range(0.18, 0.32), { x, y, z, sy: 0.6, ry: F.r() * 6, color: P.rock });
      if (m.has('floating')) ob.instance('tree-dec', { x, y: y + 0.1, z, s: 0.35, color: P.leaf });
    }
    const og = ob.build(S.ctx, 'motes');
    og.position.y = cy;
    S.extra.push(og);
    S.animate((t) => { og.rotation.y = t * 0.12; });
  }
  const spin = kind === 'gas' ? 0.08 : 0.04;
  S.animate((t) => { g.rotation.y = t * spin; });
  S.hitHeight = cy + Rb;
}
