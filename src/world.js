// Stavba úrovně: místnosti, chodby, dveře, kolize, interaktivní objekty.
import * as THREE from 'three';
import { mat, makeTorch, makeChest, makeSphinx, makeGrover, makeAutomaton, makeItem, makeLever } from './models.js';
import { MIST_CLUES, SYMBOLS } from './content.js';
import { pbr } from './textures.js';

// Barevné ladění fotografických textur (pískovec, tmavší dlažba).
const WALL_TINT = 0xe0cba6;
const FLOOR_TINT = 0xb9a890;
export const wallMat = (rx, ry) => pbr('stone', rx, ry, { color: WALL_TINT, normal: 1.3, roughness: 0.92 });

// ---------- procedurální textury ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function rnd(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// pás s řeckým meandrem
const meanderTex = canvasTex(128, 32, (g, w, h) => {
  g.fillStyle = '#6a2a1a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#e0c070'; g.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const x = i * 32 + 4;
    g.beginPath();
    g.moveTo(x, 26); g.lineTo(x, 6); g.lineTo(x + 22, 6); g.lineTo(x + 22, 20);
    g.lineTo(x + 10, 20); g.lineTo(x + 10, 13); g.lineTo(x + 16, 13);
    g.moveTo(x - 4, 26); g.lineTo(x + 28, 26);
    g.stroke();
  }
});

function texMat(tex, rx, ry, extra = {}) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, ...extra });
}

export { canvasTex, wrap, rnd };

export function textTexture(lines, opts = {}) {
  const { w = 512, h = 256, bg = 'rgba(0,0,0,0)', color = '#cfe0ff', font = 'bold 34px Georgia', glow = '#7a8cff' } = opts;
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = glow; g.shadowBlur = 14;
    g.fillStyle = color;
    const arr = Array.isArray(lines) ? lines : [lines];
    const lh = h / (arr.length + 1);
    arr.forEach((l, i) => g.fillText(l, w / 2, lh * (i + 1)));
  });
}

// Zalomení textu do řádků přibližně podle počtu znaků.
function wrap(text, n) {
  const words = text.split(' ');
  const out = [];
  let line = '';
  for (const wd of words) {
    if ((line + ' ' + wd).trim().length > n) { out.push(line.trim()); line = wd; } else line += ' ' + wd;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

// Pečeť skutečných nápověd: zlatý kotouč s Δ.
let sealMat = null;
function makeSealMat() {
  const t = canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(110, 100, 10, 128, 128, 124);
    gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.55, '#e0b040'); gr.addColorStop(1, '#8a5a10');
    g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 122, 0, 7); g.fill();
    g.lineWidth = 8; g.strokeStyle = '#6a4208'; g.beginPath(); g.arc(128, 128, 100, 0, 7); g.stroke();
    g.font = 'bold 130px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff6c8'; g.fillText('Δ', 131, 141);
    g.fillStyle = '#5a3606'; g.fillText('Δ', 128, 138);
  });
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
}
// Spirála na nášlapných dlaždicích (aby se nepletla s pečetí Δ).
function makeSpiralTex() {
  return canvasTex(128, 128, (g) => {
    g.strokeStyle = '#ffd070'; g.shadowColor = '#ff9900'; g.shadowBlur = 10; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.1) { const r = 4 + a * 2.6; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
    g.stroke();
  });
}

