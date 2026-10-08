// Realms Atlas — boot, render loop, layouts, camera, time, and the glue between the 3D board and the UI.
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import data from './generated/places.json';
import mapData from './generated/map.json';
import { Diorama } from './diorama.js';
import { shared } from './kit/materials.js';
import { LAYOUTS, LAYOUT_KEYS, TILE } from './layouts/index.js';
import { makeFloor, makeFrame, makeMapBoard, makeLeaders, FLOOR_Y } from './board.js';
import { EVENTS, YEAR_MIN, YEAR_MAX, PRESENT, yearToTrack, trackToYear, stateAt, fmtYear, eraOf } from './time.js';
import { createScrubber } from './ui/scrubber.js';
import { createPanel } from './ui/panel.js';
import { createContents, createSearch, createHelp } from './ui/overlays.js';
import { createLabels } from './ui/labels.js';
import { $, $$, esc, STATE_LABEL } from './ui/dom.js';
import { createPost } from './post.js';

const params = new URLSearchParams(location.search);
const SOLO = params.get('solo');
const PLACES = SOLO ? data.places.filter((p) => p.id === SOLO) : data.places;
if (SOLO && !PLACES.length) PLACES.push(data.places[0]);
const SHOT = params.has('shot'); // deterministic screenshot mode: no idle motion, no loading fade

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
const state = {
  layout: LAYOUT_KEYS.includes(params.get('layout')) ? params.get('layout') : 'atlas',
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
};
function clampYear(y) { return Number.isFinite(y) ? Math.max(YEAR_MIN, Math.min(YEAR_MAX, y)) : PRESENT; }
let shadowDirty = true;
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

/* ================================================================ BOARD ==== */
const boardGroup = new THREE.Group();
scene.add(boardGroup);
const frame = makeFrame();
let mapBoard = null; // created after the fonts load (the parchment has lettering)
const leaders = makeLeaders(PLACES.length);
if (!SOLO) scene.add(frame, leaders);
let mapK = 0; // 0..1 parchment visibility

/* ============================================================= DIORAMAS ==== */
const dioramas = [];
const hitBoxes = [];
async function buildAll() {
  const bar = $('#loading-bar'), msg = $('#loading-msg');
  let last = performance.now();
  for (let i = 0; i < PLACES.length; i++) {
    const d = new Diorama(PLACES[i], i);
    d.setYear(state.year, false);
    dioramas.push(d);
    hitBoxes.push(d.hit);
    boardGroup.add(d.root);
    if (performance.now() - last > 40) {
      bar.style.width = `${((i + 1) / PLACES.length) * 100}%`;
      msg.textContent = `Raising ${PLACES[i].name}…`;
      await new Promise((r) => requestAnimationFrame(r));
      last = performance.now();
    }
  }
  bar.style.width = '100%';
}

/* ============================================================== LAYOUTS ==== */
let L = null; // current layout result
const tween = { t0: -10, dur: 1.6 };
const lay = []; // per diorama: {fx,fz,fs,tx,tz,ts,delay}
function computeLayout(name) {
  return name === 'map' ? LAYOUTS.map(PLACES, mapData.aspect) : LAYOUTS[name](PLACES);
}
function setLayout(name, { animate = true, fly = true } = {}) {
  if (SOLO) return;
  state.layout = name;
  L = computeLayout(name);
  const now = clock.elapsedTime;
  const rank = new Array(PLACES.length);
  L.order.forEach((i, k) => { rank[i] = k; });
  dioramas.forEach((d, i) => {
    const it = L.items[i];
    const r = d.root;
    lay[i] = { fx: r.position.x, fz: r.position.z, fs: r.scale.x, tx: it.x, tz: it.z, ts: it.s, delay: animate ? (rank[i] / PLACES.length) * 0.7 : 0 };
    if (!animate) placeAt(d, it.x, it.z, it.s, 0);
  });
  tween.t0 = animate ? now : -10;
  labels.setCaptions(L.labels.map((c) => ({ ...c, active: true })));
  frame.setBounds(L.bounds, 3);
  if (name === 'map') leaders.userData.update(L.home, L.items);
  $$('#layouts button').forEach((b) => b.classList.toggle('on', b.dataset.layout === name));
  updateURL();
  if (fly) {
    if (state.mode === 'focus' && state.focus >= 0) setTimeout(() => focusPlace(state.focus, { keepPanel: true }), animate ? 900 : 0);
    else overview({ dur: animate ? 2.2 : 0 });
  }
  shadowDirty = true;
}
function placeAt(d, x, z, s, lift) {
  d.root.position.set(x, FLOOR_Y - (-0.9) * s + lift, z);
  d.root.scale.setScalar(s);
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
    placeAt(dioramas[i], p.fx + (p.tx - p.fx) * e, p.fz + (p.tz - p.fz) * e, p.fs + (p.ts - p.fs) * e, lift);
  }
  return true;
}
const scaleOf = (i) => dioramas[i].root.scale.x;
const MINOR = new Set(['town', 'fortress', 'landmark']);
const isMinor = (i) => MINOR.has(PLACES[i].type);
let mapLabelDist = 200; // in the Map layout, minor labels hide beyond this camera distance

