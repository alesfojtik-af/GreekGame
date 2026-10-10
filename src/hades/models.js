// Postavy a předměty Hádova paláce. Stavební díly sdílí s models.js.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { smat } from '../surface.js';
import { mat, itemMakers, add, S, C, Cyl, group, lathe, seg, limb2, taper, V, own, buildHuman, headGeo } from '../models.js';

const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 2, r);

// Rukávy přes celou paži (oblek, róba).
function sleeves(u, m, w = 1) {
  for (const a of [u.armL, u.armR]) {
    add(seg(0.28, 0.056 * w, 0.047 * w, 0.004), m, a);
    add(seg(0.22, 0.048 * w, 0.038 * w), m, a.userData.lower);
  }
}

// Vsedě: stehna dopředu, holeně svisle dolů.
function sit(u) {
  for (const l of [u.legL, u.legR]) { l.rotation.x = -Math.PI / 2; l.userData.lower.rotation.x = Math.PI / 2; }
}

// ---------- Charón: převozník v italském obleku a slunečních brýlích ----------
export function makeCharon() {
  const g = new THREE.Group();
  const suit = smat('knit', 0x22222a, { roughness: 0.55, normal: 0.3 }, [8, 8]);
  const M = {
    skin: smat('skin', 0x8a5a3c, { roughness: 0.5, normal: 0.3 }, [3, 3]),
    shirt: suit, pants: suit,
    shoe: smat('leather', 0x141414, { roughness: 0.3 }, [2, 2]), sole: mat(0x0a0a0a),
    hair: smat('hair', 0xe8dcae, { roughness: 0.6, normal: 0.8 }, [4, 2]),
  };
  const u = buildHuman(g, M, { brow: 0xb8a070, hair: { cover: 0.5, tilt: 0.5, messy: 0.02, puff: 1.03 } });
  sleeves(u, suit);
  add(new THREE.ConeGeometry(0.05, 0.15, 3), mat(0xf0f0f0, { roughness: 0.5 }), g, 0, 1.385, 0.103).rotation.set(Math.PI, 0, 0);
  add(new THREE.BoxGeometry(0.028, 0.22, 0.008), mat(0x6a0a18, { roughness: 0.4 }), g, 0, 1.28, 0.118);
  const glass = mat(0x050505, { roughness: 0.05, metalness: 0.7 });
  for (const s of [-1, 1]) add(rbox(0.07, 0.04, 0.012, 0.01), glass, u.head, s * 0.036, 0.016, 0.094, false);
  add(new THREE.BoxGeometry(0.03, 0.008, 0.008), glass, u.head, 0, 0.026, 0.1, false);
  // bidlo v pravé ruce
  u.armR.rotation.x = -0.35;
  u.armR.userData.lower.rotation.x = -0.6;
  add(Cyl(0.022, 0.022, 3.4, 8), smat('leather', 0x5a3a20, { roughness: 0.8 }, [1, 8]), u.armR.userData.hand, 0, 0.9, 0.02);
  g.scale.setScalar(1.12);
  g.userData = { head: u.head, armR: u.armR };
  return g;
}

// Charónův člun: dlouhý černý trup, lavička a lucerna na přídi (příď míří k +z).
export function makeBoat() {
  const g = new THREE.Group();
  const wood = smat('leather', 0x2a1e18, { roughness: 0.8, normal: 0.8, side: THREE.DoubleSide }, [6, 2]);
  const hull = add(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wood, g, 0, 0.55, 0);
  hull.scale.set(0.95, 0.6, 2.4);
  const rim = add(new THREE.TorusGeometry(1, 0.05, 8, 48), smat('leather', 0x1a120e, { roughness: 0.7 }, [12, 1]), g, 0, 0.55, 0);
  rim.rotation.x = Math.PI / 2; rim.scale.set(0.95, 2.4, 1);
  add(new THREE.BoxGeometry(1.5, 0.06, 0.4), wood, g, 0, 0.42, -0.6);
  add(new THREE.BoxGeometry(1.5, 0.06, 0.4), wood, g, 0, 0.42, 0.7);
  add(new THREE.BoxGeometry(1.2, 0.04, 3.6), wood, g, 0, 0.12, 0);
  // příď s lucernou
  add(Cyl(0.03, 0.03, 1.2, 8), mat(0x2a2420, { metalness: 0.6 }), g, 0, 1.0, 2.2);
  const lamp = add(S(0.12, 14, 10), own(0x9affe0, { emissive: 0x6affd0, emissiveIntensity: 2.5 }), g, 0, 1.55, 2.25, false);
  add(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 6, 1, true), mat(0x3a3430, { metalness: 0.7, side: THREE.DoubleSide }), g, 0, 1.55, 2.25);
  g.userData = { lamp };
  return g;
}

