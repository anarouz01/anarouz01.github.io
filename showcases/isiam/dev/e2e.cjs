// ==========================================================================
// Test de bout en bout (Playwright) : admin → publication → élève.
//   npm run test:e2e   (ou : node dev/e2e.cjs [cours1.pdf] [cours2.pdf] [dossier-captures])
//   Prérequis : npm i -D playwright && npx playwright install chromium
// Copie le site dans un dossier temporaire, lance le serveur simulé et
// déroule la grille de recette.
// ==========================================================================
const { chromium, devices } = require('playwright');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SRC = path.resolve(__dirname, '..');
const PDF1 = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'cours1.pdf'));
const PDF2 = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'cours2.pdf'));
const SHOTS = path.resolve(process.argv[4] || path.join(os.tmpdir(), 'isiam-shots'));
const PORT = 8765;
const SUB = 'showcases/isiam';
const BASE = `http://localhost:${PORT}`;
const ADMIN = fs.readdirSync(SRC).find((d) => d.startsWith('gestion-'));
const PW = 'MotDePasse2026!';
const PW2 = 'NouveauSecret2027?';

const results = [];
function check(label, cond, extra = '') {
  results.push({ label, ok: !!cond });
  console.log(`${cond ? '✔' : '✘'} ${label}${extra ? ` — ${extra}` : ''}`);
}

