// ==========================================================================
// Routeur par hash (#/chemin?param=valeur) : fonctionne sur GitHub Pages sans
// configuration serveur.
// - Bouton Retour du navigateur : la position de défilement est restaurée.
// - back(chemin) : « remonter » vers la page parente sans empiler l'historique
//   (si la page précédente est déjà la parente, on revient simplement en arrière).
// - Liens marqués data-replace (onglets) : remplacent l'entrée d'historique.
// ==========================================================================

export function createRouter(routes, notFound) {
  const compiled = routes.map(([pattern, handler]) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\/:(\w+)(\?)?/g, (_, k, opt) => {
      keys.push(k);
      return opt ? '(?:/([^/]+))?' : '/([^/]+)';
    }) + '/?$');
    return { re, keys, handler };
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  let guard = null;
  let skip = false;
  let pendingReplace = false;
  // Numérotation des entrées d'historique, conservée le temps de l'onglet (survit à un rechargement).
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem('isiam.nav') || 'null'); } catch { return null; } })();
  let counter = saved ? saved.counter : 0;
  let curN = 0;
  const entries = new Map(saved ? saved.entries : []); // n → hash
  const scrolls = new Map(saved ? saved.scrolls : []); // n → scrollY
  const persist = () => {
    try { sessionStorage.setItem('isiam.nav', JSON.stringify({ counter, entries: [...entries].slice(-200), scrolls: [...scrolls].slice(-200) })); } catch { /* ignoré */ }
  };
  window.addEventListener('pagehide', persist);

  window.addEventListener('scroll', () => { scrolls.set(curN, window.scrollY); }, { passive: true });

  function parse() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs || '')) };
  }

  async function run() {
    if (skip) { skip = false; return; }
    const st = history.state;
    let n;
    let isBackForward = false;
    if (st && typeof st.n === 'number' && entries.has(st.n)) {
      n = st.n;
      isBackForward = n !== curN;
    } else if (pendingReplace) {
      n = curN || ++counter;
      history.replaceState({ n }, '');
    } else {
      n = ++counter;
      history.replaceState({ n }, '');
    }
    pendingReplace = false;

    // Retour arrière pendant un quiz : confirmation, sinon on revient où l'on était.
    if (guard && isBackForward) {
      if (!guard()) {
        skip = true;
        history.go(curN - n);
        return;
      }
      guard = null;
    }

    curN = n;
    entries.set(n, location.hash);
    persist();
    const { path, query } = parse();
    for (const r of compiled) {
      const m = path.match(r.re);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => { params[k] = m[i + 1] ? decodeURIComponent(m[i + 1]) : undefined; });
        const restore = isBackForward ? scrolls.get(n) || 0 : 0;
        window.scrollTo(0, 0);
        await r.handler(params, query);
        if (restore) requestAnimationFrame(() => window.scrollTo(0, restore));
        return;
      }
    }
    notFound(path);
  }

  window.addEventListener('hashchange', run);

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    const href = a.getAttribute('href');
    if (guard && href !== location.hash) {
      if (!guard()) { e.preventDefault(); return; }
      guard = null;
    }
    if (href === location.hash) { e.preventDefault(); run(); return; }
    if (a.hasAttribute('data-replace')) {
      e.preventDefault();
      pendingReplace = true;
      location.replace(href);
      return;
    }
    if (a.hasAttribute('data-up')) {
      e.preventDefault();
      api.back(href.slice(1));
    }
  });

  const api = {
    start: run,
    refresh: () => { guard = null; return run(); },
    go(path, { replace = false } = {}) {
      if (location.hash === '#' + path) { run(); return; }
      if (replace) { pendingReplace = true; location.replace('#' + path); } else location.hash = path;
    },
    /** Remonte vers path : retour arrière si c'est la page précédente, sinon navigation normale. */
    back(path) {
      guard = null;
      const prev = entries.get(curN - 1);
      const target = '#' + path;
      const base = (x) => (x.split('?')[0].replace(/\/$/, '') || '#');
      const a = prev && base(prev);
      const b = base(target);
      // Même page, ou même page avec un autre onglet (#/m/x et #/m/x/quiz).
      const related = a && (a === b || (b !== '#' && (a.startsWith(b + '/') || b.startsWith(a + '/'))));
      if (related && history.state && history.state.n === curN) {
        history.back();
      } else {
        api.go(path);
      }
    },
    /** Revient à la page précédente de l'application, ou va à path s'il n'y en a pas. */
    backOr(path) {
      guard = null;
      if (entries.has(curN - 1) && history.state && history.state.n === curN) history.back();
      else api.go(path);
    },
    /** Empêche de quitter la page courante sans confirmation (quiz en cours…). */
    setGuard(fn) { guard = fn; },
    clearGuard() { guard = null; },
  };
  return api;
}
