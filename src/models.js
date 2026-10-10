// Zaoblené stylizované modely postav a předmětů (kapsle, koule, hladké stínování).
import * as THREE from 'three';

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.65, ...opts }));
  return mats.get(key);
}
// Vlastní (nesdílená) kopie materiálu, např. pro svítící oči jednotlivých nepřátel.
const own = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts });

function add(geo, material, parent, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
const C = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 14);
const Cyl = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);

// Končetina, která se otáčí v kloubu nahoře (rameno, kyčel).
function limb(parent, x, y, z, r, len, material) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  add(C(r, len), material, g, 0, -len / 2 - r * 0.5, 0);
  return g;
}

function face(head, r, eyeColor = 0x1a1a1a, z = 0.92) {
  const white = mat(0xffffff, { roughness: 0.3 });
  const pupil = mat(eyeColor, { roughness: 0.2 });
  for (const s of [-1, 1]) {
    add(S(r * 0.2, 12, 10), white, head, s * r * 0.36, r * 0.12, r * z * 0.92, false);
    add(S(r * 0.11, 10, 8), pupil, head, s * r * 0.36, r * 0.12, r * z * 0.92 + r * 0.12, false);
  }
}

function makeBowMesh() {
  const g = new THREE.Group();
  const wood = mat(0x8a5a2a, { roughness: 0.5 });
  const arc = add(new THREE.TorusGeometry(0.55, 0.035, 8, 24, Math.PI * 0.9), wood, g);
  arc.rotation.z = Math.PI / 2 + Math.PI * 0.05;
  const str = add(Cyl(0.006, 0.006, 1.08, 4), mat(0xeeeeee), g, 0.0, 0, 0, false);
  str.position.x = 0.04;
  g.userData.string = str;
  return g;
}

// Hráč: polobůh v oranžovém tričku Tábora polokrevných s mečem z nebeského bronzu.
export function makePlayer(glow = 0xe8c547) {
  const g = new THREE.Group();
  const skin = mat(0xe8b896);
  const shirt = mat(0xf27b1f, { roughness: 0.8 });
  const jeans = mat(0x34507e, { roughness: 0.85 });
  const shoe = mat(0x2a2a2a);
  const legL = limb(g, -0.13, 0.86, 0, 0.11, 0.58, jeans);
  const legR = limb(g, 0.13, 0.86, 0, 0.11, 0.58, jeans);
  for (const l of [legL, legR]) { const s = add(S(0.13), shoe, l, 0, -0.8, 0.05); s.scale.set(1, 0.6, 1.5); }
  const torso = add(C(0.24, 0.42), shirt, g, 0, 1.18, 0);
  torso.scale.set(1, 1, 0.72);
  add(Cyl(0.26, 0.25, 0.12), jeans, g, 0, 0.86, 0); // pásek / boky
  add(Cyl(0.08, 0.09, 0.12), skin, g, 0, 1.58, 0); // krk
  const head = new THREE.Group(); head.position.set(0, 1.78, 0); g.add(head);
  add(S(0.22), skin, head);
  const hair = add(S(0.235, 20, 12), mat(0x3a2414, { roughness: 0.9 }), head, 0, 0.05, -0.03);
  hair.scale.set(1, 0.85, 1);
  hair.geometry = new THREE.SphereGeometry(0.235, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  face(head, 0.22);
  add(S(0.035, 8, 6), skin, head, 0, 0.0, 0.22);
  const armL = limb(g, -0.33, 1.44, 0, 0.075, 0.48, skin);
  const armR = limb(g, 0.33, 1.44, 0, 0.075, 0.48, skin);
  for (const a of [armL, armR]) add(C(0.09, 0.12), shirt, a, 0, -0.08, 0); // rukáv
  // meč
  const sword = new THREE.Group();
  sword.position.set(0, -0.66, 0.06);
  add(Cyl(0.03, 0.03, 0.22, 8), mat(0x5a3a1a), sword).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.26, 0.05, 0.06), mat(0xb8862a, { metalness: 0.8, roughness: 0.3 }), sword, 0, 0, 0.12);
  const blade = add(new THREE.BoxGeometry(0.06, 0.02, 0.9), mat(0xe0b050, { emissive: glow, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.2 }), sword, 0, 0, 0.58);
  add(new THREE.ConeGeometry(0.03, 0.12, 4), blade.material, sword, 0, 0, 1.09).rotation.x = Math.PI / 2;
  armR.add(sword);
  // luk na zádech (zobrazí se po sebrání)
  const bow = makeBowMesh();
  bow.position.set(0.05, 1.2, -0.24);
  bow.rotation.set(0, Math.PI / 2, 0.5);
  bow.visible = false;
  g.add(bow);
  g.userData = { legL, legR, armL, armR, sword, bow, head };
  return g;
}

