// ==========================================================================
// Admin : éléments partagés (contexte, enregistrement, sélecteur de place).
// ==========================================================================
import { encryptJSON, forgetKey } from '../crypto.js';
import { PATHS, clone, sorted, locateMatiere, locateSemestre } from '../store.js';
import { h, clear, toast, promptDialog } from '../ui.js';

/** Contexte partagé par toutes les vues admin (rempli par app.js). */
export const ctx = {
  gh: null,
  key: null,
  cryptoConfig: null,
  index: null,
  router: null,
  view: null,
  cfg: null,
};

// ---------- Indicateur d'activité bloquant ----------
export async function withBusy(text, fn) {
  const label = h('div', null, text);
  const bar = h('div', { class: 'progress', style: { marginTop: '12px', display: 'none' } }, h('span', { style: { width: '0%' } }));
  const back = h('div', { class: 'modal-backdrop', 'aria-busy': 'true' },
    h('div', { class: 'modal', role: 'alertdialog', 'aria-live': 'polite' },
      h('div', { class: 'row' }, h('div', { class: 'spinner' }), label), bar));
  document.body.append(back);
  const progress = (ratio, txt) => {
    bar.style.display = '';
    bar.firstChild.style.width = `${Math.round(ratio * 100)}%`;
    if (txt) label.textContent = txt;
  };
  try {
    return await fn(progress);
  } finally {
    back.remove();
  }
}

/**
 * Applique une modification à l'index et publie le tout en un commit.
 * mutate(next) peut être async et renvoyer { files: [{path, bytes}], deleted: [paths], result }.
 */
export async function save(message, mutate, { silent = false } = {}) {
  const next = clone(ctx.index);
  let out;
  try {
    out = (await mutate(next)) || {};
  } catch (e) {
    toast(e.message, 'bad');
    throw e;
  }
  next.majLe = new Date().toISOString();
  const changes = [
    ...(out.files || []),
    { path: PATHS.index, bytes: await encryptJSON(ctx.key, next) },
    ...(out.deleted || []).map((p) => ({ path: p, delete: true })),
  ];
  try {
    await withBusy('Enregistrement sur GitHub…', () => ctx.gh.commit(changes, neutralMessage(message)));
  } catch (e) {
    toast(e.message, 'bad', 6000);
    throw e;
  }
  ctx.index = next;
  if (!silent) toast('Enregistré · visible par l\'élève sous 1 à 10 min', 'good');
  return out.result;
}

/**
 * Le dépôt est public : les messages de commit ne doivent révéler aucun titre.
 * « Ajoute le cours « X » (Marketing) » → « Ajoute le cours ».
 */
export function neutralMessage(message) {
  return message.replace(/«[^»]*»/g, '').replace(/\s*\([^)]*\)/g, '').replace(/\s+en\s*$/, '').replace(/\s{2,}/g, ' ').trim();
}

/** Variante qui avale l'erreur (déjà affichée) et renvoie null. */
export async function trySave(message, mutate, opts) {
  try { return await save(message, mutate, opts); } catch { return null; }
}

export function matiereOptions(index) {
  const opts = [];
  for (const a of sorted(index.annees)) {
    for (const s of a.semestres) {
      for (const m of sorted(s.matieres)) opts.push({ value: m.id, label: m.nom, group: `${a.nom} · ${s.nom}` });
    }
  }
  return opts;
}

export function semestreOptions(index) {
  const opts = [];
  for (const a of sorted(index.annees)) for (const s of a.semestres) opts.push({ value: s.id, label: `${a.nom} · ${s.nom}` });
  return opts;
}

export function placeLabel(index, matiereId) {
  const loc = locateMatiere(index, matiereId);
  return loc ? `${loc.annee.nom} · ${loc.semestre.nom} · ${loc.matiere.nom}` : '';
}

/**
 * Sélecteurs en cascade Année → Semestre → Matière, avec « + Nouvelle matière… ».
 * Renvoie { el, value() → { semestreId, matiereId | null, newMatiere | null }, onChange }.
 */
export function placePicker(index, { matiereId = null, onChange } = {}) {
  const annees = sorted(index.annees);
  let newMatiere = null;
  const selA = h('select', { class: 'select', id: 'pp-annee', 'aria-label': 'Année' });
  const selS = h('select', { class: 'select', id: 'pp-semestre', 'aria-label': 'Semestre' });
  const selM = h('select', { class: 'select', id: 'pp-matiere', 'aria-label': 'Matière' });

  const init = matiereId ? locateMatiere(index, matiereId) : null;
  for (const a of annees) selA.append(h('option', { value: a.id, selected: init && init.annee.id === a.id }, a.nom));
  if (!init && annees.length) selA.value = annees[annees.length - 1].id;

  function fillS(keep) {
    const a = annees.find((x) => x.id === selA.value);
    clear(selS);
    if (!a) return;
    for (const s of a.semestres) selS.append(h('option', { value: s.id }, s.nom));
    if (keep) selS.value = keep;
  }
  function fillM(keep) {
    clear(selM);
    newMatiere = null;
    const loc = locateSemestre(index, selS.value);
    selM.append(h('option', { value: '' }, '— Choisir une matière —'));
    if (loc) for (const m of sorted(loc.semestre.matieres)) selM.append(h('option', { value: m.id }, m.nom + (m.brouillon ? ' (brouillon)' : '')));
    selM.append(h('option', { value: '__new' }, '+ Nouvelle matière…'));
    if (keep) selM.value = keep;
  }
  fillS(init ? init.semestre.id : null);
  fillM(init ? init.matiere.id : null);

  const emit = () => { if (onChange) onChange(api.value()); };
  selA.addEventListener('change', () => { fillS(); fillM(); emit(); });
  selS.addEventListener('change', () => { fillM(); emit(); });
  selM.addEventListener('change', async () => {
    if (selM.value === '__new') {
      const nom = await promptDialog('Nouvelle matière', { label: 'Nom de la matière', placeholder: 'ex. Marketing fondamental', ok: 'Ajouter' });
      if (!nom) { selM.value = ''; emit(); return; }
      [...selM.querySelectorAll('option[data-new]')].forEach((o) => o.remove());
      const opt = h('option', { value: '__pending', 'data-new': '1' }, `${nom} (nouvelle)`);
      selM.insertBefore(opt, selM.lastChild);
      selM.value = '__pending';
      newMatiere = nom;
    } else if (selM.value !== '__pending') {
      newMatiere = null;
    }
    emit();
  });

  const el = h('div', { class: 'grid-3' },
    h('div', { class: 'field' }, h('label', { for: 'pp-annee' }, 'Année'), selA),
    h('div', { class: 'field' }, h('label', { for: 'pp-semestre' }, 'Semestre'), selS),
    h('div', { class: 'field' }, h('label', { for: 'pp-matiere' }, 'Matière'), selM));

  const api = {
    el,
    value() {
      return {
        semestreId: selS.value || null,
        matiereId: selM.value && !selM.value.startsWith('__') ? selM.value : null,
        newMatiere: selM.value === '__pending' ? newMatiere : null,
      };
    },
  };
  return api;
}

export function guardDirty(isDirty) {
  ctx.router.setGuard(() => !isDirty() || window.confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?'));
}

export const CFG_KEY = 'isiam.github';

export function forgetThisPc() {
  try {
    localStorage.removeItem(CFG_KEY);
    Object.keys(localStorage).filter((k) => k.startsWith('isiam.quizDraft')).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignoré */ }
  return forgetKey('admin');
}

