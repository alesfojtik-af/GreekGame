// Útěk z Labyrintu: hlavní smyčka, hráč, nepřátelé, logika místností, body.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWorld } from './world.js';
import { makePlayer, makeHound, makeMinotaur, makeItem, makeMyrmex, makePest, makeGhost, makeArrow } from './models.js';
import {
  PARENTS, INTRO, POINTS, SPHINX_QUESTIONS, SPHINX, GATE, GATE_TEXT, SYMBOL_SOLUTION, DIAL_SOLUTION, ITEMS, LORE, AUTOMATON,
  WANDERERS, PEST, CURIOSITIES, JOURNAL, objective, groverLines,
} from './content.js';
import { matches } from './speech.js';
import { initAudio, sfx, toggleMute, setMood, getVolume, setVolume } from './audio.js';
import * as ui from './ui.js';
import { loadLeaderboard, submitScore, sourceNote, withOwnRow } from './score.js';

const SAVE_KEY = 'labyrint-save-v2';
const STEP = 0.35;
const GRAVITY = 20;
const JUMP_V = 7;
const SHOUT_LEVEL = 0.7; // hlasitost (0..1), od které se počítá jako křik
const MAX_ARROWS = 15;
const BOW_RANGE_BONUS = 6; // zabití lukem z větší vzdálenosti dává bonus

// ---------- renderer a scéna ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120d18);
scene.fog = new THREE.Fog(0x120c08, 12, 48);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

// Odlesky na kovu a mramoru: tlumené prostředí místo jasného studia.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

scene.add(new THREE.HemisphereLight(0x8a7aa0, 0x2a1a0a, 0.22));
const sun = new THREE.DirectionalLight(0xffcf98, 1.7);
sun.position.set(20, 30, 40);
sun.target.position.set(29, 0, 58);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 90 });
scene.add(sun, sun.target);

// Filmové barevné ladění: kontrast, teplá světla a chladnější stíny, vinětace a jemné zrno.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.9 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform float vignette; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, 1.0);
      c = mix(c * vec3(0.92, 0.98, 1.06), c * vec3(1.06, 1.0, 0.9), smoothstep(0.15, 0.75, l));
      c = (c - 0.5) * 1.06 + 0.5;
      vec2 d = vUv - 0.5;
      c *= mix(1.0, smoothstep(0.85, 0.25, length(d * vec2(1.25, 1.0))), vignette * 0.55);
      c += (hash(vUv * 900.0 + time) - 0.5) * 0.025;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const ao = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
ao.blendIntensity = 0.85;
ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1, scale: 1.2, samples: 12 });
ao.updatePdMaterial({ radius: 6, samples: 12 });
composer.addPass(ao);
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.55, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass(GradeShader);
composer.addPass(grade);

// Když hra nestíhá, vypneme stínování v rozích a snížíme rozlišení.
const perf = { t: 0, frames: 0, lowered: false };
function watchPerformance(dt) {
  if (perf.lowered) return;
  perf.t += dt; perf.frames++;
  if (perf.t < 4) return;
  const fps = perf.frames / perf.t;
  perf.t = 0; perf.frames = 0;
  if (fps < 32) {
    perf.lowered = true;
    ao.enabled = false;
    renderer.setPixelRatio(1);
    composer.setPixelRatio(1);
    composer.setSize(window.innerWidth, window.innerHeight);
  }
}

const W = buildWorld(scene);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- stav hry ----------
let mode = 'menu'; // menu | intro | play | dialog | pause | dead | win
let parent = PARENTS[0];
let playerName = '';
let flags = {};
let inventory = [];
let selected = 0;
let checkpoint = 'start';
let elapsed = 0;
let deaths = 0;
let arrows = 0;
let score = 0;
let scoreLog = {};
let sphinxCorrect = 0;
let sphinxAsked = [];
let sphinxQ = null;
let noLock = false;
let shake = 0;
const puzzle = {}; // key -> { start, tries }

const player = {
  pos: new THREE.Vector3(), vy: 0, knock: new THREE.Vector3(), yaw: 0, pitch: 0.3,
  hp: 5, maxHp: 5, onGround: true, attackT: 0, cooldown: 0, shootCd: 0, invuln: 0, regenT: 0, walk: 0, hitDone: false,
  model: null,
};

const keys = {};
const worldItems = [];
const effects = [];
const projectiles = [];
let hounds = [];
let myrmexes = [];
let minotaur = null;
let pest = null;
let ghosts = [];

const tmp = new THREE.Vector3();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const forward = (yaw) => new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
const inRect = (p, r, pad = 0) => p.x > r[0] - pad && p.x < r[2] + pad && p.z > r[1] - pad && p.z < r[3] + pad;

// ---------- body ----------
const CATEGORY = {
  puzzle: 'Hádanky a zámky', monster: 'Nestvůry', discover: 'Objevy a zajímavosti', mistake: 'Chyby a nápovědy', death: 'Smrti', time: 'Časový bonus',
};
function addScore(points, label, cat) {
  score += points;
  scoreLog[cat] = (scoreLog[cat] || 0) + points;
  ui.setScore(score);
  ui.popup(points, label);
  if (points > 0) sfx.points();
}

function puzzleStart(key) {
  if (!puzzle[key]) puzzle[key] = { start: elapsed, tries: 0 };
}
function puzzleWrong(key) {
  puzzleStart(key);
  puzzle[key].tries++;
  addScore(POINTS.wrong, 'chyba', 'mistake');
}
function puzzleSolved(key) {
  puzzleStart(key);
  const p = puzzle[key];
  addScore(POINTS.puzzle, 'vyřešeno', 'puzzle');
  if (p.tries === 0) addScore(POINTS.firstTry, 'napoprvé', 'puzzle');
  if (elapsed - p.start < 30) addScore(POINTS.quick, 'rychle', 'puzzle');
}
function useHint() { addScore(POINTS.hint, 'nápověda', 'mistake'); }

// Skutečná nápověda (se zlatou pečetí): přečte se v panelu a zapíše do deníku.
function journalAdd(id) {
  if (flags['j_' + id]) return false;
  flags['j_' + id] = true;
  save();
  return true;
}
function readHint(id) {
  const entry = JOURNAL.find((e) => e.id === id);
  loreOnce(id);
  journalAdd(id);
  openPanel();
  ui.showNote(entry, panelClosed);
}
function openJournal() {
  openPanel();
  ui.showJournal(JOURNAL.filter((e) => flags['j_' + e.id]), panelClosed);
}

