// ==========================================================================
// Espace élève : connexion, navigation, lecteur de cours, quiz, progression.
// Lecture seule : aucun jeton, seuls des fichiers chiffrés sont téléchargés.
// ==========================================================================
import { unlock, verifyKey, saveKey, loadKey, forgetKey } from '../crypto.js';
import { PublishedData } from '../data.js';
import {
  sorted, visibleIndex, locateAnnee, locateMatiere, locateCours, locateQuiz, quizGroups, youtubeId,
} from '../store.js';
import {
  h, put, clear, icon, loader, brandMark, empty, toast, initTheme, themeToggle, crumbs, plural, fmtDate,
  downloadBytes, safeFilename, confirmDialog,
} from '../ui.js';
import { createRouter } from '../router.js';
import { setVendorBase, openPdf, mountViewer } from '../pdf-viewer.js';
import { runQuiz } from '../quiz-ui.js';
import { openShare, openShareCorrection, withDetail } from '../share.js';
import { buildMatiereQuiz, MATIERE_QUIZ_SIZE, scoreClass, formatNote } from '../quiz-engine.js';
import { addAttempt, attemptsForQuiz, attemptsForMatiere, matiereStats, clearHistory } from '../history.js';

const app = document.getElementById('app');
const data = new PublishedData('');
const preview = false; // les brouillons (préfixe « _ ») ne sont jamais publiés

let config = null;
let key = null;
let fullIndex = null;
let idx = null;
let loadedAt = 0;
let view = null;
let cleanup = null;
let router = null;

setVendorBase('');
initTheme();
boot();

// ---------------------------------------------------------------------------
async function boot() {
  clear(app).append(loader());
  try {
    config = await data.config();
  } catch (e) {
    return fatal(e.message);
  }
  if (!config) return fatal('Aucun contenu n\'a encore été publié.');
  key = await loadKey('eleve');
  if (key && (await verifyKey(key, config))) return start();
  const hadKey = !!key;
  if (key) await forgetKey('eleve');
  key = null;
  showLogin(hadKey ? 'Le mot de passe a changé. Saisissez le nouveau mot de passe.' : undefined);
}

function fatal(msg) {
  clear(app).append(h('div', { class: 'lock-screen' }, h('div', { class: 'card lock-card' },
    brandMark(),
    h('h1', null, 'Révisions'),
    h('p', { class: 'muted' }, msg),
    h('button', { type: 'button', class: 'btn', onClick: () => location.reload() }, icon('refresh'), 'Réessayer'))));
}

function showLogin(message) {
  const input = h('input', { class: 'input', type: 'password', id: 'pw', autocomplete: 'current-password', required: true, placeholder: 'Mot de passe' });
  const toggle = h('button', { type: 'button', class: 'btn sm ghost', onClick: () => {
    input.type = input.type === 'password' ? 'text' : 'password';
    toggle.textContent = input.type === 'password' ? 'Afficher' : 'Masquer';
  } }, 'Afficher');
  const err = h('div', { class: 'notice bad', role: 'alert', hidden: !message }, message || '');
  const submit = h('button', { type: 'submit', class: 'btn primary block' }, 'Entrer');
  const form = h('form', { onSubmit: async (e) => {
    e.preventDefault();
    if (!input.value) return;
    submit.disabled = true;
    submit.textContent = 'Vérification…';
    err.hidden = true;
    try {
      const k = await unlock(input.value, config);
      if (!k) throw new Error('Mot de passe incorrect.');
      key = k;
      await saveKey('eleve', k);
      start();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
      submit.disabled = false;
      submit.textContent = 'Entrer';
      input.select();
    }
  } },
  h('div', { class: 'field' }, h('label', { for: 'pw' }, 'Mot de passe'), h('div', { class: 'pw-wrap' }, input, toggle)),
  err, submit);

  clear(app).append(h('main', { class: 'lock-screen' }, h('div', { class: 'card lock-card' },
    brandMark(),
    h('h1', null, 'Bienvenue'),
    h('p', { class: 'muted' }, 'Saisissez votre mot de passe. Il ne vous sera plus demandé sur cet appareil.'),
    form)));
  input.focus();
}

async function loadIndex() {
  fullIndex = await data.index(key);
  idx = preview ? fullIndex : visibleIndex(fullIndex);
  loadedAt = Date.now();
}