// ---------- Kerberos: obří pes se třemi hlavami ----------
function dogHead(parent, fur, eye) {
  const head = group(parent);
  add(S(0.2, 24, 18), fur, head).scale.set(0.85, 0.85, 1.05);
  const muzzle = group(head, 0, -0.06, 0.1); muzzle.rotation.x = -Math.PI / 2;
  add(seg(0.3, 0.12, 0.07, 0, 0.5), fur, muzzle).scale.set(1, 1, 0.85);
  add(S(0.045, 12, 10), mat(0x0a0a0a, { roughness: 0.3 }), head, 0, -0.025, 0.41).scale.set(1.2, 0.8, 0.9);
  const jaw = group(head, 0, -0.14, 0.1); jaw.rotation.x = -Math.PI / 2 + 0.2;
  add(seg(0.26, 0.08, 0.045), fur, jaw).scale.set(1, 1, 0.6);
  add(S(0.07, 12, 8), mat(0x5a0a0a, { roughness: 0.4 }), head, 0, -0.12, 0.25).scale.set(1, 0.6, 1.8);
  const tooth = mat(0xeae0cc, { roughness: 0.3 });
  for (const s of [-1, 1]) {
    add(new THREE.ConeGeometry(0.014, 0.07, 6), tooth, head, s * 0.05, -0.135, 0.36, false).rotation.x = Math.PI;
    add(new THREE.ConeGeometry(0.01, 0.045, 6), tooth, jaw, s * 0.04, -0.2, 0.02, false).rotation.x = Math.PI / 2;
    add(S(0.032, 10, 8), eye, head, s * 0.09, 0.04, 0.16, false);
    add(S(0.05, 10, 8), fur, head, s * 0.09, 0.08, 0.15).scale.set(1.2, 0.5, 1);
    const ear = add(new THREE.ConeGeometry(0.08, 0.22, 10), fur, head, s * 0.12, 0.19, -0.04);
    ear.scale.set(1, 1, 0.4); ear.rotation.set(-0.3, 0, -s * 0.35);
  }
  return { head, jaw };
}

