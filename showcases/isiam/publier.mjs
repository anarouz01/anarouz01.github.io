#!/usr/bin/env node
// ==========================================================================
// Publication des révisions : chiffre les cours (PDF) et les quiz (JSON) du
// dossier de contenus et écrit le résultat dans data/, prêt à être poussé.
//
//   node publier.mjs                     publier (ne réécrit que ce qui a changé)
//   node publier.mjs --verifier          contrôler les contenus sans rien écrire
//   node publier.mjs --push              publier puis git add / commit / push de data/
//   node publier.mjs --changer-mot-de-passe   rechiffrer tout avec un nouveau mot de passe
//   node publier.mjs --source "C:\…\contenus" utiliser un autre dossier de contenus
//
// Mot de passe : demandé au lancement (jamais enregistré), ou variable ISIAM_MDP
// (et ISIAM_NOUVEAU_MDP pour --changer-mot-de-passe).
// Aucune dépendance : Node.js 18 ou plus.
// ==========================================================================
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCryptoConfig, unlock, encryptBytes, encryptJSON, decryptJSON, verifyKey } from './js/crypto.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, 'data');
const PATHS = {
  crypto: path.join(DATA, 'crypto.json'),
  index: path.join(DATA, 'index.enc'),
  coursDir: path.join(DATA, 'cours'),
  quizDir: path.join(DATA, 'quiz'),
};
const MAX_PDF = 20 * 1024 * 1024;
const WARN_PDF = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Petits utilitaires
// ---------------------------------------------------------------------------
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const ok = (s) => console.log(`${c(32, '✔')} ${s}`);
const info = (s) => console.log(`  ${s}`);
const warn = (s) => console.log(`${c(33, '!')} ${s}`);
const fail = (s) => console.log(`${c(31, '✘')} ${s}`);

function parseArgs(argv) {
  const a = { verifier: false, push: false, changer: false, tout: false, source: null, aide: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--verifier' || x === '--vérifier') a.verifier = true;
    else if (x === '--push') a.push = true;
    else if (x === '--changer-mot-de-passe') a.changer = true;
    else if (x === '--tout') a.tout = true;
    else if (x === '--source') a.source = argv[++i];
    else if (x.startsWith('--source=')) a.source = x.slice(9);
    else if (x === '--aide' || x === '--help' || x === '-h') a.aide = true;
    else throw new Error(`Option inconnue : ${x} (voir --aide)`);
  }
  return a;
}

/** « 01 - Le mix marketing » → « Le mix marketing » ; « 1re année » reste « 1re année ». */
export function displayName(name) {
  return name.replace(/^\d+\s*[-–—_.)]\s*/, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Retrouve le PDF auquel se rattache un quiz :
 * 1. même nom de fichier (« 01 - Titre.pdf » / « 01 - Titre.quiz.json ») ;
 * 2. sinon même numéro en tête, si un seul PDF le porte (« 01_Management.pdf » / « 01_Quiz_Management.quiz.json ») ;
 * 3. sinon même titre une fois le mot « quiz » retiré.
 */
export function linkQuiz(quizBase, pdfBases) {
  if (pdfBases.includes(quizBase)) return quizBase;
  const num = (b) => { const m = b.match(/^(\d+)\s*[-–—_.)]/); return m ? Number(m[1]) : null; };
  const n = num(quizBase);
  if (n !== null) {
    const same = pdfBases.filter((b) => num(b) === n);
    if (same.length === 1) return same[0];
  }
  const norm = (b) => displayName(b).toLowerCase().replace(/\bquiz\b/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const target = norm(quizBase);
  const byName = pdfBases.filter((b) => norm(b) === target);
  return byName.length === 1 ? byName[0] : null;
}
const natural = (a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
const hidden = (name) => name.startsWith('.') || /^(desktop\.ini|thumbs\.db)$/i.test(name);
const isDraft = (name) => name.startsWith('_');
const shortHash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);
const contentHash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 24);
const rel = (p, root) => path.relative(root, p).split(path.sep).join('/');

