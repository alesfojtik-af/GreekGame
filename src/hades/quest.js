// Logika questu Hádův palác: urny a obol, Charónův převoz, Kerberos, Tantalos, Sisyfos,
// helm neviditelnosti, kostlivci v zahradě, Persefona a Hádovo vyjednávání.
import * as THREE from 'three';
import { makeCerberus, makeSkeleton, makeBonePile } from './models.js';
import {
  INTRO, ITEMS, URNS, URN_OBOL, URN_TEXT, CHARON, CERBERUS, TANTALUS, SISYPHUS, DIAL, PERSEPHONE, HADES, HELM, PALACE, GARDEN,
  WANDERERS, CURIOSITIES, DECOR, JOURNAL, objective,
} from './content.js';
import { matches } from '../speech.js';

const HELM_TIME = 6;
const HELM_COOLDOWN = 10;
const SKELETON_PATHS = [[[-10, 77], [10, 77]], [[10, 82.7], [-10, 82.7]], [[-6, 89.6], [4, 89.6]]];
const SIGHT = 9;
const SIGHT_COS = Math.cos(0.7);
const BOAT_NEAR = 12.6;
const BOAT_FAR = 17.4;

export function createHadesQuest(api) {
  const { scene, ui, sfx, player, POINTS } = api;
  const W = () => api.W;
  const F = () => api.flags;
  const tmp = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  let cer = null;
  let skeletons = [];
  let ride = null;
  let ball = null;
  const helm = { t: 0, cd: 0, shown: '' };
  let sisT = 0;

  // ---------- helm temnoty ----------
  function activateHelm() {
    if (!api.hasItem('helm')) return;
    if (helm.t > 0) return;
    if (helm.cd > 0) { ui.toast(`${HELM.wait} (${Math.ceil(helm.cd)} s)`, 1500); return; }
    helm.t = HELM_TIME;
    api.setPlayerGhost(true);
    sfx.mist();
    ui.toast(HELM.on, 2000);
  }
  function endInvisibility(cool) {
    if (helm.t > 0) api.setPlayerGhost(false);
    helm.t = 0;
    helm.cd = cool ? HELM_COOLDOWN : 0;
  }
  const invisible = () => helm.t > 0;
  function helmHUD() {
    let text = '';
    if (api.hasItem('helm')) text = helm.t > 0 ? `🪖 Neviditelný(á): ${Math.ceil(helm.t)} s` : helm.cd > 0 ? `🪖 Nabíjí se: ${Math.ceil(helm.cd)} s` : '🪖 Helm připraven [R]';
    if (text !== helm.shown) { helm.shown = text; ui.setHelm(text || null, helm.t > 0); }
  }

  // ---------- Charónův převoz ----------
  function setBoat(far) { W().boat.position.z = far ? BOAT_FAR : BOAT_NEAR; }
  function startRide(toFar) {
    ride = { t: 0, dur: 4.2, from: toFar ? BOAT_NEAR : BOAT_FAR, to: toFar ? BOAT_FAR : BOAT_NEAR, toFar };
    setBoat(!toFar);
    W().river.active = false;
  }
  function updateRide(dt) {
    if (!ride) return;
    ride.t += dt;
    const k = Math.min(1, ride.t / ride.dur);
    const s = k * k * (3 - 2 * k);
    const b = W().boat;
    b.position.z = ride.from + (ride.to - ride.from) * s;
    player.pos.set(b.position.x - 0.1, 0.32, b.position.z + 0.6);
    player.vy = 0;
    if (k >= 1) {
      F().boatFar = ride.toFar;
      player.pos.set(3, 0.22, ride.toFar ? 21 : 9);
      W().river.active = true;
      ride = null;
      api.save();
    }
  }

  // ---------- Kerberos ----------
  function createCerberus() {
    if (cer) scene.remove(cer.mesh);
    const mesh = makeCerberus();
    scene.add(mesh);
    cer = {
      mesh, home: new THREE.Vector3(0, 0, 41.5), pos: new THREE.Vector3(0, 0, 41.5), yaw: Math.PI, state: 'idle', atkT: 2.5, last: -1, distractT: 0, clangHint: false,
      heads: mesh.userData.heads.map((h) => ({ ...h, hp: 3, state: 'idle', t: 0, ang: 0, flash: 0 })),
    };
    if (F().cerberusDone) sleepPose();
    placeCerberus();
  }
  function placeCerberus() {
    cer.mesh.position.copy(cer.pos);
    cer.mesh.rotation.y = cer.yaw;
  }
  function sleepPose() {
    cer.state = 'asleep';
    cer.pos.set(-6.5, -1.45, 42.5);
    cer.yaw = Math.PI * 0.75;
    cer.heads.forEach((h) => { h.state = 'out'; h.hp = 0; });
    const u = cer.mesh.userData;
    u.legs.forEach((l, i) => { l.rotation.x = i < 2 ? -1.35 : 1.35; });
    cer.heads.forEach((h) => { h.ang = 1.5; h.pivot.rotation.x = 1.0; h.eye.emissiveIntensity = 0; h.jaw.rotation.x = -Math.PI / 2 + 0.2; });
  }
  function resetCerberus() {
    if (!cer || F().cerberusDone) return;
    cer.pos.copy(cer.home); cer.yaw = Math.PI; cer.state = 'idle'; cer.atkT = 2.5; cer.distractT = 0;
    cer.heads.forEach((h) => { h.hp = 3; h.state = 'idle'; h.t = 0; });
    removeBall();
    placeCerberus();
  }
  function bossFrac() { return cer.heads.reduce((a, h) => a + Math.max(0, h.hp), 0) / 9; }
  function headDir(h) { const y = cer.yaw + h.pivot.rotation.y; return new THREE.Vector3(Math.sin(y), 0, Math.cos(y)); }
  function headWorld(h) { return h.head.getWorldPosition(new THREE.Vector3()); }

  function updateCerberus(dt, time) {
    if (!cer) return;
    const f = F();
    const toP = tmp.subVectors(player.pos, cer.pos).setY(0);
    const dist = toP.length();
    // tělo nelze projít
    const bodyR = cer.state === 'asleep' ? 2.6 : 2.3;
    if (dist < bodyR && dist > 0.001) player.pos.addScaledVector(toP.clone().normalize(), bodyR - dist);
    if (cer.state === 'asleep') {
      cer.heads.forEach((h, i) => { h.pivot.rotation.x = 1.0 + Math.sin(time * 1.2 + i) * 0.03; });
      return;
    }
    if (cer.state === 'idle') {
      cer.heads.forEach((h, i) => { h.pivot.rotation.x = Math.sin(time * 1.5 + i) * 0.06; h.jaw.rotation.x = -Math.PI / 2 + 0.25 + Math.abs(Math.sin(time * 6 + i)) * 0.15; });
      if (player.pos.z > 33 && api.inRect(player.pos, W().rooms.court)) {
        cer.state = 'awake';
        sfx.roar(); api.shake(0.5);
        ui.toast(CERBERUS.wake, 4000);
        ui.setBoss(bossFrac(), 'KERBEROS');
      }
      return;
    }
    const dirP = toP.clone().normalize();
    if (cer.state === 'distracted') {
      cer.distractT -= dt;
      if (ball) { const tb = tmp.subVectors(ball.mesh.position, cer.pos).setY(0); cer.yaw += angleTo(cer.yaw, Math.atan2(tb.x, tb.z)) * Math.min(1, dt * 3); }
      if (cer.distractT <= 0) { cer.state = 'awake'; cer.atkT = 1.5; cer.ballCd = 10; removeBall(); ui.toast(CERBERUS.ballBack, 2500); }
    } else {
      cer.ballCd = Math.max(0, (cer.ballCd || 0) - dt);
      // natočení a pomalý postup za hráčem
      cer.yaw += clampA(angleTo(cer.yaw, Math.atan2(dirP.x, dirP.z)), 1.4 * dt);
      if (dist > 5.5) cer.pos.addScaledVector(new THREE.Vector3(Math.sin(cer.yaw), 0, Math.cos(cer.yaw)), 1.7 * dt);
      cer.atkT -= dt;
      const busy = cer.heads.some((h) => h.state === 'windup' || h.state === 'bite');
      if (cer.atkT <= 0 && !busy) {
        // zaútočí hlava, která míří nejblíž k hráči
        let best = null, bd = -2;
        for (const h of cer.heads) {
          if (h.state !== 'idle') continue;
          const d = headDir(h).dot(dirP) - (h.i === cer.last ? 0.3 : 0);
          if (d > bd) { bd = d; best = h; }
        }
        if (best) { best.state = 'windup'; best.t = 0.85; cer.last = best.i; sfx.growl(); }
        const alive = cer.heads.filter((h) => h.state !== 'out').length;
        cer.atkT = 0.9 + alive * 0.35;
      }
    }
    cer.pos.x = Math.max(-8.3, Math.min(8.3, cer.pos.x));
    cer.pos.z = Math.max(35, Math.min(46.5, cer.pos.z));
    api.collide(cer.pos, 1.6, 3);
    placeCerberus();
    const legs = cer.mesh.userData.legs;
    const walking = cer.state === 'awake' && dist > 5.5;
    legs.forEach((l, i) => { l.rotation.x = walking ? Math.sin(time * 6 + (i % 2 ? 0 : Math.PI)) * 0.45 : 0; });

    for (const h of cer.heads) {
      h.t -= dt;
      h.flash -= dt;
      let target = Math.sin(time * 1.5 + h.i) * 0.06, jaw = 0.25, glow = 2, speed = 8;
      if (h.state === 'windup') {
        target = -0.5; jaw = 0.9; glow = 6;
        if (h.t <= 0) {
          h.state = 'bite'; h.t = 0.3;
          const bp = cer.pos.clone().addScaledVector(headDir(h), 3.9);
          if (bp.distanceTo(new THREE.Vector3(player.pos.x, 0, player.pos.z)) < 2.3) api.damagePlayer(1, cer.pos);
          sfx.swing();
        }
      } else if (h.state === 'bite') {
        target = 0.85; jaw = 0.1; glow = 4; speed = 22;
        if (h.t <= 0) { h.state = 'down'; h.t = 1.8; }
      } else if (h.state === 'down') {
        target = 1.25; jaw = 0.35; glow = 0.5;
        if (h.t <= 0) h.state = 'idle';
      } else if (h.state === 'out') {
        target = 1.45; jaw = 0.05; glow = 0;
      }
      if (cer.state === 'distracted' && h.state !== 'out') { target = 1.15 + Math.sin(time * 5 + h.i * 2) * 0.12; jaw = 0.5; glow = 0.8; h.state = h.state === 'windup' || h.state === 'bite' ? 'down' : h.state; }
      h.ang += (target - h.ang) * Math.min(1, dt * speed);
      h.pivot.rotation.x = h.ang;
      h.tip.rotation.x = -h.ang * 0.55;
      h.jaw.rotation.x = -Math.PI / 2 + 0.2 + jaw * 0.6;
      h.eye.emissiveIntensity = h.flash > 0 ? 8 : glow;
    }
  }
  const angleTo = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  const clampA = (d, m) => Math.max(-m, Math.min(m, d));

  function hitHead(h, dmg, src) {
    if (h.state === 'out' || !cer || cer.state === 'asleep') return;
    const vulnerable = h.state === 'down' || cer.state === 'distracted';
    if (!vulnerable) {
      sfx.clang();
      if (!cer.clangHint) { cer.clangHint = true; ui.toast(CERBERUS.clang, 4500); }
      return;
    }
    h.hp -= dmg;
    h.flash = 0.15;
    sfx.hit();
    ui.setBoss(bossFrac(), 'KERBEROS');
    if (h.hp <= 0) {
      h.state = 'out';
      api.addScore(POINTS.hound, 'hlava Kerbera', 'monster');
      api.bowBonus(src);
      if (cer.heads.every((x) => x.state === 'out')) defeatCerberus();
      else ui.toast(CERBERUS.headDown, 2500);
    }
  }
  function defeatCerberus() {
    const f = F();
    f.cerberusDone = true;
    removeBall();
    ui.setBoss(null);
    api.addScore(POINTS.minotaur, 'Kerberos', 'monster');
    api.openDoor(W().cerGate);
    ui.toast(CERBERUS.asleep, 6000);
    const from = cer.pos.clone();
    const c = cer;
    c.state = 'asleep';
    api.effects.push({ t: 1.6, update() { c.pos.lerp(new THREE.Vector3(-6.5, 0, 42.5), 0.04); placeCerberus(); }, end() { sleepPose(); placeCerberus(); } });
    void from;
    api.refreshHUD();
    api.save();
  }

  // míček: hodí se před Kerbera a všechny hlavy se za ním skloní
  function throwBall() {
    const f = F();
    if (!cer || f.cerberusDone || cer.state === 'idle' || !api.inRect(player.pos, W().rooms.court)) { ui.toast(CERBERUS.ballNoTarget, 2500); return; }
    if (cer.state === 'distracted' || cer.ballCd > 0) { ui.toast(CERBERUS.ballWait, 2000); return; }
    const mesh = api.makeItem('ball');
    const start = player.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
    const land = cer.pos.clone().addScaledVector(new THREE.Vector3(Math.sin(cer.yaw), 0, Math.cos(cer.yaw)), 3.2).setY(0.2);
    mesh.position.copy(start);
    scene.add(mesh);
    ball = { mesh, start, land, t: 0 };
    cer.state = 'distracted';
    cer.distractT = 5;
    sfx.jump();
    ui.toast(CERBERUS.ball, 3500);
    if (!f.ballTrick) { f.ballTrick = true; api.addScore(100, 'trik s míčkem', 'monster'); }
  }
  function updateBall(dt) {
    if (!ball) return;
    ball.t = Math.min(1, ball.t + dt / 0.7);
    ball.mesh.position.lerpVectors(ball.start, ball.land, ball.t);
    ball.mesh.position.y += Math.sin(ball.t * Math.PI) * 2.5;
  }
  function removeBall() { if (ball) { scene.remove(ball.mesh); ball = null; } }

  // ---------- kostlivci v zahradě ----------
  function createSkeletons() {
    skeletons.forEach((s) => { scene.remove(s.mesh); scene.remove(s.pile); });
    skeletons = SKELETON_PATHS.map((path, i) => {
      const mesh = makeSkeleton();
      scene.add(mesh);
      const pile = makeBonePile();
      pile.visible = false;
      scene.add(pile);
      const cone = new THREE.Mesh(new THREE.CircleGeometry(SIGHT, 28, -Math.PI / 2 - 0.7, 1.4), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.1, depthWrite: false }));
      cone.rotation.x = -Math.PI / 2;
      cone.position.y = 0.05;
      mesh.add(cone);
      const s = { i, mesh, pile, cone, path, wp: 1, pos: new THREE.Vector3(), yaw: 0, state: 'patrol', t: 0, hp: 3, lost: 0, knock: new THREE.Vector3(), walk: Math.random() * 6 };
      resetSkeleton(s);
      return s;
    });
  }
  function resetSkeleton(s) {
    s.pos.set(s.path[0][0], 0, s.path[0][1]);
    s.wp = 1; s.state = 'patrol'; s.hp = 3; s.lost = 0; s.knock.set(0, 0, 0);
    s.mesh.visible = true; s.pile.visible = false;
    s.mesh.position.copy(s.pos);
  }
  function canSee(s, dist, dirP) {
    if (invisible() || mode() !== 'play') return false;
    if (!api.inRect(player.pos, W().rooms.garden)) return false;
    if (dist > SIGHT) return false;
    const fwd = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw));
    if (dist > 1.4 && fwd.dot(dirP) < SIGHT_COS) return false;
    const eye = s.pos.clone().setY(1.5);
    const to = player.pos.clone().setY(player.pos.y + 1.2).sub(eye);
    const len = to.length();
    ray.set(eye, to.normalize());
    ray.far = len;
    const hit = ray.intersectObjects(W().solids, false)[0];
    return !hit || hit.distance > len - 0.3;
  }
  const mode = () => api.mode;
  function spotted() {
    const f = F();
    if (!f.gardenSpotted) { f.gardenSpotted = true; ui.toast(GARDEN.spotted, 3500); }
  }
  function updateSkeleton(s, dt, time) {
    const u = s.mesh.userData;
    if (s.state === 'collapsed') {
      s.t -= dt;
      if (s.t <= 0) {
        s.state = 'return'; s.hp = 3;
        s.mesh.visible = true; s.pile.visible = false;
        sfx.click();
      }
      return;
    }
    const toP = tmp.subVectors(player.pos, s.pos).setY(0);
    const dist = toP.length();
    const dirP = toP.clone().normalize();
    const sees = canSee(s, dist, dirP);
    let goal = null, speed = 0;
    s.t -= dt;
    switch (s.state) {
      case 'patrol': {
        const [tx, tz] = s.path[s.wp];
        goal = new THREE.Vector3(tx, 0, tz); speed = 1.5;
        if (Math.hypot(tx - s.pos.x, tz - s.pos.z) < 0.3) s.wp = (s.wp + 1) % s.path.length;
        if (sees) { s.state = 'alert'; s.t = 0.5; spotted(); }
        break;
      }
      case 'alert':
        s.yaw += clampA(angleTo(s.yaw, Math.atan2(dirP.x, dirP.z)), 8 * dt);
        if (s.t <= 0) s.state = 'chase';
        break;
      case 'chase':
        if (sees) s.lost = 0; else s.lost += dt;
        goal = player.pos.clone().setY(0); speed = 3.9;
        if (dist < 1.6 && !invisible()) { s.state = 'windup'; s.t = 0.45; }
        if (s.lost > 2.5) s.state = 'return';
        break;
      case 'windup':
        s.yaw += clampA(angleTo(s.yaw, Math.atan2(dirP.x, dirP.z)), 6 * dt);
        if (s.t <= 0) {
          if (dist < 2.1 && !invisible()) api.damagePlayer(1, s.pos);
          sfx.swing();
          s.state = 'recover'; s.t = 0.7;
        }
        break;
      case 'recover':
        if (s.t <= 0) s.state = 'chase';
        break;
      case 'return': {
        const [tx, tz] = s.path[s.wp];
        goal = new THREE.Vector3(tx, 0, tz); speed = 1.9;
        if (Math.hypot(tx - s.pos.x, tz - s.pos.z) < 0.4) s.state = 'patrol';
        if (sees) { s.state = 'alert'; s.t = 0.4; }
        break;
      }
    }
    if (goal && speed) {
      const d = goal.sub(s.pos).setY(0);
      if (d.length() > 0.05) {
        d.normalize();
        s.yaw += clampA(angleTo(s.yaw, Math.atan2(d.x, d.z)), 6 * dt);
        s.pos.addScaledVector(d, speed * dt);
      }
    }
    s.pos.addScaledVector(s.knock, dt);
    s.knock.multiplyScalar(Math.pow(0.02, dt));
    api.collide(s.pos, 0.4, 1.8);
    for (const o of skeletons) {
      if (o === s || o.state === 'collapsed') continue;
      const d = s.pos.distanceTo(o.pos);
      if (d < 1 && d > 0.001) s.pos.addScaledVector(tmp.subVectors(s.pos, o.pos).normalize(), (1 - d) * 0.5);
    }
    s.mesh.position.copy(s.pos);
    s.mesh.rotation.y = s.yaw;
    const moving = speed > 0;
    if (moving) s.walk += dt * (speed > 3 ? 11 : 7);
    const sw = moving ? Math.sin(s.walk) * 0.6 : 0;
    u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
    u.legL.userData.lower.rotation.x = Math.max(0, sw) * 1.1; u.legR.userData.lower.rotation.x = Math.max(0, -sw) * 1.1;
    u.armL.rotation.x = -sw * 0.5;
    u.armR.rotation.x = s.state === 'windup' ? -2.4 : s.state === 'recover' ? 0.4 : sw * 0.5;
    const hunting = s.state !== 'patrol' && s.state !== 'return';
    s.cone.material.color.setHex(hunting ? 0xff3020 : 0xffd060);
    s.cone.material.opacity = hunting ? 0.16 : 0.1;
    u.eye.emissiveIntensity = hunting ? 4 : 1.5;
    const g = W().rooms.garden;
    s.pos.x = Math.max(g[0] + 0.5, Math.min(g[2] - 0.5, s.pos.x));
    s.pos.z = Math.max(g[1] + 0.5, Math.min(g[3] - 0.5, s.pos.z));
  }
  function hitSkeleton(s, dmg, dir, src) {
    if (s.state === 'collapsed') return;
    s.hp -= dmg;
    s.knock.copy(dir).setY(0).normalize().multiplyScalar(7);
    sfx.hit();
    if (s.state === 'patrol' || s.state === 'return') { s.state = 'alert'; s.t = 0.3; if (!invisible()) spotted(); }
    if (s.hp <= 0) {
      s.state = 'collapsed';
      s.t = 10;
      s.mesh.visible = false;
      s.pile.position.set(s.pos.x, 0, s.pos.z);
      s.pile.visible = true;
      api.killEffect(s.pos, 0xd9cfb2);
      const f = F();
      if (!f['skel_' + s.i]) { f['skel_' + s.i] = true; api.addScore(POINTS.myrmex, 'kostlivec', 'monster'); api.bowBonus(src); }
    }
  }

  // ---------- Sisyfos ----------
  function placeSisyphus(dt) {
    const w = W();
    const u = w.sisyphus.userData;
    if (F().sisyphusDone) {
      const x = 37.8;
      w.boulder.position.set(x, w.rampY(x) + 1.32, 54);
      w.sisHolder.position.set(29.6, 0, 58.6);
      w.sisHolder.rotation.y = -Math.PI / 2 + 0.6;
      w.sisyphus.rotation.x = 0;
      w.sisyphus.position.y = -0.72;
      for (const l of [u.legL, u.legR]) { l.rotation.x = -Math.PI / 2; l.userData.lower.rotation.x = 0.15; }
      for (const a of [u.armL, u.armR]) { a.rotation.x = -0.3; a.userData.lower.rotation.x = -0.4; }
      return;
    }
    sisT = (sisT + dt) % 13;
    let bx, sx, up = true;
    if (sisT < 9) { const s = sisT / 9; bx = 29.6 + s * 8.2; sx = bx - 1.75; } else if (sisT < 9.8) { bx = 37.8; sx = bx - 1.75; } else {
      up = false;
      const k = Math.min(1, (sisT - 9.8) / 2.2);
      bx = 37.8 - k * k * 8.2;
      const ks = (sisT - 9.8) / 3.2;
      sx = 36.05 - ks * (36.05 - 27.85);
    }
    w.boulder.position.set(bx, w.rampY(bx) + 1.32, 54);
    w.boulder.rotation.z = -bx / 1.3;
    w.sisHolder.position.set(sx, w.rampY(sx), 54);
    w.sisHolder.rotation.y = up ? Math.PI / 2 : -Math.PI / 2;
    w.sisyphus.position.y = 0;
    w.sisyphus.rotation.x = up ? 0.5 : 0.12;
    const walk = sisT * (up ? 4 : 6);
    const sw = Math.sin(walk) * 0.5;
    u.legL.rotation.x = sw - (up ? 0.3 : 0); u.legR.rotation.x = -sw - (up ? 0.3 : 0);
    u.legL.userData.lower.rotation.x = Math.max(0, sw) + (up ? 0.3 : 0); u.legR.userData.lower.rotation.x = Math.max(0, -sw) + (up ? 0.3 : 0);
    for (const a of [u.armL, u.armR]) { a.rotation.x = up ? -1.45 : -sw * 0.6; a.userData.lower.rotation.x = up ? -0.25 : -0.2; }
  }
  function solveSisyphus() {
    const f = F();
    f.sisyphusDone = true;
    sfx.correct();
    api.puzzleSolved('dial');
    W().dialInt.enabled = false;
    api.spawnItem('helm', W().itemSpots.helm);
    api.openDoor(W().gardenGate);
    W().gardenGateInt.enabled = false;
    api.shake(0.6);
    placeSisyphus(0);
    ui.toast(GARDEN.gateOpen, 6500);
    api.refreshHUD();
    api.save();
  }

  // ---------- rozhovory a hádanky ----------
  function searchUrn(id) {
    const f = F();
    api.openPanel();
    api.puzzleStart('urns');
    const u = URNS[id];
    const npc = { name: u.name, text: u.text, options: f.hasObol || f.paidCharon ? [] : [{ label: URN_TEXT.search }] };
    ui.showNPC(npc, () => {
      npc.options = [];
      if (f.hasObol || f.paidCharon) return URN_TEXT.empty;
      if (id === URN_OBOL) {
        f.hasObol = true;
        api.addItem('obol');
        sfx.pickup();
        api.puzzleSolved('urns');
        api.refreshHUD();
        api.save();
        return URN_TEXT.right;
      }
      sfx.wrong();
      api.puzzleWrong('urns');
      api.damagePlayer(1, null);
      if (api.mode === 'dead') return '';
      return URN_TEXT.wrong;
    }, api.panelClosed);
  }

  function talkCharon(toFar) {
    const f = F();
    if (ride) return;
    if (f.paidCharon) { ui.toast(CHARON.back, 2500); startRide(toFar); return; }
    api.openPanel();
    const npc = { ...CHARON, options: CHARON.options.slice() };
    ui.showNPC(npc, (opt) => {
      if (opt.act !== 'ride') return opt.reply;
      if (!api.hasItem('obol')) return CHARON.noObol;
      api.removeItem('obol');
      f.paidCharon = true;
      npc.options = [];
      api.refreshHUD();
      api.save();
      setTimeout(() => { if (ui.panelOpen()) ui.closePanel(); startRide(true); }, 1600);
      return CHARON.paid;
    }, api.panelClosed);
  }

  function talkTantalus() {
    const f = F();
    if (f.tantalusDone) { ui.toast(TANTALUS.already, 4000); return; }
    api.openPanel();
    api.puzzleStart('tantalus');
    ui.showRiddle({
      title: TANTALUS.name, intro: TANTALUS.greet, question: TANTALUS.question, hint: TANTALUS.hint,
      allowHint: api.parent.id === 'athena', onHint: api.useHint,
      onSubmit(text, voice, peak) {
        if (matches(text, TANTALUS.answers)) {
          f.tantalusDone = true;
          sfx.correct();
          api.puzzleSolved('tantalus');
          api.journalAdd('tantalus');
          api.addItem('ambrosia');
          api.refreshHUD();
          api.save();
          setTimeout(() => { api.openPanel(); ui.showNPC({ name: TANTALUS.name, text: TANTALUS.done + ' (Zapsáno do deníku, klávesa J.)', options: [] }, null, api.panelClosed); }, 60);
          return { close: true };
        }
        sfx.wrong();
        api.puzzleWrong('tantalus');
        if (voice && peak >= api.SHOUT_LEVEL) return { ok: false, message: TANTALUS.shout + ' ' + TANTALUS.hint };
        return { ok: false, message: TANTALUS.wrong };
      },
    }, api.panelClosed);
  }

  function talkSisyphus() {
    const f = F();
    api.openPanel();
    if (f.sisyphusDone) { ui.showNPC({ name: SISYPHUS.name, text: SISYPHUS.done, options: [] }, null, api.panelClosed); return; }
    ui.showNPC(SISYPHUS, (opt) => {
      if (opt.journal) api.journalAdd('sisyphus');
      return opt.reply;
    }, api.panelClosed);
  }

  function useDial() {
    if (F().sisyphusDone) return;
    api.openPanel();
    api.puzzleStart('dial');
    ui.showDial((code) => {
      if (code.join() === DIAL.solution.join()) { solveSisyphus(); return true; }
      sfx.wrong();
      api.puzzleWrong('dial');
      return false;
    }, api.panelClosed, { title: DIAL.title, letters: DIAL.digits, n: 3, text: DIAL.text, wrong: DIAL.wrong, button: 'Zatlačit na pečeť', greek: false });
  }

  function talkPersephone() {
    const f = F();
    api.openPanel();
    const decided = !!f.pomegranate;
    const npc = { name: PERSEPHONE.name, text: decided ? PERSEPHONE.decided : PERSEPHONE.text, options: decided ? [PERSEPHONE.who] : [PERSEPHONE.eat, PERSEPHONE.refuse, PERSEPHONE.who] };
    ui.showNPC(npc, (opt) => {
      if (opt === PERSEPHONE.eat || opt === PERSEPHONE.refuse) {
        if (f.pomegranate) return PERSEPHONE.decided;
        const ate = opt === PERSEPHONE.eat;
        f.pomegranate = ate ? 'ate' : 'refused';
        if (ate) api.addScore(-200, 'snědené jablko', 'mistake');
        else api.addScore(150, 'moudré odmítnutí', 'puzzle');
        openPalace();
        npc.options = [PERSEPHONE.who];
      }
      return opt.reply;
    }, api.panelClosed);
  }
  function openPalace() {
    const f = F();
    f.palaceOpen = true;
    api.openDoor(W().palaceDoor);
    W().interactables.find((i) => i.id === 'palaceDoor').enabled = false;
    api.refreshHUD();
    api.save();
  }

  function talkHades() {
    const f = F();
    if (f.hadesDone) { ui.toast(HADES.already, 4000); return; }
    let returned = '';
    if (!f.helmReturned) {
      if (!api.hasItem('helm')) { ui.toast(HADES.noHelm, 4000); return; }
      endInvisibility(false);
      api.removeItem('helm');
      f.helmReturned = true;
      returned = ' (' + HELM.given + ')';
      api.save();
    }
    api.openPanel();
    const stage = f.hadesStage || 0;
    api.puzzleStart('hades' + stage);
    ui.showRiddle({
      title: `Hádés (${stage + 1}/3)`,
      intro: HADES.greet + (f.pomegranate === 'ate' ? ' ' + HADES.ate : '') + returned,
      question: HADES.questions[stage].q,
      hint: HADES.questions[stage].hint,
      allowHint: api.parent.id === 'athena',
      onHint: api.useHint,
      onSubmit(text, voice, peak) {
        const st = f.hadesStage || 0;
        const q = HADES.questions[st];
        if (matches(text, q.a)) {
          sfx.correct();
          api.puzzleSolved('hades' + st);
          if (st < 2) {
            f.hadesStage = st + 1;
            api.puzzleStart('hades' + (st + 1));
            api.save();
            const nq = HADES.questions[st + 1];
            return { ok: true, title: `Hádés (${st + 2}/3)`, message: HADES.correct[st], question: nq.q, hint: nq.hint };
          }
          f.hadesDone = true;
          api.openDoor(W().exitDoor);
          sfx.victory();
          api.refreshHUD();
          api.save();
          setTimeout(() => { api.openPanel(); ui.showNPC({ name: 'Hádés', text: HADES.done, options: [] }, null, api.panelClosed); }, 60);
          return { close: true };
        }
        sfx.wrong();
        api.puzzleWrong('hades' + st);
        if (voice && peak >= api.SHOUT_LEVEL) return { ok: false, message: HADES.shout + ' ' + q.hint };
        return { ok: false, message: HADES.wrong };
      },
    }, api.panelClosed);
  }

  function setDoor(d, open) {
    d.collider.active = !open;
    d.mesh.visible = !open;
    d.mesh.position.y = d.baseY;
  }

  // ---------- rozhraní questu ----------
  return {
    id: 'hades',
    title: 'Hádův palác',
    startLabel: 'Sestoupit do podsvětí',
    bossName: 'KERBEROS',
    intro: INTRO,
    items: ITEMS,
    journal: JOURNAL,
    wanderers: WANDERERS,
    curiosities: CURIOSITIES,
    hintIds: ['urns', 'rivers', 'cerberus', 'judges'],
    decor: DECOR,
    objective,
    timeLimit: POINTS.timeLimit,

    setup() {
      const f = F();
      const w = W();
      const S = w.itemSpots;
      api.spawnItem('bow', S.bow);
      api.spawnItem('ball', S.ball);
      for (const k of ['ambrosia1', 'ambrosia2', 'ambrosia3']) api.spawnItem('ambrosia', S[k], k);
      for (const k of ['quiver1', 'quiver2', 'quiver3', 'quiver4']) api.spawnItem('quiver', S[k], k);
      if (f.sisyphusDone && !f.taken_helm) api.spawnItem('helm', S.helm);
      setDoor(w.cerGate, !!f.cerberusDone);
      setDoor(w.gardenGate, !!f.sisyphusDone);
      setDoor(w.palaceDoor, !!f.palaceOpen);
      setDoor(w.exitDoor, !!f.hadesDone);
      w.gardenGateInt.enabled = !f.sisyphusDone;
      w.interactables.find((i) => i.id === 'palaceDoor').enabled = !f.palaceOpen;
      w.dialInt.enabled = !f.sisyphusDone;
      ride = null;
      w.river.active = true;
      setBoat(!!f.boatFar);
      createCerberus();
      createSkeletons();
      removeBall();
      endInvisibility(false);
      helm.shown = '-';
      sisT = 0;
      placeSisyphus(0);
    },
    clear() {
      if (cer) scene.remove(cer.mesh);
      cer = null;
      skeletons.forEach((s) => { scene.remove(s.mesh); scene.remove(s.pile); });
      skeletons = [];
      removeBall();
      endInvisibility(false);
      ride = null;
      ui.setHelm(null);
    },
    refreshHUD() { helm.shown = '-'; helmHUD(); },
    pickUp(it) {
      const f = F();
      switch (it.item) {
        case 'ball': api.addItem('ball'); ui.toast('Červený gumový míček! Komu ho asi hodit? Vyber ho číslem a použij klávesou F.', 4500); break;
        case 'helm':
          f.hasHelm = true;
          api.addItem('helm');
          ui.toast('Máš Hádův helm temnoty! Klávesou R se na 6 sekund zneviditelníš. Pak se 10 sekund nabíjí.', 6000);
          break;
      }
    },
    interact(it) {
      const f = F();
      if (URNS[it.id]) { searchUrn(it.id); return; }
      switch (it.id) {
        case 'charon': talkCharon(true); break;
        case 'charonBack': talkCharon(false); break;
        case 'gardenGate': ui.toast(GARDEN.gateLocked, 5000); break;
        case 'palaceDoor': if (!f.palaceOpen) ui.toast(PALACE.locked, 4000); break;
        case 'tantalus': talkTantalus(); break;
        case 'sisyphus': talkSisyphus(); break;
        case 'dial': useDial(); break;
        case 'persephone': talkPersephone(); break;
        case 'hades': talkHades(); break;
      }
    },
    targets() {
      const list = [];
      if (cer && (cer.state === 'awake' || cer.state === 'distracted')) {
        for (const h of cer.heads) {
          if (h.state === 'out') continue;
          const p = headWorld(h);
          list.push({ e: h, pos: p.clone().setY(0), r: 0.9, y: p.y, hit: (d, dir, src) => hitHead(h, d, src) });
        }
      }
      for (const s of skeletons) if (s.state !== 'collapsed') list.push({ e: s, pos: s.pos, r: 0.5, y: 1.1, hit: (d, dir, src) => hitSkeleton(s, d, dir, src) });
      return list;
    },
    resetAfterDeath() {
      resetCerberus();
      if (cer && cer.state !== 'asleep') ui.setBoss(null);
      skeletons.forEach(resetSkeleton);
      ride = null;
      W().river.active = true;
      setBoat(!!F().boatFar);
      endInvisibility(false);
    },
    checkpoint(p) {
      const R = W().rooms;
      const f = F();
      if (api.inRect(p, R.throne)) return 'throne';
      if (api.inRect(p, R.garden)) return 'garden';
      if (api.inRect(p, R.tartarus)) return 'tartarus';
      if (api.inRect(p, R.asphodel)) return 'asphodel';
      if (api.inRect(p, R.court) || (api.inRect(p, R.styx) && p.z > 20.5)) return 'cerberus';
      if (api.inRect(p, R.styx) && p.z < 9.5 && !f.paidCharon) return 'shore';
      return null;
    },
    isWin: (p) => p.z > 121 && !!F().hadesDone,
    fighting() {
      if (cer && (cer.state === 'awake' || cer.state === 'distracted')) return true;
      return skeletons.some((s) => s.state === 'alert' || s.state === 'chase' || s.state === 'windup' || s.state === 'recover');
    },
    update(dt, time) {
      updateRide(dt);
      updateCerberus(dt, time);
      updateBall(dt);
      for (const s of skeletons) updateSkeleton(s, dt, time);
      const f = F();
      if (!f.throneReached && api.inRect(player.pos, W().rooms.throne)) {
        f.throneReached = true;
        if (!f.gardenSpotted) { api.addScore(150, 'nepozorovaně', 'discover'); ui.toast(GARDEN.sneak, 4000); }
        api.save();
      }
    },
    updateAlways(dt) {
      if (helm.t > 0) {
        helm.t -= dt;
        if (helm.t <= 0) { helm.t = 0; api.setPlayerGhost(false); helm.cd = HELM_COOLDOWN; ui.toast(HELM.off, 1500); }
      } else if (helm.cd > 0) helm.cd = Math.max(0, helm.cd - dt);
      placeSisyphus(dt);
      helmHUD();
    },
    onKey(code) {
      if (code === 'KeyR') { activateHelm(); return true; }
      return false;
    },
    useItem(id) {
      if (id === 'ball') { throwBall(); return true; }
      if (id === 'helm') { activateHelm(); return true; }
      return false;
    },
    // pro testy
    debug: { cer: () => cer, skeletons: () => skeletons, helm, ride: () => ride, solveSisyphus },
  };
}
