// Postavy v reálných proporcích (klouby v kolenou a loktech, látky, srst, kůže) a předměty.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { smat, shirtPrint } from './surface.js';

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.65, envMapIntensity: 0.35, ...opts }));
  return mats.get(key);
}
// Vlastní (nesdílená) kopie materiálu, např. pro svítící oči jednotlivých nepřátel.
const own = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, envMapIntensity: 0.35, ...opts });

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
const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

// Rotační těleso z profilu [[poloměr, výška], ...] odspodu nahoru; přední strana je +z.
function lathe(profile, segs = 28) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs, Math.PI, Math.PI * 2);
}

// Díl končetiny od kloubu (0) dolů do -len, zúžený, se svalem a zaoblenými konci.
function seg(len, top, bot, bulge = 0, at = 0.5) {
  const p = [];
  for (let k = 0; k <= 4; k++) { const a = k / 4 * Math.PI / 2; p.push([bot * Math.sin(a), -len - bot * 0.9 * Math.cos(a)]); }
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    p.push([bot + (top - bot) * t + bulge * Math.exp(-(((t - at) / 0.28) ** 2)), -len + len * t]);
  }
  for (let k = 4; k >= 0; k--) { const a = k / 4 * Math.PI / 2; p.push([top * Math.sin(a), top * 0.9 * Math.cos(a)]); }
  return lathe(p, 18);
}

// Dvoudílná končetina: horní díl se otáčí v kloubu, dolní (userData.lower) v koleni nebo lokti.
function limb2(parent, x, y, z, a, b, matA, matB = matA) {
  const upper = group(parent, x, y, z);
  add(seg(a.len, a.top, a.bot, a.bulge, a.at), matA, upper);
  const lower = group(upper, 0, -a.len, 0);
  add(seg(b.len, b.top, b.bot, b.bulge, b.at), matB, lower);
  upper.userData.lower = lower;
  return upper;
}

// Zúžená trubice podél křivky (rohy, ocasy, kadeře).
function taper(points, r0, r1, seg = 24, radial = 10) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const p = geo.attributes.position;
  const c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, c);
    const r = r0 + (r1 - r0) * (i / seg);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      p.setXYZ(k, c.x + (p.getX(k) - c.x) * r, c.y + (p.getY(k) - c.y) * r, c.z + (p.getZ(k) - c.z) * r);
    }
  }
  return geo;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- lidská hlava ----------
function headGeo(r) {
  const g = new THREE.SphereGeometry(r, 36, 26);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ny = y / r;
    x *= 0.84;
    if (ny < 0) {
      const t = (-ny) ** 1.6;
      x *= 1 - 0.32 * t;
      z *= z > 0 ? 1 - 0.06 * t : 1 - 0.4 * t;
    }
    if (z < 0 && ny > -0.3) z *= 1.1;
    if (z > 0 && Math.abs(ny - 0.32) < 0.18) z *= 1 + 0.03 * (1 - Math.abs(ny - 0.32) / 0.18); // čelo a obočí
    p.setXYZ(i, x, y * 1.16, z);
  }
  g.computeVertexNormals();
  return g;
}

function hairGeo(r, { cover = 0.56, tilt = 0.55, messy = 0.07, puff = 1.09 } = {}) {
  const g = new THREE.SphereGeometry(r * puff, 40, 20, 0, Math.PI * 2, 0, Math.PI * cover);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x / r * 9 + z / r * 4) * Math.sin(z / r * 8 - y / r * 3) + 0.5 * Math.sin(x / r * 17 - y / r * 11);
    const k = 1 + messy * (n * 0.4 + 0.6);
    p.setXYZ(i, x * k * 0.86, y * k * 1.16, z * k * 1.04);
  }
  g.rotateX(-tilt);
  g.computeVertexNormals();
  return g;
}

function humanFace(head, r, M, o = {}) {
  const white = M.eyeWhite ?? mat(0xf2ede6, { roughness: 0.2 });
  const iris = M.iris ?? mat(o.iris ?? 0x4a3420, { roughness: 0.15 });
  const pupil = M.pupil ?? mat(0x060606, { roughness: 0.1 });
  const brow = M.brow ?? mat(o.brow ?? 0x2a1a10, { roughness: 0.9 });
  for (const s of [-1, 1]) {
    const e = group(head, s * r * 0.33, r * 0.14, r * 0.8);
    add(S(r * 0.13, 16, 12), white, e, 0, 0, 0, false);
    add(S(r * 0.075, 14, 10), iris, e, 0, 0, r * 0.098, false).scale.set(1, 1, 0.45);
    add(S(r * 0.04, 10, 8), pupil, e, 0, 0, r * 0.122, false).scale.set(1, 1, 0.4);
    const lid = add(new THREE.SphereGeometry(r * 0.142, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), M.skin, e, 0, 0, 0, false);
    lid.rotation.x = -0.12;
    const lo = add(new THREE.SphereGeometry(r * 0.138, 16, 6, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28), M.skin, e, 0, 0, 0, false);
    lo.rotation.x = 0.05;
    const b = add(new RoundedBoxGeometry(r * 0.34, r * 0.055, r * 0.09, 2, r * 0.025), brow, head, s * r * 0.34, r * 0.36, r * 0.86, false);
    b.rotation.set(0, s * 0.3, -s * 0.12);
    const ear = add(S(r * 0.21, 14, 10), M.skin, head, s * r * 0.84, r * 0.04, -r * 0.06);
    ear.scale.set(0.32, 1, 0.62);
    ear.rotation.y = s * 0.3;
  }
  // nos a chřípí
  const nose = add(S(r * 0.12, 16, 12), M.skin, head, 0, -r * 0.08, r * 0.94, false);
  nose.scale.set(0.55, 1.3, 0.7); nose.rotation.x = -0.3;
  for (const s of [-1, 1]) add(S(r * 0.055, 10, 8), M.skin, head, s * r * 0.065, -r * 0.2, r * 0.95, false);
  // ústa
  const lip = M.lip ?? mat(o.lip ?? 0xb87266, { roughness: 0.5 });
  const up = add(C(r * 0.03, r * 0.2), lip, head, 0, -r * 0.415, r * 0.89, false);
  up.rotation.z = Math.PI / 2; up.scale.set(1, 1, 0.5);
  const dn = add(C(r * 0.036, r * 0.15), lip, head, 0, -r * 0.465, r * 0.875, false);
  dn.rotation.z = Math.PI / 2; dn.scale.set(1, 1, 0.5);
}

