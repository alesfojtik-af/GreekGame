// Útěk z Labyrintu: hlavní smyčka, hráč, nepřátelé, logika místností.
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { makePlayer, makeHound, makeMinotaur, makeItem } from './models.js';
import {
  PARENTS, INTRO, SPHINX_QUESTIONS, SPHINX, GATE_RIDDLE, SYMBOL_SOLUTION, ITEMS, EXAMINE, AUTOMATON,
  objective, groverLines,
} from './content.js';
import { matches } from './speech.js';
import { initAudio, sfx, toggleMute } from './audio.js';
import * as ui from './ui.js';

const SAVE_KEY = 'labyrint-save-v1';
const CHECKPOINTS = ['start', 'sphinx', 'mist', 'arena'];
const STEP = 0.35;
const GRAVITY = 20;
const JUMP_V = 7;
const SHOUT_LEVEL = 0.7; // hlasitost (0..1), od které se počítá jako křik

// ---------- renderer a scéna ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1530);
scene.fog = new THREE.Fog(0x140e0a, 12, 48);
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);

scene.add(new THREE.HemisphereLight(0x9a8ab0, 0x2a1a0a, 0.55));
const sun = new THREE.DirectionalLight(0xffc890, 1.6);
sun.position.set(20, 30, 40);
sun.target.position.set(29, 0, 58);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
scene.add(sun, sun.target);

const W = buildWorld(scene);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- stav hry ----------
let mode = 'menu'; // menu | intro | play | dialog | pause | dead | win
let parent = PARENTS[0];
let flags = {};
let inventory = [];
let checkpoint = 'start';
let elapsed = 0;
let deaths = 0;
let sphinxCorrect = 0;
let sphinxAsked = [];
let sphinxQ = null;
let noLock = false;
let shake = 0;

const player = {
  pos: new THREE.Vector3(), vy: 0, knock: new THREE.Vector3(), yaw: 0, pitch: 0.35,
  hp: 5, maxHp: 5, onGround: true, attackT: 0, cooldown: 0, invuln: 0, regenT: 0, walk: 0, hitDone: false,
  model: null,
};

const keys = {};
const worldItems = [];
let hounds = [];
let minotaur = null;

// ---------- pomocné funkce ----------
const tmp = new THREE.Vector3();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function forward(yaw) { return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); }

// Kruh (x,z) o poloměru r a výšce h proti AABB kolizím. Vrací kolize, do kterých narazil.
function collide(pos, r, h) {
  const hits = [];
  for (const c of W.colliders) {
    if (!c.active) continue;
    if (c.max.y <= pos.y + STEP || pos.y + h <= c.min.y) continue;
    const cx = clamp(pos.x, c.min.x, c.max.x);
    const cz = clamp(pos.z, c.min.z, c.max.z);
    const dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      pos.x += (dx / d) * (r - d);
      pos.z += (dz / d) * (r - d);
    } else {
      const pen = [
        [pos.x - c.min.x + r, -1, 0], [c.max.x - pos.x + r, 1, 0],
        [pos.z - c.min.z + r, 0, -1], [c.max.z - pos.z + r, 0, 1],
      ].sort((a, b) => a[0] - b[0])[0];
      pos.x += pen[1] * pen[0];
      pos.z += pen[2] * pen[0];
    }
    hits.push(c);
  }
  return hits;
}

function groundAt(pos, r) {
  let g = 0;
  for (const c of W.colliders) {
    if (!c.active) continue;
    if (c.max.y > pos.y + STEP + 0.01) continue;
    if (pos.x > c.min.x - r * 0.4 && pos.x < c.max.x + r * 0.4 && pos.z > c.min.z - r * 0.4 && pos.z < c.max.z + r * 0.4) g = Math.max(g, c.max.y);
  }
  return g;
}

function hasItem(id) { return inventory.some((i) => i.id === id && i.count > 0); }
function addItem(id) {
  const ex = inventory.find((i) => i.id === id);
  if (ex) ex.count++; else inventory.push({ id, count: 1 });
  ui.setInventory(inventory);
}
function removeItem(id) {
  const ex = inventory.find((i) => i.id === id);
  if (!ex) return;
  ex.count--;
  if (ex.count <= 0) inventory = inventory.filter((i) => i !== ex);
  ui.setInventory(inventory);
}

function spawnItem(id, pos, key = id) {
  if (flags['taken_' + key]) return;
  const mesh = makeItem(id);
  mesh.position.copy(pos);
  scene.add(mesh);
  const it = { id: 'item', item: id, key, mesh, pos: pos.clone(), radius: 1.8, dy: 1.3, label: 'Sebrat: ' + ITEMS[id].name, enabled: true };
  worldItems.push(it);
  W.interactables.push(it);
}

function refreshHUD() {
  ui.setHearts(player.hp, player.maxHp);
  ui.setObjective(objective(flags));
  ui.setInventory(inventory);
}

// ---------- uložení ----------
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ parent: parent.id, flags, inventory, checkpoint, elapsed, deaths }));
  } catch (e) { /* bez úložiště hra běží dál */ }
}
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nic */ } }