(async () => {
  // Dépôt simulé : un site existant à la racine, le site de révisions dans showcases/isiam.
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'isiam-repo-'));
  const site = path.join(repo, SUB);
  fs.mkdirSync(site, { recursive: true });
  fs.writeFileSync(path.join(repo, 'index.html'), '<h1>Portfolio</h1>');
  execSync(`cp -r ${SRC}/. ${site}/ && rm -rf ${site}/dev/node_modules ${site}/data`);
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = spawn('node', [path.join(SRC, 'dev/mock-github.mjs'), repo, String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
  const commits = [];
  server.stdout.on('data', (d) => { const s = String(d); if (s.includes('[commit]')) commits.push(s.trim()); });
  await new Promise((r) => setTimeout(r, 700));

  const browser = await chromium.launch();
  const errors = [];
  const watch = (page, who) => {
    page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(`${who} console: ${m.text()}`); });
    page.on('dialog', (d) => d.accept());
  };
  const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

  try {
    // ================= ADMIN =================
    const actx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const a = await actx.newPage();
    watch(a, 'admin');
    await a.goto(`${BASE}/${SUB}/${ADMIN}/index.html`);
    await a.fill('#owner', 'famille');
    await a.fill('#repo', 'famille.github.io');
    check('Admin : dossier du site déduit de l\'adresse', (await a.inputValue('#root')) === SUB, await a.inputValue('#root'));
    await a.fill('#token', 'test-token');
    await a.fill('#pw', PW);
    await a.click('details summary');
    await a.fill('#apiBase', `${BASE}/api`);
    await shot(a, '01-admin-connexion');
    await a.click('button[type=submit]');
    await a.click('.modal button.primary:has-text("Initialiser")');
    await a.waitForSelector('h1:has-text("Contenus")');
    check('Admin : initialisation du site', fs.existsSync(path.join(site, 'data/crypto.json')) && fs.existsSync(path.join(site, 'data/index.enc')));
    check('Admin : rien écrit hors du dossier du site', !fs.existsSync(path.join(repo, 'data')) && fs.readFileSync(path.join(repo, 'index.html'), 'utf8') === '<h1>Portfolio</h1>');

    // Année + matières
    await a.click('button:has-text("Nouvelle année")');
    await a.click('.modal button:has-text("Créer")');
    await a.waitForSelector('h2:has-text("1re année")');
    const addMat = async (semIdx, nom) => {
      await a.locator('.tree-sem').nth(semIdx).locator('button:has-text("Matière")').click();
      await a.fill('.modal input', nom);
      await a.click('.modal button:has-text("Créer")');
      await a.waitForSelector(`.list-item:has-text("${nom}")`);
    };
    await addMat(0, 'Marketing');
    await addMat(0, 'Finance');
    await addMat(1, 'Droit des affaires');
    check('Admin : année + 3 matières créées', (await a.locator('.tree-sem .list-item').count()) === 3);
    // Réordonner : Finance monte
    await a.locator('.list-item:has-text("Finance") button[aria-label="Monter"]').click();
    await a.waitForTimeout(600);
    const firstMat = await a.locator('.tree-sem').nth(0).locator('.list-item .title').first().innerText();
    check('Admin : réordonner une matière', firstMat.startsWith('Finance'), firstMat);
    // Déplacer Droit vers S1 puis revenir
    await a.locator('.list-item:has-text("Droit des affaires") button[aria-label="Déplacer vers un autre semestre"]').click();
    await a.selectOption('.modal select', { label: '1re année · Semestre 1' });
    await a.click('.modal button:has-text("Déplacer")');
    await a.waitForTimeout(600);
    check('Admin : déplacer une matière', (await a.locator('.tree-sem').nth(0).locator('.list-item').count()) === 3);
    // Supprimer Droit
    await a.locator('.list-item:has-text("Droit des affaires") button[aria-label="Supprimer"]').click();
    await a.click('.modal button:has-text("Supprimer")');
    await a.waitForTimeout(600);
    check('Admin : supprimer une matière', (await a.locator('.list-item:has-text("Droit des affaires")').count()) === 0);
    await shot(a, '02-admin-contenus');

    // Cours 1 et 2
    const addCours = async (file, titre, opts = {}) => {
      await a.click('nav.admin-nav a:has-text("Ajouter un cours")');
      await a.waitForSelector('#pp-matiere');
      if (opts.newMat) {
        await a.selectOption('#pp-matiere', '__new');
        await a.fill('.modal input', opts.newMat);
        await a.click('.modal button:has-text("Ajouter")');
      } else {
        await a.selectOption('#pp-matiere', { label: 'Marketing' });
      }
      await a.setInputFiles('#c-file', file);
      await a.waitForSelector('.pdf-preview canvas');
      await a.fill('#c-titre', titre);
      if (opts.draft) await a.check('#c-brouillon');
      if (opts.shot) await shot(a, opts.shot);
      await a.click('button:has-text("Chiffrer et publier")');
      await a.waitForSelector('h1:has-text("Cours ajouté")');
    };
    await addCours(PDF1, 'Chapitre 1 · Le mix marketing', { shot: '03-admin-ajout-cours' });
    await addCours(PDF2, 'Chapitre 2 · La segmentation');
    await addCours(PDF2, 'Chapitre 3 · Brouillon', { draft: true });
    await addCours(PDF2, 'Introduction à la finance', { newMat: 'Comptabilité' });
    const encFiles = fs.readdirSync(path.join(site, 'data/cours'));
    check('Admin : 4 cours publiés (fichiers .enc)', encFiles.length === 4, encFiles.join(', '));
    const encHead = fs.readFileSync(path.join(site, 'data/cours', encFiles[0])).subarray(0, 16).toString('latin1');
    check('Sécurité : un .enc ne s\'ouvre pas comme PDF', !encHead.includes('%PDF'));
    const idxRaw = fs.readFileSync(path.join(site, 'data/index.enc')).toString('latin1');
    check('Sécurité : l\'index ne contient aucun nom en clair', !idxRaw.includes('Marketing') && !idxRaw.includes('Chapitre'));

    // Quiz 1 (cours 1) : 3 QCM + 1 ouverte
    await a.goto(`${BASE}/${SUB}/${ADMIN}/index.html#/quiz/nouveau`);
    await a.waitForSelector('#pp-matiere');
    await a.selectOption('#pp-matiere', { label: 'Marketing' });
    await a.selectOption('#q-cours', { label: 'Cours : Chapitre 1 · Le mix marketing' });
    await a.fill('#q-titre', 'Quiz · Le mix marketing');
    const qcm = async (i, enonce, choix, bonnes) => {
      const card = a.locator('.q-editor').nth(i);
      await card.locator('textarea').first().fill(enonce);
      for (let k = 0; k < choix.length; k++) {
        if (k >= await card.locator('.choice-edit').count()) await card.locator('button:has-text("Proposition")').click();
        await card.locator('.choice-edit input.input').nth(k).fill(choix[k]);
      }
      for (const b of bonnes) await card.locator('.choice-edit input[type=checkbox]').nth(b).check();
    };
    await qcm(0, 'Quels éléments font partie des 4P ?', ['Prix', 'Personnel', 'Produit', 'Profit'], [0, 2]);
    await a.click('button:has-text("QCM")');
    await qcm(1, 'La stratégie d\'écrémage consiste à :', ['Fixer un prix élevé', 'Fixer un prix bas', 'Supprimer un produit'], [0]);
    await a.click('button:has-text("QCM")');
    await qcm(2, 'La place correspond à :', ['La distribution', 'Le positionnement'], [0]);
    await a.click('button:has-text("Question ouverte")');
    const open = a.locator('.q-editor').nth(3);
    await open.locator('textarea').nth(0).fill('Définissez le positionnement.');
    await open.locator('textarea').nth(1).fill('La place qu\'occupe le produit dans l\'esprit du consommateur par rapport aux concurrents.');
    await shot(a, '04-admin-editeur-quiz');
    // Tester ce quiz (aperçu)
    await a.click('button:has-text("Tester ce quiz")');
    await a.waitForSelector('.modal .question-card');
    check('Admin : « Tester ce quiz » ouvre l\'aperçu', true);
    await a.keyboard.press('Escape');
    await a.click('button:has-text("Chiffrer et publier")');
    await a.waitForSelector('h2:has-text("Quiz")');
    check('Admin : quiz enregistré', fs.readdirSync(path.join(site, 'data/quiz')).length === 1);

    // Quiz 2 (toute la matière) : 2 QCM
    await a.goto(`${BASE}/${SUB}/${ADMIN}/index.html#/quiz/nouveau?m=`);
    await a.waitForSelector('#pp-matiere');
    await a.selectOption('#pp-matiere', { label: 'Marketing' });
    await a.fill('#q-titre', 'Annale · Marketing');
    await qcm(0, 'La segmentation consiste à :', ['Découper le marché', 'Fixer les prix'], [0]);
    await a.click('button:has-text("QCM")');
    await qcm(1, 'Un segment doit être :', ['Homogène', 'Mesurable', 'Infini'], [0, 1]);
    await a.click('button:has-text("Chiffrer et publier")');
    await a.waitForSelector('h2:has-text("Quiz")');

    // Modifier le quiz 2 (renommer) : réouverture et enregistrement
    await a.click('a:has-text("Annale · Marketing")');
    await a.waitForSelector('#q-titre');
    check('Admin : quiz rouvert avec ses questions', (await a.locator('.q-editor').count()) === 2);
    await a.fill('#q-titre', 'Annale 2025 · Marketing');
    await a.click('button:has-text("Chiffrer et publier")');
    await a.waitForSelector('a:has-text("Annale 2025 · Marketing")');
    check('Admin : quiz modifié sans perte', true);

    // Lien vidéo
    await a.click('button:has-text("Ajouter un lien")');
    await a.fill('#l-url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await a.fill('#l-titre', 'Vidéo : les 4P en 5 minutes');
    await a.click('.modal button:has-text("Enregistrer")');
    await a.waitForSelector('.list-item:has-text("les 4P en 5 minutes")');
    await shot(a, '05-admin-matiere');

    // Outils : intégrité
    await a.goto(`${BASE}/${SUB}/${ADMIN}/index.html#/outils`);
    await a.click('button:has-text("Vérifier")');
    await a.waitForSelector('.notice.good, .notice.warn, .notice.bad');
    check('Admin : contrôle d\'intégrité OK', await a.locator('.notice.good').count() === 1);
    await shot(a, '06-admin-outils');

    // ================= ÉLÈVE (téléphone) =================
    const ectx = await browser.newContext({ ...devices['iPhone 13'] });
    const e = await ectx.newPage();
    watch(e, 'élève');
    await e.goto(`${BASE}/${SUB}/index.html`);
    await e.waitForSelector('#pw');
    await e.fill('#pw', 'mauvais');
    await e.click('button:has-text("Entrer")');
    await e.waitForSelector('.notice.bad:not([hidden])');
    check('Élève : mauvais mot de passe refusé', true);
    await e.fill('#pw', PW);
    await shot(e, '10-eleve-connexion');
    await e.click('button:has-text("Entrer")');
    await e.waitForSelector('.year-card');
    await shot(e, '11-eleve-accueil');
    await e.reload();
    await e.waitForSelector('.year-card');
    check('Élève : mot de passe mémorisé après rechargement', true);
    await e.click('a.card:has-text("1re année")');
    await e.waitForSelector('.semester');
    check('Élève : matière en brouillon invisible / matières visibles', (await e.locator('.semester .card').count()) === 3);
    await shot(e, '12-eleve-annee');
    await e.click('.card:has-text("Marketing")');
    await e.waitForSelector('.list-item');
    const coursTitles = await e.locator('.list-item .title').allInnerTexts();
    check('Élève : cours en brouillon invisible', coursTitles.length === 2 && !coursTitles.some((t) => t.includes('Brouillon')), coursTitles.join(' | '));
    await shot(e, '13-eleve-matiere');
    await e.click('.list-item:has-text("Chapitre 1")');
    await e.waitForSelector('.pdf-page canvas', { timeout: 15000 });
    await e.waitForTimeout(1200);
    const nPages = await e.locator('.pdf-page').count();
    check('Élève : PDF rendu (pages + canvas)', nPages === 3, `${nPages} pages`);
    const textSpans = await e.locator('.pdf-page .textLayer span').count();
    check('Élève : couche texte sélectionnable', textSpans > 10, `${textSpans} segments`);
    await shot(e, '14-eleve-cours-mobile');
    const dl = e.waitForEvent('download');
    await e.click('button:has-text("Télécharger"), .viewer-bar button:last-child');
    const file = await dl;
    const dlPath = await file.path();
    check('Élève : téléchargement du PDF original', fs.readFileSync(dlPath).equals(fs.readFileSync(PDF1)), file.suggestedFilename());

    // Quiz 1
    await e.goto(`${BASE}/${SUB}/index.html#/`);
    await e.click('a.card:has-text("1re année")');
    await e.click('.card:has-text("Marketing")');
    await e.click('a.tab:has-text("Quiz")');
    await e.waitForSelector('.list-item:has-text("Quiz · Le mix marketing")');
    await shot(e, '15-eleve-quiz-liste');
    await e.click('.list-item:has-text("Quiz · Le mix marketing")');
    await e.waitForSelector('.question-card');
    const bodyBefore = await e.locator('body').innerText();
    check('Quiz : aucune bonne réponse affichée avant la fin', !/Bonne réponse|is-correct/.test(bodyBefore) && (await e.locator('.is-correct').count()) === 0);
    await shot(e, '16-eleve-question');
    // Répondre : toutes justes sauf « La place » faux ; ouverte → partiel
    const answers = {
      'Quels éléments font partie des 4P ?': ['Prix', 'Produit'],
      'La stratégie d\'écrémage consiste à :': ['Fixer un prix élevé'],
      'La place correspond à :': ['Le positionnement'],
    };
    for (let i = 0; i < 4; i++) {
      const q = (await e.locator('.question-text').innerText()).trim();
      if (answers[q]) {
        for (const c of answers[q]) await e.locator('.choice', { hasText: c }).locator('input').check();
      } else {
        await e.fill('.question-card textarea', 'C\'est la place du produit dans l\'esprit du client.');
      }
      if (i < 3) await e.click('button:has-text("Suivant")');
    }
    await e.click('button:has-text("Terminer le quiz")');
    await e.waitForSelector('h1:has-text("Auto-évaluation")');
    await shot(e, '17-eleve-auto-evaluation');
    await e.click('.seg button:has-text("Partiel")');
    await e.click('button:has-text("Voir mon résultat")');
    await e.waitForSelector('.result-score');
    const note = (await e.locator('.result-score').innerText()).replace(/\s+/g, ' ');
    check('Quiz : note correcte (2,5 / 4 → 12,5/20)', note.includes('12,5'), note);
    await shot(e, '18-eleve-resultat');

    // Quiz de la matière
    await e.goto(`${BASE}/${SUB}/index.html#/`);
    await e.click('a.card:has-text("1re année")');
    await e.click('.card:has-text("Marketing")');
    await e.click('a.tab:has-text("Quiz")');
    await e.click('a:has-text("Commencer")');
    await e.waitForSelector('.quiz-counter');
    const counter = await e.locator('.quiz-counter').innerText();
    check('Quiz matière : toutes les questions disponibles (6 < 20)', counter.endsWith('/ 6'), counter);
    for (let i = 0; i < 5; i++) await e.click('button:has-text("Suivant")');
    await e.click('button:has-text("Terminer le quiz")');
    await e.click('.modal button:has-text("Terminer")');
    await e.waitForSelector('.result-score');
    check('Quiz matière : terminé (questions vides comptées fausses)', (await e.locator('.result-score').innerText()).startsWith('0'));

    // Progression
    await e.goto(`${BASE}/${SUB}/index.html#/`);
    await e.waitForSelector('table.table');
    const prog = await e.locator('table.table tbody').innerText();
    check('Accueil : progression affichée', prog.includes('Marketing') && prog.includes('0/20'), prog.replace(/\s+/g, ' '));
    await shot(e, '19-eleve-accueil-progression');

    // Liens
    await e.click('a.card:has-text("1re année")');
    await e.click('.card:has-text("Marketing")');
    await e.click('a.tab:has-text("Liens")');
    await e.click('button:has-text("Regarder")');
    check('Liens : vidéo intégrée', (await e.locator('.video-embed iframe').count()) === 1);

    // Mode sombre
    await e.goto(`${BASE}/${SUB}/index.html#/`);
    await e.click('button[aria-label="Changer de thème"]');
    await e.waitForTimeout(200);
    await shot(e, '20-eleve-sombre');
    check('Mode sombre activé', (await e.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark');
    await e.click('a.card:has-text("1re année")');
    await e.click('.card:has-text("Marketing")');
    await e.click('.list-item:has-text("Chapitre 1")');
    await e.waitForSelector('.pdf-page canvas');
    await e.waitForTimeout(800);
    await shot(e, '21-eleve-cours-sombre');

    // Ordinateur
    const dctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const d = await dctx.newPage();
    watch(d, 'élève-pc');
    await d.goto(`${BASE}/${SUB}/index.html`);
    await d.fill('#pw', PW);
    await d.click('button:has-text("Entrer")');
    await d.waitForSelector('.year-card');
    await d.click('a.card:has-text("1re année")');
    await shot(d, '22-pc-annee');
    await d.click('.card:has-text("Marketing")');
    await d.click('.list-item:has-text("Chapitre 1")');
    await d.waitForSelector('.pdf-page canvas');
    await d.waitForTimeout(1000);
    await d.screenshot({ path: path.join(SHOTS, '23-pc-cours.png') });
    const pageW = await d.locator('.pdf-page').first().evaluate((el) => el.getBoundingClientRect().width);
    await d.click('button[aria-label="Zoomer"]');
    await d.waitForTimeout(500);
    const pageW2 = await d.locator('.pdf-page').first().evaluate((el) => el.getBoundingClientRect().width);
    const dl2 = d.waitForEvent('download');
    await d.click('button:has-text("Télécharger le PDF")');
    const f2 = await dl2;
    check('Lecteur : nom du fichier téléchargé', f2.suggestedFilename().endsWith('.pdf'), f2.suggestedFilename());
    check('Lecteur : zoom', pageW2 > pageW * 1.2, `${Math.round(pageW)} → ${Math.round(pageW2)} px`);

    // Aperçu admin (brouillons visibles)
    const p = await actx.newPage();
    watch(p, 'aperçu');
    await p.goto(`${BASE}/${SUB}/index.html?apercu=1#/`);
    await p.waitForSelector('.preview-banner');
    await p.click('a.card:has-text("1re année")');
    await p.click('.card:has-text("Marketing")');
    await p.waitForSelector('.list-item');
    await shot(p, '24-apercu-admin');
    check('Aperçu admin : brouillon visible', (await p.locator('.list-item:has-text("Brouillon")').count()) === 1);

    // Changement de mot de passe
    await a.goto(`${BASE}/${SUB}/${ADMIN}/index.html#/outils`);
    await a.fill('#pw-old', PW);
    await a.fill('#pw-new', PW2);
    await a.fill('#pw-new2', PW2);
    await a.click('button:has-text("Changer et rechiffrer")');
    await a.click('.modal button:has-text("Changer")');
    await a.waitForSelector('.toast.good');
    await e.goto(`${BASE}/${SUB}/index.html#/`);
    await e.reload();
    await e.waitForSelector('#pw');
    check('Mot de passe : ancien refusé, l\'élève doit saisir le nouveau', (await e.locator('.notice.bad:not([hidden])').innerText()).includes('changé'));
    await e.fill('#pw', PW2);
    await e.click('button:has-text("Entrer")');
    await e.waitForSelector('.year-card');
    await e.click('a.card:has-text("1re année")');
    await e.click('.card:has-text("Marketing")');
    await e.click('.list-item:has-text("Chapitre 1")');
    await e.waitForSelector('.pdf-page canvas');
    check('Mot de passe : le nouveau ouvre les cours', true);
    await e.waitForTimeout(800);
    await ectx.setOffline(true);
    await e.reload();
    await e.waitForSelector('.pdf-page canvas', { timeout: 15000 }).catch(() => {});
    check('PWA : cours déjà ouvert lisible hors connexion', (await e.locator('.pdf-page canvas').count()) > 0);
    await ectx.setOffline(false);

    // Admin rechargé : reconnecté automatiquement
    await a.reload();
    await a.waitForSelector('h1:has-text("Outils")');
    check('Admin : reconnexion automatique après rechargement', true);
  } catch (err) {
    console.error('ÉCHEC :', err.message);
    results.push({ label: `Exception : ${err.message}`, ok: false });
  } finally {
    await browser.close();
    server.kill();
  }
  check('Sécurité : messages de commit sans aucun titre', commits.length > 10 && !commits.some((c) => /Marketing|Chapitre|Annale|Finance/.test(c)));
  console.log(`\nCommits : ${commits.length}`);
  commits.slice(0, 40).forEach((c) => console.log('  ' + c));
  if (errors.length) { console.log('\nErreurs JS :'); errors.forEach((x) => console.log('  ' + x)); }
  const ko = results.filter((r) => !r.ok);
  console.log(`\n${results.length - ko.length}/${results.length} vérifications réussies`);
  process.exit(ko.length || errors.length ? 1 : 0);
})();