function isInside(child, parent) {
  const r = path.relative(parent, child);
  return r === '' || (!!r && !r.startsWith('..') && !path.isAbsolute(r));
}

function findRepoRoot(start) {
  for (let d = start; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.git'))) return d;
    if (path.dirname(d) === d) return null;
  }
}

function listDir(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => !hidden(e.name)).sort((x, y) => natural(x.name, y.name));
}

/** Nombre de pages d'un PDF (lecture du dictionnaire /Pages, flux compressés compris). */
export function pageCount(buf) {
  const texts = [buf.toString('latin1')];
  const s = texts[0];
  let i = 0;
  while ((i = s.indexOf('stream', i)) !== -1) {
    let st = i + 6;
    if (s[st] === '\r') st++;
    if (s[st] === '\n') st++;
    const end = s.indexOf('endstream', st);
    if (end < 0) break;
    try { texts.push(zlib.inflateSync(buf.subarray(st, end)).toString('latin1')); } catch { /* flux non compressé */ }
    i = end + 9;
  }
  let max = 0;
  for (const t of texts) {
    const re = /\/Type\s*\/Pages\b/g;
    let m;
    while ((m = re.exec(t))) {
      const w = t.slice(Math.max(0, m.index - 300), m.index + 300);
      for (const cm of w.matchAll(/\/Count\s+(\d+)/g)) max = Math.max(max, Number(cm[1]));
    }
  }
  return max;
}

// ---------------------------------------------------------------------------
// Lecture et contrôle des quiz
// ---------------------------------------------------------------------------
/**
 * Format attendu :
 * { "titre": "…", "questions": [
 *     { "q": "…", "choix": ["a","b","c"], "reponses": [1, 3] },   ← QCM (numéros à partir de 1)
 *     { "q": "…", "reponse": "…" } ] }                            ← question ouverte
 */
export function parseQuiz(text, where) {
  const errors = [];
  let raw;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (e) {
    return { errors: [`${where} : JSON invalide (${e.message})`] };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: [`${where} : le fichier doit contenir un objet { "titre": …, "questions": [ … ] }`] };
  if (raw.titre !== undefined && typeof raw.titre !== 'string') errors.push(`${where} : « titre » doit être un texte`);
  if (!Array.isArray(raw.questions) || !raw.questions.length) {
    errors.push(`${where} : « questions » doit être une liste non vide`);
    return { errors };
  }
  const questions = [];
  const usedIds = new Set();
  // Identifiant stable : tiré du texte de la question (insensible à l'ordre dans le fichier).
  const qid = (...parts) => {
    let id = `q${createHash('sha256').update(parts.join('\u0001')).digest('hex').slice(0, 10)}`;
    for (let k = 2; usedIds.has(id); k++) id = `${id.split('-')[0]}-${k}`;
    usedIds.add(id);
    return id;
  };
  raw.questions.forEach((q, i) => {
    const at = `${where}, question ${i + 1}`;
    if (!q || typeof q !== 'object') { errors.push(`${at} : doit être un objet`); return; }
    const enonce = typeof q.q === 'string' ? q.q.trim() : '';
    if (!enonce) errors.push(`${at} : « q » (énoncé) manquant ou vide`);
    const hasChoix = q.choix !== undefined;
    const hasReponse = q.reponse !== undefined;
    if (hasChoix && hasReponse) { errors.push(`${at} : utilisez soit « choix » + « reponses » (QCM), soit « reponse » (question ouverte), pas les deux`); return; }
    if (hasChoix) {
      if (!Array.isArray(q.choix) || q.choix.length < 2 || q.choix.length > 10 || q.choix.some((x) => typeof x !== 'string' || !x.trim())) {
        errors.push(`${at} : « choix » doit être une liste de 2 à 10 propositions non vides`);
        return;
      }
      let reps = q.reponses;
      if (typeof reps === 'number') reps = [reps];
      if (!Array.isArray(reps) || !reps.length) { errors.push(`${at} : « reponses » doit donner le ou les numéros des bonnes propositions (ex. [1, 3])`); return; }
      const bad = reps.filter((r) => !Number.isInteger(r) || r < 1 || r > q.choix.length);
      if (bad.length) { errors.push(`${at} : numéro(s) de bonne réponse invalide(s) ${JSON.stringify(bad)} (de 1 à ${q.choix.length})`); return; }
      questions.push({ id: qid('qcm', enonce, ...q.choix.map((x) => x.trim())), type: 'qcm', enonce, choix: q.choix.map((x) => x.trim()), bonnes: [...new Set(reps)].map((r) => r - 1).sort((a, b) => a - b) });
    } else if (hasReponse) {
      if (typeof q.reponse !== 'string' || !q.reponse.trim()) { errors.push(`${at} : « reponse » doit être un texte non vide`); return; }
      questions.push({ id: qid('ouverte', enonce), type: 'ouverte', enonce, reponse: q.reponse.trim() });
    } else {
      errors.push(`${at} : ajoutez « choix » + « reponses » (QCM) ou « reponse » (question ouverte)`);
    }
  });
  return { errors, titre: typeof raw.titre === 'string' ? raw.titre.trim() : '', questions };
}