// ---------- ruce a nohy ----------
function hand(parent, y, m, s) {
  const h = group(parent, 0, y, 0);
  add(new RoundedBoxGeometry(0.032, 0.085, 0.075, 2, 0.013), m, h, 0, -0.04, 0);
  const f = add(new RoundedBoxGeometry(0.028, 0.075, 0.07, 2, 0.012), m, h, -s * 0.006, -0.105, 0.003);
  f.rotation.z = -s * 0.22;
  const t = add(C(0.011, 0.04), m, h, -s * 0.012, -0.05, 0.042);
  t.rotation.set(-0.5, 0, -s * 0.3);
  return h;
}

function shoe(parent, y, m, sole) {
  add(new RoundedBoxGeometry(0.095, 0.075, 0.24, 3, 0.03), m, parent, 0, y - 0.025, 0.04);
  if (sole) add(new RoundedBoxGeometry(0.1, 0.022, 0.25, 2, 0.009), sole, parent, 0, y - 0.058, 0.04);
}

const TORSO = [[0, 0.85], [0.168, 0.85], [0.172, 0.88], [0.162, 0.96], [0.158, 1.05], [0.172, 1.16], [0.185, 1.26], [0.19, 1.33], [0.18, 1.38], [0.13, 1.425], [0.06, 1.45], [0, 1.455]];

// Lidská postava (výška asi 1,7 m). Vrací klouby pro animaci.
function buildHuman(g, M, o = {}) {
  add(lathe([[0, 0.74], [0.13, 0.75], [0.158, 0.79], [0.16, 0.86], [0.14, 0.9], [0, 0.9]]), M.pants, g).scale.set(1, 1, 0.66);
  add(lathe(TORSO), M.shirt, g).scale.set(1, 1, 0.64);
  add(Cyl(0.047, 0.054, 0.15, 16), M.skin, g, 0, 1.5, 0.005);
  const head = group(g, 0, 1.588, 0.012);
  add(headGeo(0.1), M.skin, head);
  humanFace(head, 0.1, M, o);
  if (M.hair) add(hairGeo(0.1, o.hair), M.hair, head, 0, 0.006, -0.004);
  const u = { head };
  for (const s of [-1, 1]) {
    const arm = limb2(g, s * 0.197, 1.36, 0,
      { len: 0.28, top: 0.05, bot: 0.038, bulge: 0.007, at: 0.55 },
      { len: 0.25, top: 0.04, bot: 0.029, bulge: 0.008, at: 0.75 }, M.skin);
    if (M.sleeve) add(seg(0.12, 0.058, 0.053), M.sleeve, arm);
    arm.userData.hand = hand(arm.userData.lower, -0.25, M.skin, s);
    arm.userData.lower.rotation.x = -0.2;
    u[s < 0 ? 'armL' : 'armR'] = arm;
  }
  if (o.legs !== 'goat') {
    for (const s of [-1, 1]) {
      const leg = limb2(g, s * 0.09, 0.84, 0,
        { len: 0.39, top: 0.078, bot: 0.052, bulge: 0.01, at: 0.65 },
        { len: 0.38, top: 0.052, bot: 0.036, bulge: 0.009, at: 0.7 }, M.pants, M.shin ?? M.pants);
      shoe(leg.userData.lower, -0.38, M.shoe, M.sole);
      u[s < 0 ? 'legL' : 'legR'] = leg;
    }
  }
  return u;
}

function makeBowMesh() {
  const g = new THREE.Group();
  const wood = smat('leather', 0x8a5a2a, { roughness: 0.5, normal: 0.6 }, [4, 1]);
  const arc = add(new THREE.TorusGeometry(0.55, 0.03, 8, 32, Math.PI * 0.9), wood, g);
  arc.rotation.z = Math.PI / 2 + Math.PI * 0.05;
  add(Cyl(0.042, 0.042, 0.14, 10), mat(0x3a2414, { roughness: 0.9 }), g, -0.55, 0, 0); // úchop
  const str = add(Cyl(0.004, 0.004, 1.08, 4), mat(0xeeeeee), g, 0.0, 0, 0, false);
  str.position.x = 0.04;
  g.userData.string = str;
  return g;
}

