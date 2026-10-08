// Prototype geometries for instancing (shared by every diorama). Vertex colours carry the fixed shading
// (white = takes the instance colour fully); per-instance colour gives each house/tree its tint.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function painted(g, color) {
  g = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const merge = (...gs) => mergeGeometries(gs, false);

function gable() {
  const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  const e = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  e.translate(0, 0, -0.5);
  e.rotateY(Math.PI / 2);
  return e;
}

// unit house: 1 (x) × 0.8 (y) × 0.7 (z) body; roof on top. Two protos so walls and roofs tint separately.
const houseWall = painted(new THREE.BoxGeometry(1, 0.8, 0.7).translate(0, 0.4, 0), '#ffffff');
const houseRoof = painted(gable().scale(1.12, 0.55, 0.84).translate(0, 0.8, 0), '#ffffff');
const flatRoof = painted(new THREE.BoxGeometry(1.06, 0.08, 0.76).translate(0, 0.84, 0), '#ffffff');

const trunk = (h, r = 0.08) => painted(new THREE.CylinderGeometry(r * 0.7, r, h, 5).translate(0, h / 2, 0), '#6b5338');
const deciduous = merge(trunk(0.45), painted(new THREE.IcosahedronGeometry(0.42, 0).scale(1, 0.95, 1).translate(0, 0.72, 0), '#ffffff'));
const conifer = merge(trunk(0.25, 0.06),
  painted(new THREE.ConeGeometry(0.38, 0.6, 6).translate(0, 0.5, 0), '#ffffff'),
  painted(new THREE.ConeGeometry(0.29, 0.5, 6).translate(0, 0.85, 0), '#f2f2f2'),
  painted(new THREE.ConeGeometry(0.19, 0.4, 6).translate(0, 1.15, 0), '#e8e8e8'));
const giant = merge(painted(new THREE.CylinderGeometry(0.16, 0.3, 2.2, 7).translate(0, 1.1, 0), '#7a5b3c'),
  painted(new THREE.IcosahedronGeometry(0.85, 0).scale(1.2, 0.6, 1.2).translate(0, 2.2, 0), '#ffffff'),
  painted(new THREE.IcosahedronGeometry(0.6, 0).scale(1.1, 0.6, 1.1).translate(0.3, 2.65, -0.15), '#f0f0f0'));
const palm = merge(painted(new THREE.CylinderGeometry(0.04, 0.07, 1.1, 5).translate(0, 0.55, 0), '#8a6b45'),
  ...[0, 1, 2, 3, 4].map((i) => painted(new THREE.ConeGeometry(0.12, 0.7, 3).rotateZ(Math.PI / 2 + 0.5).translate(0.32, 1.05, 0).rotateY(i * 1.256), '#ffffff')));
const mushroom = merge(painted(new THREE.CylinderGeometry(0.1, 0.16, 1.0, 6).translate(0, 0.5, 0), '#d8cfc0'),
  painted(new THREE.SphereGeometry(0.55, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).translate(0, 0.95, 0), '#ffffff'));
const tent = painted(new THREE.ConeGeometry(0.4, 0.6, 6).translate(0, 0.3, 0), '#ffffff');
const stone = painted(new THREE.BoxGeometry(0.16, 0.3, 0.07).translate(0, 0.15, 0), '#ffffff');
const rubble = painted(new THREE.TetrahedronGeometry(0.22, 0).translate(0, 0.08, 0), '#ffffff');

export const PROTOS = {
  'house-wall': { geometry: houseWall },
  'house-roof': { geometry: houseRoof },
  'house-flat': { geometry: flatRoof },
  'tree-dec': { geometry: deciduous },
  'tree-con': { geometry: conifer },
  'tree-giant': { geometry: giant },
  'tree-palm': { geometry: palm },
  mushroom: { geometry: mushroom },
  tent: { geometry: tent },
  gravestone: { geometry: stone, castShadow: false },
  rubble: { geometry: rubble },
};