async function start() {
  clear(app).append(loader());
  try {
    await loadIndex();
  } catch (e) {
    if (/Déchiffrement/.test(e.message)) {
      await forgetKey('eleve');
      key = null;
      return showLogin('Le mot de passe a changé. Saisissez le nouveau mot de passe.');
    }
    return fatal(e.message);
  }
  renderShell();
  router = createRouter([
    ['/', home],
    ['/a/:id', anneePage],
    ['/m/:id/:tab?', matierePage],
    ['/c/:id', coursPage],
    ['/q/:id', quizPage],
    ['/qm/:id', quizMatierePage],
  ], () => notFound());
  router.start();
  registerSW();
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || Date.now() - loadedAt < 2 * 60 * 1000) return;
    if (/^#\/(q|qm|c)\//.test(location.hash)) return; // ne pas interrompre un quiz ou une lecture
    try { await loadIndex(); router.refresh(); } catch { /* hors ligne : on garde l'index courant */ }
  });
}

function renderShell() {
  view = h('main', { id: 'view', class: 'container' });
  const menu = h('button', { type: 'button', class: 'btn icon ghost', title: 'Se déconnecter', 'aria-label': 'Se déconnecter de cet appareil', onClick: logout }, icon('logout'));
  put(clear(app),
    h('header', { class: 'topbar' }, h('div', { class: 'topbar-inner' },
      h('a', { class: 'brand', href: '#/' }, brandMark(), h('span', null, 'Révisions')),
      h('span', { class: 'topbar-spacer' }),
      h('div', { class: 'topbar-actions' }, themeToggle(), menu))),
    view,
    h('footer', { class: 'footer-note' }, 'Révisions ISIAM · historique propre à cet appareil'),
  );
}

async function logout() {
  const ok = await confirmDialog('Se déconnecter ?', 'Le mot de passe sera redemandé sur cet appareil. Votre historique est conservé.', { ok: 'Se déconnecter' });
  if (!ok) return;
  await forgetKey('eleve');
  location.hash = '';
  location.reload();
}

function setView(...nodes) {
  if (cleanup) { try { cleanup(); } catch { /* ignoré */ } cleanup = null; }
  if (router) router.clearGuard();
  clear(view).append(...nodes.flat().filter(Boolean));
}

function notFound() {
  setView(h('div', { class: 'empty' }, h('p', null, 'Cette page n\'existe pas ou n\'est plus disponible.'), h('a', { class: 'btn', href: '#/' }, 'Retour à l\'accueil')));
}

const draftBadge = (x) => (preview && x.brouillon ? h('span', { class: 'badge draft' }, 'Brouillon') : null);

function countAnnee(a) {
  let m = 0; let c = 0; let q = 0;
  for (const s of a.semestres) for (const mat of s.matieres) { m++; c += mat.cours.length; q += mat.quiz.length; }
  return { m, c, q };
}

// ---------------------------------------------------------------------------
// Accueil : années + tableau de progression
function home(params, query) {
  const annees = sorted(idx.annees);
  if (!annees.length) {
    return setView(h('div', { class: 'page-head' }, h('h1', null, 'Mes révisions')), empty('Aucun contenu pour l\'instant. Revenez bientôt !', 'book'));
  }
  const yearCards = h('div', { class: 'cards' }, annees.map((a) => {
    const n = countAnnee(a);
    return h('a', { class: 'card year-card', href: `#/a/${a.id}` },
      h('div', { class: 'year-num' }, String(a.ordre)),
      h('div', { class: 'grow' },
        h('div', { class: 'card-title' }, a.nom),
        h('div', { class: 'meta' }, h('span', null, plural(n.m, 'matière', 'matières')), h('span', null, plural(n.c, 'cours', 'cours')), h('span', null, plural(n.q, 'quiz', 'quiz')))));
  }));

  const withMat = annees.filter((a) => countAnnee(a).m > 0);
  const selected = withMat.find((a) => a.id === query.annee) || withMat[withMat.length - 1];
  let progress = null;
  if (selected) {
    const tabs = withMat.length > 1 ? h('div', { class: 'tabs', role: 'tablist' }, withMat.map((a) => h('a', {
      class: 'tab', role: 'tab', 'aria-selected': String(a.id === selected.id), href: `#/?annee=${a.id}`, 'data-replace': '',
    }, a.nom))) : null;
    const rows = [];
    for (const s of selected.semestres) {
      for (const m of sorted(s.matieres)) {
        const st = matiereStats(m.id, new Set(m.quiz.map((q) => q.id)));
        const cls = st ? scoreClass(st.last.sur20) : '';
        rows.push(h('tr', null,
          h('td', null, h('a', { href: `#/m/${m.id}/quiz` }, m.nom), h('div', { class: 'tiny muted' }, s.nom)),
          h('td', null, st
            ? h('div', { class: 'score-cell' }, h('strong', null, `${formatNote(st.last.sur20)}/20`), h('div', { class: `progress ${cls}` }, h('span', { style: { width: `${st.last.pct}%` } })))
            : h('span', { class: 'muted small' }, m.quiz.length ? 'Pas encore commencé' : 'Aucun quiz')),
          h('td', { class: 'num hide-mobile' }, st ? `${formatNote(st.best.sur20)}/20` : '–'),
          h('td', { class: 'num hide-mobile' }, st ? String(st.count) : '0')));
      }
    }
    progress = [
      h('h2', { style: { marginTop: '40px' } }, 'Ma progression'),
      tabs,
      h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
        h('thead', null, h('tr', null, h('th', null, 'Matière'), h('th', null, 'Dernière note'), h('th', { class: 'num hide-mobile' }, 'Meilleure'), h('th', { class: 'num hide-mobile' }, 'Tentatives'))),
        h('tbody', null, rows))),
      h('div', { class: 'row between', style: { marginTop: '8px' } },
        h('p', { class: 'tiny muted', style: { margin: 0 } }, 'Rouge sous 10, orange de 10 à 14, vert à partir de 14. Historique propre à cet appareil.'),
        h('button', { type: 'button', class: 'btn ghost sm', onClick: clearDeviceData }, icon('trash'), 'Effacer l\'historique')),
    ];
  }

  const last = lastCours();
  const lastLoc = last && locateCours(idx, last.id);
  const resume = lastLoc ? h('a', { class: 'card link resume-card', href: `#/c/${lastLoc.cours.id}` },
    h('span', { class: 'year-num' }, icon('book')),
    h('span', { class: 'grow' },
      h('span', { class: 'tiny muted', style: { display: 'block' } }, 'Reprendre la lecture'),
      h('span', { class: 'card-title', style: { display: 'block' } }, lastLoc.cours.titre),
      h('span', { class: 'small muted' }, `${lastLoc.matiere.nom} · ${lastLoc.annee.nom}`)),
    icon('right')) : null;

  setView(
    h('div', { class: 'page-head' }, h('h1', null, 'Mes révisions'), h('p', { class: 'muted' }, 'Choisissez une année pour accéder aux cours et aux quiz.')),
    resume,
    yearCards,
    progress,
  );
}

