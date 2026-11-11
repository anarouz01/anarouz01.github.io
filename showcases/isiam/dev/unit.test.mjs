// Tests unitaires : node --test dev/unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/crypto.js';
import * as Q from '../js/quiz-engine.js';
import * as S from '../js/store.js';

test('chiffrement : aller-retour texte et binaire', async () => {
  const { config, key } = await C.createCryptoConfig('MotDePasse2026!', 1000);
  assert.equal(await C.verifyKey(key, config), true);
  const obj = { a: 'é', n: [1, 2, 3] };
  assert.deepEqual(await C.decryptJSON(key, await C.encryptJSON(key, obj)), obj);
  const big = C.randomBytes(5 * 1024 * 1024);
  const enc = await C.encryptBytes(key, big);
  assert.equal(enc.length, big.length + 12 + 16);
  assert.deepEqual(await C.decryptBytes(key, enc), big);
});

test('chiffrement : mauvais mot de passe et fichier altéré rejetés', async () => {
  const { config, key } = await C.createCryptoConfig('bon-mot-de-passe', 1000);
  assert.equal(await C.unlock('mauvais', config), null);
  assert.ok(await C.unlock('bon-mot-de-passe', config));
  const enc = await C.encryptJSON(key, { x: 1 });
  enc[enc.length - 1] ^= 0xff;
  await assert.rejects(() => C.decryptJSON(key, enc), /Déchiffrement impossible/);
});

test('chiffrement : deux chiffrements du même contenu diffèrent (IV aléatoire)', async () => {
  const { key } = await C.createCryptoConfig('x', 1000);
  const a = await C.encryptJSON(key, { x: 1 });
  const b = await C.encryptJSON(key, { x: 1 });
  assert.notDeepEqual(a, b);
});

test('PBKDF2 600 000 itérations : durée raisonnable', async () => {
  const t = Date.now();
  await C.deriveKey('MotDePasse2026!', C.toB64(C.randomBytes(16)));
  assert.ok(Date.now() - t < 5000);
});

test('quiz : QCM correct seulement si ensemble exact', () => {
  const q = { type: 'qcm', choix: ['a', 'b', 'c', 'd'], bonnes: [0, 2] };
  assert.equal(Q.isQcmCorrect(q, [2, 0]), true);
  assert.equal(Q.isQcmCorrect(q, [0]), false);
  assert.equal(Q.isQcmCorrect(q, [0, 1, 2]), false);
  assert.equal(Q.isQcmCorrect(q, []), false);
});

test('quiz : barème (QCM, auto-évaluation)', () => {
  const qs = [
    { id: '1', type: 'qcm', choix: ['a', 'b'], bonnes: [1] },
    { id: '2', type: 'qcm', choix: ['a', 'b', 'c'], bonnes: [0, 1] },
    { id: '3', type: 'ouverte', reponse: 'r' },
    { id: '4', type: 'ouverte', reponse: 'r' },
  ];
  const items = Q.prepare(qs, { random: false });
  const r = Q.score(items, { 1: { selected: [1] }, 2: { selected: [0] }, 3: { texte: 'x', auto: 'juste' }, 4: { texte: 'y', auto: 'partiel' } });
  assert.equal(r.points, 2.5);
  assert.equal(r.total, 4);
  assert.equal(r.sur20, 12.5);
  assert.equal(r.pct, 63);
  assert.deepEqual(r.details.map((d) => d.verdict), ['juste', 'faux', 'juste', 'partiel']);
});

test('quiz : le mélange conserve la correspondance des propositions', () => {
  const q = { id: 'q', type: 'qcm', choix: ['A', 'B', 'C', 'D', 'E'], bonnes: [3] };
  const [item] = Q.prepare([q], { rng: Q.mulberry32(7) });
  assert.deepEqual([...item.perm].sort(), [0, 1, 2, 3, 4]);
  const displayedPos = item.perm.indexOf(3);
  const selected = [item.perm[displayedPos]];
  assert.equal(Q.isQcmCorrect(q, selected), true);
});

test('quiz matière : répartition équilibrée', () => {
  assert.deepEqual(Q.allocate([4, 10, 15], 20), [4, 8, 8]);
  assert.deepEqual(Q.allocate([10, 10], 20), [10, 10]);
  assert.deepEqual(Q.allocate([30, 30, 30], 20), [7, 7, 6]);
  assert.deepEqual(Q.allocate([2, 3], 20), [2, 3]);
  assert.deepEqual(Q.allocate([0, 25], 20), [0, 20]);
  assert.equal(Q.allocate([5, 6, 7, 8, 9], 20).reduce((a, b) => a + b), 20);
});

