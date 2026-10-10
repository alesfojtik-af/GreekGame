// DOM rozhraní: HUD, rozhovory, hádanky, symbolový zámek, hlášky.
import { ITEMS, SYMBOLS } from './content.js';
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

// ---------- rozhovor s NPC ----------
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
// cfg: { title, intro, question, hint, allowHint, onSubmit(text, voice, peak) => {ok, message, question?, close?, hint?} }
export function showRiddle(cfg, closeCb) {
  let hintUsed = false;
  let question = cfg.question;
  let hint = cfg.hint;
  let feedback = cfg.intro || '';
  let feedbackClass = '';

  const render = () => {
    openPanel(`
      <div class="npc-name">${esc(cfg.title)}</div>
      ${feedback ? `<div class="feedback ${feedbackClass}">${esc(feedback)}</div>` : ''}
      <div class="question">${esc(question)}</div>
      <div class="answer-row">
        <input id="ans" type="text" autocomplete="off" placeholder="Napiš odpověď a stiskni Enter" />
        <button id="send">Odpovědět</button>
        <button id="mic" ${speechSupported ? '' : 'disabled title="Diktování podporuje Chrome nebo Edge"'}>🎤 Nadiktovat</button>
      </div>
      <div id="micstate" class="micstate"></div>
      <div class="options">
        ${cfg.allowHint ? `<button id="hint" ${hintUsed ? 'disabled' : ''}>🦉 Nápověda od Athény</button>` : ''}
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
    if ($('hint')) $('hint').onclick = () => { hintUsed = true; feedback = 'Athéna šeptá: ' + hint; feedbackClass = ''; render(); };
    $('mic').onclick = async () => {
      const st = $('micstate');
      st.textContent = '🎙️ Poslouchám... mluv česky.';
      $('mic').disabled = true;
      try {
        const res = await listen((t) => { input.value = t; });
        input.value = res.text;
        if (!res.text) { st.textContent = 'Nic jsem nerozuměl. Zkus to znovu.'; $('mic').disabled = false; return; }
        // zkusíme všechny alternativy rozpoznávání, aby čeština s řeckými jmény prošla
        const text = [res.text, ...res.alts].join(' | ');
        submit(text, true, res.peak);
      } catch (err) {
        st.textContent = err.message;
        $('mic').disabled = false;
      }
    };
  };
  render();
}

// ---------- symbolový zámek ----------
export function showLock(onTry, closeCb) {
  let seq = [];
  let msg = 'Na dveřích jsou čtyři prázdná pole. Vlož symboly ve správném pořadí.';
  const render = () => {
    openPanel(`
      <div class="npc-name">Symbolový zámek</div>
      <div class="npc-text">${esc(msg)}</div>
      <div class="slots">${[0, 1, 2, 3].map((i) => `<div class="slot">${seq[i] ? SYMBOLS.find((s) => s.id === seq[i]).icon : ''}</div>`).join('')}</div>
      <div class="options">
        ${SYMBOLS.map((s) => `<button data-s="${s.id}" ${seq.includes(s.id) || seq.length >= 4 ? 'disabled' : ''}>${s.icon} ${s.name}</button>`).join('')}
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

// ---------- HUD ----------
let toastTimer = 0;
export function toast(text, ms = 3500) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export function setHearts(hp, max) {
  let s = '';
  for (let i = 0; i < max; i++) s += i < hp ? '❤️' : '🖤';
  $('hearts').textContent = s;
}

export function setObjective(text) { $('objective').textContent = 'Úkol: ' + text; }

export function setPrompt(text) {
  const p = $('prompt');
  if (text) { p.textContent = text; p.classList.remove('hidden'); } else p.classList.add('hidden');
}

export function setInventory(inv) {
  $('inventory').innerHTML = inv.map((it) => {
    const d = ITEMS[it.id];
    return `<div class="slot-inv" title="${esc(d.name + ': ' + d.desc)}">${d.icon}${it.count > 1 ? `<span>${it.count}</span>` : ''}<em>${esc(d.name)}</em></div>`;
  }).join('');
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
