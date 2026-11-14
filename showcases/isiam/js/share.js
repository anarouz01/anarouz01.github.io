// ==========================================================================
// Partage d'un résultat : génère une petite image (tentatives et notes) et
// l'envoie via le menu de partage du téléphone (WhatsApp…), ou la télécharge.
// Ne contient ni question ni réponse : seulement titres, dates et notes.
// ==========================================================================
import { h, clear, icon, modal, toast, downloadBytes, safeFilename } from './ui.js';
import { formatNote, formatDuree, formatClock } from './quiz-engine.js';
import { PdfDoc, wrapText, textWidth } from './pdf.js';

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

  // Temps passé sur la tentative
  if (last.duree) {
    ctx.strokeStyle = C.ink2;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(lx + 14, y - 10, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx + 14, y - 18); ctx.lineTo(lx + 14, y - 10); ctx.lineTo(lx + 20, y - 6); ctx.stroke();
    ctx.fillStyle = C.ink2;
    ctx.font = `600 28px ${FONT}`;
    const n0 = (last.detail && last.detail.length) || last.total || 0;
    ctx.fillText(`Temps : ${formatDuree(last.duree)}${n0 ? ` · ${formatDuree(last.duree / n0)} par question` : ''}`, lx + 40, y);
    y += 30;
  }

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
  const chartBottom = H - 40 - 140;
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
    if (a.duree) { ctx.fillText(formatClock(a.duree), cx, chartBottom + 86); }
    ctx.textAlign = 'left';
  });

  // Pied
  ctx.fillStyle = C.ink3;
  ctx.font = `500 22px ${FONT}`;
  const foot = offset > 0 ? `${offset} tentative(s) plus ancienne(s) non affichée(s) · notes sur 20` : 'Notes sur 20';
  ctx.fillText(foot, lx, H - 40 - 18);

  // JPEG à la bonne taille : WhatsApp ne le redimensionne pas et l'abîme moins.
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92));
}

export function shareText(info) {
  const attempts = [...info.attempts].sort((a, b) => a.date.localeCompare(b.date));
  const best = Math.max(...attempts.map((a) => a.sur20));
  const last = attempts[attempts.length - 1];
  const suite = attempts.slice(-8).map((a) => formatNote(a.sur20)).join(' → ');
  return `📚 ${info.titre} (${info.contexte})\n${attempts.length} tentative${attempts.length > 1 ? 's' : ''} : ${suite} /20 · meilleure note ${formatNote(best)}/20`
    + (last.duree ? `\n⏱ Dernière tentative en ${formatDuree(last.duree)}` : '');
}

// ---------------------------------------------------------------------------
// Correction détaillée en PDF : vrai texte (net à tous les zooms), léger, et
// envoyé par WhatsApp comme un document, donc sans recompression.
// ---------------------------------------------------------------------------
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MG = 40;
const CW = PAGE_W - 2 * MG;
const VERD = {
  juste: { col: C.good, label: 'juste' },
  partiel: { col: C.warn, label: 'partiel' },
  faux: { col: C.bad, label: 'faux' },
};