// Hráč: polobůh v oranžovém tričku Tábora polokrevných s mečem z nebeského bronzu.
export function makePlayer(glow = 0xe8c547) {
  const g = new THREE.Group();
  const skin = smat('skin', 0xe2ad8c, { roughness: 0.55, normal: 0.35 }, [3, 3]);
  const M = {
    skin,
    shirt: shirtPrint('#e8701c', ['TÁBOR POLOKREVNÝCH', 'CAMP HALF-BLOOD']),
    sleeve: smat('knit', 0xe8701c, { roughness: 0.85, normal: 0.7 }, [5, 2]),
    pants: smat('denim', 0x48689a, { roughness: 0.9, normal: 0.9 }, [3, 5]),
    shoe: smat('leather', 0x34343a, { roughness: 0.55 }, [2, 2]),
    sole: mat(0xe6e2da, { roughness: 0.8 }),
    hair: smat('hair', 0x2a1a10, { roughness: 0.55, normal: 1.2 }, [4, 2]),
  };
  const u = buildHuman(g, M, { hair: { cover: 0.58, tilt: 0.55, messy: 0.09 } });
  // pásek
  add(Cyl(0.163, 0.163, 0.035, 24), mat(0x2a1a10, { roughness: 0.6 }), g, 0, 0.865, 0).scale.set(1, 1, 0.68);
  add(new RoundedBoxGeometry(0.05, 0.035, 0.01, 1, 0.004), mat(0xb8a070, { metalness: 0.8, roughness: 0.3 }), g, 0, 0.865, 0.112);
  // meč v pravé ruce
  const sword = group(u.armR.userData.hand, 0, -0.075, 0.0);
  add(Cyl(0.016, 0.016, 0.14, 10), smat('leather', 0x3a2414, { roughness: 0.8 }, [1, 2]), sword).rotation.x = Math.PI / 2;
  add(S(0.024, 10, 8), mat(0xb8862a, { metalness: 0.85, roughness: 0.3 }), sword, 0, 0, -0.08);
  add(new RoundedBoxGeometry(0.2, 0.025, 0.035, 2, 0.01), mat(0xb8862a, { metalness: 0.85, roughness: 0.3 }), sword, 0, 0, 0.08);
  const bladeM = mat(0xe0b050, { emissive: glow, emissiveIntensity: 0.6, metalness: 0.85, roughness: 0.2 });
  const blade = add(new THREE.CylinderGeometry(0.028, 0.034, 0.78, 4), bladeM, sword, 0, 0, 0.48);
  blade.rotation.set(Math.PI / 2, Math.PI / 4, 0); blade.scale.set(1, 1, 0.25);
  const tip = add(new THREE.ConeGeometry(0.028, 0.1, 4), bladeM, sword, 0, 0, 0.92);
  tip.rotation.set(Math.PI / 2, Math.PI / 4, 0); tip.scale.set(1, 1, 0.25);
  // luk na zádech (zobrazí se po sebrání)
  const bow = makeBowMesh();
  bow.scale.setScalar(0.85);
  bow.position.set(0.02, 1.12, -0.2);
  bow.rotation.order = 'ZYX';
  bow.rotation.set(0, -Math.PI / 2, 0.5);
  bow.visible = false;
  g.add(bow);
  g.userData = { legL: u.legL, legR: u.legR, armL: u.armL, armR: u.armR, sword, bow, head: u.head };
  return g;
}

// Průsvitný duch hrdiny (dospělý, v tunice).
export function makeGhost(kind) {
  const g = new THREE.Group();
  const ghost = new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x5577cc, emissiveIntensity: 0.8, transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.4 });
  const M = { skin: ghost, shirt: ghost, pants: ghost, shoe: ghost, hair: ghost, eyeWhite: ghost, iris: ghost, pupil: ghost, brow: ghost, lip: ghost };
  const u = buildHuman(g, M, { hair: { cover: 0.5, tilt: 0.4, messy: 0.12 } });
  // sukně tuniky a plášť
  add(lathe([[0.17, 0.9], [0.19, 0.78], [0.23, 0.6], [0.25, 0.5], [0.0001, 0.5]].reverse(), 24), ghost, g).scale.set(1, 1, 0.75);
  if (kind === 'theseus' || kind === 'achilles') {
    // korintská přilba s hřebenem
    add(new THREE.SphereGeometry(0.125, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), ghost, u.head, 0, 0.02, -0.005).scale.set(0.9, 1.2, 1.05);
    const crest = new THREE.Shape();
    crest.moveTo(-0.17, 0); crest.quadraticCurveTo(-0.15, 0.17, 0.02, 0.18); crest.quadraticCurveTo(0.17, 0.16, 0.16, 0.0); crest.lineTo(-0.17, 0);
    const c = add(new THREE.ExtrudeGeometry(crest, { depth: 0.035, bevelEnabled: false }), ghost, u.head, -0.0175, 0.12, 0);
    c.rotation.y = Math.PI / 2;
    for (const s of [-1, 1]) add(new RoundedBoxGeometry(0.02, 0.12, 0.09, 1, 0.008), ghost, u.head, s * 0.085, -0.04, 0.05);
  } else if (kind === 'orfeus') {
    // lyra v levé ruce
    const ly = group(u.armL.userData.hand, 0, -0.12, 0.08);
    ly.rotation.set(-1.2, 0, 0);
    for (const s of [-1, 1]) add(taper([V(s * 0.02, 0, 0), V(s * 0.09, 0.12, 0), V(s * 0.06, 0.26, 0)], 0.014, 0.01, 12, 6), ghost, ly);
    add(Cyl(0.008, 0.008, 0.16, 6), ghost, ly, 0, 0.25, 0).rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) add(Cyl(0.002, 0.002, 0.22, 4), ghost, ly, -0.04 + i * 0.02, 0.13, 0, false);
  } else if (kind !== 'shade') {
    const gf = ghost.clone(); gf.side = THREE.DoubleSide;
    const wl = featherWing(gf, gf, gf); wl.position.set(-0.08, 1.35, -0.12); wl.rotation.set(0, Math.PI / 2 + 0.5, 0.35); wl.scale.setScalar(0.55); g.add(wl);
    const wr = featherWing(gf, gf, gf); wr.position.set(0.08, 1.35, -0.12); wr.rotation.set(0, -Math.PI / 2 - 0.5, -0.35); wr.scale.set(-0.55, 0.55, 0.55); g.add(wr);
  }
  g.scale.setScalar(1.06);
  g.traverse((o) => { o.castShadow = false; });
  g.userData = { legL: u.legL, legR: u.legR, armL: u.armL, armR: u.armR, head: u.head, ghost };
  return g;
}

