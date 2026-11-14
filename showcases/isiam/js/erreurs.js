// ==========================================================================
// « Mes erreurs » : les questions ratées (ou partielles) sont mémorisées sur
// l'appareil ; une question sort de la liste dès qu'elle est réussie, quel que
// soit le quiz où elle réapparaît (quiz du cours, quiz de matière, Mes erreurs).
// ==========================================================================

const KEY = 'isiam.erreurs';

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function write(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* stockage plein : on ignore */ }
}

/** Clé unique d'une question : « idQuiz:idQuestion ». */
export const errorKey = (quizId, qid) => `${quizId}:${qid}`;

/**
 * Met à jour la liste après un quiz.
 * results = [{ quizId, qid, coursId, matiereId, verdict, question }]
 *   question = { type, enonce, choix?, bonnes?, reponse? } (copie pour pouvoir la reposer)
 * Renvoie { ajoutees, retirees }.
 */
export function recordResults(results) {
  const map = read();
  let ajoutees = 0;
  let retirees = 0;
  const now = new Date().toISOString();
  for (const r of results) {
    const k = errorKey(r.quizId, r.qid);
    if (r.verdict === 'juste') {
      if (map[k]) { delete map[k]; retirees++; }
    } else {
      const prev = map[k];
      if (!prev) ajoutees++;
      map[k] = {
        quizId: r.quizId, qid: r.qid, coursId: r.coursId || null, matiereId: r.matiereId,
        question: r.question, fois: (prev ? prev.fois : 0) + 1, premiere: prev ? prev.premiere : now, derniere: now,
      };
    }
  }
  write(map);
  return { ajoutees, retirees };
}

/** Erreurs d'un cours (coursId) ou des quiz « toute la matière » (coursId = null). */
export function errorsFor(matiereId, coursId) {
  return Object.values(read())
    .filter((e) => e.matiereId === matiereId && (e.coursId || null) === (coursId || null))
    .sort((a, b) => a.derniere.localeCompare(b.derniere));
}

export function countFor(matiereId, coursId) {
  return errorsFor(matiereId, coursId).length;
}

/** Retire les erreurs devenues sans objet (question supprimée ou modifiée dans le quiz). */
export function pruneQuiz(quizId, validQids) {
  const map = read();
  let changed = false;
  for (const [k, e] of Object.entries(map)) {
    if (e.quizId === quizId && !validQids.has(e.qid)) { delete map[k]; changed = true; }
  }
  if (changed) write(map);
}

/** Retire les erreurs des quiz qui n'existent plus, et recale cours/matière (quiz déplacé). */
export function syncWithIndex(quizInfo) {
  const map = read();
  let changed = false;
  for (const [k, e] of Object.entries(map)) {
    const q = quizInfo.get(e.quizId);
    if (!q) { delete map[k]; changed = true; continue; }
    if (e.coursId !== q.coursId || e.matiereId !== q.matiereId) { e.coursId = q.coursId; e.matiereId = q.matiereId; changed = true; }
  }
  if (changed) write(map);
}

export function clearErrors() {
  try { localStorage.removeItem(KEY); } catch { /* ignoré */ }
}
