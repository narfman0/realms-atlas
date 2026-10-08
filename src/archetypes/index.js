// Archetype registry and the diorama factory: build(place) -> Diorama (a THREE.Group plus status machinery).
import * as THREE from 'three';
import * as K from '../kit/index.js';
import * as C from './common.js';

import harborMetropolis from './harbor-metropolis.js';
import walledCity from './walled-city.js';
import marketTown from './market-town.js';
import frontierTown from './frontier-town.js';
import fortress from './fortress.js';
import towerKeep from './tower-keep.js';
import elvenCity from './elven-city.js';
import dwarvenHold from './dwarven-hold.js';
import drowCity from './drow-city.js';
import underdarkCity from './underdark-city.js';
import ruin from './ruin.js';
import floatingEnclave from './floating-enclave.js';
import desertCity from './desert-city.js';
import wizardCity from './wizard-city.js';
import islandHaven from './island-haven.js';
import jungleCity from './jungle-city.js';
import libraryFortress from './library-fortress.js';
import landmarkMountain from './landmark-mountain.js';
import landmarkForest from './landmark-forest.js';
import landmarkDesert from './landmark-desert.js';
import landmarkSea from './landmark-sea.js';
import landmarkMonolith from './landmark-monolith.js';
import frozenTown from './frozen-town.js';
import ringCity from './ring-city.js';
import celestialBody from './celestial-body.js';

export const ARCHETYPES = {
  'harbor-metropolis': harborMetropolis,
  'walled-city': walledCity,
  'market-town': marketTown,
  'frontier-town': frontierTown,
  fortress,
  'tower-keep': towerKeep,
  'elven-city': elvenCity,
  'dwarven-hold': dwarvenHold,
  'drow-city': drowCity,
  'underdark-city': underdarkCity,
  ruin,
  'floating-enclave': floatingEnclave,
  'desert-city': desertCity,
  'wizard-city': wizardCity,
  'island-haven': islandHaven,
  'jungle-city': jungleCity,
  'library-fortress': libraryFortress,
  'landmark-mountain': landmarkMountain,
  'landmark-forest': landmarkForest,
  'landmark-desert': landmarkDesert,
  'landmark-sea': landmarkSea,
  'landmark-monolith': landmarkMonolith,
  'frozen-town': frozenTown,
  'ring-city': ringCity,
  'celestial-body': celestialBody,
  'asteroid-port': walledCity,
};

/**
 * Phase-2 looks are chosen by motif as much as by archetype (the data reuses the 23 archetypes and adds
 * motifs): a ring city, a world in space, or a rock adrift that carries the archetype's town on its back.
 */
function choose(place) {
  const m = new Set(place.visual?.motifs || []);
  const base = ARCHETYPES[place.archetype] || marketTown;
  if (place.archetype === 'ring-city' || m.has('ring-city')) return { compose: ringCity };
  if (place.archetype === 'celestial-body' || m.has('sphere') || m.has('gas-giant') || /crystal-shell/.test(place.id)) return { compose: celestialBody };
  const adrift = place.archetype === 'asteroid-port' || m.has('asteroid') || m.has('station')
    || (place.world === 'realmspace')
    || (place.world === 'planes' && m.has('floating') && place.archetype !== 'floating-enclave' && (place.type === 'landmark' || place.type === 'plane'));
  if (adrift) return { compose: base, adrift: true };
  return { compose: base };
}

/**
 * Build the diorama content for a place. Returns { group, ctx, site } where ctx.layers maps layer names to
 * arrays of groups (for the status system) and ctx.animators are per-frame update functions.
 */
export function build(place) {
  const mats = K.makeMaterialSet(place.visual?.palette?.ink || '#2b2420');
  const ctx = { mats, layers: {}, animators: [] };
  const S = new K.Site(place, ctx);
  const { compose, adrift } = choose(place);
  const R = 3.5;
  if (adrift) S.water.push((x, z) => Math.hypot(x, z) - R); // the rock's edge: nothing is built past it
  // a chasm is carved first so that nothing is built over the rift
  if (S.has('chasm') && compose !== ringCity && compose !== celestialBody) K.chasm(S, { x: S.r.range(-0.5, 0.5), z: S.r.range(0.9, 1.9), len: adrift ? 2.6 : 3.4, glow: S.any('lava', 'glow') || /abyss|baator|gehenna/.test(place.id) ? '#ff4a1a' : null });
  compose(S, K, C);
  let lift = 0;
  if (adrift) {
    const tip = K.floatTile(S, { R });
    lift = Math.max(1.6, K.BOTTOM_Y + 0.6 - tip);
    K.ruinOverlay(S);
  } else if (!S.noTile) {
    K.groundTile(S);
    K.ruinOverlay(S);
  }
  const built = S.b.build(ctx, 'diorama');
  for (const g of S.extra) built.add(g);
  let group = built;
  if (adrift) {
    // the rock floats over an orrery stand, bobbing; a few moonlets drift round it
    group = new THREE.Group();
    group.name = 'diorama';
    built.position.y = lift;
    group.add(built);
    const stand = new K.Site(place, ctx);
    K.orreryStand(stand, { top: lift + K.SEABED_Y - 2.0, r: 1.0 });
    const r = S.r.fork('moonlets');
    const nm = S.has('floating') || S.has('asteroid') ? 7 : 3;
    for (let i = 0; i < nm; i++) {
      const a = (i / nm) * Math.PI * 2 + r() * 0.5, d = r.range(R + 0.3, R + 1.1);
      stand.b.rock(r.range(0.14, 0.38), { x: Math.cos(a) * d, z: Math.sin(a) * d, y: lift + r.range(-1.2, 0.4), sy: 0.8, ry: r() * 6, color: S.pal.rock, layer: 'land' });
    }
    group.add(stand.b.build(ctx, 'stand'));
    const ph = S.r() * 6;
    S.animators.push((t) => { built.position.y = lift + Math.sin(t * 0.7 + ph) * 0.12; built.rotation.y = Math.sin(t * 0.05 + ph) * 0.15; });
    S.hitHeight = lift + 2.5;
  }
  ctx.animators = S.animators;
  ctx.floatGroup = S.floatGroup || null;
  ctx.hitHeight = S.hitHeight || 0;
  return { group, ctx, site: S };
}
