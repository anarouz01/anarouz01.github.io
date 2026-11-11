// ==========================================================================
// Chiffrement des contenus : AES-GCM 256 bits, clé dérivée du mot de passe
// élève par PBKDF2-SHA-256. Format d'un fichier .enc : IV (12 octets) || texte
// chiffré (tag GCM inclus). Aucune dépendance : Web Crypto natif.
// ==========================================================================

export const ITERATIONS = 600000;
export const CHECK_TEXT = 'ISIAM-OK';
const IV_LEN = 12;
const subtle = globalThis.crypto.subtle;
const te = new TextEncoder();
const td = new TextDecoder();

export function randomBytes(n) {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i += 65536) globalThis.crypto.getRandomValues(b.subarray(i, Math.min(n, i + 65536)));
  return b;
}

export function toB64(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

export function fromB64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Dérive la clé AES-GCM (non exportable) à partir du mot de passe. */
export async function deriveKey(password, saltB64, iterations = ITERATIONS) {
  const base = await subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(saltB64), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Chiffre des octets ; renvoie IV || texte chiffré. */
export async function encryptBytes(key, bytes) {
  const iv = randomBytes(IV_LEN);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  const out = new Uint8Array(IV_LEN + ct.length);
  out.set(iv, 0);
  out.set(ct, IV_LEN);
  return out;
}

/** Déchiffre IV || texte chiffré. Lève une erreur si la clé est mauvaise ou le fichier altéré. */
export async function decryptBytes(key, data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.length <= IV_LEN) throw new Error('Fichier chiffré invalide');
  const iv = bytes.subarray(0, IV_LEN);
  const ct = bytes.subarray(IV_LEN);
  try {
    return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct));
  } catch {
    throw new Error('Déchiffrement impossible (mot de passe incorrect ou fichier altéré)');
  }
}

export async function encryptJSON(key, obj) {
  return encryptBytes(key, te.encode(JSON.stringify(obj)));
}

export async function decryptJSON(key, data) {
  return JSON.parse(td.decode(await decryptBytes(key, data)));
}

/** Crée la configuration publique (data/crypto.json) et la clé associée. */
export async function createCryptoConfig(password, iterations = ITERATIONS) {
  const salt = toB64(randomBytes(16));
  const key = await deriveKey(password, salt, iterations);
  const check = toB64(await encryptBytes(key, te.encode(CHECK_TEXT)));
  return { config: { version: 1, algo: 'AES-GCM-256/PBKDF2-SHA-256', salt, iterations, check }, key };
}

/** Vrai si la clé ouvre le témoin de crypto.json. */
export async function verifyKey(key, config) {
  try {
    const plain = td.decode(await decryptBytes(key, fromB64(config.check)));
    return plain === CHECK_TEXT;
  } catch {
    return false;
  }
}

/** Dérive la clé et la vérifie ; renvoie la clé ou null. */
export async function unlock(password, config) {
  const key = await deriveKey(password, config.salt, config.iterations || ITERATIONS);
  return (await verifyKey(key, config)) ? key : null;
}

// ---------- Conservation de la clé dans IndexedDB (non exportable) ----------
const DB_NAME = 'isiam';
const STORE = 'keys';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req && req.result); };
    t.onerror = () => { db.close(); reject(t.error); };
    t.onabort = () => { db.close(); reject(t.error); };
  });
}

export async function saveKey(name, key) {
  try { await tx('readwrite', (s) => s.put(key, name)); return true; } catch { return false; }
}

export async function loadKey(name) {
  try { return (await tx('readonly', (s) => s.get(name))) || null; } catch { return null; }
}

export async function forgetKey(name) {
  try { await tx('readwrite', (s) => s.delete(name)); } catch { /* ignoré */ }
}
