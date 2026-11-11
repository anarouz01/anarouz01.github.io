// ==========================================================================
// Espace administration : configuration, navigation, enregistrement.
// ==========================================================================
import { GitHub, guessOwner, guessRoot } from '../github.js';
import { createCryptoConfig, unlock, verifyKey, saveKey, loadKey, forgetKey, decryptJSON, encryptJSON } from '../crypto.js';
import { PATHS, emptyIndex } from '../store.js';
import { h, clear, icon, loader, initTheme, themeToggle, confirmDialog, brandMark } from '../ui.js';
import { createRouter } from '../router.js';
import { setVendorBase } from '../pdf-viewer.js';
import { ctx, withBusy, CFG_KEY } from './common.js';
import { treeView, matiereView } from './view-tree.js';
import { coursFormView } from './view-cours.js';
import { quizEditorView } from './view-quiz.js';
import { outilsView } from './view-outils.js';

const app = document.getElementById('app');

setVendorBase('../');
initTheme();
boot();

function loadCfg() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); } catch { return null; }
}
function saveCfg(cfg) {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* ignoré */ }
}
async function boot() {
  clear(app).append(loader('Connexion à GitHub…'));
  const cfg = loadCfg();
  const key = await loadKey('admin');
  if (!cfg || !key) return setupScreen(cfg);
  try {
    await connect(cfg, key);
  } catch (e) {
    return setupScreen(cfg, e.message);
  }
  start();
}

async function connect(cfg, key) {
  const gh = new GitHub(cfg);
  const raw = await gh.getFile(PATHS.crypto);
  if (!raw) throw new Error('Le site n\'est pas initialisé sur ce dépôt.');
  const cryptoConfig = JSON.parse(new TextDecoder().decode(raw));
  if (!(await verifyKey(key, cryptoConfig))) throw new Error('Le mot de passe élève a changé : saisissez-le à nouveau.');
  const idxRaw = await gh.getFile(PATHS.index);
  if (!idxRaw) throw new Error('Index introuvable dans le dépôt.');
  Object.assign(ctx, { gh, key, cryptoConfig, cfg, index: await decryptJSON(key, idxRaw) });
}