// Satyr Grover: horní půlka kluk v táborovém tričku a čepici, dole kozí nohy s kopýtky.
export function makeGrover() {
  const g = new THREE.Group();
  const skin = smat('skin', 0xd8a482, { roughness: 0.55, normal: 0.35 }, [3, 3]);
  const fur = smat('fur', 0x7a5a3a, { roughness: 0.95, normal: 1.3 }, [3, 3]);
  const M = {
    skin,
    shirt: shirtPrint('#e8701c', ['TÁBOR POLOKREVNÝCH', 'CAMP HALF-BLOOD']),
    sleeve: smat('knit', 0xe8701c, { roughness: 0.85, normal: 0.7 }, [5, 2]),
    pants: fur,
    hair: smat('hair', 0x5a3a20, { roughness: 0.7, normal: 1.5 }, [5, 2]),
    iris: mat(0x6a5a20, { roughness: 0.15 }),
  };
  const u = buildHuman(g, M, { legs: 'goat', brow: 0x4a3018, hair: { cover: 0.6, tilt: 0.62, messy: 0.14, puff: 1.1 } });
  // kozí nohy: stehno dopředu, holeň dozadu, nárt dolů ke kopýtku
  const hoof = mat(0x2a2420, { roughness: 0.45 });
  for (const s of [-1, 1]) {
    const thigh = group(g, s * 0.09, 0.83, 0);
    thigh.rotation.x = -0.35;
    add(seg(0.32, 0.09, 0.06, 0.015, 0.6), fur, thigh);
    const shin = group(thigh, 0, -0.32, 0); shin.rotation.x = 0.9;
    add(seg(0.3, 0.06, 0.04, 0.008, 0.7), fur, shin);
    const foot = group(shin, 0, -0.3, 0); foot.rotation.x = -0.55;
    add(seg(0.2, 0.04, 0.032), fur, foot);
    const h = add(Cyl(0.035, 0.045, 0.06, 12), hoof, foot, 0, -0.22, 0.01);
    add(new THREE.BoxGeometry(0.008, 0.062, 0.09), mat(0x111111), foot, 0, -0.22, 0.02, false);
    h.scale.set(1, 1, 1.2);
  }
  // čepice a růžky
  const cap = add(new THREE.SphereGeometry(0.122, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), smat('knit', 0x2a6a38, { roughness: 0.9 }, [4, 2]), u.head, 0, 0.035, -0.01);
  cap.scale.set(0.92, 1.25, 1.08); cap.rotation.x = -0.2;
  const horn = smat('horn', 0xffffff, { roughness: 0.5 }, [1, 1]);
  for (const s of [-1, 1]) add(taper([V(s * 0.05, 0.08, 0.04), V(s * 0.065, 0.13, 0.03), V(s * 0.06, 0.165, 0.0)], 0.014, 0.003, 10, 8), horn, u.head);
  // kozí bradka
  add(new THREE.ConeGeometry(0.025, 0.07, 10), M.hair, u.head, 0, -0.15, 0.06).rotation.x = Math.PI + 0.3;
  // flétna v levé ruce
  add(Cyl(0.006, 0.006, 0.16, 6), mat(0xb89a6a), u.armL.userData.hand, 0, -0.07, 0.05).rotation.x = 1.2;
  g.scale.setScalar(0.92);
  g.userData = { head: u.head, arms: [u.armL, u.armR] };
  return g;
}

// ---------- peří ----------
const featherTex = (() => {
  let t = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#e8e8e8'); gr.addColorStop(1, '#9a9a9a');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 256);
    x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = 1;
    for (let y = 0; y < 256; y += 4) { x.beginPath(); x.moveTo(32, y); x.lineTo(0, y - 18); x.moveTo(32, y); x.lineTo(64, y - 18); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(31, 0, 2, 256);
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();
const featherMats = new Map();
function featherMat(color) {
  if (!featherMats.has(color)) featherMats.set(color, new THREE.MeshStandardMaterial({ color, map: featherTex(), side: THREE.DoubleSide, roughness: 0.75, envMapIntensity: 0.3 }));
  return featherMats.get(color);
}
let featherGeo = null;
function feather() {
  if (!featherGeo) {
    const s = new THREE.Shape();
    s.moveTo(0.5, 0);
    s.bezierCurveTo(1.0, 0.05, 1.0, 0.75, 0.5, 1);
    s.bezierCurveTo(0.05, 0.78, 0.0, 0.05, 0.5, 0);
    featherGeo = new THREE.ShapeGeometry(s, 10);
    featherGeo.translate(-0.5, 0, 0);
  }
  return featherGeo;
}

// Křídlo z per: rozpětí podél +x, náběžná hrana nahoře. Kořen v počátku.
function featherWing(mCovert, mSecond, mPrimary) {
  const w = new THREE.Group();
  const edge = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.6, 0.5, 0), V(1.4, 0.9, 0), V(2.1, 0.7, 0)]);
  add(taper(edge.points, 0.06, 0.025, 20, 8), mCovert, w);
  const put = (m, t, len, wid, dir, z) => {
    const p = edge.getPointAt(t);
    const f = add(feather(), m, w, p.x, p.y, z, true);
    f.scale.set(wid, len, 1);
    f.rotation.z = Math.atan2(dir[0], -dir[1]) + Math.PI;
    return f;
  };
  for (let i = 0; i < 9; i++) { const t = i / 8 * 0.62; put(mSecond, t, 0.75 + t * 0.2, 0.2, [-0.15 + t * 0.8, -1], -0.02 - i * 0.002); }
  for (let i = 0; i < 7; i++) { const t = 0.62 + i / 6 * 0.38; put(mPrimary, t, 1.05 - i * 0.04, 0.17, [0.45 + i * 0.16, -1 + i * 0.1], -0.03 - i * 0.002); }
  for (let i = 0; i < 14; i++) { const t = i / 13; put(mCovert, t, 0.36, 0.17, [0.1 + t * 0.6, -1], 0.012 + i * 0.001); }
  return w;
}