// ---------- stavebnice úrovní (společná pro všechny questy) ----------
export function makeBuilder(scene, { wallTint = WALL_TINT, floorTint = FLOOR_TINT, ceilingTint = 0x6a5a48, friezeTex = meanderTex, torchColor = 0xff9440, flameColor = null, wallTex = 'stone' } = {}) {
  sealMat = sealMat || makeSealMat();
  const spiralTex = makeSpiralTex();
  const colliders = [];
  const solids = []; // meshe pro kolizi kamery
  const interactables = [];
  const mist = { reveal: [], hide: [], wall: null };
  const animated = [];
  const T = 0.5; // tloušťka zdí

  function box(x1, y1, z1, x2, y2, z2, material, { collide = true, solid = true, shadow = true } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1), material);
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    m.receiveShadow = true;
    m.castShadow = shadow;
    scene.add(m);
    let c = null;
    if (collide) {
      c = { min: new THREE.Vector3(x1, y1, z1), max: new THREE.Vector3(x2, y2, z2), active: true, mesh: m };
      colliders.push(c);
    }
    if (solid) solids.push(m);
    return { mesh: m, collider: c };
  }

  // Zdi mají souřadnice textury podle skutečných metrů, takže kámen navazuje i na ostění dveří.
  const WALL = pbr(wallTex, 1 / 2.6, 1 / 2.6, { color: wallTint, normal: 1.3, roughness: 0.92 });
  function worldUV(mesh) {
    const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, o = mesh.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + o.x, y = p.getY(i) + o.y, z = p.getZ(i) + o.z;
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
      if (ax > 0.5) uv.setXY(i, z, y);
      else if (ay > 0.5) uv.setXY(i, x, z);
      else uv.setXY(i, x, y);
    }
    uv.needsUpdate = true;
  }
  function wallBox(x1, y1, z1, x2, y2, z2) {
    worldUV(box(x1, y1, z1, x2, y2, z2, WALL).mesh);
  }

  // Místnost: obdélník, zdi vně obdélníku, otvory {side, c, w, h}.
  function room(x1, z1, x2, z2, { openings = [], skip = [], h = 4.5, ceiling = true, floor = 'stone', frieze = true, floorColor = null } = {}) {
    const tile = floor === 'grass' ? 3 : floor === 'sand' ? 4 : floor === 'rock' ? 4 : 2.2;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), pbr(floor, (x2 - x1) / tile, (z2 - z1) / tile, { color: floorColor ?? (floor === 'stone' ? floorTint : floor === 'rock' ? floorTint : floor === 'sand' ? new THREE.Color(1.0, 1.04, 1.16) : 0xd0d8c0), normal: floor === 'sand' ? 0.6 : 1.2, roughness: floor === 'stone' ? 0.8 : 0.95 }));
    fl.rotation.x = -Math.PI / 2;
    fl.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    fl.receiveShadow = true;
    scene.add(fl);
    if (ceiling) {
      const ce = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1 + 1, z2 - z1 + 1), pbr('rock', (x2 - x1) / 4, (z2 - z1) / 4, { color: ceilingTint, roughness: 0.95 }));
      ce.rotation.x = Math.PI / 2;
      ce.position.set((x1 + x2) / 2, h, (z1 + z2) / 2);
      scene.add(ce);
    }
    const sides = {
      s: { axis: 'x', a: x1 - T, b: x2 + T, fixed: [z1 - T, z1] },
      n: { axis: 'x', a: x1 - T, b: x2 + T, fixed: [z2, z2 + T] },
      w: { axis: 'z', a: z1, b: z2, fixed: [x1 - T, x1] },
      e: { axis: 'z', a: z1, b: z2, fixed: [x2, x2 + T] },
    };
    for (const [key, s] of Object.entries(sides)) {
      if (skip.includes(key)) continue;
      const ops = openings.filter((o) => o.side === key).sort((p, q) => p.c - q.c);
      let cur = s.a;
      const seg = (a, b, y1, y2) => {
        if (b - a < 0.01) return;
        if (s.axis === 'x') wallBox(a, y1, s.fixed[0], b, y2, s.fixed[1]);
        else wallBox(s.fixed[0], y1, a, s.fixed[1], y2, b);
      };
      for (const o of ops) {
        seg(cur, o.c - o.w / 2, 0, h);
        seg(o.c - o.w / 2, o.c + o.w / 2, o.h ?? 3, h); // nadpraží
        cur = o.c + o.w / 2;
      }
      seg(cur, s.b, 0, h);
      if (frieze) {
        // ozdobný pás s meandrem po vnitřní straně
        const len = s.b - s.a;
        const fm = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.35), texMat(friezeTex, len / 1.5, 1));
        const inset = 0.02;
        if (key === 's') { fm.position.set((s.a + s.b) / 2, h - 0.4, z1 + inset); }
        if (key === 'n') { fm.position.set((s.a + s.b) / 2, h - 0.4, z2 - inset); fm.rotation.y = Math.PI; }
        if (key === 'w') { fm.position.set(x1 + inset, h - 0.4, (s.a + s.b) / 2); fm.rotation.y = Math.PI / 2; }
        if (key === 'e') { fm.position.set(x2 - inset, h - 0.4, (s.a + s.b) / 2); fm.rotation.y = -Math.PI / 2; }
        scene.add(fm);
      }
    }
  }

  const flameMat = flameColor ? new THREE.MeshBasicMaterial({ color: flameColor }) : null;
  function torch(x, y, z, withLight = true, color = torchColor, flame = flameMat) {
    const t = makeTorch();
    t.position.set(x, y, z);
    if (flame) t.userData.flame.material = flame;
    scene.add(t);
    if (withLight) {
      const l = new THREE.PointLight(color, 26, 16, 1.8);
      l.position.set(x + (x > 0 ? -0.4 : x < -0 ? 0.4 : 0), y + 0.7, z);
      scene.add(l);
      animated.push((time) => { l.intensity = 24 + Math.sin(time * 9 + x) * 2.5 + Math.sin(time * 23 + z) * 1.8; });
    }
    animated.push((time) => { t.userData.flame.scale.y = 1.8 + Math.sin(time * 15 + x * 3) * 0.25; });
  }

  function plane(tex, w, h, x, y, z, rotY) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    scene.add(m);
    return m;
  }
  // Zlatá pečeť Δ v rohu skutečné nápovědy (ozdoby ji nemají).
  function seal(hint) {
    const { width, height } = hint.geometry.parameters;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), sealMat);
    s.position.set(width / 2 - 0.12, -height / 2 + 0.12, 0.02);
    hint.add(s);
    return s;
  }

  function addInteract(id, x, y, z, label, radius = 2.2) {
    const it = { id, pos: new THREE.Vector3(x, y, z), label, radius, enabled: true };
    interactables.push(it);
    return it;
  }

  const marble = pbr('marble', 1, 2, { color: 0xf2ece0, roughness: 0.38, envMapIntensity: 0.6 });
  function column(x, z, h, r = 0.45) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, h - 0.6, 24), marble);
    shaft.position.y = h / 2;
    g.add(shaft);
    for (const [y, s] of [[0.15, 1.35], [h - 0.15, 1.45]]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r * s, r * s, 0.3, 24), marble);
      c.position.y = y;
      g.add(c);
    }
    g.position.set(x, 0, z);
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    scene.add(g);
    return g;
  }

  // Nášlapné dlaždice a páky: výsledek se losuje při startu hry.
  const triggers = [];
  function plate(id, x, z, room) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.06, 24), mat(0xa08a5a, { roughness: 0.5, metalness: 0.3, emissive: 0x3a2a00, emissiveIntensity: 0.4 }));
    m.position.set(x, 0.03, z);
    m.receiveShadow = true;
    scene.add(m);
    const sym = plane(spiralTex, 0.8, 0.8, x, 0.07, z, 0);
    sym.rotation.x = -Math.PI / 2;
    triggers.push({ id, kind: 'plate', pos: new THREE.Vector3(x, 0, z), mesh: m, room, used: false });
  }
  function lever(id, x, z, rotY, room) {
    const l = makeLever();
    l.position.set(x, 0, z);
    l.rotation.y = rotY;
    scene.add(l);
    const it = addInteract(id, x + Math.sin(rotY) * 0.6, 1.2, z + Math.cos(rotY) * 0.6, 'Zatáhnout za páku', 1.8);
    triggers.push({ id, kind: 'lever', pos: it.pos.clone(), mesh: l, room, used: false, interact: it });
  }


  // Prach poletující ve světle. rooms: [x1, z1, x2, z2, výška]
  function dust(rooms, n = 900, color = 0xffd9a8) {
    const sprite = canvasTex(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(0.4, 'rgba(255,220,170,0.35)'); gr.addColorStop(1, 'rgba(255,200,150,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const pos = new Float32Array(n * 3);
    const base = new Float32Array(n * 3);
    const dr = rnd(21);
    for (let i = 0; i < n; i++) {
      const r = rooms[Math.floor(dr() * rooms.length)];
      base[i * 3] = r[0] + dr() * (r[2] - r[0]);
      base[i * 3 + 1] = 0.3 + dr() * (r[4] - 0.5);
      base[i * 3 + 2] = r[1] + dr() * (r[3] - r[1]);
    }
    pos.set(base);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.06, map: sprite, color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
    pts.frustumCulled = false;
    scene.add(pts);
    animated.push((time) => {
      for (let i = 0; i < n; i++) {
        const k = i * 3, ph = i * 0.37;
        pos[k] = base[k] + Math.sin(time * 0.13 + ph) * 0.6;
        pos[k + 1] = base[k + 1] + Math.sin(time * 0.09 + ph * 1.7) * 0.4;
        pos[k + 2] = base[k + 2] + Math.cos(time * 0.11 + ph * 0.6) * 0.6;
      }
      geo.attributes.position.needsUpdate = true;
    });
    return pts;
  }

  return { colliders, solids, interactables, mist, animated, triggers, T, WALL, marble, box, worldUV, wallBox, room, torch, plane, seal, addInteract, column, plate, lever, dust };
}

// ---------- Labyrint ----------
export function buildWorld(scene) {
  const B = makeBuilder(scene);
  const { colliders, solids, interactables, mist, animated, triggers, WALL, marble, box, worldUV, room, torch, plane, seal, addInteract, column, plate, lever } = B;
  // ===== 1) Vstupní síň =====
  room(-8, 0, 8, 16, { openings: [{ side: 'n', c: 0, w: 2.4 }] });
  torch(-7.7, 2.2, 6); torch(7.7, 2.2, 6); torch(-7.7, 2.2, 13.5, false);
  const rubbleMat = mat(0x6a5a48, { roughness: 0.95 });
  for (let i = 0; i < 16; i++) {
    const s = 0.4 + Math.random() * 0.8;
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), rubbleMat);
    r.position.set(-3 + Math.random() * 6, s * 0.45, 0.3 + Math.random() * 1.2);
    r.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    r.scale.y = 0.7;
    r.castShadow = true;
    scene.add(r);
  }
  box(-3.5, 0, 0, 3.5, 1.2, 1.6, mat(0x6a5a48), { solid: false }).mesh.visible = false;
  addInteract('rubble', 0, 1, 1.8, 'Prozkoumat zával');
  const crate = pbr('wood', 1, 1, { color: 0x9a8670, roughness: 0.92 });
  box(4, 0, 11, 6, 1.2, 13, crate);
  box(5.5, 0, 13.5, 7.5, 2.3, 15.5, crate);
  box(-7.5, 0, 14, -6, 1, 15.5, crate);
  // socha Athény
  const statue = new THREE.Group();
  const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, marble); m.position.set(x, y, z); m.castShadow = true; statue.add(m); return m; };
  add(new THREE.CylinderGeometry(0.7, 0.75, 0.8, 24), 0, 0.4, 0);
  add(new THREE.CylinderGeometry(0.28, 0.5, 1.8, 24), 0, 1.7, 0);
  add(new THREE.SphereGeometry(0.3, 20, 14), 0, 2.45, 0).scale.set(1.3, 0.8, 1);
  add(new THREE.SphereGeometry(0.22, 20, 14), 0, 2.85, 0);
  add(new THREE.SphereGeometry(0.24, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 2.92, 0);
  add(new THREE.BoxGeometry(0.04, 0.3, 0.45), 0, 3.2, 0);
  add(new THREE.CylinderGeometry(0.03, 0.03, 2.8, 8), 0.5, 1.9, 0);
  add(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 24), -0.45, 1.6, 0.15).rotation.z = Math.PI / 2;
  statue.position.set(-6.5, 0, 3);
  statue.rotation.y = 0.6;
  scene.add(statue);
  box(-7.2, 0, 2.3, -5.8, 3, 3.7, marble, { solid: false }).mesh.visible = false;
  addInteract('statue', -6.5, 1.2, 3, 'Prozkoumat sochu');
  // amfora
  const amph = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.18, 0.02], [0.32, 0.3], [0.34, 0.55], [0.2, 0.85], [0.12, 1.0], [0.16, 1.1]].map(([x, y]) => new THREE.Vector2(x, y)), 24), mat(0xb8582a, { roughness: 0.6 }));
  amph.position.set(4.5, 0, 2.5);
  amph.castShadow = true;
  scene.add(amph);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.15, 24, 1, true), mat(0x1a1a1a));
  band.position.set(4.5, 0.5, 2.5);
  scene.add(band);
  // Daidalova tabulka s kódem
  const plaqueTex = textTexture(['ΔΑΙΔΑΛΟΣ', '3. · 1. · 4. · 2.'], { w: 1024, h: 512, font: 'bold 120px Georgia', color: '#ffe0a0', glow: '#a06000', bg: '#5a3a18' });
  seal(plane(plaqueTex, 2.6, 1.3, -4.5, 2.2, 15.96, Math.PI));
  addInteract('plaque', -4.5, 1.5, 15.2, 'Přečíst bronzovou tabulku');
  // luk na stojanu
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, 1.4), mat(0x5a3a1a));
  rack.position.set(7.9, 1.2, 4);
  scene.add(rack);
  addInteract('bowRack', 7.2, 1.2, 4, 'Prozkoumat stojan', 1.6).enabled = false;
  // skrytý výklenek (Mlha) s destičkou lyry
  // klenutý výklenek, který odhalí jen Hekatin amulet
  const nicheTex = canvasTex(256, 320, (g, w, h) => {
    const arch = () => { g.beginPath(); g.moveTo(38, h - 10); g.lineTo(38, 120); g.arc(w / 2, 120, w / 2 - 38, Math.PI, 0); g.lineTo(w - 38, h - 10); g.closePath(); };
    const glow = g.createRadialGradient(w / 2, h * 0.55, 10, w / 2, h * 0.55, w * 0.75);
    glow.addColorStop(0, 'rgba(170,140,255,0.55)'); glow.addColorStop(1, 'rgba(90,60,200,0)');
    g.fillStyle = glow; g.fillRect(0, 0, w, h);
    arch(); g.fillStyle = '#0c0818'; g.fill();
    g.lineWidth = 10; g.strokeStyle = '#b8a0ff'; g.shadowColor = '#8a6aff'; g.shadowBlur = 24; arch(); g.stroke();
  });
  const nicheMat = new THREE.MeshBasicMaterial({ map: nicheTex, transparent: true, depthWrite: false });
  const nicheGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2), nicheMat);
  nicheGlow.position.set(-7.97, 1.3, 10.5);
  nicheGlow.rotation.y = Math.PI / 2;
  nicheGlow.visible = false;
  scene.add(nicheGlow);
  mist.reveal.push(nicheGlow);

  const grover = makeGrover();
  grover.position.set(-4.5, 0, 7);
  grover.rotation.y = Math.PI / 2;
  scene.add(grover);
  addInteract('grover', -4.5, 1.2, 7, 'Promluvit se satyrem');
  animated.push((time) => {
    grover.position.y = Math.abs(Math.sin(time * 2)) * 0.05;
    grover.userData.arms[1].rotation.z = 0.2 + Math.sin(time * 3) * 0.15;
  });

  const doorA = box(-1.2, 0, 16, 1.2, 3, 16.5, pbr('wood', 1, 1.5, { color: 0x8a6a4c, roughness: 0.85 }));
  addInteract('doorA', 0, 1.5, 15.4, 'Otevřít dveře');
  plate('plate1', 2.5, 8.5, 'entrance');

  // ===== 2) Chodba ke Sfinze =====
  room(-1.5, 16.5, 1.5, 22, { skip: ['n', 's'], h: 3.5, frieze: false });
  torch(-1.3, 2, 19);

  // ===== 3) Síň Sfingy =====
  room(-7, 22.5, 7, 34, { openings: [{ side: 's', c: 0, w: 3 }, { side: 'n', c: 0, w: 3 }], h: 6 });
  torch(-6.7, 2.4, 25); torch(6.7, 2.4, 25); torch(-6.7, 2.4, 32, false); torch(6.7, 2.4, 32, false);
  const sphinx = makeSphinx();
  sphinx.position.set(0, 0, 31.6);
  sphinx.rotation.y = Math.PI;
  scene.add(sphinx);
  const sphinxBlock = box(-2.2, 0, 30, 2.2, 3, 34, mat(0x000000), { solid: false });
  sphinxBlock.mesh.visible = false;
  const sphinxInt = addInteract('sphinx', 0, 1.5, 29.5, 'Promluvit se Sfingou', 2.5);
  for (const x of [-5, 5]) for (const z of [26, 31]) {
    column(x, z, 6);
    colliders.push({ min: new THREE.Vector3(x - 0.5, 0, z - 0.5), max: new THREE.Vector3(x + 0.5, 6, z + 0.5), active: true });
  }
  // freska s Oidipem
  const frescoTex = canvasTex(512, 384, (g, w, h) => {
    g.fillStyle = '#c8a878'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#a07a48'; g.fillRect(0, 280, w, 104);
    g.fillStyle = '#c9a25a'; g.beginPath(); g.ellipse(340, 210, 110, 55, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(250, 150, 34, 0, 7); g.fill();
    g.fillStyle = '#e8d8b0'; g.beginPath(); g.moveTo(330, 170); g.quadraticCurveTo(420, 60, 480, 110); g.quadraticCurveTo(420, 150, 360, 190); g.fill();
    g.fillStyle = '#6a3a2a'; g.fillRect(105, 140, 40, 120);
    g.beginPath(); g.arc(125, 120, 24, 0, 7); g.fill();
    g.fillStyle = '#c86a4a'; g.beginPath(); g.ellipse(112, 268, 22, 12, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(140, 268, 22, 12, 0, 0, 7); g.fill();
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 5; g.beginPath(); g.moveTo(150, 170); g.lineTo(190, 150); g.stroke();
    g.font = 'bold 54px Georgia'; g.fillStyle = '#3a1a0a'; g.textAlign = 'center'; g.fillText('ΟΙΔΙΠΟΥΣ', w / 2, 350);
    g.strokeStyle = '#7a4a1a'; g.lineWidth = 12; g.strokeRect(0, 0, w, h);
  });
  seal(plane(frescoTex, 3.2, 2.4, -6.96, 2.6, 28.5, Math.PI / 2));
  addInteract('oedipus', -6.2, 1.5, 28.5, 'Prohlédnout fresku', 2.2);
  lever('lever1', 6.95, 28.5, -Math.PI / 2, 'sphinx');

  // ===== 4) Chodba pekelných psů =====
  room(-3.5, 34.5, 3.5, 52, { skip: ['n', 's'], h: 4 });
  torch(-3.2, 2.2, 38); torch(3.2, 2.2, 45); torch(-3.2, 2.2, 50, false);
  worldUV(box(-3.5, 0, 41, -2.2, 4, 42, WALL).mesh); // výstupky
  worldUV(box(2.2, 0, 47, 3.5, 4, 48, WALL).mesh);
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.4, 4, 8), mat(0xe8e0c8));
    b.position.set(-2.5 + Math.random() * 5, 0.05, 38 + Math.random() * 12);
    b.rotation.set(Math.PI / 2, 0, Math.random() * 3);
    scene.add(b);
  }
  plate('plate2', -1.5, 37.5, 'hounds');
  // tajná skrýš (jen s amuletem)
  const secretGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.6), nicheMat);
  secretGlow.position.set(-3.46, 1.2, 49);
  secretGlow.rotation.y = Math.PI / 2;
  secretGlow.visible = false;
  scene.add(secretGlow);
  mist.reveal.push(secretGlow);
  const secretInt = addInteract('secret', -2.9, 1.2, 49, 'Prohledat tajnou skrýš', 1.8);
  secretInt.enabled = false;

  // ===== 5) Hekatina svatyně (Mlha) =====
  room(-8, 52.5, 8, 64, { openings: [{ side: 's', c: 0, w: 3.5 }, { side: 'e', c: 58, w: 3 }], h: 5 });
  const mistLight = new THREE.PointLight(0x8a7aff, 12, 16, 1.5);
  mistLight.position.set(0, 3.5, 58);
  scene.add(mistLight);
  torch(-7.7, 2.2, 54.5, false); torch(7.7, 2.2, 54.5);
  box(-1, 0, 62.5, 1, 1, 63.8, mat(0x2a2a3a));
  const brazier = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x3a3050, { metalness: 0.6, roughness: 0.3 }));
  brazier.position.set(0, 1.5, 63.1);
  scene.add(brazier);
  const fire = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshBasicMaterial({ color: 0xa080ff }));
  fire.position.set(0, 1.55, 63.1);
  scene.add(fire);
  animated.push((time) => { mistLight.intensity = 11 + Math.sin(time * 2) * 2; fire.scale.y = 1.2 + Math.sin(time * 8) * 0.25; });
  // socha Hekaty
  const hek = new THREE.Group();
  const dark = mat(0x3a3448, { roughness: 0.4, metalness: 0.3 });
  const hm = (geo, x, y, z) => { const m = new THREE.Mesh(geo, dark); m.position.set(x, y, z); m.castShadow = true; hek.add(m); return m; };
  hm(new THREE.CylinderGeometry(0.6, 0.65, 0.6, 24), 0, 0.3, 0);
  hm(new THREE.CylinderGeometry(0.25, 0.55, 2, 24), 0, 1.6, 0);
  for (let i = 0; i < 3; i++) hm(new THREE.SphereGeometry(0.17, 16, 12), Math.cos(i * 2.09) * 0.18, 2.75, Math.sin(i * 2.09) * 0.18);
  hek.position.set(-6.3, 0, 62.5);
  scene.add(hek);
  box(-6.95, 0, 61.85, -5.65, 2.8, 63.15, dark, { solid: false }).mesh.visible = false;
  addInteract('hecate', -6.3, 1.2, 61.5, 'Prohlédnout sochu', 1.8);
  lever('lever2', -7.95, 60, Math.PI / 2, 'mist');

  const chest = makeChest();
  chest.position.set(5.5, 0, 62.6);
  chest.rotation.y = Math.PI;
  scene.add(chest);
  box(4.9, 0, 62.2, 6.1, 0.8, 63, mat(0x000000), { solid: false }).mesh.visible = false;
  addInteract('chest', 5.5, 0.8, 61.6, 'Otevřít truhlu');

  const automaton = makeAutomaton();
  automaton.position.set(-5.5, 0, 55.5);
  automaton.rotation.y = Math.PI / 4;
  scene.add(automaton);
  addInteract('automaton', -5.5, 1.2, 55.5, 'Promluvit s automatem');
  animated.push((time) => { automaton.userData.gear.rotation.z = time * 2; automaton.userData.head.rotation.y = Math.sin(time * 0.7) * 0.8; });

  // tabulka s nápisy, viditelná jen s amuletem
  const clueLines = MIST_CLUES.flatMap((c) => wrap(c, 44));
  const tablet = plane(textTexture(clueLines, { w: 1024, h: 640, font: 'bold 40px Georgia', color: '#dfe8ff', glow: '#7a8cff', bg: 'rgba(20,16,40,0.78)' }), 5.2, 3.25, 0, 3.15, 63.95, Math.PI);
  seal(tablet);
  tablet.visible = false;
  mist.reveal.push(tablet);
  const mistTabletInt = addInteract('mistTablet', 0, 1.6, 61.8, 'Přečíst nápisy', 2.6);
  mistTabletInt.enabled = false;
  const fakeDoor = box(-8, 0, 56.8, -7.8, 3, 59.2, pbr('wood', 1, 1.5, { color: 0x8a6a4c, roughness: 0.85 }), { collide: false, solid: false });
  mist.hide.push(fakeDoor.mesh);
  const fakeInt = addInteract('fakeDoor', -7.2, 1.5, 58, 'Prozkoumat dveře');
  const mistWall = box(8, 0, 56.5, 8.5, 3, 59.5, WALL);
  worldUV(mistWall.mesh);
  mist.wall = mistWall;
  const mistWallInt = addInteract('mistWall', 7.4, 1.5, 58, 'Prozkoumat zeď');

  // ===== 6) Chodba se symbolovým zámkem =====
  room(8.5, 56.5, 14, 59.5, { skip: ['e', 'w'], h: 3.2, frieze: false });
  const lockDoor = box(8.55, 0, 56.5, 8.9, 3, 59.5, mat(0x9a7a3a, { metalness: 0.6, roughness: 0.35 }));
  const symTex = textTexture([SYMBOLS.map((s) => s.icon).join(' '), '□ □ □ □'], { w: 512, h: 256, font: '48px serif', color: '#fff2c0', glow: '#ffaa00' });
  const symPlane = plane(symTex, 2.4, 1.2, 8.53, 1.8, 58, -Math.PI / 2);
  symPlane.visible = false;
  mist.reveal.push(symPlane);
  const lockInt = addInteract('lock', 7.6, 1.5, 58, 'Použít symbolový zámek');
  lockInt.enabled = false;

  // ===== 7) Aréna Minotaura =====
  room(14.5, 44, 44, 72, { openings: [{ side: 'w', c: 58, w: 3 }, { side: 'e', c: 58, w: 3.5, h: 4 }], h: 7, ceiling: false, floor: 'sand' });
  const pillars = [];
  for (const [x, z] of [[22, 51], [36, 51], [22, 65], [36, 65]]) {
    const g = column(x, z, 6.2, 0.95);
    const p = g.children[0];
    const c = { min: new THREE.Vector3(x - 0.95, 0, z - 0.95), max: new THREE.Vector3(x + 0.95, 6, z + 0.95), active: true, mesh: p, pillar: true };
    colliders.push(c);
    solids.push(p);
    pillars.push({ x, z, mesh: p, collider: c, cracks: 0 });
  }
  torch(14.8, 2.5, 50); torch(14.8, 2.5, 66); torch(43.7, 2.5, 52); torch(43.7, 2.5, 64);
  // hromada přileb
  for (let i = 0; i < 7; i++) {
    const hlm = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(0xb08a3a, { metalness: 0.8, roughness: 0.35 }));
    hlm.position.set(17 + Math.random() * 1.2, 0.1 + (i > 4 ? 0.25 : 0), 46 + Math.random() * 1.2);
    hlm.rotation.set(Math.random(), Math.random() * 3, Math.random() - 0.5);
    hlm.castShadow = true;
    scene.add(hlm);
  }
  addInteract('helmets', 17.6, 0.6, 46.6, 'Prohlédnout přilby', 1.8);
  plate('plate3', 29, 62, 'arena');
  // Daidalova skříň s Ariadninou nití
  const cage = new THREE.Group();
  const bronze = mat(0x9a6a2a, { metalness: 0.8, roughness: 0.3 });
  const cb = (geo, x, y, z) => { const m = new THREE.Mesh(geo, bronze); m.position.set(x, y, z); m.castShadow = true; cage.add(m); return m; };
  cb(new THREE.BoxGeometry(1.8, 0.2, 1.4), 0, 0.1, 0);
  cb(new THREE.BoxGeometry(1.8, 0.2, 1.4), 0, 2.1, 0);
  for (let i = 0; i < 7; i++) cb(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 8), -0.8 + i * 0.27, 1.1, 0.68);
  for (const x of [-0.85, 0.85]) cb(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 8), x, 1.1, -0.65);
  const dialTex = textTexture(['Δ ? ? ? ?'], { w: 512, h: 128, font: 'bold 64px Georgia', color: '#ffe0a0', glow: '#ff9900', bg: '#3a2410' });
  const dialPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ map: dialTex }));
  dialPlane.position.set(0, 2.45, 0.71);
  cage.add(dialPlane);
  cage.position.set(40.5, 0, 69.5);
  cage.rotation.y = Math.PI;
  scene.add(cage);
  const cageBars = cage.children.slice(2, 9);
  box(39.6, 0, 68.8, 41.4, 2.2, 70.2, bronze, { solid: false }).mesh.visible = false;
  const cageInt = addInteract('cage', 40.5, 1.2, 68.0, 'Otevřít Daidalovu skříň', 2.2);
  // brána Δ
  const gateTex = textTexture(['Δ'], { w: 256, h: 256, font: 'bold 160px Georgia', color: '#ffe08a', glow: '#ff9900', bg: '#5a3a1a' });
  const gate = box(44, 0, 56.25, 44.5, 4, 59.75, new THREE.MeshStandardMaterial({ map: gateTex, metalness: 0.4, roughness: 0.5, emissive: 0x3a2000, emissiveIntensity: 0.4 }));
  addInteract('gate', 43.2, 1.5, 58, 'Prozkoumat Daidalovu bránu', 2.4);
  const mosaicTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#2a5a8a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd040'; g.beginPath(); g.arc(420, 60, 36, 0, 7); g.fill();
    g.fillStyle = '#1a3a6a'; g.fillRect(0, 190, w, 66);
    g.fillStyle = '#e0b08a'; g.fillRect(250, 120, 18, 40);
    g.fillStyle = '#f8f0e0';
    g.beginPath(); g.moveTo(259, 128); g.lineTo(200, 100); g.lineTo(230, 140); g.fill();
    g.beginPath(); g.moveTo(259, 128); g.lineTo(320, 95); g.lineTo(290, 140); g.fill();
    for (let i = 0; i < 12; i++) { g.fillRect(230 + Math.random() * 60, 160 + Math.random() * 30, 6, 3); }
    g.fillStyle = '#e0b08a'; g.fillRect(60, 130, 22, 60);
    g.fillStyle = '#ddd'; g.fillRect(56, 118, 30, 14);
    g.font = 'bold 28px Georgia'; g.fillStyle = '#ffe8a0'; g.fillText('I . . .', 30, 240);
    g.strokeStyle = '#d4af37'; g.lineWidth = 10; g.strokeRect(0, 0, w, h);
  });
  seal(plane(mosaicTex, 4, 2, 43.95, 2.6, 64.5, -Math.PI / 2));
  addInteract('mosaic', 43, 1.5, 64.5, 'Prohlédnout mozaiku', 2.6);

  // ===== 8) Východ do tábora =====
  room(44.5, 54, 56, 62, { skip: ['w'], h: 6, ceiling: false, floor: 'grass', frieze: false });
  const sign = textTexture(['TÁBOR POLOKREVNÝCH', 'Camp Half-Blood'], { w: 512, h: 256, font: 'bold 36px Georgia', color: '#fff', glow: '#f07a1a', bg: '#3a2a1a' });
  plane(sign, 4, 2, 55.9, 3, 58, -Math.PI / 2);

  // ===== Atmosféra: prach ve světle pochodní a sluneční paprsky v aréně =====
  B.dust([[-8, 0, 8, 16, 4], [-7, 22.5, 7, 34, 5], [-3.5, 34.5, 3.5, 52, 3.5], [-8, 52.5, 8, 64, 4.5], [14.5, 44, 44, 72, 7]]);

  const shaftMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(0xffd8a0) } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float time; uniform vec3 color; varying vec3 vN; varying vec3 vV; varying float vY;
      void main(){ float edge = pow(abs(dot(vN, vV)), 2.5); float along = smoothstep(0.0, 0.25, vY) * smoothstep(1.0, 0.6, vY);
        float flick = 0.85 + 0.15 * sin(time * 0.7 + vY * 6.0);
        gl_FragColor = vec4(color * edge * along * flick * 0.16, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const sunDir = new THREE.Vector3(9, -30, 18).normalize();
  for (const [x, z, r] of [[20, 49, 1.1], [26, 47.5, 0.8], [31, 50, 1.3], [22.5, 55, 0.7]]) {
    const len = 16;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 1.5, len, 20, 1, true), shaftMat);
    const top = new THREE.Vector3(x, 7.5, z);
    shaft.position.copy(top).addScaledVector(sunDir, len / 2);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), sunDir);
    shaft.renderOrder = 5;
    scene.add(shaft);
  }
  animated.push((time) => { shaftMat.uniforms.time.value = time; });

  return {
    colliders, solids, interactables, mist, animated, pillars, triggers,
    doorA, sphinx, sphinxBlock, sphinxInt, chest, mistWall, mistWallInt, mistTabletInt, fakeInt, lockDoor, lockInt, gate,
    cage, cageBars, cageInt, secretInt,
    rooms: {
      entrance: [-8, 0, 8, 16], sphinx: [-7, 22.5, 7, 34], hounds: [-3.5, 34.5, 3.5, 52], mist: [-8, 52.5, 8, 64], arena: [14.5, 44, 44, 72],
    },
    wanderPaths: {
      theseus: [[-3.5, 24], [3.5, 24], [3.5, 27.5], [-3.5, 27.5]],
      ikaros: [[9.5, 58], [13.2, 58]],
    },
    spawn: {
      start: new THREE.Vector3(0, 0, 5),
      sphinx: new THREE.Vector3(0, 0, 36),
      mist: new THREE.Vector3(0, 0, 54.5),
      arena: new THREE.Vector3(17, 0, 58),
    },
    itemSpots: {
      bow: new THREE.Vector3(7.5, 1.3, 4),
      bronzeKey: new THREE.Vector3(6.5, 2.75, 14.5),
      lyraTile: new THREE.Vector3(-7.6, 1.3, 10.5),
      ambrosia1: new THREE.Vector3(-2.6, 0.6, 36.5),
      ambrosia2: new THREE.Vector3(16, 0.6, 70),
      quiver1: new THREE.Vector3(2.6, 0.5, 43.5),
      quiver2: new THREE.Vector3(6.5, 0.5, 53.5),
      quiver3: new THREE.Vector3(16, 0.5, 46.5),
      quiver4: new THREE.Vector3(42.5, 0.5, 46),
      thread: new THREE.Vector3(40.5, 1.0, 69.5),
    },
    makeItem,
  };
}
