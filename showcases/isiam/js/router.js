// ==========================================================================
// Routeur par hash (#/chemin?param=valeur) : fonctionne sur GitHub Pages sans
// configuration serveur, URL profondes et bouton Retour compris.
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

  let guard = null;
  let current = location.hash;
  let skip = false;

  function parse() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs || '')) };
  }

  async function run() {
    if (skip) { skip = false; return; }
    if (guard && location.hash !== current) {
      const ok = guard();
      if (!ok) {
        skip = true;
        history.pushState(null, '', current || '#/');
        return;
      }
      guard = null;
    }
    current = location.hash;
    const { path, query } = parse();
    for (const r of compiled) {
      const m = path.match(r.re);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => { params[k] = m[i + 1] ? decodeURIComponent(m[i + 1]) : undefined; });
        window.scrollTo(0, 0);
        await r.handler(params, query);
        return;
      }
    }
    notFound(path);
  }

  window.addEventListener('hashchange', run);
  // Un lien vers la page déjà affichée la recharge (sinon le navigateur ne fait rien).
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || a.target) return;
    if (a.getAttribute('href') === location.hash) { e.preventDefault(); run(); }
  });

  return {
    start: run,
    refresh: () => { guard = null; return run(); },
    go(path) { if (location.hash === '#' + path) run(); else location.hash = path; },
    /** Empêche de quitter la page courante sans confirmation (quiz en cours…). */
    setGuard(fn) { guard = fn; current = location.hash; },
    clearGuard() { guard = null; },
  };
}
