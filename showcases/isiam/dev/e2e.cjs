// ==========================================================================
// Test de bout en bout : publier.mjs → site élève (Playwright).
//   npm run test:e2e      (prérequis : npm i -D playwright && npx playwright install chromium)
// Construit un dossier de contenus de test, publie dans une copie du site
// placée comme dans le dépôt (showcases/isiam), puis déroule la recette.
// ==========================================================================
const { chromium, devices } = require('playwright');
const { spawn, execFileSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SRC = path.resolve(__dirname, '..');
const PDF1 = path.join(os.tmpdir(), 'cours1.pdf');
const PDF2 = path.join(os.tmpdir(), 'cours2.pdf');
const SHOTS = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'isiam-shots'));
const PORT = 8765;
const SUB = 'showcases/isiam';
const BASE = `http://localhost:${PORT}/${SUB}`;
const PW = 'MotDePasse2026!';
const PW2 = 'NouveauSecret2027?';

const results = [];
function check(label, cond, extra = '') {
  results.push({ label, ok: !!cond });
  console.log(`${cond ? '✔' : '✘'} ${label}${extra ? ` — ${extra}` : ''}`);
}

(async () => {
  // ----- Dépôt simulé et contenus
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'isiam-e2e-'));
  const repo = path.join(tmp, 'repo');
  const site = path.join(repo, SUB);
  fs.mkdirSync(site, { recursive: true });
  fs.mkdirSync(path.join(repo, '.git'));
  execSync(`cp -r "${SRC}/." "${site}/" && rm -rf "${site}/dev/node_modules" "${site}/data"`);
  const contenus = path.join(tmp, 'contenus');
  const M = path.join(contenus, '1re année', 'Semestre 1', 'Marketing');
  fs.mkdirSync(M, { recursive: true });
  fs.mkdirSync(path.join(contenus, '1re année', 'Semestre 1', 'Finance'), { recursive: true });
  fs.mkdirSync(path.join(contenus, '1re année', 'Semestre 2', 'Droit'), { recursive: true });
  fs.copyFileSync(PDF1, path.join(M, '01 - Le mix marketing.pdf'));
  fs.copyFileSync(PDF2, path.join(M, '02 - La segmentation.pdf'));
  fs.copyFileSync(PDF2, path.join(M, '_03 - Brouillon.pdf'));
  fs.writeFileSync(path.join(M, '01 - Le mix marketing.quiz.json'), JSON.stringify({ titre: 'Quiz · Le mix marketing', questions: [
    { q: 'Quels éléments font partie des 4P ?', choix: ['Prix', 'Personnel', 'Produit', 'Profit'], reponses: [1, 3] },
    { q: 'La stratégie d\'écrémage consiste à :', choix: ['Fixer un prix élevé', 'Fixer un prix bas', 'Supprimer un produit'], reponses: [1] },
    { q: 'La place correspond à :', choix: ['La distribution', 'Le positionnement'], reponses: [1] },
    { q: 'Définissez le positionnement.', reponse: 'La place qu\'occupe le produit dans l\'esprit du consommateur par rapport aux concurrents.' },
  ] }, null, 2));
  fs.writeFileSync(path.join(M, 'Annale 2025.quiz.json'), JSON.stringify({ questions: [
    { q: 'La segmentation consiste à :', choix: ['Découper le marché', 'Fixer les prix'], reponses: [1] },
    { q: 'Un segment doit être :', choix: ['Homogène', 'Mesurable', 'Infini'], reponses: [1, 2] },
  ] }));
  fs.writeFileSync(path.join(M, 'liens.json'), JSON.stringify([{ titre: 'Vidéo : les 4P en 5 minutes', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]));

  const publish = (extra = [], env = {}) => execFileSync('node', [path.join(site, 'publier.mjs'), '--source', contenus, ...extra],
    { env: { ...process.env, ISIAM_MDP: PW, NO_COLOR: '1', ...env }, encoding: 'utf8' });

  let out = publish();
  check('Publication initiale', /4 fichier\(s\) chiffré\(s\)/.test(out), out.split('\n').filter((l) => l.includes('✔')).pop());
  check('Brouillon « _ » ignoré', /1 élément\(s\) en brouillon/.test(out));
  const enc = fs.readdirSync(path.join(site, 'data/cours'));
  check('Sécurité : un .enc ne s\'ouvre pas comme PDF', !fs.readFileSync(path.join(site, 'data/cours', enc[0])).subarray(0, 64).toString('latin1').includes('%PDF'));
  check('Sécurité : l\'index ne contient aucun nom en clair', !fs.readFileSync(path.join(site, 'data/index.enc')).toString('latin1').includes('Marketing'));
  out = publish();
  check('Republication sans changement : rien réécrit', /0 fichier\(s\) chiffré\(s\), 4 inchangé/.test(out) && /Aucun changement/.test(out));
  let refused = false;
  try { publish([], { ISIAM_MDP: 'mauvais' }); } catch (e) { refused = /incorrect/.test(String(e.stdout)); }
  check('Mauvais mot de passe refusé à la publication', refused);
  fs.mkdirSync(path.join(repo, 'contenus-dans-le-depot'));
  refused = false;
  try { execFileSync('node', [path.join(site, 'publier.mjs'), '--source', path.join(repo, 'contenus-dans-le-depot')], { env: { ...process.env, ISIAM_MDP: PW }, encoding: 'utf8' }); } catch (e) { refused = /dans le dépôt git/.test(String(e.stdout)); }
  check('Garde-fou : contenus dans le dépôt refusés', refused);

  fs.mkdirSync(SHOTS, { recursive: true });
  const server = spawn('node', [path.join(SRC, 'dev/serve.mjs'), repo, String(PORT)], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 600));
  const browser = await chromium.launch();
  const errors = [];
  const watch = (page, who) => {
    page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(`${who} console: ${m.text()}`); });
    page.on('dialog', (d) => d.accept());
  };
  const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });

  try {
    const ectx = await browser.newContext({ ...devices['iPhone 13'] });
    const e = await ectx.newPage();
    watch(e, 'élève');
    await e.goto(`${BASE}/index.html`);
    await e.fill('#pw', 'mauvais');
    await e.click('button:has-text("Entrer")');
    await e.waitForSelector('.notice.bad:not([hidden])');
    check('Élève : mauvais mot de passe refusé', true);
    await e.fill('#pw', PW);
    await e.click('button:has-text("Entrer")');
    await e.waitForSelector('.year-card');
    await e.reload();
    await e.waitForSelector('.year-card');
    check('Élève : mot de passe mémorisé', true);
    await shot(e, '11-eleve-accueil');
    await e.click('a.year-card:has-text("1re année")');
    await e.waitForSelector('.semester');
    check('Élève : matières visibles (dossiers vides compris)', (await e.locator('.semester .card').count()) === 3);
    await e.click('.semester .card:has-text("Marketing")');
    await e.waitForSelector('.list-item');
    const titles = await e.locator('.list-item .title').allInnerTexts();
    check('Élève : cours triés, préfixe retiré, brouillon absent', titles.join('|') === 'Le mix marketing|La segmentation', titles.join(' | '));
    await shot(e, '13-eleve-matiere');
    await e.click('.list-item:has-text("Le mix marketing")');
    await e.waitForSelector('.pdf-page canvas', { timeout: 15000 });
    await e.waitForTimeout(1000);
    check('Élève : PDF rendu (3 pages)', (await e.locator('.pdf-page').count()) === 3);
    check('Élève : nombre de pages calculé à la publication', (await e.locator('.page-head .muted').innerText()).includes('cours 1 sur 2'));
    await shot(e, '14-eleve-cours');

    await e.goto(`${BASE}/index.html#/`);
    await e.click('a.year-card:has-text("1re année")');
    await e.click('.semester .card:has-text("Marketing")');
    await e.click('a.tab:has-text("Quiz")');
    await e.waitForSelector('.list-item:has-text("Quiz · Le mix marketing")');
    check('Élève : quiz lié au cours / quiz de matière', (await e.locator('h3:has-text("Le mix marketing")').count()) === 1 && (await e.locator('h3:has-text("toute la matière")').count()) === 1);
    await e.click('.list-item:has-text("Quiz · Le mix marketing")');
    await e.waitForSelector('.question-card');
    check('Quiz : aucune réponse affichée avant la fin', (await e.locator('.is-correct').count()) === 0);
    const answers = {
      'Quels éléments font partie des 4P ?': ['Prix', 'Produit'],
      'La stratégie d\'écrémage consiste à :': ['Fixer un prix élevé'],
      'La place correspond à :': ['Le positionnement'],
    };
    for (let i = 0; i < 4; i++) {
      const q = (await e.locator('.question-text').innerText()).trim();
      if (answers[q]) for (const c of answers[q]) await e.locator('.choice', { hasText: c }).locator('input').check();
      else await e.fill('.question-card textarea', 'La place du produit dans l\'esprit du client.');
      if (i < 3) await e.click('button:has-text("Suivant")');
    }
    await e.click('button:has-text("Terminer le quiz")');
    await e.waitForSelector('h1:has-text("Auto-évaluation")');
    await e.click('.seg button:has-text("Partiel")');
    await e.click('button:has-text("Voir mon résultat")');
    await e.waitForSelector('.result-score');
    const note = (await e.locator('.result-score').innerText()).replace(/\s+/g, ' ');
    check('Quiz : réponses JSON (numéros à partir de 1) correctement corrigées → 12,5/20', note.includes('12,5'), note);
    await shot(e, '18-eleve-resultat');

    await e.goto(`${BASE}/index.html#/`);
    await e.click('a.year-card:has-text("1re année")');
    await e.click('.semester .card:has-text("Marketing")');
    await e.click('a.tab:has-text("Quiz")');
    await e.click('a:has-text("Commencer")');
    await e.waitForSelector('.quiz-counter');
    check('Quiz de matière : 6 questions', (await e.locator('.quiz-counter').innerText()).endsWith('/ 6'));

    await e.goto(`${BASE}/index.html#/`);
    await e.waitForSelector('table.table');
    check('Accueil : progression', (await e.locator('table.table tbody').innerText()).includes('12,5/20'));
    await e.click('a.year-card:has-text("1re année")');
    await e.click('.semester .card:has-text("Marketing")');
    await e.click('a.tab:has-text("Liens")');
    await e.click('button:has-text("Regarder")');
    check('Liens : vidéo intégrée depuis liens.json', (await e.locator('.video-embed iframe').count()) === 1);

    // ----- Navigation fluide
    await e.goto(`${BASE}/index.html#/`);
    await e.waitForSelector('.resume-card');
    check('Accueil : « Reprendre la lecture » propose le dernier cours', (await e.locator('.resume-card').innerText()).includes('Le mix marketing'));
    await e.click('a.year-card:has-text("1re année")');
    await e.click('.semester .card:has-text("Marketing")');
    await e.waitForSelector('.course-row');
    check('Matière : bouton Quiz sur la ligne du cours', (await e.locator('.course-row:has-text("Le mix marketing") a.btn:has-text("Quiz")').count()) === 1);
    await e.click('a.tab:has-text("Liens")');
    await e.click('a.tab:has-text("Cours")');
    await e.click('.course-row:has-text("Le mix marketing") .row-link');
    await e.waitForSelector('.pdf-page canvas', { timeout: 15000 });
    check('Cours : bouton « Faire le quiz »', (await e.locator('.page-head a.btn:has-text("Faire le quiz")').count()) === 1);
    check('Cours : bloc de fin avec quiz et cours suivant', (await e.locator('.end-card a:has-text("Cours suivant")').count()) === 1);
    await e.click('.viewer-bar a[aria-label="Cours suivant"]');
    await e.waitForSelector('h1:has-text("La segmentation")');
    await e.goBack();
    await e.waitForSelector('.course-row');
    check('Retour arrière : cours suivant puis Retour → matière (pas le cours précédent)', true);
    check('Retour arrière : les onglets ne s\'empilent pas', (await e.locator('a.tab[aria-selected="true"]').innerText()).includes('Cours'));
    await e.goBack();
    await e.waitForSelector('.semester');
    check('Retour arrière : matière → année', true);
    await e.goForward();
    await e.waitForSelector('.course-row');
    await e.click('.course-row:has-text("Le mix marketing") a.btn:has-text("Quiz")');
    await e.waitForSelector('.question-card');
    await e.locator('.choice').first().locator('input').check();
    await e.click('button:has-text("Revoir le cours")');
    await e.waitForSelector('.sheet .pdf-page canvas', { timeout: 15000 });
    await e.screenshot({ path: path.join(SHOTS, '30-quiz-revoir-cours.png') });
    await e.click('.sheet button:has-text("Retour au quiz")');
    check('Quiz : « Revoir le cours » sans perdre les réponses', (await e.locator('.choice input:checked').count()) === 1 && (await e.locator('.sheet').count()) === 0);
    await e.click('.crumbs a:has-text("Le mix marketing"), .back-link');
    await e.waitForSelector('h1:has-text("Le mix marketing")');
    check('Quiz : retour (confirmé) vers le cours', true);
    await e.waitForSelector('.pdf-page canvas', { timeout: 15000 });
    await e.waitForTimeout(500);
    await e.screenshot({ path: path.join(SHOTS, '31-cours-mobile.png') });

    // ----- Mise à jour des contenus : nouveau cours, quiz modifié, cours supprimé
    fs.copyFileSync(PDF2, path.join(M, '03 - Le positionnement.pdf'));
    fs.unlinkSync(path.join(M, '02 - La segmentation.pdf'));
    const qf = path.join(M, 'Annale 2025.quiz.json');
    const qj = JSON.parse(fs.readFileSync(qf, 'utf8'));
    qj.questions.push({ q: 'Nouvelle question ?', reponse: 'Oui' });
    fs.writeFileSync(qf, JSON.stringify(qj));
    out = publish();
    check('Republication : seuls les changements sont écrits', /2 fichier\(s\) chiffré\(s\), 2 inchangé\(s\), 1 supprimé/.test(out), out.split('\n').filter((l) => l.includes('Publication')).pop());
    await e.goto(`${BASE}/index.html#/`);
    await e.reload();
    await e.waitForSelector('.year-card');
    await e.click('a.year-card:has-text("1re année")');
    await e.click('.semester .card:has-text("Marketing")');
    await e.waitForSelector('.list-item');
    const t2 = await e.locator('.list-item .title').allInnerTexts();
    check('Élève : mise à jour visible', t2.join('|') === 'Le mix marketing|Le positionnement', t2.join(' | '));

    // ----- Changement de mot de passe
    out = publish(['--changer-mot-de-passe'], { ISIAM_NOUVEAU_MDP: PW2 });
    check('Changement de mot de passe : tout rechiffré', /Nouveau mot de passe enregistré/.test(out));
    await e.reload();
    await e.waitForSelector('#pw');
    check('Élève : l\'ancien mot de passe ne suffit plus', (await e.locator('.notice.bad:not([hidden])').innerText()).includes('changé'));
    await e.fill('#pw', PW2);
    await e.click('button:has-text("Entrer")');
    await e.waitForSelector('.list-item:has-text("Le positionnement")');
    await e.click('.list-item:has-text("Le positionnement")');
    await e.waitForSelector('.pdf-page canvas', { timeout: 15000 });
    check('Élève : le nouveau mot de passe ouvre les cours', true);
    await e.waitForTimeout(800);
    await ectx.setOffline(true);
    await e.reload();
    await e.waitForSelector('.pdf-page canvas', { timeout: 15000 }).catch(() => {});
    check('PWA : cours déjà ouvert lisible hors connexion', (await e.locator('.pdf-page canvas').count()) > 0);
  } catch (err) {
    console.error('ÉCHEC :', err.message);
    results.push({ label: `Exception : ${err.message}`, ok: false });
  } finally {
    await browser.close();
    server.kill();
  }
  if (errors.length) { console.log('\nErreurs JS :'); errors.forEach((x) => console.log('  ' + x)); }
  const ko = results.filter((r) => !r.ok);
  console.log(`\n${results.length - ko.length}/${results.length} vérifications réussies`);
  process.exit(ko.length || errors.length ? 1 : 0);
})();
