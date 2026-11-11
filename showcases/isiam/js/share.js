// ==========================================================================
// Partage d'un résultat : génère une petite image (tentatives et notes) et
// l'envoie via le menu de partage du téléphone (WhatsApp…), ou la télécharge.
// Ne contient ni question ni réponse : seulement titres, dates et notes.
// ==========================================================================
import { h, icon, modal, toast, downloadBytes, safeFilename } from './ui.js';
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

/** Coupe un texte en lignes tenant dans maxW (au plus maxLines, avec « … »). */
function wrap(ctx, text, maxW, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
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
  const last = attempts[n - 1];
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
    ['Dernière note', `${formatNote(last.sur20)}/20`, colorFor(last.sur20)],
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

/** Ouvre l'aperçu de l'image avec les boutons Partager / Télécharger / WhatsApp. */
export async function openShare(info) {
  if (!info.attempts || !info.attempts.length) { toast('Aucune tentative à partager pour l\'instant.'); return; }
  const blob = await renderScoreCard(info);
  const name = `${safeFilename(`resultat ${info.titre}`)}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  const text = shareText(info);
  const url = URL.createObjectURL(blob);
  const canFiles = !!(navigator.canShare && navigator.canShare({ files: [file] }));

  const share = async () => {
    try {
      await navigator.share({ files: [file], text, title: info.titre });
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      toast('Partage impossible ici : téléchargez l\'image puis envoyez-la.', 'bad');
    }
  };
  const save = async () => downloadBytes(new Uint8Array(await blob.arrayBuffer()), name, 'image/png');

  const m = modal([
    h('h2', null, 'Partager mon résultat'),
    h('img', { src: url, alt: `Résultats : ${text}`, class: 'share-preview' }),
    h('p', { class: 'tiny muted' }, 'L\'image contient seulement le titre, les dates et les notes : aucune question ni réponse.'),
    h('div', { class: 'form-actions share-actions' },
      canFiles ? h('button', { type: 'button', class: 'btn primary', onClick: share }, icon('share'), 'Partager (WhatsApp…)') : null,
      h('button', { type: 'button', class: `btn ${canFiles ? '' : 'primary'}`, onClick: save }, icon('download'), 'Télécharger l\'image'),
      !canFiles ? h('a', { class: 'btn', href: `https://wa.me/?text=${encodeURIComponent(text)}`, target: '_blank', rel: 'noopener' }, 'Envoyer le texte sur WhatsApp') : null,
      h('button', { type: 'button', class: 'btn ghost', onClick: () => m.close() }, 'Fermer')),
    !canFiles ? h('p', { class: 'tiny muted' }, 'Sur ordinateur : téléchargez l\'image, puis joignez-la dans WhatsApp.') : null,
  ], { onClose: () => URL.revokeObjectURL(url) });
}