// ---------- nepřátelé ----------
function createEnemies() {
  hounds.forEach((h) => scene.remove(h.mesh));
  hounds = [];
  if (!flags.houndsDead) {
    for (const [x, z] of [[-1.5, 45], [1.5, 49]]) {
      const mesh = makeHound();
      scene.add(mesh);
      hounds.push({ mesh, home: new THREE.Vector3(x, 0, z), pos: new THREE.Vector3(x, 0, z), hp: 4, maxHp: 4, state: 'idle', t: 0, dir: new THREE.Vector3(), knock: new THREE.Vector3(), dead: false, hitDone: false, phase: Math.random() * 6 });
    }
  }
  if (minotaur) scene.remove(minotaur.mesh);
  minotaur = null;
  if (!flags.minotaurDead) {
    const mesh = makeMinotaur();
    scene.add(mesh);
    minotaur = { mesh, home: new THREE.Vector3(36, 0, 58), pos: new THREE.Vector3(36, 0, 58), hp: 6, maxHp: 6, state: 'sleep', t: 0, dir: new THREE.Vector3(), yaw: -Math.PI / 2, hitDone: false, clangHint: false, phase: 0 };
  }
}

function resetEnemiesAfterDeath() {
  for (const h of hounds) {
    if (h.dead) continue;
    h.pos.copy(h.home); h.hp = h.maxHp; h.state = 'idle'; h.knock.set(0, 0, 0);
  }
  if (minotaur) {
    minotaur.pos.copy(minotaur.home); minotaur.hp = minotaur.maxHp; minotaur.state = 'sleep';
    minotaur.mesh.userData.stars.visible = false;
    ui.setBoss(null);
  }
}

function damagePlayer(n, from) {
  if (player.invuln > 0 || mode !== 'play' && mode !== 'dialog') return;
  player.hp -= n;
  player.invuln = 1.0;
  sfx.hurt();
  ui.flash();
  shake = 0.3;
  if (from) {
    tmp.subVectors(player.pos, from).setY(0).normalize().multiplyScalar(9);
    player.knock.copy(tmp);
    player.vy = 3;
  }
  ui.setHearts(Math.max(0, player.hp), player.maxHp);
  if (player.hp <= 0) die();
}

function die() {
  if (ui.panelOpen()) ui.closePanel();
  mode = 'dead';
  deaths++;
  ui.showOverlay('dead');
  if (document.pointerLockElement) document.exitPointerLock();
  setTimeout(() => {
    respawn();
    ui.showOverlay(null);
    mode = 'play';
    lockPointer();
  }, 2200);
}

function respawn() {
  player.pos.copy(W.spawn[checkpoint]);
  player.vy = 0; player.knock.set(0, 0, 0);
  player.hp = player.maxHp;
  player.invuln = 1.5;
  sphinxCorrect = 0;
  resetEnemiesAfterDeath();
  refreshHUD();
}

function killEffect(pos, color = 0xffd040) {
  const geo = new THREE.TetrahedronGeometry(0.12);
  const m = new THREE.MeshBasicMaterial({ color });
  const parts = [];
  for (let i = 0; i < 24; i++) {
    const p = new THREE.Mesh(geo, m);
    p.position.set(pos.x, 1 + Math.random() * 1.5, pos.z);
    p.userData.v = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4);
    scene.add(p);
    parts.push(p);
  }
  effects.push({ t: 1.2, update(dt) { parts.forEach((p) => { p.position.addScaledVector(p.userData.v, dt); p.userData.v.y -= 6 * dt; p.scale.multiplyScalar(0.97); }); }, end() { parts.forEach((p) => scene.remove(p)); } });
}
const effects = [];

