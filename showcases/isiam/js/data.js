// ==========================================================================
// Lecture des contenus publiés (côté élève) : simples fetch relatifs sur
// GitHub Pages, sans jeton. Les fichiers sont déchiffrés dans le navigateur.
// ==========================================================================
import { decryptBytes, decryptJSON } from './crypto.js';
import { PATHS } from './store.js';

export async function fetchBytes(path, version) {
  const url = version ? `${path}?v=${encodeURIComponent(version)}` : path;
  let res;
  try {
    res = await fetch(url, { cache: 'no-cache' });
  } catch {
    throw new Error('Connexion impossible. Vérifiez votre accès à internet.');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Erreur de chargement (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

export class PublishedData {
  constructor(base = '') {
    this.base = base;
  }

  async config() {
    const bytes = await fetchBytes(this.base + PATHS.crypto, Date.now());
    if (!bytes) return null;
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  async index(key) {
    const bytes = await fetchBytes(this.base + PATHS.index, Date.now());
    if (!bytes) throw new Error('Le site n\'a pas encore été initialisé.');
    return decryptJSON(key, bytes);
  }

  async cours(key, cours) {
    const bytes = await fetchBytes(this.base + PATHS.cours(cours.id), cours.v);
    if (!bytes) throw new Error('Fichier du cours introuvable (publication en cours ? réessayez dans quelques minutes).');
    return decryptBytes(key, bytes);
  }

  async quiz(key, quiz) {
    const bytes = await fetchBytes(this.base + PATHS.quiz(quiz.id), quiz.v);
    if (!bytes) throw new Error('Fichier du quiz introuvable (publication en cours ? réessayez dans quelques minutes).');
    return decryptJSON(key, bytes);
  }
}
