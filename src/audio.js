// Zvuky a epická hudba syntetizované přes Web Audio, bez externích souborů.
// Hudba má tři nálady: průzkum (pochod s bubny a žesti), boj (rychlé bubny) a hádanky (tichá lyra).

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let reverb = null;
let muted = false;
const moods = {};
let currentMood = 'explore';

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.6;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.8;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.55;
  musicBus.connect(master);
  reverb = ctx.createConvolver();
  reverb.buffer = impulse(2.8, 2.5);
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  reverb.connect(wet).connect(musicBus);
  for (const name of ['explore', 'combat', 'puzzle']) {
    const g = ctx.createGain();
    g.gain.value = name === currentMood ? 1 : 0;
    g.connect(musicBus);
    g.connect(reverb);
    moods[name] = { gain: g, target: g.gain.value, next: ctx.currentTime + 0.1, step: 0 };
  }
  setInterval(schedule, 50);
}

function impulse(seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.05);
  return muted;
}

export function setMood(name) {
  if (!ctx || name === currentMood || !moods[name]) return;
  const old = moods[currentMood];
  currentMood = name;
  const now = ctx.currentTime;
  for (const [k, m] of Object.entries(moods)) {
    m.target = k === name ? 1 : 0;
    m.gain.gain.cancelScheduledValues(now);
    m.gain.gain.setTargetAtTime(m.target, now, k === name ? 0.6 : 0.8);
  }
  // nová nálada začne na začátku taktu, aby navazovala
  moods[name].next = Math.max(now + 0.05, old ? old.next : now);
  moods[name].step = 0;
}

// ---------- nástroje ----------
const D3 = 146.83;
const hz = (semi, base = D3) => base * Math.pow(2, semi / 12);

function env(g, t, a, peak, d, sustain, rel, end) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + a + d);
  g.gain.setValueAtTime(Math.max(0.0001, sustain), end);
  g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
}

function drum(out, t, freq = 55, vol = 0.9, decay = 0.6) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 2.6, t);
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + decay + 0.05);
  noiseHit(out, t, vol * 0.35, 500, decay * 0.4);
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

// Žestě: dva rozladěné pily přes otevírající se filtr.
function brass(out, t, freq, dur, vol = 0.18) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 2;
  f.frequency.setValueAtTime(350, t);
  f.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
  f.frequency.exponentialRampToValueAtTime(900, t + 0.5);
  const g = ctx.createGain();
  env(g, t, 0.06, vol, 0.3, vol * 0.7, 0.25, t + dur);
  for (const det of [-7, 6]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = det;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.35);
  }
  f.connect(g).connect(out);
}

// Sbor: rozladěné tóny přes formantové filtry ("áá").
function choir(out, t, freqs, dur, vol = 0.05) {
  const g = ctx.createGain();
  env(g, t, 0.6, vol, 0.4, vol * 0.8, 0.8, t + dur);
  const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 750; f1.Q.value = 3;
  const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 4;
  f1.connect(g); f2.connect(g);
  g.connect(out);
  for (const fr of freqs) for (const det of [-10, 0, 9]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = fr;
    o.detune.value = det;
    o.connect(f1); o.connect(f2);
    o.start(t);
    o.stop(t + dur + 0.9);
  }
}

function pluck(out, t, freq, vol = 0.12, decay = 1.4) {
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o2.type = 'sine';
  o.frequency.value = freq;
  o2.frequency.value = freq * 2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  const g2 = ctx.createGain();
  g2.gain.value = 0.3;
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(out);
  o.start(t); o2.start(t);
  o.stop(t + decay + 0.05); o2.stop(t + decay + 0.05);
}

function bass(out, t, freq, dur, vol = 0.16) {
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.value = freq;
  f.type = 'lowpass';
  f.frequency.value = 380;
  env(g, t, 0.02, vol, 0.15, vol * 0.6, 0.12, t + dur);
  o.connect(f).connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.2);
}