function parseLiens(text, where) {
  let raw;
  try { raw = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (e) { return { errors: [`${where} : JSON invalide (${e.message})`] }; }
  if (!Array.isArray(raw)) return { errors: [`${where} : doit être une liste [ { "titre": …, "url": … } ]`] };
  const errors = [];
  const liens = [];
  raw.forEach((l, i) => {
    const url = l && typeof l.url === 'string' ? l.url.trim() : '';
    if (!/^https?:\/\/\S+$/i.test(url)) { errors.push(`${where}, lien ${i + 1} : « url » doit commencer par http:// ou https://`); return; }
    liens.push({ titre: (l.titre && String(l.titre).trim()) || url, url });
  });
  return { errors, liens };
}

// ---------------------------------------------------------------------------
// Parcours du dossier de contenus
// contenus / <année> / <semestre> / <matière> / fichiers
// ---------------------------------------------------------------------------
export function scan(source) {
  const errors = [];
  const warnings = [];
  const drafts = [];
  const annees = [];
  const dirs = (d) => listDir(d).filter((e) => {
    const p = path.join(d, e.name);
    if (!e.isDirectory()) { warnings.push(`Fichier ignoré (hors d'une matière) : ${rel(p, source)}`); return false; }
    if (isDraft(e.name)) { drafts.push(rel(p, source)); return false; }
    return true;
  });

  for (const ea of dirs(source)) {
    const aDir = path.join(source, ea.name);
    const annee = { nom: displayName(ea.name), semestres: [] };
    for (const es of dirs(aDir)) {
      const sDir = path.join(aDir, es.name);
      const semestre = { nom: displayName(es.name), matieres: [] };
      for (const em of dirs(sDir)) {
        const mDir = path.join(sDir, em.name);
        const matiere = { nom: displayName(em.name), dir: mDir, cours: [], quiz: [], liens: [] };
        const files = listDir(mDir);
        const pdfBases = files.filter((f) => f.isFile() && /\.pdf$/i.test(f.name) && !isDraft(f.name)).map((f) => f.name.replace(/\.pdf$/i, ''));
        for (const f of files) {
          const p = path.join(mDir, f.name);
          const where = rel(p, source);
          if (f.isDirectory()) { warnings.push(`Dossier ignoré (trop profond) : ${where}`); continue; }
          if (isDraft(f.name)) { drafts.push(where); continue; }
          if (/\.pdf$/i.test(f.name)) {
            const size = fs.statSync(p).size;
            if (size > MAX_PDF) { errors.push(`${where} : PDF trop lourd (${(size / 1048576).toFixed(1)} Mo, maximum 20 Mo)`); continue; }
            if (size > WARN_PDF) warnings.push(`${where} : PDF lourd (${(size / 1048576).toFixed(1)} Mo), affichage plus lent sur téléphone`);
            const base = f.name.replace(/\.pdf$/i, '');
            matiere.cours.push({ base, titre: displayName(base), file: p, where });
          } else if (/\.quiz\.json$/i.test(f.name)) {
            const base = f.name.replace(/\.quiz\.json$/i, '');
            const parsed = parseQuiz(fs.readFileSync(p, 'utf8'), where);
            errors.push(...parsed.errors);
            if (parsed.errors.length) continue;
            matiere.quiz.push({ base, titre: parsed.titre || displayName(base), questions: parsed.questions, linked: linkQuiz(base, pdfBases), where });
          } else if (/^liens\.json$/i.test(f.name)) {
            const parsed = parseLiens(fs.readFileSync(p, 'utf8'), where);
            errors.push(...parsed.errors);
            matiere.liens = parsed.liens || [];
          } else {
            warnings.push(`Fichier ignoré (ni .pdf, ni .quiz.json, ni liens.json) : ${where}`);
          }
        }
        const dup = (list) => list.map((x) => x.titre.toLowerCase()).filter((t, k, arr) => arr.indexOf(t) !== k);
        for (const t of new Set(dup(matiere.cours))) errors.push(`${rel(mDir, source)} : deux cours portent le titre « ${t} »`);
        for (const t of new Set(dup(matiere.quiz))) errors.push(`${rel(mDir, source)} : deux quiz portent le titre « ${t} »`);
        semestre.matieres.push(matiere);
      }
      annee.semestres.push(semestre);
    }
    annees.push(annee);
  }
  return { annees, errors, warnings, drafts };
}

// ---------------------------------------------------------------------------
// Mot de passe
// ---------------------------------------------------------------------------
function ask(question, { secret = true } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
    if (secret && process.stdin.isTTY) {
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write(s.includes('\n') ? '\n' : ''); };
    }
    rl.question(question, (answer) => { rl.close(); resolve(answer); });
  });
}

