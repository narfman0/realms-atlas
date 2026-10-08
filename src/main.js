// Realms Atlas — boot, render loop, layouts, camera, time, and the glue between the 3D board and the UI.
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Diorama } from './diorama.js';
import { shared } from './kit/materials.js';
import { LAYOUTS, LAYOUT_KEYS, LAYOUT_TITLES } from './layouts/index.js';
import { orbitAt } from './layouts/orbit.js';
import { makeFloor, makeFrame, makeMapBoard, makeWheelBoard, makeOrbitBoard, makeLeaders, FLOOR_Y } from './board.js';
import { EVENTS, YEAR_MIN, YEAR_MAX, PRESENT, yearToTrack, trackToYear, stateAt, fmtYear, eraOf } from './time.js';
import { ALL_PLACES, WORLDS, WORLD_BY_ID, PLACE_BY_ID, MAPS, STORIES, worldOf, worldName, placesOf, primaryLayout, mapOpts, storiesOf, storyWorld } from './worlds.js';
import { createScrubber } from './ui/scrubber.js';
import { createPanel } from './ui/panel.js';
import { createContents, createSearch, createHelp } from './ui/overlays.js';
import { createLabels } from './ui/labels.js';
import { createTale, createStories } from './ui/tale.js';
import { $, $$, esc, STATE_LABEL } from './ui/dom.js';
import { createPost } from './post.js';

const params = new URLSearchParams(location.search);
const SOLO = params.get('solo');
const SHOT = params.has('shot'); // deterministic screenshot mode: no idle motion, no loading fade
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
// the world to open: the solo place's, the deep-linked place's, ?world=, else Faerûn
const hashId = decodeURIComponent(location.hash.slice(1));
const startWorld = SOLO ? worldOf(SOLO) : PLACE_BY_ID.has(hashId) ? worldOf(hashId) : WORLD_BY_ID[params.get('world')] ? params.get('world') : 'toril';
// per-world state (built on first visit, then kept; only the active world is in the scene)
const WORLD_STATE = new Map();
let world = startWorld;
let PLACES = SOLO ? ALL_PLACES.filter((p) => p.id === SOLO) : placesOf(world);
if (SOLO && !PLACES.length) PLACES = [ALL_PLACES[0]];

/* ================================================================ RENDERER == */
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: SHOT });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
stage.append(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.5, 4000);
camera.position.set(0, 160, 200);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minPolarAngle = 0.12;
controls.maxPolarAngle = 1.32;
controls.minDistance = 4;
controls.maxDistance = 700;
controls.screenSpacePanning = false;
controls.zoomToCursor = true;

/* =================================================================== MOOD == */
const hemi = new THREE.HemisphereLight('#fff4dc', '#7a6440', 1.15);
const sun = new THREE.DirectionalLight('#ffe8c4', 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 3;
scene.add(hemi, sun, sun.target);
// night: a warm lantern pool over whatever the camera looks at (a soft vignette on the board and parchment)
const lantern = new THREE.SpotLight('#ffb766', 0, 0, 0.5, 0.95, 0);
lantern.castShadow = false;
scene.add(lantern, lantern.target);
const MOODS = {
  day: { bg: '#d9ccae', fog: '#d9ccae', hemiSky: '#fff4dc', hemiGround: '#7a6440', hemiI: 1.15, sun: '#ffe8c4', sunI: 2.5, floor: '#d6c8a8', exposure: 1.05, sunDir: [-0.55, 1, 0.42] },
  night: { bg: '#0d1626', fog: '#0d1626', hemiSky: '#8aa2dc', hemiGround: '#2a2a3a', hemiI: 0.7, sun: '#b4c6ff', sunI: 0.9, floor: '#1a2538', exposure: 1.0, sunDir: [0.6, 0.85, -0.25] },
};
const floor = makeFloor();
scene.add(floor);
scene.background = new THREE.Color(MOODS.day.bg);
scene.fog = new THREE.Fog(MOODS.day.fog, 200, 900);
const _ca = new THREE.Color(), _cb = new THREE.Color();
const sunDir = new THREE.Vector3();
function applyMood(k) {
  const A = MOODS.day, B = MOODS.night;
  const mix = (a, b, out) => out.copy(_ca.set(a)).lerp(_cb.set(b), k);
  mix(A.bg, B.bg, scene.background);
  mix(A.fog, B.fog, scene.fog.color);
  mix(A.hemiSky, B.hemiSky, hemi.color);
  mix(A.hemiGround, B.hemiGround, hemi.groundColor);
  hemi.intensity = A.hemiI + (B.hemiI - A.hemiI) * k;
  mix(A.sun, B.sun, sun.color);
  sun.intensity = A.sunI + (B.sunI - A.sunI) * k;
  mix(A.floor, B.floor, floor.material.color);
  if (mapBoard) mix('#ffffff', '#7d89a6', mapBoard.children[1].material.color);
  renderer.toneMappingExposure = A.exposure + (B.exposure - A.exposure) * k;
  sunDir.set(...A.sunDir).lerp(_v1.set(...B.sunDir), k).normalize();
  shared.night.value = k;
  lantern.intensity = 2.6 * k;
  lantern.visible = k > 0.01;
  shadowDirty = true;
}

/* ================================================================== STATE == */
/** the layouts a world offers: Atlas, its own (Map | Wheel | Orbit), Chronicle */
const layoutsOf = (w) => ['atlas', primaryLayout(w), 'chronicle'];
function layoutFor(w, want) {
  if (want === 'map' || want === 'wheel' || want === 'orbit') return primaryLayout(w);
  return layoutsOf(w).includes(want) ? want : w === 'toril' ? 'atlas' : primaryLayout(w);
}
const state = {
  layout: layoutFor(startWorld, LAYOUT_KEYS.includes(params.get('layout')) ? params.get('layout') : startWorld === 'toril' ? 'atlas' : primaryLayout(startWorld)),
  year: clampYear(parseInt(params.get('year') ?? PRESENT, 10)),
  focus: -1,
  hover: -1,
  night: params.get('night') === '1',
  nightK: 0,
  bloom: params.get('bloom') === '1' ? true : params.get('bloom') === '0' ? false : null, // null = auto (on at night)
  hideUI: params.get('ui') === '0',
  playing: false,
  track: 0,
  mode: 'board', // board | focus | solo
  narration: readNarration(),
  switching: false,
};
function readNarration() { try { const v = localStorage.getItem('realms-atlas.narration'); return v == null ? true : v === '1'; } catch { return true; } }
// audio may only start after the reader has done something on the page (browsers block it otherwise)
let gestured = false;
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { gestured = true; }, { capture: true, once: false });
const canSpeak = () => gestured || navigator.userActivation?.hasBeenActive === true;
function clampYear(y) { return Number.isFinite(y) ? Math.max(YEAR_MIN, Math.min(YEAR_MAX, y)) : PRESENT; }
let shadowDirty = true;
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