export function makeCerberus() {
  const g = new THREE.Group();
  const fur = smat('fur', 0x3a3034, { roughness: 0.85, normal: 1.4 }, [4, 5]);
  const body = add(lathe([[0, -0.78], [0.18, -0.74], [0.29, -0.56], [0.31, -0.36], [0.27, -0.12], [0.33, 0.16], [0.42, 0.4], [0.42, 0.58], [0.3, 0.74], [0, 0.8]], 28), fur, g, 0, 1.0, 0);
  body.rotation.x = Math.PI / 2 - 0.1;
  body.scale.set(0.95, 1, 1.12);
  const spikes = mat(0x5a4a3a, { metalness: 0.7, roughness: 0.35 });
  const heads = [];
  for (const [i, x] of [[0, -0.3], [1, 0], [2, 0.3]]) {
    const pivot = group(g, x, 1.3, 0.62);
    pivot.rotation.y = x * 1.3;
    add(taper([V(0, -0.05, -0.1), V(0, 0.2, 0.15), V(0, 0.38, 0.38)], 0.2, 0.14, 14, 12), fur, pivot);
    const collar = add(new THREE.TorusGeometry(0.17, 0.035, 8, 20), mat(0x2a1e14, { roughness: 0.5 }), pivot, 0, 0.18, 0.12);
    collar.rotation.x = Math.PI / 2 - 0.8;
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2;
      add(new THREE.ConeGeometry(0.02, 0.07, 6), spikes, collar, Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0, false).rotation.z = a - Math.PI / 2;
    }
    const eye = own(0xff2200, { emissive: 0xff3300, emissiveIntensity: 2 });
    const neckTip = group(pivot, 0, 0.42, 0.45);
    const h = dogHead(neckTip, fur, eye);
    heads.push({ pivot, tip: neckTip, head: h.head, jaw: h.jaw, eye, i });
  }
  // nohy jako u pekelného psa
  const legs = [];
  const paw = (parent, y) => { const p = add(S(0.07, 12, 10), fur, parent, 0, y, 0.04); p.scale.set(1, 0.6, 1.4); };
  for (const s of [-1, 1]) {
    const l = group(g, s * 0.24, 0.9, 0.5);
    add(seg(0.42, 0.12, 0.065, 0.02, 0.7), fur, l);
    const lo = group(l, 0, -0.42, 0); lo.rotation.x = -0.15;
    add(seg(0.4, 0.06, 0.045), fur, lo);
    paw(lo, -0.43);
    legs.push(l);
  }
  for (const s of [-1, 1]) {
    const l = group(g, s * 0.24, 0.93, -0.5);
    const th = group(l); th.rotation.x = -0.35;
    add(seg(0.34, 0.15, 0.075, 0.03, 0.6), fur, th);
    const sh = group(th, 0, -0.34, 0); sh.rotation.x = 0.85;
    add(seg(0.33, 0.07, 0.048), fur, sh);
    const hk = group(sh, 0, -0.33, 0); hk.rotation.x = -0.5;
    add(seg(0.22, 0.048, 0.042), fur, hk);
    paw(hk, -0.25);
    legs.push(l);
  }
  // hadí ocas
  add(taper([V(0, 1.1, -0.75), V(0, 1.0, -1.0), V(0.15, 0.9, -1.25), V(0.05, 1.05, -1.45), V(-0.1, 1.2, -1.5)], 0.09, 0.025, 20, 10), fur, g);
  const zzz = group(g, 0, 2.2, 0.6); zzz.visible = false;
  g.userData = { heads, legs, zzz };
  g.scale.setScalar(2.3);
  return g;
}

// ---------- Hádés: pán podsvětí na trůnu ----------
export function makeHades() {
  const g = new THREE.Group();
  const robe = smat('knit', 0x2a1c3a, { roughness: 0.75, normal: 0.5 }, [8, 8]);
  const hair = smat('hair', 0x0a0808, { roughness: 0.5, normal: 1.2 }, [4, 3]);
  const M = {
    skin: smat('skin', 0xd6cdc6, { roughness: 0.45, normal: 0.3 }, [3, 3]),
    shirt: robe, pants: robe, shoe: smat('leather', 0x0a0a0a, { roughness: 0.4 }, [2, 2]), hair,
    iris: own(0x1a0606, { emissive: 0x501010, emissiveIntensity: 0.8, roughness: 0.1 }),
  };
  const u = buildHuman(g, M, { brow: 0x0a0808, hair: { cover: 0.58, tilt: 0.5, messy: 0.04, puff: 1.08 } });
  sleeves(u, robe, 1.25);
  sit(u);
  add(S(0.075, 16, 12), hair, u.head, 0, -0.12, 0.06).scale.set(1.05, 1.25, 0.75); // vousy
  add(S(0.11, 16, 12), hair, u.head, 0, -0.1, -0.05).scale.set(1.05, 1.7, 0.6); // dlouhé vlasy
  // koruna z černého železa
  const iron = mat(0x1a1a20, { metalness: 0.85, roughness: 0.3 });
  const crown = add(new THREE.TorusGeometry(0.1, 0.012, 8, 32), iron, u.head, 0, 0.09, 0);
  crown.rotation.x = Math.PI / 2; crown.scale.set(0.88, 1.08, 1);
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * Math.PI * 2;
    add(new THREE.ConeGeometry(0.012, 0.07, 6), iron, u.head, Math.cos(a) * 0.088, 0.13, Math.sin(a) * 0.108, false);
  }
  // plášť
  add(new THREE.BoxGeometry(0.5, 1.2, 0.03), robe, g, 0, 0.85, -0.16);
  for (const a of [u.armL, u.armR]) { a.rotation.x = -0.75; a.userData.lower.rotation.x = -0.55; }
  g.scale.setScalar(1.35);
  g.userData = { head: u.head, armR: u.armR, armL: u.armL };
  return g;
}

