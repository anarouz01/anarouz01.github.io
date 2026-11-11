// ==========================================================================
// Historique des résultats, propre à l'appareil (localStorage).
// ==========================================================================

const KEY = 'isiam.resultats';
const MAX = 2000;

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
    return true;
  } catch {
    return false;
  }
}

/**
 * attempt = { kind: 'quiz'|'matiere', quizId?, matiereId, titre, date, points, total, sur20, pct }
 */
export function addAttempt(attempt) {
  const list = read();
  list.push({ ...attempt, date: attempt.date || new Date().toISOString() });
  return write(list);
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