// ---------- tvorové ----------
export function makeHound() {
  const g = new THREE.Group();
  const fur = smat('fur', 0x1f191b, { roughness: 0.95, normal: 1.3 }, [3, 4]);
  const body = add(lathe([[0, -0.75], [0.17, -0.72], [0.27, -0.56], [0.29, -0.36], [0.25, -0.12], [0.3, 0.16], [0.38, 0.4], [0.36, 0.58], [0.22, 0.72], [0, 0.76]], 24), fur, g, 0, 1.0, 0);
  body.rotation.x = Math.PI / 2 - 0.08;
  body.scale.set(0.82, 1, 1.12);
  // krk a hlava
  const neck = group(g, 0, 1.42, 0.82); neck.rotation.x = 0.75;
  add(seg(0.48, 0.17, 0.27, 0.02, 0.6), fur, neck);
  const head = group(g, 0, 1.4, 0.95);
  add(S(0.2, 24, 18), fur, head).scale.set(0.85, 0.85, 1.05);
  const muzzle = group(head, 0, -0.06, 0.1); muzzle.rotation.x = -Math.PI / 2;
  add(seg(0.3, 0.12, 0.07, 0, 0.5), fur, muzzle).scale.set(1, 1, 0.85);
  add(S(0.045, 12, 10), mat(0x0a0a0a, { roughness: 0.3 }), head, 0, -0.025, 0.41).scale.set(1.2, 0.8, 0.9);
  const jaw = group(head, 0, -0.14, 0.1); jaw.rotation.x = -Math.PI / 2 + 0.2;
  add(seg(0.26, 0.08, 0.045), fur, jaw).scale.set(1, 1, 0.6);
  add(S(0.07, 12, 8), mat(0x4a0a0a, { roughness: 0.4 }), head, 0, -0.12, 0.25).scale.set(1, 0.6, 1.8);
  const tooth = mat(0xeae0cc, { roughness: 0.3 });
  for (const s of [-1, 1]) {
    add(new THREE.ConeGeometry(0.012, 0.06, 6), tooth, head, s * 0.05, -0.135, 0.36, false).rotation.x = Math.PI;
    add(new THREE.ConeGeometry(0.009, 0.04, 6), tooth, head, s * 0.04, -0.15, 0.3, false);
  }
  const eye = own(0xff2200, { emissive: 0xff3300, emissiveIntensity: 2 });
  for (const s of [-1, 1]) {
    add(S(0.032, 10, 8), eye, head, s * 0.09, 0.04, 0.16, false);
    add(S(0.05, 10, 8), fur, head, s * 0.09, 0.08, 0.15).scale.set(1.2, 0.5, 1); // nadočnicový oblouk
    const ear = add(new THREE.ConeGeometry(0.08, 0.22, 10), fur, head, s * 0.12, 0.19, -0.04);
    ear.scale.set(1, 1, 0.4); ear.rotation.set(-0.3, 0, -s * 0.35);
  }
  // nohy: přední rovné, zadní s kolenem a hlezenem
  const legs = [];
  const paw = (parent, y) => { const p = add(S(0.065, 12, 10), fur, parent, 0, y, 0.04); p.scale.set(1, 0.6, 1.4); };
  for (const s of [-1, 1]) {
    const l = group(g, s * 0.2, 0.9, 0.5);
    const up = group(l); up.rotation.x = 0.1;
    add(seg(0.4, 0.11, 0.06, 0.02, 0.7), fur, up);
    const lo = group(up, 0, -0.4, 0); lo.rotation.x = -0.15;
    add(seg(0.4, 0.055, 0.042), fur, lo);
    paw(lo, -0.43);
    legs.push(l);
  }
  for (const s of [-1, 1]) {
    const l = group(g, s * 0.2, 0.93, -0.5);
    const th = group(l); th.rotation.x = -0.35;
    add(seg(0.34, 0.14, 0.07, 0.03, 0.6), fur, th);
    const sh = group(th, 0, -0.34, 0); sh.rotation.x = 0.85;
    add(seg(0.33, 0.065, 0.045), fur, sh);
    const hk = group(sh, 0, -0.33, 0); hk.rotation.x = -0.5;
    add(seg(0.22, 0.045, 0.04), fur, hk);
    paw(hk, -0.25);
    legs.push(l);
  }
  // pořadí jako dřív: přední L, přední P, zadní L, zadní P
  add(taper([V(0, 1.08, -0.72), V(0, 0.95, -0.95), V(0, 0.9, -1.2), V(0, 1.0, -1.35)], 0.085, 0.03, 16, 10), fur, g);
  g.userData = { head, legs, eyeMat: eye };
  g.scale.setScalar(1.05);
  return g;
}

export function makeMyrmex() {
  const g = new THREE.Group();
  const shell = smat('chitin', 0x5a1e14, { roughness: 0.3, metalness: 0.15 }, [2, 2]);
  const head = add(S(0.2, 20, 16), shell, g, 0, 0.5, 0.52); head.scale.set(1.05, 0.85, 1);
  add(lathe([[0, -0.2], [0.12, -0.18], [0.14, 0], [0.11, 0.17], [0, 0.2]], 16), shell, g, 0, 0.5, 0.18).rotation.x = Math.PI / 2;
  add(S(0.06, 10, 8), shell, g, 0, 0.47, -0.08);
  const gaster = add(S(0.32, 24, 18), shell, g, 0, 0.55, -0.42); gaster.scale.set(0.9, 0.8, 1.25);
  const eye = own(0x111111, { emissive: 0x330000, emissiveIntensity: 1, roughness: 0.1 });
  for (const s of [-1, 1]) {
    add(S(0.065, 12, 10), eye, g, s * 0.15, 0.56, 0.6, false).scale.set(0.7, 1, 1);
    add(taper([V(s * 0.08, 0.42, 0.66), V(s * 0.12, 0.38, 0.78), V(s * 0.03, 0.36, 0.86)], 0.035, 0.008, 10, 8), shell, g); // kusadla
    add(taper([V(s * 0.06, 0.62, 0.62), V(s * 0.12, 0.8, 0.7), V(s * 0.22, 0.85, 0.92)], 0.012, 0.006, 12, 6), shell, g); // tykadla
  }
  const legs = [];
  for (const z of [0.3, 0.18, 0.06]) for (const s of [-1, 1]) {
    const l = group(g, s * 0.1, 0.48, z);
    const fe = group(l); fe.rotation.z = s * 2.0;
    add(seg(0.32, 0.035, 0.028), shell, fe);
    const ti = group(fe, 0, -0.32, 0); ti.rotation.z = -s * 1.9;
    add(seg(0.42, 0.028, 0.015), shell, ti);
    legs.push(l);
  }
  g.userData = { legs, eyeMat: eye };
  return g;
}