/* ================================================================ BOARD ==== */
const frame = makeFrame();
if (!SOLO) scene.add(frame);
let boardGroup = new THREE.Group(); // the active world's dioramas
scene.add(boardGroup);
let mapBoard = null; // the active world's own board (parchment chart / Outlands wheel / orrery plate)
let leaders = null;
let mapData = MAPS[world] || MAPS.toril;
let mapK = 0; // 0..1 board visibility

/* ============================================================= DIORAMAS ==== */
let dioramas = [];
let hitBoxes = [];
/** build (once) everything a world needs; progress(i, n, name) reports while building */
async function buildWorld(w, places, progress) {
  if (WORLD_STATE.has(w)) return WORLD_STATE.get(w);
  const W = { id: w, places, dioramas: [], hitBoxes: [], group: new THREE.Group(), labels: null, labelRoot: null, board: null, leaders: null, layout: null };
  let last = performance.now();
  for (let i = 0; i < places.length; i++) {
    const d = new Diorama(places[i], i);
    d.setYear(state.year, false);
    W.dioramas.push(d);
    W.hitBoxes.push(d.hit);
    W.group.add(d.root);
    if (performance.now() - last > 40) {
      progress?.(i + 1, places.length, places[i].name);
      await new Promise((r) => requestAnimationFrame(r));
      last = performance.now();
    }
  }
  progress?.(places.length, places.length, '');
  if (!SOLO) {
    const prim = primaryLayout(w);
    const map = MAPS[w] || MAPS.toril;
    if (prim === 'wheel') W.board = makeWheelBoard(LAYOUTS.wheel(places));
    else if (prim === 'orbit') W.board = makeOrbitBoard(LAYOUTS.orbit(places));
    else W.board = makeMapBoard(map, places, { ...mapOpts(w), title: worldName(w) });
    W.leaders = makeLeaders(places.length);
    W.labelRoot = document.createElement('div');
    W.labelRoot.className = 'world-labels';
    $('#labels').append(W.labelRoot);
  } else W.labelRoot = $('#labels');
  W.labels = createLabels(W.labelRoot, W.dioramas, {
    onClick: (i) => focusPlace(i), onHover: (i) => setHover(i),
    storiesOf, onStory: (s) => tale.open(s), drillName: worldName,
  });
  W.dioramas.forEach((d, i) => W.labels.setState(i, d.state));
  WORLD_STATE.set(w, W);
  return W;
}
/** make a built world the active one (scene, references, labels) */
function activate(W) {
  const prev = WORLD_STATE.get(world);
  if (prev && prev !== W) {
    scene.remove(prev.group);
    if (prev.board) { scene.remove(prev.board); prev.board.userData.set(0); }
    if (prev.leaders) scene.remove(prev.leaders);
    if (prev.labelRoot && !SOLO) prev.labelRoot.hidden = true;
    if (state.hover >= 0 && prev.dioramas[state.hover]) prev.dioramas[state.hover].hover = 0;
  }
  scene.remove(boardGroup);
  world = W.id;
  PLACES = W.places;
  dioramas = W.dioramas;
  hitBoxes = W.hitBoxes;
  boardGroup = W.group;
  labels = W.labels;
  mapBoard = W.board;
  leaders = W.leaders;
  mapData = MAPS[world] || MAPS.toril;
  scene.add(boardGroup);
  if (mapBoard) scene.add(mapBoard);
  if (leaders) scene.add(leaders);
  if (W.labelRoot) W.labelRoot.hidden = false;
  state.hover = -1;
  mapK = 0;
  mapBoard?.userData.set(0);
  if (leaders) { leaders.material.opacity = 0; leaders.visible = false; }
  frame.material.opacity = 0.55;
  applyMood(state.nightK);
  requestAnimationFrame(() => labels.measure());
  updateWorldUI();
}

