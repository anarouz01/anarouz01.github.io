// Pictogrammes SVG (trait, currentColor) pour distinguer les natures de client — mêmes icônes
// utilisées dans le widget de filtre et dans la fiche détail, pour un langage visuel cohérent.
//
// Chargé via une balise <script> classique (pas de module ES, pour fonctionner en ouverture
// directe du fichier et sur GitHub Pages sans configuration) : tout est exposé sous window.App.

window.App = window.App || {};

App.icons = (function () {
  const ICONS = {
    Particulier: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="6.5" r="3.2"/><path d="M4 17c0-3.6 2.7-6.2 6-6.2s6 2.6 6 6.2"/></svg>',
    Entreprise: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="12" height="9" rx="1"/><path d="M7.5 8V6a2.5 2.5 0 0 1 5 0v2"/><path d="M4 12h12"/></svg>',
    Administration: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l7-4.2L17 8"/><path d="M4.5 8v7.5M8 8v7.5M12 8v7.5M15.5 8v7.5"/><path d="M3 15.8h14"/></svg>',
  };

  const NATURE_LIST = Object.keys(ICONS);

  function natureIcon(nature, size) {
    size = size || 16;
    const svg = ICONS[nature];
    if (!svg) return '';
    return svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
  }

  return { NATURE_LIST, natureIcon };
})();
