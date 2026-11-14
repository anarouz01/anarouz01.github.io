// ==========================================================================
// Moteur de quiz : logique pure (aucun DOM), testable sous Node.
// ==========================================================================

export const SELF_POINTS = { juste: 1, partiel: 0.5, faux: 0 };
export const MATIERE_QUIZ_SIZE = 20;

/** Générateur pseudo-aléatoire reproductible (tests). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Prépare un passage : ordre des questions et, pour chaque QCM, ordre d'affichage
 * des propositions (perm[k] = indice d'origine affiché en position k).
 */
export function prepare(questions, { random = true, rng = Math.random } = {}) {
  const qs = random ? shuffle(questions, rng) : [...questions];
  return qs.map((q) => {
    const idx = q.type === 'qcm' ? q.choix.map((_, i) => i) : [];
    return { q, perm: random ? shuffle(idx, rng) : idx };
  });
}

/** QCM juste si l'ensemble coché est exactement celui des bonnes réponses. */
export function isQcmCorrect(q, selected) {
  const a = new Set(selected || []);
  const b = new Set(q.bonnes || []);
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function isAnswered(q, ans) {
  if (!ans) return false;
  if (q.type === 'qcm') return (ans.selected || []).length > 0;
  return !!(ans.texte && ans.texte.trim());
}

/**
 * Calcule le score.
 * answers[q.id] = { selected: [indices d'origine] } pour un QCM,
 *                 { texte, auto: 'juste'|'partiel'|'faux' } pour une question ouverte.
 */
export function score(items, answers) {
  let points = 0;
  const details = items.map(({ q }) => {
    const ans = answers[q.id] || {};
    let p = 0;
    let verdict;
    if (q.type === 'qcm') {
      const ok = isQcmCorrect(q, ans.selected);
      p = ok ? 1 : 0;
      verdict = ok ? 'juste' : 'faux';
    } else {
      verdict = ans.auto && ans.auto in SELF_POINTS ? ans.auto : 'faux';
      p = SELF_POINTS[verdict];
    }
    points += p;
    return { id: q.id, type: q.type, verdict, points: p };
  });
  const total = items.length;
  const ratio = total ? points / total : 0;
  return {
    points,
    total,
    sur20: Math.round(ratio * 20 * 10) / 10,
    pct: Math.round(ratio * 100),
    details,
  };
}

/**
 * Répartit n places entre des groupes de tailles données, le plus équitablement
 * possible : distribution tour par tour, en servant d'abord les groupes qui ont
 * le plus de questions restantes. Ex. [4, 10, 15], 20 → [4, 8, 8].
 */
export function allocate(sizes, n) {
  const counts = sizes.map(() => 0);
  let rem = Math.min(n, sizes.reduce((s, x) => s + x, 0));
  while (rem > 0) {
    const open = sizes
      .map((size, i) => ({ i, left: size - counts[i] }))
      .filter((g) => g.left > 0)
      .sort((a, b) => b.left - a.left || a.i - b.i);
    for (const g of open) {
      if (rem === 0) break;
      counts[g.i] += 1;
      rem -= 1;
    }
  }
  return counts;
}

/**
 * Quiz de matière : groups = [[questions du cours 1], [questions du cours 2], …].
 * Renvoie n questions (ou toutes s'il y en a moins), mélangées.
 */
export function buildMatiereQuiz(groups, n = MATIERE_QUIZ_SIZE, rng = Math.random) {
  const nonEmpty = groups.filter((g) => g.length);
  const counts = allocate(nonEmpty.map((g) => g.length), n);
  const picked = [];
  nonEmpty.forEach((g, i) => picked.push(...shuffle(g, rng).slice(0, counts[i])));
  return shuffle(picked, rng);
}

export function scoreClass(sur20) {
  if (sur20 >= 14) return 'good';
  if (sur20 >= 10) return 'warn';
  return 'bad';
}

export function formatNote(x) {
  return String(Math.round(x * 10) / 10).replace('.', ',');
}

/** Durée lisible : « 42 s », « 8 min 12 s », « 1 h 05 min ». */
export function formatDuree(ms) {
  const t = Math.max(0, Math.round((ms || 0) / 1000));
  if (t < 60) return `${t} s`;
  const m = Math.floor(t / 60);
  const sec = t % 60;
  if (m < 60) return sec ? `${m} min ${String(sec).padStart(2, '0')} s` : `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}

/** Chronomètre : « 3:07 », « 1:02:45 ». */
export function formatClock(ms) {
  const t = Math.max(0, Math.floor((ms || 0) / 1000));
  const hh = Math.floor(t / 3600);
  const mm = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, '0');
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}
