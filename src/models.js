// Low-poly modely postav a předmětů poskládané z jednoduchých těles.
import * as THREE from 'three';

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, ...opts }));
  return mats.get(key);
}

function part(geo, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
}

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// Hráč: polobůh v oranžovém tričku Tábora polokrevných s mečem z nebeského bronzu.
export function makePlayer(glow = 0xe8c547) {
  const g = new THREE.Group();
  const skin = mat(0xe0b08a);
  const shirt = mat(0xf07a1a);
  const jeans = mat(0x2f4a7a);
  const legL = new THREE.Group(); legL.position.set(-0.14, 0.8, 0); g.add(legL);
  const legR = new THREE.Group(); legR.position.set(0.14, 0.8, 0); g.add(legR);
  part(B(0.22, 0.8, 0.24), jeans, 0, -0.4, 0, legL);
  part(B(0.22, 0.8, 0.24), jeans, 0, -0.4, 0, legR);
  part(B(0.24, 0.1, 0.32), mat(0x333333), 0, -0.78, 0.04, legL);
  part(B(0.24, 0.1, 0.32), mat(0x333333), 0, -0.78, 0.04, legR);
  part(B(0.56, 0.62, 0.3), shirt, 0, 1.12, 0, g);
  part(new THREE.SphereGeometry(0.22, 8, 6), skin, 0, 1.66, 0, g);
  part(B(0.46, 0.14, 0.46), mat(0x3a2414), 0, 1.84, -0.02, g); // vlasy
  const armL = new THREE.Group(); armL.position.set(-0.36, 1.38, 0); g.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.36, 1.38, 0); g.add(armR);
  part(B(0.16, 0.6, 0.18), shirt, 0, -0.28, 0, armL);
  part(B(0.16, 0.6, 0.18), shirt, 0, -0.28, 0, armR);
  // meč
  const sword = new THREE.Group();
  sword.position.set(0, -0.55, 0.1);
  part(B(0.06, 0.06, 0.25), mat(0x5a3a1a), 0, 0, 0, sword);
  part(B(0.26, 0.05, 0.06), mat(0x8a6a2a), 0, 0, 0.14, sword);
  part(B(0.07, 0.03, 0.95), mat(0xd4a64a, { emissive: glow, emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.3 }), 0, 0, 0.62, sword);
  armR.add(sword);
  g.userData = { legL, legR, armL, armR, sword };
  return g;
}

export function makeHound() {
  const g = new THREE.Group();
  const fur = mat(0x1a1414);
  part(B(0.8, 0.7, 1.6), fur, 0, 0.95, 0, g);
  const head = part(B(0.6, 0.55, 0.7), fur, 0, 1.25, 0.95, g);
  part(B(0.4, 0.3, 0.4), fur, 0, -0.1, 0.45, head);
  const eye = mat(0xff2200, { emissive: 0xff2200, emissiveIntensity: 1.5 });
  part(B(0.1, 0.08, 0.05), eye, -0.15, 0.08, 0.36, head);
  part(B(0.1, 0.08, 0.05), eye, 0.15, 0.08, 0.36, head);
  part(B(0.12, 0.25, 0.1), fur, -0.2, 0.35, -0.05, head);
  part(B(0.12, 0.25, 0.1), fur, 0.2, 0.35, -0.05, head);
  const legs = [];
  for (const [x, z] of [[-0.28, 0.55], [0.28, 0.55], [-0.28, -0.55], [0.28, -0.55]]) {
    const l = new THREE.Group(); l.position.set(x, 0.65, z); g.add(l);
    part(B(0.2, 0.65, 0.2), fur, 0, -0.32, 0, l);
    legs.push(l);
  }
  part(B(0.12, 0.12, 0.6), fur, 0, 1.2, -1.0, g).rotation.x = -0.6;
  g.userData = { head, legs, eyeMat: eye };
  g.scale.setScalar(1.1);
  return g;
}