export function makeHound() {
  const g = new THREE.Group();
  const fur = mat(0x1c1618, { roughness: 0.9 });
  const body = add(S(0.5), fur, g, 0, 1.0, 0); body.scale.set(0.85, 0.8, 1.6);
  const chest = add(S(0.45), fur, g, 0, 1.1, 0.5); chest.scale.set(1, 1, 0.9);
  const head = new THREE.Group(); head.position.set(0, 1.4, 0.95); g.add(head);
  add(S(0.32), fur, head).scale.set(1, 0.9, 1.1);
  const snout = add(C(0.14, 0.25), fur, head, 0, -0.08, 0.33); snout.rotation.x = Math.PI / 2;
  add(S(0.06, 8, 6), mat(0x000000), head, 0, -0.04, 0.55);
  const eye = own(0xff2200, { emissive: 0xff3300, emissiveIntensity: 2 });
  add(S(0.06, 8, 6), eye, head, -0.14, 0.08, 0.27, false);
  add(S(0.06, 8, 6), eye, head, 0.14, 0.08, 0.27, false);
  for (const s of [-1, 1]) { const e = add(new THREE.ConeGeometry(0.08, 0.25, 8), fur, head, s * 0.18, 0.3, -0.05); e.rotation.z = -s * 0.3; }
  const legs = [];
  for (const [x, z] of [[-0.25, 0.55], [0.25, 0.55], [-0.25, -0.5], [0.25, -0.5]]) {
    const l = limb(g, x, 0.85, z, 0.09, 0.55, fur);
    legs.push(l);
  }
  const tail = add(C(0.05, 0.5), fur, g, 0, 1.2, -0.85); tail.rotation.x = -0.9;
  g.userData = { head, legs, eyeMat: eye };
  g.scale.setScalar(1.05);
  return g;
}

export function makeMyrmex() {
  const g = new THREE.Group();
  const shell = mat(0x5a1e14, { roughness: 0.35, metalness: 0.2 });
  add(S(0.28), shell, g, 0, 0.45, 0.45).scale.set(1, 0.85, 1);
  add(S(0.22), shell, g, 0, 0.45, 0.05).scale.set(0.9, 0.8, 1.2);
  add(S(0.36), shell, g, 0, 0.5, -0.5).scale.set(1, 0.85, 1.3);
  const eye = own(0x111111, { emissive: 0x330000, emissiveIntensity: 1 });
  add(S(0.06, 8, 6), eye, g, -0.15, 0.55, 0.65, false);
  add(S(0.06, 8, 6), eye, g, 0.15, 0.55, 0.65, false);
  for (const s of [-1, 1]) { const m = add(new THREE.ConeGeometry(0.04, 0.25, 6), shell, g, s * 0.1, 0.38, 0.75); m.rotation.x = Math.PI / 2; m.rotation.z = s * 0.4; }
  const legs = [];
  for (const z of [0.25, 0.05, -0.15]) for (const s of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(s * 0.15, 0.45, z); g.add(l);
    const seg = add(C(0.03, 0.4), shell, l, s * 0.2, -0.12, 0); seg.rotation.z = s * 1.0;
    legs.push(l);
  }
  g.userData = { legs, eyeMat: eye };
  return g;
}