// ---------- Persefona: královna podsvětí v zahradě ----------
export function makePersephone() {
  const g = new THREE.Group();
  const dress = smat('knit', 0x2e5a34, { roughness: 0.75, normal: 0.4, side: THREE.DoubleSide }, [6, 6]);
  const hair = smat('hair', 0x6a2a14, { roughness: 0.5, normal: 1.2 }, [4, 3]);
  const M = {
    skin: smat('skin', 0xe8c0a2, { roughness: 0.45, normal: 0.3 }, [3, 3]),
    shirt: dress, pants: dress, shoe: mat(0x3a2a1a), hair,
    iris: mat(0x2a6a3a, { roughness: 0.15 }), lip: mat(0xb04a4a, { roughness: 0.4 }),
  };
  const u = buildHuman(g, M, { brow: 0x5a2410, hair: { cover: 0.62, tilt: 0.5, messy: 0.03, puff: 1.1 } });
  add(lathe([[0.15, 0.92], [0.2, 0.7], [0.3, 0.35], [0.38, 0.03], [0.0001, 0.03]].reverse(), 28), dress, g).scale.set(1, 1, 0.8);
  add(S(0.12, 16, 12), hair, u.head, 0, -0.14, -0.06).scale.set(1.15, 2.0, 0.6);
  // věnec z květin
  const wreath = add(new THREE.TorusGeometry(0.1, 0.012, 8, 32), mat(0x2a5a20), u.head, 0, 0.08, 0);
  wreath.rotation.x = Math.PI / 2 - 0.25; wreath.scale.set(0.9, 1.1, 1);
  const fl = [0xd8303a, 0xf4f0e8, 0xe87aa0];
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2;
    add(S(0.016, 8, 6), mat(fl[k % 3], { roughness: 0.6 }), u.head, Math.cos(a) * 0.09, 0.085 + Math.sin(a) * 0.02, Math.sin(a) * 0.11, false);
  }
  // granátové jablko v pravé ruce
  u.armR.rotation.x = -0.9; u.armR.userData.lower.rotation.x = -0.9;
  const pom = add(S(0.05, 14, 10), mat(0x9a1020, { roughness: 0.4 }), u.armR.userData.hand, 0, -0.1, 0.04);
  for (let k = 0; k < 5; k++) add(new THREE.ConeGeometry(0.008, 0.025, 4), mat(0x6a0a14), pom, Math.cos(k * 1.26) * 0.015, 0.05, Math.sin(k * 1.26) * 0.015, false);
  g.scale.setScalar(1.04);
  g.userData = { head: u.head, armR: u.armR, armL: u.armL, pom };
  return g;
}

