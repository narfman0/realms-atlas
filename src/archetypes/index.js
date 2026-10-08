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
};

/**
 * Build the diorama content for a place. Returns { group, ctx, site } where ctx.layers maps layer names to
 * arrays of groups (for the status system) and ctx.animators are per-frame update functions.
 */
export function build(place) {
  const mats = K.makeMaterialSet(place.visual?.palette?.ink || '#2b2420');
  const ctx = { mats, layers: {}, animators: [] };
  const S = new K.Site(place, ctx);
  const compose = ARCHETYPES[place.archetype] || marketTown;
  compose(S, K, C);
  K.groundTile(S);
  K.ruinOverlay(S);
  const group = S.b.build(ctx, 'diorama');
  for (const g of S.extra) group.add(g);
  ctx.animators = S.animators;
  ctx.floatGroup = S.floatGroup || null;
  return { group, ctx, site: S };
}