export function makeMinotaur() {
  const g = new THREE.Group();
  const fur = mat(0x5a3820, { roughness: 0.9 });
  const skin = mat(0x9a6440, { roughness: 0.7 });
  const legs = [];
  for (const x of [-0.38, 0.38]) {
    const l = limb(g, x, 1.45, 0, 0.22, 0.9, fur);
    add(Cyl(0.2, 0.24, 0.22), mat(0x222222), l, 0, -1.4, 0.03);
    legs.push(l);
  }
  add(Cyl(0.62, 0.7, 0.45, 20), mat(0xa01c1c, { roughness: 0.9 }), g, 0, 1.45, 0); // rouška
  add(Cyl(0.66, 0.66, 0.08, 20), mat(0xc8a040, { metalness: 0.7, roughness: 0.3 }), g, 0, 1.68, 0); // opasek
  const torso = add(S(0.75), skin, g, 0, 2.25, 0); torso.scale.set(1.15, 1, 0.8);
  add(S(0.3), skin, g, -0.75, 2.6, 0); add(S(0.3), skin, g, 0.75, 2.6, 0); // ramena
  const head = new THREE.Group(); head.position.set(0, 3.05, 0.2); g.add(head);
  add(S(0.42), fur, head).scale.set(1, 1, 1.1);
  const snout = add(S(0.28), mat(0x7a5038), head, 0, -0.15, 0.4); snout.scale.set(1.15, 0.8, 0.9);
  for (const s of [-1, 1]) add(S(0.05, 8, 6), mat(0x111111), head, s * 0.12, -0.12, 0.65, false);
  add(new THREE.TorusGeometry(0.1, 0.02, 8, 16), mat(0xd4af37, { metalness: 0.9, roughness: 0.2 }), head, 0, -0.32, 0.62);
  const eye = own(0x330000, { emissive: 0xff0000, emissiveIntensity: 0.4 });
  add(S(0.07, 8, 6), eye, head, -0.2, 0.12, 0.38, false);
  add(S(0.07, 8, 6), eye, head, 0.2, 0.12, 0.38, false);
  const horn = mat(0xf0eadc, { roughness: 0.4 });
  for (const s of [-1, 1]) {
    const h = add(new THREE.TorusGeometry(0.4, 0.07, 8, 16, Math.PI * 0.55), horn, head, s * 0.38, 0.12, 0);
    h.rotation.set(0, s > 0 ? 0 : Math.PI, 0.15);
    add(S(0.13), fur, head, s * 0.4, 0.15, -0.05).scale.set(0.6, 1, 0.8); // uši
  }
  const arms = [];
  for (const x of [-0.95, 0.95]) {
    const a = limb(g, x, 2.65, 0, 0.18, 0.85, skin);
    add(S(0.2), skin, a, 0, -1.25, 0);
    arms.push(a);
  }
  const stars = new THREE.Group(); stars.position.y = 3.9; stars.visible = false; g.add(stars);
  for (let i = 0; i < 5; i++) {
    add(new THREE.OctahedronGeometry(0.12), own(0xffee66, { emissive: 0xffee66, emissiveIntensity: 2 }), stars, Math.cos(i * 1.26) * 0.65, 0, Math.sin(i * 1.26) * 0.65, false);
  }
  g.userData = { head, legs, arms, eyeMat: eye, stars };
  return g;
}

function wingShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.6, 0.5, 1.6, 0.9, 2.2, 0.6);
  s.bezierCurveTo(1.8, 0.4, 1.9, 0.2, 1.6, 0.05);
  s.bezierCurveTo(1.3, -0.05, 1.3, -0.25, 0.9, -0.3);
  s.bezierCurveTo(0.6, -0.3, 0.3, -0.2, 0, 0);
  return new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
}

