// Hádův palác: břeh Styxu, Kerberovo nádvoří, Asfodelové louky, Tartaros, Persefonina zahrada a trůnní sál.
import * as THREE from 'three';
import { makeBuilder, canvasTex, textTexture, wrap, rnd } from '../world.js';
import { mat, makeGhost, taper, V } from '../models.js';
import { smat } from '../surface.js';
import { pbr } from '../textures.js';
import { makeBoat, makeCharon, makeHades, makePersephone, makeSisyphus, makeTantalus } from './models.js';
import { JOURNAL } from './content.js';

const hidden = () => mat(0x000000);

// Železná mříž do otvoru: skupina tyčí + kolize.
function bars(B, scene, x1, x2, z1, z2, h) {
  const g = new THREE.Group();
  const iron = mat(0x24222a, { metalness: 0.85, roughness: 0.35 });
  const n = Math.round((x2 - x1) / 0.32);
  for (let i = 0; i <= n; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h, 8), iron);
    b.position.set(x1 + (i / n) * (x2 - x1), h / 2, (z1 + z2) / 2);
    b.castShadow = true;
    g.add(b);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), iron);
    tip.position.set(b.position.x, h + 0.05, b.position.z);
    g.add(tip);
  }
  for (const y of [0.4, h - 0.5]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, 0.08, 0.08), iron);
    r.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    g.add(r);
  }
  scene.add(g);
  const c = { min: new THREE.Vector3(x1, 0, z1), max: new THREE.Vector3(x2, h, z2), active: true, mesh: g };
  B.colliders.push(c);
  return { mesh: g, collider: c, baseY: 0 };
}

// Kamenná stéla s textem na zdi (skutečná nápověda má pečeť).
function stele(B, lines, w, h, x, y, z, rotY, opts = {}) {
  const tex = textTexture(lines, { w: 1024, h: Math.round(1024 * h / w), font: opts.font || 'bold 44px Georgia', color: '#d8f0ff', glow: '#3a9aff', bg: 'rgba(16,20,30,0.88)' });
  const p = B.plane(tex, w, h, x, y, z, rotY);
  return p;
}

const journalLines = (id, n = 40) => JOURNAL.find((j) => j.id === id).lines.flatMap((l) => wrap(l, n));

