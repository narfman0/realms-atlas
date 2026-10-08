// The Dalereckoning scrubber: piecewise-linear axis, era bands, year ticks, world-event markers, play button.
import { h, esc } from './dom.js';
import { ERAS, EVENTS, YEAR_MIN, YEAR_MAX, yearToTrack, trackToYear, fmtYear, fmtYearShort, eraOf } from '../time.js';

const TICKS = [-3500, -2500, -1500, -500, 0, 250, 500, 750, 1000, 1100, 1200, 1300, 1358, 1385, 1450, 1496];

export function createScrubber(root, { onYear, onEvent, onPlay }) {
  const yr = h('span', { class: 'yr' }, '1496');
  const yrl = h('span', { class: 'yrl' }, 'DR');
  const ic = h('span', { class: 'ic' }, '▶');
  const play = h('button', { class: 'play', title: 'Play through time (Space)' }, yr, yrl, ic);
  const track = h('div', { class: 'track' });
  const eras = h('div', { class: 'eras' });
  const ticks = h('div', { class: 'ticks' });
  const events = h('div', { class: 'events' });
  const handle = h('div', { class: 'handle' });
  const tip = h('div', { class: 'evtip', hidden: true });
  track.append(eras, h('div', { class: 'axis' }), ticks, events, handle, tip);
  root.append(play, track);

  const pct = (y) => `${(yearToTrack(y) * 100).toFixed(3)}%`;
  for (const e of ERAS) {
    const a = Math.max(YEAR_MIN, e.from), b = Math.min(YEAR_MAX, e.to);
    if (b <= YEAR_MIN || a >= YEAR_MAX) continue;
    eras.append(h('div', { class: 'era', style: { left: pct(a), width: `${((yearToTrack(b) - yearToTrack(a)) * 100).toFixed(3)}%` }, title: `${e.name} (${fmtYear(e.from)} – ${fmtYear(e.to)})` }, e.short || e.name));
  }
  let lastX = -1;
  for (const y of TICKS) {
    const x = yearToTrack(y);
    if (x - lastX < 0.028) continue;
    lastX = x;
    ticks.append(h('div', { class: 'tick', style: { left: pct(y) } }, fmtYearShort(y)));
  }
  // events, stacked into rows where they would overlap
  const rows = [];
  const evEls = [];
  EVENTS.forEach((ev, i) => {
    const x = yearToTrack(ev.year);
    let row = 0;
    while (rows[row] !== undefined && x - rows[row] < 0.009) row++;
    rows[row] = x;
    const el = h('div', {
      class: `ev i${ev.importance || 1}`, style: { left: pct(ev.year), top: `${22 - Math.min(row, 2) * 11}px` },
      onclick: (e) => { e.stopPropagation(); onEvent(ev, i); },
      onmouseenter: () => showTip(ev, x), onmouseleave: () => { tip.hidden = true; },
    });
    evEls.push(el);
    events.append(el);
  });
  function showTip(ev, x) {
    tip.innerHTML = `<i>${esc(fmtYear(ev.year))}${ev.yearEnd ? ` – ${esc(fmtYear(ev.yearEnd))}` : ''}</i><b>${esc(ev.title)}</b>${esc(ev.summary || '')}`;
    tip.style.left = `${Math.min(88, Math.max(12, x * 100))}%`;
    tip.hidden = false;
  }

  let dragging = false;
  const yearAt = (e) => {
    const r = track.getBoundingClientRect();
    return trackToYear((e.clientX - r.left) / r.width);
  };
  track.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('ev')) return;
    dragging = true;
    track.setPointerCapture(e.pointerId);
    onYear(yearAt(e), 'scrub');
  });
  track.addEventListener('pointermove', (e) => { if (dragging) onYear(yearAt(e), 'scrub'); });
  track.addEventListener('pointerup', () => { dragging = false; });
  play.addEventListener('click', () => onPlay());

  return {
    set(year) {
      handle.style.left = pct(year);
      yr.textContent = year < 0 ? `−${-year}` : String(year);
      yrl.textContent = year < 0 ? 'before DR' : `DR · ${eraOf(year).short}`;
    },
    setPlaying(p) { ic.textContent = p ? '❚❚' : '▶'; play.classList.toggle('on', p); },
    hot(i) { evEls.forEach((el, k) => el.classList.toggle('hot', k === i)); },
  };
}
