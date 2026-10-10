// Fotografické textury (tools/textures/prepare.py) a z nich materiály s reliéfem.
import * as THREE from 'three';
import stone from './assets/tex/stone.jpg';
import stoneN from './assets/tex/stone_n.jpg';
import sand from './assets/tex/sand.jpg';
import sandN from './assets/tex/sand_n.jpg';
import wood from './assets/tex/wood.jpg';
import woodN from './assets/tex/wood_n.jpg';
import grass from './assets/tex/grass.jpg';
import rock from './assets/tex/rock.jpg';
import rockN from './assets/tex/rock_n.jpg';
import marble from './assets/tex/marble.jpg';
import marbleN from './assets/tex/marble_n.jpg';

const SETS = {
  stone: [stone, stoneN], sand: [sand, sandN], wood: [wood, woodN], grass: [grass, null], rock: [rock, rockN], marble: [marble, marbleN],
};

const loader = new THREE.TextureLoader();
const base = {};
const clonesOf = new Map();
const ready = new Set();
// Kopie textur (každá s vlastním opakováním) se obnoví, až se obrázek načte.
function load(b64, color) {
  const clones = [];
  const t = loader.load('data:image/jpeg;base64,' + b64, () => { ready.add(t); clones.forEach((c) => { c.needsUpdate = true; }); });
  clonesOf.set(t, clones);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function get(name) {
  if (!base[name]) {
    const [c, n] = SETS[name];
    base[name] = { map: load(c, true), normalMap: n ? load(n, false) : null };
  }
  return base[name];
}

// Materiál z fotografické textury. rx, ry = kolikrát se textura opakuje.
export function pbr(name, rx = 1, ry = 1, opts = {}) {
  const b = get(name);
  const rep = (t) => {
    if (!t) return null;
    const c = t.clone();
    c.repeat.set(rx, ry);
    if (ready.has(t)) c.needsUpdate = true;
    clonesOf.get(t).push(c);
    return c;
  };
  const { normal = 1, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial({ map: rep(b.map), normalMap: rep(b.normalMap), roughness: 0.85, envMapIntensity: 0.12, ...rest });
  if (m.normalMap) m.normalScale.set(normal, normal);
  return m;
}