export function makeSphinx() {
  const g = new THREE.Group();
  const lion = mat(0xc9a25a, { roughness: 0.75 });
  const body = add(S(0.9), lion, g, 0, 1.05, -0.2); body.scale.set(0.9, 0.75, 1.6);
  const chest = add(S(0.75), lion, g, 0, 1.45, 0.9); chest.scale.set(0.95, 1.1, 0.9);
  for (const [x, z] of [[-0.5, 1.4], [0.5, 1.4]]) { add(C(0.18, 0.6), lion, g, x, 0.5, z); add(S(0.24), lion, g, x, 0.15, z + 0.2).scale.set(1, 0.6, 1.3); }
  for (const [x, z] of [[-0.6, -1.0], [0.6, -1.0]]) { const h = add(S(0.45), lion, g, x, 0.55, z); h.scale.set(0.7, 0.9, 1.2); add(S(0.22), lion, g, x, 0.12, z + 0.45).scale.set(1, 0.6, 1.3); }
  const tail = add(C(0.06, 1.2), lion, g, 0, 0.5, -1.9); tail.rotation.x = 1.2;
  const head = new THREE.Group(); head.position.set(0, 2.55, 1.15); g.add(head);
  add(S(0.34), mat(0xd9a882), head);
  face(head, 0.34, 0x2a1a0a);
  const nemes = add(new THREE.CylinderGeometry(0.38, 0.62, 0.9, 20, 1, true, Math.PI * 0.2, Math.PI * 1.6), mat(0x1f4aa0, { side: THREE.DoubleSide, roughness: 0.5 }), head, 0, -0.1, -0.05);
  nemes.rotation.y = Math.PI;
  add(S(0.36, 20, 10), mat(0x1f4aa0), head, 0, 0.05, -0.04).geometry = new THREE.SphereGeometry(0.37, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
  add(new THREE.TorusGeometry(0.36, 0.03, 8, 24), mat(0xd4af37, { metalness: 0.9, roughness: 0.25 }), head, 0, 0.12, 0).rotation.x = Math.PI / 2;
  const wingMat = mat(0xeee0b8, { roughness: 0.6, side: THREE.DoubleSide });
  const wl = add(wingShape(), wingMat, g, -0.45, 1.6, 0.4); wl.rotation.set(0, Math.PI / 2 + 0.3, 0.5); wl.scale.setScalar(1.1);
  const wr = add(wingShape(), wingMat, g, 0.45, 1.6, 0.4); wr.rotation.set(0, Math.PI / 2 - 0.3, -0.5); wr.scale.set(-1.1, 1.1, 1.1);
  g.userData = { head, wl, wr };
  return g;
}

export function makeGrover() {
  const g = new THREE.Group();
  const fur = mat(0x7a5a3a, { roughness: 0.95 });
  for (const s of [-1, 1]) {
    const l = limb(g, s * 0.12, 0.8, 0, 0.11, 0.5, fur);
    add(Cyl(0.08, 0.1, 0.12), mat(0x222222), l, 0, -0.75, 0.02);
  }
  const t = add(C(0.22, 0.35), mat(0xf27b1f, { roughness: 0.8 }), g, 0, 1.12, 0); t.scale.set(1, 1, 0.75);
  const head = new THREE.Group(); head.position.set(0, 1.62, 0); g.add(head);
  add(S(0.2), mat(0xe8b896), head);
  face(head, 0.2);
  const cap = add(S(0.22, 20, 10), mat(0x2a7a3a, { roughness: 0.9 }), head, 0, 0.04, -0.02);
  cap.geometry = new THREE.SphereGeometry(0.22, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
  for (const s of [-1, 1]) { const h = add(new THREE.ConeGeometry(0.035, 0.12, 8), mat(0xd8c8a0), head, s * 0.12, 0.2, 0); h.rotation.z = -s * 0.3; }
  add(new THREE.ConeGeometry(0.05, 0.14, 8), mat(0x6a4a2a), head, 0, -0.2, 0.12).rotation.x = Math.PI;
  const arms = [];
  for (const s of [-1, 1]) arms.push(limb(g, s * 0.28, 1.35, 0, 0.065, 0.4, mat(0xe8b896)));
  g.userData = { head, arms };
  return g;
}

export function makeAutomaton() {
  const g = new THREE.Group();
  const bronze = mat(0xb07a35, { metalness: 0.8, roughness: 0.3 });
  add(Cyl(0.35, 0.45, 1.1, 20), bronze, g, 0, 0.95, 0);
  const head = new THREE.Group(); head.position.set(0, 1.78, 0); g.add(head);
  add(S(0.3), bronze, head);
  add(new THREE.TorusGeometry(0.27, 0.035, 8, 24, Math.PI * 0.8), own(0x66ccff, { emissive: 0x66ccff, emissiveIntensity: 2 }), head, 0, 0.03, 0).rotation.set(Math.PI / 2, 0, Math.PI * 0.1);
  const gear = add(new THREE.TorusGeometry(0.2, 0.05, 6, 12), bronze, g, 0, 1.0, 0.42);
  for (const s of [-1, 1]) limb(g, s * 0.48, 1.4, 0, 0.07, 0.6, bronze);
  add(Cyl(0.42, 0.52, 0.3, 20), bronze, g, 0, 0.15, 0);
  g.userData = { head, gear };
  return g;
}

// Průsvitný duch hrdiny.
export function makeGhost(kind) {
  const g = new THREE.Group();
  const ghost = new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x5577cc, emissiveIntensity: 0.8, transparent: true, opacity: 0.5, depthWrite: false, roughness: 0.4 });
  const legL = limb(g, -0.12, 0.85, 0, 0.1, 0.55, ghost);
  const legR = limb(g, 0.12, 0.85, 0, 0.1, 0.55, ghost);
  add(C(0.24, 0.42), ghost, g, 0, 1.18, 0).scale.set(1, 1, 0.75);
  const head = new THREE.Group(); head.position.set(0, 1.75, 0); g.add(head);
  add(S(0.21), ghost, head);
  const armL = limb(g, -0.32, 1.44, 0, 0.07, 0.45, ghost);
  const armR = limb(g, 0.32, 1.44, 0, 0.07, 0.45, ghost);
  if (kind === 'theseus') {
    add(S(0.24, 16, 10), ghost, head, 0, 0.06, 0).geometry = new THREE.SphereGeometry(0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
    add(new THREE.BoxGeometry(0.05, 0.25, 0.4), ghost, head, 0, 0.3, -0.02);
  } else {
    const w = mat(0xddeeff, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, emissive: 0x88aaff, emissiveIntensity: 0.6 });
    const wl = add(wingShape(), w, g, -0.15, 1.35, -0.2, false); wl.rotation.set(0, Math.PI / 2 + 0.5, 0.3); wl.scale.setScalar(0.6);
    const wr = add(wingShape(), w, g, 0.15, 1.35, -0.2, false); wr.rotation.set(0, Math.PI / 2 - 0.5, -0.3); wr.scale.set(-0.6, 0.6, 0.6);
  }
  g.traverse((o) => { o.castShadow = false; });
  g.userData = { legL, legR, armL, armR, head };
  return g;
}

