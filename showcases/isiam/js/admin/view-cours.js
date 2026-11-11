// ==========================================================================
// Admin : ajout d'un cours (PDF chiffré + mise à jour de l'index, 1 commit).
// ==========================================================================
import { encryptBytes } from '../crypto.js';
import { PATHS, addMatiere, addCours, locateMatiere } from '../store.js';
import { h, put, clear, icon, crumbs, fmtBytes, plural, toast } from '../ui.js';
import { openPdf, renderThumb } from '../pdf-viewer.js';
import { ctx, save, placePicker, guardDirty } from './common.js';

export const MAX_BYTES = 20 * 1024 * 1024;
export const WARN_BYTES = 10 * 1024 * 1024;

/** Lit et contrôle un fichier PDF ; renvoie { bytes, name, pages, pdf } ou lève une erreur. */
export async function readPdf(file) {
  if (file.size > MAX_BYTES) throw new Error(`Fichier trop lourd (${fmtBytes(file.size)}). Maximum : 20 Mo. Compressez le PDF avant de l'ajouter.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const head = new TextDecoder().decode(bytes.subarray(0, 1024));
  if (!head.includes('%PDF-')) throw new Error('Ce fichier n\'est pas un PDF.');
  let pdf;
  try {
    pdf = await openPdf(bytes);
  } catch {
    throw new Error('PDF illisible ou protégé par mot de passe.');
  }
  return { bytes, name: file.name, pages: pdf.numPages, pdf };
}

/** Ouvre le sélecteur de fichier et renvoie le PDF lu (ou null). */
export function pickPdf() {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: 'application/pdf,.pdf', style: { display: 'none' } });
    input.addEventListener('change', async () => {
      const f = input.files[0];
      input.remove();
      if (!f) return resolve(null);
      try {
        const r = await readPdf(f);
        r.pdf.destroy();
        if (r.bytes.length > WARN_BYTES) toast(`PDF lourd (${fmtBytes(r.bytes.length)}) : l'affichage sera plus lent sur téléphone.`);
        resolve(r);
      } catch (e) {
        toast(e.message, 'bad', 6000);
        resolve(null);
      }
    });
    document.body.append(input);
    input.click();
  });
}

