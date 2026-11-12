// ==========================================================================
// Partage d'un résultat : génère une petite image (tentatives et notes) et
// l'envoie via le menu de partage du téléphone (WhatsApp…), ou la télécharge.
// Ne contient ni question ni réponse : seulement titres, dates et notes.
// ==========================================================================
import { h, clear, icon, modal, toast, downloadBytes, safeFilename } from './ui.js';
import { formatNote } from './quiz-engine.js';

const W = 1080;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const C = {
  bg: '#f7f7f5', card: '#ffffff', ink: '#1c1c1a', ink2: '#5e5d58', ink3: '#8a8983', line: '#e3e2de',
  accent: '#3554d1', accentSoft: '#e8ecfb', good: '#1f7a4d', warn: '#c27400', bad: '#b42318',
};
const MAX_BARS = 12;

const colorFor = (n) => (n >= 14 ? C.good : n >= 10 ? C.warn : C.bad);
const shortDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); } catch { return ''; }
};
const longDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; }
};

function rrect(ctx, x, y, w, hgt, r) {
  const rr = Math.min(r, w / 2, hgt / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + hgt, rr);
  ctx.arcTo(x + w, y + hgt, x, y + hgt, rr);
  ctx.arcTo(x, y + hgt, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Coupe un texte en lignes tenant dans maxW (retours à la ligne et mots très longs compris). */
function wrap(ctx, text, maxW, maxLines = Infinity) {
  const lines = [];
  for (const para of String(text ?? '').split(/\r?\n/)) {
    let cur = '';
    for (let w of para.split(/\s+/).filter(Boolean)) {
      while (ctx.measureText(w).width > maxW && w.length > 1) {
        let k = w.length - 1;
        while (k > 1 && ctx.measureText(w.slice(0, k)).width > maxW) k--;
        if (cur) { lines.push(cur); cur = ''; }
        lines.push(w.slice(0, k));
        w = w.slice(k);
      }
      const t = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(t).width <= maxW || !cur) cur = t;
      else { lines.push(cur); cur = w; }
    }
    lines.push(cur);
  }
  while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxW && last.length > 1) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

/**
 * Dessine la carte de résultat.
 * info = { titre, contexte, attempts: [{ date, sur20, points, total }] } (ordre chronologique)
 */
export async function renderScoreCard(info) {
  const attempts = [...info.attempts].sort((a, b) => a.date.localeCompare(b.date));
  const n = attempts.length;
  const sel = attempts.find((a) => a.id && a.id === info.selectedId) || attempts[n - 1];
  const selIdx = attempts.indexOf(sel);
  const last = sel;
  const best = attempts.reduce((m, a) => (a.sur20 > m.sur20 ? a : m), attempts[0]);
  const avg = attempts.reduce((s, a) => s + a.sur20, 0) / n;
  const shown = attempts.slice(-MAX_BARS);

  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const pad = 64;

  // Fond et carte
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.card;
  rrect(ctx, 40, 40, W - 80, H - 80, 36);
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.stroke();

  // En-tête : logo + nom du site
  const lx = pad + 16;
  let y = pad + 40;
  ctx.fillStyle = C.accent;
  rrect(ctx, lx, y, 64, 64, 16);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath(); // livre ouvert
  ctx.moveTo(lx + 32, y + 20); ctx.quadraticCurveTo(lx + 25, y + 15, lx + 15, y + 15); ctx.lineTo(lx + 13, y + 15);
  ctx.lineTo(lx + 13, y + 46); ctx.lineTo(lx + 22, y + 46); ctx.quadraticCurveTo(lx + 29, y + 46, lx + 32, y + 51);
  ctx.quadraticCurveTo(lx + 35, y + 46, lx + 42, y + 46); ctx.lineTo(lx + 51, y + 46); ctx.lineTo(lx + 51, y + 15);
  ctx.lineTo(lx + 49, y + 15); ctx.quadraticCurveTo(lx + 39, y + 15, lx + 32, y + 20); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lx + 32, y + 21); ctx.lineTo(lx + 32, y + 48); ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.font = `700 34px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('Révisions ISIAM', lx + 84, y + 32);
  ctx.textAlign = 'right';
  ctx.fillStyle = C.ink3;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText(longDate(last.date), W - pad - 16, y + 32);
  ctx.textAlign = 'left';

  // Contexte + titre
  y += 130;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.accent;
  ctx.font = `600 30px ${FONT}`;
  for (const l of wrap(ctx, info.contexte || '', W - 2 * pad - 32, 1)) { ctx.fillText(l, lx, y); y += 40; }
  ctx.fillStyle = C.ink;
  ctx.font = `750 54px ${FONT}`;
  y += 22;
  for (const l of wrap(ctx, info.titre, W - 2 * pad - 32, 2)) { ctx.fillText(l, lx, y); y += 66; }

  // Chiffres clés
  y += 30;
  const boxW = (W - 2 * pad - 32 - 2 * 24) / 3;
  const stats = [
    [selIdx === n - 1 ? 'Dernière note' : `Tentative n°${selIdx + 1}`, `${formatNote(last.sur20)}/20`, colorFor(last.sur20)],
    ['Meilleure note', `${formatNote(best.sur20)}/20`, colorFor(best.sur20)],
    [n > 1 ? 'Tentatives' : 'Tentative', String(n), C.ink],
  ];
  stats.forEach(([label, val, col], k) => {
    const bx = lx + k * (boxW + 24);
    ctx.fillStyle = k === 0 ? C.accentSoft : '#f4f4f1';
    rrect(ctx, bx, y, boxW, 150, 22);
    ctx.fill();
    ctx.fillStyle = C.ink2;
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(label, bx + 26, y + 46);
    ctx.fillStyle = col;
    ctx.font = `800 62px ${FONT}`;
    ctx.fillText(val, bx + 26, y + 120);
  });
  y += 150 + 64;

  // Graphique : une barre par tentative
  ctx.fillStyle = C.ink;
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText(n > 1 ? 'Mes tentatives' : 'Ma tentative', lx, y);
  ctx.fillStyle = C.ink3;
  ctx.font = `500 24px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`moyenne ${formatNote(Math.round(avg * 10) / 10)}/20`, W - pad - 16, y);
  ctx.textAlign = 'left';
  y += 30;
  const chartTop = y + 50;
  const chartBottom = H - 40 - 150;
  const chartH = chartBottom - chartTop;
  const left = lx + 54;
  const right = W - pad - 16;
  // Repères 10 et 20
  ctx.font = `500 22px ${FONT}`;
  for (const v of [0, 10, 20]) {
    const gy = chartBottom - (v / 20) * chartH;
    ctx.strokeStyle = v === 0 ? '#cfcdc7' : C.line;
    ctx.lineWidth = 2;
    ctx.setLineDash(v === 10 ? [8, 8] : []);
    ctx.beginPath(); ctx.moveTo(left, gy); ctx.lineTo(right, gy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.ink3;
    ctx.textAlign = 'right';
    ctx.fillText(String(v), left - 12, gy + 8);
    ctx.textAlign = 'left';
  }
  const slot = (right - left) / Math.max(shown.length, 4);
  const bw = Math.min(90, slot * 0.62);
  const offset = n - shown.length;
  shown.forEach((a, k) => {
    const cx = left + slot * (k + 0.5);
    const bh = Math.max(6, (a.sur20 / 20) * chartH);
    const col = colorFor(a.sur20);
    ctx.fillStyle = col;
    rrect(ctx, cx - bw / 2, chartBottom - bh, bw, bh, 12);
    ctx.fill();
    if (a === sel && n > 1) { // tentative partagée : encadrée
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 6;
      rrect(ctx, cx - bw / 2 - 7, chartBottom - bh - 7, bw + 14, bh + 14, 16);
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = C.ink;
    ctx.font = `700 ${shown.length > 8 ? 22 : 28}px ${FONT}`;
    ctx.fillText(formatNote(a.sur20), cx, chartBottom - bh - 14);
    ctx.fillStyle = C.ink2;
    ctx.font = `600 ${shown.length > 8 ? 18 : 22}px ${FONT}`;
    ctx.fillText(`n°${offset + k + 1}`, cx, chartBottom + 34);
    ctx.fillStyle = C.ink3;
    ctx.font = `500 ${shown.length > 8 ? 16 : 20}px ${FONT}`;
    ctx.fillText(shortDate(a.date), cx, chartBottom + 62);
    ctx.textAlign = 'left';
  });

  // Pied
  ctx.fillStyle = C.ink3;
  ctx.font = `500 22px ${FONT}`;
  const foot = offset > 0 ? `${offset} tentative(s) plus ancienne(s) non affichée(s) · notes sur 20` : 'Notes sur 20';
  ctx.fillText(foot, lx, H - 40 - 50);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export function shareText(info) {
  const attempts = [...info.attempts].sort((a, b) => a.date.localeCompare(b.date));
  const best = Math.max(...attempts.map((a) => a.sur20));
  const suite = attempts.slice(-8).map((a) => formatNote(a.sur20)).join(' → ');
  return `📚 ${info.titre} (${info.contexte})\n${attempts.length} tentative${attempts.length > 1 ? 's' : ''} : ${suite} /20 · meilleure note ${formatNote(best)}/20`;
}

// ---------------------------------------------------------------------------
// Correction détaillée en UNE image : toutes les questions, en colonnes
// (1 à 3 selon le nombre de questions), comme l'écran de fin de quiz.
// ---------------------------------------------------------------------------
const VERDICT = {
  juste: { col: C.good, txt: '✓' },
  partiel: { col: C.warn, txt: '½' },
  faux: { col: C.bad, txt: '✗' },
};

/** Bloc « question » compact : hauteur + dessin, pour une colonne de largeur cw. */
function questionBlock(ctx, d, num, cw) {
  const ops = [];
  const tx = 44;              // texte après la pastille
  const tw = cw - tx;
  let hgt = 0;
  ctx.font = `650 25px ${FONT}`;
  const qLines = wrap(ctx, `${num}. ${d.e}`, tw);
  ops.push((c, x, y) => {
    const v = VERDICT[d.v] || VERDICT.faux;
    c.fillStyle = v.col;
    c.beginPath(); c.arc(x + 16, y + 17, 16, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.font = `800 18px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(v.txt, x + 16, y + 18);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = C.ink; c.font = `650 25px ${FONT}`;
    qLines.forEach((l, k) => c.fillText(l, x + tx, y + 26 + k * 32));
  });
  hgt += qLines.length * 32 + 8;

  if (d.t === 'qcm') {
    const good = new Set(d.b);
    const sel = new Set(d.s);
    d.c.forEach((choice, k) => {
      const isGood = good.has(k);
      const isSel = sel.has(k);
      const tag = isGood && isSel ? 'bonne réponse, cochée' : isGood ? 'bonne réponse, non cochée' : isSel ? 'cochée à tort' : '';
      ctx.font = `500 21px ${FONT}`;
      const lines = wrap(ctx, choice, tw - 52);
      const boxH = lines.length * 27 + (tag ? 22 : 0) + 14;
      const top = hgt;
      ops.push((c, x, y) => {
        const bx = x + tx;
        const by = y + top;
        c.fillStyle = isGood ? '#e3f3ea' : isSel ? '#fbe6e4' : '#ffffff';
        rrect(c, bx, by, tw, boxH, 10); c.fill();
        c.strokeStyle = isGood ? C.good : isSel ? C.bad : C.line; c.lineWidth = isGood || isSel ? 2.5 : 1.5;
        rrect(c, bx, by, tw, boxH, 10); c.stroke();
        c.strokeStyle = C.ink2; c.lineWidth = 2.5;
        rrect(c, bx + 14, by + 10, 20, 20, 5); c.stroke();
        if (isSel) {
          c.strokeStyle = isGood ? C.good : C.bad; c.lineWidth = 3.5;
          c.beginPath(); c.moveTo(bx + 18, by + 20); c.lineTo(bx + 23, by + 25); c.lineTo(bx + 31, by + 14); c.stroke();
        }
        c.fillStyle = C.ink; c.font = `500 21px ${FONT}`;
        lines.forEach((l, i) => c.fillText(l, bx + 46, by + 27 + i * 27));
        if (tag) {
          c.fillStyle = isGood ? C.good : C.bad; c.font = `600 17px ${FONT}`;
          c.fillText(tag, bx + 46, by + 27 + lines.length * 27 - 3);
        }
      });
      hgt += boxH + 6;
    });
  } else {
    const box = (label, text, fill, stroke) => {
      ctx.font = `500 21px ${FONT}`;
      const lines = wrap(ctx, text || '(sans réponse)', tw - 28);
      const boxH = lines.length * 27 + 16;
      const top = hgt;
      ops.push((c, x, y) => {
        c.fillStyle = C.ink2; c.font = `650 17px ${FONT}`;
        c.fillText(label, x + tx, y + top + 17);
        const by = y + top + 24;
        c.fillStyle = fill; rrect(c, x + tx, by, tw, boxH, 10); c.fill();
        c.strokeStyle = stroke; c.lineWidth = 1.5; rrect(c, x + tx, by, tw, boxH, 10); c.stroke();
        c.fillStyle = C.ink; c.font = `500 21px ${FONT}`;
        lines.forEach((l, i) => c.fillText(l, x + tx + 14, y + top + 24 + 27 + i * 27));
      });
      hgt += 24 + boxH + 8;
    };
    box('Réponse de l\'élève', d.x, '#f1f1ee', C.line);
    box('Réponse attendue', d.r, '#e3f3ea', '#9fd1b5');
    const top = hgt;
    ops.push((c, x, y) => {
      c.fillStyle = (VERDICT[d.v] || VERDICT.faux).col; c.font = `650 17px ${FONT}`;
      c.fillText(`Auto-évaluation : ${d.v}`, x + tx, y + top + 16);
    });
    hgt += 24;
  }
  return { h: hgt + 6, draw: (c, x, y) => ops.forEach((op) => op(c, x, y)) };
}

/** Génère UNE image avec toutes les questions de la tentative et leurs corrigés. */
export async function renderCorrectionImage(info, attempt) {
  const all = [...info.attempts].sort((a, b) => a.date.localeCompare(b.date));
  const num = all.indexOf(attempt) + 1;
  const n = attempt.detail.length;
  const cols = n <= 6 ? 1 : n <= 16 ? 2 : 3;
  const colW = cols === 1 ? 984 : 660;
  const GUT = 44;
  const MX = 48;
  const width = MX * 2 + cols * colW + (cols - 1) * GUT;
  const scratch = document.createElement('canvas').getContext('2d');
  const blocks = attempt.detail.map((d, i) => questionBlock(scratch, d, i + 1, colW));

  // Répartition équilibrée en colonnes, dans l'ordre des questions.
  const totalH = blocks.reduce((s, b) => s + b.h + 26, 0);
  const target = totalH / cols;
  const columns = Array.from({ length: cols }, () => []);
  let ci = 0;
  let acc = 0;
  for (const b of blocks) {
    if (ci < cols - 1 && acc > 0 && acc + (b.h + 26) / 2 > target) { ci++; acc = 0; }
    columns[ci].push(b);
    acc += b.h + 26;
  }
  const colH = columns.map((col) => col.reduce((s, b) => s + b.h + 26, 0));

  scratch.font = `750 38px ${FONT}`;
  const titleLines = wrap(scratch, info.titre, width - 2 * MX - 260, 2);
  const headH = 118 + titleLines.length * 46 + 30;
  const footH = 56;
  const height = Math.ceil(headH + 24 + Math.max(...colH) + footH);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d');
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, width, height);
  // En-tête
  c.fillStyle = C.bg;
  c.fillRect(0, 0, width, headH);
  c.fillStyle = C.accent;
  rrect(c, MX, 36, 46, 46, 12); c.fill();
  c.fillStyle = '#fff'; c.font = `800 26px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('✓', MX + 23, 60);
  c.textAlign = 'left';
  c.fillStyle = C.ink; c.font = `700 28px ${FONT}`;
  c.fillText('Révisions ISIAM · Correction', MX + 62, 60);
  c.textBaseline = 'alphabetic';
  let y = 128;
  c.font = `750 38px ${FONT}`;
  titleLines.forEach((l) => { c.fillText(l, MX, y); y += 46; });
  c.font = `600 22px ${FONT}`;
  c.fillStyle = C.ink2;
  c.fillText(`${info.contexte ? `${info.contexte} · ` : ''}tentative n°${num} du ${longDate(attempt.date)} · ${n} questions`, MX, y + 2);
  // Note (à droite)
  c.textAlign = 'right';
  c.fillStyle = colorFor(attempt.sur20);
  c.font = `800 64px ${FONT}`;
  c.fillText(`${formatNote(attempt.sur20)}/20`, width - MX, 128);
  c.fillStyle = C.ink3;
  c.font = `600 20px ${FONT}`;
  c.fillText(`${formatNote(attempt.points)} point${attempt.points > 1 ? 's' : ''} sur ${attempt.total}`, width - MX, 160);
  c.textAlign = 'left';
  // Colonnes
  columns.forEach((col, k) => {
    const x = MX + k * (colW + GUT);
    let cy = headH + 24;
    col.forEach((b, i) => {
      if (i) {
        c.strokeStyle = C.line; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(x, cy - 13); c.lineTo(x + colW, cy - 13); c.stroke();
      }
      b.draw(c, x, cy);
      cy += b.h + 26;
    });
    if (k) { c.strokeStyle = C.line; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - GUT / 2, headH + 16); c.lineTo(x - GUT / 2, height - footH); c.stroke(); }
  });
  // Pied
  c.fillStyle = C.ink3; c.font = `500 19px ${FONT}`;
  c.fillText('✓ juste   ½ partiel   ✗ faux · vert = bonne réponse · rouge = cochée à tort', MX, height - 22);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// ---------------------------------------------------------------------------
// Fenêtres de partage
// ---------------------------------------------------------------------------
function shareModal({ heading, select, intro, makeFiles, text, note }) {
  let files = [];
  let urls = [];
  const strip = h('div', { class: 'share-strip' });
  const shareBtn = h('button', { type: 'button', class: 'btn primary' }, icon('share'), 'Partager (WhatsApp…)');
  const saveBtn = h('button', { type: 'button', class: 'btn' }, icon('download'), 'Télécharger l\'image');

  async function build() {
    urls.forEach((u) => URL.revokeObjectURL(u));
    clear(strip).append(h('div', { class: 'loader' }, h('div', { class: 'spinner' }), 'Création de l\'image…'));
    shareBtn.disabled = saveBtn.disabled = true;
    files = await makeFiles();
    urls = files.map((f) => URL.createObjectURL(f));
    clear(strip).append(...urls.map((u, i) => h('a', { href: u, target: '_blank', rel: 'noopener', class: 'share-thumb single', title: 'Ouvrir en grand' },
      h('img', { src: u, alt: i === 0 ? text() : '' }))));
    shareBtn.disabled = saveBtn.disabled = false;
    shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files }));
  }
  shareBtn.addEventListener('click', async () => {
    try {
      await navigator.share({ files, text: text(), title: heading });
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast('Partage impossible ici : téléchargez l\'image puis envoyez-la.', 'bad');
    }
  });
  saveBtn.addEventListener('click', async () => {
    for (const f of files) downloadBytes(new Uint8Array(await f.arrayBuffer()), f.name, 'image/png');
  });
  if (select) select.addEventListener('change', build);

  const m = modal([
    h('h2', null, heading),
    select ? h('div', { class: 'field' }, h('label', null, 'Tentative'), select) : null,
    strip,
    intro ? h('p', { class: 'tiny muted' }, intro) : null,
    h('div', { class: 'form-actions share-actions' }, shareBtn, saveBtn,
      h('button', { type: 'button', class: 'btn ghost', onClick: () => m.close() }, 'Fermer')),
    h('p', { class: 'tiny muted' }, note),
  ], { wide: true, onClose: () => urls.forEach((u) => URL.revokeObjectURL(u)) });
  build();
}

/** Partage du résultat seul : notes et tentatives (aucune question ni réponse). */
export async function openShare(info) {
  if (!info.attempts || !info.attempts.length) { toast('Aucune tentative à partager pour l\'instant.'); return; }
  const sorted = [...info.attempts].sort((a, b) => a.date.localeCompare(b.date));
  shareModal({
    heading: 'Partager mon résultat',
    intro: 'L\'image contient seulement le titre, les dates et les notes : aucune question ni réponse.',
    note: 'Sur ordinateur : téléchargez l\'image, puis joignez-la dans WhatsApp.',
    text: () => shareText({ ...info, attempts: sorted }),
    makeFiles: async () => {
      const blob = await renderScoreCard({ ...info, attempts: sorted });
      return [new File([blob], `${safeFilename(`resultat ${info.titre}`)}.png`, { type: 'image/png' })];
    },
  });
}

/** Tentatives dont la correction détaillée est disponible. */
export const withDetail = (attempts) => (attempts || []).filter((a) => a.detail && a.detail.length);

/** Partage de la correction détaillée d'une tentative, en une seule image. */
export async function openShareCorrection(info) {
  const sorted = [...(info.attempts || [])].sort((a, b) => a.date.localeCompare(b.date));
  const avail = withDetail(sorted);
  if (!avail.length) { toast('Aucune correction enregistrée pour ce quiz (seules les 5 dernières tentatives la conservent).'); return; }
  const initial = avail.find((a) => a.id === info.selectedId) || avail[avail.length - 1];
  const select = h('select', { class: 'select', 'aria-label': 'Tentative à partager' },
    [...avail].reverse().map((a) => h('option', { value: a.id, selected: a === initial },
      `Tentative n°${sorted.indexOf(a) + 1} · ${shortDate(a.date)} · ${formatNote(a.sur20)}/20`)));
  const current = () => avail.find((a) => a.id === select.value) || initial;
  shareModal({
    heading: 'Partager la correction',
    select,
    intro: 'Une seule image : toutes les questions, les réponses de l\'élève et les corrigés. Touchez l\'aperçu pour l\'ouvrir en grand.',
    note: 'Astuce WhatsApp : activez « HD » à l\'envoi pour garder le texte bien lisible.',
    text: () => {
      const a = current();
      return `📝 Correction · ${info.titre} (${info.contexte}) : ${formatNote(a.sur20)}/20, tentative du ${shortDate(a.date)}`;
    },
    makeFiles: async () => {
      const a = current();
      const blob = await renderCorrectionImage({ ...info, attempts: sorted }, a);
      return [new File([blob], `${safeFilename(`correction ${info.titre} ${shortDate(a.date)}`)}.png`, { type: 'image/png' })];
    },
  });
}
