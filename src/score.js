// Body a síň slávy. Na odkazu claude.ai se tabulka sdílí přes úložiště artefaktu,
// ve stažené verzi zůstává jen v tomto prohlížeči.

// Každý quest má vlastní tabulku: kolekci v úložišti artefaktu a místní klíč.
const BOARDS = {
  labyrint: { collection: 'scores', local: 'labyrint-leaderboard-v1' },
  hades: { collection: 'scores_hades', local: 'labyrint-leaderboard-hades-v1' },
};
let board = BOARDS.labyrint;
export function setBoard(quest) { board = BOARDS[quest] || BOARDS.labyrint; }
let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = (window.claude && typeof window.claude.use === 'function')
      ? window.claude.use('db').catch(() => null)
      : Promise.resolve(null);
  }
  return dbPromise;
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(board.local)) || []; } catch (e) { return []; }
}
function writeLocal(rows) {
  try { localStorage.setItem(board.local, JSON.stringify(rows.slice(0, 50))); } catch (e) { /* bez úložiště */ }
}

const sortRows = (rows) => rows.sort((a, b) => b.score - a.score || a.time - b.time);

// Vrací { rows, shared } – nejlepších 10 výsledků.
export async function loadLeaderboard() {
  const db = await getDb();
  if (db) {
    try {
      const snap = await db.collection(board.collection).orderBy('score', 'desc').limit(10).get();
      return { rows: sortRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), shared: true };
    } catch (e) { /* spadneme na místní tabulku */ }
  }
  return { rows: sortRows(readLocal()).slice(0, 10), shared: false };
}

// Uloží výsledek. Vrací { id, row, shared }: id slouží ke zvýraznění v tabulce,
// shared říká, jestli se zápis do společné tabulky povedl.
export async function submitScore(entry) {
  const db = await getDb();
  const row = { ...entry, at: new Date().toISOString() };
  if (db) {
    try {
      const ref = await db.collection(board.collection).add(row);
      return { id: ref.id, row: { id: ref.id, ...row }, shared: true };
    } catch (e) { /* např. odkaz jen pro čtení: uložíme aspoň místně */ }
  }
  const id = 'local-' + Date.now();
  const rows = readLocal();
  rows.push({ id, ...row });
  writeLocal(sortRows(rows));
  return { id, row: { id, ...row }, shared: false };
}

// Když se zápis do společné tabulky nepovedl, ukážeme hráče aspoň v ní.
export function withOwnRow(lb, sub) {
  if (!lb.shared || sub.shared) return { rows: lb.rows, note: sourceNote(lb.shared) };
  const rows = sortRows([...lb.rows, sub.row]).slice(0, 10);
  return { rows, note: 'Tvůj výsledek se do společné tabulky nezapsal (k odkazu máš jen právo čtení), uložil se v tomto prohlížeči.' };
}

export function sourceNote(shared) {
  return shared
    ? 'Společná tabulka pro všechny, kdo hrají přes tento odkaz.'
    : 'Tabulka uložená jen v tomto prohlížeči.';
}