/* ============================================================== LAYOUTS ==== */
let L = null; // current layout result
const tween = { t0: -10, dur: 1.6 };
let lay = []; // per diorama: {fx,fz,fy,fs,tx,tz,ty,ts,delay}
function computeLayout(name) {
  return name === 'map' ? LAYOUTS.map(PLACES, mapData.aspect, mapOpts(world)) : LAYOUTS[name](PLACES);
}
const isOwnLayout = () => state.layout === primaryLayout(world);
function setLayout(name, { animate = true, fly = true } = {}) {
  if (SOLO) return;
  name = layoutFor(world, name);
  if (REDUCED) animate = false;
  state.layout = name;
  L = computeLayout(name);
  const now = clock.elapsedTime;
  const rank = new Array(PLACES.length);
  L.order.forEach((i, k) => { rank[i] = k; });
  if (name === 'orbit') orbitAt(L, orbitT);
  lay = [];
  dioramas.forEach((d, i) => {
    const it = L.items[i];
    const r = d.root;
    lay[i] = { fx: r.position.x, fz: r.position.z, fy: d.layoutY || 0, fs: r.scale.x, tx: it.x, tz: it.z, ty: it.y || 0, ts: it.s, delay: animate ? (rank[i] / PLACES.length) * 0.7 : 0 };
    if (!animate) placeAt(d, it.x, it.z, it.s, 0, it.y || 0);
  });
  tween.t0 = animate ? now : -10;
  labels.setCaptions(L.labels.map((c) => ({ ...c, active: true })));
  frame.setBounds(L.bounds, 3);
  if (name === 'map' && leaders) leaders.userData.update(L.home, L.items);
  document.body.dataset.layout = name === primaryLayout(world) ? 'own' : name;
  if (!animate) {
    // snap the board in (no fade) when the layout is set without animation
    mapK = isOwnLayout() && mapBoard ? 1 : 0;
    mapBoard?.userData.set(mapK);
    if (leaders) { leaders.material.opacity = name === 'map' ? mapK * 0.6 : 0; leaders.visible = name === 'map' && mapK > 0.01; }
    frame.material.opacity = (1 - mapK) * 0.55;
  }
  $$('#layouts button').forEach((b) => b.classList.toggle('on', b.dataset.layout === name));
  updateURL();
  if (fly) {
    if (state.mode === 'focus' && state.focus >= 0) setTimeout(() => focusPlace(state.focus, { keepPanel: true }), animate ? 900 : 0);
    else overview({ dur: animate ? 2.2 : 0 });
  }
  shadowDirty = true;
}
function placeAt(d, x, z, s, lift, y = 0) {
  d.root.position.set(x, FLOOR_Y - (-0.9) * s + lift + y, z);
  d.root.scale.setScalar(s);
  d.layoutY = y;
}
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function stepLayout(t) {
  const el = t - tween.t0;
  if (el > tween.dur + 0.8) return false;
  for (let i = 0; i < dioramas.length; i++) {
    const p = lay[i];
    const k = Math.min(1, Math.max(0, (el - p.delay) / tween.dur));
    const e = easeIO(k);
    const lift = Math.sin(Math.PI * k) * 3.5 * Math.max(p.fs, p.ts);
    placeAt(dioramas[i], p.fx + (p.tx - p.fx) * e, p.fz + (p.tz - p.fz) * e, p.fs + (p.ts - p.fs) * e, lift, p.fy + (p.ty - p.fy) * e);
  }
  return true;
}
// Orbit: the bodies drift slowly round the sun (not while a place is in focus, in screenshots, or with
// reduced motion). orbitT is the orrery's own clock.
let orbitT = 0;
function stepOrbit(dt, t) {
  if (state.layout !== 'orbit' || !L || L.name !== 'orbit' || SHOT || REDUCED) return false;
  if (state.mode !== 'board' || t - tween.t0 < tween.dur + 0.8 || flight.active) return false;
  orbitT += dt;
  orbitAt(L, orbitT);
  for (let i = 0; i < dioramas.length; i++) { const it = L.items[i]; if (it.orbit?.w) placeAt(dioramas[i], it.x, it.z, it.s, 0, it.y || 0); }
  return true;
}
const scaleOf = (i) => dioramas[i].root.scale.x;
const MINOR = new Set(['town', 'fortress', 'landmark']);
const isMinor = (i) => world === 'toril' && MINOR.has(PLACES[i].type);
let mapLabelDist = 200; // in the Map layout, minor labels hide beyond this camera distance