export function makeMinotaur() {
  const g = new THREE.Group();
  const fur = mat(0x5a3820);
  const skin = mat(0x8a5a3a);
  const legs = [];
  for (const x of [-0.35, 0.35]) {
    const l = new THREE.Group(); l.position.set(x, 1.3, 0); g.add(l);
    part(B(0.42, 1.3, 0.45), fur, 0, -0.65, 0, l);
    part(B(0.46, 0.2, 0.5), mat(0x222222), 0, -1.25, 0.03, l);
    legs.push(l);
  }
  part(B(1.0, 0.35, 0.6), mat(0xb02020), 0, 1.35, 0, g); // bederní rouška
  part(B(1.3, 1.2, 0.8), skin, 0, 2.1, 0, g);
  const head = new THREE.Group(); head.position.set(0, 2.95, 0.2); g.add(head);
  part(B(0.7, 0.7, 0.8), fur, 0, 0, 0, head);
  part(B(0.5, 0.35, 0.35), fur, 0, -0.15, 0.5, head);
  part(B(0.3, 0.1, 0.05), mat(0xd4af37, { metalness: 0.8, roughness: 0.3 }), 0, -0.3, 0.68, head); // kroužek
  const eye = mat(0x330000, { emissive: 0xff0000, emissiveIntensity: 0.3 });
  part(B(0.12, 0.08, 0.05), eye, -0.2, 0.12, 0.41, head);
  part(B(0.12, 0.08, 0.05), eye, 0.2, 0.12, 0.41, head);
  const horn = mat(0xeeeadd);
  const hl = part(new THREE.ConeGeometry(0.1, 0.7, 6), horn, -0.55, 0.3, 0, head); hl.rotation.z = 1.1;
  const hr = part(new THREE.ConeGeometry(0.1, 0.7, 6), horn, 0.55, 0.3, 0, head); hr.rotation.z = -1.1;
  const arms = [];
  for (const x of [-0.85, 0.85]) {
    const a = new THREE.Group(); a.position.set(x, 2.55, 0); g.add(a);
    part(B(0.35, 1.2, 0.38), skin, 0, -0.55, 0, a);
    arms.push(a);
  }
  // hvězdičky při omráčení
  const stars = new THREE.Group(); stars.position.y = 3.7; stars.visible = false; g.add(stars);
  for (let i = 0; i < 4; i++) {
    const s = part(new THREE.OctahedronGeometry(0.12), mat(0xffee66, { emissive: 0xffee66, emissiveIntensity: 1 }), Math.cos(i * 1.57) * 0.6, 0, Math.sin(i * 1.57) * 0.6, stars);
    s.castShadow = false;
  }
  g.userData = { head, legs, arms, eyeMat: eye, stars };
  return g;
}

export function makeSphinx() {
  const g = new THREE.Group();
  const lion = mat(0xc9a25a);
  part(B(1.6, 1.2, 3.0), lion, 0, 1.0, 0, g);
  for (const [x, z] of [[-0.55, 1.2], [0.55, 1.2], [-0.55, -1.1], [0.55, -1.1]]) part(B(0.45, 0.6, 0.6), lion, x, 0.3, z, g);
  part(B(1.0, 1.0, 0.8), lion, 0, 2.0, 1.2, g);
  const head = part(B(0.7, 0.8, 0.7), mat(0xd9b08a), 0, 2.85, 1.35, g);
  part(B(0.9, 0.9, 0.5), mat(0x1a3a7a), 0, 0.05, -0.2, head); // pokrývka hlavy
  part(B(0.12, 0.08, 0.05), mat(0x111111), -0.15, 0.08, 0.36, head);
  part(B(0.12, 0.08, 0.05), mat(0x111111), 0.15, 0.08, 0.36, head);
  const wing = mat(0xe8d8b0);
  const wl = part(B(0.15, 1.0, 2.0), wing, -0.9, 2.0, -0.2, g); wl.rotation.z = 0.5;
  const wr = part(B(0.15, 1.0, 2.0), wing, 0.9, 2.0, -0.2, g); wr.rotation.z = -0.5;
  g.userData = { head, wl, wr };
  return g;
}