// ---------------------------------------------------------------------------
function anneePage({ id }) {
  const annee = locateAnnee(idx, id);
  if (!annee) return notFound();
  setView(
    crumbs([{ label: 'Accueil', href: '#/' }, { label: annee.nom }]),
    h('div', { class: 'page-head' }, h('h1', null, annee.nom)),
    h('div', { class: 'semesters' }, annee.semestres.map((s) => h('section', { class: 'semester' },
      h('h2', null, s.nom),
      s.matieres.length
        ? h('div', { class: 'cards' }, sorted(s.matieres).map((m) => {
          const st = matiereStats(m.id, new Set(m.quiz.map((q) => q.id)));
          return h('a', { class: 'card link pad-sm', href: `#/m/${m.id}` },
            h('div', { class: 'row between' }, h('div', { class: 'card-title' }, m.nom, ' ', draftBadge(m)),
              st ? h('span', { class: `badge ${scoreClass(st.last.sur20)}` }, `${formatNote(st.last.sur20)}/20`) : null),
            h('div', { class: 'meta' }, h('span', null, plural(m.cours.length, 'cours', 'cours')), h('span', null, plural(m.quiz.length, 'quiz', 'quiz')),
              m.liens && m.liens.length ? h('span', null, plural(m.liens.length, 'lien', 'liens')) : null));
        }))
        : empty('Aucune matière pour ce semestre.')))),
  );
}

// ---------------------------------------------------------------------------
function matierePage({ id, tab = 'cours' }) {
  const loc = locateMatiere(idx, id);
  if (!loc) return notFound();
  const { annee, semestre, matiere } = loc;
  const tabs = [
    ['cours', 'Cours', matiere.cours.length, 'book'],
    ['quiz', 'Quiz', matiere.quiz.length, 'quiz'],
    ['liens', 'Liens', (matiere.liens || []).length, 'link'],
  ];
  let body;
  if (tab === 'quiz') body = quizTab(matiere);
  else if (tab === 'liens') body = liensTab(matiere);
  else body = coursTab(matiere);

  setView(
    crumbs([{ label: 'Accueil', href: '#/' }, { label: annee.nom, href: `#/a/${annee.id}` }, { label: matiere.nom }]),
    h('div', { class: 'page-head' }, h('h1', null, matiere.nom, ' ', draftBadge(matiere)), h('p', { class: 'muted' }, `${semestre.nom} · ${annee.nom}`)),
    h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, label, n, ic]) => h('a', {
      class: 'tab', role: 'tab', 'aria-selected': String(k === tab), href: `#/m/${matiere.id}/${k}`, 'data-replace': '',
    }, icon(ic), label, h('span', { class: 'count' }, String(n))))),
    body,
  );
}