/* =============================================================== CAMERA ==== */
const flight = { active: false, t0: 0, dur: 1, p0: new THREE.Vector3(), p1: new THREE.Vector3(), q0: new THREE.Vector3(), q1: new THREE.Vector3() };
function flyTo(pos, target, dur = 1.8) {
  if (REDUCED) dur = 0;
  if (dur <= 0) {
    camera.position.copy(pos); controls.target.copy(target); controls.update(); flight.active = false; return;
  }
  flight.p0.copy(camera.position); flight.q0.copy(controls.target);
  flight.p1.copy(pos); flight.q1.copy(target);
  flight.t0 = clock.elapsedTime; flight.dur = dur; flight.active = true;
}
function stepFlight(t) {
  if (!flight.active) return;
  const k = Math.min(1, (t - flight.t0) / flight.dur);
  const e = easeIO(k);
  camera.position.lerpVectors(flight.p0, flight.p1, e);
  // arc up a little mid-flight
  camera.position.y += Math.sin(Math.PI * k) * flight.p0.distanceTo(flight.p1) * 0.12;
  controls.target.lerpVectors(flight.q0, flight.q1, e);
  if (k >= 1) flight.active = false;
  shadowDirty = true;
}
const fitCam = new THREE.PerspectiveCamera();
const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
function overviewPose(bounds, polar) {
  const cx = (bounds.x0 + bounds.x1) / 2, cz = (bounds.z0 + bounds.z1) / 2;
  // screen rect left free by the UI (title/tabs above, scrubber below), in NDC
  const top = 1 - (2 * 74) / innerHeight, bottom = -1 + (2 * 140) / innerHeight;
  const xs = [bounds.x0, bounds.x1], zs = [bounds.z0, bounds.z1];
  let k = 0;
  for (const x of xs) for (const z of zs) for (const y of [FLOOR_Y, FLOOR_Y + (bounds.top ?? 3)]) corners[k++].set(x, y, z);
  fitCam.copy(camera);
  const target = new THREE.Vector3(cx, FLOOR_Y, cz);
  const pos = new THREE.Vector3();
  const place = (dist, shiftZ) => {
    target.set(cx, FLOOR_Y, cz + shiftZ);
    pos.set(cx, FLOOR_Y + Math.cos(polar) * dist, cz + shiftZ + Math.sin(polar) * dist);
    fitCam.position.copy(pos); fitCam.lookAt(target); fitCam.updateMatrixWorld(); fitCam.updateProjectionMatrix();
    let minY = Infinity, maxY = -Infinity, maxX = 0;
    for (const c of corners) if (_v2.copy(c).applyMatrix4(fitCam.matrixWorldInverse).z > -1) return { minY: NaN, maxY: NaN, maxX: 9 };
    for (const c of corners) { _v1.copy(c).project(fitCam); minY = Math.min(minY, _v1.y); maxY = Math.max(maxY, _v1.y); maxX = Math.max(maxX, Math.abs(_v1.x)); }
    return { minY, maxY, maxX };
  };
  let shift = 0, hi = 2000;
  for (let pass = 0; pass < 3; pass++) {
    let lo = 5; hi = 2000;
    for (let it = 0; it < 32; it++) {
      const mid = (lo + hi) / 2;
      const r = place(mid, shift);
      const fits = Number.isFinite(r.minY) && r.maxX < 0.97 && r.maxY < 1 && r.minY > -1.5 && r.maxY - r.minY < top - bottom;
      if (fits) hi = mid; else lo = mid;
    }
    // re-centre the board in the free band between the title bar and the scrubber
    for (let it = 0; it < 12; it++) {
      const r = place(hi, shift);
      const err = (r.minY + r.maxY) / 2 - (top + bottom) / 2;
      shift -= err * hi * 0.35;
    }
  }
  place(hi, shift);
  return { pos: pos.clone(), target: target.clone() };
}
function overview({ dur = 2.0 } = {}) {
  if (!L) return;
  const polar = { map: 0.62, wheel: 0.72, orbit: 0.6, chronicle: 0.82 }[state.layout] ?? 0.86;
  const { pos, target } = overviewPose(L.bounds, polar);
  mapLabelDist = pos.distanceTo(target) * 0.62;
  flyTo(pos, target, dur);
}
function focusPose(i) {
  const d = dioramas[i];
  const s = L ? L.items[i].s : d.root.scale.x;
  const c = _v1.set(L ? L.items[i].x : d.root.position.x, FLOOR_Y + 1.2 * s + 0.9 * s + (L?.items[i].y || 0), L ? L.items[i].z : d.root.position.z);
  // keep the current azimuth roughly, but swing towards the south (front of the tiles)
  const off = _v2.copy(camera.position).sub(controls.target);
  let az = Math.atan2(off.x, off.z);
  az = Math.max(-0.7, Math.min(0.7, az * 0.6));
  const polar = 0.98;
  const dist = 25 * s;
  const pos = new THREE.Vector3(c.x + Math.sin(az) * Math.sin(polar) * dist, c.y + Math.cos(polar) * dist, c.z + Math.cos(az) * Math.sin(polar) * dist);
  const target = c.clone();
  // shift so the diorama sits left of the panel
  if (innerWidth > 760) {
    const right = _v3.set(Math.cos(az), 0, -Math.sin(az));
    const shift = dist * 0.2;
    pos.addScaledVector(right, shift); target.addScaledVector(right, shift);
  } else { pos.y -= dist * 0.15; target.y -= dist * 0.25; }
  return { pos, target };
}
function focusPlace(i, { keepPanel = false, dur = 1.8, fromTour = false } = {}) {
  if (i < 0 || i >= dioramas.length) return;
  if (!fromTour) stopTour();
  if (L?.name === 'orbit') { const it = L.items[i]; placeAt(dioramas[i], it.x, it.z, it.s, 0, it.y || 0); }
  state.focus = i;
  state.mode = 'focus';
  const { pos, target } = focusPose(i);
  flyTo(pos, target, dur);
  panel.render(PLACES[i], state.year);
  void keepPanel;
  updateURL();
}
/** visit a place by id in whatever world it lives (switching boards if need be) */
async function goPlace(id, opts = {}) {
  const w = worldOf(id);
  if (!PLACE_BY_ID.has(id)) return;
  if (w !== world) await switchWorld(w);
  const i = PLACES.findIndex((p) => p.id === id);
  if (i >= 0) focusPlace(i, opts);
}
function closeFocus() {
  stopTour();
  state.focus = -1;
  state.mode = 'board';
  panel.hide();
  overview({ dur: 1.6 });
  updateURL();
}
function step(delta) {
  if (!L) return;
  const order = L.order;
  const k = state.focus >= 0 ? order.indexOf(state.focus) : -1;
  const n = order.length;
  const next = order[(((k < 0 ? (delta > 0 ? -1 : 0) : k) + delta) % n + n) % n];
  focusPlace(next);
}

