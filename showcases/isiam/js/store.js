// ==========================================================================
// Modèle de données : index (arborescence) + opérations.
// Les opérations modifient l'index reçu (l'appelant travaille sur une copie)
// et renvoient, le cas échéant, les fichiers à supprimer.
// ==========================================================================

export const PATHS = {
  crypto: 'data/crypto.json',
  index: 'data/index.enc',
  cours: (id) => `data/cours/${id}.enc`,
  quiz: (id) => `data/quiz/${id}.enc`,
};

export function emptyIndex() {
  return { version: 1, majLe: new Date().toISOString(), annees: [] };
}

export function newId(prefix) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  let s = '';
  for (const x of b) s += chars[x % chars.length];
  return `${prefix}-${s}`;
}

export const clone = (o) => JSON.parse(JSON.stringify(o));
export const byOrdre = (a, b) => (a.ordre ?? 0) - (b.ordre ?? 0);
export const sorted = (list) => [...(list || [])].sort(byOrdre);

function renumber(list) {
  sorted(list).forEach((x, i) => { x.ordre = i + 1; });
}
function nextOrdre(list) {
  return (list || []).reduce((m, x) => Math.max(m, x.ordre ?? 0), 0) + 1;
}

export function ordinalAnnee(n) {
  return n === 1 ? '1re année' : `${n}e année`;
}

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

export function allFiles(idx) {
  const files = [];
  for (const { matiere } of iterMatieres(idx)) {
    for (const c of matiere.cours || []) files.push(PATHS.cours(c.id));
    for (const q of matiere.quiz || []) files.push(PATHS.quiz(q.id));
  }
  return files;
}

// ---------- Années ----------
export function addAnnee(idx, nom) {
  const ordre = nextOrdre(idx.annees);
  const id = newId('a');
  const annee = {
    id, nom: (nom || '').trim() || ordinalAnnee(idx.annees.length + 1), ordre,
    semestres: [
      { id: `${id}-s1`, nom: 'Semestre 1', matieres: [] },
      { id: `${id}-s2`, nom: 'Semestre 2', matieres: [] },
    ],
  };
  idx.annees.push(annee);
  return annee;
}

export function renameAnnee(idx, id, nom) {
  const a = locateAnnee(idx, id);
  if (!a) throw new Error('Année introuvable');
  a.nom = nom.trim() || a.nom;
  return a;
}

export function deleteAnnee(idx, id) {
  const a = locateAnnee(idx, id);
  if (!a) throw new Error('Année introuvable');
  const files = [];
  for (const s of a.semestres) for (const m of s.matieres) files.push(...matiereFiles(m));
  idx.annees = idx.annees.filter((x) => x.id !== id);
  renumber(idx.annees);
  return files;
}

// ---------- Matières ----------
export function addMatiere(idx, semestreId, nom) {
  const loc = locateSemestre(idx, semestreId);
  if (!loc) throw new Error('Semestre introuvable');
  const clean = (nom || '').trim();
  if (!clean) throw new Error('Nom de matière obligatoire');
  const matiere = {
    id: newId('m'), nom: clean, ordre: nextOrdre(loc.semestre.matieres), brouillon: false,
    cours: [], quiz: [], liens: [],
  };
  loc.semestre.matieres.push(matiere);
  return matiere;
}

export function renameMatiere(idx, id, nom) {
  const loc = locateMatiere(idx, id);
  if (!loc) throw new Error('Matière introuvable');
  if (nom.trim()) loc.matiere.nom = nom.trim();
  return loc.matiere;
}

function matiereFiles(m) {
  return [
    ...(m.cours || []).map((c) => PATHS.cours(c.id)),
    ...(m.quiz || []).map((q) => PATHS.quiz(q.id)),
  ];
}

export function deleteMatiere(idx, id) {
  const loc = locateMatiere(idx, id);
  if (!loc) throw new Error('Matière introuvable');
  const files = matiereFiles(loc.matiere);
  loc.semestre.matieres = loc.semestre.matieres.filter((m) => m.id !== id);
  renumber(loc.semestre.matieres);
  return files;
}

export function moveMatiere(idx, id, targetSemestreId) {
  const loc = locateMatiere(idx, id);
  const target = locateSemestre(idx, targetSemestreId);
  if (!loc || !target) throw new Error('Déplacement impossible');
  if (loc.semestre.id === targetSemestreId) return loc.matiere;
  loc.semestre.matieres = loc.semestre.matieres.filter((m) => m.id !== id);
  renumber(loc.semestre.matieres);
  loc.matiere.ordre = nextOrdre(target.semestre.matieres);
  target.semestre.matieres.push(loc.matiere);
  return loc.matiere;
}

/** Déplace un élément d'une liste ordonnée de delta (-1 = monter, +1 = descendre). */
export function reorder(list, id, delta) {
  const s = sorted(list);
  const i = s.findIndex((x) => x.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= s.length) return false;
  [s[i], s[j]] = [s[j], s[i]];
  s.forEach((x, k) => { x.ordre = k + 1; });
  return true;
}

/** Place l'élément id à la position pos (0-based). */
export function moveTo(list, id, pos) {
  const s = sorted(list);
  const i = s.findIndex((x) => x.id === id);
  if (i < 0) return false;
  const [item] = s.splice(i, 1);
  s.splice(Math.max(0, Math.min(pos, s.length)), 0, item);
  s.forEach((x, k) => { x.ordre = k + 1; });
  return true;
}

