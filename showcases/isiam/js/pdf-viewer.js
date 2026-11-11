// ==========================================================================
// Lecteur PDF fidèle : PDF.js rend chaque page à l'identique (canvas) avec une
// couche de texte sélectionnable. Pages rendues à l'approche du défilement.
// ==========================================================================
import { h } from './ui.js';

let pdfjsPromise = null;
let baseUrl = '';

export function setVendorBase(base) { baseUrl = base; }

export function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(new URL(`${baseUrl}vendor/pdfjs/pdf.min.mjs`, location.href).href).then((m) => {
      m.GlobalWorkerOptions.workerSrc = new URL(`${baseUrl}vendor/pdfjs/pdf.worker.min.mjs`, location.href).href;
      return m;
    });
  }
  return pdfjsPromise;
}

/** Ouvre un PDF à partir d'octets (les octets passés sont copiés). */
export async function openPdf(bytes) {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({
    data: bytes.slice(),
    standardFontDataUrl: new URL(`${baseUrl}vendor/pdfjs/standard_fonts/`, location.href).href,
    isEvalSupported: false,
  });
  return task.promise;
}

const MAX_CANVAS_PIXELS = 16_000_000; // limite iOS Safari

/** Miniature d'une page (aperçu admin). */
export async function renderThumb(pdf, pageNo = 1, width = 240) {
  const page = await pdf.getPage(pageNo);
  const vp1 = page.getViewport({ scale: 1 });
  const scale = (width / vp1.width) * Math.min(window.devicePixelRatio || 1, 2);
  const vp = page.getViewport({ scale });
  const canvas = h('canvas', { width: Math.floor(vp.width), height: Math.floor(vp.height) });
  canvas.style.width = '100%';
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  return canvas;
}

/**
 * Monte le lecteur dans `container`. Renvoie { setZoom, zoom, destroy }.
 * zoom = 1 → largeur ajustée à l'écran (900 px max sur grand écran).
 */
export async function mountViewer(container, pdf, { onZoom } = {}) {
  const pdfjs = await loadPdfJs();
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const el = h('div', { class: 'pdf-page', 'aria-label': `Page ${i} sur ${pdf.numPages}`, role: 'img' },
      h('div', { class: 'page-placeholder' }, `Page ${i}`));
    container.append(el);
    pages.push({ no: i, page, w: vp.width, h: vp.height, el, renderedAt: 0, task: null, visible: false });
  }

  let zoom = 1;
  let generation = 0;

  function fitWidth() {
    const avail = container.clientWidth || window.innerWidth - 32;
    return Math.min(avail, 900);
  }

  function layout() {
    generation++;
    const target = fitWidth() * zoom;
    for (const p of pages) {
      const cssScale = target / p.w;
      p.cssScale = cssScale;
      p.el.style.width = `${Math.floor(p.w * cssScale)}px`;
      p.el.style.height = `${Math.floor(p.h * cssScale)}px`;
      p.el.style.setProperty('--scale-factor', String(cssScale));
    }
    for (const p of pages) if (p.visible) renderPage(p);
  }

  async function renderPage(p) {
    const gen = generation;
    if (p.renderedAt === gen) return;
    if (p.task) { try { p.task.cancel(); } catch { /* ignoré */ } }
    const viewport = p.page.getViewport({ scale: p.cssScale });
    let out = Math.min(window.devicePixelRatio || 1, 3);
    const area = viewport.width * viewport.height * out * out;
    if (area > MAX_CANVAS_PIXELS) out = Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height));
    const canvas = h('canvas', { width: Math.floor(viewport.width * out), height: Math.floor(viewport.height * out) });
    const task = p.page.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
      transform: out !== 1 ? [out, 0, 0, out, 0, 0] : null,
    });
    p.task = task;
    try {
      await task.promise;
    } catch (e) {
      if (e && e.name === 'RenderingCancelledException') return;
      p.el.replaceChildren(h('div', { class: 'page-placeholder' }, `Page ${p.no} : erreur d'affichage`));
      return;
    }
    if (gen !== generation) return;
    const textDiv = h('div', { class: 'textLayer' });
    p.el.replaceChildren(canvas, textDiv);
    p.renderedAt = gen;
    p.task = null;
    try {
      const tl = new pdfjs.TextLayer({ textContentSource: p.page.streamTextContent(), container: textDiv, viewport });
      await tl.render();
    } catch { /* la couche texte est un bonus : on ignore les erreurs */ }
  }

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const p = pages.find((x) => x.el === en.target);
      if (!p) continue;
      p.visible = en.isIntersecting;
      if (p.visible) renderPage(p);
    }
  }, { rootMargin: '900px 0px' });
  pages.forEach((p) => io.observe(p.el));

  let lastW = fitWidth();
  const ro = new ResizeObserver(() => {
    const w = fitWidth();
    if (Math.abs(w - lastW) > 8) { lastW = w; layout(); }
  });
  ro.observe(container);

  layout();

  return {
    get zoom() { return zoom; },
    setZoom(z) {
      zoom = Math.max(0.5, Math.min(3, Math.round(z * 100) / 100));
      layout();
      if (onZoom) onZoom(zoom);
    },
    destroy() {
      io.disconnect();
      ro.disconnect();
      pages.forEach((p) => { if (p.task) try { p.task.cancel(); } catch { /* ignoré */ } });
      pdf.destroy();
    },
  };
}
