// Zvuky a hudba. Hudba jsou tři nahrané smyčky se skutečnými nástroji
// (tools/music/compose.py): průzkum (epický pochod), boj (rychlé 6/8) a hádanky (harfa a flétna).
// Efekty se syntetizují přes Web Audio.
import exploreData from './assets/music/explore.webm';
import combatData from './assets/music/combat.webm';
import LOOPS from './assets/music/loops.json';

const MUSIC = { explore: exploreData, combat: combatData };
const VOLUME_KEY = 'labyrint-volume';
const MASTER = 0.7;

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let muted = false;
const moods = {};
let currentMood = 'explore';
const volume = loadVolume();

function loadVolume() {
  try {
    const v = JSON.parse(localStorage.getItem(VOLUME_KEY));
    if (v && typeof v.music === 'number' && typeof v.sfx === 'number') return v;
  } catch (e) { /* výchozí hodnoty */ }
  return { music: 0.45, sfx: 0.8 };
}

export function getVolume() { return { ...volume }; }

// kind: 'music' | 'sfx', v: 0..1
export function setVolume(kind, v) {
  volume[kind] = Math.max(0, Math.min(1, v));
  try { localStorage.setItem(VOLUME_KEY, JSON.stringify(volume)); } catch (e) { /* bez úložiště */ }
  if (!ctx) return;
  const bus = kind === 'music' ? musicBus : sfxBus;
  bus.gain.setTargetAtTime(volume[kind] * (kind === 'music' ? 0.8 : 1), ctx.currentTime, 0.05);
}

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = MASTER;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = volume.sfx;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = volume.music * 0.8;
  musicBus.connect(master);
  for (const name of Object.keys(MUSIC)) {
    const g = ctx.createGain();
    g.gain.value = name === currentMood ? 1 : 0;
    g.connect(musicBus);
    moods[name] = { gain: g, buffer: null, src: null };
    decode(name);
  }
}

function base64ToBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function decode(name) {
  const done = (buf) => { moods[name].buffer = buf; play(name, false); };
  try {
    const r = ctx.decodeAudioData(base64ToBuffer(MUSIC[name]), done, () => { /* starý prohlížeč: hra hraje bez hudby */ });
    if (r && r.catch) r.catch(() => {});
  } catch (e) { /* bez hudby */ }
}

// Spustí smyčku nálady; fromStart = začne od prvního taktu.
function play(name, fromStart) {
  const m = moods[name];
  if (!m.buffer) return;
  if (m.src && !fromStart) return;
  if (m.src) { try { m.src.stop(); } catch (e) { /* už stojí */ } }
  const src = ctx.createBufferSource();
  src.buffer = m.buffer;
  src.loop = true;
  src.loopStart = 0;
  // délka smyčky přesně na vzorek (konec souboru může mít výplň kodeku)
  src.loopEnd = Math.min(m.buffer.duration, LOOPS[name].samples / LOOPS[name].rate);
  src.connect(m.gain);
  src.start(ctx.currentTime + 0.02);
  m.src = src;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.05);
  return muted;
}

export const getMood = () => currentMood;

export function setMood(name) {
  if (!ctx || name === currentMood || !moods[name]) return;
  currentMood = name;
  const now = ctx.currentTime;
  for (const [k, m] of Object.entries(moods)) {
    const on = k === name;
    // boj začíná vždy od začátku, aby nástup seděl na první doby
    if (on && k === 'combat' && m.gain.gain.value < 0.05) play(k, true);
    m.gain.gain.cancelScheduledValues(now);
    m.gain.gain.setTargetAtTime(on ? 1 : 0, now, on ? 0.5 : 0.9);
  }
}

let noiseBuf = null;
function noiseHit(out, t, vol, freq, dur, type = 'lowpass') {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

// ---------- zvukové efekty ----------
function tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + dur + 0.05);
}
const nz = (dur, vol, f, delay = 0, type) => ctx && noiseHit(sfxBus, ctx.currentTime + delay, vol, f, dur, type);

export const sfx = {
  swing: () => nz(0.18, 0.3, 2500),
  bow: () => { tone(220, 0.15, 'triangle', 0.2, 120); nz(0.12, 0.2, 3500, 0, 'highpass'); },
  arrowHit: () => { tone(400, 0.08, 'square', 0.12, 200); nz(0.08, 0.2, 1500); },
  hit: () => { tone(180, 0.15, 'square', 0.2, 80); nz(0.1, 0.25, 800); },
  clang: () => { tone(900, 0.3, 'triangle', 0.2, 600); tone(1350, 0.25, 'triangle', 0.1); },
  hurt: () => tone(300, 0.3, 'sawtooth', 0.2, 120),
  pickup: () => { tone(660, 0.12, 'triangle', 0.25); tone(990, 0.2, 'triangle', 0.25, null, 0.1); },
  points: () => { tone(880, 0.08, 'sine', 0.12); tone(1320, 0.1, 'sine', 0.1, null, 0.06); },
  door: () => { nz(0.8, 0.35, 300); tone(70, 0.8, 'sawtooth', 0.15, 50); },
  click: () => { tone(1200, 0.04, 'square', 0.1); nz(0.05, 0.2, 2000); },
  jump: () => tone(300, 0.12, 'sine', 0.12, 500),
  growl: () => { tone(90, 0.5, 'sawtooth', 0.15, 60); nz(0.4, 0.12, 400); },
  chitter: () => { for (let i = 0; i < 4; i++) tone(1800 + Math.random() * 600, 0.04, 'square', 0.05, null, i * 0.05); },
  roar: () => { tone(110, 1.0, 'sawtooth', 0.25, 55); nz(0.9, 0.25, 500); },
  crash: () => { nz(0.7, 0.5, 600); tone(60, 0.6, 'square', 0.25, 30); },
  correct: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.25, 'triangle', 0.2, null, i * 0.1)); },
  wrong: () => { tone(220, 0.25, 'square', 0.15); tone(160, 0.35, 'square', 0.15, null, 0.2); },
  mist: () => { tone(400, 1.2, 'sine', 0.15, 1200); tone(600, 1.2, 'sine', 0.1, 1800, 0.2); },
  victory: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'triangle', 0.2, null, i * 0.15)); },
  step: () => nz(0.05, 0.05, 500),
};
