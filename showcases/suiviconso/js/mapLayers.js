window.App = window.App || {};

App.mapLayers = (function () {
  const filterByNature = App.aggregate.filterByNature;
  const aggregateByKey = App.aggregate.aggregateByKey;
  const volumeForRange = App.aggregate.volumeForRange;

  // Dégradé de la charte (Aqua -> Blue -> Navy) : l'écart entre faible et forte consommation
  // doit se voir d'un coup d'œil, pas se deviner dans une nuance pastel resserrée.
  const COLOR_LOW = '#7FDBFF';  // Aqua
  const COLOR_MID = '#0074D9';  // Blue
  const COLOR_HIGH = '#001F3F'; // Navy

  // Expression MapLibre à 3 tons (Aqua -> Blue -> Navy) pour une propriété de consommation donnée.
  function colorScale(property, mid, max) {
    const safeMax = Math.max(mid + 0.01, max);
    return ['interpolate', ['linear'], ['get', property], 0, COLOR_LOW, mid, COLOR_MID, safeMax, COLOR_HIGH];
  }

  // Médiane (p50) et 90e centile (p90) d'un tableau de valeurs — sert de palier intermédiaire et de
  // haut de dégradé. Un simple 0→max linéaire écrase tout le dégradé dès qu'une seule valeur est très
  // au-dessus des autres (ex: un quartier qui regroupe 8x plus de DPI que les autres) : tout le reste
  // se retrouve compressé dans la même teinte pâle. Les centiles répartissent le dégradé sur la masse
  // réelle des valeurs, et clampent juste les extrêmes au ton le plus foncé.
  function percentiles(values) {
    const sorted = values.filter(v => v >= 0).sort((a, b) => a - b);
    if (!sorted.length) return { p50: 1, p90: 2 };
    const at = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    const p50 = Math.max(1, at(0.5));
    const p90 = Math.max(p50 + 1, at(0.9));
    return { p50, p90 };
  }

  const POINT_RADIUS = 7;      // taille fixe — seule la couleur encode la consommation
  const CLUSTER_RADIUS = 20;   // taille fixe des clusters, distincte des points individuels
  const SELECTED_COLOR = '#ffd400';   // point recherché/sélectionné : mis en valeur en jaune
  const SELECTED_RADIUS = 13;
  const SELECTED_STROKE = '#16233a';
  const NO_SELECTION = '__aucune__'; // valeur sentinelle : ne correspond à aucun vrai id de DPI

  const BASEMAPS = {
    clair: {
      label: 'Clair',
      tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
      attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
    },
    rues: {
      label: 'Rues',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    sombre: {
      label: 'Sombre',
      tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
      attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
    },
    satellite: {
      label: 'Satellite',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
  };

  // Ne conserve que les DPI passant le filtre nature (F4) — la source elle-même est filtrée,
  // pas seulement une couche, pour que le clustering ci-dessous agrège les bons points.
  function dpiToGeojson(DPI, periodes, rangeStart, rangeEnd, natures) {
    return {
      type: 'FeatureCollection',
      features: filterByNature(DPI, natures).map(d => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [d.lon, d.lat] },
        properties: {
          id: d.id,
          nature: d.nature,
          quartier: d.quartier,
          ville: d.ville,
          vol_range: volumeForRange(d, periodes, rangeStart, rangeEnd),
        },
      })),
    };
  }

  function withAggregates(featureCollection, aggregates, key) {
    const byName = new Map(aggregates.map(a => [a.name, a]));
    return {
      type: 'FeatureCollection',
      features: featureCollection.features.map(f => {
        const agg = byName.get(f.properties[key]);
        return Object.assign({}, f, {
          properties: Object.assign({}, f.properties, { total: agg ? agg.total : 0, count: agg ? agg.count : 0, avg: agg ? agg.avg : 0 }),
        });
      }),
    };
  }

  function bboxOfDpi(DPI) {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const d of DPI) {
      if (d.lon < minLon) minLon = d.lon;
      if (d.lon > maxLon) maxLon = d.lon;
      if (d.lat < minLat) minLat = d.lat;
      if (d.lat > maxLat) maxLat = d.lat;
    }
    return [[minLon, minLat], [maxLon, maxLat]];
  }

  function createMap(containerId, basemapKey) {
    const basemap = BASEMAPS[basemapKey];
    return new maplibregl.Map({
      container: containerId,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf', // requis par les libellés de cluster (text-field)
        sources: {
          basemap: { type: 'raster', tiles: basemap.tiles, tileSize: 256, attribution: basemap.attribution },
        },
        layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
      },
    });
  }

  // Retire et recrée la source/couche de fond de carte, insérée sous les couches de données (widget fonds de carte).
  function setBasemap(map, basemapKey) {
    const basemap = BASEMAPS[basemapKey];
    if (map.getLayer('basemap')) map.removeLayer('basemap');
    if (map.getSource('basemap')) map.removeSource('basemap');
    map.addSource('basemap', { type: 'raster', tiles: basemap.tiles, tileSize: 256, attribution: basemap.attribution });
    // 'dpi-clusters' est la toute première couche de données ajoutée après le fond de carte —
    // s'insérer juste avant elle garantit de rester en dessous de TOUTES les couches de données
    // (clusters, compteurs, points, quartiers, villes), pas seulement de 'dpi-points'.
    map.addLayer({ id: 'basemap', type: 'raster', source: 'basemap' }, 'dpi-clusters');
  }

  // En dessous de ce seuil (aligné sur le point de rupture CSS de style.css), le panneau détail
  // devient une feuille ancrée en bas de l'écran plutôt qu'une carte à droite — le point/zone à
  // garder visible doit donc être décalé vers le haut, pas vers la gauche.
  const MOBILE_BREAKPOINT = 720;
  function isMobile() {
    return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
  }

  // Décalage pour que le point/zone sélectionné ne se retrouve jamais sous le panneau détail
  // une fois la fiche ouverte : horizontal sur grand écran (panneau à droite, 680px), vertical
  // sur mobile (panneau en feuille basse, jusqu'à 75% de la hauteur d'écran).
  const PANEL_CLEARANCE = 360;
  function selectionOffset() {
    if (!isMobile()) return [-PANEL_CLEARANCE, 0];
    const h = (typeof window !== 'undefined' && window.innerHeight) || 700;
    return [0, -Math.round(h * 0.32)];
  }

  // Centre la carte sur un DPI et zoome assez pour le sortir de son cluster (recherche).
  function flyToDpi(map, dpi) {
    map.flyTo({ center: [dpi.lon, dpi.lat], zoom: 15, offset: selectionOffset(), duration: 700 });
  }

  function addSourcesAndLayers(map, data, initialState) {
    const DPI = data.DPI, QUARTIERS = data.QUARTIERS, VILLES = data.VILLES, PERIODES = data.PERIODES;

    map.addSource('dpi-src', {
      type: 'geojson',
      data: dpiToGeojson(DPI, PERIODES, initialState.rangeStart, initialState.rangeEnd, initialState.natures),
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: 12, // les clusters se dissocient 2 niveaux plus tôt — pas besoin de zoomer autant pour voir les points
      // Somme la consommation des points regroupés — le cluster est coloré comme un point normal,
      // par consommation, jamais par nombre de points.
      clusterProperties: { sum_vol: ['+', ['get', 'vol_range']] },
    });
    map.addSource('quartier-src', { type: 'geojson', data: QUARTIERS });
    map.addSource('ville-src', { type: 'geojson', data: VILLES });

    // Clusters (zoom faible) : taille fixe, couleur = consommation agrégée du groupe.
    map.addLayer({
      id: 'dpi-clusters',
      type: 'circle',
      source: 'dpi-src',
      filter: ['has', 'point_count'],
      paint: {
        'circle-radius': CLUSTER_RADIUS,
        'circle-color': COLOR_LOW,
      },
    });
    map.addLayer({
      id: 'dpi-cluster-count',
      type: 'symbol',
      source: 'dpi-src',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 12,
      },
      paint: { 'text-color': '#ffffff' },
    });

    // Points individuels : taille fixe, seule la couleur varie avec la consommation (F1).
    map.addLayer({
      id: 'dpi-points',
      type: 'circle',
      source: 'dpi-src',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': POINT_RADIUS,
        'circle-color': COLOR_LOW,
        'circle-stroke-width': 0,
      },
    });

    map.addLayer({
      id: 'quartier-fill',
      type: 'fill',
      source: 'quartier-src',
      layout: { visibility: 'none' },
      paint: { 'fill-color': COLOR_LOW, 'fill-opacity': 0.75 },
    });
    map.addLayer({
      id: 'quartier-outline',
      type: 'line',
      source: 'quartier-src',
      layout: { visibility: 'none' },
      paint: { 'line-color': COLOR_HIGH, 'line-width': 1.5 },
    });

    map.addLayer({
      id: 'ville-fill',
      type: 'fill',
      source: 'ville-src',
      layout: { visibility: 'none' },
      paint: { 'fill-color': COLOR_LOW, 'fill-opacity': 0.65 },
    });
    map.addLayer({
      id: 'ville-outline',
      type: 'line',
      source: 'ville-src',
      layout: { visibility: 'none' },
      paint: { 'line-color': COLOR_HIGH, 'line-width': 1.5 },
    });

    // Marges asymétriques pour que les points ne se retrouvent jamais sous les widgets flottants.
    // Sur grand écran : barre du haut, rail niveau (icônes) à gauche, panneau + rail nature à
    // droite. Sur mobile : bandeau/barre en haut, rails niveau/nature sur les côtés (à mi-hauteur),
    // curseur temporel en bas — plus de pile de widgets pleine largeur à éviter.
    const bounds = bboxOfDpi(DPI);
    const padding = isMobile()
      ? { top: 90, left: 90, right: 90, bottom: 120 }
      : { top: 110, left: 110, right: 380, bottom: 170 };
    map.fitBounds(bounds, { padding, duration: 0 });
  }

  function bindClicks(map, onSelect) {
    const clickable = [
      ['dpi-points', 'dpi', 'id'],
      ['quartier-fill', 'quartier', 'quartier'],
      ['ville-fill', 'ville', 'ville'],
    ];
    clickable.forEach(([layerId, type, prop]) => {
      map.on('click', layerId, e => {
        const f = e.features[0];
        onSelect({ type, id: f.properties[prop] });
        // Recentre pour que le point/la zone sélectionnée ne se retrouve pas sous le panneau
        // détail qui vient de s'ouvrir (à droite sur grand écran, en bas sur mobile).
        map.easeTo({ center: e.lngLat, offset: selectionOffset(), duration: 500 });
      });
    });

    // Clic sur un cluster : zoom pour le dissocier, plutôt que d'ouvrir une fiche.
    // (API basée sur une Promise dans cette version de MapLibre)
    map.on('click', 'dpi-clusters', async e => {
      const f = e.features[0];
      const clusterId = f.properties.cluster_id;
      const zoom = await map.getSource('dpi-src').getClusterExpansionZoom(clusterId);
      map.easeTo({ center: f.geometry.coordinates, zoom });
    });

    ['dpi-points', 'dpi-clusters', 'quartier-fill', 'ville-fill'].forEach(layerId => {
      map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
    });
  }

  // Point d'entrée unique appelé à chaque changement d'état (plage de dates, filtre nature, niveau, fond de carte).
  function update(map, state, data) {
    const DPI = data.DPI, PERIODES = data.PERIODES;
    const rangeStart = state.rangeStart, rangeEnd = state.rangeEnd, natures = state.natures,
      level = state.level, basemap = state.basemap, selection = state.selection;
    const selectedDpiId = selection && selection.type === 'dpi' ? selection.id : NO_SELECTION;
    const selectedQuartierId = selection && selection.type === 'quartier' ? selection.id : NO_SELECTION;
    const selectedVilleId = selection && selection.type === 'ville' ? selection.id : NO_SELECTION;

    // --- fond de carte (widget) ---
    if (map.__basemap !== basemap) {
      setBasemap(map, basemap);
      map.__basemap = basemap;
    }

    // --- niveau visible (F1 / F6 / F7) ---
    const dpiVisibility = level === 'dpi' ? 'visible' : 'none';
    map.setLayoutProperty('dpi-points', 'visibility', dpiVisibility);
    map.setLayoutProperty('dpi-clusters', 'visibility', dpiVisibility);
    map.setLayoutProperty('dpi-cluster-count', 'visibility', dpiVisibility);
    map.setLayoutProperty('quartier-fill', 'visibility', level === 'quartier' ? 'visible' : 'none');
    map.setLayoutProperty('quartier-outline', 'visibility', level === 'quartier' ? 'visible' : 'none');
    map.setLayoutProperty('ville-fill', 'visibility', level === 'ville' ? 'visible' : 'none');
    map.setLayoutProperty('ville-outline', 'visibility', level === 'ville' ? 'visible' : 'none');

    // --- données DPI : filtre nature (F4) appliqué à la source elle-même, pour que les clusters
    //     n'agrègent que les points filtrés, et plage de dates (F5) ---
    const filtered = filterByNature(DPI, natures);
    map.getSource('dpi-src').setData(dpiToGeojson(DPI, PERIODES, rangeStart, rangeEnd, natures));

    // --- couleur des points par consommation (F1) — taille fixe, seule la couleur varie,
    //     sauf pour le point recherché/sélectionné, mis en valeur en jaune et agrandi ---
    const pointVolumes = filtered.map(d => volumeForRange(d, PERIODES, rangeStart, rangeEnd));
    const pointDomain = percentiles(pointVolumes);
    map.setPaintProperty('dpi-points', 'circle-color', [
      'case', ['==', ['get', 'id'], selectedDpiId], SELECTED_COLOR,
      colorScale('vol_range', pointDomain.p50, pointDomain.p90),
    ]);
    map.setPaintProperty('dpi-points', 'circle-radius', [
      'case', ['==', ['get', 'id'], selectedDpiId], SELECTED_RADIUS, POINT_RADIUS,
    ]);
    map.setPaintProperty('dpi-points', 'circle-stroke-width', [
      'case', ['==', ['get', 'id'], selectedDpiId], 2.5, 0,
    ]);
    map.setPaintProperty('dpi-points', 'circle-stroke-color', SELECTED_STROKE);
    // Les clusters regroupent un nombre de points variable selon le zoom — même dégradé que les
    // points individuels, juste mis à l'échelle du nombre moyen de points par cluster visible.
    const clusterDomain = { p50: pointDomain.p50 * 5, p90: pointDomain.p90 * 5 };
    map.setPaintProperty('dpi-clusters', 'circle-color', colorScale('sum_vol', clusterDomain.p50, clusterDomain.p90));

    // --- agrégats quartier / ville sur la plage sélectionnée (F4 s'applique aussi ici) ---
    // Couleur basée sur la MOYENNE par DPI (pas le total) : un quartier de 84 DPI ne doit pas
    // paraître "plus fort" qu'un quartier de 10 DPI juste parce qu'il compte plus de points.
    const quartierAgg = aggregateByKey(filtered, 'quartier', PERIODES, rangeStart, rangeEnd);
    const quartierDomain = percentiles(quartierAgg.map(a => a.avg));
    map.getSource('quartier-src').setData(withAggregates(data.QUARTIERS, quartierAgg, 'quartier'));
    map.setPaintProperty('quartier-fill', 'fill-color', [
      'case', ['==', ['get', 'quartier'], selectedQuartierId], SELECTED_COLOR,
      colorScale('avg', quartierDomain.p50, quartierDomain.p90),
    ]);
    map.setPaintProperty('quartier-outline', 'line-color', [
      'case', ['==', ['get', 'quartier'], selectedQuartierId], SELECTED_STROKE, COLOR_HIGH,
    ]);
    map.setPaintProperty('quartier-outline', 'line-width', [
      'case', ['==', ['get', 'quartier'], selectedQuartierId], 3, 1.5,
    ]);

    const villeAgg = aggregateByKey(filtered, 'ville', PERIODES, rangeStart, rangeEnd);
    const villeDomain = percentiles(villeAgg.map(a => a.avg));
    map.getSource('ville-src').setData(withAggregates(data.VILLES, villeAgg, 'ville'));
    map.setPaintProperty('ville-fill', 'fill-color', [
      'case', ['==', ['get', 'ville'], selectedVilleId], SELECTED_COLOR,
      colorScale('avg', villeDomain.p50, villeDomain.p90),
    ]);
    map.setPaintProperty('ville-outline', 'line-color', [
      'case', ['==', ['get', 'ville'], selectedVilleId], SELECTED_STROKE, COLOR_HIGH,
    ]);
    map.setPaintProperty('ville-outline', 'line-width', [
      'case', ['==', ['get', 'ville'], selectedVilleId], 3, 1.5,
    ]);
  }

  return { BASEMAPS, createMap, setBasemap, flyToDpi, addSourcesAndLayers, bindClicks, update };
})();
