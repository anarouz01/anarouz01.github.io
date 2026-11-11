// ==========================================================================
// Admin : outils (statistiques, intégrité, changement de mot de passe, PC).
// ==========================================================================
import { createCryptoConfig, decryptBytes, encryptBytes, encryptJSON, saveKey, unlock } from '../crypto.js';
import { PATHS, allFiles, iterMatieres } from '../store.js';
import { h, clear, icon, fmtBytes, plural, confirmDialog, toast } from '../ui.js';
import { ctx, withBusy, forgetThisPc } from './common.js';

const REPO_WARN = 800 * 1024 * 1024;

export function outilsView() {
  const idx = ctx.index;
  let nbM = 0; let nbC = 0; let nbQ = 0; let nbQuestions = 0; let nbL = 0; let octets = 0;
  for (const { matiere: m } of iterMatieres(idx)) {
    nbM++;
    nbC += m.cours.length;
    nbQ += m.quiz.length;
    nbL += (m.liens || []).length;
    nbQuestions += m.quiz.reduce((s, q) => s + (q.nbQuestions || 0), 0);
    octets += m.cours.reduce((s, c) => s + (c.octets || 0), 0);
  }
  const stat = (v, l) => h('div', { class: 'stat' }, h('div', { class: 'v' }, String(v)), h('div', { class: 'l' }, l));

  const repoSize = h('div', { class: 'small muted' }, 'Taille du dépôt : calcul…');
  ctx.gh.listRepoTree().then((tree) => {
    const total = tree.filter((t) => t.type === 'blob').reduce((s, t) => s + (t.size || 0), 0);
    clear(repoSize).append(`Taille du dépôt : ${fmtBytes(total)} (limite conseillée par GitHub : 1 Go)`);
    if (total > REPO_WARN) repoSize.append(h('div', { class: 'notice warn', style: { marginTop: '8px' } }, 'Le dépôt approche de 1 Go : compressez les PDF ou archivez les anciennes années.'));
  }).catch(() => clear(repoSize).append('Taille du dépôt : indisponible'));

  ctx.view.append(
    h('div', { class: 'page-head' }, h('h1', null, 'Outils')),

    h('section', { style: { marginBottom: '32px' } },
      h('h2', null, 'Statistiques'),
      h('div', { class: 'stat-grid' },
        stat(idx.annees.length, plural(idx.annees.length, 'année', 'années').replace(/^\d+ /, '')),
        stat(nbM, 'matières'), stat(nbC, 'cours'), stat(nbQ, 'quiz'), stat(nbQuestions, 'questions'), stat(nbL, 'liens'),
        stat(fmtBytes(octets), 'de PDF (non chiffrés)')),
      h('div', { style: { marginTop: '12px' } }, repoSize)),

    integritySection(),
    passwordSection(),

    h('section', { class: 'card', style: { marginBottom: '24px' } },
      h('h2', null, 'Ce PC'),
      h('p', { class: 'muted small' }, `Connecté au dépôt ${ctx.cfg.owner}/${ctx.cfg.repo}, branche ${ctx.cfg.branch}, dossier « ${ctx.cfg.root || '(racine)'} ». Le jeton GitHub expire à la date choisie lors de sa création : renouvelez-le avant, puis reconnectez-vous ici.`),
      h('div', { class: 'row' },
        h('a', { class: 'btn', href: `https://github.com/${encodeURIComponent(ctx.cfg.owner)}/${encodeURIComponent(ctx.cfg.repo)}/commits/${encodeURIComponent(ctx.cfg.branch)}${ctx.cfg.root ? '/' + ctx.cfg.root : ''}`, target: '_blank', rel: 'noopener' }, 'Historique des modifications'),
        h('button', { type: 'button', class: 'btn danger', onClick: async () => {
          if (await confirmDialog('Oublier ce PC ?', 'Le jeton, la clé et les saisies non enregistrées seront effacés de ce navigateur. Les contenus publiés ne sont pas touchés.', { ok: 'Oublier', danger: true })) {
            await forgetThisPc();
            location.hash = '';
            location.reload();
          }
        } }, icon('logout'), 'Oublier ce PC'))),
  );
}