function loreOnce(id) {
  if (flags['lore_' + id]) return;
  flags['lore_' + id] = true;
  addScore(POINTS.lore, 'zajímavost', 'discover');
}

// ---------- kolize ----------
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

function pointInSolid(p) {
  for (const c of W.colliders) {
    if (!c.active) continue;
    if (p.x > c.min.x && p.x < c.max.x && p.y > c.min.y && p.y < c.max.y && p.z > c.min.z && p.z < c.max.z) return true;
  }
  return false;
}

// ---------- inventář ----------
function hasItem(id) { return inventory.some((i) => i.id === id && i.count > 0); }
function addItem(id) {
  const ex = inventory.find((i) => i.id === id);
  if (ex) ex.count++; else inventory.push({ id, count: 1 });
  refreshInventory();
}
function removeItem(id) {
  const ex = inventory.find((i) => i.id === id);
  if (!ex) return;
  ex.count--;
  if (ex.count <= 0) inventory = inventory.filter((i) => i !== ex);
  refreshInventory();
}
function refreshInventory() {
  selected = clamp(selected, 0, Math.max(0, inventory.length - 1));
  ui.setInventory(inventory, selected);
}
function setArrows(n) {
  arrows = clamp(n, 0, MAX_ARROWS);
  ui.setArrows(arrows, !!flags.hasBow);
}

function useSelected() {
  const it = inventory[selected];
  if (!it) return;
  if (it.id === 'ambrosia') {
    if (player.hp >= player.maxHp) { ui.toast('Máš plné zdraví. Ambrózii si nech na horší chvíle.', 2500); return; }
    removeItem('ambrosia');
    player.hp = Math.min(player.maxHp, player.hp + 2);
    sfx.pickup();
    ui.flash('rgba(255,210,80,0.3)');
    ui.setHearts(player.hp, player.maxHp);
    return;
  }
  if (it.id === 'bow') { ui.toast('Luk drž připravený: střílíš pravým tlačítkem myši nebo klávesou E. Šípy: ' + arrows + '.', 3000); return; }
  ui.toast(ITEMS[it.id].desc, 3000);
}

function spawnItem(id, pos, key = id) {
  if (flags['taken_' + key]) return null;
  if (worldItems.some((w) => w.key === key && w.enabled)) return null;
  const mesh = makeItem(id === 'quiver' ? 'quiver' : id);
  mesh.position.copy(pos);
  scene.add(mesh);
  const label = id === 'quiver' ? 'Sebrat: Toulec se šípy' : 'Sebrat: ' + ITEMS[id].name;
  const it = { id: 'item', item: id, key, mesh, pos: pos.clone(), radius: 1.8, dy: 1.3, label, enabled: true };
  worldItems.push(it);
  W.interactables.push(it);
  return it;
}

function refreshHUD() {
  ui.setHearts(Math.max(0, player.hp), player.maxHp);
  ui.setObjective(objective(flags));
  ui.setScore(score);
  ui.setArrows(arrows, !!flags.hasBow);
  refreshInventory();
  if (player.model) player.model.userData.bow.visible = !!flags.hasBow;
}

// ---------- uložení ----------
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ parent: parent.id, playerName, flags, inventory, checkpoint, elapsed, deaths, arrows, score, scoreLog }));
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
      hounds.push({ type: 'hound', mesh, home: new THREE.Vector3(x, 0, z), pos: new THREE.Vector3(x, 0, z), hp: 4, maxHp: 4, state: 'idle', t: 0, dir: new THREE.Vector3(), knock: new THREE.Vector3(), dead: false, hitDone: false, phase: Math.random() * 6 });
    }
  }
  clearMyrmexes();
  removePest(false);
  if (minotaur) scene.remove(minotaur.mesh);
  minotaur = null;
  if (!flags.minotaurDead) {
    const mesh = makeMinotaur();
    scene.add(mesh);
    minotaur = { mesh, home: new THREE.Vector3(36, 0, 58), pos: new THREE.Vector3(36, 0, 58), hp: 6, maxHp: 6, state: 'sleep', t: 0, dir: new THREE.Vector3(), yaw: -Math.PI / 2, hitDone: false, clangHint: false };
  }
  ghosts.forEach((g) => scene.remove(g.mesh));
  ghosts = [];
  for (const kind of ['theseus', 'ikaros']) {
    const mesh = makeGhost(kind);
    const path = W.wanderPaths[kind];
    mesh.position.set(path[0][0], 0, path[0][1]);
    scene.add(mesh);
    const it = { id: 'ghost', kind, pos: mesh.position.clone(), radius: 2.4, label: 'Promluvit: ' + WANDERERS[kind].name, enabled: true };
    W.interactables.push(it);
    ghosts.push({ kind, mesh, path, wp: 1, pos: mesh.position.clone(), int: it, wave: 0 });
  }
}

function clearMyrmexes() {
  myrmexes.forEach((m) => scene.remove(m.mesh));
  myrmexes = [];
}

function spawnMyrmexes(at) {
  for (const s of [-1, 1]) {
    const mesh = makeMyrmex();
    const pos = new THREE.Vector3(at.x + s * 1.6, 0, at.z + 2.5);
    collide(pos, 0.5, 1);
    mesh.position.copy(pos);
    scene.add(mesh);
    myrmexes.push({ type: 'myrmex', mesh, pos, hp: 2, knock: new THREE.Vector3(), biteCd: 1, dead: false });
  }
  sfx.chitter();
}

function spawnPest(at, roomKey) {
  removePest(false);
  const mesh = makePest();
  const pos = new THREE.Vector3(at.x + 1.2, 0, at.z + 1.2);
  mesh.position.copy(pos);
  scene.add(mesh);
  pest = { type: 'pest', mesh, pos, room: roomKey, talkT: 1.5, line: 0, hp: 1 };
  sfx.chitter();
}

function removePest(announce) {
  if (!pest) return;
  scene.remove(pest.mesh);
  pest = null;
  ui.hideSpeech();
  if (announce) ui.toast(PEST.stay, 3000);
}

function resetEnemiesAfterDeath() {
  for (const h of hounds) {
    if (h.dead) continue;
    h.pos.copy(h.home); h.hp = h.maxHp; h.state = 'idle'; h.knock.set(0, 0, 0);
  }
  clearMyrmexes();
  removePest(false);
  if (minotaur) {
    minotaur.pos.copy(minotaur.home); minotaur.hp = minotaur.maxHp; minotaur.state = 'sleep';
    minotaur.mesh.userData.stars.visible = false;
    ui.setBoss(null);
  }
}