// ---------------------------------------------------------------------------
function setupScreen(cfg, message) {
  cfg = cfg || {};
  const owner0 = cfg.owner || guessOwner();
  const repo0 = cfg.repo || (owner0 ? `${owner0}.github.io` : '');
  const root0 = cfg.root !== undefined ? cfg.root : guessRoot(repo0);
  const f = (id, label, attrs, hint) => h('div', { class: 'field' }, h('label', { for: id }, label), h('input', { class: 'input', id, ...attrs }), hint ? h('div', { class: 'hint' }, hint) : null);
  const err = h('div', { class: 'notice bad', role: 'alert', hidden: !message }, message || '');
  const submit = h('button', { type: 'submit', class: 'btn primary' }, 'Se connecter');
  const form = h('form', { onSubmit: onSubmit },
    h('div', { class: 'grid-2' },
      f('owner', 'Propriétaire du dépôt', { value: owner0, required: true, placeholder: 'votre-identifiant-github', autocomplete: 'off' }),
      f('repo', 'Nom du dépôt', { value: repo0, required: true, placeholder: 'votre-identifiant.github.io', autocomplete: 'off' })),
    f('root', 'Dossier du site dans le dépôt', { value: root0, placeholder: '(racine du dépôt)', autocomplete: 'off' },
      'Déduit de l\'adresse de cette page, ex. « showcases/isiam ». Laissez vide si le site est à la racine du dépôt.'),
    f('token', 'Jeton GitHub (fine-grained)', { type: 'password', required: true, autocomplete: 'off', placeholder: 'github_pat_…' },
      'Limité à ce dépôt, permission « Contents : Read and write ». Conservé uniquement sur ce PC.'),
    f('pw', 'Mot de passe élève', { type: 'password', required: true, autocomplete: 'new-password' },
      'Sert de clé de chiffrement. Si le site n\'est pas encore initialisé, ce mot de passe sera celui de l\'élève.'),
    h('details', { style: { marginBottom: '16px' } }, h('summary', { class: 'small muted' }, 'Options avancées'),
      h('div', { style: { marginTop: '12px' } },
        f('branch', 'Branche', { value: cfg.branch || 'main', required: true }),
        f('apiBase', 'Adresse de l\'API', { value: cfg.apiBase || 'https://api.github.com', required: true }))),
    err,
    h('div', { class: 'form-actions' }, submit));

  let rootTouched = cfg.root !== undefined;
  form.querySelector('#root').addEventListener('input', () => { rootTouched = true; });
  form.querySelector('#repo').addEventListener('input', (e) => {
    if (!rootTouched) form.querySelector('#root').value = guessRoot(e.target.value.trim());
  });

  async function onSubmit(e) {
    e.preventDefault();
    const v = (id) => form.querySelector(`#${id}`).value.trim();
    const next = { owner: v('owner'), repo: v('repo'), root: v('root').replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''), token: v('token'), branch: v('branch') || 'main', apiBase: v('apiBase') || 'https://api.github.com' };
    const pw = form.querySelector('#pw').value;
    err.hidden = true;
    submit.disabled = true;
    try {
      const gh = new GitHub(next);
      await withBusy('Vérification de l\'accès au dépôt…', async () => {
        await gh.checkAccess();
        // Garde-fou : le dossier indiqué doit bien contenir ce site (évite d'écrire ailleurs dans le dépôt).
        if (!(await gh.getFile('manifest.webmanifest'))) {
          throw new Error(`Le site est introuvable dans le dossier « ${next.root || '(racine)'} » de la branche « ${next.branch} ». Vérifiez le dossier, et que le code a bien été poussé sur GitHub.`);
        }
      });
      const raw = await gh.getFile(PATHS.crypto);
      let key;
      if (raw) {
        const conf = JSON.parse(new TextDecoder().decode(raw));
        key = await withBusy('Vérification du mot de passe…', () => unlock(pw, conf));
        if (!key) throw new Error('Mot de passe élève incorrect pour ce site.');
      } else {
        if (pw.length < 8) throw new Error('Choisissez un mot de passe élève d\'au moins 8 caractères (12 conseillés).');
        const ok = await confirmDialog('Initialiser le site ?',
          'Aucun contenu n\'existe encore dans ce dépôt. Le site va être initialisé avec ce mot de passe élève. Notez-le en lieu sûr : il est indispensable pour lire les contenus.',
          { ok: 'Initialiser' });
        if (!ok) { submit.disabled = false; return; }
        key = await withBusy('Initialisation…', async () => {
          const { config, key: k } = await createCryptoConfig(pw);
          await gh.commit([
            { path: PATHS.crypto, bytes: new TextEncoder().encode(JSON.stringify(config, null, 2)) },
            { path: PATHS.index, bytes: await encryptJSON(k, emptyIndex()) },
          ], 'Initialisation du site de révisions');
          return k;
        });
      }
      saveCfg(next);
      await saveKey('admin', key);
      await connect(next, key);
      start();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
      submit.disabled = false;
    }
  }

  clear(app).append(h('main', { class: 'container narrow' },
    h('div', { class: 'page-head', style: { marginTop: '24px' } },
      h('div', { class: 'brand' }, brandMark(), h('span', null, 'Administration')),
      h('h1', { style: { marginTop: '24px' } }, 'Connexion au dépôt'),
      h('p', { class: 'muted' }, 'Ces informations sont mémorisées sur ce PC uniquement.')),
    h('div', { class: 'card' }, form)));
}

// ---------------------------------------------------------------------------
function start() {
  ctx.view = h('main', { class: 'container' });
  const nav = h('nav', { class: 'admin-nav', 'aria-label': 'Administration' },
    h('a', { href: '#/', 'data-r': 'tree' }, 'Contenus'),
    h('a', { href: '#/cours/nouveau', 'data-r': 'cours' }, 'Ajouter un cours'),
    h('a', { href: '#/quiz/nouveau', 'data-r': 'quiz' }, 'Ajouter un quiz'),
    h('a', { href: '#/outils', 'data-r': 'outils' }, 'Outils'));
  clear(app).append(
    h('header', { class: 'topbar' }, h('div', { class: 'topbar-inner' },
      h('a', { class: 'brand', href: '#/' }, brandMark(), h('span', { class: 'hide-mobile' }, 'Admin')),
      nav,
      h('span', { class: 'topbar-spacer' }),
      h('div', { class: 'topbar-actions' },
        h('a', { class: 'btn sm', href: '../index.html?apercu=1#/', target: '_blank', rel: 'noopener', title: 'Voir le site comme l\'élève (brouillons inclus)' }, icon('eye'), h('span', { class: 'hide-mobile' }, 'Aperçu élève')),
        themeToggle()))),
    ctx.view);

  const mark = (r) => nav.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.r === r));
  const wrap = (r, fn) => async (p, q) => { mark(r); clear(ctx.view); await fn(p, q); };
  ctx.router = createRouter([
    ['/', wrap('tree', treeView)],
    ['/m/:id', wrap('tree', matiereView)],
    ['/cours/nouveau', wrap('cours', coursFormView)],
    ['/quiz/nouveau', wrap('quiz', (p, q) => quizEditorView(null, q))],
    ['/quiz/:id', wrap('quiz', (p, q) => quizEditorView(p.id, q))],
    ['/outils', wrap('outils', outilsView)],
  ], () => { ctx.router.go('/'); });
  ctx.router.start();
}
