window.App = window.App || {};

App.panel = (function () {
  const buildEntity = App.aggregate.buildEntity;
  const renderSparkline = App.chart.renderSparkline;
  const natureIcon = App.icons.natureIcon;

  function renderPanel(container, state, data) {
    const selection = state.selection, rangeStart = state.rangeStart, rangeEnd = state.rangeEnd;

    if (!selection) {
      container.innerHTML = `<p class="panel-placeholder">Cliquez sur un point (ou une zone en mode Quartier / Ville) pour afficher le détail et l'historique de consommation.</p>`;
      return;
    }

    const entity = buildEntity(selection, {
      DPI: data.DPI,
      periodes: data.PERIODES,
      rangeStart: rangeStart,
      rangeEnd: rangeEnd,
      natures: state.natures,
    });

    if (!entity) {
      container.innerHTML = `<p class="panel-placeholder">Élément introuvable (peut-être masqué par le filtre nature client).</p>`;
      return;
    }

    const badgesHtml = entity.badges.map(b => `<span class="badge-pill">${b}</span>`).join('');
    const iconsHtml = (entity.natures || [])
      .map(n => `<span class="panel-icon" title="${n}">${natureIcon(n, 24)}</span>`)
      .join('');
    const locationHtml = (entity.locationLines || [])
      .map(pair => `<p class="panel-location"><span class="k">${pair[0]} :</span> ${pair[1]}</p>`)
      .join('');

    container.innerHTML = `
      <button type="button" class="panel-close" aria-label="Fermer la fiche" title="Fermer">
        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M5 5l10 10M15 5 5 15"/></svg>
      </button>
      <div class="panel-head">
        <div class="panel-head-row">
          <div class="panel-title-block">
            <h2 class="panel-title">${entity.label}</h2>
            <p class="panel-subtitle">${entity.subtitle}</p>
            ${locationHtml}
          </div>
          <span class="panel-period">${entity.periodLabel}</span>
          <div class="panel-icons">${iconsHtml}</div>
        </div>
        <div class="badge-row">${badgesHtml}</div>
      </div>
      ${entity.secondaryValue ? `
      <div class="metric-row">
        <div class="metric hero">
          <span class="k">${entity.volumeLabel}</span>
          <span class="v accent">${entity.volumeValue}</span>
        </div>
        <div class="metric hero">
          <span class="k">${entity.secondaryLabel}</span>
          <span class="v accent">${entity.secondaryValue}</span>
        </div>
      </div>` : `
      <div class="metric hero">
        <span class="k">${entity.volumeLabel}</span>
        <span class="v accent">${entity.volumeValue}</span>
      </div>`}
      <p class="panel-chart-title">Historique de consommation</p>
      <div class="chart-card">${renderSparkline(entity.history)}</div>
    `;
  }

  return { renderPanel };
})();