function damagePlayer(n, from) {
  if (player.invuln > 0 || (mode !== 'play' && mode !== 'dialog')) return;
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
  addScore(POINTS.death, 'smrt', 'death');
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
  save();
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

function bowBonus(src) {
  if (src && src.kind === 'arrow' && src.dist >= BOW_RANGE_BONUS) addScore(POINTS.bowKill, 'zásah z dálky', 'monster');
}

function updateHounds(dt, time) {
  for (const h of hounds) {
    if (h.dead) continue;
    const toP = tmp.subVectors(player.pos, h.pos).setY(0);
    const dist = toP.length();
    const dirToP = toP.clone().normalize();
    const move = new THREE.Vector3();
    h.t -= dt;
    switch (h.state) {
      case 'idle':
        if (dist < 13 && player.pos.z > 34.5) { h.state = 'chase'; sfx.growl(); }
        break;
      case 'chase':
        move.copy(dirToP).multiplyScalar(dist > 3.4 ? 4.6 : 0);
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
      case 'stagger':
        if (h.t <= 0) h.state = 'chase';
        break;
    }
    h.pos.addScaledVector(move, dt);
    h.pos.addScaledVector(h.knock, dt);
    h.knock.multiplyScalar(Math.pow(0.02, dt));
    collide(h.pos, 0.7, 1.5);
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
    u.eyeMat.emissiveIntensity = h.state === 'windup' ? 5 : 2;
  }
}

function hitHound(h, dmg, dir, src) {
  h.hp -= dmg;
  h.knock.copy(dir).setY(0).normalize().multiplyScalar(8);
  h.state = 'stagger';
  h.t = 0.35;
  sfx.hit();
  if (h.hp <= 0) {
    h.dead = true;
    scene.remove(h.mesh);
    killEffect(h.pos, 0x888888);
    addScore(POINTS.hound, 'pekelný pes', 'monster');
    bowBonus(src);
    if (hounds.every((x) => x.dead)) {
      flags.houndsDead = true;
      spawnItem('silverKey', new THREE.Vector3(h.pos.x, 0.8, h.pos.z));
      ui.toast('Poslední pes se rozpadl v prach. Z obojku mu vypadl stříbrný klíček.');
      refreshHUD();
    }
  }
}

function updateMyrmexes(dt, time) {
  for (const m of myrmexes) {
    if (m.dead) continue;
    const toP = new THREE.Vector3().subVectors(player.pos, m.pos).setY(0);
    const dist = toP.length();
    const dir = toP.normalize();
    m.biteCd -= dt;
    if (dist > 1.1) m.pos.addScaledVector(dir, 3.3 * dt);
    else if (m.biteCd <= 0) { m.biteCd = 1.3; damagePlayer(1, m.pos); sfx.chitter(); }
    m.pos.addScaledVector(m.knock, dt);
    m.knock.multiplyScalar(Math.pow(0.02, dt));
    collide(m.pos, 0.5, 1);
    m.mesh.position.copy(m.pos);
    m.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    m.mesh.userData.legs.forEach((l, i) => { l.rotation.y = Math.sin(time * 20 + i) * 0.4; });
  }
}

function hitMyrmex(m, dmg, dir, src) {
  m.hp -= dmg;
  m.knock.copy(dir).setY(0).normalize().multiplyScalar(6);
  sfx.hit();
  if (m.hp <= 0) {
    m.dead = true;
    scene.remove(m.mesh);
    killEffect(m.pos, 0x8a3a2a);
    addScore(POINTS.myrmex, 'Myrmék', 'monster');
    bowBonus(src);
    myrmexes = myrmexes.filter((x) => !x.dead);
  }
}

function updatePest(dt, time) {
  if (!pest) return;
  const room = W.rooms[pest.room];
  if (!inRect(player.pos, room)) { removePest(true); return; }
  const toP = new THREE.Vector3().subVectors(player.pos, pest.pos).setY(0);
  const dist = toP.length();
  const dir = toP.normalize();
  if (dist > 1.7) pest.pos.addScaledVector(dir, Math.min(6, dist * 2) * dt);
  collide(pest.pos, 0.35, 1);
  pest.mesh.position.copy(pest.pos);
  pest.mesh.position.y = Math.abs(Math.sin(time * 9)) * 0.3;
  pest.mesh.rotation.y = Math.atan2(dir.x, dir.z);
  pest.mesh.userData.arms.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * (1.5 + Math.sin(time * 12) * 0.5); });
  pest.talkT -= dt;
  if (pest.talkT <= 0 && mode === 'play') {
    pest.talkT = 4;
    ui.speech(PEST.name, PEST.lines[pest.line % PEST.lines.length]);
    pest.line++;
    sfx.chitter();
  }
}

function hitPest() {
  killEffect(pest.pos, 0x8a6a4a);
  addScore(POINTS.pestKill, 'zabitý otrava', 'mistake');
  ui.toast(PEST.killed, 3500);
  removePest(false);
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
        ui.setBoss(m.hp / m.maxHp);
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
        if (dist < 3.4 && forward(m.yaw).dot(dirToP) > 0.3) damagePlayer(1, m.pos);
        sfx.swing();
        m.state = 'stalk'; m.t = 1.6;
      }
      break;
    case 'paw':
      m.yaw = Math.atan2(dirToP.x, dirToP.z);
      m.dir.copy(dirToP);
      u.eyeMat.emissiveIntensity = 4;
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
  if (m.state !== 'paw') u.eyeMat.emissiveIntensity = 0.4;
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

function hitMinotaur(dmg, src) {
  const m = minotaur;
  if (m.state === 'sleep') return;
  if (m.state !== 'stunned') {
    sfx.clang();
    if (!m.clangHint) { m.clangHint = true; ui.toast('Odrazilo se to! Jeho kůže je tvrdá jako bronz. Musíš ho nejdřív omráčit.'); }
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
    minotaur = null;
    ui.setBoss(null);
    addScore(POINTS.minotaur, 'Minotaurus', 'monster');
    bowBonus(src);
    ui.toast('Minotaurus se rozpadl ve zlatý prach. Teď máš klid na Daidalovu skříň.');
    refreshHUD();
    save();
  }
}