async function askNewPassword(label) {
  if (process.env.ISIAM_NOUVEAU_MDP || (label === 'initial' && process.env.ISIAM_MDP)) {
    const pw = process.env.ISIAM_NOUVEAU_MDP || process.env.ISIAM_MDP;
    if (pw.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères (12 conseillés).');
    return pw;
  }
  for (;;) {
    const a = await ask(`Nouveau mot de passe élève (12 caractères conseillés) : `);
    if (a.length < 8) { fail('Au moins 8 caractères.'); continue; }
    const b = await ask('Confirmez le mot de passe : ');
    if (a !== b) { fail('Les deux saisies diffèrent.'); continue; }
    return a;
  }
}

async function openKey(config) {
  if (process.env.ISIAM_MDP) {
    const k = await unlock(process.env.ISIAM_MDP, config);
    if (!k) throw new Error('ISIAM_MDP : mot de passe incorrect pour ce site.');
    return k;
  }
  for (let i = 0; i < 3; i++) {
    const k = await unlock(await ask('Mot de passe élève : '), config);
    if (k) return k;
    fail('Mot de passe incorrect.');
  }
  throw new Error('Mot de passe incorrect (3 essais).');
}

// ---------------------------------------------------------------------------
// Publication
// ---------------------------------------------------------------------------
function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function stripVolatile(idx) { const { majLe, ...rest } = idx; return JSON.stringify(rest); }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.aide) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 16).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return;
  }
  const cfgPath = path.join(HERE, 'publier.config.json');
  const cfg = fs.existsSync(cfgPath) ? readJSON(cfgPath) : {};
  const source = path.resolve(args.source ? process.cwd() : HERE, args.source || cfg.source || '../../../contenus');
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    throw new Error(`Dossier de contenus introuvable : ${source}\n  Créez-le, ou indiquez-le avec --source, ou dans publier.config.json.`);
  }
  // Garde-fou : le dossier de contenus (en clair) ne doit jamais se trouver dans le dépôt git.
  const repoRoot = findRepoRoot(HERE) || HERE;
  if (isInside(source, repoRoot)) throw new Error(`Le dossier de contenus (${source}) est dans le dépôt git : il serait publié en clair. Placez-le hors du dépôt (ex. à côté).`);

  console.log(c(1, `Contenus : ${source}`));
  const scanned = scan(source);
  scanned.warnings.forEach(warn);
  if (scanned.drafts.length) info(`${scanned.drafts.length} élément(s) en brouillon (préfixe « _ ») ignoré(s).`);
  if (scanned.errors.length) {
    scanned.errors.forEach(fail);
    throw new Error(`${scanned.errors.length} erreur(s) : rien n'a été publié. Corrigez puis relancez.`);
  }
  let nbC = 0; let nbQ = 0; let nbQuestions = 0; let nbM = 0;
  for (const a of scanned.annees) for (const s of a.semestres) for (const m of s.matieres) { nbM++; nbC += m.cours.length; nbQ += m.quiz.length; nbQuestions += m.quiz.reduce((x, q) => x + q.questions.length, 0); }
  for (const a of scanned.annees) for (const sm of a.semestres) for (const m of sm.matieres) {
    const libres = m.quiz.filter((q) => !q.linked);
    if (libres.length) info(`${m.nom} : quiz sur toute la matière (non rattaché à un cours) → ${libres.map((q) => q.titre).join(', ')}`);
  }
  ok(`Contrôle réussi : ${scanned.annees.length} année(s), ${nbM} matière(s), ${nbC} cours, ${nbQ} quiz (${nbQuestions} questions).`);
  if (args.verifier) return;

  // --- Clé de chiffrement
  fs.mkdirSync(PATHS.coursDir, { recursive: true });
  fs.mkdirSync(PATHS.quizDir, { recursive: true });
  let key;
  let force = args.tout;
  let oldIndex = null;
  if (!fs.existsSync(PATHS.crypto)) {
    console.log('Première publication : choisissez le mot de passe de l\'élève. Notez-le en lieu sûr.');
    const { config, key: k } = await createCryptoConfig(await askNewPassword('initial'));
    fs.writeFileSync(PATHS.crypto, JSON.stringify(config, null, 2));
    key = k;
    force = true;
  } else {
    const config = readJSON(PATHS.crypto);
    key = await openKey(config);
    if (fs.existsSync(PATHS.index)) {
      try { oldIndex = await decryptJSON(key, fs.readFileSync(PATHS.index)); } catch { oldIndex = null; force = true; }
    }
    if (args.changer) {
      const { config: nc, key: nk } = await createCryptoConfig(await askNewPassword('nouveau'));
      if (!(await verifyKey(nk, nc))) throw new Error('Échec de création de la nouvelle clé.');
      fs.writeFileSync(PATHS.crypto, JSON.stringify(nc, null, 2));
      key = nk;
      force = true;
      ok('Nouveau mot de passe enregistré : tout va être rechiffré.');
    }
  }

  // --- Anciennes empreintes (pour ne réécrire que ce qui a changé)
  const previous = new Map();
  if (oldIndex) {
    for (const a of oldIndex.annees) for (const s of a.semestres) for (const m of s.matieres) {
      for (const x of m.cours) previous.set(x.id, x);
      for (const x of m.quiz) previous.set(x.id, x);
    }
  }

  const stats = { ecrits: 0, inchanges: 0, supprimes: 0 };
  const keep = new Set();
  async function writeEnc(dir, id, h, makeBytes) {
    const file = path.join(dir, `${id}.enc`);
    keep.add(file);
    const prev = previous.get(id);
    if (!force && prev && prev.h === h && fs.existsSync(file)) { stats.inchanges++; return prev.v; }
    fs.writeFileSync(file, await makeBytes());
    stats.ecrits++;
    return Date.now();
  }

  // --- Construction de l'index
  const index = { version: 1, majLe: new Date().toISOString(), annees: [] };
  for (const [ai, a] of scanned.annees.entries()) {
    const aId = `a-${shortHash(`annee:${a.nom}`)}`;
    const annee = { id: aId, nom: a.nom, ordre: ai + 1, semestres: [] };
    for (const [si, s] of a.semestres.entries()) {
      const semestre = { id: `s-${shortHash(`semestre:${a.nom}/${s.nom}`)}`, nom: s.nom, ordre: si + 1, matieres: [] };
      for (const [mi, m] of s.matieres.entries()) {
        const mKey = `${a.nom}/${s.nom}/${m.nom}`;
        const matiere = { id: `m-${shortHash(`matiere:${mKey}`)}`, nom: m.nom, ordre: mi + 1, brouillon: false, cours: [], quiz: [], liens: [] };
        const coursIdByBase = new Map();
        for (const [ci, co] of m.cours.entries()) {
          const id = `c-${shortHash(`cours:${mKey}/${co.titre}`)}`;
          const buf = fs.readFileSync(co.file);
          if (!buf.subarray(0, 1024).toString('latin1').includes('%PDF-')) throw new Error(`${co.where} : ce fichier n'est pas un PDF valide.`);
          const h = contentHash(buf);
          const v = await writeEnc(PATHS.coursDir, id, h, () => encryptBytes(key, new Uint8Array(buf)));
          coursIdByBase.set(co.base, id);
          matiere.cours.push({ id, titre: co.titre, ordre: ci + 1, brouillon: false, pages: pageCount(buf), octets: buf.length, v, h });
        }
        for (const q of m.quiz) {
          const id = `q-${shortHash(`quiz:${mKey}/${q.base}`)}`;
          const content = { id, questions: q.questions };
          const h = contentHash(Buffer.from(JSON.stringify(content)));
          const v = await writeEnc(PATHS.quizDir, id, h, () => encryptJSON(key, content));
          matiere.quiz.push({ id, titre: q.titre, coursId: q.linked ? coursIdByBase.get(q.linked) : null, nbQuestions: q.questions.length, brouillon: false, v, h });
        }
        m.liens.forEach((l, li) => {
          const yt = /(?:youtube(?:-nocookie)?\.com|youtu\.be)\//i.test(l.url);
          matiere.liens.push({ id: `l-${shortHash(`lien:${mKey}/${l.url}`)}`, titre: l.titre, url: l.url, type: yt ? 'video' : 'lien', ordre: li + 1 });
        });
        semestre.matieres.push(matiere);
      }
      annee.semestres.push(semestre);
    }
    index.annees.push(annee);
  }

  // --- Fichiers chiffrés devenus inutiles
  for (const dir of [PATHS.coursDir, PATHS.quizDir]) {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (f.endsWith('.enc') && !keep.has(p)) { fs.unlinkSync(p); stats.supprimes++; }
    }
  }

  // --- Index (réécrit seulement s'il a changé)
  const indexChanged = force || !oldIndex || stripVolatile(oldIndex) !== stripVolatile(index);
  if (indexChanged) fs.writeFileSync(PATHS.index, await encryptJSON(key, index));

  const changed = indexChanged || stats.ecrits || stats.supprimes;
  ok(`Publication prête : ${stats.ecrits} fichier(s) chiffré(s), ${stats.inchanges} inchangé(s), ${stats.supprimes} supprimé(s)${indexChanged ? ', index mis à jour' : ''}.`);
  if (!changed) { info('Aucun changement à publier.'); return; }

  if (args.push) {
    const git = (...a) => execFileSync('git', a, { cwd: HERE, stdio: 'inherit' });
    git('add', '--all', '--', 'data');
    try {
      git('commit', '-m', 'Mise à jour des révisions', '--', 'data');
    } catch {
      info('Rien à valider dans git.');
      return;
    }
    try {
      git('push');
    } catch {
      throw new Error('git push a échoué. Si GitHub contient des modifications plus récentes : git pull, puis git push (jamais --force).');
    }
    ok('Poussé sur GitHub : visible par l\'élève sous 1 à 10 minutes.');
  } else {
    info('Pour mettre en ligne :  git add data  →  git commit  →  git push   (ou relancez avec --push)');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { fail(e.message); process.exitCode = 1; });
}
