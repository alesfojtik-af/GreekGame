// DOM rozhraní: HUD, rozhovory, hádanky, zámky, inventář, body, síň slávy.
import { ITEMS, SYMBOLS, DIAL_LETTERS, CONTROLS } from './content.js';
import { listen, speechSupported } from './speech.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let onClose = null;

export function panelOpen() {
  return !$('panel').classList.contains('hidden');
}

function openPanel(html, closeCb) {
  const p = $('panel');
  p.innerHTML = html;
  p.classList.remove('hidden');
  onClose = closeCb;
}

export function closePanel() {
  $('panel').classList.add('hidden');
  $('panel').innerHTML = '';
  const cb = onClose;
  onClose = null;
  if (cb) cb();
}

// ---------- rozhovor s postavou ----------
export function showNPC(npc, onOption, closeCb) {
  const render = (text) => {
    openPanel(`
      <div class="npc-name">${esc(npc.name)}</div>
      <div class="npc-text">${esc(text)}</div>
      <div class="options">
        ${npc.options.map((o, i) => `<button data-i="${i}">${esc(o.label)}</button>`).join('')}
        <button data-i="-1" class="leave">Odejít [Esc]</button>
      </div>`, closeCb);
    $('panel').querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        const i = +b.dataset.i;
        if (i < 0) return closePanel();
        const reply = onOption ? onOption(npc.options[i]) : npc.options[i].reply;
        render(reply);
      };
    });
  };
  render(npc.text);
}

// ---------- hádanka s odpovědí psaním nebo hlasem ----------
// cfg: { title, intro, question, hint, allowHint, onHint(), onSubmit(text, voice, peak) => {ok, message, question?, hint?, close?} }
export function showRiddle(cfg, closeCb) {
  let hintUsed = false;
  let question = cfg.question;
  let hint = cfg.hint;
  let title = cfg.title;
  let feedback = cfg.intro || '';
  let feedbackClass = '';

  const render = () => {
    openPanel(`
      <div class="npc-name">${esc(title)}</div>
      ${feedback ? `<div class="feedback ${feedbackClass}">${esc(feedback)}</div>` : ''}
      <div class="question">${esc(question)}</div>
      <div class="answer-row">
        <input id="ans" type="text" autocomplete="off" placeholder="Napiš odpověď a stiskni Enter" />
        <button id="send">Odpovědět</button>
        <button id="mic" ${speechSupported ? '' : 'disabled title="Diktování podporuje Chrome nebo Edge"'}>🎤 Nadiktovat</button>
      </div>
      <div id="micstate" class="micstate"></div>
      <div class="options">
        ${cfg.allowHint ? `<button id="hint" ${hintUsed ? 'disabled' : ''}>🦉 Nápověda od Athény (−100 bodů)</button>` : ''}
        <button id="leave" class="leave">Odejít [Esc]</button>
      </div>`, closeCb);
    const input = $('ans');
    setTimeout(() => input.focus(), 30);
    const submit = (text, voice = false, peak = 0) => {
      if (!text.trim()) return;
      const r = cfg.onSubmit(text, voice, peak);
      if (r.close) { closePanel(); return; }
      feedback = r.message || '';
      feedbackClass = r.ok ? 'ok' : 'bad';
      if (r.title) title = r.title;
      if (r.question) { question = r.question; hint = r.hint; hintUsed = false; }
      render();
    };
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') submit(input.value);
      if (e.key === 'Escape') closePanel();
    };
    $('send').onclick = () => submit(input.value);
    $('leave').onclick = () => closePanel();
    if ($('hint')) $('hint').onclick = () => { hintUsed = true; if (cfg.onHint) cfg.onHint(); feedback = 'Athéna šeptá: ' + hint; feedbackClass = ''; render(); };
    $('mic').onclick = async () => {
      const st = $('micstate');
      st.textContent = '🎙️ Poslouchám... mluv česky.';
      $('mic').disabled = true;
      try {
        const res = await listen((t) => { input.value = t; });
        input.value = res.text;
        if (!res.text) { st.textContent = 'Nic jsem nerozuměl. Zkus to znovu.'; $('mic').disabled = false; return; }
        submit([res.text, ...res.alts].join(' | '), true, res.peak);
      } catch (err) {
        st.textContent = err.message;
        $('mic').disabled = false;
      }
    };
  };
  render();
}