// ---------- duchové, kteří procházejí kolem ----------
function updateGhosts(dt, time) {
  for (const g of ghosts) {
    const visible = g.kind === 'ikaros' ? !!flags.lockOpen : true;
    g.mesh.visible = visible;
    g.int.enabled = visible;
    if (!visible) continue;
    const toP = new THREE.Vector3().subVectors(player.pos, g.pos).setY(0);
    const near = toP.length() < 4.5;
    const u = g.mesh.userData;
    if (near) {
      // zastaví se, otočí k hráči a pokyne
      g.mesh.rotation.y = Math.atan2(toP.x, toP.z);
      g.wave += dt;
      u.armR.rotation.z = -2.4 + Math.sin(g.wave * 8) * 0.4;
      u.legL.rotation.x = u.legR.rotation.x = 0;
      if (!g.greeted) { g.greeted = true; ui.speech(WANDERERS[g.kind].name, 'Hej, ty! Pojď blíž, něco ti povím. [Q]', 2500); }
    } else {
      g.greeted = false;
      u.armR.rotation.z = 0;
      const [tx, tz] = g.path[g.wp];
      const d = new THREE.Vector3(tx - g.pos.x, 0, tz - g.pos.z);
      if (d.length() < 0.2) g.wp = (g.wp + 1) % g.path.length;
      else {
        d.normalize();
        g.pos.addScaledVector(d, 1.1 * dt);
        g.mesh.rotation.y = Math.atan2(d.x, d.z);
      }
      const s = Math.sin(time * 5) * 0.5;
      u.legL.rotation.x = s; u.legR.rotation.x = -s;
      u.legL.userData.lower.rotation.x = Math.max(0, s) * 1.2; u.legR.userData.lower.rotation.x = Math.max(0, -s) * 1.2;
    }
    g.mesh.position.set(g.pos.x, 0.1 + Math.sin(time * 2) * 0.08, g.pos.z);
    g.int.pos.set(g.pos.x, 1.2, g.pos.z);
  }
}

// ---------- útok mečem a luk ----------
function attack() {
  if (mode !== 'play' || player.cooldown > 0) return;
  player.attackT = 0.001;
  player.cooldown = 0.45;
  player.hitDone = false;
  sfx.swing();
}

function enemyTargets() {
  const list = [];
  for (const h of hounds) if (!h.dead) list.push({ e: h, pos: h.pos, r: 0.9, y: 1.1, hit: (d, dir, src) => hitHound(h, d, dir, src) });
  for (const m of myrmexes) if (!m.dead) list.push({ e: m, pos: m.pos, r: 0.6, y: 0.5, hit: (d, dir, src) => hitMyrmex(m, d, dir, src) });
  if (minotaur) list.push({ e: minotaur, pos: minotaur.pos, r: 1.2, y: 2.0, hit: (d, dir, src) => hitMinotaur(d, src) });
  if (pest) list.push({ e: pest, pos: pest.pos, r: 0.5, y: 0.6, hit: () => hitPest() });
  return list;
}

function resolveAttackHit() {
  const f = forward(player.yaw);
  const dmg = parent.id === 'ares' ? 2 : 1;
  for (const t of enemyTargets()) {
    const d = tmp.subVectors(t.pos, player.pos).setY(0);
    const reach = 1.7 + t.r;
    if (d.length() < reach && d.normalize().dot(f) > 0.3) t.hit(dmg, f.clone(), { kind: 'sword' });
  }
}

const raycaster = new THREE.Raycaster();
function shoot() {
  if (mode !== 'play' || !flags.hasBow) return;
  if (player.shootCd > 0) return;
  if (arrows <= 0) { ui.toast('Došly ti šípy. Hledej toulce v místnostech.', 2500); return; }
  player.shootCd = 0.6;
  setArrows(arrows - 1);
  sfx.bow();
  // míří se křížkem uprostřed obrazovky
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  raycaster.far = 80;
  const hit = raycaster.intersectObjects(W.solids, false)[0];
  const aim = hit ? hit.point : camera.position.clone().addScaledVector(raycaster.ray.direction, 60);
  const start = player.pos.clone().add(new THREE.Vector3(0, 1.45, 0)).addScaledVector(forward(player.yaw), 0.5);
  const vel = aim.clone().sub(start).normalize().multiplyScalar(34);
  const mesh = makeArrow();
  mesh.position.copy(start);
  scene.add(mesh);
  projectiles.push({ mesh, pos: start, origin: start.clone(), vel, life: 3, stuck: false });
  // hráč se natočí ve směru výstřelu
  player.yaw = Math.atan2(vel.x, vel.z);
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    if (!p.stuck) {
      const steps = 3;
      for (let s = 0; s < steps && !p.stuck; s++) {
        p.vel.y -= 3 * dt / steps;
        p.pos.addScaledVector(p.vel, dt / steps);
        for (const t of enemyTargets()) {
          const dy = p.pos.y - t.y;
          const dx = p.pos.x - t.pos.x, dz = p.pos.z - t.pos.z;
          if (dx * dx + dz * dz < t.r * t.r && Math.abs(dy) < t.r + 0.6) {
            const dist = Math.hypot(t.pos.x - p.origin.x, t.pos.z - p.origin.z);
            t.hit(2, p.vel.clone(), { kind: 'arrow', dist });
            sfx.arrowHit();
            p.life = 0;
            p.stuck = true;
            break;
          }
        }
        if (!p.stuck && (p.pos.y < 0.02 || pointInSolid(p.pos))) { p.stuck = true; sfx.arrowHit(); p.life = Math.min(p.life, 2); }
      }
      p.mesh.position.copy(p.pos);
      p.mesh.lookAt(p.pos.clone().add(p.vel));
    }
    if (p.life <= 0) { scene.remove(p.mesh); projectiles.splice(i, 1); }
  }
}

// ---------- nášlapné dlaždice a páky ----------
function fireTrigger(tr) {
  if (tr.used) return;
  tr.used = true;
  flags['trig_' + tr.id] = true;
  sfx.click();
  if (tr.kind === 'plate') { tr.mesh.position.y = 0.0; tr.mesh.material = tr.mesh.material.clone(); tr.mesh.material.emissiveIntensity = 0; }
  else { tr.mesh.userData.arm.rotation.x = -0.6; tr.interact.enabled = false; }
  const outcome = flags.triggerMap[tr.id];
  const at = player.pos.clone();
  switch (outcome) {
    case 'vision1':
    case 'vision2':
      sfx.mist();
      ui.flash('rgba(140,110,255,0.35)');
      ui.toast(CURIOSITIES[outcome], 9000);
      addScore(POINTS.curiosity, 'vidění', 'discover');
      break;
    case 'treasure':
      sfx.pickup();
      ui.toast(CURIOSITIES.treasure, 4000);
      addItem('ambrosia');
      setArrows(arrows + 3);
      addScore(POINTS.treasure, 'poklad', 'discover');
      break;
    case 'monster':
      ui.toast(CURIOSITIES.monster, 3500);
      spawnMyrmexes(at);
      break;
    case 'pest':
      ui.toast(PEST.intro, 5000);
      spawnPest(at, tr.room);
      break;
  }
  save();
}