/** Bloc d'une question : hauteur + dessin. */
function pdfBlock(d, n) {
  const ops = [];
  const TX = 24;
  const tw = CW - TX - 46;
  let y = 0;
  const qLines = wrapText(`${n}. ${d.e}`, 10.5, tw, true);
  ops.push((p, x, top) => {
    const v = VERD[d.v] || VERD.faux;
    p.circle(x + 8, top + 7, 8, { fill: v.col });
    if (d.v === 'juste') p.line([[x + 4.2, top + 7.2], [x + 7, top + 10], [x + 12, top + 4.4]], { stroke: '#ffffff', lw: 1.8 });
    else if (d.v === 'partiel') p.text('½', x + 8, top + 10.4, { size: 9, bold: true, color: '#ffffff', align: 'center' });
    else { p.line([[x + 5, top + 4], [x + 11, top + 10]], { stroke: '#ffffff', lw: 1.8 }); p.line([[x + 11, top + 4], [x + 5, top + 10]], { stroke: '#ffffff', lw: 1.8 }); }
    qLines.forEach((l, i) => p.text(l, x + TX, top + 11 + i * 14, { size: 10.5, bold: true, color: C.ink }));
    if (d.ms) p.text(formatClock(d.ms), x + CW, top + 11, { size: 8.5, color: C.ink3, align: 'right' });
  });
  y += qLines.length * 14 + 5;

  if (d.t === 'qcm') {
    const good = new Set(d.b);
    const sel = new Set(d.s);
    d.c.forEach((choice, k) => {
      const isGood = good.has(k);
      const isSel = sel.has(k);
      const tag = isGood && isSel ? 'bonne réponse, cochée' : isGood ? 'bonne réponse, non cochée' : isSel ? 'cochée à tort' : '';
      const lines = wrapText(choice, 9.5, CW - TX - 32);
      const bh = lines.length * 12.5 + (tag ? 10 : 0) + 7;
      const top0 = y;
      ops.push((p, x, top) => {
        const bx = x + TX;
        const by = top + top0;
        p.rect(bx, by, CW - TX, bh, { fill: isGood ? '#e3f3ea' : isSel ? '#fbe6e4' : '#ffffff', stroke: isGood ? C.good : isSel ? C.bad : C.line, lw: isGood || isSel ? 1.1 : 0.7, r: 4 });
        p.rect(bx + 8, by + 5, 8, 8, { stroke: C.ink2, lw: 0.9, r: 1.5 });
        if (isSel) p.line([[bx + 9.6, by + 9], [bx + 11.6, by + 11.2], [bx + 15, by + 6.2]], { stroke: isGood ? C.good : C.bad, lw: 1.4 });
        lines.forEach((l, i) => p.text(l, bx + 24, by + 12 + i * 12.5, { size: 9.5, color: C.ink }));
        if (tag) p.text(tag, bx + 24, by + 12 + lines.length * 12.5 - 1.5, { size: 7.5, bold: true, color: isGood ? C.good : C.bad });
      });
      y += bh + 3;
    });
  } else {
    const box = (label, text, fill, stroke) => {
      const lines = wrapText(text || '(sans réponse)', 9.5, CW - TX - 16);
      const bh = lines.length * 12.5 + 7;
      const top0 = y;
      ops.push((p, x, top) => {
        p.text(label, x + TX, top + top0 + 8, { size: 7.5, bold: true, color: C.ink2 });
        p.rect(x + TX, top + top0 + 11, CW - TX, bh, { fill, stroke, lw: 0.7, r: 4 });
        lines.forEach((l, i) => p.text(l, x + TX + 8, top + top0 + 11 + 12 + i * 12.5, { size: 9.5, color: C.ink }));
      });
      y += 11 + bh + 4;
    };
    box('Réponse de l\'élève', d.x, '#f1f1ee', C.line);
    box('Réponse attendue', d.r, '#e3f3ea', '#9fd1b5');
    const top0 = y;
    ops.push((p, x, top) => p.text(`Auto-évaluation : ${d.v}`, x + TX, top + top0 + 8, { size: 7.5, bold: true, color: (VERD[d.v] || VERD.faux).col }));
    y += 11;
  }
  return { h: y + 2, draw: (p, x, top) => ops.forEach((op) => op(p, x, top)) };
}

