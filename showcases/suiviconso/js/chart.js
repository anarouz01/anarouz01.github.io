// Mini-graphique d'historique (F3), en SVG fait main — aucune dépendance de charting.
// N'affiche que la plage de dates sélectionnée au slider (F5), pas l'historique complet.
// Les valeurs sont écrites directement sur le graphique (pas seulement au survol) :
// c'est ce qui le rend lisible d'un coup d'œil plutôt que de dépendre de l'info-bulle.

window.App = window.App || {};

App.chart = (function () {
  const WIDTH = 600;
  const HEIGHT = 190;
  const PAD = { top: 28, right: 16, bottom: 24, left: 16 };

  function renderSparkline(history) {
    if (!history || history.length === 0) {
      return '<p class="chart-empty">Aucun historique disponible.</p>';
    }

    const volumes = history.map(h => h.volume);
    const max = Math.max.apply(null, volumes.concat([1]));
    const min = 0; // les volumes d'eau ne sont jamais négatifs — l'axe part de 0

    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const baseY = PAD.top + innerH;

    const stepX = history.length > 1 ? innerW / (history.length - 1) : 0;
    const points = history.map((h, i) => {
      const x = PAD.left + i * stepX;
      const y = PAD.top + innerH - ((h.volume - min) / (max - min || 1)) * innerH;
      return Object.assign({ x: x, y: y }, h);
    });

    const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const lineTo = points.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPath = `M ${points[0].x.toFixed(1)},${baseY} ${lineTo} L ${points[points.length - 1].x.toFixed(1)},${baseY} Z`;

    const dots = points.map(p => `
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#fff" stroke="#0a1f5c" stroke-width="2">
        <title>${p.periode} — ${p.volume} m³</title>
      </circle>`).join('');

    // Valeur affichée au-dessus de chaque point — évite de dépendre du survol pour lire les chiffres.
    // Décalée vers le bas si elle sortirait du cadre (pic proche du haut du graphique).
    const valueLabels = points.map(p => {
      const above = p.y - 10 >= 2;
      const ly = above ? p.y - 10 : p.y + 16;
      return `<text x="${p.x.toFixed(1)}" y="${ly.toFixed(1)}" font-size="11" font-weight="600" text-anchor="middle" fill="#0b2230">${p.volume}</text>`;
    }).join('');

    const periodLabels = points.map((p, i) => {
      if (points.length > 1 && i !== 0 && i !== points.length - 1) return '';
      const anchor = points.length === 1 ? 'middle' : i === 0 ? 'start' : 'end';
      return `<text x="${p.x.toFixed(1)}" y="${HEIGHT - 6}" font-size="10.5" text-anchor="${anchor}" fill="currentColor" opacity="0.55">${p.periode}</text>`;
    }).join('');

    return `
      <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Historique de consommation sur la période sélectionnée, ${history.length} mois" style="color:#0b2230; max-width:100%; height:auto; display:block;">
        <defs>
          <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#4fc3f7" stop-opacity="0.4"></stop>
            <stop offset="1" stop-color="#4fc3f7" stop-opacity="0"></stop>
          </linearGradient>
          <linearGradient id="sparklineStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#4fc3f7"></stop>
            <stop offset="1" stop-color="#0a1f5c"></stop>
          </linearGradient>
        </defs>
        <line x1="${PAD.left}" y1="${baseY}" x2="${WIDTH - PAD.right}" y2="${baseY}" stroke="currentColor" stroke-width="1" opacity="0.15"></line>
        <path d="${areaPath}" fill="url(#sparklineFill)"></path>
        <polyline points="${polyline}" fill="none" stroke="url(#sparklineStroke)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"></polyline>
        ${dots}
        ${valueLabels}
        ${periodLabels}
      </svg>`;
  }

  return { renderSparkline };
})();