/* ================================================================= TIME ==== */
const pulsed = new Set();
function setYear(y, { animate = true, src = 'ui' } = {}) {
  y = clampYear(Math.round(y));
  const changedYear = y !== state.year;
  state.year = y;
  if (src !== 'play') state.track = yearToTrack(y);
  const now = clock.elapsedTime;
  for (let i = 0; i < dioramas.length; i++) {
    if (dioramas[i].setYear(y, animate, now)) shadowDirty = true;
    labels.setState(i, dioramas[i].state);
  }
  scrubber.set(y);
  $('#now-year').textContent = fmtYear(y);
  $('#now-era').textContent = eraOf(y).name;
  if (changedYear) {
    refreshPanelSoon();
    updateURLSoon();
    if (!$('#contents').hidden) contents.render(y);
  }
}
let panelTimer = 0;
function refreshPanelSoon() {
  if (panelTimer) return;
  panelTimer = setTimeout(() => { panelTimer = 0; panel.refresh(state.year); }, 140);
}
function pulsePlaces(ids) {
  for (const d of dioramas) if (ids.includes(d.place.id)) d.pulse = 1;
}
const placeName = (id) => PLACE_BY_ID.get(id)?.name || id;
let toastTimer = 0;
function toast(html, ms = 5200) {
  const t = $('#toast');
  t.innerHTML = html;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
function jumpToEvent(ev, i) {
  stopPlay();
  setYear(ev.year);
  scrubber.hot(i);
  pulsePlaces(ev.placeIds || []);
  const names = (ev.placeIds || []).filter((id) => PLACE_BY_ID.has(id)).map((id) => `${placeName(id)}${worldOf(id) !== world ? ` (${worldName(worldOf(id))})` : ''}`);
  toast(`<i>${esc(fmtYear(ev.year))}${ev.yearEnd ? ` – ${esc(fmtYear(ev.yearEnd))}` : ''}</i><b>${esc(ev.title)}</b>${ev.summary ? `<br><span style="font-size:15px">${esc(ev.summary)}</span>` : ''}${names.length ? `<br><span style="font-size:14px;font-style:italic">${esc(names.join(' · '))}</span>` : ''}`, 7000);
}
function stepEvent(dir) {
  const y = state.year;
  let idx = -1;
  if (dir > 0) idx = EVENTS.findIndex((e) => e.year > y);
  else for (let k = EVENTS.length - 1; k >= 0; k--) if (EVENTS[k].year < y) { idx = k; break; }
  if (idx >= 0) jumpToEvent(EVENTS[idx], idx);
}
function togglePlay() {
  if (state.playing) return stopPlay();
  state.playing = true;
  if (state.year >= YEAR_MAX - 1) { state.track = 0; setYear(YEAR_MIN, { src: 'play' }); }
  else state.track = yearToTrack(state.year);
  scrubber.setPlaying(true);
}
function stopPlay() { state.playing = false; scrubber.setPlaying(false); }
const PLAY_SECONDS = 48; // the whole axis
function stepPlay(dt) {
  if (!state.playing) return;
  state.track = Math.min(1, state.track + dt / PLAY_SECONDS);
  const y = trackToYear(state.track);
  if (y !== state.year) setYear(y, { src: 'play' });
  // pulse places touched by world events as the handle passes them
  for (let i = 0; i < EVENTS.length; i++) {
    const ev = EVENTS[i];
    if (ev.year === y && !pulsed.has(i)) { pulsed.add(i); pulsePlaces(ev.placeIds || []); scrubber.hot(i); }
  }
  if (state.track >= 1) { stopPlay(); pulsed.clear(); }
}

/* ================================================================= TOUR ==== */
const tour = { active: false, i: 0, timer: 0, told: new Set() };
function startTour() {
  if (!L) return;
  tour.active = true;
  tour.told.clear();
  $('#btn-tour').classList.add('on');
  const k = state.focus >= 0 ? L.order.indexOf(state.focus) : -1;
  tour.i = k >= 0 ? k : 0;
  tourGo();
}
function tourGo() {
  if (!tour.active) return;
  const i = L.order[tour.i % L.order.length];
  const p = PLACES[i];
  clearTimeout(tour.timer);
  const next = () => { if (!tour.active) return; tour.i++; tourGo(); };
  // a tale whose first place this is: the tour pauses at its year and tells it (if narration is on)
  const st = storiesOf(p.id).find((s) => s.placeIds[0] === p.id && !tour.told.has(s.id));
  if (st) {
    tour.told.add(st.id);
    stopPlay();
    setYear(st.year);
    pulsePlaces(st.placeIds);
    scrubber.hotTale(st.id);
    focusPlace(i, { fromTour: true, dur: 2.4 });
    if (state.narration) {
      tale.play(st, { fly: false, end: () => { tour.timer = setTimeout(next, 1500); } });
      return;
    }
    tale.open(st);
    tour.timer = setTimeout(next, Math.max(9000, st.text.length * 30));
    return;
  }
  focusPlace(i, { fromTour: true, dur: 2.4 });
  const dwell = Math.max(7000, (p.description || '').length * 42);
  tour.timer = setTimeout(next, dwell);
}
function stopTour() {
  if (!tour.active) return;
  tour.active = false;
  clearTimeout(tour.timer);
  $('#btn-tour').classList.remove('on');
  if (tale.playing) tale.stop();
}

/* ================================================================ WORLDS ==== */
const veil = $('#veil');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** swap the board for another world: fade out, build (first visit) and activate, re-frame, fade in */
async function switchWorld(w, { layout } = {}) {
  if (SOLO || !WORLD_BY_ID[w] || state.switching) return;
  if (w === world && !layout) return;
  state.switching = true;
  stopTour();
  stopPlay();
  const fade = !SHOT && !REDUCED;
  if (fade) { veil.hidden = false; requestAnimationFrame(() => veil.classList.add('on')); await wait(360); }
  if (state.mode === 'focus') { state.focus = -1; state.mode = 'board'; panel.hide(); }
  const prevLayout = state.layout;
  const msg = $('#veil-msg');
  const W = await buildWorld(w, placesOf(w), (i, n, name) => { msg.textContent = name ? `Raising ${name}…` : ''; });
  msg.textContent = '';
  activate(W);
  for (let i = 0; i < dioramas.length; i++) { dioramas[i].setYear(state.year, false); labels.setState(i, dioramas[i].state); }
  const want = layout || (prevLayout === 'atlas' || prevLayout === 'chronicle' ? prevLayout : primaryLayout(w));
  setLayout(want, { animate: false, fly: false });
  // snap the board in under the veil
  const mk = isOwnLayout() ? 1 : 0;
  mapK = mk; mapBoard?.userData.set(mk);
  if (leaders) { leaders.material.opacity = mk * 0.6; leaders.visible = mk > 0.01 && state.layout === 'map'; }
  frame.material.opacity = (1 - mk) * 0.55;
  const { pos, target } = overviewPose(L.bounds, { map: 0.62, wheel: 0.72, orbit: 0.6, chronicle: 0.82 }[state.layout] ?? 0.86);
  camera.position.copy(pos).sub(target).multiplyScalar(fade ? 1.18 : 1).add(target);
  controls.target.copy(target); controls.update();
  overview({ dur: fade ? 1.6 : 0 });
  shadowDirty = true;
  updateURL();
  if (fade) { veil.classList.remove('on'); setTimeout(() => { veil.hidden = true; }, 420); }
  state.switching = false;
}
function stepWorld(dir) {
  const k = WORLDS.findIndex((x) => x.id === world);
  switchWorld(WORLDS[(k + dir + WORLDS.length) % WORLDS.length].id);
}
async function drill(w, from) {
  await switchWorld(w);
  // land on the same place's counterpart when there is one (Bryn Shander → tt-bryn-shander)
  const twin = from && PLACES.findIndex((p) => p.id.replace(/^[a-z]{2}-/, '') === from.id.replace(/^[a-z]{2}-/, '') && p.id !== from.id);
  if (twin >= 0) setTimeout(() => focusPlace(twin), REDUCED ? 0 : 900);
}
function updateWorldUI() {
  $$('#worlds button').forEach((b) => b.classList.toggle('on', b.dataset.world === world));
  const own = primaryLayout(world);
  const b2 = $('#layouts button[data-slot="2"]');
  if (b2) {
    b2.dataset.layout = own;
    b2.innerHTML = `<i>II</i> ${LAYOUT_TITLES[own]}`;
    b2.title = `${LAYOUT_TITLES[own]} — ${own === 'map' ? `on the chart of ${worldName(world)}` : own === 'wheel' ? 'the Outlands and the Great Wheel' : 'the orrery of Realmspace'} (2)`;
  }
  const W = WORLD_BY_ID[world];
  $('#cartouche .sub').textContent = world === 'toril' ? 'a cabinet of Faerûn, through the reckoning of the Dales'
    : W?.kind === 'planar' ? 'the Planes, from the City of Doors to the Great Wheel'
      : W?.kind === 'space' ? 'Realmspace: the crystal sphere around Toril'
        : W?.parent ? `${W.name}, within ${worldName(W.parent)}` : `a cabinet of ${W?.name || world}, by the reckoning of the Dales`;
  document.body.dataset.world = world;
}

/* ============================================================= NARRATION ==== */
function setNarration(on) {
  state.narration = on;
  try { localStorage.setItem('realms-atlas.narration', on ? '1' : '0'); } catch { /* private mode */ }
  const b = $('#btn-narration');
  b.classList.toggle('on', on);
  b.textContent = on ? 'Narration' : 'Narration off';
  b.title = `Narration ${on ? 'on' : 'off'}: tales are read aloud on the tour (R)`;
  if (!on && tale.playing && tour.active) tale.stop();
}
/** a tale begins: the year jumps to it, the camera flies to its first place, the others pulse */
async function tellTale(s) {
  stopPlay();
  setYear(s.year);
  scrubber.hotTale(s.id);
  const first = s.placeIds?.[0];
  if (first && PLACE_BY_ID.has(first)) {
    if (worldOf(first) !== world) await switchWorld(worldOf(first));
    const i = PLACES.findIndex((p) => p.id === first);
    if (i >= 0) focusPlace(i, { fromTour: tour.active, dur: 2.2 });
    setTimeout(() => pulsePlaces(s.placeIds), 400);
  } else if (storyWorld(s) !== world) await switchWorld(storyWorld(s));
}

/* ================================================================= NIGHT ==== */
function setNight(on) {
  state.night = on;
  document.body.classList.toggle('night', on);
  $('#btn-night').classList.toggle('on', on);
  updateBloom();
  updateURL();
}
function bloomOn() { return state.bloom ?? state.night; }
function updateBloom() { $('#btn-bloom').classList.toggle('on', bloomOn()); }

/* ==================================================================== URL ==== */
let urlTimer = 0;
function updateURLSoon() { clearTimeout(urlTimer); urlTimer = setTimeout(updateURL, 350); }
function updateURL() {
  if (SOLO || SHOT) return;
  const q = new URLSearchParams();
  const hasFocus = state.focus >= 0;
  if (world !== 'toril' && !hasFocus) q.set('world', world);
  const defLayout = world === 'toril' ? 'atlas' : primaryLayout(world);
  if (state.layout !== defLayout) q.set('layout', state.layout);
  if (state.year !== PRESENT) q.set('year', String(state.year));
  if (state.night) q.set('night', '1');
  const hash = state.focus >= 0 ? `#${PLACES[state.focus].id}` : '';
  const s = q.toString();
  history.replaceState(null, '', `${location.pathname}${s ? `?${s}` : ''}${hash}`);
}
function focusFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return false;
  if (!PLACE_BY_ID.has(id)) return false;
  if (worldOf(id) !== world) { goPlace(id); return true; }
  const i = PLACES.findIndex((p) => p.id === id);
  if (i >= 0) { focusPlace(i); return true; }
  return false;
}

