// ==========================================================================
// Mini-générateur de PDF (texte + formes), sans dépendance. Polices standard
// Helvetica / Helvetica-Bold (WinAnsi : accents français pris en charge).
// Le texte reste du vrai texte : net à tous les zooms, et le fichier est léger.
// ==========================================================================

// Largeurs des caractères 32 à 255 (unités de 1/1000 em), métriques Adobe.
const W_REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
const W_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];

// Unicode → Windows-1252 pour la plage 0x80–0x9F.
const CP1252 = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
  0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
  0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
  0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
};
const SUBST = { 0x202F: 0x20, 0x2009: 0x20, 0x200B: -1, 0x2212: 0x2D, 0x2192: -2, 0x2190: -3, 0x2264: -4, 0x2265: -5, 0x2260: -6 };
const SUBST_TXT = { '-2': '->', '-3': '<-', '-4': '<=', '-5': '>=', '-6': '!=' };

/** Convertit une chaîne en codes WinAnsi (caractères inconnus → « ? »). */
export function encode(str) {
  const out = [];
  for (const ch of String(str ?? '').normalize('NFC')) {
    let cp = ch.codePointAt(0);
    if (cp === 9 || cp === 10 || cp === 13) cp = 32;
    if (SUBST[cp] !== undefined) {
      const s = SUBST[cp];
      if (s === -1) continue;
      if (s < 0) { for (const c of SUBST_TXT[s]) out.push(c.charCodeAt(0)); continue; }
      cp = s;
    }
    if ((cp >= 32 && cp < 127) || (cp >= 0xA0 && cp <= 0xFF)) out.push(cp);
    else if (CP1252[cp]) out.push(CP1252[cp]);
    else out.push(63); // ?
  }
  return out;
}

export function textWidth(str, size, bold = false) {
  const t = bold ? W_BOLD : W_REG;
  let w = 0;
  for (const c of encode(str)) w += t[c - 32] || 556;
  return (w / 1000) * size;
}

/** Coupe un texte en lignes de largeur maxW (retours à la ligne et mots longs compris). */
export function wrapText(str, size, maxW, bold = false) {
  const lines = [];
  for (const para of String(str ?? '').split(/\r?\n/)) {
    let cur = '';
    for (let w of para.split(/\s+/).filter(Boolean)) {
      while (textWidth(w, size, bold) > maxW && w.length > 1) {
        let k = w.length - 1;
        while (k > 1 && textWidth(w.slice(0, k), size, bold) > maxW) k--;
        if (cur) { lines.push(cur); cur = ''; }
        lines.push(w.slice(0, k));
        w = w.slice(k);
      }
      const t = cur ? `${cur} ${w}` : w;
      if (!cur || textWidth(t, size, bold) <= maxW) cur = t;
      else { lines.push(cur); cur = w; }
    }
    lines.push(cur);
  }
  while (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

const num = (n) => (Math.round(n * 100) / 100).toString();
function rgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '#000000');
  const v = parseInt(m ? m[1] : '000000', 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => num(x / 255)).join(' ');
}
function pdfString(str) {
  let s = '(';
  for (const c of encode(str)) {
    if (c === 40 || c === 41 || c === 92) s += `\\${String.fromCharCode(c)}`;
    else if (c < 32 || c > 126) s += `\\${c.toString(8).padStart(3, '0')}`;
    else s += String.fromCharCode(c);
  }
  return `${s})`;
}

/** Page : coordonnées en points, origine en haut à gauche (y vers le bas). */
class Page {
  constructor(w, h) { this.w = w; this.h = h; this.ops = []; }

