// Contents (C), Search (/), Help (?) overlays.
import { h, STATE_LABEL, stateColor } from './dom.js';
import { stateAt, fmtYearShort, appearYear, fmtYear } from '../time.js';
import { regionName } from '../layouts/index.js';
import { REGION_ORDER } from '../layouts/common.js';

const STATES = ['thriving', 'troubled', 'ruined', 'destroyed', 'abandoned', 'hidden', 'relocated'];

/** places: every place of every world; worlds: [{id, name}]; current(): the world on the board; onPick(id) */
export function createContents(el, { places, worlds = [{ id: 'toril', name: 'Faerûn' }], current = () => 'toril', onPick }) {
  function render(year) {
    el.innerHTML = '';
    const sheet = h('div', { class: 'sheet' });
    sheet.append(h('h2', {}, 'Contents'), h('p', { class: 'lede' }, `${places.length} places in ${worlds.length} ${worlds.length === 1 ? 'world' : 'worlds'}, as they stand in ${fmtYear(year)}. Choose one to visit it.`));
    const legend = h('div', { class: 'legend' });
    STATES.forEach((s) => legend.append(h('span', {}, h('i', { class: 'chip', style: { background: stateColor(s) } }), s)));
    legend.append(h('span', {}, h('i', { class: 'chip' }), 'not yet founded'));
    sheet.append(legend);
    // the world on the board first, then the rest in their usual order
    const cur = current();
    const ordered = [...worlds.filter((w) => w.id === cur), ...worlds.filter((w) => w.id !== cur)];
    for (const w of ordered) {
      const inWorld = places.filter((p) => (p.world || 'toril') === w.id);
      if (!inWorld.length) continue;
      sheet.append(h('h3', { class: `world${w.id === cur ? ' here' : ''}` }, w.name, h('small', {}, `${inWorld.length} places${w.id === cur ? ' · on the board' : ''}`)));
      const grid = h('div', { class: 'contents-grid' });
      const regions = [...new Set([...REGION_ORDER, ...inWorld.map((p) => p.region)])];
      for (const r of regions) {
        const list = inWorld.filter((p) => p.region === r);
        if (!list.length) continue;
        const ol = h('ol');
        for (const p of list) {
          const st = stateAt(p, year);
          ol.append(h('li', { class: st, onclick: () => onPick(p.id), title: STATE_LABEL[st] },
            h('i', { class: 'chip', style: { background: stateColor(st) } }), h('span', { class: 'n' }, p.name), h('span', { class: 'dots' }), h('span', { class: 'y' }, fmtYearShort(p.founded ?? (appearYear(p) > -35000 ? appearYear(p) : null)))));
        }
        grid.append(h('section', {}, h('h3', {}, regionName(r)), ol));
      }
      sheet.append(grid);
    }
    el.append(sheet);
  }
  el.addEventListener('click', (e) => { if (e.target === el) el.hidden = true; });
  return { render, toggle(year) { if (el.hidden) { render(year); el.hidden = false; } else el.hidden = true; } };
}

/** search every world; onPick(id) */
export function createSearch(el, input, list, { places, worldName = () => '', current = () => 'toril', onPick }) {
  let results = [];
  let sel = 0;
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hay = places.map((p) => norm([p.name, ...(p.aliases || []), p.id, ...(p.tags || []), regionName(p.region), worldName(p.world || 'toril')].join(' | ')));
  function run() {
    const q = norm(input.value.trim());
    results = places.map((p, i) => i).filter((i) => !q || hay[i].includes(q));
    const cur = current();
    const score = (i) => (norm(places[i].name).startsWith(q) ? 2 : 0) + ((places[i].world || 'toril') === cur ? 1 : 0);
    results.sort((a, b) => score(b) - score(a));
    results = results.slice(0, 40);
    sel = 0;
    draw();
  }
  function draw() {
    list.innerHTML = '';
    results.forEach((i, k) => {
      const p = places[i];
      const w = p.world || 'toril';
      list.append(h('li', { class: k === sel ? 'sel' : '', onclick: () => pick(i) }, h('span', {}, p.name), h('small', {}, w !== current() ? `${worldName(w)} · ${regionName(p.region)}` : regionName(p.region))));
    });
    list.children[sel]?.scrollIntoView({ block: 'nearest' });
  }
  function pick(i) { close(); onPick(places[i].id); }
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
    ['1 · 2 · 3', 'Atlas · Map (Wheel, Orbit) · Chronicle'],
    ['W / ⇧W', 'next / previous world'],
    ['Enter', 'enter the world a place opens onto (Bryn Shander → Ten-Towns)'],
    ['Space', 'play / pause time'],
    ['[ / ]', 'step back / forward to the previous / next world event'],
    ['T', 'tour: visit every place in order (tells the tales on the way)'],
    ['S', 'the tales'],
    ['P', 'play / pause the open tale'],
    ['R', 'narration on / off'],
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
    h('p', {}, 'Deep links: ', h('code', {}, '#waterdeep'), ' opens a place (in its world); ', h('code', {}, '?world=planes'), ' opens a world; ', h('code', {}, '?year=1358'), ' sets the year; ', h('code', {}, '?layout=map'), ' picks a layout; ', h('code', {}, '?solo=menzoberranzan'), ' shows one diorama alone.'),
    h('p', {}, 'Each diorama is built in code from one shared kit of low-poly pieces. Its look at any year follows the place’s recorded status: places rise from the board when founded, crumble when ruined, scorch when destroyed, fade when abandoned, turn ghostly when hidden, and lift away when relocated.'),
    h('p', { style: { fontStyle: 'italic' } }, 'Facts from the Forgotten Realms Wiki (CC BY-SA 3.0), paraphrased. Forgotten Realms is a trademark of Wizards of the Coast; this is an unofficial fan work. Inspired by Piotr Migdał’s Invisible Cities atlas.'));
  el.append(sheet);
  el.addEventListener('click', (e) => { if (e.target === el) el.hidden = true; });
  return { toggle() { el.hidden = !el.hidden; } };
}
