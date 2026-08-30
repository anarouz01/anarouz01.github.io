// Bootstrap de l'app. Suppose que ces scripts sont déjà chargés (voir index.html, dans l'ordre) :
// data/periodes.js, data/dpi.js, data/quartiers.js, data/villes.js, maplibre-gl (CDN),
// js/icons.js, js/state.js, js/aggregate.js, js/chart.js, js/mapLayers.js, js/panel.js, js/controls.js.

(function () {
  // Adapte le GeoJSON source (DPI_GEOJSON) vers le tableau plat {id, lat, lon, ...} attendu par
  // aggregate.js / mapLayers.js — ceux-ci restent inchangés par rapport au POC d'origine, seule
  // la forme des données à l'entrée change (GeoJSON pur, comme demandé pour ce POC statique).
  const DPI = DPI_GEOJSON.features.map(f => ({
    id: f.properties.id,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    nature: f.properties.nature,
    quartier: f.properties.quartier,
    ville: f.properties.ville,
    source: f.properties.source,
    history: f.properties.history,
  }));

  const data = { PERIODES: PERIODES, DPI: DPI, QUARTIERS: QUARTIERS_GEOJSON, VILLES: VILLES_GEOJSON };

  const state = App.state.createState({
    periodes: PERIODES,
    natures: ['Particulier', 'Entreprise', 'Administration'],
    basemaps: Object.keys(App.mapLayers.BASEMAPS),
  });

  const initial = state.get();
  const map = App.mapLayers.createMap('map', initial.basemap);
  map.__basemap = initial.basemap;
  const panelEl = document.getElementById('panel');
  panelEl.addEventListener('click', e => {
    if (e.target.closest('.panel-close')) state.setSelection(null);
  });

  function render() {
    App.mapLayers.update(map, state.get(), data);
    App.panel.renderPanel(panelEl, state.get(), data);
  }

  map.on('load', () => {
    App.mapLayers.addSourcesAndLayers(map, data, initial);
    App.mapLayers.bindClicks(map, selection => state.setSelection(selection));
    App.controls.initControls(state, PERIODES, App.mapLayers.BASEMAPS, DPI, map, App.mapLayers.flyToDpi);
    state.subscribe(render);
    render();
  });
})();