/** PDF de la correction complète d'une tentative. */
export function renderCorrectionPdf(info, attempt) {
  const all = [...info.attempts].sort((a, b) => a.date.localeCompare(b.date));
  const numT = all.indexOf(attempt) + 1;
  const det = attempt.detail;
  const blocks = det.map((d, i) => pdfBlock(d, i + 1));
  const titleLines = wrapText(info.titre, 17, CW - 130, true);
  const head1 = 64 + titleLines.length * 21 + (attempt.duree ? 30 : 16);
  const headN = 34;
  const footH = 30;
  const GAP = 12;

  // Pagination
  const pages = [[]];
  let used = head1;
  for (const b of blocks) {
    const page = pages[pages.length - 1];
    if (page.length && used + b.h + GAP > PAGE_H - footH) { pages.push([]); used = headN; }
    pages[pages.length - 1].push(b);
    used += b.h + GAP;
  }

  const doc = new PdfDoc({ title: `Correction - ${info.titre}` });
  pages.forEach((blocksOfPage, pi) => {
    const p = doc.addPage(PAGE_W, PAGE_H);
    let y;
    if (pi === 0) {
      p.rect(MG, 28, 14, 14, { fill: C.accent, r: 3 });
      p.line([[MG + 3.5, 35.2], [MG + 6, 38], [MG + 10.5, 32]], { stroke: '#ffffff', lw: 1.6 });
      p.text('Révisions ISIAM · Correction', MG + 20, 39, { size: 10, bold: true, color: C.ink });
      let ty = 66;
      titleLines.forEach((l) => { p.text(l, MG, ty, { size: 17, bold: true, color: C.ink }); ty += 21; });
      p.text(`${info.contexte ? `${info.contexte} · ` : ''}tentative n°${numT} du ${longDate(attempt.date)} · ${det.length} questions`, MG, ty + 1, { size: 9, color: C.ink2 });
      if (attempt.duree) p.text(`Temps total : ${formatDuree(attempt.duree)} · ${formatDuree(attempt.duree / det.length)} par question en moyenne`, MG, ty + 15, { size: 9, bold: true, color: C.ink2 });
      p.text(`${formatNote(attempt.sur20)}/20`, PAGE_W - MG, 66, { size: 26, bold: true, color: colorFor(attempt.sur20), align: 'right' });
      p.text(`${formatNote(attempt.points)} point${attempt.points > 1 ? 's' : ''} sur ${attempt.total}`, PAGE_W - MG, 80, { size: 8.5, color: C.ink3, align: 'right' });
      y = head1;
    } else {
      p.text(`Correction · ${info.titre}`, MG, 26, { size: 8.5, bold: true, color: C.ink3 });
      y = headN;
    }
    p.line([[MG, y - 8], [PAGE_W - MG, y - 8]], { stroke: C.line, lw: 0.7 });
    blocksOfPage.forEach((b, k) => {
      if (k) p.line([[MG + 24, y - GAP / 2], [PAGE_W - MG, y - GAP / 2]], { stroke: C.line, lw: 0.5 });
      b.draw(p, MG, y);
      y += b.h + GAP;
    });
    p.text('Légende : vert = bonne réponse · rouge = cochée à tort · durée par question à droite', MG, PAGE_H - 18, { size: 7.5, color: C.ink3 });
    p.text(`page ${pi + 1} / ${pages.length}`, PAGE_W - MG, PAGE_H - 18, { size: 7.5, color: C.ink3, align: 'right' });
  });
  return doc.toBlob();
}