function updateHounds(dt, time) {
  for (const h of hounds) {
    if (h.dead) continue;
    const toP = tmp.subVectors(player.pos, h.pos).setY(0);
    const dist = toP.length();
    const dirToP = toP.clone().normalize();
    let move = new THREE.Vector3();
    h.t -= dt;
    switch (h.state) {
      case 'idle':
        if (dist < 12 && player.pos.z > 34.5) { h.state = 'chase'; sfx.growl(); }
        break;
      case 'chase':
        move.copy(dirToP).multiplyScalar(dist > 3.4 ? 4.6 : 0);
        // obcházení do strany, ať nejsou předvídatelní
        move.addScaledVector(new THREE.Vector3(-dirToP.z, 0, dirToP.x), Math.sin(time * 1.5 + h.phase) * 2);
        if (dist < 3.6) { h.state = 'windup'; h.t = 0.55; h.dir.copy(dirToP); sfx.growl(); }
        break;
      case 'windup':
        h.dir.copy(dirToP);
        if (h.t <= 0) { h.state = 'lunge'; h.t = 0.38; h.hitDone = false; }
        break;
      case 'lunge':
        move.copy(h.dir).multiplyScalar(13);
        if (!h.hitDone && dist < 1.4) { h.hitDone = true; damagePlayer(1, h.pos); }
        if (h.t <= 0) { h.state = 'recover'; h.t = 0.9; }
        break;
      case 'recover':
        if (h.t <= 0) h.state = 'chase';
        break;
      case 'stagger':
        if (h.t <= 0) h.state = 'chase';
        break;
    }
    h.pos.addScaledVector(move, dt);
    h.pos.addScaledVector(h.knock, dt);
    h.knock.multiplyScalar(Math.pow(0.02, dt));
    collide(h.pos, 0.7, 1.5);
    // vzájemné odpuzování psů
    for (const o of hounds) {
      if (o === h || o.dead) continue;
      const d = h.pos.distanceTo(o.pos);
      if (d < 1.4 && d > 0.001) h.pos.addScaledVector(tmp.subVectors(h.pos, o.pos).normalize(), (1.4 - d) * 0.5);
    }
    h.mesh.position.copy(h.pos);
    const face = h.state === 'lunge' || h.state === 'windup' ? h.dir : dirToP;
    if (h.state !== 'idle') h.mesh.rotation.y = Math.atan2(face.x, face.z);
    const u = h.mesh.userData;
    const run = h.state === 'chase' || h.state === 'lunge' ? 1 : 0.2;
    u.legs.forEach((l, i) => { l.rotation.x = Math.sin(time * 14 + (i % 2 ? 0 : Math.PI)) * 0.7 * run; });
    h.mesh.position.y = h.state === 'windup' ? -0.15 : 0;
    u.eyeMat.emissiveIntensity = h.state === 'windup' ? 4 : 1.5;
  }
}

function hitHound(h, dmg, dir) {
  h.hp -= dmg;
  h.knock.copy(dir).multiplyScalar(8);
  h.state = 'stagger';
  h.t = 0.35;
  sfx.hit();
  if (h.hp <= 0) {
    h.dead = true;
    scene.remove(h.mesh);
    killEffect(h.pos, 0x888888);
    if (hounds.every((x) => x.dead)) {
      flags.houndsDead = true;
      spawnItem('silverKey', new THREE.Vector3(h.pos.x, 0.8, h.pos.z));
      ui.toast('Poslední pes se rozpadl v prach. Z obojku mu vypadl stříbrný klíček.');
      refreshHUD();
    }
  }
}

function updateMinotaur(dt, time) {
  const m = minotaur;
  if (!m) return;
  const toP = new THREE.Vector3().subVectors(player.pos, m.pos).setY(0);
  const dist = toP.length();
  const dirToP = toP.clone().normalize();
  const u = m.mesh.userData;
  let speed = 0;
  m.t -= dt;
  u.stars.visible = m.state === 'stunned';
  switch (m.state) {
    case 'sleep':
      if (player.pos.x > 17.5 && player.pos.z > 44) {
        m.state = 'stalk'; m.t = 2; sfx.roar(); shake = 0.5;
        ui.toast('MINOTAUROS! Napůl člověk, napůl býk. A je naštvaný.');
        ui.setBoss(1);
      }
      break;
    case 'stalk':
      speed = 2.6;
      m.yaw = Math.atan2(dirToP.x, dirToP.z);
      if (dist < 3) { m.state = 'swipeWind'; m.t = 0.65; }
      else if (m.t <= 0) { m.state = 'paw'; m.t = 1.1; sfx.roar(); }
      break;
    case 'swipeWind':
      m.yaw = Math.atan2(dirToP.x, dirToP.z);
      u.arms.forEach((a) => { a.rotation.x = -2.2; });
      if (m.t <= 0) {
        const f = forward(m.yaw);
        if (dist < 3.4 && f.dot(dirToP) > 0.3) damagePlayer(1, m.pos);
        sfx.swing();
        m.state = 'stalk'; m.t = 1.6;
      }
      break;
    case 'paw':
      m.yaw = Math.atan2(dirToP.x, dirToP.z);
      m.dir.copy(dirToP);
      u.eyeMat.emissiveIntensity = 3;
      if (m.t <= 0) { m.state = 'charge'; m.t = 2.4; m.hitDone = false; }
      break;
    case 'charge': {
      const before = m.pos.clone();
      m.pos.addScaledVector(m.dir, 15 * dt);
      const hits = collide(m.pos, 1.1, 3.2);
      if (!m.hitDone && dist < 1.8) { m.hitDone = true; damagePlayer(2, m.pos); }
      const pillar = hits.find((c) => c.pillar);
      if (pillar) {
        m.state = 'stunned'; m.t = 3.6; sfx.crash(); shake = 0.6;
        const p = W.pillars.find((x) => x.collider === pillar);
        if (p) { p.cracks++; p.mesh.material = p.mesh.material.clone(); p.mesh.material.color.offsetHSL(0, 0, -0.08 * p.cracks); }
        ui.toast('BUM! Minotaurus narazil do sloupu a je omráčený. Teď!');
      } else if (hits.length || m.t <= 0 || before.distanceTo(m.pos) < 15 * dt * 0.3) {
        m.state = 'stagger'; m.t = 0.8;
        if (hits.length) { sfx.crash(); shake = 0.3; }
      }
      break;
    }
    case 'stunned':
      u.stars.rotation.y += dt * 4;
      if (m.t <= 0) { m.state = 'stalk'; m.t = 2.2; }
      break;
    case 'stagger':
      if (m.t <= 0) { m.state = 'stalk'; m.t = 2.2; }
      break;
  }
  if (m.state !== 'swipeWind') u.arms.forEach((a, i) => { a.rotation.x = speed ? Math.sin(time * 6 + i * Math.PI) * 0.5 : 0; });
  if (m.state !== 'paw') u.eyeMat.emissiveIntensity = 0.3;
  if (speed) m.pos.addScaledVector(dirToP, speed * dt);
  if (m.state !== 'charge') collide(m.pos, 1.1, 3.2);
  if (m.pos.x < 16.2) m.pos.x = 16.2; // Minotaurus zůstává v aréně
  m.mesh.position.copy(m.pos);
  m.mesh.rotation.y = m.yaw;
  const run = m.state === 'charge' ? 3 : speed ? 1 : 0;
  u.legs.forEach((l, i) => { l.rotation.x = Math.sin(time * (run > 1 ? 18 : 7) + i * Math.PI) * 0.6 * Math.min(run, 1); });
  m.mesh.rotation.x = m.state === 'charge' ? 0.25 : m.state === 'stunned' ? -0.1 : 0;
  if (m.state === 'paw') m.mesh.position.y = Math.abs(Math.sin(time * 12)) * 0.1;
}