// ---------- symbolový zámek ----------
export function showLock(available, onTry, closeCb) {
  let seq = [];
  let msg = available.length < 4
    ? 'Na dveřích jsou čtyři prázdná pole, ale máš jen tři symboly. Čtvrtá destička chybí.'
    : 'Na dveřích jsou čtyři prázdná pole. Vlož symboly ve správném pořadí.';
  const render = () => {
    openPanel(`
      <div class="npc-name">Symbolový zámek</div>
      <div class="npc-text">${esc(msg)}</div>
      <div class="slots">${[0, 1, 2, 3].map((i) => `<div class="slot">${seq[i] ? SYMBOLS.find((s) => s.id === seq[i]).icon : ''}</div>`).join('')}</div>
      <div class="options">
        ${SYMBOLS.map((s) => `<button data-s="${s.id}" ${!available.includes(s.id) || seq.includes(s.id) || seq.length >= 4 ? 'disabled' : ''}>${s.icon} ${s.name}${available.includes(s.id) ? '' : ' (chybí)'}</button>`).join('')}
      </div>
      <div class="options">
        <button id="clear">Vymazat</button>
        <button id="try" ${seq.length < 4 ? 'disabled' : ''}>Otočit klíčem</button>
        <button id="leave" class="leave">Odejít [Esc]</button>
      </div>`, closeCb);
    $('panel').querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { seq.push(b.dataset.s); render(); }; });
    $('clear').onclick = () => { seq = []; render(); };
    $('leave').onclick = () => closePanel();
    $('try').onclick = () => {
      if (onTry(seq)) { closePanel(); return; }
      msg = 'Zámek cvakne a symboly vyskočí zpět. Špatné pořadí.';
      seq = [];
      render();
    };
  };
  render();
}

// ---------- číselník Daidalovy skříně (řecká písmena) ----------
export function showDial(onTry, closeCb) {
  const pos = [0, 0, 0, 0];
  let msg = 'Na skříni jsou čtyři kolečka s řeckými písmeny. Nad nimi je vyryto Δ.';
  const render = () => {
    openPanel(`
      <div class="npc-name">Daidalova skříň</div>
      <div class="npc-text">${esc(msg)}</div>
      <div class="slots">${pos.map((p, i) => `
        <div class="wheel">
          <button data-up="${i}" aria-label="Další písmeno">▲</button>
          <div class="slot greek">${DIAL_LETTERS[p]}</div>
          <button data-down="${i}" aria-label="Předchozí písmeno">▼</button>
        </div>`).join('')}</div>
      <div class="options">
        <button id="try">Zatáhnout za kliku</button>
        <button id="leave" class="leave">Odejít [Esc]</button>
      </div>`, closeCb);
    const n = DIAL_LETTERS.length;
    $('panel').querySelectorAll('[data-up]').forEach((b) => { b.onclick = () => { pos[+b.dataset.up] = (pos[+b.dataset.up] + 1) % n; render(); }; });
    $('panel').querySelectorAll('[data-down]').forEach((b) => { b.onclick = () => { pos[+b.dataset.down] = (pos[+b.dataset.down] + n - 1) % n; render(); }; });
    $('leave').onclick = () => closePanel();
    $('try').onclick = () => {
      if (onTry(pos.map((p) => DIAL_LETTERS[p]))) { closePanel(); return; }
      msg = 'Klika se ani nehne. Špatný kód.';
      render();
    };
  };
  render();
}

