// ==========================================================================
// Serveur de développement : sert le site (comme GitHub Pages) ET simule les
// quelques routes de l'API GitHub utilisées par l'admin, en écrivant dans le
// dossier servi. Permet de tout tester en local, sans compte GitHub.
//
//   node dev/mock-github.mjs [dossier-du-site] [port]
//   → site : http://localhost:8765/   API : http://localhost:8765/api
//   Jeton accepté : « test-token » ; propriétaire/dépôt : quelconques.
// ==========================================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const port = Number(process.argv[3] || 8765);
const TOKEN = process.env.MOCK_TOKEN || 'test-token';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.enc': 'application/octet-stream', '.pfb': 'application/octet-stream',
  '.ttf': 'font/ttf', '.txt': 'text/plain',
};

const blobs = new Map();
const trees = new Map();
const commits = new Map();
let head = 'c0';
commits.set('c0', { tree: 't0', parents: [], message: 'initial' });
const log = [];

const sha = () => crypto.randomBytes(20).toString('hex');

function walk(dir, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, rel));
    else out.push({ path: rel, type: 'blob', size: fs.statSync(full).size, mode: '100644' });
  }
  return out;
}

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  res.writeHead(status, { 'Content-Type': isBuf ? 'application/octet-stream' : 'application/json', 'Cache-Control': 'no-store', ...headers });
  res.end(isBuf ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const s = Buffer.concat(chunks).toString('utf8');
      try { resolve(s ? JSON.parse(s) : {}); } catch { resolve({}); }
    });
  });
}

async function api(req, res, url) {
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { message: 'Bad credentials' });
  const m = url.pathname.match(/^\/api\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
  if (!m) return send(res, 404, { message: 'Not Found' });
  const rest = m[3] || '';
  if (!rest && req.method === 'GET') return send(res, 200, { full_name: `${m[1]}/${m[2]}`, default_branch: 'main', permissions: { admin: true, push: true, pull: true } });

  let mm;
  if ((mm = rest.match(/^\/contents\/(.+)$/)) && req.method === 'GET') {
    const p = path.join(root, decodeURIComponent(mm[1]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return send(res, 404, { message: 'Not Found' });
    return send(res, 200, fs.readFileSync(p));
  }
  if (rest === '/git/ref/heads/main' && req.method === 'GET') return send(res, 200, { ref: 'refs/heads/main', object: { sha: head, type: 'commit' } });
  if ((mm = rest.match(/^\/git\/commits\/(\w+)$/)) && req.method === 'GET') {
    const c = commits.get(mm[1]);
    return c ? send(res, 200, { sha: mm[1], tree: { sha: `tree-of-${mm[1]}` } }) : send(res, 404, { message: 'Not Found' });
  }
  if ((mm = rest.match(/^\/git\/trees\/([^/?]+)$/)) && req.method === 'GET') return send(res, 200, { sha: mm[1], tree: walk(root), truncated: false });
  if (rest === '/git/blobs' && req.method === 'POST') {
    const b = await readBody(req);
    const id = sha();
    blobs.set(id, Buffer.from(b.content, b.encoding === 'base64' ? 'base64' : 'utf8'));
    return send(res, 201, { sha: id });
  }
  if (rest === '/git/trees' && req.method === 'POST') {
    const b = await readBody(req);
    for (const e of b.tree) if (e.sha && !blobs.has(e.sha)) return send(res, 422, { message: 'Invalid tree info' });
    const id = sha();
    trees.set(id, b.tree);
    return send(res, 201, { sha: id });
  }
  if (rest === '/git/commits' && req.method === 'POST') {
    const b = await readBody(req);
    const id = sha();
    commits.set(id, { tree: b.tree, parents: b.parents, message: b.message });
    return send(res, 201, { sha: id });
  }
  if (rest === '/git/refs/heads/main' && req.method === 'PATCH') {
    const b = await readBody(req);
    const c = commits.get(b.sha);
    if (!c) return send(res, 422, { message: 'Object does not exist' });
    if (c.parents[0] !== head) return send(res, 422, { message: 'Update is not a fast forward' });
    for (const e of trees.get(c.tree) || []) {
      const p = path.join(root, e.path);
      if (e.sha === null) { if (fs.existsSync(p)) fs.unlinkSync(p); } else {
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, blobs.get(e.sha));
      }
    }
    head = b.sha;
    log.push(c.message);
    console.log(`[commit] ${c.message}`);
    return send(res, 200, { object: { sha: head } });
  }
  if (rest === '/__log' && req.method === 'GET') return send(res, 200, log);
  return send(res, 404, { message: 'Not Found' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  let p = path.join(root, decodeURIComponent(url.pathname));
  if (!p.startsWith(root)) return send(res, 403, { message: 'Forbidden' });
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(p).pipe(res);
});

server.listen(port, () => console.log(`Site : http://localhost:${port}/  ·  API simulée : http://localhost:${port}/api  ·  dossier : ${root}`));