// Kerkóps: malý chlupatý otrava s dlouhým ocasem.
export function makePest() {
  const g = new THREE.Group();
  const fur = mat(0x8a6a4a, { roughness: 0.95 });
  add(S(0.25), fur, g, 0, 0.55, 0).scale.set(1, 1.1, 0.9);
  const head = new THREE.Group(); head.position.set(0, 0.95, 0.05); g.add(head);
  add(S(0.22), fur, head);
  add(S(0.14), mat(0xd8b898), head, 0, -0.05, 0.13).scale.set(1, 0.8, 0.7);
  face(head, 0.22, 0x2a1a0a, 1.0);
  for (const s of [-1, 1]) add(S(0.1), mat(0xd8a080), head, s * 0.22, 0.05, 0).scale.set(0.5, 1, 1);
  for (const s of [-1, 1]) limb(g, s * 0.1, 0.35, 0, 0.06, 0.2, fur);
  const arms = [];
  for (const s of [-1, 1]) arms.push(limb(g, s * 0.24, 0.72, 0, 0.05, 0.3, fur));
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.45, -0.2), new THREE.Vector3(0, 0.3, -0.5), new THREE.Vector3(0, 0.6, -0.7), new THREE.Vector3(0, 0.9, -0.6)]);
  add(new THREE.TubeGeometry(curve, 16, 0.035, 6), fur, g);
  g.userData = { head, arms };
  return g;
}

export function makeArrow() {
  const g = new THREE.Group();
  add(Cyl(0.015, 0.015, 0.8, 6), mat(0x9a7040), g, 0, 0, 0, false).rotation.x = Math.PI / 2;
  add(new THREE.ConeGeometry(0.035, 0.12, 6), mat(0xc8c8d0, { metalness: 0.8, roughness: 0.3 }), g, 0, 0, 0.46, false).rotation.x = Math.PI / 2;
  for (const r of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) {
    const f = add(new THREE.BoxGeometry(0.005, 0.06, 0.14), mat(0xd04030), g, Math.cos(r) * 0.025, Math.sin(r) * 0.025, -0.34, false);
    f.rotation.z = r;
  }
  return g;
}