// ---------- HUD ----------
let toastTimer = 0;
export function toast(text, ms = 4000) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

let speechTimer = 0;
export function speech(who, text, ms = 3200) {
  const s = $('speech');
  s.innerHTML = `<b>${esc(who)}:</b> ${esc(text)}`;
  s.classList.add('show');
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => s.classList.remove('show'), ms);
}
export function hideSpeech() { $('speech').classList.remove('show'); }

export function popup(points, label) {
  const el = document.createElement('div');
  el.className = 'popup ' + (points >= 0 ? 'plus' : 'minus');
  el.textContent = `${points >= 0 ? '+' : ''}${points} ${label}`;
  $('popups').appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

export function setHearts(hp, max) {
  let s = '';
  for (let i = 0; i < max; i++) s += i < hp ? '❤️' : '🖤';
  $('hearts').textContent = s;
}
export function setScore(n) { $('score').textContent = `★ ${n}`; }
export function setArrows(n, hasBow) {
  const a = $('arrows');
  a.classList.toggle('hidden', !hasBow);
  a.textContent = `🏹 ${n}`;
}
export function setObjective(text) { $('objective').textContent = text; }

export function setPrompt(text) {
  const p = $('prompt');
  if (text) { p.textContent = text; p.classList.remove('hidden'); } else p.classList.add('hidden');
}

export function setInventory(inv, selected) {
  $('inventory').innerHTML = inv.map((it, i) => {
    const d = ITEMS[it.id];
    return `<div class="slot-inv ${i === selected ? 'sel' : ''}" title="${esc(d.name + ': ' + d.desc)}"><i>${i + 1}</i>${d.icon}${it.count > 1 ? `<span>${it.count}</span>` : ''}<em>${esc(d.name)}</em></div>`;
  }).join('');
  const cur = inv[selected];
  $('invhint').textContent = cur ? `${ITEMS[cur.id].name}: ${ITEMS[cur.id].desc}` : 'Inventář je prázdný.';
}

export function renderControls() {
  const html = CONTROLS.map(([k, v]) => `<kbd>${esc(k)}</kbd><span>${esc(v)}</span>`).join('');
  $('controlsHud').innerHTML = html;
  $('controlsMenu').innerHTML = html;
  $('controlsPause').innerHTML = html;
}

export function setTimer(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  $('timer').textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
}

export function setBoss(frac) {
  const b = $('boss');
  if (frac === null) { b.classList.add('hidden'); return; }
  b.classList.remove('hidden');
  $('bossfill').style.width = Math.max(0, frac * 100) + '%';
}

export function flash(color = 'rgba(200,0,0,0.35)') {
  const f = $('flash');
  f.style.background = color;
  f.style.opacity = 1;
  setTimeout(() => { f.style.opacity = 0; }, 120);
}

export function showOverlay(id) {
  document.querySelectorAll('.overlay').forEach((o) => o.classList.add('hidden'));
  if (id) $(id).classList.remove('hidden');
}

const fmtTime = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

// Síň slávy: tabulka nejlepších.
export function renderLeaderboard(el, rows, highlightId, sourceNote) {
  if (!rows.length) {
    el.innerHTML = `<p class="muted">Zatím nikdo neunikl. Buď první!</p><p class="muted small">${esc(sourceNote)}</p>`;
    return;
  }
  el.innerHTML = `
    <table class="lb">
      <thead><tr><th>#</th><th>Hráč</th><th>Body</th><th>Čas</th><th>Smrti</th><th>Rodič</th></tr></thead>
      <tbody>${rows.map((r, i) => `
        <tr class="${r.id === highlightId ? 'me' : ''}">
          <td>${i + 1}</td><td>${esc(r.name)}</td><td>${Number(r.score) || 0}</td><td>${fmtTime(Number(r.time) || 0)}</td><td>${Number(r.deaths) || 0}</td><td>${esc(r.parentIcon || '')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p class="muted small">${esc(sourceNote)}</p>`;
}
