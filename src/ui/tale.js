// Narration: the "Tale" card (title, year, drop-cap text, Play/Pause with progress), the narrator that reads it
// (a pre-rendered clip through <audio>, or the browser's speechSynthesis when there is no clip or it fails),
// and the stories index (S). Audio never starts before the reader has interacted with the page.
import { h } from './dom.js';
import { fmtYear } from '../time.js';

export const BOOK_SVG = '<svg viewBox="0 0 16 12" aria-hidden="true"><path d="M8 2.6C6 1.1 3.6.8 1 1.2v8.9c2.6-.4 5-.1 7 1.4 2-1.5 4.4-1.8 7-1.4V1.2C12.4.8 10 1.1 8 2.6zM8 2.6v8.9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
export const book = (cls = 'book') => { const el = h('i', { class: cls }); el.innerHTML = BOOK_SVG; return el; };

const fmtTime = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––');

/** pick a voice: en-GB if there is one, else any English voice, else the default */
function pickVoice() {
  const vs = window.speechSynthesis?.getVoices?.() || [];
  return vs.find((v) => /^en[-_]GB/i.test(v.lang) && /male|daniel|arthur|george/i.test(v.name))
    || vs.find((v) => /^en[-_]GB/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
}

export function createNarrator({ onProgress, onState, onEnd }) {
  const audio = new Audio();
  audio.preload = 'none';
  let story = null, mode = null, playing = false, speechPos = 0, speechT0 = 0, timer = 0, speechChar = 0;
  const synth = window.speechSynthesis || null;
  const set = (p) => { playing = p; onState(p); };
  function finish() { stopTimer(); set(false); onProgress(1, story?.durationSec, story?.durationSec); const s = story; mode = null; onEnd?.(s); }
  function stopTimer() { cancelAnimationFrame(timer); timer = 0; }
  audio.addEventListener('timeupdate', () => { if (mode === 'audio') onProgress(audio.duration ? audio.currentTime / audio.duration : 0, audio.currentTime, audio.duration || story?.durationSec); });
  audio.addEventListener('ended', () => { if (mode === 'audio') finish(); });
  audio.addEventListener('error', () => { if (mode === 'audio' && story) speak(story); });

  function speak(s, from = 0) {
    mode = 'speech';
    if (!synth) { mode = 'silent'; silent(s); return; }
    synth.cancel();
    const text = from ? s.text.slice(from) : s.text;
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
    u.rate = 0.94; u.pitch = 0.95;
    u.onboundary = (e) => { speechChar = from + (e.charIndex || 0); const k = speechChar / s.text.length; onProgress(k, k * (s.durationSec || 60), s.durationSec || 60); };
    u.onend = () => { if (mode === 'speech' && story === s && playing) finish(); };
    u.onerror = () => { if (mode === 'speech' && story === s && playing) { mode = 'silent'; silent(s, speechChar / s.text.length); } };
    synth.speak(u);
    set(true);
  }
  // no voice at all: run the progress bar for the tale's length so the tour still paces itself
  function silent(s, k0 = 0) {
    const dur = s.durationSec || Math.max(30, s.text.split(/\s+/).length / 2.6);
    speechPos = k0; speechT0 = performance.now();
    set(true);
    const tick = () => {
      const k = Math.min(1, speechPos + (performance.now() - speechT0) / 1000 / dur);
      onProgress(k, k * dur, dur);
      if (k >= 1) { finish(); return; }
      timer = requestAnimationFrame(tick);
    };
    stopTimer(); timer = requestAnimationFrame(tick);
  }

  return {
    play(s) {
      if (story === s && mode && !playing) return this.resume();
      this.stop();
      story = s;
      speechChar = 0;
      if (s.audio) {
        mode = 'audio';
        audio.src = s.audio;
        audio.currentTime = 0;
        set(true);
        audio.play().catch(() => { if (mode === 'audio' && story === s) speak(s); });
      } else speak(s);
    },
    pause() {
      if (!playing) return;
      if (mode === 'audio') audio.pause();
      else if (mode === 'speech') { synth?.cancel(); }
      else if (mode === 'silent') { stopTimer(); speechPos = Math.min(1, speechPos + (performance.now() - speechT0) / 1000 / (story.durationSec || 60)); }
      set(false);
    },
    resume() {
      if (!story || playing) return;
      if (mode === 'audio') { set(true); audio.play().catch(() => speak(story)); }
      else if (mode === 'speech') speak(story, speechChar); // speechSynthesis.pause() is unreliable: restart from the last word
      else if (mode === 'silent') silent(story, speechPos);
      else this.play(story);
    },
    stop() {
      stopTimer();
      if (mode === 'audio') { audio.pause(); }
      synth?.cancel();
      mode = null;
      if (playing) set(false);
      onProgress(0, 0, story?.durationSec);
    },
    get playing() { return playing; },
    get story() { return story; },
  };
}

/** the Tale card (el = #tale). hooks: onPlay(story) when playback starts, onPlace(id), onClose() */
export function createTale(el, { worldName, placeName, onPlay, onPlace, onClose, canSpeak }) {
  let story = null, onEnd = null;
  let bar, timeEl, btn;
  const narrator = createNarrator({
    onProgress: (k, t, d) => { if (bar) bar.style.width = `${(k * 100).toFixed(1)}%`; if (timeEl) timeEl.textContent = `${fmtTime(t)} / ${fmtTime(d)}`; },
    onState: (p) => { if (btn) { btn.classList.toggle('on', p); btn.innerHTML = p ? '<b>❚❚</b> Pause' : '<b>▶</b> Hear the tale'; } el.classList.toggle('playing', p); },
    onEnd: (s) => { const f = onEnd; onEnd = null; f?.(s); },
  });
  function render(s) {
    el.innerHTML = '';
    btn = h('button', { class: 'tplay', onclick: () => toggle() });
    bar = h('span');
    timeEl = h('span', { class: 'tt' }, `0:00 / ${fmtTime(s.durationSec)}`);
    const places = (s.placeIds || []).map((id) => h('button', { class: 'tplace', onclick: () => onPlace(id) }, placeName(id)));
    el.append(
      h('button', { class: 'close', title: 'Close the tale (Esc)', onclick: () => close() }, '×'),
      h('div', { class: 'kicker' }, book('book'), ` A tale · ${fmtYear(s.year)}`),
      h('h2', {}, s.title),
      s.narrator ? h('div', { class: 'narrator' }, `as told by ${s.narrator}`) : null,
      h('div', { class: 'tctl' }, btn, h('div', { class: 'tbar' }, bar), timeEl),
      h('div', { class: 'ttext' }, ...s.text.split(/\n\s*\n/).map((para) => h('p', {}, para.trim()))),
      places.length ? h('div', { class: 'tplaces' }, h('span', {}, `${worldName(s.worldId)} · `), ...places) : null,
      s.eventTitle ? h('div', { class: 'tevent' }, `On the timeline: ${s.eventTitle}`) : null,
      h('div', { class: 'tnote' }, s.audio ? 'Narration pre-rendered with an open-weights voice.' : 'Read aloud by your browser’s voice.'),
    );
    btn.innerHTML = '<b>▶</b> Hear the tale';
  }
  function open(s) {
    if (story !== s) { narrator.stop(); story = s; onEnd = null; render(s); }
    el.hidden = false;
    el.scrollTop = 0;
  }
  /** play: jumps the atlas to the tale (onPlay) unless fly === false; speaks only after a user gesture */
  function play(s = story, { fly = true, end = null } = {}) {
    if (!s) return;
    open(s);
    onEnd = end;
    if (fly) onPlay(s);
    if (canSpeak()) narrator.play(s);
    else if (end) setTimeout(() => { if (onEnd === end && story === s) { onEnd = null; end(s); } }, 9000);
  }
  function toggle() {
    if (!story) return;
    if (narrator.playing) narrator.pause();
    else if (narrator.story === story) narrator.resume();
    else play(story);
  }
  function close() { narrator.stop(); onEnd = null; el.hidden = true; onClose?.(); }
  return { open, play, toggle, close, get story() { return el.hidden ? null : story; }, get playing() { return narrator.playing; }, stop: () => narrator.stop() };
}

/** the stories index (S) */
export function createStories(el, { stories, worldName, placeName, onPick }) {
  function render() {
    el.innerHTML = '';
    const sheet = h('div', { class: 'sheet stories-sheet' });
    sheet.append(h('h2', {}, 'Tales'), h('p', { class: 'lede' }, `${stories.length} tales from the long history of the Realms, read aloud. Choose one to travel there and hear it.`));
    const ol = h('ol', { class: 'stories' });
    for (const s of stories) {
      ol.append(h('li', { onclick: () => { el.hidden = true; onPick(s); } },
        h('span', { class: 'y' }, fmtYear(s.year)),
        h('span', { class: 'b' }, book('book')),
        h('span', { class: 'n' }, h('b', {}, s.title), h('small', {}, [worldName(s.worldId), ...(s.placeIds || []).slice(0, 3).map(placeName)].join(' · '))),
        h('span', { class: 'd' }, s.durationSec ? fmtTime(s.durationSec) : '')));
    }
    sheet.append(ol);
    if (!stories.length) sheet.append(h('p', {}, 'No tales have been written down yet.'));
    el.append(sheet);
  }
  el.addEventListener('click', (e) => { if (e.target === el) el.hidden = true; });
  return { toggle() { if (el.hidden) { render(); el.hidden = false; } else el.hidden = true; } };
}