function tileTexture(icon) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#b08a3a'; x.fillRect(0, 0, 128, 128);
  x.font = '80px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(icon, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeItem(type) {
  const g = new THREE.Group();
  if (type === 'bronzeKey' || type === 'silverKey') {
    const c = type === 'bronzeKey' ? 0xc8873a : 0xd8e0ea;
    const km = mat(c, { metalness: 0.9, roughness: 0.2, emissive: c, emissiveIntensity: 0.3 });
    add(new THREE.TorusGeometry(0.14, 0.045, 10, 20), km, g, 0, 0.2, 0);
    add(Cyl(0.03, 0.03, 0.5, 10), km, g, 0, -0.15, 0);
    add(new THREE.BoxGeometry(0.16, 0.06, 0.05), km, g, 0.06, -0.33, 0);
  } else if (type === 'amulet') {
    add(new THREE.TorusGeometry(0.2, 0.045, 10, 24), mat(0xc0c8ff, { emissive: 0x8090ff, emissiveIntensity: 1, metalness: 0.6 }), g);
    add(new THREE.OctahedronGeometry(0.1), mat(0x9a7aff, { emissive: 0x9a7aff, emissiveIntensity: 1.5 }), g);
  } else if (type === 'thread') {
    add(S(0.25), mat(0xffe08a, { emissive: 0xffd040, emissiveIntensity: 1.6 }), g);
    add(new THREE.TorusGeometry(0.26, 0.02, 6, 24), mat(0xffd040, { emissive: 0xffd040, emissiveIntensity: 2 }), g).rotation.x = 1;
  } else if (type === 'ambrosia') {
    add(Cyl(0.2, 0.2, 0.1, 20), mat(0xe8c27a, { emissive: 0xffcc66, emissiveIntensity: 0.5 }), g);
  } else if (type === 'bow') {
    const b = makeBowMesh(); g.add(b);
  } else if (type === 'quiver') {
    add(Cyl(0.1, 0.08, 0.5, 14), mat(0x6a3a1a), g).rotation.z = 0.3;
    for (let i = 0; i < 4; i++) add(Cyl(0.01, 0.01, 0.3, 4), mat(0xd04030), g, -0.08 + i * 0.04, 0.3, 0).rotation.z = 0.3;
  } else if (type === 'lyraTile') {
    add(new THREE.BoxGeometry(0.4, 0.4, 0.06), new THREE.MeshStandardMaterial({ map: tileTexture('🎵'), metalness: 0.4, roughness: 0.4 }), g);
  }
  return g;
}

export function makeChest() {
  const g = new THREE.Group();
  const wood = mat(0x6a4524, { roughness: 0.8 });
  const metal = mat(0xb8c0c8, { metalness: 0.8, roughness: 0.3 });
  add(new THREE.BoxGeometry(1.2, 0.6, 0.8), wood, g, 0, 0.3, 0);
  const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.4); g.add(lid);
  const top = add(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 20, 1, false, 0, Math.PI), wood, lid, 0, 0, 0.4);
  top.rotation.z = Math.PI / 2;
  for (const x of [-0.45, 0.45]) add(new THREE.BoxGeometry(0.08, 0.62, 0.82), metal, g, x, 0.3, 0);
  add(new THREE.BoxGeometry(0.18, 0.22, 0.05), metal, g, 0, 0.45, 0.42);
  g.userData = { lid };
  return g;
}

export function makeTorch() {
  const g = new THREE.Group();
  add(Cyl(0.05, 0.07, 0.6, 10), mat(0x4a3020), g);
  add(Cyl(0.1, 0.06, 0.15, 12), mat(0x6a5030, { metalness: 0.6 }), g, 0, 0.32, 0);
  const flame = add(S(0.12, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffb040 }), g, 0, 0.48, 0, false);
  flame.scale.set(1, 1.8, 1);
  add(S(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), g, 0, 0.45, 0, false);
  g.userData = { flame };
  return g;
}

export function makeLever() {
  const g = new THREE.Group();
  add(new THREE.BoxGeometry(0.5, 0.6, 0.15), mat(0x5a5048, { roughness: 0.9 }), g, 0, 1.2, 0);
  const arm = new THREE.Group(); arm.position.set(0, 1.2, 0.1); g.add(arm);
  add(Cyl(0.035, 0.035, 0.6, 10), mat(0x7a6a50, { metalness: 0.7, roughness: 0.4 }), arm, 0, 0.3, 0);
  add(S(0.08), mat(0xb02020), arm, 0, 0.62, 0);
  arm.rotation.x = 0.6;
  g.userData = { arm };
  return g;
}