function hitMinotaur(dmg) {
  const m = minotaur;
  if (m.state !== 'stunned') {
    sfx.clang();
    if (!m.clangHint) { m.clangHint = true; ui.toast('Meč se odrazil! Jeho kůže je tvrdá jako bronz. Musíš ho nejdřív omráčit.'); }
    return;
  }
  m.hp -= dmg;
  sfx.hit();
  ui.setBoss(m.hp / m.maxHp);
  if (m.hp <= 0) {
    sfx.roar();
    killEffect(m.pos);
    scene.remove(m.mesh);
    flags.minotaurDead = true;
    spawnItem('thread', new THREE.Vector3(m.pos.x, 1, m.pos.z));
    minotaur = null;
    ui.setBoss(null);
    ui.toast('Minotaurus se rozpadl ve zlatý prach. Na zemi leží zářící klubko.');
    refreshHUD();
  }
}

// ---------- útok hráče ----------
function attack() {
  if (mode !== 'play' || player.cooldown > 0) return;
  player.attackT = 0.001;
  player.cooldown = 0.45;
  player.hitDone = false;
  sfx.swing();
}

function resolveAttackHit() {
  const f = forward(player.yaw);
  const dmg = parent.id === 'ares' ? 2 : 1;
  for (const h of hounds) {
    if (h.dead) continue;
    const d = tmp.subVectors(h.pos, player.pos).setY(0);
    const dist = d.length();
    if (dist < 2.6 && d.normalize().dot(f) > 0.35) hitHound(h, dmg, f);
  }
  if (minotaur) {
    const d = tmp.subVectors(minotaur.pos, player.pos).setY(0);
    const dist = d.length();
    if (dist < 3.2 && d.normalize().dot(f) > 0.3) hitMinotaur(dmg);
  }
}

// ---------- interakce (klávesa Q) ----------
function nearestInteractable() {
  let best = null, bd = Infinity;
  for (const it of W.interactables) {
    if (!it.enabled) continue;
    const d = Math.hypot(it.pos.x - player.pos.x, it.pos.z - player.pos.z);
    const dy = Math.abs(it.pos.y - (player.pos.y + 1));
    if (d < it.radius && dy < (it.dy ?? 2.2) && d < bd) { best = it; bd = d; }
  }
  return best;
}

function openPanel() {
  mode = 'dialog';
  if (document.pointerLockElement) document.exitPointerLock();
  for (const k in keys) keys[k] = false;
}
function panelClosed() {
  if (mode === 'dialog') { mode = 'play'; lockPointer(); }
}

