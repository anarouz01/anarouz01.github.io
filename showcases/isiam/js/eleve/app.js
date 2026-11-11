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
      class: 'tab', role: 'tab', 'aria-selected': String(a.id === selected.id), href: `#/?annee=${a.id}`,
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
        h('button', { type: 'button', class: 'btn ghost sm', onClick: async () => {
          if (await confirmDialog('Effacer l\'historique ?', 'Toutes vos notes enregistrées sur cet appareil seront supprimées.', { ok: 'Effacer', danger: true })) {
            clearHistory();
            router.refresh();
          }
        } }, 'Effacer l\'historique')),
    ];
  }

  setView(
    h('div', { class: 'page-head' }, h('h1', null, 'Mes révisions'), h('p', { class: 'muted' }, 'Choisissez une année pour accéder aux cours et aux quiz.')),
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
      class: 'tab', role: 'tab', 'aria-selected': String(k === tab), href: `#/m/${matiere.id}/${k}`,
    }, icon(ic), label, h('span', { class: 'count' }, String(n))))),
    body,
  );
}

function coursTab(matiere) {
  const list = sorted(matiere.cours);
  if (!list.length) return empty('Aucun cours pour l\'instant.', 'book');
  return h('div', { class: 'list' }, list.map((c, i) => h('a', { class: 'list-item', href: `#/c/${c.id}` },
    h('span', { class: 'list-num' }, String(i + 1)),
    h('span', { class: 'grow' }, h('span', { class: 'title' }, c.titre, ' ', draftBadge(c)), h('span', { class: 'sub' }, c.pages ? plural(c.pages, 'page', 'pages') : 'PDF')),
    icon('right'))));
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
      h('a', { class: 'btn primary', href: `#/qm/${matiere.id}` }, icon('play'), 'Commencer')));

  const groups = quizGroups(matiere).filter((g) => g.quiz.length);
  return h('div', null, hero, groups.map((g) => h('section', { style: { marginBottom: '24px' } },
    h('h3', { class: 'muted' }, g.cours ? g.cours.titre : 'Quiz sur toute la matière'),
    h('div', { class: 'list' }, g.quiz.map((q) => {
      const st = quizStatsLine(q);
      return h('a', { class: 'list-item', href: `#/q/${q.id}` },
        h('span', { class: 'grow' }, h('span', { class: 'title' }, q.titre, ' ', draftBadge(q)), h('span', { class: 'sub' }, st.text)),
        st.done ? h('span', { class: `badge ${scoreClass(st.last.sur20)}` }, `${formatNote(st.last.sur20)}/20`) : h('span', { class: 'badge' }, 'Jamais fait'),
        icon('right'));
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
async function coursPage({ id }) {
  const loc = locateCours(idx, id);
  if (!loc) return notFound();
  const { annee, matiere, cours } = loc;
  const list = sorted(matiere.cours);
  const i = list.findIndex((c) => c.id === id);
  const prev = list[i - 1];
  const next = list[i + 1];

  const pagesBox = h('div', { class: 'pdf-pages' }, loader('Déchiffrement du cours…'));
  const zoomVal = h('span', { class: 'zoom-val' }, '100 %');
  const btnMinus = h('button', { type: 'button', class: 'btn icon', 'aria-label': 'Dézoomer', disabled: true }, icon('zoomOut'));
  const btnPlus = h('button', { type: 'button', class: 'btn icon', 'aria-label': 'Zoomer', disabled: true }, icon('zoomIn'));
  const btnFit = h('button', { type: 'button', class: 'btn sm', disabled: true }, 'Ajuster');
  const btnDl = h('button', { type: 'button', class: 'btn sm', disabled: true }, icon('download'), h('span', { class: 'hide-mobile' }, 'Télécharger le PDF'));

  setView(
    crumbs([{ label: 'Accueil', href: '#/' }, { label: annee.nom, href: `#/a/${annee.id}` }, { label: matiere.nom, href: `#/m/${matiere.id}` }, { label: cours.titre }]),
    h('div', { class: 'page-head' }, h('h1', null, cours.titre, ' ', draftBadge(cours)), h('p', { class: 'muted' }, `${matiere.nom} · cours ${i + 1} sur ${list.length}`)),
    h('div', { class: 'viewer-bar' }, btnMinus, zoomVal, btnPlus, btnFit, h('span', { class: 'grow' }), btnDl),
    pagesBox,
    h('nav', { class: 'pdf-nav' },
      prev ? h('a', { class: 'btn', href: `#/c/${prev.id}` }, icon('left'), h('span', null, prev.titre)) : h('span'),
      next ? h('a', { class: 'btn', href: `#/c/${next.id}` }, h('span', null, next.titre), icon('right')) : h('a', { class: 'btn', href: `#/m/${matiere.id}/quiz` }, 'Quiz de la matière', icon('right'))),
  );

  let viewer = null;
  let alive = true;
  cleanup = () => { alive = false; if (viewer) viewer.destroy(); };
  try {
    const bytes = await data.cours(key, cours);
    if (!alive) return;
    const pdf = await openPdf(bytes);
    if (!alive) { pdf.destroy(); return; }
    clear(pagesBox);
    viewer = await mountViewer(pagesBox, pdf, { onZoom: (z) => { zoomVal.textContent = `${Math.round(z * 100)} %`; } });
    btnMinus.disabled = btnPlus.disabled = btnFit.disabled = btnDl.disabled = false;
    btnMinus.onclick = () => viewer.setZoom(viewer.zoom - 0.25);
    btnPlus.onclick = () => viewer.setZoom(viewer.zoom + 0.25);
    btnFit.onclick = () => viewer.setZoom(1);
    btnDl.onclick = () => downloadBytes(bytes, `${safeFilename(cours.titre)}.pdf`);
  } catch (e) {
    if (!alive) return;
    clear(pagesBox).append(h('div', { class: 'notice bad' }, e.message));
  }
}

// ---------------------------------------------------------------------------
function quizGuard(active) {
  if (!router) return;
  if (active) router.setGuard(() => window.confirm('Quitter le quiz ? Vos réponses ne seront pas enregistrées.'));
  else router.clearGuard();
}

async function quizPage({ id }) {
  const loc = locateQuiz(idx, id);
  if (!loc) return notFound();
  const { annee, matiere, quiz } = loc;
  const box = h('div', null, loader('Chargement du quiz…'));
  setView(crumbs([{ label: 'Accueil', href: '#/' }, { label: annee.nom, href: `#/a/${annee.id}` }, { label: matiere.nom, href: `#/m/${matiere.id}/quiz` }, { label: quiz.titre }]), box);
  let alive = true;
  cleanup = () => { alive = false; quizGuard(false); };
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
      backLabel: 'Retour à la matière',
      onGuard: quizGuard,
      onExit: () => { quizGuard(false); router.go(`/m/${matiere.id}/quiz`); },
      onFinish: (r) => {
        if (preview) return;
        addAttempt({ kind: 'quiz', quizId: quiz.id, matiereId: matiere.id, titre: quiz.titre, points: r.points, total: r.total, sur20: r.sur20, pct: r.pct });
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
      onGuard: quizGuard,
      onExit: () => { quizGuard(false); router.go(`/m/${matiere.id}/quiz`); },
      onFinish: (r) => {
        if (preview) return;
        addAttempt({ kind: 'matiere', matiereId: matiere.id, titre: `Quiz de la matière · ${matiere.nom}`, points: r.points, total: r.total, sur20: r.sur20, pct: r.pct });
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

// Accès console pour le dépannage : effacer l'historique local.
window.isiamClearHistory = clearHistory;