function updateTriggers() {
  for (const tr of W.triggers) {
    if (tr.used || tr.kind !== 'plate') continue;
    if (Math.hypot(player.pos.x - tr.pos.x, player.pos.z - tr.pos.z) < 0.75 && player.pos.y < 0.3) fireTrigger(tr);
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
  ui.hideSpeech();
}
function panelClosed() {
  if (mode === 'dialog') { mode = 'play'; lockPointer(); }
}

function pickUp(it) {
  it.enabled = false;
  scene.remove(it.mesh);
  flags['taken_' + it.key] = true;
  sfx.pickup();
  switch (it.item) {
    case 'quiver':
      setArrows(arrows + 5);
      ui.toast(`Toulec! +5 šípů (máš ${arrows}).`, 2500);
      break;
    case 'bow':
      flags.hasBow = true;
      addItem('bow');
      setArrows(parent.id === 'apollo' ? 10 : 6);
      ui.toast('Máš Artemidin luk! Střílíš pravým tlačítkem myši nebo klávesou E. Míříš křížkem uprostřed obrazovky.', 6000);
      break;
    case 'bronzeKey': flags.hasBronzeKey = true; addItem('bronzeKey'); ui.toast('Máš bronzový klíč!'); break;
    case 'silverKey': addItem('silverKey'); ui.toast('Máš stříbrný klíček.'); break;
    case 'ambrosia': addItem('ambrosia'); ui.toast('Ambrózie! Vyber ji v inventáři číslem a použij klávesou F.'); break;
    case 'lyraTile':
      flags.hasLyra = true;
      addItem('lyraTile');
      addScore(POINTS.secret, 'skrytý výklenek', 'discover');
      ui.toast('Destička s lyrou! Čtvrtý symbol do zámku v Hekatině svatyni.');
      break;
    case 'thread': flags.hasThread = true; addItem('thread'); ui.toast('Ariadnina nit! Zářící vlákno se táhne k bráně Δ.'); break;
  }
  refreshHUD();
  save();
}

function interact() {
  const it = nearestInteractable();
  if (!it) return;
  if (it.id === 'item') return pickUp(it);
  if (it.id === 'ghost') {
    openPanel();
    ui.showNPC(WANDERERS[it.kind], (opt) => {
      if (!flags['wander_' + it.kind]) { flags['wander_' + it.kind] = true; addScore(POINTS.wanderer, 'moudro', 'discover'); }
      return opt.reply;
    }, panelClosed);
    return;
  }
  if (['plaque', 'oedipus', 'mistTablet', 'mosaic'].includes(it.id)) { readHint(it.id); return; }
  if (LORE[it.id] && ['statue', 'rubble', 'hecate', 'helmets'].includes(it.id)) {
    ui.toast(LORE[it.id], 6000);
    if (it.id !== 'rubble') loreOnce(it.id);
    return;
  }
  const tr = W.triggers.find((t) => t.id === it.id);
  if (tr) { fireTrigger(tr); return; }
  switch (it.id) {
    case 'grover':
      openPanel();
      ui.showNPC(groverLines(flags), (opt) => {
        if (opt.gift && !flags.groverGift) { flags.groverGift = true; addItem('ambrosia'); sfx.pickup(); }
        return opt.reply;
      }, panelClosed);
      break;
    case 'automaton':
      openPanel();
      ui.showNPC(AUTOMATON, null, panelClosed);
      break;
    case 'doorA':
      if (flags.doorA) break;
      if (!hasItem('bronzeKey')) { ui.toast(LORE.doorALocked); break; }
      removeItem('bronzeKey');
      flags.doorA = true;
      openDoor(W.doorA);
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
      if (!hasItem('silverKey')) { ui.toast(LORE.chestLocked); break; }
      removeItem('silverKey');
      flags.chestOpen = true;
      it.enabled = false;
      W.chest.userData.lid.rotation.x = -1.9;
      addItem('amulet');
      flags.hasAmulet = true;
      flags.taken_amulet = true;
      sfx.mist();
      applyMist(true);
      ui.toast('V truhle ležel Hekatin amulet. Mlha se rozplynula a vidíš skryté nápisy! Amulet funguje i v místnostech, kterými jsi už prošel(a).', 6000);
      refreshHUD();
      save();
      break;
    case 'fakeDoor':
      ui.toast(flags.hasAmulet ? LORE.fakeDoorMist : LORE.fakeDoor);
      break;
    case 'mistWall':
      ui.toast(LORE.mistWall);
      break;
    case 'secret':
      if (flags.secretFound) break;
      flags.secretFound = true;
      it.enabled = false;
      addItem('ambrosia');
      setArrows(arrows + 5);
      sfx.pickup();
      addScore(POINTS.secret, 'tajná skrýš', 'discover');
      ui.toast('Tajná skrýš! Ambrózie a 5 šípů, které tu kdysi schoval jiný polobůh.', 4000);
      save();
      break;
    case 'lock': {
      if (flags.lockOpen) break;
      openPanel();
      const avail = ['blesk', 'trojzubec', 'sova', ...(flags.hasLyra ? ['lyra'] : [])];
      if (flags.hasLyra) puzzleStart('lock');
      ui.showLock(avail, (seq) => {
        if (seq.join() === SYMBOL_SOLUTION.join()) {
          flags.lockOpen = true;
          W.lockInt.enabled = false;
          removeItem('lyraTile');
          openDoor(W.lockDoor);
          sfx.correct();
          puzzleSolved('lock');
          ui.toast('Symboly se rozzáří a dveře se otevřou. Z dálky slyšíš řev...');
          refreshHUD();
          save();
          return true;
        }
        sfx.wrong();
        puzzleWrong('lock');
        return false;
      }, panelClosed);
      break;
    }
    case 'cage':
      if (flags.cageOpen) break;
      if (!flags.minotaurDead) { ui.toast(LORE.cageBusy); break; }
      openPanel();
      puzzleStart('dial');
      ui.showDial((code) => {
        if (code.join() === DIAL_SOLUTION.join()) {
          flags.cageOpen = true;
          it.enabled = false;
          openCage();
          sfx.correct();
          puzzleSolved('dial');
          ui.toast('Kolečka zapadla. Mříže skříně vyjely nahoru a uvnitř září klubko!');
          save();
          return true;
        }
        sfx.wrong();
        puzzleWrong('dial');
        return false;
      }, panelClosed);
      break;
    case 'gate':
      if (flags.gateOpen) break;
      if (!hasItem('thread')) { ui.toast(LORE.gateLocked, 5000); break; }
      talkGate();
      break;
  }
}

function openDoor(door) {
  sfx.door();
  door.collider.active = false;
  const m = door.mesh;
  const start = m.position.y;
  effects.push({ t: 1.5, update() { m.position.y = Math.max(start - 3.2, m.position.y - 0.04); }, end() { m.visible = false; } });
}

function openCage(instant = false) {
  for (const b of W.cageBars) {
    if (instant) { b.visible = false; continue; }
    effects.push({ t: 1.2, update(dt) { b.position.y += dt * 1.6; }, end() { b.visible = false; } });
  }
  spawnItem('thread', W.itemSpots.thread);
}

function applyMist(revealed) {
  W.mist.reveal.forEach((m) => { m.visible = revealed; });
  W.mist.hide.forEach((m) => { m.visible = !revealed; });
  W.mist.wall.mesh.visible = !revealed;
  W.mist.wall.collider.active = !revealed;
  W.mistWallInt.enabled = !revealed;
  W.mistTabletInt.enabled = revealed;
  W.lockInt.enabled = revealed && !flags.lockOpen;
  W.secretInt.enabled = revealed && !flags.secretFound;
  if (revealed) spawnItem('lyraTile', W.itemSpots.lyraTile);
}

function nextSphinxQuestion() {
  const pool = SPHINX_QUESTIONS.filter((q) => !sphinxAsked.includes(q));
  if (!pool.length) sphinxAsked = [];
  const list = pool.length ? pool : SPHINX_QUESTIONS;
  sphinxQ = list[Math.floor(Math.random() * list.length)];
  sphinxAsked.push(sphinxQ);
  puzzleStart('sphinx_' + SPHINX_QUESTIONS.indexOf(sphinxQ));
  return sphinxQ;
}

function talkSphinx() {
  if (flags.sphinxDone) { ui.toast(SPHINX.already, 6000); return; }
  openPanel();
  const q = sphinxQ || nextSphinxQuestion();
  puzzleStart('sphinx_' + SPHINX_QUESTIONS.indexOf(q));
  ui.showRiddle({
    title: `Sfinga (správně: ${sphinxCorrect}/3)`,
    intro: SPHINX.greet,
    question: q.q,
    hint: q.hint,
    allowHint: parent.id === 'athena',
    onHint: useHint,
    onSubmit(text, voice, peak) {
      const key = 'sphinx_' + SPHINX_QUESTIONS.indexOf(sphinxQ);
      if (matches(text, sphinxQ.a)) {
        sphinxCorrect++;
        sfx.correct();
        puzzleSolved(key);
        if (sphinxCorrect >= 3) {
          flags.sphinxDone = true;
          journalAdd('sphinx');
          sphinxQ = null;
          moveSphinxAside();
          refreshHUD();
          save();
          setTimeout(() => {
            openPanel();
            ui.showNPC({ name: 'Sfinga', text: SPHINX.done + ' (Zapsáno do deníku, klávesa J.)', options: [] }, null, panelClosed);
          }, 60);
          return { close: true };
        }
        const nq = nextSphinxQuestion();
        return { ok: true, title: `Sfinga (správně: ${sphinxCorrect}/3)`, message: SPHINX.correct[sphinxCorrect - 1], question: nq.q, hint: nq.hint };
      }
      sfx.wrong();
      puzzleWrong(key);
      // Křik funguje jen při hlasové odpovědi.
      if (voice && peak >= SHOUT_LEVEL) return { ok: false, message: SPHINX.shout + ' ' + sphinxQ.hint };
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
  effects.push({ t: 1.5, update() { s.position.x = Math.max(-3.2, s.position.x - 0.05); }, end() { s.position.x = -3.2; s.rotation.y = Math.PI / 2; } });
}

function talkGate() {
  openPanel();
  const stage = flags.gateStage || 0;
  puzzleStart('gate' + stage);
  ui.showRiddle({
    title: `Daidalova brána Δ (${stage + 1}/2)`,
    intro: 'Přiložíš Ariadninu nit k pečeti. Brána ožije.',
    question: GATE[stage].q,
    hint: GATE[stage].hint,
    allowHint: parent.id === 'athena',
    onHint: useHint,
    onSubmit(text, voice, peak) {
      const st = flags.gateStage || 0;
      if (matches(text, GATE[st].a)) {
        sfx.correct();
        puzzleSolved('gate' + st);
        if (st === 0) {
          flags.gateStage = 1;
          puzzleStart('gate1');
          save();
          return { ok: true, title: 'Daidalova brána Δ (2/2)', message: 'Pečeť se pohnula. Ještě jedno jméno.', question: GATE[1].q, hint: GATE[1].hint };
        }
        flags.gateOpen = true;
        openDoor(W.gate);
        sfx.victory();
        ui.toast('Brána se otevírá. Za ní je denní světlo a vůně jahodových polí!', 5000);
        refreshHUD();
        save();
        return { close: true };
      }
      sfx.wrong();
      puzzleWrong('gate' + st);
      if (voice && peak >= SHOUT_LEVEL) return { ok: false, message: GATE_TEXT.shout + ' ' + GATE[st].hint };
      return { ok: false, message: GATE_TEXT.wrong };
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
  ui.hideSpeech();
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
  player.pitch = clamp(player.pitch + e.movementY * 0.002, -0.45, 1.2);
});
canvas.addEventListener('mousedown', (e) => {
  if (mode !== 'play') return;
  if (!document.pointerLockElement && !noLock) { lockPointer(); return; }
  if (e.button === 0) attack();
  if (e.button === 2) shoot();
});
document.addEventListener('contextmenu', (e) => { if (mode === 'play') e.preventDefault(); });

window.addEventListener('keydown', (e) => {
  if (ui.panelOpen()) {
    if (e.key === 'Escape' || (e.code === 'KeyJ' && ui.journalShown())) ui.closePanel();
    return;
  }
  if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') return;
  if (mode === 'pause' && (e.key === 'Escape' || e.key === 'Enter')) { resume(); return; }
  if (mode !== 'play') return;
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); if (player.onGround) { player.vy = JUMP_V; player.onGround = false; sfx.jump(); } }
  if (e.code === 'KeyQ') interact();
  if (e.code === 'KeyE') shoot();
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') attack();
  if (/^Digit[1-9]$/.test(e.code)) {
    const i = +e.code.slice(5) - 1;
    if (i < inventory.length) { selected = i; refreshInventory(); }
  }
  if (e.code === 'KeyF') useSelected();
  if (e.code === 'KeyJ') openJournal();
  if (e.code === 'KeyH' && hasItem('ambrosia')) { selected = inventory.findIndex((i) => i.id === 'ambrosia'); useSelected(); }
  if (e.code === 'KeyM') ui.toast(toggleMute() ? 'Zvuk vypnut' : 'Zvuk zapnut', 1200);
  if (e.code === 'Escape' && noLock) pause();
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// ---------- smyčka ----------
const clock = new THREE.Clock();
let stepT = 0;
let timerShown = -1;

function regionCheckpoint(p) {
  if (inRect(p, W.rooms.arena)) return 'arena';
  if (inRect(p, W.rooms.mist)) return 'mist';
  if (inRect(p, W.rooms.hounds) && flags.sphinxDone) return 'sphinx';
  if (inRect(p, W.rooms.entrance)) return 'start';
  return null;
}

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
  p.shootCd -= dt;
  p.invuln -= dt;
  if (parent.id === 'apollo' && p.hp < p.maxHp) {
    p.regenT += dt;
    if (p.regenT > 20) { p.regenT = 0; p.hp++; ui.setHearts(p.hp, p.maxHp); }
  }

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
  u.legL.userData.lower.rotation.x = Math.max(0, sw) * 1.2; // koleno se pokrčí, když noha jde dozadu
  u.legR.userData.lower.rotation.x = Math.max(0, -sw) * 1.2;
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

  const cp = regionCheckpoint(p.pos);
  if (cp && cp !== checkpoint) {
    checkpoint = cp;
    if (!flags['cp_' + cp]) { flags['cp_' + cp] = true; ui.toast('Kontrolní bod uložen.', 1500); }
    save();
  }
  if (p.pos.x > 50 && !flags.escaped) win();
}

function updateCamera(dt) {
  const p = player;
  const f = forward(p.yaw);
  const right = new THREE.Vector3(-f.z, 0, f.x);
  // pohled přes pravé rameno, aby křížek nebyl zakrytý postavou
  const target = new THREE.Vector3(p.pos.x, p.pos.y + 1.7, p.pos.z).addScaledVector(right, 0.55);
  const dir = new THREE.Vector3(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch)).normalize();
  let dist = 4.4;
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
  camera.lookAt(target.clone().addScaledVector(f, 2.5).setY(target.y + 0.2 - Math.sin(p.pitch) * 1.5));
}

function updateMood() {
  if (mode === 'dialog') return setMood('puzzle');
  const fighting = hounds.some((h) => !h.dead && h.state !== 'idle') || myrmexes.length > 0 || (minotaur && minotaur.state !== 'sleep');
  setMood(fighting ? 'combat' : 'explore');
}

let simTime = 0;
function step(dt) {
  simTime += dt;
  const time = simTime;
  W.animated.forEach((fn) => fn(time));
  for (const it of worldItems) if (it.enabled) { it.mesh.rotation.y += dt * 2; it.mesh.position.y = it.pos.y + Math.sin(time * 3) * 0.1; }
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.t -= dt;
    e.update(dt);
    if (e.t <= 0) { if (e.end) e.end(); effects.splice(i, 1); }
  }
  if (mode === 'play') {
    updatePlayer(dt, time);
    updateHounds(dt, time);
    updateMyrmexes(dt, time);
    updateMinotaur(dt, time);
    updatePest(dt, time);
    updateTriggers();
    updateProjectiles(dt);
    const it = nearestInteractable();
    ui.setPrompt(it ? `[Q] ${it.label}` : null);
  } else ui.setPrompt(null);
  if (mode === 'play' || mode === 'dialog') {
    updateGhosts(dt, time);
    updateMood();
    elapsed += dt;
    if (Math.floor(elapsed) !== timerShown) { timerShown = Math.floor(elapsed); ui.setTimer(elapsed); }
  }
  if (player.model) updateCamera(dt);
}

function loop() {
  requestAnimationFrame(loop);
  const dt = clock.getDelta();
  step(Math.min(dt, 0.05));
  if (mode === 'play') watchPerformance(dt);
  grade.uniforms.time.value = (grade.uniforms.time.value + dt) % 100;
  composer.render();
}

// ---------- start, výhra ----------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function setupGame(fromSave) {
  flags = fromSave ? { ...fromSave.flags } : {};
  inventory = fromSave ? fromSave.inventory.map((i) => ({ ...i })) : [];
  checkpoint = fromSave ? fromSave.checkpoint : 'start';
  elapsed = fromSave ? fromSave.elapsed : 0;
  deaths = fromSave ? fromSave.deaths : 0;
  score = fromSave ? fromSave.score || 0 : 0;
  scoreLog = fromSave ? { ...(fromSave.scoreLog || {}) } : {};
  if (fromSave) playerName = fromSave.playerName || playerName;
  parent = PARENTS.find((x) => x.id === (fromSave ? fromSave.parent : parent.id)) || PARENTS[0];
  arrows = fromSave ? fromSave.arrows || 0 : 0;
  selected = 0;
  sphinxCorrect = 0; sphinxAsked = []; sphinxQ = null;
  for (const k in puzzle) delete puzzle[k];
  if (!flags.triggerMap) {
    const outcomes = shuffle(['vision1', 'vision2', 'treasure', 'monster', 'pest']);
    flags.triggerMap = {};
    W.triggers.forEach((t, i) => { flags.triggerMap[t.id] = outcomes[i % outcomes.length]; });
  }

  if (player.model) scene.remove(player.model);
  player.model = makePlayer(parent.color);
  scene.add(player.model);
  player.maxHp = parent.id === 'poseidon' ? 6 : 5;
  player.yaw = 0;

  worldItems.forEach((it) => { scene.remove(it.mesh); it.enabled = false; });
  worldItems.length = 0;
  projectiles.forEach((p) => scene.remove(p.mesh));
  projectiles.length = 0;
  W.interactables = W.interactables.filter((i) => i.id !== 'item' && i.id !== 'ghost');
  const S = W.itemSpots;
  spawnItem('bow', S.bow);
  spawnItem('bronzeKey', S.bronzeKey);
  spawnItem('ambrosia', S.ambrosia1, 'ambrosia1');
  spawnItem('ambrosia', S.ambrosia2, 'ambrosia2');
  for (const q of ['quiver1', 'quiver2', 'quiver3', 'quiver4']) spawnItem('quiver', S[q], q);
  if (flags.houndsDead && !flags.taken_silverKey && !flags.chestOpen) spawnItem('silverKey', new THREE.Vector3(1.5, 0.8, 49));

  const doorState = (door, open) => { door.collider.active = !open; door.mesh.visible = !open; door.mesh.position.y = 1.5; };
  doorState(W.doorA, !!flags.doorA);
  W.doorA.mesh.position.y = 1.5;
  W.interactables.find((i) => i.id === 'doorA').enabled = !flags.doorA;
  W.sphinxBlock.collider.active = !flags.sphinxDone;
  W.sphinx.position.set(flags.sphinxDone ? -3.2 : 0, 0, 31.6);
  W.sphinx.rotation.y = flags.sphinxDone ? Math.PI / 2 : Math.PI;
  W.sphinxInt.pos.set(flags.sphinxDone ? -4.5 : 0, 1.5, flags.sphinxDone ? 30 : 29.5);
  W.chest.userData.lid.rotation.x = flags.chestOpen ? -1.9 : 0;
  W.interactables.find((i) => i.id === 'chest').enabled = !flags.chestOpen;
  doorState(W.lockDoor, !!flags.lockOpen);
  doorState(W.gate, !!flags.gateOpen);
  W.gate.mesh.position.y = 2;
  W.cageBars.forEach((b) => { b.visible = true; b.position.y = 1.1; });
  W.cageInt.enabled = !flags.cageOpen;
  if (flags.cageOpen) openCage(true);
  for (const tr of W.triggers) {
    tr.used = !!flags['trig_' + tr.id];
    if (tr.kind === 'lever') { tr.mesh.userData.arm.rotation.x = tr.used ? -0.6 : 0.6; tr.interact.enabled = !tr.used; }
  }
  applyMist(!!flags.hasAmulet);

  createEnemies();
  ui.setBoss(null);
  respawn();
  ui.setTimer(elapsed);
}

async function win() {
  flags.escaped = true;
  mode = 'win';
  sfx.victory();
  setMood('explore');
  if (document.pointerLockElement) document.exitPointerLock();
  const bonus = Math.max(0, Math.round(POINTS.timeLimit - elapsed));
  if (bonus) addScore(bonus, 'časový bonus', 'time');
  const m = Math.floor(elapsed / 60), s = Math.floor(elapsed % 60);
  document.getElementById('winStats').innerHTML =
    `<b>${escapeHtml(playerName)}</b>, ${parent.icon} dítě boha ${parent.name}<br>Body: <b>${score}</b> · Čas: <b>${m}:${String(s).padStart(2, '0')}</b> · Smrti: <b>${deaths}</b>`;
  document.getElementById('scoreBreakdown').innerHTML = Object.entries(CATEGORY)
    .filter(([k]) => scoreLog[k])
    .map(([k, label]) => `<span>${label}</span><b>${scoreLog[k] > 0 ? '+' : ''}${scoreLog[k]}</b>`).join('');
  clearSave();
  ui.showOverlay('win');
  document.getElementById('hud').classList.add('hidden');
  const hall = document.getElementById('hallWin');
  hall.innerHTML = '<p class="muted">Zapisuji do síně slávy...</p>';
  const sub = await submitScore({ name: playerName, score, time: Math.round(elapsed), deaths, parent: parent.name, parentIcon: parent.icon });
  const lb = withOwnRow(await loadLeaderboard(), sub);
  ui.renderLeaderboard(hall, lb.rows, sub.id, lb.note);
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---------- menu ----------
ui.renderControls();

// posuvníky hlasitosti (v menu i v pauze)
const volInputs = [...document.querySelectorAll('input.vol')];
function syncVolume() {
  const v = getVolume();
  volInputs.forEach((el) => { el.value = Math.round(v[el.dataset.kind] * 100); });
}
volInputs.forEach((el) => {
  el.addEventListener('input', () => { setVolume(el.dataset.kind, el.value / 100); syncVolume(); });
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === 'Enter') el.blur(); });
});
syncVolume();