/** Correction au format texte (WhatsApp : *gras*, _italique_). */
export function correctionText(info, attempt, { erreursSeules = false } = {}) {
  const all = [...info.attempts].sort((a, b) => a.date.localeCompare(b.date));
  const numT = all.indexOf(attempt) + 1;
  const det = attempt.detail;
  const lines = [
    `*Correction · ${info.titre}*`,
    `${info.contexte ? `${info.contexte} · ` : ''}tentative n°${numT} du ${shortDate(attempt.date)}`,
    `Note : *${formatNote(attempt.sur20)}/20*${attempt.duree ? ` · ⏱ ${formatDuree(attempt.duree)}` : ''}`,
    '',
  ];
  const nbErr = det.filter((d) => d.v !== 'juste').length;
  det.forEach((d, i) => {
    if (erreursSeules && d.v === 'juste') return;
    const mark = d.v === 'juste' ? '✅' : d.v === 'partiel' ? '🟠' : '❌';
    lines.push(`${mark} *${i + 1}.* ${d.e}${d.ms ? ` _(${formatClock(d.ms)})_` : ''}`);
    if (d.v !== 'juste') {
      if (d.t === 'qcm') {
        const sel = d.s.map((k) => d.c[k]);
        lines.push(`   ✗ Coché : ${sel.length ? sel.join(' ; ') : '(rien)'}`);
        lines.push(`   ✓ Attendu : ${d.b.map((k) => d.c[k]).join(' ; ')}`);
      } else {
        lines.push(`   ✗ Réponse : ${d.x || '(sans réponse)'}`);
        lines.push(`   ✓ Attendu : ${d.r}`);
      }
    }
  });
  if (erreursSeules && !nbErr) lines.push('Aucune erreur 🎉');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Fenêtres de partage
// ---------------------------------------------------------------------------
async function shareFiles(files, text, title) {
  try {
    await navigator.share({ files, text, title });
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    toast('Partage impossible ici : téléchargez le fichier puis envoyez-le.', 'bad');
  }
}

async function shareTextOnly(text) {
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text.slice(0, 3500))}`, '_blank', 'noopener');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Texte copié : collez-le dans WhatsApp.', 'good');
  } catch {
    toast('Copie impossible sur ce navigateur.', 'bad');
  }
}

/** Partage du résultat seul : image (notes, tentatives, temps), sans question ni réponse. */
export async function openShare(info) {
  if (!info.attempts || !info.attempts.length) { toast('Aucune tentative à partager pour l\'instant.'); return; }
  const sorted = [...info.attempts].sort((a, b) => a.date.localeCompare(b.date));
  const text = shareText({ ...info, attempts: sorted });
  const preview = h('div', { class: 'share-strip' }, h('div', { class: 'loader' }, h('div', { class: 'spinner' }), 'Création de l\'image…'));
  const shareBtn = h('button', { type: 'button', class: 'btn primary', disabled: true }, icon('share'), 'Partager (WhatsApp…)');
  const saveBtn = h('button', { type: 'button', class: 'btn', disabled: true }, icon('download'), 'Télécharger l\'image');
  let url = null;
  const m = modal([
    h('h2', null, 'Partager mon résultat'),
    preview,
    h('p', { class: 'tiny muted' }, 'L\'image contient le titre, les dates, les notes et les temps : aucune question ni réponse.'),
    h('div', { class: 'form-actions share-actions' }, shareBtn, saveBtn,
      h('button', { type: 'button', class: 'btn ghost', onClick: () => copyText(text) }, icon('copy'), 'Copier le texte'),
      h('button', { type: 'button', class: 'btn ghost', onClick: () => m.close() }, 'Fermer')),
  ], { wide: true, onClose: () => url && URL.revokeObjectURL(url) });
  const blob = await renderScoreCard({ ...info, attempts: sorted });
  const file = new File([blob], `${safeFilename(`resultat ${info.titre}`)}.jpg`, { type: 'image/jpeg' });
  url = URL.createObjectURL(blob);
  clear(preview).append(h('a', { href: url, target: '_blank', rel: 'noopener', class: 'share-thumb single' }, h('img', { src: url, alt: text })));
  saveBtn.disabled = false;
  saveBtn.onclick = async () => downloadBytes(new Uint8Array(await blob.arrayBuffer()), file.name, 'image/jpeg');
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    shareBtn.disabled = false;
    shareBtn.onclick = () => shareFiles([file], text, info.titre);
  } else shareBtn.hidden = true;
}

/** Tentatives dont la correction détaillée est disponible. */
export const withDetail = (attempts) => (attempts || []).filter((a) => a.detail && a.detail.length);

/** Partage de la correction d'une tentative : PDF (document) ou texte. */
export async function openShareCorrection(info) {
  const sorted = [...(info.attempts || [])].sort((a, b) => a.date.localeCompare(b.date));
  const avail = withDetail(sorted);
  if (!avail.length) { toast('Aucune correction enregistrée pour ce quiz (seules les 5 dernières tentatives la conservent).'); return; }
  const initial = avail.find((a) => a.id === info.selectedId) || avail[avail.length - 1];
  const select = h('select', { class: 'select', 'aria-label': 'Tentative à partager' },
    [...avail].reverse().map((a) => h('option', { value: a.id, selected: a === initial },
      `Tentative n°${sorted.indexOf(a) + 1} · ${shortDate(a.date)} · ${formatNote(a.sur20)}/20${a.duree ? ` · ${formatDuree(a.duree)}` : ''}`)));
  const onlyErr = h('input', { type: 'checkbox' });
  const pdfInfo = h('div', { class: 'pdf-file' });
  const textBox = h('pre', { class: 'share-text', 'aria-label': 'Aperçu du texte' });
  const sharePdfBtn = h('button', { type: 'button', class: 'btn primary' }, icon('share'), 'Partager le PDF (WhatsApp…)');
  const savePdfBtn = h('button', { type: 'button', class: 'btn' }, icon('download'), 'Télécharger le PDF');
  const openPdfLink = h('a', { class: 'btn ghost', target: '_blank', rel: 'noopener' }, icon('eye'), 'Voir le PDF');
  let pdfFile = null;
  let pdfUrl = null;
  let text = '';
  const current = () => avail.find((a) => a.id === select.value) || initial;

  function build() {
    const a = current();
    const full = { ...info, attempts: sorted };
    const blob = renderCorrectionPdf(full, a);
    pdfFile = new File([blob], `${safeFilename(`correction ${info.titre} ${shortDate(a.date)}`)}.pdf`, { type: 'application/pdf' });
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = URL.createObjectURL(blob);
    openPdfLink.href = pdfUrl;
    clear(pdfInfo).append(icon('file'), h('span', { class: 'grow' }, h('strong', null, pdfFile.name), h('span', { class: 'tiny muted', style: { display: 'block' } },
      `${a.detail.length} questions · ${Math.max(1, Math.round(blob.size / 1024))} Ko · texte net, sans perte de qualité`)));
    sharePdfBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [pdfFile] }));
    text = correctionText(full, a, { erreursSeules: onlyErr.checked });
    textBox.textContent = text;
  }
  select.addEventListener('change', build);
  onlyErr.addEventListener('change', build);
  sharePdfBtn.addEventListener('click', () => shareFiles([pdfFile], `Correction · ${info.titre}`, info.titre));
  savePdfBtn.addEventListener('click', async () => downloadBytes(new Uint8Array(await pdfFile.arrayBuffer()), pdfFile.name, 'application/pdf'));

  modal([
    h('h2', null, 'Partager la correction'),
    h('div', { class: 'field' }, h('label', null, 'Tentative'), select),
    h('h3', { class: 'share-sub' }, 'En PDF'),
    pdfInfo,
    h('div', { class: 'form-actions share-actions' }, sharePdfBtn, savePdfBtn, openPdfLink),
    h('h3', { class: 'share-sub' }, 'En texte'),
    h('label', { class: 'check', style: { marginBottom: '8px' } }, onlyErr, 'Seulement les erreurs'),
    textBox,
    h('div', { class: 'form-actions share-actions' },
      h('button', { type: 'button', class: 'btn', onClick: () => shareTextOnly(text) }, icon('share'), 'Envoyer le texte'),
      h('button', { type: 'button', class: 'btn', onClick: () => copyText(text) }, icon('copy'), 'Copier le texte')),
  ], { wide: true, onClose: () => pdfUrl && URL.revokeObjectURL(pdfUrl) });
  build();
}
