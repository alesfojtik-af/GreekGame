// Jemné povrchy pro postavy (látka, džínovina, srst, kůže, vlasy, roh, peří), kreslené v prohlížeči.
// Každý povrch má světlostní mapu (násobí barvu materiálu) a mapu reliéfu.
import * as THREE from 'three';

const N = 256;
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function canvas() {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  return c;
}

// Kreslí tah i přes okraj, aby se textura plynule opakovala.
function wrapped(g, draw) {
  for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { g.save(); g.translate(dx, dy); draw(g); g.restore(); }
}

function heightToNormal(hc, strength) {
  const src = hc.getContext('2d').getImageData(0, 0, N, N).data;
  const h = (x, y) => src[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  const out = canvas();
  const g = out.getContext('2d');
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let nx = (h(x - 1, y) - h(x + 1, y)) * strength;
    let ny = (h(x, y + 1) - h(x, y - 1)) * strength;
    const l = Math.hypot(nx, ny, 1);
    const i = (y * N + x) * 4;
    img.data[i] = (nx / l * 0.5 + 0.5) * 255;
    img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return out;
}

function blur(c, px) {
  const o = canvas();
  const g = o.getContext('2d');
  g.filter = `blur(${px}px)`;
  wrapped(g, (gg) => gg.drawImage(c, 0, 0));
  return o;
}

function grain(g, amount, size = 1) {
  for (let i = 0; i < N * N * 0.25 / size; i++) {
    const v = Math.floor(128 + (rnd() - 0.5) * 255 * amount);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(rnd() * N, rnd() * N, size, size);
  }
}

// Každý recept nakreslí výšku (šedá) a světlost (šedá, 1 = beze změny barvy).
const RECIPES = {
  knit(h, a) {
    h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
    for (let y = 0; y < N; y += 4) for (let x = 0; x < N; x += 4) {
      h.fillStyle = '#c8c8c8';
      h.beginPath(); h.ellipse(x + 1, y + 2, 1.2, 2, 0.5, 0, 7); h.ellipse(x + 3, y + 2, 1.2, 2, -0.5, 0, 7); h.fill();
    }
    a.fillStyle = '#f2f2f2'; a.fillRect(0, 0, N, N);
    a.globalAlpha = 0.25; grain(a, 0.4, 2); a.globalAlpha = 1;
    return { strength: 2.5, blur: 0.4 };
  },
  denim(h, a) {
    h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
    a.fillStyle = '#e0e0e0'; a.fillRect(0, 0, N, N);
    h.lineWidth = 1.6; a.lineWidth = 1;
    for (let i = -N; i < 2 * N; i += 3) {
      h.strokeStyle = '#b8b8b8';
      wrapped(h, (g) => { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + N, N); g.stroke(); });
      a.strokeStyle = `rgba(255,255,255,${0.15 + rnd() * 0.3})`;
      a.beginPath(); a.moveTo(i + 1, 0); a.lineTo(i + 1 + N, N); a.stroke();
    }
    a.globalAlpha = 0.35; grain(a, 0.6, 2); a.globalAlpha = 1;
    // vybledlá místa
    for (let i = 0; i < 6; i++) {
      const gr = a.createRadialGradient(0, 0, 0, 0, 0, 50);
      gr.addColorStop(0, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      const x = rnd() * N, y = rnd() * N;
      wrapped(a, (g) => { g.translate(x, y); g.fillStyle = gr; g.fillRect(-50, -50, 100, 100); });
    }
    return { strength: 2, blur: 0.3 };
  },
  fur(h, a) {
    h.fillStyle = '#606060'; h.fillRect(0, 0, N, N);
    a.fillStyle = '#d8d8d8'; a.fillRect(0, 0, N, N);
    for (let i = 0; i < 5000; i++) {
      const x = rnd() * N, y = rnd() * N, len = 6 + rnd() * 12, ang = Math.PI / 2 + (rnd() - 0.5) * 0.5;
      const v = 90 + rnd() * 165;
      const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
      wrapped(h, (g) => { g.strokeStyle = `rgba(${v},${v},${v},0.7)`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke(); });
      const c = 150 + rnd() * 105;
      wrapped(a, (g) => { g.strokeStyle = `rgba(${c},${c},${c},0.35)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke(); });
    }
    return { strength: 3, blur: 0 };
  },
  hair(h, a) {
    h.fillStyle = '#606060'; h.fillRect(0, 0, N, N);
    a.fillStyle = '#c8c8c8'; a.fillRect(0, 0, N, N);
    for (let i = 0; i < 2500; i++) {
      const x = rnd() * N, y = rnd() * N, len = 30 + rnd() * 50, bend = (rnd() - 0.5) * 12;
      const v = 80 + rnd() * 175;
      const c = 140 + rnd() * 115;
      const path = (g) => { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + bend, y + len / 2, x + bend * 0.4, y + len); g.stroke(); };
      wrapped(h, (g) => { g.strokeStyle = `rgba(${v},${v},${v},0.6)`; g.lineWidth = 1.3; path(g); });
      wrapped(a, (g) => { g.strokeStyle = `rgba(${c},${c},${c},0.4)`; g.lineWidth = 1; path(g); });
    }
    return { strength: 3, blur: 0 };
  },
  skin(h, a) {
    h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
    grain(h, 0.5, 1);
    a.fillStyle = '#f4f4f4'; a.fillRect(0, 0, N, N);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * N, y = rnd() * N, r = 10 + rnd() * 30;
      const gr = a.createRadialGradient(0, 0, 0, 0, 0, r);
      const d = rnd() < 0.5;
      gr.addColorStop(0, d ? 'rgba(200,150,140,0.12)' : 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      wrapped(a, (g) => { g.translate(x, y); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); });
    }
    return { strength: 1.2, blur: 0.6 };
  },
  leather(h, a) {
    h.fillStyle = '#909090'; h.fillRect(0, 0, N, N);
    for (let i = 0; i < 900; i++) {
      const x = rnd() * N, y = rnd() * N, l = 4 + rnd() * 10, ang = rnd() * Math.PI;
      wrapped(h, (g) => { g.strokeStyle = 'rgba(40,40,40,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); g.stroke(); });
    }
    a.fillStyle = '#e8e8e8'; a.fillRect(0, 0, N, N);
    a.globalAlpha = 0.4; grain(a, 0.5, 3); a.globalAlpha = 1;
    return { strength: 2.5, blur: 0.8 };
  },
  horn(h, a) {
    const gr = a.createLinearGradient(0, 0, N, 0);
    gr.addColorStop(0, '#9a8a70'); gr.addColorStop(0.55, '#f4ecdc'); gr.addColorStop(0.85, '#e8dcc0'); gr.addColorStop(1, '#3a3028');
    a.fillStyle = gr; a.fillRect(0, 0, N, N);
    h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
    for (let x = 0; x < N * 0.8; x += 4 + rnd() * 6) { h.fillStyle = `rgba(30,30,30,${0.3 + rnd() * 0.4})`; h.fillRect(x, 0, 1.5, N); }
    return { strength: 2, blur: 0.6 };
  },
  bronze(h, a) {
    h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
    for (let i = 0; i < 500; i++) {
      const x = rnd() * N, y = rnd() * N, r = 3 + rnd() * 6;
      const gr = h.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, 'rgba(40,40,40,0.5)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
      wrapped(h, (g) => { g.translate(x, y); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); });
    }
    a.fillStyle = '#e8e8e8'; a.fillRect(0, 0, N, N);
    for (let i = 0; i < 25; i++) {
      const x = rnd() * N, y = rnd() * N, r = 10 + rnd() * 25;
      const gr = a.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, 'rgba(90,140,110,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      wrapped(a, (g) => { g.translate(x, y); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); });
    }
    return { strength: 2, blur: 0.5 };
  },
  chitin(h, a) {
    h.fillStyle = '#808080'; h.fillRect(0, 0, N, N);
    for (let y = 0; y < N; y += 16) { h.fillStyle = 'rgba(30,30,30,0.6)'; h.fillRect(0, y, N, 2); }
    grain(h, 0.3, 2);
    a.fillStyle = '#e0e0e0'; a.fillRect(0, 0, N, N);
    a.globalAlpha = 0.3; grain(a, 0.5, 4); a.globalAlpha = 1;
    return { strength: 1.5, blur: 1 };
  },
};

const cache = {};
function surface(kind) {
  if (cache[kind]) return cache[kind];
  const hc = canvas(), ac = canvas();
  const { strength, blur: b } = RECIPES[kind](hc.getContext('2d'), ac.getContext('2d'));
  const tex = (c, color) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  cache[kind] = { map: tex(ac, true), normalMap: tex(heightToNormal(b ? blur(hc, b) : hc, strength), false) };
  return cache[kind];
}

const mats = new Map();
// Materiál s povrchem. repeat = kolikrát se vzor opakuje na jednom dílu.
export function smat(kind, color, opts = {}, repeat = [2, 2]) {
  const key = kind + color + JSON.stringify(opts) + repeat;
  if (mats.has(key)) return mats.get(key);
  const s = surface(kind);
  const clone = (t) => { const c = t.clone(); c.repeat.set(repeat[0], repeat[1]); c.needsUpdate = true; return c; };
  const { normal = 1, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial({ color, map: clone(s.map), normalMap: clone(s.normalMap), roughness: 0.75, envMapIntensity: 0.35, ...rest });
  m.normalScale.set(normal, normal);
  mats.set(key, m);
  return m;
}

// Potisk trička: barva látky a nápis na prsou (střed předního dílu je u = 0.5).
export function shirtPrint(color, lines) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 512, 256);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.textAlign = 'center';
  g.font = 'bold 15px Georgia';
  g.fillText(lines[0], 256, 92);
  g.font = 'bold 22px Georgia';
  g.fillText(lines[1], 256, 116);
  g.beginPath(); g.arc(256, 140, 9, 0, 7); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const k = surface('knit');
  const n = k.normalMap.clone(); n.repeat.set(10, 6); n.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({ map: t, normalMap: n, roughness: 0.85, envMapIntensity: 0.3 });
  m.normalScale.set(0.45, 0.45);
  return m;
}
