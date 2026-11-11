// ==========================================================================
// Admin : éditeur de quiz (saisie question par question + corrigé).
// ==========================================================================
import { encryptJSON, decryptJSON } from '../crypto.js';
import {
  PATHS, newId, sorted, addMatiere, addQuiz, moveQuiz, locateQuiz, locateMatiere, validateQuestions,
} from '../store.js';
import { h, put, clear, icon, iconBtn, crumbs, loader, modal, toast, confirmDialog } from '../ui.js';
import { runQuiz } from '../quiz-ui.js';
import { ctx, save, placePicker, guardDirty } from './common.js';

const MAX_CHOICES = 8;
const draftKey = (id) => `isiam.quizDraft.${id || 'nouveau'}`;

function readDraft(id) {
  try { return JSON.parse(localStorage.getItem(draftKey(id)) || 'null'); } catch { return null; }
}
function writeDraft(id, d) {
  try { localStorage.setItem(draftKey(id), JSON.stringify(d)); } catch { /* ignoré */ }
}
function dropDraft(id) {
  try { localStorage.removeItem(draftKey(id)); } catch { /* ignoré */ }
}

function newQuestion(type) {
  return type === 'qcm'
    ? { id: newId('x'), type: 'qcm', enonce: '', choix: ['', '', '', ''], bonnes: [] }
    : { id: newId('x'), type: 'ouverte', enonce: '', reponse: '' };
}

/** Nettoie les questions avant enregistrement / test (propositions vides retirées). */
function cleanQuestions(qs) {
  return qs.map((q) => {
    if (q.type === 'qcm') {
      const keep = [];
      q.choix.forEach((c, i) => { if (c.trim() || q.bonnes.includes(i)) keep.push(i); });
      return { id: q.id, type: 'qcm', enonce: q.enonce.trim(), choix: keep.map((i) => q.choix[i].trim()), bonnes: keep.map((i, k) => (q.bonnes.includes(i) ? k : -1)).filter((k) => k >= 0) };
    }
    return { id: q.id, type: 'ouverte', enonce: q.enonce.trim(), reponse: q.reponse.trim() };
  });
}