export function makeMinotaur() {
  const g = new THREE.Group();
  const fur = smat('fur', 0x4a2e1a, { roughness: 0.95, normal: 1.4 }, [3, 4]);
  const headFur = smat('fur', 0x33200f, { roughness: 0.95, normal: 1.4 }, [3, 3]);
  const skin = smat('skin', 0x8a5638, { roughness: 0.6, normal: 0.6 }, [4, 4]);
  const hoofM = mat(0x1e1a18, { roughness: 0.4 });
  const legs = [];
  for (const s of [-1, 1]) {
    const l = limb2(g, s * 0.36, 1.45, 0, { len: 0.7, top: 0.25, bot: 0.15, bulge: 0.04, at: 0.6 }, { len: 0.62, top: 0.15, bot: 0.1, bulge: 0.035, at: 0.7 }, fur);
    add(Cyl(0.12, 0.16, 0.18, 16), hoofM, l.userData.lower, 0, -0.68, 0.03);
    legs.push(l);
  }
  // bederní rouška a pás
  const cloth = smat('knit', 0x8a1818, { roughness: 0.9, side: THREE.DoubleSide }, [6, 2]);
  add(lathe([[0.52, 1.78], [0.55, 1.62], [0.6, 1.4], [0.63, 1.12]], 24), cloth, g).scale.set(1.12, 1, 0.8);
  add(Cyl(0.56, 0.56, 0.1, 28), smat('leather', 0x4a3020, { roughness: 0.6 }, [8, 1]), g, 0, 1.76, 0).scale.set(1.12, 1, 0.8);
  add(new THREE.TorusGeometry(0.1, 0.025, 8, 20), mat(0xc8a040, { metalness: 0.8, roughness: 0.3 }), g, 0, 1.76, 0.46);
  // trup se svaly
  add(lathe([[0, 1.55], [0.42, 1.55], [0.47, 1.72], [0.44, 1.88], [0.5, 2.06], [0.61, 2.3], [0.67, 2.48], [0.65, 2.62], [0.52, 2.75], [0.3, 2.85], [0, 2.88]]), skin, g).scale.set(1.18, 1, 0.72);
  for (const s of [-1, 1]) {
    add(S(0.27, 20, 14), skin, g, s * 0.23, 2.42, 0.32).scale.set(1.1, 0.72, 0.5); // prsní svaly
    add(S(0.25, 20, 14), skin, g, s * 0.8, 2.65, 0); // ramena
    for (const y of [2.16, 2.02, 1.88]) add(S(0.075, 12, 10), skin, g, s * 0.085, y, 0.31).scale.set(1, 0.8, 0.45); // břišní
  }
  add(S(0.3, 20, 14), skin, g, 0, 2.78, -0.08).scale.set(1.7, 0.7, 0.9); // šíje
  add(Cyl(0.28, 0.36, 0.35, 18), headFur, g, 0, 2.9, 0.08);
  // hlava býka
  const head = group(g, 0, 3.05, 0.2);
  add(S(0.36, 28, 20), headFur, head).scale.set(0.95, 0.95, 1.05);
  for (let i = 0; i < 7; i++) add(S(0.08, 10, 8), headFur, head, Math.cos(i * 0.9) * 0.14, 0.26 + Math.sin(i * 2.1) * 0.04, 0.22 + Math.sin(i) * 0.05);
  const muzzleM = smat('leather', 0x3e281c, { roughness: 0.55 }, [2, 2]);
  const muzzle = add(Cyl(0.2, 0.27, 0.42, 22), muzzleM, head, 0, -0.16, 0.36); muzzle.rotation.x = Math.PI / 2;
  add(S(0.21, 20, 14), mat(0x2a1a14, { roughness: 0.35 }), head, 0, -0.18, 0.56).scale.set(1, 0.75, 0.4);
  for (const s of [-1, 1]) add(S(0.04, 10, 8), mat(0x050505), head, s * 0.08, -0.17, 0.64, false).scale.set(1, 0.7, 0.5);
  const jaw = add(Cyl(0.13, 0.2, 0.34, 18), muzzleM, head, 0, -0.32, 0.3); jaw.rotation.x = Math.PI / 2 + 0.1;
  add(new THREE.TorusGeometry(0.09, 0.018, 8, 20), mat(0xd4af37, { metalness: 0.9, roughness: 0.2 }), head, 0, -0.28, 0.62);
  const eye = own(0x330000, { emissive: 0xff0000, emissiveIntensity: 0.4 });
  for (const s of [-1, 1]) {
    add(S(0.06, 12, 10), eye, head, s * 0.26, 0.06, 0.22, false);
    add(S(0.09, 12, 8), headFur, head, s * 0.24, 0.12, 0.22).scale.set(1.2, 0.5, 0.8); // obočí
    const ear = add(S(0.13, 14, 10), headFur, head, s * 0.42, 0.04, -0.05); ear.scale.set(1.4, 0.45, 0.7); ear.rotation.z = s * 0.25;
    add(S(0.1, 12, 8), mat(0x8a5a4a, { roughness: 0.8 }), head, s * 0.44, 0.03, -0.02).scale.set(1.3, 0.3, 0.5);
  }
  const horn = smat('horn', 0xffffff, { roughness: 0.45 }, [1, 1]);
  for (const s of [-1, 1]) add(taper([V(s * 0.28, 0.2, 0), V(s * 0.62, 0.3, 0.02), V(s * 0.84, 0.52, 0.2), V(s * 0.8, 0.78, 0.42)], 0.1, 0.012, 28, 12), horn, head);
  // paže s pěstmi
  const arms = [];
  for (const s of [-1, 1]) {
    const a = limb2(g, s * 0.9, 2.62, 0, { len: 0.6, top: 0.2, bot: 0.14, bulge: 0.05, at: 0.55 }, { len: 0.55, top: 0.16, bot: 0.11, bulge: 0.035, at: 0.75 }, skin);
    a.userData.lower.rotation.x = -0.25;
    add(new RoundedBoxGeometry(0.2, 0.22, 0.22, 3, 0.06), skin, a.userData.lower, 0, -0.66, 0.02);
    add(Cyl(0.13, 0.13, 0.1, 16), smat('leather', 0x4a3020, { roughness: 0.6 }, [4, 1]), a.userData.lower, 0, -0.45, 0); // náramek
    arms.push(a);
  }
  const stars = group(g, 0, 3.9, 0); stars.visible = false;
  for (let i = 0; i < 5; i++) {
    add(new THREE.OctahedronGeometry(0.12), own(0xffee66, { emissive: 0xffee66, emissiveIntensity: 2 }), stars, Math.cos(i * 1.26) * 0.65, 0, Math.sin(i * 1.26) * 0.65, false);
  }
  g.userData = { head, legs, arms, eyeMat: eye, stars };
  return g;
}

