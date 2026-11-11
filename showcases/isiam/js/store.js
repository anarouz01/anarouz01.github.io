// ==========================================================================
// Modèle de données (lecture seule côté site) : l'index est produit par
// publier.mjs ; ce module ne fait que le parcourir.
// ==========================================================================

export const PATHS = {
  crypto: 'data/crypto.json',
  index: 'data/index.enc',
  cours: (id) => `data/cours/${id}.enc`,
  quiz: (id) => `data/quiz/${id}.enc`,
};

export const clone = (o) => JSON.parse(JSON.stringify(o));
export const byOrdre = (a, b) => (a.ordre ?? 0) - (b.ordre ?? 0);
export const sorted = (list) => [...(list || [])].sort(byOrdre);

// ---------- Recherches ----------
export function* iterMatieres(idx) {
  for (const annee of sorted(idx.annees)) {
    for (const semestre of annee.semestres) {
      for (const matiere of sorted(semestre.matieres)) yield { annee, semestre, matiere };
    }
  }
}

export function locateAnnee(idx, id) {
  return idx.annees.find((a) => a.id === id) || null;
}
export function locateSemestre(idx, id) {
  for (const annee of idx.annees) {
    const semestre = annee.semestres.find((s) => s.id === id);
    if (semestre) return { annee, semestre };
  }
  return null;
}
export function locateMatiere(idx, id) {
  for (const loc of iterMatieres(idx)) if (loc.matiere.id === id) return loc;
  return null;
}
export function locateCours(idx, id) {
  for (const loc of iterMatieres(idx)) {
    const cours = (loc.matiere.cours || []).find((c) => c.id === id);
    if (cours) return { ...loc, cours };
  }
  return null;
}
export function locateQuiz(idx, id) {
  for (const loc of iterMatieres(idx)) {
    const quiz = (loc.matiere.quiz || []).find((q) => q.id === id);
    if (quiz) return { ...loc, quiz };
  }
  return null;
}

/** Quiz d'une matière, regroupés : d'abord ceux de chaque cours (ordre des cours), puis ceux de la matière. */
export function quizGroups(matiere) {
  const groups = [];
  for (const c of sorted(matiere.cours)) {
    const qs = (matiere.quiz || []).filter((q) => q.coursId === c.id);
    groups.push({ cours: c, quiz: qs });
  }
  groups.push({ cours: null, quiz: (matiere.quiz || []).filter((q) => !q.coursId || !matiere.cours.some((c) => c.id === q.coursId)) });
  return groups;
}

export function youtubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
    if (/(^|\.)youtube(-nocookie)?\.com$/.test(u.hostname)) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const m = u.pathname.match(/\/(embed|shorts|live)\/([\w-]+)/);
      if (m) return m[2];
    }
  } catch { /* URL invalide */ }
  return null;
}

// ---------- Visibilité élève ----------
/** Copie de l'index sans les éléments en brouillon. */
export function visibleIndex(idx) {
  const out = clone(idx);
  for (const a of out.annees) {
    for (const s of a.semestres) {
      s.matieres = s.matieres.filter((m) => !m.brouillon);
      for (const m of s.matieres) {
        m.cours = (m.cours || []).filter((c) => !c.brouillon);
        const coursIds = new Set(m.cours.map((c) => c.id));
        m.quiz = (m.quiz || []).filter((q) => !q.brouillon);
        // Un quiz dont le cours est en brouillon reste visible, rattaché à la matière.
        for (const q of m.quiz) if (q.coursId && !coursIds.has(q.coursId)) q.coursId = null;
      }
    }
  }
  return out;
}