/* =============================================================== CAMERA ==== */
const flight = { active: false, t0: 0, dur: 1, p0: new THREE.Vector3(), p1: new THREE.Vector3(), q0: new THREE.Vector3(), q1: new THREE.Vector3() };
function flyTo(pos, target, dur = 1.8) {
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
  for (const x of xs) for (const z of zs) for (const y of [FLOOR_Y, FLOOR_Y + 3]) corners[k++].set(x, y, z);
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
  const polar = state.layout === 'map' ? 0.62 : state.layout === 'chronicle' ? 0.82 : 0.86;
  const { pos, target } = overviewPose(L.bounds, polar);
  if (state.layout === 'map') mapLabelDist = pos.distanceTo(target) * 0.62;
  flyTo(pos, target, dur);
}
function focusPose(i) {
  const d = dioramas[i];
  const s = L ? L.items[i].s : d.root.scale.x;
  const c = _v1.set(L ? L.items[i].x : d.root.position.x, FLOOR_Y + 1.2 * s + 0.9 * s, L ? L.items[i].z : d.root.position.z);
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
  state.focus = i;
  state.mode = 'focus';
  const { pos, target } = focusPose(i);
  flyTo(pos, target, dur);
  panel.render(PLACES[i], state.year);
  void keepPanel;
  updateURL();
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
  const names = (ev.placeIds || []).map((id) => PLACES.find((p) => p.id === id)?.name).filter(Boolean);
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
const tour = { active: false, i: 0, timer: 0 };
function startTour() {
  if (!L) return;
  tour.active = true;
  $('#btn-tour').classList.add('on');
  const k = state.focus >= 0 ? L.order.indexOf(state.focus) : -1;
  tour.i = k >= 0 ? k : 0;
  tourGo();
}
function tourGo() {
  if (!tour.active) return;
  const i = L.order[tour.i % L.order.length];
  focusPlace(i, { fromTour: true, dur: 2.4 });
  const p = PLACES[i];
  const dwell = Math.max(7000, (p.description || '').length * 42);
  clearTimeout(tour.timer);
  tour.timer = setTimeout(() => { tour.i++; tourGo(); }, dwell);
}
function stopTour() {
  if (!tour.active) return;
  tour.active = false;
  clearTimeout(tour.timer);
  $('#btn-tour').classList.remove('on');
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
  if (state.layout !== 'atlas') q.set('layout', state.layout);
  if (state.year !== PRESENT) q.set('year', String(state.year));
  if (state.night) q.set('night', '1');
  const hash = state.focus >= 0 ? `#${PLACES[state.focus].id}` : '';
  const s = q.toString();
  history.replaceState(null, '', `${location.pathname}${s ? `?${s}` : ''}${hash}`);
}
function focusFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return false;
  const i = PLACES.findIndex((p) => p.id === id);
  if (i >= 0) { focusPlace(i); return true; }
  return false;
}