function interact() {
  const it = nearestInteractable();
  if (!it) return;
  switch (it.id) {
    case 'item': {
      it.enabled = false;
      scene.remove(it.mesh);
      flags['taken_' + it.key] = true;
      addItem(it.item);
      sfx.pickup();
      if (it.item === 'bronzeKey') { flags.hasBronzeKey = true; ui.toast('Máš bronzový klíč!'); }
      if (it.item === 'silverKey') ui.toast('Máš stříbrný klíček.');
      if (it.item === 'ambrosia') ui.toast('Ambrózie! Klávesou H se vyléčíš.');
      if (it.item === 'thread') { flags.hasThread = true; ui.toast('Ariadnina nit! Zářící vlákno se táhne k bráně Δ.'); }
      refreshHUD();
      save();
      break;
    }
    case 'grover': {
      openPanel();
      ui.showNPC(groverLines(flags), (opt) => {
        if (opt.gift && !flags.groverGift) { flags.groverGift = true; addItem('ambrosia'); sfx.pickup(); }
        return opt.reply;
      }, panelClosed);
      break;
    }
    case 'automaton':
      openPanel();
      ui.showNPC(AUTOMATON, null, panelClosed);
      break;
    case 'doorA':
      if (flags.doorA) break;
      if (!hasItem('bronzeKey')) { ui.toast(EXAMINE.doorALocked + ' Potřebuješ klíč.'); break; }
      removeItem('bronzeKey');
      flags.doorA = true;
      openDoor(W.doorA, 'down');
      it.enabled = false;
      ui.toast('Klíč zapadl. Dveře se se skřípěním propadly do země.');
      refreshHUD();
      save();
      break;
    case 'sphinx':
      talkSphinx();
      break;
    case 'chest':
      if (flags.chestOpen) break;
      if (!hasItem('silverKey')) { ui.toast(EXAMINE.chestLocked); break; }
      removeItem('silverKey');
      flags.chestOpen = true;
      it.enabled = false;
      W.chest.userData.lid.rotation.x = -1.9;
      addItem('amulet');
      flags.hasAmulet = true;
      flags.taken_amulet = true;
      sfx.mist();
      applyMist(true);
      ui.toast('V truhle ležel Hekatin amulet. Jakmile se ho dotkneš, Mlha se rozplyne a vidíš skryté nápisy!', 5000);
      refreshHUD();
      save();
      break;
    case 'fakeDoor':
      ui.toast(flags.hasAmulet ? EXAMINE.fakeDoorMist : EXAMINE.fakeDoor);
      break;
    case 'mistWall':
      ui.toast(EXAMINE.mistWall);
      break;
    case 'lock':
      if (flags.lockOpen) break;
      openPanel();
      ui.showLock((seq) => {
        if (seq.join() === SYMBOL_SOLUTION.join()) {
          flags.lockOpen = true;
          W.lockInt.enabled = false;
          openDoor(W.lockDoor, 'down');
          sfx.correct();
          ui.toast('Symboly se rozzáří a dveře se otevřou. Z dálky slyšíš řev...');
          refreshHUD();
          save();
          return true;
        }
        sfx.wrong();
        return false;
      }, panelClosed);
      break;
    case 'gate':
      if (flags.gateOpen) break;
      if (!hasItem('thread')) { ui.toast(EXAMINE.gateLocked, 5000); break; }
      talkGate();
      break;
    case 'statue': ui.toast(EXAMINE.statue); break;
    case 'rubble': ui.toast(EXAMINE.rubble); break;
    case 'mosaic': ui.toast(EXAMINE.mosaic, 7000); break;
  }
}

function openDoor(door, how) {
  sfx.door();
  door.collider.active = false;
  const m = door.mesh;
  const start = m.position.y;
  effects.push({ t: 1.5, update() { m.position.y = Math.max(start - 3.2, m.position.y - 0.04); }, end() { m.visible = false; } });
}

function applyMist(revealed) {
  W.mist.reveal.forEach((m) => { m.visible = revealed; });
  W.mist.hide.forEach((m) => { m.visible = !revealed; });
  W.mist.wall.mesh.visible = !revealed;
  W.mist.wall.collider.active = !revealed;
  W.mistWallInt.enabled = !revealed;
  W.lockInt.enabled = revealed && !flags.lockOpen;
}

function nextSphinxQuestion() {
  const pool = SPHINX_QUESTIONS.filter((q) => !sphinxAsked.includes(q));
  if (!pool.length) sphinxAsked = [];
  const list = pool.length ? pool : SPHINX_QUESTIONS;
  sphinxQ = list[Math.floor(Math.random() * list.length)];
  sphinxAsked.push(sphinxQ);
  return sphinxQ;
}

function talkSphinx() {
  if (flags.sphinxDone) { ui.toast(SPHINX.already); return; }
  openPanel();
  const q = sphinxQ || nextSphinxQuestion();
  ui.showRiddle({
    title: `Sfinga (správně: ${sphinxCorrect}/3)`,
    intro: SPHINX.greet,
    question: q.q,
    hint: q.hint,
    allowHint: parent.id === 'athena',
    onSubmit(text, voice, peak) {
      // Křik funguje jen při hlasové odpovědi.
      const shout = voice && peak >= SHOUT_LEVEL ? SPHINX.shout + ' ' + sphinxQ.hint + ' ' : '';
      if (matches(text, sphinxQ.a)) {
        sphinxCorrect++;
        sfx.correct();
        if (sphinxCorrect >= 3) {
          flags.sphinxDone = true;
          sphinxQ = null;
          ui.toast(SPHINX.done, 4500);
          moveSphinxAside();
          refreshHUD();
          save();
          return { close: true };
        }
        const nq = nextSphinxQuestion();
        return { ok: true, message: `${SPHINX.correct[sphinxCorrect - 1]} (správně: ${sphinxCorrect}/3)`, question: nq.q, hint: nq.hint };
      }
      if (shout) {
        sfx.wrong();
        return { ok: false, message: shout };
      }
      sfx.wrong();
      damagePlayer(1, null);
      if (mode === 'dead') return { close: true };
      const nq = nextSphinxQuestion();
      return { ok: false, message: SPHINX.wrong, question: nq.q, hint: nq.hint };
    },
  }, panelClosed);
}