/* ===================================================================== UI ==== */
const tale = createTale($('#tale'), {
  worldName, placeName, canSpeak,
  onPlay: (s) => tellTale(s),
  onPlace: (id) => goPlace(id),
  onClose: () => scrubber.hotTale(null),
});
const stories = createStories($('#stories'), { stories: STORIES, worldName, placeName, onPick: (s) => tale.play(s) });
const scrubber = createScrubber($('#scrubber'), {
  onYear: (y) => { stopPlay(); setYear(y); },
  onEvent: (ev, i) => jumpToEvent(ev, i),
  onPlay: () => togglePlay(),
  stories: STORIES,
  onStory: (s) => { tale.open(s); scrubber.hotTale(s.id); },
});
const panel = createPanel($('#panel'), {
  onYear: (y) => { stopPlay(); setYear(y); if (state.focus >= 0) dioramas[state.focus].pulse = 0.8; },
  onPrev: () => step(-1), onNext: () => step(1), onClose: () => closeFocus(),
  onDrill: (w, from) => drill(w, from), worldName, storiesOf, onStory: (s) => tale.open(s),
});
const contents = createContents($('#contents'), { places: ALL_PLACES, worlds: WORLDS, current: () => world, onPick: (id) => { $('#contents').hidden = true; goPlace(id); } });
const search = createSearch($('#search'), $('#search-input'), $('#search-results'), { places: ALL_PLACES, worldName, current: () => world, onPick: (id) => goPlace(id) });
const help = createHelp($('#help'));
let labels = { setCaptions() {}, setState() {}, update() {}, measure() {} };

// the world switcher
const worldsNav = $('#worlds');
for (const w of WORLDS) {
  const b = document.createElement('button');
  b.dataset.world = w.id;
  b.textContent = w.id === 'planes' ? 'Planes' : w.name;
  b.title = `${w.name}${w.parent ? ` (within ${worldName(w.parent)})` : ''} — ${WORLD_STATE.size ? '' : ''}${placesOf(w.id).length} places`;
  b.addEventListener('click', () => switchWorld(w.id));
  worldsNav.append(b);
}
worldsNav.hidden = WORLDS.length < 2;

$$('#layouts button').forEach((b) => b.addEventListener('click', () => setLayout(b.dataset.layout)));
$('#btn-narration').addEventListener('click', () => setNarration(!state.narration));
$('#btn-tour').addEventListener('click', () => (tour.active ? stopTour() : startTour()));
$('#btn-contents').addEventListener('click', () => contents.toggle(state.year));
$('#btn-search').addEventListener('click', () => search.open());
$('#btn-night').addEventListener('click', () => setNight(!state.night));
$('#btn-bloom').addEventListener('click', () => { state.bloom = !bloomOn(); updateBloom(); });
$('#btn-help').addEventListener('click', () => help.toggle());

addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  const overlayOpen = !$('#contents').hidden || !$('#help').hidden || !$('#stories').hidden;
  if (k === 'Escape') {
    if (overlayOpen) { $('#contents').hidden = true; $('#help').hidden = true; $('#stories').hidden = true; return; }
    if (tale.story) { tale.close(); return; }
    if (tour.active) { stopTour(); return; }
    if (state.mode === 'focus') closeFocus(); else overview();
    return;
  }
  if (k !== 't' && k !== 'T' && tour.active && ['ArrowLeft', 'ArrowRight'].includes(k)) stopTour();
  switch (k) {
    case 'ArrowRight': step(1); break;
    case 'ArrowLeft': step(-1); break;
    case '1': setLayout('atlas'); break;
    case '2': setLayout(primaryLayout(world)); break;
    case '3': setLayout('chronicle'); break;
    case 'w': stepWorld(1); break;
    case 'W': stepWorld(-1); break;
    case 'Enter': { const p = state.focus >= 0 ? PLACES[state.focus] : null; if (p?.drill) drill(p.drill, p); else return; break; }
    case 's': case 'S': stories.toggle(); break;
    case 'p': case 'P': if (tale.story) tale.toggle(); else return; break;
    case 'r': case 'R': setNarration(!state.narration); break;
    case 't': case 'T': tour.active ? stopTour() : startTour(); break;
    case 'n': case 'N': setNight(!state.night); break;
    case 'b': case 'B': state.bloom = !bloomOn(); updateBloom(); break;
    case 'h': case 'H': state.hideUI = !state.hideUI; document.body.classList.toggle('hide-ui', state.hideUI); break;
    case 'c': case 'C': contents.toggle(state.year); break;
    case '/': e.preventDefault(); search.open(); break;
    case '?': help.toggle(); break;
    case ' ': e.preventDefault(); togglePlay(); break;
    case '[': stepEvent(-1); break;
    case ']': stepEvent(1); break;
    default: return;
  }
});
addEventListener('hashchange', () => { if (!focusFromHash() && !location.hash && state.mode === 'focus') closeFocus(); });

/* ================================================================ PICKING ==== */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pointer = null;
let downAt = null;
function pick(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(hitBoxes, false);
  for (const hit of hits) {
    const d = hit.object.userData.diorama;
    if (d && d.pivot.visible) return d.index;
  }
  for (const hit of hits) { const d = hit.object.userData.diorama; if (d) return d.index; }
  return -1;
}
const tooltip = $('#tooltip');
function setHover(i, x, y) {
  if (i !== state.hover) {
    if (state.hover >= 0) dioramas[state.hover].hover = 0;
    state.hover = i;
    if (i >= 0) dioramas[i].hover = 1;
    renderer.domElement.style.cursor = i >= 0 ? 'pointer' : '';
  }
  if (i >= 0 && x != null) {
    const p = PLACES[i];
    const st = stateAt(p, state.year);
    const tales = storiesOf(p.id);
    tooltip.innerHTML = `<b>${esc(p.name)}</b><span>${esc(STATE_LABEL[st])} · ${esc(fmtYear(state.year))}</span>${p.drill ? `<em>⤓ Enter ${esc(worldName(p.drill))} — double-click</em>` : ''}${tales.length ? `<em class="t">${tales.length > 1 ? `${tales.length} tales` : 'a tale'}: ${esc(tales[0].title)}</em>` : ''}`;
    tooltip.style.transform = `translate(${Math.min(innerWidth - 220, x + 14)}px, ${y + 14}px)`;
    tooltip.hidden = false;
  } else tooltip.hidden = true;
}
renderer.domElement.addEventListener('pointermove', (e) => { pointer = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerleave', () => { pointer = null; setHover(-1); });
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  if (moved < 6 && performance.now() - downAt.t < 600) {
    const i = pick(e.clientX, e.clientY);
    if (i >= 0) focusPlace(i);
    else if (state.mode === 'focus') closeFocus();
  }
  downAt = null;
});
renderer.domElement.addEventListener('dblclick', (e) => {
  const i = pick(e.clientX, e.clientY);
  if (i >= 0 && PLACES[i].drill) drill(PLACES[i].drill, PLACES[i]);
});
controls.addEventListener('start', () => { flight.active = false; stopTour(); });
controls.addEventListener('change', () => { shadowDirty = true; });

/* ================================================================= RESIZE ==== */
function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  post?.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);

/* ================================================================== LOOP ==== */
const clock = new THREE.Clock();
let post = null;
const frustum = new THREE.Frustum();
const projView = new THREE.Matrix4();
const sphere = new THREE.Sphere();
let frameN = 0;
const perf = { acc: 0, n: 0, fps: 60 };

function updateSun() {
  // the shadow camera follows what the user looks at; its size follows the camera distance
  const dist = camera.position.distanceTo(controls.target);
  const half = Math.min(260, Math.max(14, dist * 0.62));
  const cam = sun.shadow.camera;
  if (Math.abs(cam.right - half) > half * 0.08) {
    cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half;
    cam.near = 1; cam.far = half * 4 + 80;
    cam.updateProjectionMatrix();
    shadowDirty = true;
  }
  sun.target.position.copy(controls.target);
  if (lantern.visible) { lantern.target.position.copy(controls.target); lantern.position.copy(controls.target); lantern.position.y += dist * 0.9; }
  sun.position.copy(controls.target).addScaledVector(sunDir, half * 1.8 + 30);
  const near = Math.min(4, Math.max(0.3, dist * 0.012));
  if (Math.abs(camera.near - near) > near * 0.2) { camera.near = near; camera.updateProjectionMatrix(); }
  scene.fog.near = dist * 1.1;
  scene.fog.far = dist * 3.6 + 200;
}

