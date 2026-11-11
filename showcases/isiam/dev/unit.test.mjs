// Tests unitaires : node --test dev/unit.test.mjs
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import assert from 'node:assert/strict';
import * as C from '../js/crypto.js';
import * as Q from '../js/quiz-engine.js';
import * as S from '../js/store.js';
import * as P from '../publier.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

test('publier : noms affichés et ordre', () => {
  assert.equal(P.displayName('01 - Le mix marketing'), 'Le mix marketing');
  assert.equal(P.displayName('2) Segmentation'), 'Segmentation');
  assert.equal(P.displayName('1re année'), '1re année');
  assert.equal(P.displayName('Semestre 1'), 'Semestre 1');
});

test('publier : rattachement quiz ↔ cours tolérant', () => {
  const pdfs = ['01_Management', '02_Pensée_Managériale', '03 - La demande'];
  assert.equal(P.linkQuiz('01_Quiz_Management', pdfs), '01_Management');
  assert.equal(P.linkQuiz('02_Quiz_Pensée_Managériale', pdfs), '02_Pensée_Managériale');
  assert.equal(P.linkQuiz('03 - La demande', pdfs), '03 - La demande');
  assert.equal(P.linkQuiz('Annale 2025', pdfs), null);
  assert.equal(P.displayName('02_Pensée_Managériale'), 'Pensée Managériale');
});

test('publier : lecture des quiz (QCM, ouverte, numéros à partir de 1)', () => {
  const r = P.parseQuiz(JSON.stringify({ titre: 'T', questions: [
    { q: 'Q1', choix: ['a', 'b', 'c'], reponses: [3, 1] },
    { q: 'Q2', choix: ['a', 'b'], reponses: 2 },
    { q: 'Q3', reponse: 'R' },
  ] }), 'f');
  assert.deepEqual(r.errors, []);
  assert.equal(r.titre, 'T');
  assert.deepEqual(r.questions[0], { id: 'x1', type: 'qcm', enonce: 'Q1', choix: ['a', 'b', 'c'], bonnes: [0, 2] });
  assert.deepEqual(r.questions[1].bonnes, [1]);
  assert.deepEqual(r.questions[2], { id: 'x3', type: 'ouverte', enonce: 'Q3', reponse: 'R' });
});

test('publier : erreurs de quiz explicites', () => {
  assert.match(P.parseQuiz('{ "questions": [ {"q":"x",} ] }', 'f').errors[0], /JSON invalide/);
  assert.match(P.parseQuiz('{}', 'f').errors[0], /questions/);
  const e = P.parseQuiz(JSON.stringify({ questions: [
    { q: 'x', choix: ['a', 'b'], reponses: [3] },
    { q: '', reponse: 'r' },
    { q: 'y' },
    { q: 'z', choix: ['a'], reponses: [1] },
    { q: 'w', choix: ['a', 'b'], reponse: 'r' },
  ] }), 'f').errors;
  assert.equal(e.length, 5);
  assert.match(e[0], /question 1 .*invalide/);
});

test('publier : nombre de pages (flux compressés)', () => {
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> endobj\n');
  assert.equal(P.pageCount(pdf), 2);
  const inner = Buffer.from('<< /Type /Pages /Count 7 /Kids [] >>');
  const zlib = require('node:zlib');
  const comp = Buffer.concat([Buffer.from('%PDF-1.5\n5 0 obj << /Type /ObjStm /Filter /FlateDecode >>\nstream\n'), zlib.deflateSync(inner), Buffer.from('\nendstream\n')]);
  assert.equal(P.pageCount(comp), 7);
});

test('publier : parcours du dossier de contenus', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'contenus-'));
  const m = path.join(root, '1re année', 'Semestre 1', 'Marketing');
  fs.mkdirSync(m, { recursive: true });
  fs.writeFileSync(path.join(m, '02 - B.pdf'), '%PDF-1.4');
  fs.writeFileSync(path.join(m, '01 - A.pdf'), '%PDF-1.4');
  fs.writeFileSync(path.join(m, '01 - A.quiz.json'), JSON.stringify({ questions: [{ q: 'q', reponse: 'r' }] }));
  fs.writeFileSync(path.join(m, 'Annale.quiz.json'), JSON.stringify({ titre: 'Annale 2025', questions: [{ q: 'q', reponse: 'r' }] }));
  fs.writeFileSync(path.join(m, '_03 - Brouillon.pdf'), '%PDF-1.4');
  fs.writeFileSync(path.join(m, 'liens.json'), JSON.stringify([{ titre: 'V', url: 'https://youtu.be/x' }]));
  const r = P.scan(root);
  assert.deepEqual(r.errors, []);
  assert.equal(r.drafts.length, 1);
  const mat = r.annees[0].semestres[0].matieres[0];
  assert.deepEqual(mat.cours.map((c) => c.titre), ['A', 'B']);
  assert.deepEqual(mat.quiz.map((q) => [q.titre, q.linked]), [['A', '01 - A'], ['Annale 2025', null]]);
  assert.equal(mat.liens.length, 1);
});

test('store : regroupement des quiz par cours', () => {
  const m = { cours: [{ id: 'c2', ordre: 2 }, { id: 'c1', ordre: 1 }], quiz: [{ id: 'q1', coursId: 'c2' }, { id: 'q2', coursId: null }, { id: 'q3', coursId: 'c1' }] };
  const g = S.quizGroups(m);
  assert.deepEqual(g.map((x) => [x.cours && x.cours.id, x.quiz.map((q) => q.id)]), [['c1', ['q3']], ['c2', ['q1']], [null, ['q2']]]);
});

test('store : détection YouTube', () => {
  assert.equal(S.youtubeId('https://www.youtube.com/watch?v=abc123'), 'abc123');
  assert.equal(S.youtubeId('https://youtu.be/xyz'), 'xyz');
  assert.equal(S.youtubeId('https://example.com'), null);
});