// ---------- skladba ----------
// Akordy v d moll (půltóny od D3) a vlastní melodie ve stylu epických barbarských filmů.
const MIN = [0, 3, 7], MAJ = [0, 4, 7];
const PROG_EXPLORE = [[0, MIN], [-4, MAJ], [-7, MIN], [0, MIN], [0, MIN], [-4, MAJ], [-2, MAJ], [-5, MAJ]];
const MELODY = [
  [[0, 1.5], [3, 0.5], [5, 1], [7, 1]],
  [[8, 1.5], [7, 0.5], [5, 1], [3, 1]],
  [[5, 1.5], [3, 0.5], [2, 1], [-2, 1]],
  [[0, 3], [null, 1]],
  [[7, 1.5], [8, 0.5], [10, 1], [12, 1]],
  [[10, 1.5], [8, 0.5], [7, 2]],
  [[5, 1], [7, 1], [8, 1], [5, 1]],
  [[7, 3], [null, 1]],
];
const PROG_COMBAT = [[0, MIN], [-4, MAJ], [-2, MAJ], [-5, MAJ]];
const OSTINATO = [0, 0, 3, 0, 5, 0, 3, 1];
const PROG_PUZZLE = [[0, MIN], [-4, MAJ], [-7, MIN], [-5, MAJ]];

function chordFreqs(root, type, base = D3) {
  return type.map((s) => hz(root + s, base));
}

// Naplánuje jeden takt dané nálady od času t.
function scheduleBar(name, t, bar) {
  const out = moods[name].gain;
  if (name === 'explore') {
    const beat = 60 / 76;
    const [root, type] = PROG_EXPLORE[bar % 8];
    // bubny: BUM ... bum-bum
    drum(out, t, 50, 0.9, 0.9);
    drum(out, t + beat * 2.5, 60, 0.5, 0.5);
    drum(out, t + beat * 3, 50, 0.7, 0.7);
    noiseHit(out, t + beat, 0.06, 3000, 0.08, 'highpass');
    noiseHit(out, t + beat * 3.5, 0.05, 3000, 0.08, 'highpass');
    bass(out, t, hz(root - 12), beat * 3.8);
    choir(out, t, chordFreqs(root, type), beat * 3.9, 0.035);
    let pos = 0;
    for (const [n, len] of MELODY[bar % 8]) {
      if (n !== null) brass(out, t + pos * beat, hz(n), len * beat * 0.95, 0.12);
      pos += len;
    }
    return beat * 4;
  }
  if (name === 'combat') {
    const beat = 60 / 132;
    const [root, type] = PROG_COMBAT[bar % 4];
    const pattern = [1, 0, 1, 1, 1, 0, 1, 1];
    pattern.forEach((p, i) => { if (p) drum(out, t + i * beat / 2, i === 0 ? 48 : 70, i === 0 ? 1 : 0.45, 0.35); });
    noiseHit(out, t + beat, 0.15, 1800, 0.12, 'bandpass');
    noiseHit(out, t + beat * 3, 0.15, 1800, 0.12, 'bandpass');
    OSTINATO.forEach((s, i) => bass(out, t + i * beat / 2, hz(root + s - 12), beat / 2 * 0.8, 0.13));
    brass(out, t, hz(root + type[1]), beat * 0.9, 0.14);
    brass(out, t + beat * 1.5, hz(root + type[2]), beat * 0.5, 0.11);
    if (bar % 2 === 1) brass(out, t + beat * 2, hz(root + 12), beat * 1.8, 0.12);
    choir(out, t, chordFreqs(root, type), beat * 3.8, 0.03);
    return beat * 4;
  }
  // puzzle
  const beat = 60 / 60;
  const [root, type] = PROG_PUZZLE[bar % 4];
  const notes = [...chordFreqs(root, type), hz(root + 12)];
  [0, 1, 2, 3, 2, 1, 2, 3].forEach((k, i) => pluck(out, t + i * beat / 2, notes[k] * 2, 0.07));
  choir(out, t, chordFreqs(root, type), beat * 3.9, 0.022);
  drum(out, t, 45, 0.25, 0.5);
  drum(out, t + beat * 0.35, 45, 0.15, 0.4);
  return beat * 4;
}

function schedule() {
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  for (const [name, m] of Object.entries(moods)) {
    const audible = m.target > 0 || m.gain.gain.value > 0.02;
    if (!audible) { m.next = Math.max(m.next, now); continue; }
    if (m.next < now) m.next = now + 0.05;
    while (m.next < now + 0.3) {
      m.next += scheduleBar(name, m.next, m.step);
      m.step++;
    }
  }
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