function coursTab(matiere) {
  const list = sorted(matiere.cours);
  if (!list.length) return empty('Aucun cours pour l\'instant.', 'book');
  return h('div', { class: 'list' }, list.map((c, i) => {
    const qs = quizzesOf(matiere, c);
    return h('div', { class: 'list-item course-row' },
      h('a', { class: 'row-link', href: `#/c/${c.id}` },
        h('span', { class: 'list-num' }, String(i + 1)),
        h('span', { class: 'grow' }, h('span', { class: 'title' }, c.titre, ' ', draftBadge(c)),
          h('span', { class: 'sub' }, [c.pages ? plural(c.pages, 'page', 'pages') : 'PDF', qs.length ? plural(qs.length, 'quiz', 'quiz') : null].filter(Boolean).join(' · ')))),
      qs.length ? (() => {
        const best = bestNote(qs[0]);
        return h('a', { class: 'btn sm', href: `#/q/${qs[0].id}`, title: `Quiz : ${qs[0].titre}` }, icon('quiz'), h('span', null, 'Quiz'),
          best !== null ? h('span', { class: `badge ${scoreClass(best)}` }, `${formatNote(best)}/20`) : null);
      })() : null);
  }));
}

function quizStatsLine(q) {
  const att = attemptsForQuiz(q.id);
  const parts = [plural(q.nbQuestions || 0, 'question', 'questions')];
  if (att.length) {
    const best = att.reduce((m, a) => Math.max(m, a.sur20), 0);
    parts.push(`meilleure note ${formatNote(best)}/20`, plural(att.length, 'tentative', 'tentatives'));
  }
  return { text: parts.join(' · '), done: att.length > 0, last: att[att.length - 1] };
}

// ---------- Effacement des données de l'appareil ----------
async function clearDeviceData() {
  const ok = await confirmDialog('Effacer l\'historique ?',
    'Toutes les notes, les corrections enregistrées, le dernier cours ouvert et les cours gardés pour la lecture hors connexion seront supprimés de cet appareil. Le mot de passe reste mémorisé (bouton de déconnexion en haut à droite pour l\'oublier).',
    { ok: 'Tout effacer', danger: true });
  if (!ok) return;
  clearHistory();
  try { localStorage.removeItem(LAST_KEY); } catch { /* ignoré */ }
  try { sessionStorage.removeItem('isiam.nav'); } catch { /* ignoré */ }
  coursCache.clear();
  // Cours et quiz chiffrés gardés par l'application pour le hors-connexion.
  try {
    if (window.caches) {
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) if (/\/data\//.test(new URL(req.url).pathname)) await cache.delete(req);
      }
    }
  } catch { /* ignoré */ }
  toast('Historique et données de cet appareil effacés.', 'good');
  router.refresh();
}

// ---------- Partage des résultats ----------
let lastAttempt = null;
function quizShareInfo(quiz, selectedId) {
  const loc = locateQuiz(idx, quiz.id);
  return { titre: quiz.titre, contexte: loc ? `${loc.matiere.nom} · ${loc.annee.nom}` : '', attempts: attemptsForQuiz(quiz.id), selectedId };
}
function matiereShareInfo(matiere, selectedId) {
  const loc = locateMatiere(idx, matiere.id);
  return { titre: `Quiz de la matière · ${matiere.nom}`, contexte: loc ? `${matiere.nom} · ${loc.annee.nom}` : matiere.nom, attempts: attemptsForMatiere(matiere.id).filter((a) => a.kind === 'matiere'), selectedId };
}
const shareQuiz = (quiz) => openShare(quizShareInfo(quiz));
const shareMatiere = (matiere) => openShare(matiereShareInfo(matiere));
const shareBtn = (onClick, label = 'Partager le résultat') => h('button', { type: 'button', class: 'btn', onClick }, icon('share'), h('span', null, label));
const correctionBtn = (onClick) => h('button', { type: 'button', class: 'btn', onClick }, icon('check'), h('span', null, 'Partager la correction'));
const iconBtnShare = (label, onClick, ic = 'share') => h('button', { type: 'button', class: 'btn icon sm share-btn', title: label, 'aria-label': label, onClick }, icon(ic));

