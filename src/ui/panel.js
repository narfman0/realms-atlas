// Side panel: the record of one place, its status at the current year, and an event strip on the global axis.
import { h, esc, STATE_LABEL, stateColor } from './dom.js';
import { yearToTrack, fmtYear, stateAt, appearYear, YEAR_MIN, ALWAYS } from '../time.js';
import { regionName } from '../layouts/index.js';
import { book } from './tale.js';

const fmtPop = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '')} million` : n >= 1e4 ? `${Math.round(n / 1000)},000` : n.toLocaleString('en-US'));
const TYPE = { 'underdark-city': 'Underdark city' };

export function createPanel(el, { onYear, onPrev, onNext, onClose, onDrill, worldName = (w) => w, storiesOf = () => [], onStory }) {
  let current = null;
  function render(place, year) {
    current = place;
    const st = stateAt(place, year);
    el.innerHTML = '';
    el.append(h('button', { class: 'close', title: 'Back to the board (Esc)', onclick: onClose }, '×'));
    const w = place.world || 'toril';
    el.append(h('div', { class: 'kicker' }, `${w !== 'toril' ? `${worldName(w)} · ` : ''}${regionName(place.region)} · ${TYPE[place.type] || place.type}`));
    el.append(h('h2', {}, place.name));
    if (place.aliases?.length) el.append(h('div', { class: 'aliases' }, place.aliases.join(' · ')));
    el.append(h('span', { class: 'state', style: { color: stateColor(st) } }, `${fmtYear(year)} — ${STATE_LABEL[st]}`));
    if (place.drill) el.append(h('button', { class: 'drill', title: `Open the ${worldName(place.drill)} board`, onclick: () => onDrill?.(place.drill, place) }, h('span', {}, '⤓'), ` Enter ${worldName(place.drill)}`));
    const tales = storiesOf(place.id);
    if (tales.length) {
      const t = h('div', { class: 'ptales' });
      for (const s of tales) t.append(h('button', { onclick: () => onStory?.(s), title: 'Hear the tale' }, book('book'), h('span', {}, s.title), h('small', {}, fmtYear(s.year))));
      el.append(t);
    }
    el.append(h('p', { class: 'desc' }, place.description));
    const dl = h('dl');
    const row = (k, v) => { if (v != null && v !== '') dl.append(h('dt', {}, k), h('dd', {}, v)); };
    row('Founded', place.founded != null ? fmtYear(place.founded) : appearYear(place) > ALWAYS ? `first noted ${fmtYear(appearYear(place))}` : 'time immemorial');
    if (place.foundedNote && !/stub/i.test(place.foundedNote)) row('', h('i', { style: { fontSize: '14px', color: 'var(--ink-soft)' } }, place.foundedNote));
    row('Population', place.population != null ? `c. ${fmtPop(place.population)}` : null);
    row('Ruler', place.ruler || null);
    if (place.tags?.length) row('Tags', place.tags.join(', '));
    el.append(dl);

    // status bands + events on the global axis
    el.append(h('h3', {}, 'Through the ages'));
    const strip = h('div', { class: 'strip' }, h('div', { class: 'axis' }));
    const sts = place.status || [];
    sts.forEach((s, i) => {
      const a = Math.max(YEAR_MIN, s.from ?? ALWAYS);
      const b = s.to ?? 1496;
      if (b < YEAR_MIN) return;
      const x0 = yearToTrack(a), x1 = Math.max(x0 + 0.004, yearToTrack(b));
      strip.append(h('div', { class: 'band', title: `${s.state}: ${fmtYear(s.from)} – ${s.to == null ? 'now' : fmtYear(s.to)}`, style: { left: `${x0 * 100}%`, width: `${(x1 - x0) * 100}%`, background: stateColor(s.state), opacity: 0.8 } }));
      void i;
    });
    for (const ev of place.events || []) {
      strip.append(h('div', { class: `ev i${ev.importance || 1}`, title: `${fmtYear(ev.year)} — ${ev.title}`, style: { left: `${yearToTrack(ev.year) * 100}%` }, onclick: () => onYear(ev.year) }));
    }
    strip.append(h('div', { class: 'now', style: { left: `${yearToTrack(year) * 100}%` } }));
    el.append(strip);
    const legend = h('div', { class: 'legend', style: { margin: '2px 0 8px', gap: '10px' } });
    [...new Set(sts.map((s) => s.state))].forEach((s) => legend.append(h('span', {}, h('i', { class: 'chip', style: { background: stateColor(s) } }), s)));
    el.append(legend);

    const ol = h('ol', { class: 'events' });
    for (const ev of [...(place.events || [])].sort((a, b) => a.year - b.year)) {
      ol.append(h('li', { class: ev.year > year ? 'future' : '', onclick: () => onYear(ev.year), title: 'Jump to this year' },
        h('span', { class: 'y' }, fmtYear(ev.year)),
        h('span', {}, h('div', { class: 't' }, ev.title), ev.summary ? h('div', { class: 's' }, ev.summary) : null)));
    }
    el.append(ol);
    if (place.sources?.length) {
      el.append(h('h3', {}, 'Sources'));
      const s = h('div', { class: 'sources' });
      place.sources.forEach((u) => s.append(h('div', {}, h('a', { href: u, target: '_blank', rel: 'noopener' }, u.replace(/^https?:\/\//, '')))));
      el.append(s);
      el.append(h('div', { class: 'lic' }, 'Facts drawn from the Forgotten Realms Wiki (CC BY-SA 3.0); descriptions are original paraphrase.'));
    }
    el.append(h('div', { class: 'nav' }, h('button', { onclick: onPrev }, '← previous'), h('button', { onclick: onNext }, 'next →')));
    el.hidden = false;
  }
  return {
    render,
    refresh(year) { if (current && !el.hidden) { const top = el.scrollTop; render(current, year); el.scrollTop = top; } },
    hide() { el.hidden = true; current = null; },
    get place() { return current; },
  };
}