/* ===================================================================== UI ==== */
const scrubber = createScrubber($('#scrubber'), {
  onYear: (y) => { stopPlay(); setYear(y); },
  onEvent: (ev, i) => jumpToEvent(ev, i),
  onPlay: () => togglePlay(),
});
const panel = createPanel($('#panel'), {
  onYear: (y) => { stopPlay(); setYear(y); if (state.focus >= 0) dioramas[state.focus].pulse = 0.8; },
  onPrev: () => step(-1), onNext: () => step(1), onClose: () => closeFocus(),
});
const contents = createContents($('#contents'), { places: PLACES, onPick: (i) => { $('#contents').hidden = true; focusPlace(i); } });
const search = createSearch($('#search'), $('#search-input'), $('#search-results'), { places: PLACES, onPick: (i) => focusPlace(i) });
const help = createHelp($('#help'));
let labels = { setCaptions() {}, setState() {}, update() {}, measure() {} };

$$('#layouts button').forEach((b) => b.addEventListener('click', () => setLayout(b.dataset.layout)));
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
  const overlayOpen = !$('#contents').hidden || !$('#help').hidden;
  if (k === 'Escape') {
    if (overlayOpen) { $('#contents').hidden = true; $('#help').hidden = true; return; }
    if (tour.active) { stopTour(); return; }
    if (state.mode === 'focus') closeFocus(); else overview();
    return;
  }
  if (k !== 't' && k !== 'T' && tour.active && ['ArrowLeft', 'ArrowRight'].includes(k)) stopTour();
  switch (k) {
    case 'ArrowRight': step(1); break;
    case 'ArrowLeft': step(-1); break;
    case '1': setLayout('atlas'); break;
    case '2': setLayout('map'); break;
    case '3': setLayout('chronicle'); break;
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
addEventListener('hashchange', () => { if (!focusFromHash() && !location.hash) closeFocus(); });

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
    tooltip.innerHTML = `<b>${esc(p.name)}</b><span>${esc(STATE_LABEL[st])} · ${esc(fmtYear(state.year))}</span>`;
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
  const mk = state.layout === 'map' && !SOLO ? 1 : 0;
  if (Math.abs(mapK - mk) > 0.001) {
    mapK += (mk - mapK) * Math.min(1, dt * 2.5);
    if (Math.abs(mapK - mk) < 0.002) mapK = mk;
    mapBoard?.userData.set(mapK);
    leaders.material.opacity = mapK * 0.6;
    leaders.visible = mapK > 0.01;
    frame.material.opacity = (1 - mapK) * 0.55;
    shadowDirty = true;
  }
  stepPlay(dt);
  const moving = stepLayout(t);
  if (moving) shadowDirty = true;
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
  labels.update(camera, innerWidth, innerHeight, { focus: state.focus, hover: state.hover, hideAll: state.hideUI || SOLO, scaleOf, isMinor, hideMinor: state.layout === 'map' && camDist > mapLabelDist });

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
  if (!SOLO) { mapBoard = makeMapBoard(mapData, PLACES); scene.add(mapBoard); applyMood(state.nightK); }
  if (params.has('parchment')) {
    // debug: show the parchment canvas flat on the page
    const img = mapBoard.children[1].material.map.image;
    Object.assign(img.style, { position: 'fixed', inset: '0', width: '100vw', height: 'auto', zIndex: 100 });
    document.body.append(img);
  }
  await buildAll();
  labels = createLabels($('#labels'), dioramas, { onClick: (i) => focusPlace(i), onHover: (i) => setHover(i) });
  dioramas.forEach((d, i) => labels.setState(i, d.state));
  requestAnimationFrame(() => labels.measure());
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
    if (!focusFromHash()) {
      // a gentle intro: start a bit higher and settle
      if (!SHOT) { const { pos, target } = overviewPose(L.bounds, 0.86); camera.position.copy(pos).multiplyScalar(1.25); flyTo(pos, target, 2.4); }
    }
  }
  requestAnimationFrame(frame_);
  const ld = $('#loading');
  ld.classList.add('done');
  setTimeout(() => ld.remove(), 900);
  // let screenshots know when the board has settled
  window.__atlas = { dioramas, state };
  setTimeout(() => { window.__atlasReady = true; }, SHOT ? 600 : 2600);
}
boot();
