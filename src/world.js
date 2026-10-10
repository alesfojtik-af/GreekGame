// Stavba úrovně: místnosti, chodby, dveře, kolize, interaktivní objekty.
import * as THREE from 'three';
import { mat, makeTorch, makeChest, makeSphinx, makeGrover, makeAutomaton, makeItem } from './models.js';
import { MIST_CLUES, SYMBOLS } from './content.js';

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

const stoneTex = canvasTex(256, 256, (g, w, h) => {
  const r = rnd(7);
  g.fillStyle = '#8a7a64'; g.fillRect(0, 0, w, h);
  const rows = 4, bh = h / rows;
  for (let y = 0; y < rows; y++) {
    const off = y % 2 ? 64 : 0;
    for (let x = -1; x < 3; x++) {
      const v = 120 + Math.floor(r() * 30);
      g.fillStyle = `rgb(${v + 10},${v},${v - 20})`;
      g.fillRect(x * 128 + off + 3, y * bh + 3, 122, bh - 6);
    }
  }
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
    g.fillRect(r() * w, r() * h, 2, 2);
  }
});

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

const floorTex = canvasTex(256, 256, (g, w, h) => {
  const r = rnd(3);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = 90 + Math.floor(r() * 25);
    g.fillStyle = `rgb(${v + 15},${v + 5},${v - 10})`;
    g.fillRect(x * 64, y * 64, 64, 64);
    g.strokeStyle = 'rgba(30,20,10,0.6)';
    g.strokeRect(x * 64 + 0.5, y * 64 + 0.5, 63, 63);
  }
});

const sandTex = canvasTex(256, 256, (g, w, h) => {
  const r = rnd(11);
  g.fillStyle = '#b89a6a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '255,240,200' : '80,60,30'},${r() * 0.2})`;
    g.fillRect(r() * w, r() * h, 2, 2);
  }
});

const grassTex = canvasTex(128, 128, (g, w, h) => {
  const r = rnd(5);
  g.fillStyle = '#4a8a3a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 800; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '120,200,90' : '30,70,20'},0.5)`;
    g.fillRect(r() * w, r() * h, 1, 3);
  }
});

function texMat(tex, rx, ry, extra = {}) {
  const t = tex.clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, ...extra });
}

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