test('quiz matière : 20 questions uniques tirées de chaque groupe', () => {
  const g = (p, n) => Array.from({ length: n }, (_, i) => ({ id: `${p}${i}` }));
  const out = Q.buildMatiereQuiz([g('a', 4), g('b', 10), g('c', 15)], 20, Q.mulberry32(1));
  assert.equal(out.length, 20);
  assert.equal(new Set(out.map((q) => q.id)).size, 20);
  assert.equal(out.filter((q) => q.id.startsWith('a')).length, 4);
  assert.equal(out.filter((q) => q.id.startsWith('b')).length, 8);
});

test('store : années, matières, cours, quiz, déplacements, suppressions', () => {
  const idx = S.emptyIndex();
  const a = S.addAnnee(idx);
  assert.equal(a.nom, '1re année');
  assert.equal(a.semestres.length, 2);
  const m = S.addMatiere(idx, a.semestres[0].id, 'Marketing');
  const m2 = S.addMatiere(idx, a.semestres[0].id, 'Finance');
  const c1 = S.addCours(idx, m.id, { titre: 'Ch1', pages: 3, octets: 10 });
  const c2 = S.addCours(idx, m.id, { titre: 'Ch2' });
  const q1 = S.addQuiz(idx, m.id, { titre: 'Q1', coursId: c1.id, nbQuestions: 5 });
  S.addQuiz(idx, m.id, { titre: 'Q2', coursId: null });
  assert.equal(S.locateQuiz(idx, q1.id).matiere.id, m.id);
  // réordonner
  S.reorder(m.cours, c2.id, -1);
  assert.deepEqual(S.sorted(m.cours).map((c) => c.titre), ['Ch2', 'Ch1']);
  // déplacer un cours : son quiz suit
  S.moveCours(idx, c1.id, m2.id);
  assert.equal(S.locateQuiz(idx, q1.id).matiere.id, m2.id);
  // supprimer le cours : le quiz reste, rattaché à la matière
  const del = S.deleteCours(idx, c1.id);
  assert.deepEqual(del, [S.PATHS.cours(c1.id)]);
  assert.equal(S.locateQuiz(idx, q1.id).quiz.coursId, null);
  // déplacer une matière de semestre
  S.moveMatiere(idx, m2.id, a.semestres[1].id);
  assert.equal(S.locateMatiere(idx, m2.id).semestre.id, a.semestres[1].id);
  // supprimer une année renvoie tous ses fichiers
  const files = S.deleteAnnee(idx, a.id);
  assert.equal(files.length, 3);
  assert.equal(idx.annees.length, 0);
});

test('store : brouillons masqués côté élève', () => {
  const idx = S.emptyIndex();
  const a = S.addAnnee(idx);
  const m = S.addMatiere(idx, a.semestres[0].id, 'M');
  const mb = S.addMatiere(idx, a.semestres[0].id, 'Brouillon');
  mb.brouillon = true;
  const c = S.addCours(idx, m.id, { titre: 'C', brouillon: true });
  S.addCours(idx, m.id, { titre: 'Visible' });
  S.addQuiz(idx, m.id, { titre: 'Q', coursId: c.id });
  S.addQuiz(idx, m.id, { titre: 'Qb', brouillon: true });
  const v = S.visibleIndex(idx);
  const sem = v.annees[0].semestres[0];
  assert.deepEqual(sem.matieres.map((x) => x.nom), ['M']);
  assert.deepEqual(sem.matieres[0].cours.map((x) => x.titre), ['Visible']);
  assert.deepEqual(sem.matieres[0].quiz.map((x) => [x.titre, x.coursId]), [['Q', null]]);
  // l'original n'est pas modifié
  assert.equal(idx.annees[0].semestres[0].matieres.length, 2);
});

test('store : validation des questions', () => {
  assert.equal(S.validateQuestions([]).length, 1);
  const errs = S.validateQuestions([
    { type: 'qcm', enonce: 'x', choix: ['a', 'b'], bonnes: [] },
    { type: 'ouverte', enonce: '', reponse: '' },
  ]);
  assert.equal(errs.length, 3);
  assert.deepEqual(S.validateQuestions([{ type: 'qcm', enonce: 'x', choix: ['a', 'b'], bonnes: [1] }]), []);
});

test('store : détection YouTube', () => {
  assert.equal(S.youtubeId('https://www.youtube.com/watch?v=abc123'), 'abc123');
  assert.equal(S.youtubeId('https://youtu.be/xyz'), 'xyz');
  assert.equal(S.youtubeId('https://www.youtube.com/shorts/s1'), 's1');
  assert.equal(S.youtubeId('https://example.com'), null);
});
