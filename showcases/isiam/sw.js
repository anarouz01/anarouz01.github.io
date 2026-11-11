// ==========================================================================
// Service worker : rend le site installable et utilisable hors connexion pour
// ce qui a déjà été ouvert. Réseau d'abord (toujours la dernière version en
// ligne), cache en secours. 
// ==========================================================================
const VERSION = '2026-11-11.4';
const CACHE = `isiam-${VERSION}`;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/theme.css', 'css/components.css', 'css/pdf.css',
  'js/eleve/app.js', 'js/crypto.js', 'js/data.js', 'js/store.js', 'js/ui.js', 'js/router.js',
  'js/pdf-viewer.js', 'js/quiz-ui.js', 'js/quiz-engine.js', 'js/history.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('isiam-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope);
  const rel = url.pathname.slice(scope.pathname.length);
  if (rel.startsWith('dev/')) return; // outils de développement : jamais en cache

  // PDF.js : fichiers figés → cache d'abord.
  if (rel.startsWith('vendor/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  // Données chiffrées : une seule entrée par fichier (paramètre ?v ignoré).
  const isData = rel.startsWith('data/');
  const key = isData ? new Request(url.origin + url.pathname) : req;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
    return res;
  }).catch(() => caches.match(key, { ignoreSearch: true }).then((hit) => hit || Response.error())));
});