export async function quizEditorView(id, query) {
  if (!ctx.index.annees.length) {
    ctx.view.append(h('div', { class: 'page-head' }, h('h1', null, 'Ajouter un quiz')),
      h('div', { class: 'notice' }, 'Créez d\'abord une année dans ', h('a', { href: '#/' }, 'Contenus'), '.'));
    return;
  }

  let existing = null;
  let questions = [];
  let meta = { titre: '', coursId: query.c || null, brouillon: false, matiereId: query.m || null };

  if (id) {
    const loc = locateQuiz(ctx.index, id);
    if (!loc) { ctx.view.append(h('div', { class: 'empty' }, 'Quiz introuvable.')); return; }
    existing = loc;
    meta = { titre: loc.quiz.titre, coursId: loc.quiz.coursId, brouillon: !!loc.quiz.brouillon, matiereId: loc.matiere.id };
    ctx.view.append(loader('Déchiffrement du quiz…'));
    try {
      const raw = await ctx.gh.getFile(PATHS.quiz(id));
      questions = raw ? ((await decryptJSON(ctx.key, raw)).questions || []) : [];
    } catch (e) {
      clear(ctx.view).append(h('div', { class: 'notice bad' }, e.message));
      return;
    }
    clear(ctx.view);
    questions = questions.map((q) => (q.type === 'qcm' ? { ...q, choix: [...q.choix], bonnes: [...q.bonnes] } : { ...q }));
  }
  if (!questions.length) questions = [newQuestion('qcm')];

  let dirty = false;
  guardDirty(() => dirty);
  let draftTimer = null;
  const touch = () => {
    dirty = true;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      writeDraft(id, { ...meta, titre: titre.value, brouillon: brouillon.checked, coursId: rattache.value || null, questions, savedAt: new Date().toISOString() });
    }, 400);
  };

  // ---------- En-tête ----------
  const picker = placePicker(ctx.index, { matiereId: meta.matiereId, onChange: () => { fillRattache(); touch(); } });
  const rattache = h('select', { class: 'select', id: 'q-cours' });
  function fillRattache(keep) {
    const v = picker.value();
    clear(rattache).append(h('option', { value: '' }, 'Toute la matière'));
    const loc = v.matiereId ? locateMatiere(ctx.index, v.matiereId) : null;
    if (loc) for (const c of sorted(loc.matiere.cours)) rattache.append(h('option', { value: c.id }, `Cours : ${c.titre}`));
    rattache.value = keep && [...rattache.options].some((o) => o.value === keep) ? keep : '';
  }
  fillRattache(meta.coursId);
  rattache.addEventListener('change', touch);
  const titre = h('input', { class: 'input', id: 'q-titre', required: true, value: meta.titre, placeholder: 'ex. Quiz chapitre 1' });
  titre.addEventListener('input', touch);
  const brouillon = h('input', { type: 'checkbox', checked: meta.brouillon });
  brouillon.addEventListener('change', touch);

  // ---------- Questions ----------
  const list = h('div');
  const counter = h('span', { class: 'muted small' });

  function renderQuestions() {
    clear(list);
    counter.textContent = `${questions.length} question${questions.length > 1 ? 's' : ''}`;
    questions.forEach((q, i) => list.append(questionCard(q, i)));
  }

  function questionCard(q, i) {
    const typeSel = h('select', { class: 'select', style: { width: 'auto', minHeight: '34px', padding: '4px 32px 4px 10px' }, 'aria-label': 'Type de question' },
      h('option', { value: 'qcm', selected: q.type === 'qcm' }, 'QCM'),
      h('option', { value: 'ouverte', selected: q.type === 'ouverte' }, 'Question ouverte'));
    typeSel.addEventListener('change', () => {
      const enonce = q.enonce;
      const nq = newQuestion(typeSel.value);
      nq.id = q.id;
      nq.enonce = enonce;
      questions[i] = nq;
      touch();
      renderQuestions();
    });
    const enonce = h('textarea', { class: 'textarea', rows: 2, placeholder: 'Énoncé de la question', 'aria-label': `Énoncé de la question ${i + 1}` });
    enonce.value = q.enonce;
    enonce.addEventListener('input', () => { q.enonce = enonce.value; touch(); });

    let body;
    if (q.type === 'qcm') {
      body = h('div', null,
        h('div', { class: 'label', style: { margin: '12px 0 8px' } }, 'Propositions · cochez la ou les bonnes réponses'),
        q.choix.map((c, k) => {
          const good = h('input', { type: 'checkbox', checked: q.bonnes.includes(k), 'aria-label': `Proposition ${k + 1} correcte` });
          good.addEventListener('change', () => {
            q.bonnes = good.checked ? [...new Set([...q.bonnes, k])].sort((a, b) => a - b) : q.bonnes.filter((x) => x !== k);
            touch();
          });
          const inp = h('input', { class: 'input', value: c, placeholder: `Proposition ${k + 1}`, 'aria-label': `Proposition ${k + 1}` });
          inp.addEventListener('input', () => { q.choix[k] = inp.value; touch(); });
          return h('div', { class: 'choice-edit' },
            h('label', { class: 'check', title: 'Bonne réponse' }, good, h('span', { class: 'hide-mobile' }, 'Bonne')),
            inp,
            q.choix.length > 2 ? iconBtn('trash', 'Retirer la proposition', () => {
              q.choix.splice(k, 1);
              q.bonnes = q.bonnes.filter((x) => x !== k).map((x) => (x > k ? x - 1 : x));
              touch();
              renderQuestions();
            }) : null);
        }),
        q.choix.length < MAX_CHOICES ? h('button', { type: 'button', class: 'btn sm ghost', onClick: () => { q.choix.push(''); touch(); renderQuestions(); } }, icon('plus'), 'Proposition') : null);
    } else {
      const rep = h('textarea', { class: 'textarea', rows: 3, placeholder: 'Réponse attendue (affichée à l\'élève pour son auto-évaluation)', 'aria-label': `Réponse attendue ${i + 1}` });
      rep.value = q.reponse;
      rep.addEventListener('input', () => { q.reponse = rep.value; touch(); });
      body = h('div', null, h('div', { class: 'label', style: { margin: '12px 0 8px' } }, 'Réponse attendue'), rep);
    }

    return h('div', { class: 'q-editor' },
      h('div', { class: 'q-head' },
        h('strong', null, `Question ${i + 1}`), typeSel, h('span', { class: 'grow' }),
        iconBtn('up', 'Monter', () => { if (i > 0) { [questions[i - 1], questions[i]] = [questions[i], questions[i - 1]]; touch(); renderQuestions(); } }),
        iconBtn('down', 'Descendre', () => { if (i < questions.length - 1) { [questions[i + 1], questions[i]] = [questions[i], questions[i + 1]]; touch(); renderQuestions(); } }),
        iconBtn('copy', 'Dupliquer', () => { questions.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(q)), id: newId('x') }); touch(); renderQuestions(); }),
        iconBtn('trash', 'Supprimer la question', async () => {
          if (q.enonce.trim() && !(await confirmDialog(`Supprimer la question ${i + 1} ?`, null, { ok: 'Supprimer', danger: true }))) return;
          questions.splice(i, 1);
          touch();
          renderQuestions();
        }, 'danger')),
      enonce, body);
  }

  function add(type) {
    questions.push(newQuestion(type));
    touch();
    renderQuestions();
    const last = list.lastElementChild;
    if (last) { last.scrollIntoView({ behavior: 'smooth', block: 'center' }); last.querySelector('textarea').focus({ preventScroll: true }); }
  }

  const err = h('div', { class: 'notice bad', role: 'alert', hidden: true });
  function check() {
    const cleaned = cleanQuestions(questions);
    const errors = validateQuestions(cleaned);
    if (!titre.value.trim()) errors.unshift('Indiquez un titre.');
    if (errors.length) {
      clear(err).append(h('strong', null, 'À corriger :'), h('ul', { style: { margin: '6px 0 0', paddingLeft: '20px' } }, errors.slice(0, 8).map((x) => h('li', null, x))));
      err.hidden = false;
      err.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }
    err.hidden = true;
    return cleaned;
  }

  function test() {
    const cleaned = check();
    if (!cleaned) return;
    const box = h('div');
    const m = modal(box, { wide: true });
    runQuiz(box, {
      titre: `Aperçu · ${titre.value.trim()}`,
      questions: cleaned,
      backLabel: 'Fermer l\'aperçu',
      onExit: () => m.close(),
    });
  }

  async function submit() {
    const cleaned = check();
    if (!cleaned) return;
    const place = picker.value();
    if (!place.matiereId && !place.newMatiere) { clear(err).append('Choisissez ou créez une matière.'); err.hidden = false; return; }
    const t = titre.value.trim();
    const coursId = rattache.value || null;
    const matName = place.newMatiere || locateMatiere(ctx.index, place.matiereId).matiere.nom;
    try {
      const mid = await save(`${existing ? 'Modifie' : 'Ajoute'} le quiz « ${t} » (${matName}, ${cleaned.length} questions)`, async (n) => {
        const targetMid = place.newMatiere ? addMatiere(n, place.semestreId, place.newMatiere).id : place.matiereId;
        let quiz;
        if (existing) {
          const loc = locateQuiz(n, existing.quiz.id);
          quiz = loc.matiere.id !== targetMid ? moveQuiz(n, existing.quiz.id, targetMid, coursId) : loc.quiz;
        } else {
          quiz = addQuiz(n, targetMid, { titre: t, coursId });
        }
        const target = locateMatiere(n, targetMid).matiere;
        Object.assign(quiz, {
          titre: t,
          coursId: coursId && target.cours.some((c) => c.id === coursId) ? coursId : null,
          brouillon: brouillon.checked,
          nbQuestions: cleaned.length,
          v: Date.now(),
        });
        const bytes = await encryptJSON(ctx.key, { id: quiz.id, questions: cleaned });
        return { files: [{ path: PATHS.quiz(quiz.id), bytes }], result: targetMid };
      });
      dirty = false;
      clearTimeout(draftTimer);
      dropDraft(id);
      ctx.router.clearGuard();
      ctx.router.go(`/m/${mid}`);
    } catch { /* erreur déjà affichée */ }
  }

  // ---------- Brouillon de saisie ----------
  const saved = readDraft(id);
  const draftNotice = saved && saved.questions && saved.questions.length
    ? h('div', { class: 'notice warn row between' },
      h('span', null, `Une saisie non enregistrée du ${new Date(saved.savedAt).toLocaleString('fr-FR')} a été retrouvée.`),
      h('span', { class: 'row' },
        h('button', { type: 'button', class: 'btn sm', onClick: () => { dropDraft(id); draftNotice.remove(); } }, 'Ignorer'),
        h('button', { type: 'button', class: 'btn sm primary', onClick: () => {
          questions = saved.questions;
          titre.value = saved.titre || '';
          brouillon.checked = !!saved.brouillon;
          fillRattache(saved.coursId);
          dirty = true;
          draftNotice.remove();
          renderQuestions();
          toast('Saisie restaurée');
        } }, 'Restaurer')))
    : null;

  renderQuestions();
  put(ctx.view,
    crumbs([{ label: 'Contenus', href: '#/' }, existing ? { label: existing.matiere.nom, href: `#/m/${existing.matiere.id}` } : null, { label: existing ? existing.quiz.titre : 'Nouveau quiz' }].filter(Boolean)),
    h('div', { class: 'page-head' }, h('h1', null, existing ? 'Modifier le quiz' : 'Ajouter un quiz'),
      h('p', { class: 'muted' }, 'Saisissez chaque question avec sa correction. L\'élève ne voit les réponses qu\'à la fin du quiz.')),
    draftNotice,
    h('div', { class: 'card', style: { marginBottom: '24px' } },
      picker.el,
      h('div', { class: 'grid-2' },
        h('div', { class: 'field' }, h('label', { for: 'q-cours' }, 'Rattachement'), rattache),
        h('div', { class: 'field' }, h('label', { for: 'q-titre' }, 'Titre du quiz'), titre)),
      h('label', { class: 'check' }, brouillon, 'Brouillon (invisible pour l\'élève)')),
    h('div', { class: 'row between', style: { marginBottom: '12px' } }, h('h2', { style: { margin: 0 } }, 'Questions'), counter),
    list,
    h('div', { class: 'row', style: { marginBottom: '24px' } },
      h('button', { type: 'button', class: 'btn', onClick: () => add('qcm') }, icon('plus'), 'QCM'),
      h('button', { type: 'button', class: 'btn', onClick: () => add('ouverte') }, icon('plus'), 'Question ouverte')),
    err,
    h('div', { class: 'form-actions', style: { position: 'sticky', bottom: '0', background: 'var(--bg)', padding: '12px 0', borderTop: '1px solid var(--border)' } },
      h('button', { type: 'button', class: 'btn', onClick: test }, icon('play'), 'Tester ce quiz'),
      h('button', { type: 'button', class: 'btn primary', onClick: submit }, 'Chiffrer et publier')),
  );
}