export function makeGrover() {
  const g = new THREE.Group();
  const fur = mat(0x7a5a3a);
  for (const x of [-0.13, 0.13]) {
    part(B(0.2, 0.75, 0.25), fur, x, 0.42, 0, g);
    part(B(0.18, 0.1, 0.24), mat(0x222222), x, 0.05, 0.02, g); // kopýtka
  }
  part(B(0.5, 0.55, 0.28), mat(0xf07a1a), 0, 1.05, 0, g);
  part(new THREE.SphereGeometry(0.2, 8, 6), mat(0xe0b08a), 0, 1.52, 0, g);
  part(B(0.44, 0.15, 0.44), mat(0x2a6a2a), 0, 1.72, 0, g); // čepice rasta
  part(B(0.12, 0.1, 0.1), mat(0x5a3a1a), -0.18, 1.62, -0.05, g);
  part(B(0.12, 0.1, 0.1), mat(0x5a3a1a), 0.18, 1.62, -0.05, g);
  part(B(0.1, 0.3, 0.1), mat(0xd4c9a8), 0, 1.3, 0.2, g); // bradka
  return g;
}

export function makeAutomaton() {
  const g = new THREE.Group();
  const bronze = mat(0xb07a35, { metalness: 0.7, roughness: 0.35 });
  part(new THREE.CylinderGeometry(0.35, 0.45, 1.2, 8), bronze, 0, 0.9, 0, g);
  const head = part(new THREE.SphereGeometry(0.3, 8, 6), bronze, 0, 1.75, 0, g);
  const eye = mat(0x66ccff, { emissive: 0x66ccff, emissiveIntensity: 1 });
  part(B(0.4, 0.07, 0.05), eye, 0, 0.03, 0.27, head);
  const gear = part(new THREE.TorusGeometry(0.22, 0.06, 4, 8), bronze, 0, 1.0, 0.42, g);
  for (const x of [-0.5, 0.5]) part(B(0.15, 0.8, 0.15), bronze, x, 1.0, 0, g);
  part(new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8), bronze, 0, 0.15, 0, g);
  g.userData = { head, gear };
  return g;
}

export function makeItem(type) {
  const g = new THREE.Group();
  let m;
  if (type === 'bronzeKey' || type === 'silverKey') {
    const c = type === 'bronzeKey' ? 0xc8873a : 0xd8e0ea;
    const km = mat(c, { metalness: 0.8, roughness: 0.25, emissive: c, emissiveIntensity: 0.25 });
    part(new THREE.TorusGeometry(0.14, 0.05, 6, 10), km, 0, 0.2, 0, g);
    part(B(0.06, 0.5, 0.06), km, 0, -0.15, 0, g);
    part(B(0.16, 0.06, 0.06), km, 0.06, -0.33, 0, g);
  } else if (type === 'amulet') {
    m = part(new THREE.TorusGeometry(0.2, 0.05, 6, 12), mat(0xc0c8ff, { emissive: 0x8090ff, emissiveIntensity: 0.8, metalness: 0.6 }), 0, 0, 0, g);
    part(new THREE.OctahedronGeometry(0.1), mat(0x9a7aff, { emissive: 0x9a7aff, emissiveIntensity: 1 }), 0, 0, 0, g);
  } else if (type === 'thread') {
    part(new THREE.IcosahedronGeometry(0.25, 0), mat(0xffe08a, { emissive: 0xffd040, emissiveIntensity: 1.2 }), 0, 0, 0, g);
  } else if (type === 'ambrosia') {
    part(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8), mat(0xe8c27a, { emissive: 0xffcc66, emissiveIntensity: 0.4 }), 0, 0, 0, g);
  }
  const light = new THREE.PointLight(0xffd88a, 1.2, 3);
  g.add(light);
  return g;
}

export function makeChest() {
  const g = new THREE.Group();
  const wood = mat(0x6a4524);
  const metal = mat(0xb8c0c8, { metalness: 0.7, roughness: 0.3 });
  part(B(1.2, 0.6, 0.8), wood, 0, 0.3, 0, g);
  const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.4); g.add(lid);
  part(B(1.22, 0.25, 0.82), wood, 0, 0.12, 0.4, lid);
  part(B(0.2, 0.25, 0.05), metal, 0, 0.45, 0.42, g);
  g.userData = { lid };
  return g;
}

export function makeTorch() {
  const g = new THREE.Group();
  part(B(0.12, 0.6, 0.12), mat(0x4a3020), 0, 0, 0, g);
  const flame = part(new THREE.ConeGeometry(0.14, 0.35, 6), mat(0xffaa33, { emissive: 0xff8800, emissiveIntensity: 2 }), 0, 0.45, 0, g);
  flame.castShadow = false;
  g.userData = { flame };
  return g;
}