// ---------- Cours ----------
export function addCours(idx, matiereId, { titre, pages, octets, brouillon = false }) {
  const loc = locateMatiere(idx, matiereId);
  if (!loc) throw new Error('Matière introuvable');
  const cours = {
    id: newId('c'), titre: titre.trim(), ordre: nextOrdre(loc.matiere.cours),
    brouillon: !!brouillon, pages: pages || 0, octets: octets || 0, v: Date.now(),
  };
  loc.matiere.cours.push(cours);
  return cours;
}

export function deleteCours(idx, id) {
  const loc = locateCours(idx, id);
  if (!loc) throw new Error('Cours introuvable');
  loc.matiere.cours = loc.matiere.cours.filter((c) => c.id !== id);
  renumber(loc.matiere.cours);
  // Les quiz du cours restent, rattachés à la matière.
  for (const q of loc.matiere.quiz) if (q.coursId === id) q.coursId = null;
  return [PATHS.cours(id)];
}

export function moveCours(idx, id, targetMatiereId) {
  const loc = locateCours(idx, id);
  const target = locateMatiere(idx, targetMatiereId);
  if (!loc || !target) throw new Error('Déplacement impossible');
  if (loc.matiere.id === targetMatiereId) return loc.cours;
  loc.matiere.cours = loc.matiere.cours.filter((c) => c.id !== id);
  renumber(loc.matiere.cours);
  loc.cours.ordre = nextOrdre(target.matiere.cours);
  target.matiere.cours.push(loc.cours);
  // Les quiz liés suivent leur cours.
  const linked = loc.matiere.quiz.filter((q) => q.coursId === id);
  loc.matiere.quiz = loc.matiere.quiz.filter((q) => q.coursId !== id);
  target.matiere.quiz.push(...linked);
  return loc.cours;
}

// ---------- Quiz ----------
export function addQuiz(idx, matiereId, { titre, coursId = null, nbQuestions = 0, brouillon = false }) {
  const loc = locateMatiere(idx, matiereId);
  if (!loc) throw new Error('Matière introuvable');
  if (coursId && !loc.matiere.cours.some((c) => c.id === coursId)) coursId = null;
  const quiz = { id: newId('q'), titre: titre.trim(), coursId, nbQuestions, brouillon: !!brouillon, v: Date.now() };
  loc.matiere.quiz.push(quiz);
  return quiz;
}

export function deleteQuiz(idx, id) {
  const loc = locateQuiz(idx, id);
  if (!loc) throw new Error('Quiz introuvable');
  loc.matiere.quiz = loc.matiere.quiz.filter((q) => q.id !== id);
  return [PATHS.quiz(id)];
}

export function moveQuiz(idx, id, targetMatiereId, coursId = null) {
  const loc = locateQuiz(idx, id);
  const target = locateMatiere(idx, targetMatiereId);
  if (!loc || !target) throw new Error('Déplacement impossible');
  loc.matiere.quiz = loc.matiere.quiz.filter((q) => q.id !== id);
  loc.quiz.coursId = coursId && target.matiere.cours.some((c) => c.id === coursId) ? coursId : null;
  target.matiere.quiz.push(loc.quiz);
  return loc.quiz;
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

// ---------- Liens ----------
export function addLien(idx, matiereId, { titre, url }) {
  const loc = locateMatiere(idx, matiereId);
  if (!loc) throw new Error('Matière introuvable');
  const lien = { id: newId('l'), titre: titre.trim() || url, url: url.trim(), type: youtubeId(url) ? 'video' : 'lien', ordre: nextOrdre(loc.matiere.liens) };
  loc.matiere.liens = loc.matiere.liens || [];
  loc.matiere.liens.push(lien);
  return lien;
}

export function deleteLien(idx, matiereId, lienId) {
  const loc = locateMatiere(idx, matiereId);
  if (!loc) throw new Error('Matière introuvable');
  loc.matiere.liens = (loc.matiere.liens || []).filter((l) => l.id !== lienId);
  renumber(loc.matiere.liens);
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

// ---------- Validation d'un quiz ----------
export function validateQuestions(questions) {
  const errors = [];
  if (!questions.length) errors.push('Le quiz doit contenir au moins une question.');
  questions.forEach((q, i) => {
    const n = i + 1;
    if (!q.enonce || !q.enonce.trim()) errors.push(`Question ${n} : énoncé vide.`);
    if (q.type === 'qcm') {
      const choix = (q.choix || []).map((c) => c.trim());
      if (choix.length < 2) errors.push(`Question ${n} : au moins 2 propositions.`);
      if (choix.some((c) => !c)) errors.push(`Question ${n} : une proposition est vide.`);
      if (!q.bonnes || !q.bonnes.length) errors.push(`Question ${n} : cochez au moins une bonne réponse.`);
    } else if (q.type === 'ouverte') {
      if (!q.reponse || !q.reponse.trim()) errors.push(`Question ${n} : réponse attendue vide.`);
    } else {
      errors.push(`Question ${n} : type inconnu.`);
    }
  });
  return errors;
}