// Řecká sfinga: sedící lví tělo, ženská hlava s účesem a orlí křídla.
export function makeSphinx() {
  const g = new THREE.Group();
  const lion = smat('fur', 0xc29a58, { roughness: 0.85, normal: 0.9 }, [4, 5]);
  const skin = smat('skin', 0xd9a882, { roughness: 0.5, normal: 0.3 }, [3, 3]);
  // tělo šikmo od zadku k hrudi
  const body = add(lathe([[0, 0], [0.38, 0.05], [0.55, 0.3], [0.56, 0.7], [0.48, 1.1], [0.58, 1.5], [0.66, 1.8], [0.55, 2.05], [0.3, 2.2], [0, 2.25]], 28), lion, g, 0, 0.45, -1.0);
  body.rotation.x = 0.95;
  body.scale.set(0.85, 1, 1);
  // zadní nohy složené v sedu
  for (const s of [-1, 1]) {
    add(S(0.5, 24, 18), lion, g, s * 0.42, 0.55, -0.85).scale.set(0.55, 0.9, 1.15);
    add(seg(0.55, 0.12, 0.1), lion, g, s * 0.5, 0.15, -0.45).rotation.x = Math.PI / 2;
    add(new RoundedBoxGeometry(0.24, 0.12, 0.3, 3, 0.05), lion, g, s * 0.5, 0.06, 0.15);
  }
  // přední nohy rovné
  for (const s of [-1, 1]) {
    const l = group(g, s * 0.38, 1.3, 0.78);
    add(seg(1.12, 0.21, 0.12, 0.03, 0.75), lion, l);
    add(new RoundedBoxGeometry(0.26, 0.13, 0.34, 3, 0.06), lion, l, 0, -1.22, 0.1);
    for (let i = 0; i < 4; i++) add(S(0.045, 10, 8), lion, l, -0.09 + i * 0.06, -1.24, 0.28);
  }
  add(taper([V(0, 0.4, -1.5), V(0.3, 0.12, -1.6), V(0.7, 0.1, -1.2), V(0.85, 0.35, -0.8)], 0.06, 0.03, 20, 8), lion, g);
  add(S(0.09, 12, 10), smat('fur', 0x6a4a2a, { roughness: 0.9 }, [2, 2]), g, 0.87, 0.42, -0.74).scale.set(1, 1.4, 1);
  // krk a hlava
  const neck = group(g, 0, 2.32, 1.12); neck.rotation.x = 0.5;
  add(seg(0.5, 0.1, 0.13, 0, 0.5), skin, neck);
  add(S(0.3, 20, 16), lion, g, 0, 1.95, 0.86).scale.set(1.15, 0.75, 0.8); // hříva na hrudi
  const head = group(g, 0, 2.55, 1.15);
  const M = { skin, hair: smat('hair', 0x2a1810, { roughness: 0.55, normal: 1.3 }, [5, 2]), iris: mat(0xb08020, { roughness: 0.15 }), lip: mat(0xa04a44, { roughness: 0.4 }) };
  const hs = group(head); hs.scale.setScalar(2.8);
  add(headGeo(0.1), skin, hs);
  humanFace(hs, 0.1, M, { brow: 0x2a1810 });
  add(hairGeo(0.1, { cover: 0.6, tilt: 0.78, messy: 0.05, puff: 1.1 }), M.hair, hs, 0, 0.005, -0.005);
  add(S(0.07, 16, 12), M.hair, hs, 0, 0.06, -0.12).scale.set(1.2, 1, 1); // drdol
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = s * (0.07 + i * 0.012), z = -0.02 - i * 0.03;
    const pts = [];
    for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(V(x + Math.cos(t * 14 + i) * 0.012, -0.02 - t * 0.2, z + Math.sin(t * 14 + i) * 0.012)); }
    add(taper(pts, 0.016, 0.008, 30, 6), M.hair, hs);
  }
  const crown = add(new THREE.TorusGeometry(0.105, 0.007, 8, 32), mat(0xd4af37, { metalness: 0.9, roughness: 0.25 }), hs, 0, 0.05, -0.005);
  crown.rotation.x = Math.PI / 2 - 0.3; crown.scale.set(0.88, 1.08, 1);
  for (const s of [-1, 1]) add(S(0.012, 8, 6), mat(0xd4af37, { metalness: 0.9, roughness: 0.25 }), hs, s * 0.088, -0.035, -0.005, false);
  // křídla
  const wl = featherWing(featherMat(0xe8dcc0), featherMat(0xd8c49a), featherMat(0xa88a5a));
  wl.position.set(-0.45, 1.75, 0.35); wl.rotation.set(0, Math.PI / 2 + 0.8, 0.5); wl.scale.setScalar(1.1); g.add(wl);
  const wr = featherWing(featherMat(0xe8dcc0), featherMat(0xd8c49a), featherMat(0xa88a5a));
  wr.position.set(0.45, 1.75, 0.35); wr.rotation.set(0, -Math.PI / 2 - 0.8, -0.5); wr.scale.set(-1.1, 1.1, 1.1); g.add(wr);
  g.userData = { head, wl, wr };
  return g;
}