  rect(x, y, w, hgt, { fill, stroke, lw = 1, r = 0 } = {}) {
    const Y = this.h - y - hgt;
    const o = this.ops;
    o.push('q');
    if (fill) o.push(`${rgb(fill)} rg`);
    if (stroke) o.push(`${rgb(stroke)} RG ${num(lw)} w`);
    if (r > 0) {
      const k = 0.5523 * r;
      const x1 = x; const x2 = x + w; const y1 = Y; const y2 = Y + hgt;
      o.push(`${num(x1 + r)} ${num(y1)} m ${num(x2 - r)} ${num(y1)} l ${num(x2 - r + k)} ${num(y1)} ${num(x2)} ${num(y1 + r - k)} ${num(x2)} ${num(y1 + r)} c`
        + ` ${num(x2)} ${num(y2 - r)} l ${num(x2)} ${num(y2 - r + k)} ${num(x2 - r + k)} ${num(y2)} ${num(x2 - r)} ${num(y2)} c`
        + ` ${num(x1 + r)} ${num(y2)} l ${num(x1 + r - k)} ${num(y2)} ${num(x1)} ${num(y2 - r + k)} ${num(x1)} ${num(y2 - r)} c`
        + ` ${num(x1)} ${num(y1 + r)} l ${num(x1)} ${num(y1 + r - k)} ${num(x1 + r - k)} ${num(y1)} ${num(x1 + r)} ${num(y1)} c h`);
    } else {
      o.push(`${num(x)} ${num(Y)} ${num(w)} ${num(hgt)} re`);
    }
    o.push(fill && stroke ? 'B' : fill ? 'f' : 'S', 'Q');
  }

  circle(cx, cy, r, { fill, stroke, lw = 1 } = {}) {
    const k = 0.5523 * r;
    const X = cx; const Y = this.h - cy;
    const o = this.ops;
    o.push('q');
    if (fill) o.push(`${rgb(fill)} rg`);
    if (stroke) o.push(`${rgb(stroke)} RG ${num(lw)} w`);
    o.push(`${num(X + r)} ${num(Y)} m ${num(X + r)} ${num(Y + k)} ${num(X + k)} ${num(Y + r)} ${num(X)} ${num(Y + r)} c`
      + ` ${num(X - k)} ${num(Y + r)} ${num(X - r)} ${num(Y + k)} ${num(X - r)} ${num(Y)} c`
      + ` ${num(X - r)} ${num(Y - k)} ${num(X - k)} ${num(Y - r)} ${num(X)} ${num(Y - r)} c`
      + ` ${num(X + k)} ${num(Y - r)} ${num(X + r)} ${num(Y - k)} ${num(X + r)} ${num(Y)} c h`);
    o.push(fill && stroke ? 'B' : fill ? 'f' : 'S', 'Q');
  }

  /** Trait (ou ligne brisée) : points = [[x, y], …] */
  line(points, { stroke = '#000000', lw = 1, cap = 1 } = {}) {
    const [first, ...rest] = points;
    this.ops.push('q', `${rgb(stroke)} RG ${num(lw)} w ${cap} J 1 j`,
      `${num(first[0])} ${num(this.h - first[1])} m ${rest.map(([x, y]) => `${num(x)} ${num(this.h - y)} l`).join(' ')} S`, 'Q');
  }

  /** Texte : y = ligne de base. align = left | right | center */
  text(str, x, y, { size = 10, bold = false, color = '#000000', align = 'left' } = {}) {
    if (str === '' || str == null) return;
    let X = x;
    if (align !== 'left') { const w = textWidth(str, size, bold); X = align === 'right' ? x - w : x - w / 2; }
    this.ops.push(`BT ${rgb(color)} rg /${bold ? 'F2' : 'F1'} ${num(size)} Tf ${num(X)} ${num(this.h - y)} Td ${pdfString(str)} Tj ET`);
  }
}

export class PdfDoc {
  constructor({ title = '' } = {}) { this.pages = []; this.title = title; }

  addPage(w = 595.28, h = 841.89) {
    const p = new Page(w, h);
    this.pages.push(p);
    return p;
  }

  /** Assemble le fichier (Blob application/pdf). */
  toBlob() {
    const objs = [];
    const add = (s) => { objs.push(s); return objs.length; };
    const catalog = add(null);
    const pagesId = add(null);
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = [];
    for (const p of this.pages) {
      const content = p.ops.join('\n');
      const cId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${num(p.w)} ${num(p.h)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cId} 0 R >>`));
    }
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
    const info = add(`<< /Title ${pdfString(this.title)} /Producer (Revisions ISIAM) >>`);

    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [];
    objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xFF;
    return new Blob([bytes], { type: 'application/pdf' });
  }
}