function moveSphinxAside() {
  W.sphinxBlock.collider.active = false;
  W.sphinxInt.pos.set(-4.5, 1.5, 30);
  const s = W.sphinx;
  effects.push({ t: 1.5, update() { s.position.x = Math.max(-4.5, s.position.x - 0.06); }, end() { s.position.x = -4.5; s.rotation.y = Math.PI / 2; } });
}

function talkGate() {
  openPanel();
  ui.showRiddle({
    title: 'Daidalova brána Δ',
    intro: 'Přiložíš Ariadninu nit k pečeti. Brána ožije.',
    question: GATE_RIDDLE.q,
    hint: GATE_RIDDLE.hint,
    allowHint: parent.id === 'athena',
    onSubmit(text, voice, peak) {
      if (matches(text, GATE_RIDDLE.a)) {
        flags.gateOpen = true;
        openDoor(W.gate, 'down');
        sfx.victory();
        ui.toast('Brána se otevírá. Za ní je denní světlo a vůně jahodových polí!', 5000);
        save();
        return { close: true };
      }
      sfx.wrong();
      if (voice && peak >= SHOUT_LEVEL) return { ok: false, message: GATE_RIDDLE.shout };
      return { ok: false, message: GATE_RIDDLE.wrong };
    },
  }, panelClosed);
}

// ---------- ovládání ----------
const canvas = renderer.domElement;

function lockPointer() {
  if (noLock || mode !== 'play') return;
  try {
    const r = canvas.requestPointerLock();
    if (r && r.catch) r.catch(() => { noLock = true; });
  } catch (e) { noLock = true; }
}
document.addEventListener('pointerlockerror', () => { noLock = true; });
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && mode === 'play' && !noLock) pause();
});

function pause() {
  mode = 'pause';
  ui.showOverlay('pause');
}
function resume() {
  ui.showOverlay(null);
  mode = 'play';
  lockPointer();
}

document.addEventListener('mousemove', (e) => {
  if (mode !== 'play') return;
  if (!document.pointerLockElement && !noLock) return;
  player.yaw -= e.movementX * 0.0025;
  player.pitch = clamp(player.pitch + e.movementY * 0.002, -0.3, 1.2);
});
canvas.addEventListener('mousedown', (e) => {
  if (mode !== 'play') return;
  if (!document.pointerLockElement && !noLock) { lockPointer(); return; }
  if (e.button === 0) attack();
});

window.addEventListener('keydown', (e) => {
  if (ui.panelOpen()) {
    if (e.key === 'Escape') ui.closePanel();
    return;
  }
  if (mode === 'pause' && (e.key === 'Escape' || e.key === 'Enter')) { resume(); return; }
  if (mode !== 'play') return;
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); if (player.onGround) { player.vy = JUMP_V; player.onGround = false; sfx.jump(); } }
  if (e.code === 'KeyQ') interact();
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') attack();
  if (e.code === 'KeyH' && hasItem('ambrosia') && player.hp < player.maxHp) {
    removeItem('ambrosia');
    player.hp = Math.min(player.maxHp, player.hp + 2);
    sfx.pickup();
    ui.flash('rgba(255,210,80,0.3)');
    refreshHUD();
  }
  if (e.code === 'KeyM') ui.toast(toggleMute() ? 'Zvuk vypnut' : 'Zvuk zapnut', 1200);
  if (e.code === 'Escape' && noLock) pause();
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// ---------- smyčka ----------
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
let stepT = 0;
let timerShown = -1;