export function makeAutomaton() {
  const g = new THREE.Group();
  const bronze = smat('bronze', 0xb07a35, { metalness: 0.85, roughness: 0.35 }, [2, 2]);
  add(lathe([[0, 0.45], [0.36, 0.48], [0.4, 0.7], [0.34, 0.95], [0.42, 1.25], [0.44, 1.45], [0.3, 1.58], [0, 1.6]], 24), bronze, g);
  for (let y = 0.75; y < 1.45; y += 0.16) add(new THREE.TorusGeometry(0.4 - Math.abs(y - 1.15) * 0.15, 0.015, 6, 28), bronze, g, 0, y, 0).rotation.x = Math.PI / 2;
  const head = group(g, 0, 1.82, 0);
  add(S(0.26, 24, 18), bronze, head).scale.set(1, 1.1, 1);
  add(new THREE.TorusGeometry(0.24, 0.035, 8, 28, Math.PI * 0.8), own(0x66ccff, { emissive: 0x66ccff, emissiveIntensity: 2 }), head, 0, 0.03, 0).rotation.set(Math.PI / 2, 0, Math.PI * 0.1);
  add(new RoundedBoxGeometry(0.04, 0.2, 0.32, 2, 0.015), bronze, head, 0, 0.27, -0.02); // hřeben
  add(Cyl(0.1, 0.13, 0.15, 16), bronze, g, 0, 1.64, 0);
  const gear = add(new THREE.TorusGeometry(0.17, 0.045, 6, 12), bronze, g, 0, 1.05, 0.38);
  add(Cyl(0.05, 0.05, 0.06, 12), bronze, gear).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    add(S(0.12, 14, 10), bronze, g, s * 0.46, 1.42, 0);
    const a = limb2(g, s * 0.5, 1.38, 0, { len: 0.36, top: 0.075, bot: 0.06 }, { len: 0.34, top: 0.065, bot: 0.05 }, bronze);
    a.rotation.z = s * 0.12; a.userData.lower.rotation.x = -0.4;
    add(new RoundedBoxGeometry(0.11, 0.14, 0.09, 2, 0.03), bronze, a.userData.lower, 0, -0.4, 0);
  }
  add(Cyl(0.42, 0.52, 0.3, 24), bronze, g, 0, 0.15, 0);
  add(Cyl(0.36, 0.42, 0.18, 24), bronze, g, 0, 0.38, 0);
  g.userData = { head, gear };
  return g;
}

// Kerkóps: malý chlupatý otrava s opičí tváří a dlouhým ocasem.
export function makePest() {
  const g = new THREE.Group();
  const fur = smat('fur', 0x8a6a4a, { roughness: 0.95, normal: 1.3 }, [3, 3]);
  const face = smat('skin', 0xc89a80, { roughness: 0.6, normal: 0.4 }, [2, 2]);
  add(lathe([[0, 0.3], [0.17, 0.33], [0.22, 0.45], [0.2, 0.6], [0.15, 0.72], [0.08, 0.78], [0, 0.79]], 20), fur, g).scale.set(1, 1, 0.85);
  const head = group(g, 0, 0.95, 0.04);
  add(S(0.2, 24, 18), fur, head).scale.set(1, 0.95, 0.95);
  add(S(0.13, 18, 14), face, head, 0, -0.03, 0.12).scale.set(1.1, 0.9, 0.7);
  add(S(0.07, 14, 10), face, head, 0, -0.08, 0.2).scale.set(1.2, 0.8, 0.8);
  const white = mat(0xf0e8c8, { roughness: 0.2 });
  for (const s of [-1, 1]) {
    add(S(0.035, 12, 10), white, head, s * 0.055, 0.02, 0.19, false);
    add(S(0.022, 10, 8), mat(0x2a1a0a, { roughness: 0.1 }), head, s * 0.055, 0.02, 0.215, false);
    add(S(0.1, 14, 10), face, head, s * 0.2, 0.03, 0).scale.set(0.35, 0.9, 0.75);
    add(S(0.035, 8, 6), fur, head, s * 0.06, 0.07, 0.17, false).scale.set(1.6, 0.5, 1);
  }
  add(C(0.012, 0.06), mat(0x6a3a30), head, 0, -0.12, 0.2, false).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) {
    const l = limb2(g, s * 0.09, 0.36, 0, { len: 0.17, top: 0.06, bot: 0.04 }, { len: 0.16, top: 0.04, bot: 0.03 }, fur);
    l.rotation.x = -0.6; l.userData.lower.rotation.x = 1.0;
    add(new RoundedBoxGeometry(0.06, 0.035, 0.12, 2, 0.015), face, l.userData.lower, 0, -0.17, 0.03);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const a = limb2(g, s * 0.2, 0.7, 0, { len: 0.18, top: 0.045, bot: 0.035 }, { len: 0.18, top: 0.035, bot: 0.028 }, fur);
    a.userData.lower.rotation.x = -0.4;
    add(S(0.035, 10, 8), face, a.userData.lower, 0, -0.2, 0);
    arms.push(a);
  }
  add(taper([V(0, 0.38, -0.15), V(0, 0.25, -0.45), V(0, 0.55, -0.7), V(0, 0.9, -0.62), V(0.05, 1.0, -0.45)], 0.04, 0.015, 24, 8), fur, g);
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

// Předměty dalších questů se registrují sem (hades/models.js).
export const itemMakers = {};

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
  } else if (itemMakers[type]) itemMakers[type](g);
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

// Stavební díly pro postavy dalších questů.
export { add, S, C, Cyl, group, lathe, seg, limb2, taper, V, own, buildHuman, headGeo, hairGeo, humanFace, featherWing, featherMat, makeBowMesh, TORSO };