function frame_() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  shared.time.value = t;
  // night tween
  const nk = state.night ? 1 : 0;
  if (Math.abs(state.nightK - nk) > 0.001) { state.nightK += (nk - state.nightK) * Math.min(1, dt * 3); applyMood(state.nightK); }
  // map parchment tween
  const mk = isOwnLayout() && !SOLO && mapBoard ? 1 : 0;
  if (Math.abs(mapK - mk) > 0.001) {
    mapK += (mk - mapK) * Math.min(1, dt * 2.5);
    if (Math.abs(mapK - mk) < 0.002) mapK = mk;
    mapBoard?.userData.set(mapK);
    if (leaders) {
      const lk = state.layout === 'map' ? mapK : 0;
      leaders.material.opacity = lk * 0.6;
      leaders.visible = lk > 0.01;
    }
    frame.material.opacity = (1 - mapK) * 0.55;
    shadowDirty = true;
  }
  stepPlay(dt);
  const moving = stepLayout(t);
  if (moving || stepOrbit(dt, t)) shadowDirty = true;
  stepFlight(t);
  controls.update();
  updateSun();

  // per-diorama updates (status tweens always; small animations only when in view)
  camera.updateMatrixWorld();
  projView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(projView);
  const camDist = camera.position.distanceTo(controls.target);
  for (let i = 0; i < dioramas.length; i++) {
    const d = dioramas[i];
    const tweening = d.t0 >= 0;
    sphere.center.copy(d.root.position);
    sphere.radius = 7 * d.root.scale.x + 4;
    const inView = frustum.intersectsSphere(sphere);
    const dCam = camera.position.distanceTo(d.root.position);
    const near = !SHOT && inView && dCam < Math.max(140, camDist * 1.2);
    d.setDetail(inView && dCam < 95 * d.root.scale.x);
    d.update(t, dt, near);
    if (tweening) shadowDirty = true;
  }
  if (pointer && frameN % 2 === 0 && !flight.active) {
    const i = pick(pointer.x, pointer.y);
    setHover(i, pointer.x, pointer.y);
  }
  labels.update(camera, innerWidth, innerHeight, { focus: state.focus, hover: state.hover, hideAll: state.hideUI || SOLO, scaleOf, isMinor, hideMinor: isOwnLayout() && camDist > mapLabelDist });

  // shadows: only when something moved, plus a slow refresh for the small animations
  if (shadowDirty || frameN % 8 === 0) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }

  if (bloomOn()) {
    if (!post) post = createPost(renderer, scene, camera);
    post.render();
  } else renderer.render(scene, camera);
  frameN++;
  governor(dt);
  requestAnimationFrame(frame_);
}

let perfLast = performance.now();
function governor() {
  const now = performance.now();
  perf.acc += (now - perfLast) / 1000; perf.n++;
  perfLast = now;
  if (perf.acc < 2) return;
  perf.fps = perf.n / perf.acc;
  perf.acc = 0; perf.n = 0;
  window.__atlasFps = perf.fps;
  window.__atlasStats = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, programs: renderer.info.programs?.length, pixelRatio };
  if (SHOT) return;
  if (perf.fps < 45 && pixelRatio > 1) {
    pixelRatio = Math.max(1, pixelRatio - 0.25);
    renderer.setPixelRatio(pixelRatio);
    post?.setSize(innerWidth, innerHeight);
  } else if (perf.fps < 40 && sun.shadow.mapSize.x > 1024) {
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.map?.dispose(); sun.shadow.map = null;
  }
}

/* ================================================================== BOOT ==== */
async function boot() {
  if (SOLO) document.body.classList.add('solo');
  if (state.hideUI) document.body.classList.add('hide-ui');
  applyMood(state.night ? 1 : 0);
  state.nightK = state.night ? 1 : 0;
  if (state.night) setNight(true);
  updateBloom();
  try { await Promise.race([document.fonts.load('600 40px "Cormorant Garamond"'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* ignore */ }
  setNarration(state.narration);
  const bar = $('#loading-bar'), msg = $('#loading-msg');
  const W = await buildWorld(world, PLACES, (i, n, name) => { bar.style.width = `${(i / n) * 100}%`; if (name) msg.textContent = `Raising ${name}…`; });
  activate(W);
  if (params.has('parchment') && mapBoard) {
    // debug: show the board canvas flat on the page
    const img = mapBoard.children[1].material.map.image;
    Object.assign(img.style, { position: 'fixed', inset: '0', width: '100vw', height: 'auto', zIndex: 100 });
    document.body.append(img);
  }
  setYear(state.year, { animate: false });

  if (SOLO) {
    const d = dioramas[0];
    placeAt(d, 0, 0, 1, 0);
    const view = params.get('view') || 'front';
    const polar = view === 'top' ? 0.35 : view === 'side' ? 1.18 : 0.95;
    const az = view === 'side' ? 0.9 : 0.42;
    d.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(d.pivot);
    const cy = Math.max(0.6, (box.min.y + box.max.y) / 2);
    const dist = Math.max(21, (box.max.y - box.min.y) * 3.4);
    controls.target.set(0, cy, 0);
    camera.position.set(Math.sin(az) * Math.sin(polar) * dist, cy + Math.cos(polar) * dist, Math.cos(az) * Math.sin(polar) * dist);
    controls.update();
    state.mode = 'solo';
  } else {
    setLayout(state.layout, { animate: false, fly: false });
    overview({ dur: 0 });
    if (params.has('tale')) {
      // deep link to a tale: open its card (audio waits for the reader's first click)
      const st = STORIES.find((x) => x.id === params.get('tale'));
      if (st) { await tellTale(st); tale.open(st); }
    } else if (!focusFromHash()) {
      // a gentle intro: start a bit higher and settle
      if (!SHOT) { const { pos, target } = overviewPose(L.bounds, 0.86); camera.position.copy(pos).multiplyScalar(1.25); flyTo(pos, target, 2.4); }
    }
  }
  requestAnimationFrame(frame_);
  const ld = $('#loading');
  ld.classList.add('done');
  setTimeout(() => ld.remove(), 900);
  // let screenshots know when the board has settled
  window.__atlas = { get dioramas() { return dioramas; }, state, switchWorld, tale, get world() { return world; } };
  setTimeout(() => { window.__atlasReady = true; }, SHOT ? 600 : 2600);
}
boot();