const parentsEl = document.getElementById('parents');
parentsEl.innerHTML = PARENTS.map((p, i) => `<div class="parent ${i === 0 ? 'sel' : ''}" data-id="${p.id}" tabindex="0" role="button"><div class="ic">${p.icon}</div><b>${p.name}</b><small>${p.perk}</small></div>`).join('');
parentsEl.querySelectorAll('.parent').forEach((el) => {
  const pick = () => {
    parentsEl.querySelectorAll('.parent').forEach((x) => x.classList.remove('sel'));
    el.classList.add('sel');
    parent = PARENTS.find((p) => p.id === el.dataset.id);
  };
  el.onclick = pick;
  el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') pick(); };
});

const nameInput = document.getElementById('playerName');
try { nameInput.value = localStorage.getItem('labyrint-name') || ''; } catch (e) { /* nic */ }

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
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); nameInput.placeholder = 'Nejdřív napiš své jméno'; nameInput.style.borderColor = '#ff8a7a'; return; }
  playerName = name.slice(0, 20);
  try { localStorage.setItem('labyrint-name', playerName); } catch (e) { /* nic */ }
  clearSave();
  setupGame(null);
  document.getElementById('introText').innerHTML =
    INTRO.map((t) => `<p>${t}</p>`).join('') + `<p><b>${escapeHtml(playerName)}, ${parent.icon} jsi dítě boha ${parent.name}.</b> ${parent.perk}</p>`;
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
document.getElementById('btnHall').onclick = async () => {
  const el = document.getElementById('hallMenu');
  el.classList.toggle('hidden');
  if (el.classList.contains('hidden')) return;
  el.innerHTML = '<p class="muted">Načítám tabulku...</p>';
  const lb = await loadLeaderboard();
  ui.renderLeaderboard(el, lb.rows, null, sourceNote(lb.shared));
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
loop();

// pro automatické testy
window.__game = {
  tick: (n) => { for (let i = 0; i < n; i++) step(1 / 60); }, keys, player, W, interact, attack, shoot,
  flags: () => flags, get mode() { return mode; }, inventory: () => inventory, hounds: () => hounds, minotaur: () => minotaur,
  myrmexes: () => myrmexes, pest: () => pest, score: () => score, arrows: () => arrows, scoreLog: () => scoreLog, fireTrigger,
};