export function buildHades(scene) {
  const frieze = canvasTex(128, 32, (g, w, h) => {
    g.fillStyle = '#14121a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6ab8b0'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const x = i * 32 + 4;
      g.beginPath();
      g.moveTo(x, 26); g.lineTo(x, 6); g.lineTo(x + 22, 6); g.lineTo(x + 22, 20);
      g.lineTo(x + 10, 20); g.lineTo(x + 10, 13); g.lineTo(x + 16, 13);
      g.moveTo(x - 4, 26); g.lineTo(x + 28, 26);
      g.stroke();
    }
  });
  const B = makeBuilder(scene, { wallTex: 'rock', wallTint: 0x8a8498, floorTint: 0x76727e, ceilingTint: 0x34303c, friezeTex: frieze, torchColor: 0x4ad0ff, flameColor: 0x8af4ff });
  const { colliders, solids, interactables, animated, box, room, torch, seal, addInteract, column, plate, lever } = B;
  const redFlame = new THREE.MeshBasicMaterial({ color: 0xff7a30 });
  const stone = pbr('rock', 1, 1, { color: 0x6a6670, roughness: 0.95 });
  const wood = pbr('wood', 1, 1, { color: 0x5a4a3a, roughness: 0.9 });
  const env = {
    bg: 0x05070b, fog: [0x0a0e15, 10, 48], hemi: [0x5a6c90, 0x160c0a, 0.3],
    sun: [0x9ab8d8, 0.6], sunOffset: new THREE.Vector3(-10, 30, -14), follow: true, exposure: 1.05,
  };

  // ===== 1) Břeh Styxu =====
  room(-10, 0, 10, 28, { openings: [{ side: 'n', c: 0, w: 3.5 }], h: 8, floor: 'rock' });
  torch(-9.7, 2.4, 3); torch(9.7, 2.4, 9); torch(-9.7, 2.4, 24); torch(9.7, 2.4, 24, false);
  // řeka
  const water = new THREE.Mesh(new THREE.PlaneGeometry(20, 10, 60, 30), new THREE.MeshStandardMaterial({ color: 0x0a2224, roughness: 0.62, metalness: 0, emissive: 0x05282a, emissiveIntensity: 0.6, envMapIntensity: 0.08 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.13, 15);
  water.receiveShadow = true;
  scene.add(water);
  const wp = water.geometry.attributes.position;
  const wbase = Float32Array.from(wp.array);
  animated.push((time) => {
    for (let i = 0; i < wp.count; i++) {
      const x = wbase[i * 3], y = wbase[i * 3 + 1];
      wp.setZ(i, Math.sin(x * 0.8 + time * 1.2) * 0.025 + Math.sin(y * 1.3 - time * 0.9) * 0.03);
    }
    wp.needsUpdate = true;
    water.geometry.computeVertexNormals();
  });
  const river = box(-10, 0, 10, 10, 2.4, 20, hidden(), { solid: false });
  river.mesh.visible = false;
  for (const z of [9.7, 20]) box(-10, 0, z, 10, 0.22, z + 0.3, stone, { collide: false });
  box(1.8, 0, 8.4, 4.2, 0.22, 10, wood, { collide: false });
  box(1.8, 0, 20, 4.2, 0.22, 21.6, wood, { collide: false });
  const boat = makeBoat();
  boat.position.set(3, 0, 12.6);
  scene.add(boat);
  const charon = makeCharon();
  charon.position.set(0, 0.12, -1.5);
  boat.add(charon);
  const boatLight = new THREE.PointLight(0x7affd8, 14, 12, 1.6);
  boatLight.position.set(0, 1.6, 2.25);
  boat.add(boatLight);
  animated.push((time) => { boat.position.y = Math.sin(time * 1.3) * 0.05; boat.rotation.z = Math.sin(time * 0.9) * 0.02; boatLight.intensity = 13 + Math.sin(time * 5) * 1.5; });
  const charonInt = addInteract('charon', 3, 1.2, 9.2, 'Promluvit s Charónem', 2.4);
  const charonBackInt = addInteract('charonBack', 3, 1.2, 20.8, 'Nechat se převézt zpět', 2.4);
  // urny
  const urnMeshes = {};
  const urnProfile = [[0, 0], [0.2, 0.02], [0.36, 0.3], [0.38, 0.6], [0.24, 0.92], [0.15, 1.05], [0.2, 1.15]].map(([x, y]) => new THREE.Vector2(x, y));
  for (const [id, z, letter] of [['urnA', 3, 'Α'], ['urnB', 5.5, 'Β'], ['urnC', 8, 'Γ']]) {
    const tex = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = '#2a1a14'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c87a3a'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
      g.font = 'bold 84px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8a050'; g.fillText(letter, w / 2, h / 2 + 4);
    });
    tex.wrapS = THREE.ClampToEdgeWrapping;
    const urn = new THREE.Mesh(new THREE.LatheGeometry(urnProfile, 28), new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.55 }));
    urn.position.set(-8.4, 0, z);
    urn.castShadow = true;
    scene.add(urn);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.381, 0.381, 0.3, 28, 1, true, Math.PI / 2 - 0.55, 1.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    label.position.set(-8.4, 0.52, z);
    scene.add(label);
    box(-8.8, 0, z - 0.4, -8.0, 1.1, z + 0.4, hidden(), { solid: false }).mesh.visible = false;
    urnMeshes[id] = urn;
    addInteract(id, -7.6, 1, z, 'Prozkoumat urnu ' + letter, 1.25);
  }
  seal(stele(B, journalLines('urns'), 2.6, 1.6, -5, 2.4, 0.04, 0));
  addInteract('urns', -5, 1.5, 0.9, 'Přečíst stélu', 2);
  seal(stele(B, ['PĚT ŘEK PODSVĚTÍ', ...journalLines('rivers')], 2.4, 1.9, 9.96, 2.6, 5, -Math.PI / 2));
  addInteract('rivers', 9.1, 1.5, 5, 'Přečíst stélu', 2);
  plate('plate1', -5, 24, 'styx');

  // ===== chodba k Kerberovi =====
  room(-1.75, 28.5, 1.75, 31, { skip: ['n', 's'], h: 4, frieze: false, floor: 'rock' });

  // ===== 2) Kerberovo nádvoří =====
  room(-11, 31.5, 11, 49, { openings: [{ side: 's', c: 0, w: 3.5 }, { side: 'n', c: 0, w: 3.5, h: 3.5 }], h: 9, floor: 'rock' });
  torch(-10.7, 2.6, 36); torch(10.7, 2.6, 36); torch(-10.7, 2.6, 46, false); torch(10.7, 2.6, 46, false);
  // ohně v pánvích po stranách nádvoří, aby byl Kerberos vidět
  for (const x of [-5.5, 5.5]) {
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.45, 16), mat(0x3a3036, { metalness: 0.7, roughness: 0.35 }));
    pan.position.set(x, 1.15, 47);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.95, 10), mat(0x3a3036, { metalness: 0.7, roughness: 0.35 }));
    leg.position.set(x, 0.47, 47);
    const fire = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), redFlame);
    fire.position.set(x, 1.5, 47);
    scene.add(pan, leg, fire);
    const l = new THREE.PointLight(0xff7a30, 34, 20, 1.5);
    l.position.set(x, 2.2, 46.6);
    scene.add(l);
    colliders.push({ min: new THREE.Vector3(x - 0.5, 0, 46.5), max: new THREE.Vector3(x + 0.5, 1.4, 47.5), active: true });
    animated.push((time) => { fire.scale.y = 1.4 + Math.sin(time * 9 + x) * 0.3; l.intensity = 32 + Math.sin(time * 11 + x) * 4; });
  }
  const boneM = mat(0xe0d8c0);
  const br = rnd(5);
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.4, 4, 8), boneM);
    b.position.set(-9 + br() * 18, 0.05, 34 + br() * 13);
    b.rotation.set(Math.PI / 2, 0, br() * 3);
    scene.add(b);
  }
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.8, 0.5, 28, 1, true), mat(0x6a5a4a, { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }));
  bowl.position.set(-8.3, 0.25, 46.3);
  scene.add(bowl);
  const bigBone = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 1.4, 4, 10), boneM);
  bigBone.position.set(-8.3, 0.35, 46.3); bigBone.rotation.set(Math.PI / 2, 0, 0.6);
  scene.add(bigBone);
  box(-9.4, 0, 45.2, -7.2, 0.5, 47.4, hidden(), { solid: false }).mesh.visible = false;
  addInteract('bowl', -7.6, 0.8, 45.4, 'Prohlédnout misku', 1.8);
  seal(stele(B, journalLines('cerberus', 34), 2.4, 1.3, 6, 2.5, 48.96, Math.PI));
  addInteract('cerberus', 6, 1.5, 48.1, 'Přečíst nápis', 2);
  const cerGate = bars(B, scene, -1.75, 1.75, 49.05, 49.45, 3.5);

  // ===== chodba k loukám =====
  room(-1.75, 49.5, 1.75, 52, { skip: ['n', 's'], h: 4, frieze: false, floor: 'rock' });

  // ===== 3) Asfodelové louky =====
  room(-14, 52.5, 14, 70, { openings: [{ side: 's', c: 0, w: 3.5 }, { side: 'e', c: 61, w: 3 }, { side: 'n', c: 0, w: 3.5, h: 3.5 }], h: 7, floor: 'grass', floorColor: 0x8a9086 });
  torch(-13.7, 2.5, 56); torch(13.7, 2.5, 56); torch(-13.7, 2.5, 66); torch(13.7, 2.5, 67, false);
  // asfodely: tisíce bledých květů
  {
    const n = 650;
    const stalk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.012, 0.42, 4), mat(0x6a7a60, { roughness: 0.9 }), n);
    const bloom = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), mat(0xece8dc, { roughness: 0.6, emissive: 0x30303a, emissiveIntensity: 0.4 }), n);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const r = rnd(11);
    for (let i = 0; i < n; i++) {
      let x, z;
      do { x = -13.6 + r() * 27.2; z = 53 + r() * 16.6; } while (Math.abs(x) < 1.6 || (z > 59 && z < 63 && x > 10));
      const s = 0.7 + r() * 0.6;
      q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3));
      m.compose(new THREE.Vector3(x, 0.21 * s, z), q, new THREE.Vector3(1, s, 1));
      stalk.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(x, 0.43 * s, z), q, new THREE.Vector3(1, 1.4, 1));
      bloom.setMatrixAt(i, m);
    }
    scene.add(stalk, bloom);
  }
  // černé topoly
  const bark = smat('fur', 0x1a1612, { roughness: 0.95, normal: 1.2 }, [2, 4]);
  const tr = rnd(3);
  for (const [x, z] of [[-10.5, 57], [10.5, 66.5], [-11, 67.5], [8, 55]]) {
    const t = new THREE.Group();
    t.add(new THREE.Mesh(taper([V(0, 0, 0), V(0.1, 2, 0), V(-0.1, 4, 0.1), V(0, 6, 0)], 0.28, 0.06, 20, 10), bark));
    for (let k = 0; k < 6; k++) {
      const y = 2.4 + k * 0.6, a = tr() * 6.28, l = 1 + tr() * 1.2;
      t.add(new THREE.Mesh(taper([V(0, y, 0), V(Math.cos(a) * l * 0.5, y + 0.6, Math.sin(a) * l * 0.5), V(Math.cos(a) * l, y + 1.4, Math.sin(a) * l)], 0.08, 0.015, 10, 6), bark));
    }
    t.position.set(x, 0, z);
    t.traverse((o) => { o.castShadow = true; });
    scene.add(t);
    colliders.push({ min: new THREE.Vector3(x - 0.35, 0, z - 0.35), max: new THREE.Vector3(x + 0.35, 6, z + 0.35), active: true });
  }
  seal(stele(B, ['SOUDCI MRTVÝCH', ...journalLines('judges', 36)], 2.4, 1.5, -13.96, 2.5, 61, Math.PI / 2));
  addInteract('judges', -13.1, 1.5, 61, 'Přečíst stélu', 2);
  addInteract('flowers', -6, 0.8, 64, 'Prohlédnout květy', 1.6);
  plate('plate2', 8, 58, 'asphodel');
  lever('lever1', 13.95, 66, -Math.PI / 2, 'asphodel');
  const gardenGate = bars(B, scene, -1.75, 1.75, 70.05, 70.45, 3.5);
  const gardenGateInt = addInteract('gardenGate', 0, 1.5, 69.2, 'Prozkoumat bránu', 2);
  // bloudící stíny mrtvých
  const shades = [];
  const sr = rnd(17);
  for (let i = 0; i < 6; i++) {
    const s = makeGhost('shade');
    s.userData.ghost.opacity = 0.22;
    const cx = (i % 2 ? 1 : -1) * (4 + sr() * 7), cz = 55 + sr() * 12;
    s.position.set(cx, 0.05, cz);
    scene.add(s);
    shades.push({ mesh: s, cx, cz, r: 1.5 + sr() * 2, sp: 0.12 + sr() * 0.1, ph: sr() * 6 });
  }
  animated.push((time) => {
    for (const s of shades) {
      const a = time * s.sp + s.ph;
      s.mesh.position.x = s.cx + Math.cos(a) * s.r;
      s.mesh.position.z = s.cz + Math.sin(a) * s.r;
      s.mesh.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
      const w = Math.sin(time * 3 + s.ph) * 0.3;
      s.mesh.userData.legL.rotation.x = w; s.mesh.userData.legR.rotation.x = -w;
    }
  });

  // ===== chodba do Tartaru =====
  room(14.5, 59.5, 18, 62.5, { skip: ['e', 'w'], h: 3.5, frieze: false, floor: 'rock' });

  // ===== 4) Tartaros =====
  room(18.5, 50, 40, 72, { openings: [{ side: 'w', c: 61, w: 3 }], h: 12, ceiling: false, floor: 'rock', floorColor: 0x7a5c52 });
  for (const [x, z] of [[18.8, 55], [18.8, 67], [39.7, 61]]) torch(x, 2.6, z, true, 0xff5a20, redFlame);
  torch(39.7, 2.6, 68, false, 0xff5a20, redFlame);
  // praskliny s lávou
  const lavaTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const r = rnd(9);
    g.strokeStyle = '#ff6a10'; g.shadowColor = '#ff3000'; g.shadowBlur = 12; g.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      g.lineWidth = 3 + r() * 4;
      g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y);
      for (let i = 0; i < 8; i++) { x += (r() - 0.5) * 70; y += (r() - 0.3) * 50; g.lineTo(x, y); }
      g.stroke();
    }
  });
  const lavaMat = new THREE.MeshBasicMaterial({ map: lavaTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const [x, z, s, rot] of [[23, 53, 5, 0.3], [31, 63, 6, 1.2], [37, 69, 4, 2.2], [22, 60, 3.5, 0.9]]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(s, s), lavaMat);
    l.rotation.set(-Math.PI / 2, 0, rot);
    l.position.set(x, 0.02, z);
    scene.add(l);
  }
  const glow = new THREE.PointLight(0xff4010, 30, 22, 1.6);
  glow.position.set(30, 1.5, 62);
  scene.add(glow);
  animated.push((time) => { glow.intensity = 26 + Math.sin(time * 2.3) * 4 + Math.sin(time * 7.1) * 2; });
  // Tantalova tůň
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: 0x0a1a20, roughness: 0.08, metalness: 0.3, emissive: 0x04121a, emissiveIntensity: 0.6 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(24, 0.12, 68);
  scene.add(pool);
  for (const [a, b, c, d] of [[20.7, 64.7, 27.3, 65], [20.7, 71, 27.3, 71.3], [20.7, 65, 21, 71], [27, 65, 27.3, 71]]) box(a, 0, b, c, 0.4, d, stone);
  box(21, 0, 65, 27, 1.6, 71, hidden(), { solid: false }).mesh.visible = false;
  const tantalus = makeTantalus();
  tantalus.position.set(24, -0.75, 68.5);
  tantalus.rotation.y = Math.PI;
  scene.add(tantalus);
  const branch = new THREE.Group();
  branch.add(new THREE.Mesh(taper([V(3.5, 4.8, 2), V(2.2, 4.2, 1), V(1, 3.7, 0.3), V(0, 3.4, 0)], 0.12, 0.03, 16, 8), bark));
  for (let k = 0; k < 6; k++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat(0xb01a24, { roughness: 0.4 }));
    f.position.set(0.3 + k * 0.45, 3.25 + k * 0.18, 0.1 + k * 0.2);
    branch.add(f);
  }
  branch.position.set(24, 0, 68.5);
  scene.add(branch);
  animated.push((time) => {
    branch.position.y = Math.max(0, Math.sin(time * 0.8)) * 0.6;
    tantalus.userData.armL.rotation.x = -2.7 + Math.sin(time * 0.8) * 0.15;
    tantalus.userData.armR.rotation.x = -2.5 - Math.sin(time * 0.8 + 0.5) * 0.15;
  });
  addInteract('tantalus', 24, 1.2, 64.1, 'Promluvit s Tantalem', 2.2);
  // Sisyfův kopec a balvan
  const rampShape = new THREE.Shape();
  rampShape.moveTo(0, 0); rampShape.lineTo(11.5, 0); rampShape.lineTo(11.5, 3.2); rampShape.lineTo(0, 0);
  const rampGeo = new THREE.ExtrudeGeometry(rampShape, { depth: 6, bevelEnabled: false });
  const ramp = new THREE.Mesh(rampGeo, pbr('rock', 0.25, 0.25, { color: 0x4a3832, roughness: 0.95 }));
  ramp.position.set(28, 0, 51);
  ramp.receiveShadow = true; ramp.castShadow = true;
  scene.add(ramp);
  solids.push(ramp);
  box(27.8, 0, 50.8, 40, 4.5, 57.2, hidden(), { solid: false }).mesh.visible = false;
  const boulderGeo = new THREE.IcosahedronGeometry(1.3, 4);
  {
    const p = boulderGeo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = 1 + 0.06 * Math.sin(v.x * 3.1 + v.y * 1.7) * Math.cos(v.z * 2.3) + 0.03 * Math.sin(v.y * 7 + v.x * 5);
      v.multiplyScalar(k);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    boulderGeo.computeVertexNormals();
  }
  const boulder = new THREE.Mesh(boulderGeo, pbr('rock', 2, 2, { color: 0x8a7a70, roughness: 0.9, normal: 1.6 }));
  boulder.castShadow = true;
  scene.add(boulder);
  // světlo nad kopcem, aby byl balvan i Sisyfos vidět
  const hillLight = new THREE.PointLight(0xff7a40, 34, 18, 1.3);
  hillLight.position.set(32, 6.5, 58.5);
  scene.add(hillLight);
  const sisyphus = makeSisyphus();
  const sisHolder = new THREE.Group();
  sisHolder.add(sisyphus);
  sisHolder.rotation.y = Math.PI / 2;
  scene.add(sisHolder);
  const rampY = (x) => Math.max(0, Math.min(3.2, (x - 28) * 3.2 / 11.5));
  addInteract('sisyphus', 27.2, 1.2, 54, 'Promluvit se Sisyfem', 2.6);
  // Hádova pečeť s číselníkem
  const ped = new THREE.Group();
  const pm = pbr('marble', 1, 1, { color: 0x2a2630, roughness: 0.3 });
  const pc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 1.1, 24), pm); pc.position.y = 0.55; ped.add(pc);
  const dialTex = textTexture(['? ? ?'], { w: 256, h: 256, font: 'bold 64px Georgia', color: '#ffe0a0', glow: '#ff9900', bg: '#3a2410' });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24), [mat(0x8a6a2a, { metalness: 0.8, roughness: 0.3 }), new THREE.MeshStandardMaterial({ map: dialTex, metalness: 0.4, roughness: 0.5 }), mat(0x8a6a2a)]);
  top.position.y = 1.14; ped.add(top);
  ped.position.set(33, 0, 63);
  ped.traverse((o) => { o.castShadow = true; });
  scene.add(ped);
  box(32.4, 0, 62.4, 33.6, 1.15, 63.6, hidden(), { solid: false }).mesh.visible = false;
  const dialInt = addInteract('dial', 33, 1.2, 61.8, 'Otočit koly Hádovy pečeti', 2);
  plate('plate3', 36, 67.5, 'tartarus');

  // ===== chodba do zahrady =====
  room(-1.75, 70.5, 1.75, 73, { skip: ['n', 's'], h: 4, frieze: false, floor: 'rock' });

  // ===== 5) Persefonina zahrada =====
  room(-13, 73.5, 13, 93, { openings: [{ side: 's', c: 0, w: 3.5 }, { side: 'n', c: 0, w: 3 }], h: 10, floor: 'grass', floorColor: 0x60785a });
  torch(-12.7, 2.6, 77); torch(12.7, 2.6, 77); torch(-12.7, 2.6, 89); torch(12.7, 2.6, 85, false);
  const gardenLight = new THREE.PointLight(0x9affb0, 16, 24, 1.4);
  gardenLight.position.set(0, 5, 84);
  scene.add(gardenLight);
  const hedge = smat('fur', 0x2a4a28, { roughness: 0.95, normal: 1.6 }, [4, 2]);
  // živé ploty kryjí před pohledy stráží; Persefonin kout za plotem je bezpečný
  const hedges = [[-11, 79, -4, 80.4], [4, 79, 11, 80.4], [-5, 85, 5, 86.4], [-13, 85, -9, 86.4], [9, 85, 13, 86.4], [5, 87.2, 5.8, 91.6]];
  for (const [x1, z1, x2, z2] of hedges) {
    const hb = box(x1, 0, z1, x2, 2.2, z2, hedge);
    hb.mesh.material = hedge.clone();
    hb.mesh.material.map = hedge.map.clone(); hb.mesh.material.map.needsUpdate = true;
    hb.mesh.material.map.repeat.set((x2 - x1) / 1.2, 2);
  }
  // granátovník
  const tree = new THREE.Group();
  tree.add(new THREE.Mesh(taper([V(0, 0, 0), V(0.1, 1.2, 0), V(-0.1, 2.2, 0.1)], 0.18, 0.08, 12, 8), bark));
  const leaves = mat(0x2a5a28, { roughness: 0.85 });
  for (const [x, y, z, r] of [[0, 2.8, 0, 1.1], [0.8, 2.4, 0.3, 0.8], [-0.7, 2.5, -0.2, 0.8], [0.2, 3.3, -0.5, 0.7]]) {
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), leaves);
    l.position.set(x, y, z);
    tree.add(l);
  }
  const fr = rnd(23);
  for (let k = 0; k < 12; k++) {
    const a = fr() * 6.28, y = 2 + fr() * 1.5;
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat(0xa8141e, { roughness: 0.4 }));
    f.position.set(Math.cos(a) * 1.05, y, Math.sin(a) * 1.05);
    tree.add(f);
  }
  tree.position.set(-9.5, 0, 90.5);
  tree.traverse((o) => { o.castShadow = true; });
  scene.add(tree);
  colliders.push({ min: new THREE.Vector3(-10, 0, 90), max: new THREE.Vector3(-9, 4, 91), active: true });
  addInteract('tree', -8.3, 1.2, 89.6, 'Prohlédnout strom', 1.8);
  const persephone = makePersephone();
  persephone.position.set(8.8, 0, 90.6);
  persephone.rotation.y = -Math.PI / 2 - 0.5;
  scene.add(persephone);
  box(9.6, 0, 89.4, 11.4, 0.5, 91.8, pbr('marble', 1, 1, { color: 0xd8d0c0, roughness: 0.35 }));
  colliders.push({ min: new THREE.Vector3(8.4, 0, 90.2), max: new THREE.Vector3(9.2, 2, 91), active: true });
  animated.push((time) => { persephone.userData.head.rotation.y = Math.sin(time * 0.5) * 0.3; });
  addInteract('persephone', 7.6, 1.2, 90, 'Promluvit s Persefonou', 2.2);
  const palaceDoor = box(-1.5, 0, 93.05, 1.5, 3, 93.45, pbr('marble', 1, 1, { color: 0x1a1820, roughness: 0.25 }));
  palaceDoor.baseY = 1.5;
  addInteract('palaceDoor', 0, 1.5, 92.3, 'Otevřít dveře paláce', 1.8);

  // ===== chodba do paláce =====
  room(-1.5, 93.5, 1.5, 96, { skip: ['n', 's'], h: 4, frieze: false, floor: 'stone', floorColor: 0x4a4650 });

  // ===== 6) Trůnní sál =====
  room(-9, 96.5, 9, 114, { openings: [{ side: 's', c: 0, w: 3 }, { side: 'n', c: 0, w: 2.6 }], h: 11, floor: 'stone', floorColor: 0x46424e });
  const blackMarble = pbr('marble', 1, 2, { color: 0x34303c, roughness: 0.22, envMapIntensity: 0.8 });
  for (const x of [-5.5, 5.5]) for (const z of [100, 105, 110]) {
    const g = new THREE.Group();
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 10.4, 24), blackMarble);
    sh.position.y = 5.2;
    g.add(sh);
    g.position.set(x, 0, z);
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    scene.add(g);
    solids.push(sh);
    colliders.push({ min: new THREE.Vector3(x - 0.55, 0, z - 0.55), max: new THREE.Vector3(x + 0.55, 11, z + 0.55), active: true });
  }
  for (const x of [-3.5, 3.5]) {
    const bz = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.25, 0.4, 16), mat(0x3a3440, { metalness: 0.7, roughness: 0.3 }));
    bz.position.set(x, 1.1, 107);
    scene.add(bz);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 0.9, 10), mat(0x3a3440, { metalness: 0.7, roughness: 0.3 }));
    leg.position.set(x, 0.45, 107);
    scene.add(leg);
    const fire = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshBasicMaterial({ color: 0x7af4ff }));
    fire.position.set(x, 1.4, 107);
    scene.add(fire);
    const l = new THREE.PointLight(0x5ad8ff, 22, 16, 1.6);
    l.position.set(x, 2, 107);
    scene.add(l);
    colliders.push({ min: new THREE.Vector3(x - 0.45, 0, 106.55), max: new THREE.Vector3(x + 0.45, 1.3, 107.45), active: true });
    animated.push((time) => { fire.scale.y = 1.3 + Math.sin(time * 9 + x) * 0.25; l.intensity = 20 + Math.sin(time * 11 + x) * 2.5; });
  }
  // trůn z kostí a obsidiánu
  const obs = pbr('marble', 1, 1, { color: 0x1c1a22, roughness: 0.55, envMapIntensity: 0.5 });
  box(-3, 0, 108.6, 3, 0.2, 113, obs, { collide: false });
  box(-1.4, 0.2, 110, 1.4, 0.73, 112.4, obs);
  box(-1.4, 0.73, 112, 1.4, 4.4, 112.5, obs);
  for (const x of [-1.5, 1.5]) box(x - 0.15, 0.73, 110.2, x + 0.15, 1.5, 112.4, obs);
  const skullM = mat(0xd8d0bc, { roughness: 0.6 });
  for (let k = 0; k < 7; k++) {
    const sk = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), skullM);
    sk.position.set(-1.2 + k * 0.4, 4.45, 112.25);
    sk.scale.set(0.85, 1, 0.95);
    scene.add(sk);
  }
  const hades = makeHades();
  hades.position.set(0, -0.3, 111.2);
  hades.rotation.y = Math.PI;
  scene.add(hades);
  // studené světlo na Háda, aby byl na trůnu vidět
  const hadesKey = new THREE.SpotLight(0x9fb8ff, 30, 12, 0.55, 0.6, 1.2);
  hadesKey.position.set(0, 5.5, 106);
  hadesKey.target.position.set(0, 1.4, 111.2);
  scene.add(hadesKey, hadesKey.target);
  animated.push((time) => { hades.userData.head.rotation.y = Math.sin(time * 0.4) * 0.15; });
  addInteract('hades', 0, 1.5, 107.4, 'Promluvit s Hádem', 3);
  const exitDoor = box(-1.3, 0, 114.05, 1.3, 3, 114.45, obs);
  exitDoor.baseY = 1.5;
  // chodba ven k dennímu světlu
  room(-1.3, 114.5, 1.3, 124, { skip: ['s'], h: 3.5, frieze: false, floor: 'stone', floorColor: 0x6a6670 });
  const day = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.5), new THREE.MeshBasicMaterial({ color: 0xfff4d8 }));
  day.position.set(0, 1.75, 123.95);
  day.rotation.y = Math.PI;
  scene.add(day);
  const dayLight = new THREE.PointLight(0xffe8c0, 40, 14, 1.4);
  dayLight.position.set(0, 2, 122.5);
  scene.add(dayLight);

  // ===== atmosféra =====
  B.dust([[-10, 0, 10, 28, 6], [-11, 31.5, 11, 49, 7], [-14, 52.5, 14, 70, 6], [18.5, 50, 40, 72, 8], [-13, 73.5, 13, 93, 7], [-9, 96.5, 9, 114, 8]], 1100, 0x9ae8ff);

  return {
    colliders, solids, interactables, mist: { reveal: [], hide: [], wall: null }, animated, triggers: B.triggers, env,
    river: river.collider, boat, charon, charonInt, charonBackInt, urnMeshes, cerGate, gardenGate, gardenGateInt, palaceDoor, exitDoor,
    boulder, sisyphus, sisHolder, rampY, dialInt, dialTex, tantalus, hades, persephone,
    rooms: {
      styx: [-10, 0, 10, 28], court: [-11, 31.5, 11, 49], asphodel: [-14, 52.5, 14, 70], tartarus: [18.5, 50, 40, 72], garden: [-13, 73.5, 13, 93], throne: [-9, 96.5, 9, 114],
    },
    wanderPaths: {
      orfeus: [[-3, 6.5], [6, 6.5], [6, 3], [-3, 3]],
      achilles: [[-9, 56], [-2.5, 56], [-2.5, 66], [-9, 66]],
    },
    spawn: {
      start: new THREE.Vector3(0, 0, 4),
      shore: new THREE.Vector3(0, 0, 4),
      cerberus: new THREE.Vector3(0, 0, 23.5),
      asphodel: new THREE.Vector3(0, 0, 55),
      tartarus: new THREE.Vector3(20.5, 0, 61),
      garden: new THREE.Vector3(0, 0, 75.5),
      throne: new THREE.Vector3(0, 0, 99),
    },
    itemSpots: {
      bow: new THREE.Vector3(6.5, 1.3, 2.2),
      ball: new THREE.Vector3(7.2, 0.5, 8.6),
      quiver1: new THREE.Vector3(-8.5, 0.5, 26.5),
      quiver2: new THREE.Vector3(-9.5, 0.5, 33),
      quiver3: new THREE.Vector3(11.5, 0.5, 68.5),
      quiver4: new THREE.Vector3(38.5, 0.5, 70.5),
      ambrosia1: new THREE.Vector3(8.5, 0.6, 26.5),
      ambrosia2: new THREE.Vector3(9.5, 0.6, 33),
      ambrosia3: new THREE.Vector3(-11.5, 0.6, 76),
      helm: new THREE.Vector3(33, 1.75, 63),
    },
  };
}