function titleFromFilename(name) {
  return name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function coursFormView(params, query) {
  if (!ctx.index.annees.length) {
    ctx.view.append(h('div', { class: 'page-head' }, h('h1', null, 'Ajouter un cours')),
      h('div', { class: 'notice' }, 'Créez d\'abord une année dans ', h('a', { href: '#/' }, 'Contenus'), '.'));
    return;
  }
  let picked = null;
  let dirty = false;
  guardDirty(() => dirty);

  const picker = placePicker(ctx.index, { matiereId: query.m || null });
  const titre = h('input', { class: 'input', id: 'c-titre', required: true, placeholder: 'ex. Chapitre 1 · Le mix marketing' });
  const brouillon = h('input', { type: 'checkbox', id: 'c-brouillon' });
  const fileInput = h('input', { type: 'file', id: 'c-file', accept: 'application/pdf,.pdf', class: 'sr-only' });
  const info = h('div', { class: 'small muted' });
  const thumb = h('div');
  const drop = h('label', { class: 'drop', for: 'c-file' },
    icon('file', 'icon'),
    h('div', { style: { fontWeight: 600 } }, 'Déposez le PDF ici ou cliquez pour le choisir'),
    h('div', { class: 'small' }, 'PDF de moins de 20 Mo'));
  const err = h('div', { class: 'notice bad', role: 'alert', hidden: true });
  const submit = h('button', { type: 'submit', class: 'btn primary', disabled: true }, 'Chiffrer et publier');

  titre.addEventListener('input', () => { dirty = true; });

  async function onFile(f) {
    err.hidden = true;
    clear(thumb);
    clear(info).append('Lecture du PDF…');
    picked = null;
    submit.disabled = true;
    try {
      const r = await readPdf(f);
      picked = r;
      dirty = true;
      if (!titre.value.trim()) titre.value = titleFromFilename(f.name);
      put(clear(info), h('strong', null, f.name), ` · ${plural(r.pages, 'page', 'pages')} · ${fmtBytes(r.bytes.length)}`,
        r.bytes.length > WARN_BYTES ? h('div', { class: 'notice warn', style: { marginTop: '8px' } }, 'PDF lourd : l\'affichage sera plus lent sur téléphone. Pensez à le compresser.') : null);
      const c = await renderThumb(r.pdf, 1, 260);
      thumb.append(h('div', { class: 'pdf-preview' }, c), h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, 'Aperçu de la première page'));
      r.pdf.destroy();
      submit.disabled = false;
    } catch (e) {
      clear(info);
      err.textContent = e.message;
      err.hidden = false;
    }
  }
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) onFile(fileInput.files[0]); });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  });

  const form = h('form', { onSubmit: async (e) => {
    e.preventDefault();
    err.hidden = true;
    const place = picker.value();
    if (!place.matiereId && !place.newMatiere) { err.textContent = 'Choisissez ou créez une matière.'; err.hidden = false; return; }
    if (!picked) { err.textContent = 'Ajoutez un fichier PDF.'; err.hidden = false; return; }
    if (!titre.value.trim()) { err.textContent = 'Indiquez un titre.'; err.hidden = false; return; }
    submit.disabled = true;
    try {
      const enc = await encryptBytes(ctx.key, picked.bytes);
      const t = titre.value.trim();
      const matName = place.newMatiere || locateMatiere(ctx.index, place.matiereId).matiere.nom;
      const res = await save(`Ajoute le cours « ${t} » (${matName})`, (n) => {
        const mid = place.newMatiere ? addMatiere(n, place.semestreId, place.newMatiere).id : place.matiereId;
        const c = addCours(n, mid, { titre: t, pages: picked.pages, octets: picked.bytes.length, brouillon: brouillon.checked });
        return { files: [{ path: PATHS.cours(c.id), bytes: enc }], result: { matiereId: mid, cours: c } };
      });
      dirty = false;
      ctx.router.clearGuard();
      success(res);
    } catch {
      submit.disabled = false;
    }
  } },
  h('div', { class: 'card' },
    h('h2', null, '1. Emplacement'),
    picker.el,
    h('h2', { style: { marginTop: '8px' } }, '2. Fichier'),
    fileInput, drop,
    h('div', { class: 'row', style: { marginTop: '12px', alignItems: 'flex-start', gap: '16px' } }, thumb, h('div', { class: 'grow' }, info)),
    h('h2', { style: { marginTop: '24px' } }, '3. Informations'),
    h('div', { class: 'field' }, h('label', { for: 'c-titre' }, 'Titre du cours'), titre),
    h('label', { class: 'check' }, brouillon, 'Brouillon (invisible pour l\'élève)'),
    err,
    h('div', { class: 'form-actions' }, submit)));

  function success({ matiereId, cours }) {
    clear(ctx.view).append(
      h('div', { class: 'card result-hero' },
        h('div', { class: 'year-num', style: { margin: '0 auto 16px' } }, icon('check')),
        h('h1', null, 'Cours ajouté'),
        h('p', { class: 'muted' }, `« ${cours.titre} » est chiffré et publié. Il sera visible par l'élève sous 1 à 10 minutes.`),
        h('div', { class: 'row', style: { justifyContent: 'center' } },
          h('a', { class: 'btn primary', href: `#/cours/nouveau?m=${matiereId}&t=${Date.now()}` }, icon('plus'), 'Ajouter un autre cours'),
          h('a', { class: 'btn', href: `#/quiz/nouveau?m=${matiereId}&c=${cours.id}` }, 'Créer un quiz pour ce cours'),
          h('a', { class: 'btn', href: `#/m/${matiereId}` }, 'Voir la matière'))));
  }

  ctx.view.append(
    crumbs([{ label: 'Contenus', href: '#/' }, { label: 'Ajouter un cours' }]),
    h('div', { class: 'page-head' }, h('h1', null, 'Ajouter un cours'), h('p', { class: 'muted' }, 'Le PDF est chiffré dans votre navigateur avant d\'être envoyé sur GitHub.')),
    form);
}