// ---------------------------------------------------------------------------
function integritySection() {
  const out = h('div');
  const btn = h('button', { type: 'button', class: 'btn', onClick: run }, icon('check'), 'Vérifier');
  async function run() {
    btn.disabled = true;
    clear(out).append(h('div', { class: 'small muted' }, 'Analyse du dépôt…'));
    try {
      const tree = await ctx.gh.listTree();
      const present = new Set(tree.filter((t) => t.type === 'blob' && /^data\/(cours|quiz)\/.+\.enc$/.test(t.path)).map((t) => t.path));
      const expected = new Set(allFiles(ctx.index));
      const orphans = [...present].filter((p) => !expected.has(p));
      const missing = [...expected].filter((p) => !present.has(p));
      clear(out);
      if (!orphans.length && !missing.length) {
        out.append(h('div', { class: 'notice good' }, `Tout est cohérent : ${plural(expected.size, 'fichier', 'fichiers')} chiffrés, aucun orphelin, aucun manquant.`));
      }
      if (missing.length) {
        out.append(h('div', { class: 'notice bad' }, h('strong', null, `${plural(missing.length, 'fichier manquant', 'fichiers manquants')} : `),
          missing.map((p) => describe(p)).join(', '), '. Remplacez le PDF ou réenregistrez le quiz concerné.'));
      }
      if (orphans.length) {
        out.append(h('div', { class: 'notice warn row between' },
          h('span', null, `${plural(orphans.length, 'fichier orphelin', 'fichiers orphelins')} (plus référencés par l'index).`),
          h('button', { type: 'button', class: 'btn sm', onClick: async () => {
            try {
              await withBusy('Suppression des orphelins…', () => ctx.gh.commit(orphans.map((p) => ({ path: p, delete: true })), `Supprime ${orphans.length} fichier(s) orphelin(s)`));
              toast('Orphelins supprimés', 'good');
              run();
            } catch (e) { toast(e.message, 'bad'); }
          } }, 'Supprimer')));
      }
    } catch (e) {
      clear(out).append(h('div', { class: 'notice bad' }, e.message));
    }
    btn.disabled = false;
  }
  return h('section', { class: 'card', style: { marginBottom: '24px' } },
    h('div', { class: 'row between' }, h('h2', { style: { margin: 0 } }, 'Contrôle d\'intégrité'), btn),
    h('p', { class: 'muted small', style: { marginTop: '8px' } }, 'Compare l\'index aux fichiers réellement présents dans le dépôt.'),
    out);
}

function describe(path) {
  for (const { matiere: m } of iterMatieres(ctx.index)) {
    for (const c of m.cours) if (PATHS.cours(c.id) === path) return `cours « ${c.titre} » (${m.nom})`;
    for (const q of m.quiz) if (PATHS.quiz(q.id) === path) return `quiz « ${q.titre} » (${m.nom})`;
  }
  return path;
}

// ---------------------------------------------------------------------------
function passwordSection() {
  const oldPw = h('input', { class: 'input', type: 'password', id: 'pw-old', autocomplete: 'current-password', required: true });
  const pw1 = h('input', { class: 'input', type: 'password', id: 'pw-new', autocomplete: 'new-password', required: true, minLength: 8 });
  const pw2 = h('input', { class: 'input', type: 'password', id: 'pw-new2', autocomplete: 'new-password', required: true });
  const err = h('div', { class: 'notice bad', role: 'alert', hidden: true });
  const form = h('form', { onSubmit: async (e) => {
    e.preventDefault();
    err.hidden = true;
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    if (pw1.value.length < 8) return fail('Le nouveau mot de passe doit faire au moins 8 caractères (12 conseillés).');
    if (pw1.value !== pw2.value) return fail('Les deux saisies du nouveau mot de passe diffèrent.');
    if (!(await unlock(oldPw.value, ctx.cryptoConfig))) return fail('Mot de passe actuel incorrect.');
    const files = allFiles(ctx.index);
    const ok = await confirmDialog('Changer le mot de passe élève ?',
      `${plural(files.length + 1, 'fichier sera rechiffré', 'fichiers seront rechiffrés')}. L'élève devra saisir le nouveau mot de passe sur chacun de ses appareils.`,
      { ok: 'Changer' });
    if (!ok) return;
    try {
      await withBusy('Rechiffrement…', async (progress) => {
        const { config, key: newKey } = await createCryptoConfig(pw1.value);
        const changes = [];
        for (let i = 0; i < files.length; i++) {
          progress(i / (files.length + 1), `Rechiffrement ${i + 1} / ${files.length}…`);
          const raw = await ctx.gh.getFile(files[i]);
          if (!raw) continue; // fichier manquant : ignoré
          const plain = await decryptBytes(ctx.key, raw);
          changes.push({ path: files[i], bytes: await encryptBytes(newKey, plain) });
        }
        progress(files.length / (files.length + 1), 'Publication…');
        changes.push({ path: PATHS.index, bytes: await encryptJSON(newKey, ctx.index) });
        changes.push({ path: PATHS.crypto, bytes: new TextEncoder().encode(JSON.stringify(config, null, 2)) });
        await ctx.gh.commit(changes, 'Change le mot de passe élève (rechiffrement complet)');
        ctx.key = newKey;
        ctx.cryptoConfig = config;
        await saveKey('admin', newKey);
      });
      oldPw.value = pw1.value = pw2.value = '';
      toast('Mot de passe changé. Communiquez le nouveau mot de passe à l\'élève.', 'good', 6000);
    } catch (ex) {
      fail(ex.message);
    }
  } },
  h('div', { class: 'grid-3' },
    h('div', { class: 'field' }, h('label', { for: 'pw-old' }, 'Mot de passe actuel'), oldPw),
    h('div', { class: 'field' }, h('label', { for: 'pw-new' }, 'Nouveau mot de passe'), pw1),
    h('div', { class: 'field' }, h('label', { for: 'pw-new2' }, 'Confirmation'), pw2)),
  err,
  h('div', { class: 'form-actions' }, h('button', { type: 'submit', class: 'btn primary' }, 'Changer et rechiffrer')));

  return h('section', { class: 'card', style: { marginBottom: '24px' } },
    h('h2', null, 'Mot de passe élève'),
    h('p', { class: 'muted small' }, 'Tous les cours, quiz et l\'index sont rechiffrés avec le nouveau mot de passe, en un seul commit. Notez-le en lieu sûr : sans lui, les contenus sont illisibles.'),
    form);
}