// ---------- svět ----------
export function buildWorld(scene) {
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

  function wallBox(x1, y1, z1, x2, y2, z2) {
    const len = Math.max(x2 - x1, z2 - z1);
    box(x1, y1, z1, x2, y2, z2, texMat(stoneTex, len / 3, (y2 - y1) / 3));
  }

  // Místnost: obdélník, zdi vně obdélníku, otvory {side, c, w, h}.
  function room(x1, z1, x2, z2, { openings = [], skip = [], h = 4.5, ceiling = true, floor = floorTex, frieze = true } = {}) {
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), texMat(floor, (x2 - x1) / 4, (z2 - z1) / 4));
    fl.rotation.x = -Math.PI / 2;
    fl.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    fl.receiveShadow = true;
    scene.add(fl);
    if (ceiling) {
      const ce = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1 + 1, z2 - z1 + 1), mat(0x3a3028));
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
        const fm = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.35), texMat(meanderTex, len / 1.5, 1));
        const inset = 0.02;
        if (key === 's') { fm.position.set((s.a + s.b) / 2, h - 0.4, z1 + inset); }
        if (key === 'n') { fm.position.set((s.a + s.b) / 2, h - 0.4, z2 - inset); fm.rotation.y = Math.PI; }
        if (key === 'w') { fm.position.set(x1 + inset, h - 0.4, (s.a + s.b) / 2); fm.rotation.y = Math.PI / 2; }
        if (key === 'e') { fm.position.set(x2 - inset, h - 0.4, (s.a + s.b) / 2); fm.rotation.y = -Math.PI / 2; }
        scene.add(fm);
      }
    }
  }

  function torch(x, y, z, rotY = 0, withLight = true) {
    const t = makeTorch();
    t.position.set(x, y, z);
    t.rotation.y = rotY;
    t.rotation.x = 0;
    scene.add(t);
    if (withLight) {
      const l = new THREE.PointLight(0xff9a40, 18, 14, 1.6);
      l.position.set(x, y + 0.6, z);
      scene.add(l);
      animated.push((time) => { l.intensity = 16 + Math.sin(time * 9 + x) * 2 + Math.sin(time * 23 + z) * 1.5; });
    }
    animated.push((time) => { t.userData.flame.scale.y = 1 + Math.sin(time * 15 + x * 3) * 0.15; });
  }

  function plane(tex, w, h, x, y, z, rotY) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    scene.add(m);
    return m;
  }

  function addInteract(id, x, y, z, label, radius = 2.2) {
    const it = { id, pos: new THREE.Vector3(x, y, z), label, radius, enabled: true };
    interactables.push(it);
    return it;
  }

  // ===== 1) Vstupní síň =====
  room(-8, 0, 8, 16, { openings: [{ side: 'n', c: 0, w: 2.4 }] });
  torch(-7.7, 2.2, 6, 0); torch(7.7, 2.2, 6, 0); torch(-7.7, 2.2, 13, 0, false);
  // zával na jihu
  const rubbleMat = mat(0x6a5a48);
  for (let i = 0; i < 14; i++) {
    const s = 0.5 + Math.random() * 0.9;
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rubbleMat);
    r.position.set(-3 + Math.random() * 6, s * 0.5, 0.3 + Math.random() * 1.2);
    r.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    r.castShadow = true;
    scene.add(r);
  }
  box(-3.5, 0, 0, 3.5, 1.2, 1.6, mat(0x6a5a48), { solid: false }).mesh.visible = false;
  addInteract('rubble', 0, 1, 1.8, 'Prozkoumat zával');
  // bedny s klíčem
  const crate = mat(0x7a5a32);
  box(4, 0, 11, 6, 1.2, 13, crate);
  box(5.5, 0, 13.5, 7.5, 2.3, 15.5, crate);
  box(-7.5, 0, 14, -6, 1, 15.5, crate);
  // socha Athény
  const statue = new THREE.Group();
  const marble = mat(0xe8e4dc);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), marble); ped.position.y = 0.4; statue.add(ped);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.8, 8), marble); body.position.y = 1.7; statue.add(body);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), marble); hd.position.y = 2.8; statue.add(hd);
  const helm = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 6), marble); helm.position.y = 3.05; statue.add(helm);
  const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 5), mat(0xc8a050)); spear.position.set(0.45, 1.9, 0); statue.add(spear);
  statue.position.set(-6.5, 0, 3);
  statue.traverse((o) => { o.castShadow = true; });
  scene.add(statue);
  box(-7.1, 0, 2.4, -5.9, 3, 3.6, marble, { solid: false }).mesh.visible = false;
  addInteract('statue', -6.5, 1.2, 3, 'Prozkoumat sochu');

  const grover = makeGrover();
  grover.position.set(-5, 0, 10);
  grover.rotation.y = Math.PI / 2;
  scene.add(grover);
  addInteract('grover', -5, 1.2, 10, 'Promluvit se satyrem');
  animated.push((time) => { grover.position.y = Math.abs(Math.sin(time * 2)) * 0.05; });

  // dveře A
  const doorA = box(-1.2, 0, 16, 1.2, 3, 16.5, mat(0x7a4a22, { metalness: 0.2 }));
  addInteract('doorA', 0, 1.5, 15.4, 'Otevřít dveře');

  // ===== 2) Chodba ke Sfinze =====
  room(-1.5, 16.5, 1.5, 22, { skip: ['n', 's'], h: 3.5, frieze: false });
  torch(-1.3, 2, 19, 0);

  // ===== 3) Síň Sfingy =====
  room(-7, 22.5, 7, 34, { openings: [{ side: 's', c: 0, w: 3 }, { side: 'n', c: 0, w: 3 }], h: 6 });
  torch(-6.7, 2.4, 25, 0); torch(6.7, 2.4, 25, 0); torch(-6.7, 2.4, 32, 0, false); torch(6.7, 2.4, 32, 0, false);
  const sphinx = makeSphinx();
  sphinx.position.set(0, 0, 31.6);
  sphinx.rotation.y = Math.PI;
  scene.add(sphinx);
  const sphinxBlock = box(-2.2, 0, 30, 2.2, 3, 34, mat(0x000000), { solid: false });
  sphinxBlock.mesh.visible = false;
  const sphinxInt = addInteract('sphinx', 0, 1.5, 29.5, 'Promluvit se Sfingou', 2.5);
  // sloupy pro atmosféru
  for (const x of [-5, 5]) for (const z of [26, 31]) box(x - 0.4, 0, z - 0.4, x + 0.4, 6, z + 0.4, mat(0xd8d0c0));

  // ===== 4) Chodba pekelných psů =====
  room(-3.5, 34.5, 3.5, 52, { skip: ['n', 's'], h: 4 });
  torch(-3.2, 2.2, 38, 0); torch(3.2, 2.2, 45, 0); torch(-3.2, 2.2, 50, 0, false);
  box(-3.5, 0, 41, -2.2, 4, 42, mat(0x8a7a64)); // výstupky
  box(2.2, 0, 47, 3.5, 4, 48, mat(0x8a7a64));
  // kosti
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 5), mat(0xe8e0c8));
    b.position.set(-2.5 + Math.random() * 5, 0.05, 38 + Math.random() * 12);
    b.rotation.set(Math.PI / 2, 0, Math.random() * 3);
    scene.add(b);
  }

  // ===== 5) Hekatina svatyně (Mlha) =====
  room(-8, 52.5, 8, 64, { openings: [{ side: 's', c: 0, w: 3.5 }, { side: 'e', c: 58, w: 3 }], h: 5 });
  const mistLight = new THREE.PointLight(0x8a7aff, 10, 16, 1.5);
  mistLight.position.set(0, 3.5, 58);
  scene.add(mistLight);
  torch(-7.7, 2.2, 55, 0, false); torch(-7.7, 2.2, 62, 0);
  // oltář
  box(-1, 0, 62.5, 1, 1, 63.8, mat(0x2a2a3a));
  const brazier = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.5, 8, 1, true), mat(0x9a7aff, { emissive: 0x6a4aff, emissiveIntensity: 1.2 }));
  brazier.position.set(0, 1.3, 63.1);
  brazier.rotation.x = Math.PI;
  scene.add(brazier);
  animated.push((time) => { mistLight.intensity = 9 + Math.sin(time * 2) * 2; });

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

  // nápisy viditelné jen s amuletem
  MIST_CLUES.forEach((clue, i) => {
    const tex = textTexture(wrap(clue, 16), { w: 1024, h: 512, font: 'bold 96px Georgia' });
    const p = plane(tex, 4.6, 2.3, [-5, 0, 5][i], i === 1 ? 3.2 : 2.3, 63.95, Math.PI);
    p.visible = false;
    mist.reveal.push(p);
  });
  // falešné dveře na západě (iluze Mlhy)
  const fakeDoor = box(-8, 0, 56.8, -7.8, 3, 59.2, mat(0x7a4a22), { collide: false, solid: false });
  mist.hide.push(fakeDoor.mesh);
  const fakeInt = addInteract('fakeDoor', -7.2, 1.5, 58, 'Prozkoumat dveře');
  const painting = plane(textTexture(['Malba dveří'], { color: '#c0b090', glow: '#000', font: 'italic 36px Georgia' }), 2.4, 1.2, -7.95, 1.5, 58, Math.PI / 2);
  painting.visible = false;
  mist.reveal.push(painting);
  // skrytá zeď na východě: bez amuletu vypadá jako zeď a nejde projít
  const mistWall = box(8, 0, 56.5, 8.5, 3, 59.5, texMat(stoneTex, 1, 1));
  mist.wall = mistWall;
  const mistWallInt = addInteract('mistWall', 7.4, 1.5, 58, 'Prozkoumat zeď');

  // ===== 6) Chodba se symbolovým zámkem =====
  room(8.5, 56.5, 14, 59.5, { skip: ['e', 'w'], h: 3.2, frieze: false });
  const lockDoor = box(8.55, 0, 56.5, 8.9, 3, 59.5, mat(0x9a7a3a, { metalness: 0.5, roughness: 0.4 }));
  const symTex = textTexture([SYMBOLS.map((s) => s.icon).join(' '), '? ? ? ?'], { w: 512, h: 256, font: '48px serif', color: '#fff2c0', glow: '#ffaa00' });
  const symPlane = plane(symTex, 2.4, 1.2, 8.53, 1.8, 58, -Math.PI / 2);
  symPlane.visible = false;
  mist.reveal.push(symPlane);
  const lockInt = addInteract('lock', 7.6, 1.5, 58, 'Použít symbolový zámek');
  lockInt.enabled = false;

  // ===== 7) Aréna Minotaura (otevřený prostor pod nebem) =====
  room(14.5, 44, 44, 72, { openings: [{ side: 'w', c: 58, w: 3 }, { side: 'e', c: 58, w: 3.5, h: 4 }], h: 7, ceiling: false, floor: sandTex });
  const pillars = [];
  for (const [x, z] of [[22, 51], [36, 51], [22, 65], [36, 65], [29, 58]]) {
    if (x === 29) continue; // střed nechat volný
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 6, 10), mat(0xe8e2d4));
    p.position.set(x, 3, z);
    p.castShadow = true; p.receiveShadow = true;
    scene.add(p);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 2.2), mat(0xe8e2d4));
    cap.position.set(x, 6.1, z); cap.castShadow = true; scene.add(cap);
    const c = { min: new THREE.Vector3(x - 0.9, 0, z - 0.9), max: new THREE.Vector3(x + 0.9, 6, z + 0.9), active: true, mesh: p, pillar: true };
    colliders.push(c);
    solids.push(p);
    pillars.push({ x, z, mesh: p, collider: c, cracks: 0 });
  }
  torch(14.8, 2.5, 50, 0); torch(14.8, 2.5, 66, 0); torch(43.7, 2.5, 52, 0); torch(43.7, 2.5, 64, 0);
  // brána Δ
  const gateTex = textTexture(['Δ'], { w: 256, h: 256, font: 'bold 160px Georgia', color: '#ffe08a', glow: '#ff9900', bg: '#5a3a1a' });
  const gate = box(44, 0, 56.25, 44.5, 4, 59.75, new THREE.MeshStandardMaterial({ map: gateTex, metalness: 0.4, roughness: 0.5 }));
  addInteract('gate', 43.2, 1.5, 58, 'Prozkoumat Daidalovu bránu', 2.4);
  // mozaika s Ikarem
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
  plane(mosaicTex, 4, 2, 43.95, 2.6, 64.5, -Math.PI / 2);
  addInteract('mosaic', 43, 1.5, 64.5, 'Prohlédnout mozaiku', 2.6);

  // ===== 8) Východ do tábora =====
  room(44.5, 54, 56, 62, { skip: ['w'], h: 6, ceiling: false, floor: grassTex, frieze: false });
  const sign = textTexture(['TÁBOR POLOKREVNÝCH', 'Camp Half-Blood'], { w: 512, h: 256, font: 'bold 44px Georgia', color: '#fff', glow: '#f07a1a', bg: '#3a2a1a' });
  plane(sign, 4, 2, 55.9, 3, 58, -Math.PI / 2);

  return {
    colliders, solids, interactables, mist, animated, pillars,
    doorA, sphinx, sphinxBlock, sphinxInt, chest, mistWall, mistWallInt, fakeInt, lockDoor, lockInt, gate,
    spawn: {
      start: new THREE.Vector3(0, 0, 5),
      sphinx: new THREE.Vector3(0, 0, 36),
      mist: new THREE.Vector3(0, 0, 54.5),
      arena: new THREE.Vector3(17, 0, 58),
    },
    itemSpots: {
      bronzeKey: new THREE.Vector3(6.5, 2.75, 14.5),
      ambrosia1: new THREE.Vector3(-2.6, 0.6, 36.5),
      ambrosia2: new THREE.Vector3(16, 0.6, 70),
    },
    makeItem,
  };
}