function quizTab(matiere) {
  if (!matiere.quiz.length) return empty('Aucun quiz pour l\'instant.', 'quiz');
  const totalQ = matiere.quiz.reduce((s, q) => s + (q.nbQuestions || 0), 0);
  const mAtt = attemptsForMatiere(matiere.id).filter((a) => a.kind === 'matiere');
  const lastM = mAtt[mAtt.length - 1];
  const hero = h('div', { class: 'card', style: { marginBottom: '24px' } },
    h('div', { class: 'row between' },
      h('div', { class: 'grow' },
        h('div', { class: 'card-title' }, 'Quiz de la matière'),
        h('div', { class: 'muted small' }, `${Math.min(MATIERE_QUIZ_SIZE, totalQ)} questions tirées au hasard dans tous les quiz, réparties entre les cours.`),
        lastM ? h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, `Dernière tentative : ${formatNote(lastM.sur20)}/20 le ${fmtDate(lastM.date)}`) : null),
      h('div', { class: 'row' },
        lastM && withDetail(mAtt).length ? h('button', { type: 'button', class: 'btn icon', title: 'Partager la correction', 'aria-label': 'Partager la correction du quiz de la matière', onClick: () => openShareCorrection(matiereShareInfo(matiere)) }, icon('check')) : null,
        lastM ? h('button', { type: 'button', class: 'btn icon', title: 'Partager le résultat', 'aria-label': 'Partager le résultat du quiz de la matière', onClick: () => shareMatiere(matiere) }, icon('share')) : null,
        h('a', { class: 'btn primary', href: `#/qm/${matiere.id}` }, icon('play'), 'Commencer'))));

  const groups = quizGroups(matiere).filter((g) => g.quiz.length);
  return h('div', null, hero, groups.map((g) => h('section', { style: { marginBottom: '24px' } },
    h('div', { class: 'row between group-head' },
      h('h3', { class: 'muted', style: { margin: 0 } }, g.cours ? g.cours.titre : 'Quiz sur toute la matière'),
      g.cours ? h('a', { class: 'btn sm ghost', href: `#/c/${g.cours.id}` }, icon('book'), 'Lire le cours') : null),
    h('div', { class: 'list' }, g.quiz.map((q) => {
      const st = quizStatsLine(q);
      return h('div', { class: 'list-item course-row' },
        h('a', { class: 'row-link', href: `#/q/${q.id}` },
          h('span', { class: 'grow' }, h('span', { class: 'title' }, q.titre, ' ', draftBadge(q)), h('span', { class: 'sub' }, st.text)),
          st.done ? h('span', { class: `badge ${scoreClass(st.last.sur20)}` }, `${formatNote(st.last.sur20)}/20`) : h('span', { class: 'badge' }, 'Jamais fait')),
        st.done && withDetail(attemptsForQuiz(q.id)).length ? iconBtnShare(`Partager la correction : ${q.titre}`, () => openShareCorrection(quizShareInfo(q)), 'check') : null,
        st.done ? iconBtnShare(`Partager le résultat : ${q.titre}`, () => shareQuiz(q)) : null);
    })))));
}

