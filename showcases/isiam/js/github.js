// ==========================================================================
// Client minimal de l'API GitHub (utilisé uniquement par l'admin).
// Écritures groupées en UN commit atomique via l'API Git Data.
// ==========================================================================
import { toB64 } from './crypto.js';

export class GitHubError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function explain(status, body) {
  if (status === 401) return 'Jeton GitHub invalide ou expiré.';
  if (status === 403 && /rate limit/i.test(body)) return 'Limite de requêtes GitHub atteinte, réessayez dans quelques minutes.';
  if (status === 403) return 'Accès refusé : le jeton n\'a pas la permission « Contents : Read and write » sur ce dépôt.';
  if (status === 404) return 'Dépôt ou fichier introuvable (vérifiez propriétaire, nom du dépôt et branche).';
  if (status === 409) return 'Le dépôt est vide : poussez d\'abord le code du site (voir README).';
  if (status === 422) return 'GitHub a refusé la modification (conflit de version).';
  return `Erreur GitHub (${status}).`;
}

export class GitHub {
  /**
   * root : dossier du site dans le dépôt (ex. « showcases/isiam »), vide si le site est à la racine.
   * Tous les chemins manipulés par l'application sont relatifs à ce dossier.
   */
  constructor({ token, owner, repo, branch = 'main', apiBase = 'https://api.github.com', root = '' }) {
    this.token = token;
    this.root = normalizeRoot(root);
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.apiBase = apiBase.replace(/\/$/, '');
  }

  /** Chemin dans le dépôt d'un fichier du site. */
  full(path) { return this.root ? `${this.root}/${path}` : path; }

  get repoPath() { return `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`; }

  async request(path, { method = 'GET', body, accept = 'application/vnd.github+json', raw = false } = {}) {
    let res;
    try {
      res = await fetch(this.apiBase + path, {
        method,
        cache: 'no-store',
        headers: {
          Accept: accept,
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new GitHubError('Impossible de joindre GitHub (connexion internet ?).', 0, String(e));
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new GitHubError(explain(res.status, text), res.status, text);
    }
    if (raw) return new Uint8Array(await res.arrayBuffer());
    if (res.status === 204) return null;
    return res.json();
  }

  /** Vérifie l'accès ; renvoie les infos du dépôt. */
  async checkAccess() {
    const info = await this.request(this.repoPath);
    if (!info.permissions || !info.permissions.push) {
      throw new GitHubError('Le jeton peut lire ce dépôt mais pas y écrire.', 403);
    }
    return info;
  }

  /** Contenu brut d'un fichier (Uint8Array) ou null s'il n'existe pas. */
  async getFile(path) {
    try {
      return await this.request(`${this.repoPath}/contents/${this.full(path).split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(this.branch)}`,
        { accept: 'application/vnd.github.raw+json', raw: true });
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  /** Arborescence complète de la branche (chemins du dépôt) : [{path, size, type}]. */
  async listRepoTree() {
    const t = await this.request(`${this.repoPath}/git/trees/${encodeURIComponent(this.branch)}?recursive=1`);
    return t.tree || [];
  }

  /** Fichiers du site uniquement, chemins relatifs au dossier du site. */
  async listTree() {
    const prefix = this.root ? `${this.root}/` : '';
    return (await this.listRepoTree())
      .filter((t) => t.path.startsWith(prefix))
      .map((t) => ({ ...t, path: t.path.slice(prefix.length) }));
  }

  /**
   * Un seul commit pour plusieurs fichiers.
   * changes : [{ path, bytes: Uint8Array }] ou [{ path, delete: true }]
   */
  async commit(changes, message, { retries = 2 } = {}) {
    if (!changes.length) return null;
    // Les blobs ne dépendent pas de la branche : créés une seule fois.
    const entries = [];
    for (const c of changes) {
      if (c.delete) {
        entries.push({ path: this.full(c.path), mode: '100644', type: 'blob', sha: null });
      } else {
        const blob = await this.request(`${this.repoPath}/git/blobs`, {
          method: 'POST', body: { content: toB64(c.bytes), encoding: 'base64' },
        });
        entries.push({ path: this.full(c.path), mode: '100644', type: 'blob', sha: blob.sha });
      }
    }
    for (let attempt = 0; ; attempt++) {
      const ref = await this.request(`${this.repoPath}/git/ref/heads/${encodeURIComponent(this.branch)}`);
      const headSha = ref.object.sha;
      const head = await this.request(`${this.repoPath}/git/commits/${headSha}`);
      // Une suppression d'un fichier absent fait échouer l'arbre : on filtre.
      let treeEntries = entries;
      if (entries.some((e) => e.sha === null)) {
        const existing = new Set((await this.listTreeAt(head.tree.sha)).map((t) => t.path));
        treeEntries = entries.filter((e) => e.sha !== null || existing.has(e.path));
      }
      if (!treeEntries.length) return headSha;
      const tree = await this.request(`${this.repoPath}/git/trees`, {
        method: 'POST', body: { base_tree: head.tree.sha, tree: treeEntries },
      });
      const commit = await this.request(`${this.repoPath}/git/commits`, {
        method: 'POST', body: { message, tree: tree.sha, parents: [headSha] },
      });
      try {
        await this.request(`${this.repoPath}/git/refs/heads/${encodeURIComponent(this.branch)}`, {
          method: 'PATCH', body: { sha: commit.sha, force: false },
        });
        return commit.sha;
      } catch (e) {
        if ((e.status === 422 || e.status === 409) && attempt < retries) continue;
        throw e;
      }
    }
  }

  async listTreeAt(treeSha) {
    const t = await this.request(`${this.repoPath}/git/trees/${treeSha}?recursive=1`);
    return t.tree || [];
  }
}

/** « /showcases/isiam/ » → « showcases/isiam » */
export function normalizeRoot(root) {
  return String(root || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

/** Segments du chemin du site, d'après l'adresse de la page d'administration. */
export function sitePathParts(loc = window.location) {
  return loc.pathname.replace(/\/gestion-[^/]+(\/.*)?$/, '').split('/').filter(Boolean);
}

/** Propriétaire déduit d'une adresse « <owner>.github.io », sinon chaîne vide. */
export function guessOwner(loc = window.location) {
  const m = loc.hostname.match(/^([^.]+)\.github\.io$/i);
  return m ? m[1] : '';
}

/**
 * Dossier du site dans le dépôt.
 * Site utilisateur (dépôt « alice.github.io ») : https://alice.github.io/showcases/isiam/ → « showcases/isiam ».
 * Site de projet (dépôt « revisions ») : https://alice.github.io/revisions/cours/ → « cours ».
 */
export function guessRoot(repo, loc = window.location) {
  const parts = sitePathParts(loc);
  const projectSite = /\.github\.io$/i.test(loc.hostname) && parts[0] && repo
    && parts[0].toLowerCase() === String(repo).toLowerCase() && !/\.github\.io$/i.test(repo);
  return (projectSite ? parts.slice(1) : parts).join('/');
}