// ---------- kostlivec, strážce zahrady ----------
export function makeSkeleton() {
  const g = new THREE.Group();
  const bone = mat(0xd9cfb2, { roughness: 0.7 });
  const dark = mat(0x0a0806, { roughness: 1 });
  const bronze = smat('bronze', 0xa8783a, { metalness: 0.85, roughness: 0.35 }, [2, 2]);
  add(new THREE.TorusGeometry(0.1, 0.035, 8, 18), bone, g, 0, 0.9, 0).rotation.x = Math.PI / 2;
  for (let y = 0.96; y < 1.46; y += 0.055) add(Cyl(0.024, 0.03, 0.04, 8), bone, g, 0, y, -0.05);
  for (let i = 0; i < 5; i++) {
    const r = add(new THREE.TorusGeometry(0.135 - i * 0.006, 0.012, 6, 22, Math.PI * 1.7), bone, g, 0, 1.38 - i * 0.065, -0.01);
    r.rotation.set(-Math.PI / 2, 0, -1.1); r.scale.set(1, 0.72, 1);
  }
  add(new THREE.BoxGeometry(0.03, 0.22, 0.02), bone, g, 0, 1.3, 0.09);
  add(Cyl(0.012, 0.012, 0.32, 6), bone, g, 0, 1.44, 0).rotation.z = Math.PI / 2; // klíční kosti
  const head = group(g, 0, 1.6, 0.01);
  add(headGeo(0.1), bone, head);
  const eye = own(0xff6a20, { emissive: 0xff4a10, emissiveIntensity: 1.5 });
  for (const s of [-1, 1]) {
    add(S(0.032, 12, 10), dark, head, s * 0.035, 0.012, 0.075, false);
    add(S(0.012, 8, 6), eye, head, s * 0.035, 0.012, 0.095, false);
  }
  add(new THREE.ConeGeometry(0.014, 0.03, 3), dark, head, 0, -0.035, 0.1, false).rotation.x = Math.PI;
  add(new THREE.BoxGeometry(0.075, 0.025, 0.02), mat(0xece4cc), head, 0, -0.085, 0.09, false);
  // bronzová přilba s chocholem
  add(new THREE.SphereGeometry(0.125, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), bronze, head, 0, 0.03, -0.005).scale.set(0.92, 1.15, 1.05);
  const crest = add(new THREE.BoxGeometry(0.03, 0.09, 0.26), mat(0x8a1414, { roughness: 0.9 }), head, 0, 0.17, -0.02);
  crest.scale.set(1, 1, 1);
  const u = { head, eye };
  for (const s of [-1, 1]) {
    add(S(0.035, 10, 8), bone, g, s * 0.17, 1.42, 0);
    const arm = limb2(g, s * 0.17, 1.4, 0, { len: 0.28, top: 0.022, bot: 0.017 }, { len: 0.25, top: 0.017, bot: 0.014 }, bone);
    add(new THREE.BoxGeometry(0.03, 0.09, 0.06), bone, arm.userData.lower, 0, -0.29, 0);
    arm.userData.lower.rotation.x = -0.3;
    u[s < 0 ? 'armL' : 'armR'] = arm;
    const leg = limb2(g, s * 0.09, 0.86, 0, { len: 0.39, top: 0.03, bot: 0.022 }, { len: 0.38, top: 0.022, bot: 0.018 }, bone);
    add(new THREE.BoxGeometry(0.06, 0.03, 0.18), bone, leg.userData.lower, 0, -0.4, 0.04);
    u[s < 0 ? 'legL' : 'legR'] = leg;
  }
  // kulatý štít a meč
  const shield = add(Cyl(0.3, 0.3, 0.035, 28), bronze, u.armL.userData.lower, -0.05, -0.15, 0.04);
  shield.rotation.z = Math.PI / 2;
  add(S(0.06, 12, 8), bronze, shield, 0, -0.02, 0).scale.set(1, 0.5, 1);
  const sword = group(u.armR.userData.lower, 0, -0.3, 0);
  add(Cyl(0.014, 0.014, 0.1, 8), mat(0x3a2414), sword).rotation.x = Math.PI / 2;
  const blade = add(new THREE.CylinderGeometry(0.03, 0.02, 0.6, 4), bronze, sword, 0, 0, 0.35);
  blade.rotation.set(Math.PI / 2, Math.PI / 4, 0); blade.scale.set(1, 1, 0.25);
  u.sword = sword;
  g.userData = u;
  return g;
}

// Hromádka kostí, na kterou se kostlivec rozpadne.
export function makeBonePile() {
  const g = new THREE.Group();
  const bone = mat(0xd9cfb2, { roughness: 0.7 });
  for (let i = 0; i < 12; i++) {
    const b = add(C(0.02, 0.25 + (i % 3) * 0.08), bone, g, Math.cos(i * 2.3) * 0.3, 0.03, Math.sin(i * 1.7) * 0.3);
    b.rotation.set(Math.PI / 2, 0, i * 0.9);
  }
  add(headGeo(0.1), bone, g, 0.1, 0.1, 0.05).rotation.z = 1.4;
  add(new THREE.SphereGeometry(0.125, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), smat('bronze', 0xa8783a, { metalness: 0.85, roughness: 0.35 }, [2, 2]), g, -0.25, 0.06, 0.2).rotation.x = 2.2;
  return g;
}