function liensTab(matiere) {
  const liens = sorted(matiere.liens || []);
  if (!liens.length) return empty('Aucun lien ni vidéo pour l\'instant.', 'link');
  return h('div', { class: 'list' }, liens.map((l) => {
    const yt = youtubeId(l.url);
    const holder = h('div');
    const item = h('div', { class: 'list-item', style: { flexWrap: 'wrap' } },
      icon(yt ? 'play' : 'link'),
      h('span', { class: 'grow' }, h('span', { class: 'title' }, l.titre), h('span', { class: 'sub' }, (() => { try { return new URL(l.url).hostname.replace(/^www\./, ''); } catch { return l.url; } })())),
      yt
        ? h('button', { type: 'button', class: 'btn sm', onClick: (e) => {
          if (holder.firstChild) { clear(holder); e.currentTarget.textContent = 'Regarder'; return; }
          holder.append(h('div', { class: 'video-embed' }, h('iframe', {
            src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`, title: l.titre, loading: 'lazy',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture', allowfullscreen: true,
          })));
          e.currentTarget.textContent = 'Masquer';
        } }, 'Regarder')
        : h('a', { class: 'btn sm', href: l.url, target: '_blank', rel: 'noopener noreferrer' }, 'Ouvrir'),
      h('div', { style: { flexBasis: '100%' } }, holder));
    return item;
  }));
}

// ---------------------------------------------------------------------------
// Cours : lecteur, navigation entre cours, accès au quiz du cours
const LAST_KEY = 'isiam.dernierCours';
function rememberCours(id) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify({ id, date: new Date().toISOString() })); } catch { /* ignoré */ }
}
function lastCours() {
  try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null'); } catch { return null; }
}

/** Octets déchiffrés des derniers cours ouverts (évite de retélécharger en passant cours ↔ quiz). */
const coursCache = new Map();
async function coursBytes(cours) {
  const k = `${cours.id}:${cours.v}`;
  if (coursCache.has(k)) return coursCache.get(k);
  const bytes = await data.cours(key, cours);
  coursCache.set(k, bytes);
  while (coursCache.size > 4) coursCache.delete(coursCache.keys().next().value);
  return bytes;
}

const quizzesOf = (matiere, cours) => (matiere.quiz || []).filter((q) => q.coursId === cours.id);

function bestNote(q) {
  const att = attemptsForQuiz(q.id);
  return att.length ? att.reduce((m, a) => Math.max(m, a.sur20), 0) : null;
}

/** Bouton vers un quiz, avec la meilleure note obtenue. */
function quizButton(q, { primary = false, label } = {}) {
  const best = bestNote(q);
  return h('a', { class: `btn ${primary ? 'primary' : ''}`, href: `#/q/${q.id}` },
    icon('quiz'), h('span', null, label || 'Faire le quiz'),
    best !== null ? h('span', { class: `badge ${scoreClass(best)}` }, `${formatNote(best)}/20`) : null);
}

async function coursPage({ id }) {
  const loc = locateCours(idx, id);
  if (!loc) return notFound();
  const { annee, matiere, cours } = loc;
  const list = sorted(matiere.cours);
  const i = list.findIndex((c) => c.id === id);
  const prev = list[i - 1];
  const next = list[i + 1];
  const quizzes = quizzesOf(matiere, cours);
  rememberCours(id);

  // Sélecteur de cours : passer directement à un autre chapitre de la matière.
  const picker = h('select', { class: 'select course-picker', 'aria-label': 'Aller à un autre cours de la matière' },
    list.map((c, k) => h('option', { value: c.id, selected: c.id === id }, `${k + 1}. ${c.titre}`)));
  picker.addEventListener('change', () => router.go(`/c/${picker.value}`, { replace: true }));

  const pageInfo = h('span', { class: 'zoom-val', 'aria-live': 'polite' }, '');
  const zoomVal = h('span', { class: 'zoom-val hide-mobile' }, '100 %');
  const btnMinus = h('button', { type: 'button', class: 'btn icon', 'aria-label': 'Dézoomer', disabled: true }, icon('zoomOut'));
  const btnPlus = h('button', { type: 'button', class: 'btn icon', 'aria-label': 'Zoomer', disabled: true }, icon('zoomIn'));
  const btnDl = h('button', { type: 'button', class: 'btn icon', 'aria-label': 'Télécharger le PDF', title: 'Télécharger le PDF', disabled: true }, icon('download'));
  const navBtn = (c, dir) => (c
    ? h('a', { class: 'btn icon', href: `#/c/${c.id}`, 'data-replace': '', title: `${dir < 0 ? 'Cours précédent' : 'Cours suivant'} : ${c.titre}`, 'aria-label': dir < 0 ? 'Cours précédent' : 'Cours suivant' }, icon(dir < 0 ? 'left' : 'right'))
    : h('button', { type: 'button', class: 'btn icon', disabled: true, 'aria-label': dir < 0 ? 'Pas de cours précédent' : 'Pas de cours suivant' }, icon(dir < 0 ? 'left' : 'right')));

  const pagesBox = h('div', { class: 'pdf-pages' }, loader('Déchiffrement du cours…'));

  // Fin du cours : enchaîner sur le quiz, puis sur le cours suivant.
  const endCard = h('section', { class: 'card end-card' },
    h('div', { class: 'card-title' }, 'Fin du cours'),
    h('p', { class: 'muted small' }, quizzes.length ? 'Vérifiez ce que vous avez retenu, puis passez au cours suivant.' : 'Passez au cours suivant ou testez-vous sur toute la matière.'),
    h('div', { class: 'row' },
      quizzes.map((q, k) => quizButton(q, { primary: k === 0, label: quizzes.length > 1 ? q.titre : `Faire le quiz (${plural(q.nbQuestions || 0, 'question', 'questions')})` })),
      next ? h('a', { class: `btn ${quizzes.length ? '' : 'primary'}`, href: `#/c/${next.id}`, 'data-replace': '' }, h('span', null, `Cours suivant : ${next.titre}`), icon('right')) : null,
      !next && matiere.quiz.length ? h('a', { class: 'btn', href: `#/qm/${matiere.id}` }, icon('play'), 'Quiz de la matière') : null));

  setView(
    crumbs([{ label: 'Accueil', href: '#/' }, { label: annee.nom, href: `#/a/${annee.id}` }, { label: matiere.nom, href: `#/m/${matiere.id}` }, { label: cours.titre }]),
    h('div', { class: 'page-head row between', style: { alignItems: 'flex-end' } },
      h('div', { class: 'grow' }, h('h1', null, cours.titre), h('p', { class: 'muted' }, `${matiere.nom} · cours ${i + 1} sur ${list.length}`)),
      quizzes.length ? quizButton(quizzes[0], { primary: true, label: quizzes.length > 1 ? 'Quiz du cours' : 'Faire le quiz' }) : null),
    list.length > 1 ? picker : null,
    h('div', { class: 'viewer-bar' },
      navBtn(prev, -1), pageInfo, navBtn(next, 1),
      h('span', { class: 'bar-sep' }),
      btnMinus, zoomVal, btnPlus,
      h('span', { class: 'grow' }),
      btnDl),
    pagesBox,
    endCard,
  );

  // Flèches du clavier : cours précédent / suivant.
  const onKey = (e) => {
    if (e.target.closest('input, select, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft' && prev) router.go(`/c/${prev.id}`, { replace: true });
    if (e.key === 'ArrowRight' && next) router.go(`/c/${next.id}`, { replace: true });
  };
  document.addEventListener('keydown', onKey);

  let viewer = null;
  let alive = true;
  cleanup = () => { alive = false; document.removeEventListener('keydown', onKey); if (viewer) viewer.destroy(); };
  try {
    const bytes = await coursBytes(cours);
    if (!alive) return;
    const pdf = await openPdf(bytes);
    if (!alive) { pdf.destroy(); return; }
    clear(pagesBox);
    viewer = await mountViewer(pagesBox, pdf, {
      onZoom: (z) => { zoomVal.textContent = `${Math.round(z * 100)} %`; },
      onPage: (p, n) => { pageInfo.textContent = `${p} / ${n}`; },
    });
    btnMinus.disabled = btnPlus.disabled = btnDl.disabled = false;
    btnMinus.onclick = () => viewer.setZoom(viewer.zoom - 0.25);
    btnPlus.onclick = () => viewer.setZoom(viewer.zoom + 0.25);
    btnDl.onclick = () => downloadBytes(bytes, `${safeFilename(cours.titre)}.pdf`);
  } catch (e) {
    if (!alive) return;
    clear(pagesBox).append(h('div', { class: 'notice bad' }, e.message));
  }
}

/** Cours en surimpression (depuis un quiz) : se ferme sans perdre les réponses en cours. */
function openCoursOverlay(cours) {
  let viewer = null;
  let closed = false;
  const pagesBox = h('div', { class: 'pdf-pages' }, loader('Déchiffrement du cours…'));
  const scroller = h('div', { class: 'sheet-body' }, pagesBox);
  const pageInfo = h('span', { class: 'zoom-val' }, '');
  const close = () => {
    if (closed) return;
    closed = true;
    if (viewer) viewer.destroy();
    back.remove();
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const back = h('div', { class: 'modal-backdrop sheet-backdrop', role: 'dialog', 'aria-modal': 'true', 'aria-label': cours.titre },
    h('div', { class: 'sheet' },
      h('div', { class: 'sheet-head' },
        h('div', { class: 'grow' }, h('div', { class: 'card-title' }, cours.titre), h('div', { class: 'tiny muted' }, 'Vos réponses au quiz sont conservées.')),
        pageInfo,
        h('button', { type: 'button', class: 'btn primary', onClick: close }, icon('close'), h('span', null, 'Retour au quiz'))),
      scroller));
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(back);
  document.body.style.overflow = 'hidden';
  (async () => {
    try {
      const bytes = await coursBytes(cours);
      if (closed) return;
      const pdf = await openPdf(bytes);
      if (closed) { pdf.destroy(); return; }
      clear(pagesBox);
      viewer = await mountViewer(pagesBox, pdf, { scrollRoot: scroller, onPage: (p, n) => { pageInfo.textContent = `${p} / ${n}`; } });
    } catch (e) {
      if (!closed) clear(pagesBox).append(h('div', { class: 'notice bad' }, e.message));
    }
  })();
  return close;
}

// ---------------------------------------------------------------------------
// Quiz
function quizGuard(active) {
  if (!router) return;
  if (active) router.setGuard(() => window.confirm('Quitter le quiz ? Vos réponses ne seront pas enregistrées.'));
  else router.clearGuard();
}

async function quizPage({ id }) {
  const loc = locateQuiz(idx, id);
  if (!loc) return notFound();
  const { annee, matiere, quiz } = loc;
  const list = sorted(matiere.cours);
  const cours = quiz.coursId ? list.find((c) => c.id === quiz.coursId) : null;
  const next = cours ? list[list.indexOf(cours) + 1] : null;
  const box = h('div', null, loader('Chargement du quiz…'));
  setView(crumbs([
    { label: 'Accueil', href: '#/' }, { label: annee.nom, href: `#/a/${annee.id}` }, { label: matiere.nom, href: `#/m/${matiere.id}/quiz` },
    cours ? { label: cours.titre, href: `#/c/${cours.id}` } : null,
    { label: quiz.titre },
  ].filter(Boolean)), box);
  let alive = true;
  let closeOverlay = null;
  cleanup = () => { alive = false; quizGuard(false); if (closeOverlay) closeOverlay(); };
  const parent = cours ? `/c/${cours.id}` : `/m/${matiere.id}/quiz`;
  try {
    const content = await data.quiz(key, quiz);
    if (!alive) return;
    if (!content.questions || !content.questions.length) {
      clear(box).append(empty('Ce quiz ne contient pas encore de question.', 'quiz'));
      return;
    }
    runQuiz(box, {
      titre: quiz.titre,
      questions: content.questions,
      backLabel: cours ? 'Retour au cours' : 'Retour à la matière',
      headerExtra: cours ? () => h('div', { class: 'row', style: { marginTop: '4px' } },
        h('span', { class: 'muted small' }, `Quiz du cours « ${cours.titre} »`),
        h('button', { type: 'button', class: 'btn sm', onClick: () => { closeOverlay = openCoursOverlay(cours); } }, icon('book'), 'Revoir le cours')) : null,
      resultActions: () => [
        !preview ? shareBtn(() => shareQuiz(quiz)) : null,
        !preview ? correctionBtn(() => openShareCorrection(quizShareInfo(quiz, lastAttempt && lastAttempt.id))) : null,
        next ? h('a', { class: 'btn', href: `#/c/${next.id}` }, h('span', null, 'Cours suivant'), icon('right')) : null,
        !next ? h('a', { class: 'btn', href: `#/qm/${matiere.id}` }, icon('play'), 'Quiz de la matière') : null,
      ],
      onGuard: quizGuard,
      onExit: () => { quizGuard(false); router.back(parent); },
      onFinish: (r, detail) => {
        if (preview) return;
        lastAttempt = addAttempt({ kind: 'quiz', quizId: quiz.id, matiereId: matiere.id, titre: quiz.titre, points: r.points, total: r.total, sur20: r.sur20, pct: r.pct, detail });
      },
    });
  } catch (e) {
    if (alive) clear(box).append(h('div', { class: 'notice bad' }, e.message));
  }
}

async function quizMatierePage({ id }) {
  const loc = locateMatiere(idx, id);
  if (!loc) return notFound();
  const { annee, matiere } = loc;
  const box = h('div', null, loader('Préparation du quiz de la matière…'));
  setView(crumbs([{ label: 'Accueil', href: '#/' }, { label: annee.nom, href: `#/a/${annee.id}` }, { label: matiere.nom, href: `#/m/${matiere.id}/quiz` }, { label: 'Quiz de la matière' }]), box);
  let alive = true;
  cleanup = () => { alive = false; quizGuard(false); };
  try {
    const groups = [];
    for (const g of quizGroups(matiere)) {
      const qs = [];
      for (const quiz of g.quiz) {
        const content = await data.quiz(key, quiz);
        for (const q of content.questions || []) qs.push({ ...q, id: `${quiz.id}:${q.id}` });
      }
      groups.push(qs);
    }
    if (!alive) return;
    if (!groups.some((g) => g.length)) {
      clear(box).append(empty('Aucune question disponible pour cette matière.', 'quiz'));
      return;
    }
    runQuiz(box, {
      titre: `Quiz de la matière · ${matiere.nom}`,
      questions: buildMatiereQuiz(groups),
      regenerate: () => buildMatiereQuiz(groups),
      backLabel: 'Retour à la matière',
      resultActions: () => (preview ? [] : [
        shareBtn(() => shareMatiere(matiere)),
        correctionBtn(() => openShareCorrection(matiereShareInfo(matiere, lastAttempt && lastAttempt.id))),
      ]),
      onGuard: quizGuard,
      onExit: () => { quizGuard(false); router.back(`/m/${matiere.id}/quiz`); },
      onFinish: (r, detail) => {
        if (preview) return;
        lastAttempt = addAttempt({ kind: 'matiere', matiereId: matiere.id, titre: `Quiz de la matière · ${matiere.nom}`, points: r.points, total: r.total, sur20: r.sur20, pct: r.pct, detail });
      },
    });
  } catch (e) {
    if (alive) clear(box).append(h('div', { class: 'notice bad' }, e.message));
  }
}

// ---------------------------------------------------------------------------
function registerSW() {
  if (!('serviceWorker' in navigator) || preview) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  navigator.serviceWorker.register('sw.js').catch(() => { /* PWA facultative */ });
}

