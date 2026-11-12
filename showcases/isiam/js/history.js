// ==========================================================================
// Historique des résultats, propre à l'appareil (localStorage).
// ==========================================================================

const KEY = 'isiam.resultats';
const MAX = 2000;
const DETAIL_KEEP = 5; // corrections détaillées conservées par quiz (les plus récentes)

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const groupKey = (a) => (a.kind === 'matiere' ? `m:${a.matiereId}` : `q:${a.quizId}`);

/** Ne garde la correction détaillée que pour les dernières tentatives de chaque quiz. */
function trimDetails(list) {
  const seen = new Map();
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    if (!a.detail) continue;
    const k = groupKey(a);
    const n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    if (n > DETAIL_KEEP) delete a.detail;
  }
  return list;
}

function write(list) {
  let l = trimDetails(list.slice(-MAX));
  for (;;) {
    try {
      localStorage.setItem(KEY, JSON.stringify(l));
      return true;
    } catch {
      // Stockage plein : on retire les corrections les plus anciennes et on réessaie.
      const i = l.findIndex((a) => a.detail);
      if (i < 0) return false;
      l = l.map((a, k) => (k === i ? { ...a, detail: undefined } : a));
    }
  }
}

/**
 * attempt = { kind: 'quiz'|'matiere', quizId?, matiereId, titre, date, points, total, sur20, pct, detail? }
 * detail = correction de la tentative (questions, réponses de l'élève, corrigés), pour la partager plus tard.
 * Renvoie la tentative enregistrée (avec son identifiant).
 */
export function addAttempt(attempt) {
  const list = read();
  const saved = { ...attempt, id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, date: attempt.date || new Date().toISOString() };
  list.push(saved);
  write(list);
  return saved;
}

export function allAttempts() {
  return read();
}

export function attemptsForQuiz(quizId) {
  return read().filter((a) => a.kind === 'quiz' && a.quizId === quizId);
}

export function attemptsForMatiere(matiereId) {
  return read().filter((a) => a.matiereId === matiereId);
}

/** Statistiques d'une matière : dernière note, meilleure note, nombre de tentatives. */
export function matiereStats(matiereId, validQuizIds = null) {
  const list = attemptsForMatiere(matiereId).filter(
    (a) => a.kind === 'matiere' || !validQuizIds || validQuizIds.has(a.quizId),
  );
  if (!list.length) return null;
  list.sort((a, b) => a.date.localeCompare(b.date));
  const last = list[list.length - 1];
  const best = list.reduce((m, a) => (a.sur20 > m.sur20 ? a : m), list[0]);
  const avg = list.reduce((s, a) => s + a.sur20, 0) / list.length;
  return { last, best, count: list.length, avg: Math.round(avg * 10) / 10 };
}

export function clearHistory() {
  try { localStorage.removeItem(KEY); } catch { /* ignoré */ }
}
