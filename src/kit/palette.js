// Per-place palette, derived from visual.palette {base, accent, ink} and the terrain.
import * as THREE from 'three';

const T = {
  coast: { ground: '#cdbf8e', leaf: '#6f8a52', rock: '#9b9384' },
  plain: { ground: '#bfbd80', leaf: '#6d8a4c', rock: '#a09886' },
  forest: { ground: '#93a067', leaf: '#4f7343', rock: '#8f8a78' },
  mountain: { ground: '#aaa58f', leaf: '#5d7a4e', rock: '#8e877a' },
  desert: { ground: '#e0c287', leaf: '#8a9a52', rock: '#c09a68' },
  cavern: { ground: '#5b5664', leaf: '#7f6f9a', rock: '#4d4856' },
  island: { ground: '#c6c58c', leaf: '#5e8a4e', rock: '#958d7c' },
  swamp: { ground: '#86906a', leaf: '#4c6a3e', rock: '#77735f' },
  tundra: { ground: '#dfe3e4', leaf: '#4e6a58', rock: '#8d9298' },
  river: { ground: '#b6bb7e', leaf: '#628a4a', rock: '#9a9482' },
  jungle: { ground: '#7f9a5a', leaf: '#3f7a3a', rock: '#7d7a63' },
  void: { ground: '#6a6a7a', leaf: '#6f7a8a', rock: '#55525e' },
};

const c = (h) => new THREE.Color(h);
const hex = (col) => `#${col.getHexString()}`;
export const mixHex = (a, b, k) => hex(c(a).lerp(c(b), k));
export const shade = (a, k) => hex(k >= 0 ? c(a).lerp(c('#ffffff'), k) : c(a).lerp(c('#000000'), -k));

export function makePalette(place) {
  const v = place.visual || {};
  const p = v.palette || {};
  const base = p.base || '#d8c9a6';
  const accent = p.accent || '#2a4d69';
  const ink = p.ink || '#2b2420';
  const terrain = place.archetype === 'jungle-city' ? 'jungle' : v.terrain || 'plain';
  const t = T[terrain] || T.plain;
  const snowy = terrain === 'tundra' || (v.motifs || []).includes('snow');
  return {
    terrain,
    base, accent, ink,
    ground: mixHex(t.ground, base, 0.35),
    groundDark: shade(mixHex(t.ground, base, 0.3), -0.18),
    side: shade(mixHex(ink, base, 0.25), -0.05),
    stone: mixHex('#e9dfc9', base, 0.35),
    stoneDark: shade(mixHex('#bdb09a', base, 0.25), -0.08),
    plaster: mixHex('#f1e7d3', base, 0.2),
    roof: accent,
    roofAlt: mixHex(accent, '#8a4b2b', 0.45),
    trim: shade(accent, -0.35),
    wood: '#7a5a3c',
    leaf: t.leaf,
    leafDark: shade(t.leaf, -0.25),
    rock: mixHex(t.rock, base, 0.15),
    rockDark: shade(t.rock, -0.3),
    water: mixHex('#3b6f82', accent, 0.15),
    waterDeep: '#2b5568',
    sand: '#dcc79a',
    snow: '#f4f6f6',
    glow: shade(accent, 0.35),
    gold: '#d8ad4f',
    snowy,
  };
}