// ---------- Sisyfos a Tantalos ----------
export function makeSisyphus() {
  const g = new THREE.Group();
  const skin = smat('skin', 0xb07a58, { roughness: 0.5, normal: 0.5 }, [3, 3]);
  const hair = smat('hair', 0x4a4038, { roughness: 0.7, normal: 1.4 }, [4, 2]);
  const M = { skin, shirt: skin, pants: skin, shoe: skin, hair };
  const u = buildHuman(g, M, { hair: { cover: 0.56, tilt: 0.55, messy: 0.15 } });
  add(lathe([[0.17, 0.95], [0.19, 0.8], [0.21, 0.62], [0.0001, 0.62]].reverse(), 20), smat('knit', 0x6a5236, { roughness: 0.95, side: THREE.DoubleSide }, [4, 1]), g).scale.set(1, 1, 0.8);
  add(S(0.07, 14, 10), hair, u.head, 0, -0.12, 0.05).scale.set(1, 1.2, 0.8);
  for (const s of [-1, 1]) add(S(0.06, 12, 10), skin, g, s * 0.2, 1.38, 0).scale.set(1.2, 1, 1);
  g.userData = u;
  return g;
}

export function makeTantalus() {
  const g = new THREE.Group();
  const skin = smat('skin', 0xc89a7a, { roughness: 0.5, normal: 0.4 }, [3, 3]);
  const hair = smat('hair', 0x9a9088, { roughness: 0.7, normal: 1.4 }, [4, 2]);
  const M = { skin, shirt: skin, pants: smat('knit', 0x5a5048, { roughness: 0.95 }, [4, 4]), shoe: skin, hair };
  const u = buildHuman(g, M, { hair: { cover: 0.56, tilt: 0.5, messy: 0.2 } });
  add(S(0.07, 14, 10), hair, u.head, 0, -0.13, 0.05).scale.set(1, 1.4, 0.8);
  u.armL.rotation.set(-2.7, 0, 0.15); u.armR.rotation.set(-2.5, 0, -0.15);
  g.userData = u;
  return g;
}

// ---------- předměty ----------
itemMakers.obol = (g) => {
  const coin = add(Cyl(0.13, 0.13, 0.025, 28), mat(0xd8dce4, { metalness: 0.9, roughness: 0.25, emissive: 0x606878, emissiveIntensity: 0.4 }), g);
  coin.rotation.x = Math.PI / 2;
  add(new THREE.TorusGeometry(0.11, 0.008, 6, 28), mat(0xa8acb4, { metalness: 0.9, roughness: 0.3 }), g, 0, 0, 0.014);
};
itemMakers.ball = (g) => {
  add(S(0.18, 24, 18), mat(0xd8201a, { roughness: 0.35, emissive: 0x400000, emissiveIntensity: 0.4 }), g);
};
itemMakers.helm = (g) => {
  const m = mat(0x2a2430, { metalness: 0.9, roughness: 0.25, emissive: 0x3a1a5a, emissiveIntensity: 0.6 });
  add(new THREE.SphereGeometry(0.26, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), m, g).scale.set(0.9, 1.15, 1.05);
  for (const s of [-1, 1]) add(rbox(0.04, 0.24, 0.18, 0.015), m, g, s * 0.2, -0.12, 0.1);
  add(new THREE.BoxGeometry(0.06, 0.16, 0.5), mat(0x1a0a2a, { roughness: 0.9 }), g, 0, 0.32, -0.02);
  add(S(0.4, 16, 12), own(0x6a3aaa, { transparent: true, opacity: 0.12, emissive: 0x6a3aaa, emissiveIntensity: 1, depthWrite: false }), g, 0, 0.05, 0, false);
};