function updatePlayer(dt, time) {
  const p = player;
  if (keys.ArrowLeft) p.yaw += 2.4 * dt;
  if (keys.ArrowRight) p.yaw -= 2.4 * dt;
  const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const f = forward(p.yaw);
  const r = new THREE.Vector3(-f.z, 0, f.x);
  const move = new THREE.Vector3().addScaledVector(f, fwd).addScaledVector(r, str);
  const speed = parent.id === 'hermes' ? 7.2 : 5.5;
  if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);
  p.pos.addScaledVector(move, dt);
  p.pos.addScaledVector(p.knock, dt);
  p.knock.multiplyScalar(Math.pow(0.01, dt));

  p.vy -= GRAVITY * dt;
  p.pos.y += p.vy * dt;
  collide(p.pos, 0.4, 1.8);
  const g = groundAt(p.pos, 0.4);
  if (p.pos.y <= g) {
    if (!p.onGround && p.vy < -3) sfx.step();
    p.pos.y = g; p.vy = 0; p.onGround = true;
  } else if (p.pos.y > g + 0.05) p.onGround = false;

  p.cooldown -= dt;
  p.invuln -= dt;
  if (parent.id === 'apollo' && p.hp < p.maxHp) {
    p.regenT += dt;
    if (p.regenT > 20) { p.regenT = 0; p.hp++; refreshHUD(); }
  }

  // animace
  const mdl = p.model, u = mdl.userData;
  mdl.position.copy(p.pos);
  mdl.rotation.y = p.yaw;
  const moving = move.lengthSq() > 0 && p.onGround;
  if (moving) {
    p.walk += dt * 10;
    stepT -= dt;
    if (stepT <= 0) { sfx.step(); stepT = 0.32; }
  }
  const sw = moving ? Math.sin(p.walk) * 0.7 : 0;
  u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
  u.armL.rotation.x = -sw * 0.8;
  if (p.attackT > 0) {
    p.attackT += dt / 0.28;
    const a = Math.min(1, p.attackT);
    u.armR.rotation.x = -2.6 + a * 2.6;
    u.armR.rotation.z = -0.4 + a * 0.6;
    if (a > 0.45 && !p.hitDone) { p.hitDone = true; resolveAttackHit(); }
    if (a >= 1) { p.attackT = 0; u.armR.rotation.z = 0; }
  } else u.armR.rotation.x = -0.5 + sw * 0.5;
  mdl.visible = p.invuln > 0 ? Math.floor(time * 15) % 2 === 0 : true;

  // kontrolní body
  const cpIndex = CHECKPOINTS.indexOf(checkpoint);
  let next = null;
  if (p.pos.x > 15.5) next = 'arena';
  else if (p.pos.z > 53 && p.pos.x < 8) next = 'mist';
  else if (flags.sphinxDone && p.pos.z > 35) next = 'sphinx';
  if (next && CHECKPOINTS.indexOf(next) > cpIndex) {
    checkpoint = next;
    save();
    ui.toast('Kontrolní bod uložen.', 1500);
  }

  if (p.pos.x > 50 && !flags.escaped) win();
}

function updateCamera(dt) {
  const p = player;
  const target = new THREE.Vector3(p.pos.x, p.pos.y + 1.7, p.pos.z);
  const dir = new THREE.Vector3(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch)).normalize();
  let dist = 4.6;
  raycaster.set(target, dir);
  raycaster.far = dist;
  const hit = raycaster.intersectObjects(W.solids, false)[0];
  if (hit) dist = Math.max(0.6, hit.distance - 0.3);
  camera.position.copy(target).addScaledVector(dir, dist);
  if (camera.position.y < 0.3) camera.position.y = 0.3;
  if (shake > 0) {
    shake -= dt;
    camera.position.x += (Math.random() - 0.5) * shake * 0.6;
    camera.position.y += (Math.random() - 0.5) * shake * 0.6;
  }
  camera.lookAt(target);
}

let simTime = 0;
function loop() {
  requestAnimationFrame(loop);
  step(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
}

function step(dt) {
  simTime += dt;
  const time = simTime;
  W.animated.forEach((fn) => fn(time));
  for (const it of worldItems) if (it.enabled) { it.mesh.rotation.y += dt * 2; it.mesh.position.y = it.pos.y + Math.sin(time * 3) * 0.1; }
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.t -= dt;
    e.update(dt);
    if (e.t <= 0) { e.end && e.end(); effects.splice(i, 1); }
  }
  if (mode === 'play') {
    updatePlayer(dt, time);
    updateHounds(dt, time);
    updateMinotaur(dt, time);
    const it = nearestInteractable();
    ui.setPrompt(it ? `[Q] ${it.label}` : null);
  } else ui.setPrompt(null);
  if (mode === 'play' || mode === 'dialog') {
    elapsed += dt;
    if (Math.floor(elapsed) !== timerShown) { timerShown = Math.floor(elapsed); ui.setTimer(elapsed); }
  }
  if (player.model) updateCamera(dt);
}

// ---------- start, výhra ----------
function setupGame(fromSave) {
  flags = fromSave ? { ...fromSave.flags } : {};
  inventory = fromSave ? fromSave.inventory.map((i) => ({ ...i })) : [];
  checkpoint = fromSave ? fromSave.checkpoint : 'start';
  elapsed = fromSave ? fromSave.elapsed : 0;
  deaths = fromSave ? fromSave.deaths : 0;
  parent = PARENTS.find((x) => x.id === (fromSave ? fromSave.parent : parent.id)) || PARENTS[0];
  sphinxCorrect = 0; sphinxAsked = []; sphinxQ = null;

  if (player.model) scene.remove(player.model);
  player.model = makePlayer(parent.color);
  scene.add(player.model);
  player.maxHp = parent.id === 'poseidon' ? 6 : 5;
  player.yaw = 0;

  // předměty ve světě
  worldItems.forEach((it) => { scene.remove(it.mesh); it.enabled = false; });
  worldItems.length = 0;
  W.interactables = W.interactables.filter((i) => i.id !== 'item');
  spawnItem('bronzeKey', W.itemSpots.bronzeKey);
  spawnItem('ambrosia', W.itemSpots.ambrosia1, 'ambrosia1');
  spawnItem('ambrosia', W.itemSpots.ambrosia2, 'ambrosia2');
  if (flags.houndsDead && !flags.taken_silverKey && !flags.chestOpen) spawnItem('silverKey', new THREE.Vector3(1.5, 0.8, 49));
  if (flags.minotaurDead && !flags.taken_thread) spawnItem('thread', new THREE.Vector3(30, 1, 58));

  // stav místností podle příznaků
  const doorState = (door, open) => { door.collider.active = !open; door.mesh.visible = !open; };
  doorState(W.doorA, !!flags.doorA);
  W.interactables.find((i) => i.id === 'doorA').enabled = !flags.doorA;
  W.sphinxBlock.collider.active = !flags.sphinxDone;
  W.sphinx.position.set(flags.sphinxDone ? -4.5 : 0, 0, 31.6);
  W.sphinx.rotation.y = flags.sphinxDone ? Math.PI / 2 : Math.PI;
  W.sphinxInt.pos.set(flags.sphinxDone ? -4.5 : 0, 1.5, flags.sphinxDone ? 30 : 29.5);
  W.chest.userData.lid.rotation.x = flags.chestOpen ? -1.9 : 0;
  W.interactables.find((i) => i.id === 'chest').enabled = !flags.chestOpen;
  doorState(W.lockDoor, !!flags.lockOpen);
  doorState(W.gate, !!flags.gateOpen);
  applyMist(!!flags.hasAmulet);

  createEnemies();
  ui.setBoss(null);
  respawn();
  ui.setTimer(elapsed);
}

