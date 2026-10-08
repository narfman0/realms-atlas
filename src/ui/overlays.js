// Contents (C), Search (/), Help (?) overlays.
import { h, STATE_LABEL, stateColor } from './dom.js';
import { stateAt, fmtYearShort, appearYear, fmtYear } from '../time.js';
import { regionName } from '../layouts/index.js';
import { REGION_ORDER } from '../layouts/common.js';

const STATES = ['thriving', 'troubled', 'ruined', 'destroyed', 'abandoned', 'hidden', 'relocated'];

export function createContents(el, { places, onPick }) {
  function render(year) {
    el.innerHTML = '';
    const sheet = h('div', { class: 'sheet' });
    sheet.append(h('h2', {}, 'Contents'), h('p', { class: 'lede' }, `${places.length} places of Faerûn, as they stand in ${fmtYear(year)}. Choose one to visit it.`));
    const legend = h('div', { class: 'legend' });
    STATES.forEach((s) => legend.append(h('span', {}, h('i', { class: 'chip', style: { background: stateColor(s) } }), s)));
    legend.append(h('span', {}, h('i', { class: 'chip' }), 'not yet founded'));
    sheet.append(legend);
    const grid = h('div', { class: 'contents-grid' });
    const regions = [...new Set([...REGION_ORDER, ...places.map((p) => p.region)])];
    for (const r of regions) {
      const list = places.map((p, i) => [p, i]).filter(([p]) => p.region === r);
      if (!list.length) continue;
      const ol = h('ol');
      for (const [p, i] of list) {
        const st = stateAt(p, year);
        ol.append(h('li', { class: st, onclick: () => onPick(i), title: STATE_LABEL[st] },
          h('i', { class: 'chip', style: { background: stateColor(st) } }), h('span', { class: 'n' }, p.name), h('span', { class: 'dots' }), h('span', { class: 'y' }, fmtYearShort(p.founded ?? (appearYear(p) > -35000 ? appearYear(p) : null)))));
      }
      grid.append(h('section', {}, h('h3', {}, regionName(r)), ol));
    }
    sheet.append(grid);
    el.append(sheet);
  }
  el.addEventListener('click', (e) => { if (e.target === el) el.hidden = true; });
  return { render, toggle(year) { if (el.hidden) { render(year); el.hidden = false; } else el.hidden = true; } };
}

export function createSearch(el, input, list, { places, onPick }) {
  let results = [];
  let sel = 0;
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hay = places.map((p) => norm([p.name, ...(p.aliases || []), p.id, ...(p.tags || []), regionName(p.region)].join(' | ')));
  function run() {
    const q = norm(input.value.trim());
    results = places.map((p, i) => i).filter((i) => !q || hay[i].includes(q));
    results.sort((a, b) => (norm(places[b].name).startsWith(q) ? 1 : 0) - (norm(places[a].name).startsWith(q) ? 1 : 0));
    results = results.slice(0, 40);
    sel = 0;
    draw();
  }
  function draw() {
    list.innerHTML = '';
    results.forEach((i, k) => {
      const p = places[i];
      list.append(h('li', { class: k === sel ? 'sel' : '', onclick: () => pick(i) }, h('span', {}, p.name), h('small', {}, regionName(p.region))));
    });
    list.children[sel]?.scrollIntoView({ block: 'nearest' });
  }
  function pick(i) { close(); onPick(i); }
  function open() { el.hidden = false; input.value = ''; run(); input.focus(); }
  function close() { el.hidden = true; input.blur(); }
  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(results.length - 1, sel + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (results[sel] != null) pick(results[sel]); e.preventDefault(); }
    else if (e.key === 'Escape') { close(); e.preventDefault(); }
    e.stopPropagation();
  });
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  return { open, close, get open_() { return !el.hidden; } };
}

export function createHelp(el) {
  const K = [
    ['← / →', 'previous / next place (in the current layout’s order)'],
    ['1 · 2 · 3', 'Atlas · Map · Chronicle'],
    ['Space', 'play / pause time'],
    ['[ / ]', 'step back / forward to the previous / next world event'],
    ['T', 'tour: visit every place in order'],
    ['C', 'contents'],
    ['/', 'search'],
    ['N', 'night'],
    ['B', 'bloom on glowing things'],
    ['H', 'hide the interface'],
    ['Esc', 'back to the board'],
    ['?', 'this card'],
  ];
  const sheet = h('div', { class: 'sheet help-sheet' },
    h('h2', {}, 'Keys & links'),
    h('div', { class: 'keys' }, K.flatMap(([k, v]) => [h('kbd', {}, k), h('span', {}, v)])),
    h('p', {}, 'Deep links: ', h('code', {}, '#waterdeep'), ' opens a place; ', h('code', {}, '?year=1358'), ' sets the year; ', h('code', {}, '?layout=map'), ' picks a layout; ', h('code', {}, '?solo=menzoberranzan'), ' shows one diorama alone.'),
    h('p', {}, 'Each diorama is built in code from one shared kit of low-poly pieces. Its look at any year follows the place’s recorded status: places rise from the board when founded, crumble when ruined, scorch when destroyed, fade when abandoned, turn ghostly when hidden, and lift away when relocated.'),
    h('p', { style: { fontStyle: 'italic' } }, 'Facts from the Forgotten Realms Wiki (CC BY-SA 3.0), paraphrased. Forgotten Realms is a trademark of Wizards of the Coast; this is an unofficial fan work. Inspired by Piotr Migdał’s Invisible Cities atlas.'));
  el.append(sheet);
  el.addEventListener('click', (e) => { if (e.target === el) el.hidden = true; });
  return { toggle() { el.hidden = !el.hidden; } };
}
