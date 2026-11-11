// ==========================================================================
// Petits utilitaires d'interface (sans framework).
// ==========================================================================

/** Crée un élément : h('a', { class: 'btn', href: '#', onClick: fn }, 'texte', autreNoeud) */
export function h(tag, props, ...children) {
  const el = tag === 'svg' || tag === 'path' ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v; // réservé aux icônes internes
      else if (k === 'value' && tag !== 'select') el.value = v;
      else if (k in el && typeof v !== 'string' && k !== 'list') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Ajoute des enfants en ignorant null / false et en aplatissant les tableaux. */
export function put(el, ...children) {
  append(el, children);
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

// ---------- Icônes (traits, 24×24) ----------
const ICONS = {
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  move: '<path d="M5 12h14M15 8l4 4-4 4M9 4v4M9 16v4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.5 4.5-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6M11 8v6"/>',
  zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5M8 11h6"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
};

export function brandMark() {
  const span = document.createElement('span');
  span.className = 'brand-mark';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = '<svg viewBox="0 0 512 512" width="62%" height="62%"><path d="M256 172c-16-30-46-44-76-44h-28a24 24 0 0 0-24 24v196a16 16 0 0 0 16 16h56c26 0 46 8 56 30 10-22 30-30 56-30h56a16 16 0 0 0 16-16V152a24 24 0 0 0-24-24h-28c-30 0-60 14-76 44z" fill="none" stroke="currentColor" stroke-width="36" stroke-linejoin="round"/><path d="M256 176v208" stroke="currentColor" stroke-width="36" stroke-linecap="round"/></svg>';
  return span;
}

export function icon(name, cls = '') {
  const span = document.createElement('span');
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="ico ${cls}">${ICONS[name] || ''}</svg>`;
  return span.firstChild;
}

export function iconBtn(name, label, onClick, extra = '') {
  return h('button', { type: 'button', class: `btn icon sm ghost ${extra}`, title: label, 'aria-label': label, onClick }, icon(name));
}

// ---------- Chargement ----------
export function loader(text = 'Chargement…') {
  return h('div', { class: 'loader', role: 'status' }, h('div', { class: 'spinner' }), text);
}

export function empty(text, iconName = 'folder') {
  return h('div', { class: 'empty' }, icon(iconName, 'icon'), h('div', null, text));
}

// ---------- Toasts ----------
let toastBox;
export function toast(message, type = '', ms = 3800) {
  if (!toastBox) {
    toastBox = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastBox);
  }
  const t = h('div', { class: `toast ${type}` }, message);
  toastBox.append(t);
  while (toastBox.children.length > 3) toastBox.firstChild.remove();
  setTimeout(() => t.remove(), ms);
}

// ---------- Modales ----------
export function modal(content, { wide = false, onClose } = {}) {
  const prev = document.activeElement;
  const box = h('div', { class: `modal ${wide ? 'wide' : ''}`, role: 'dialog', 'aria-modal': 'true' }, content);
  const back = h('div', { class: 'modal-backdrop' }, box);
  const close = () => {
    back.remove();
    document.removeEventListener('keydown', onKey);
    if (prev && prev.focus) prev.focus();
    if (onClose) onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(back);
  const first = box.querySelector('input, select, textarea, button.primary, button');
  if (first) setTimeout(() => first.focus(), 30);
  return { close, box };
}

export function confirmDialog(title, message, { ok = 'Confirmer', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; m.close(); resolve(v); } };
    const m = modal([
      h('h2', null, title),
      message ? h('p', { class: 'muted' }, message) : null,
      h('div', { class: 'form-actions' },
        h('button', { type: 'button', class: 'btn', onClick: () => finish(false) }, 'Annuler'),
        h('button', { type: 'button', class: `btn ${danger ? 'danger' : 'primary'}`, onClick: () => finish(true) }, ok)),
    ], { onClose: () => { if (!done) { done = true; resolve(false); } } });
  });
}

export function promptDialog(title, { label = '', value = '', ok = 'Valider', placeholder = '' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const input = h('input', { class: 'input', value, placeholder });
    const finish = (v) => { if (!done) { done = true; m.close(); resolve(v); } };
    const form = h('form', { onSubmit: (e) => { e.preventDefault(); if (input.value.trim()) finish(input.value.trim()); } },
      h('h2', null, title),
      h('div', { class: 'field' }, label ? h('label', null, label) : null, input),
      h('div', { class: 'form-actions' },
        h('button', { type: 'button', class: 'btn', onClick: () => finish(null) }, 'Annuler'),
        h('button', { type: 'submit', class: 'btn primary' }, ok)));
    const m = modal(form, { onClose: () => { if (!done) { done = true; resolve(null); } } });
    setTimeout(() => input.select(), 40);
  });
}

/** options = [{ value, label, group? }] */
export function selectDialog(title, options, { label = '', ok = 'Valider', value = '' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const sel = h('select', { class: 'select' });
    let lastGroup = null;
    let parent = sel;
    for (const o of options) {
      if (o.group !== undefined && o.group !== lastGroup) {
        parent = h('optgroup', { label: o.group });
        sel.append(parent);
        lastGroup = o.group;
      }
      parent.append(h('option', { value: o.value, selected: o.value === value }, o.label));
    }
    const finish = (v) => { if (!done) { done = true; m.close(); resolve(v); } };
    const m = modal([
      h('h2', null, title),
      h('div', { class: 'field' }, label ? h('label', null, label) : null, sel),
      h('div', { class: 'form-actions' },
        h('button', { type: 'button', class: 'btn', onClick: () => finish(null) }, 'Annuler'),
        h('button', { type: 'button', class: 'btn primary', onClick: () => finish(sel.value) }, ok)),
    ], { onClose: () => { if (!done) { done = true; resolve(null); } } });
  });
}

// ---------- Thème ----------
const THEME_KEY = 'isiam.theme';
export function initTheme() {
  let t = 'system';
  try { t = localStorage.getItem(THEME_KEY) || 'system'; } catch { /* ignoré */ }
  applyTheme(t);
}
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
export function isDark() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t) return t === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
export function themeToggle() {
  const btn = h('button', { type: 'button', class: 'btn icon ghost', 'aria-label': 'Changer de thème', title: 'Thème clair / sombre' });
  const paint = () => { clear(btn); btn.append(icon(isDark() ? 'sun' : 'moon')); };
  btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignoré */ }
    applyTheme(next);
    paint();
  });
  paint();
  return btn;
}

// ---------- Formats ----------
export function fmtDate(iso, withTime = false) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
  } catch {
    return iso;
  }
}
export function fmtBytes(n) {
  if (!n) return '0 o';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}
export function plural(n, one, many) {
  return `${n} ${n > 1 ? many : one}`;
}

/**
 * Fil d'Ariane. Les liens « remontent » (data-up) : si la page parente est la page
 * précédente, on revient simplement en arrière. Sur mobile, seul un lien « ‹ Parent » s'affiche.
 */
export function crumbs(items) {
  const out = h('nav', { class: 'crumbs', 'aria-label': 'Fil d\'Ariane' });
  items.forEach((it, i) => {
    if (i) out.append(h('span', { class: 'sep', 'aria-hidden': 'true' }, '›'));
    out.append(it.href ? h('a', { href: it.href, 'data-up': '' }, it.label) : h('span', { 'aria-current': 'page' }, it.label));
  });
  const parent = [...items].reverse().find((it) => it.href);
  const back = parent ? h('a', { class: 'back-link', href: parent.href, 'data-up': '' }, icon('left'), h('span', null, parent.label)) : null;
  return h('div', { class: 'nav-head' }, back, out);
}

export function downloadBytes(bytes, filename, type = 'application/pdf') {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function safeFilename(s) {
  // Nom de fichier ASCII (certains navigateurs rejettent les accents et « · » dans l'attribut download).
  return (s || 'cours').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[œ]/g, 'oe').replace(/[æ]/g, 'ae')
    .replace(/[^A-Za-z0-9 ._()'-]+/g, '-').replace(/-{2,}/g, '-').replace(/\s+/g, ' ')
    .replace(/^[\s.-]+|[\s.-]+$/g, '').slice(0, 120) || 'cours';
}