function win() {
  flags.escaped = true;
  mode = 'win';
  sfx.victory();
  if (document.pointerLockElement) document.exitPointerLock();
  const m = Math.floor(elapsed / 60), s = Math.floor(elapsed % 60);
  document.getElementById('winStats').innerHTML =
    `${parent.icon} Dítě boha ${parent.name}<br>Čas: <b>${m}:${String(s).padStart(2, '0')}</b> · Pády: <b>${deaths}</b>`;
  clearSave();
  ui.showOverlay('win');
  document.getElementById('hud').classList.add('hidden');
}

// ---------- menu ----------
const CONTROLS = `
  <kbd>W A S D</kbd><span>chůze (nebo šipky ↑ ↓)</span>
  <kbd>myš / touchpad</kbd><span>otáčení (nebo šipky ← →)</span>
  <kbd>Mezerník</kbd><span>skok</span>
  <kbd>Q</kbd><span>prozkoumat, sebrat, promluvit</span>
  <kbd>klik / Shift</kbd><span>útok mečem</span>
  <kbd>H</kbd><span>sníst ambrózii (léčení)</span>
  <kbd>M</kbd><span>zvuk zap/vyp</span>
  <kbd>Esc</kbd><span>pauza</span>`;
document.getElementById('controlsMenu').innerHTML = CONTROLS;
document.getElementById('controlsPause').innerHTML = CONTROLS;

const parentsEl = document.getElementById('parents');
parentsEl.innerHTML = PARENTS.map((p, i) => `<div class="parent ${i === 0 ? 'sel' : ''}" data-id="${p.id}"><div class="ic">${p.icon}</div><b>${p.name}</b><small>${p.perk}</small></div>`).join('');
parentsEl.querySelectorAll('.parent').forEach((el) => {
  el.onclick = () => {
    parentsEl.querySelectorAll('.parent').forEach((x) => x.classList.remove('sel'));
    el.classList.add('sel');
    parent = PARENTS.find((p) => p.id === el.dataset.id);
  };
});

const existing = loadSave();
if (existing) document.getElementById('btnContinue').classList.remove('hidden');

function startPlaying() {
  initAudio();
  ui.showOverlay(null);
  document.getElementById('hud').classList.remove('hidden');
  mode = 'play';
  refreshHUD();
  lockPointer();
}

document.getElementById('btnNew').onclick = () => {
  clearSave();
  setupGame(null);
  document.getElementById('introText').innerHTML =
    INTRO.map((t) => `<p>${t}</p>`).join('') + `<p><b>${parent.icon} Jsi dítě boha ${parent.name}.</b> ${parent.perk}</p>`;
  ui.showOverlay('intro');
  mode = 'intro';
};
document.getElementById('btnStart').onclick = () => { save(); startPlaying(); };
document.getElementById('btnContinue').onclick = () => {
  const s = loadSave();
  if (!s) return;
  setupGame(s);
  startPlaying();
};
document.getElementById('btnResume').onclick = () => resume();
document.getElementById('btnMenu').onclick = () => {
  save();
  mode = 'menu';
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('btnContinue').classList.remove('hidden');
  ui.showOverlay('menu');
};
document.getElementById('btnAgain').onclick = () => {
  document.getElementById('btnContinue').classList.add('hidden');
  ui.showOverlay('menu');
  mode = 'menu';
};

// náhled scény za menu
player.model = makePlayer(parent.color);
scene.add(player.model);
player.pos.copy(W.spawn.start);
player.model.position.copy(player.pos);
player.pitch = 0.25;
loop();

// pro automatické testy
window.__game = { tick: (n) => { for (let i = 0; i < n; i++) step(1 / 60); }, keys, player, flags: () => flags, get mode() { return mode; }, W, interact, attack, inventory: () => inventory, setupGame, hounds: () => hounds, minotaur: () => minotaur };
