// Zvuky a hudba syntetizované přes Web Audio, bez externích souborů.

let ctx = null;
let master = null;
let musicGain = null;
let muted = false;

export function initAudio() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.18;
  musicGain.connect(master);
  startMusic();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

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
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, vol = 0.3, filterFreq = 1200, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export const sfx = {
  swing: () => noise(0.18, 0.25, 2500),
  hit: () => { tone(180, 0.15, 'square', 0.2, 80); noise(0.1, 0.2, 800); },
  clang: () => { tone(900, 0.3, 'triangle', 0.2, 600); tone(1350, 0.25, 'triangle', 0.1); },
  hurt: () => tone(300, 0.3, 'sawtooth', 0.2, 120),
  pickup: () => { tone(660, 0.12, 'triangle', 0.25); tone(990, 0.2, 'triangle', 0.25, null, 0.1); },
  door: () => { noise(0.8, 0.3, 300); tone(70, 0.8, 'sawtooth', 0.15, 50); },
  jump: () => tone(300, 0.12, 'sine', 0.12, 500),
  growl: () => { tone(90, 0.5, 'sawtooth', 0.15, 60); noise(0.4, 0.1, 400); },
  roar: () => { tone(110, 1.0, 'sawtooth', 0.25, 55); noise(0.9, 0.2, 500); },
  crash: () => { noise(0.7, 0.45, 600); tone(60, 0.6, 'square', 0.25, 30); },
  correct: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.25, 'triangle', 0.2, null, i * 0.1)); },
  wrong: () => { tone(220, 0.25, 'square', 0.15); tone(160, 0.35, 'square', 0.15, null, 0.2); },
  mist: () => { tone(400, 1.2, 'sine', 0.15, 1200); tone(600, 1.2, 'sine', 0.1, 1800, 0.2); },
  victory: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'triangle', 0.2, null, i * 0.15)); },
  step: () => noise(0.05, 0.04, 500),
};

// Jednoduchá ambientní hudba: dórský mód, drone + "lyra" arpeggio.
function startMusic() {
  const drone = ctx.createOscillator();
  const drone2 = ctx.createOscillator();
  const dg = ctx.createGain();
  drone.type = 'sine';
  drone2.type = 'sine';
  drone.frequency.value = 73.4; // D2
  drone2.frequency.value = 110; // A2
  dg.gain.value = 0.25;
  drone.connect(dg);
  drone2.connect(dg);
  dg.connect(musicGain);
  drone.start();
  drone2.start();

  const scale = [293.7, 329.6, 349.2, 392, 440, 493.9, 523.3, 587.3]; // D dórská
  let step = 0;
  const pattern = [0, 2, 4, 7, 4, 2, 1, 3, 5, 3, 0, 4];
  setInterval(() => {
    if (!ctx || muted) return;
    if (Math.random() < 0.25) { step++; return; }
    const f = scale[pattern[step % pattern.length]];
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + 1.7);
    step++;
  }, 650);
}
