// Fonctions pures : lecture de l'historique, filtrage par nature, agrégation par quartier/ville/plage.
// Ne touchent ni au DOM ni à MapLibre — testables indépendamment.

window.App = window.App || {};

App.aggregate = (function () {
  const NATURE_LIST = App.icons.NATURE_LIST;

  function volumeForPeriode(dpi, periode) {
    const entry = dpi.history.find(h => h.periode === periode);
    return entry ? entry.volume : 0;
  }

  // Arrondit à 0.1 près — évite les artefacts de précision flottante (ex: 13182.899999999998)
  // une fois que plusieurs volumes décimaux ont été additionnés.
  function round1(v) {
    return Math.round(v * 10) / 10;
  }

  // Somme des volumes d'un DPI sur la plage de périodes [periodes[rangeStart] .. periodes[rangeEnd]] (F5, slider).
  function volumeForRange(dpi, periodes, rangeStart, rangeEnd) {
    let total = 0;
    for (let i = rangeStart; i <= rangeEnd; i++) total += volumeForPeriode(dpi, periodes[i]);
    return round1(total);
  }

  function rangeLabel(periodes, rangeStart, rangeEnd) {
    return rangeStart === rangeEnd ? periodes[rangeStart] : `${periodes[rangeStart]} → ${periodes[rangeEnd]}`;
  }

  function filterByNature(dpiList, natureSet) {
    return dpiList.filter(d => natureSet.has(d.nature));
  }

  // Regroupe une liste de DPI par clé ('quartier' ou 'ville') sur une plage de périodes.
  // Retourne [{ name, total, count, avg }], trié par total décroissant. `avg` (volume moyen par
  // DPI) sert à colorer la carte : un quartier de 84 DPI aura toujours un total bien plus élevé
  // qu'un quartier de 10 DPI sans que ça reflète une consommation individuelle plus forte —
  // la moyenne compare des zones de tailles différentes équitablement.
  function aggregateByKey(dpiList, key, periodes, rangeStart, rangeEnd) {
    const groups = new Map();
    for (const dpi of dpiList) {
      const name = dpi[key];
      if (!groups.has(name)) groups.set(name, { name, total: 0, count: 0 });
      const g = groups.get(name);
      g.total += volumeForRange(dpi, periodes, rangeStart, rangeEnd);
      g.count += 1;
    }
    return Array.from(groups.values())
      .map(g => Object.assign({}, g, { avg: round1(g.total / g.count) }))
      .sort((a, b) => b.total - a.total);
  }

  // Historique restreint aux périodes fournies — utilisé pour la courbe, qui ne montre que la
  // plage sélectionnée au slider (F5), pas l'historique complet.
  function historyForGroup(dpiList, periodes) {
    return periodes.map(periode => ({
      periode,
      volume: round1(dpiList.reduce((sum, d) => sum + volumeForPeriode(d, periode), 0)),
    }));
  }

  // Construit la représentation unique consommée par panel.js, quel que soit le niveau sélectionné.
  function buildEntity(selection, ctx) {
    const type = selection.type;
    const id = selection.id;
    const DPI = ctx.DPI, periodes = ctx.periodes, rangeStart = ctx.rangeStart, rangeEnd = ctx.rangeEnd, natures = ctx.natures;
    const filtered = filterByNature(DPI, natures);
    const label = rangeLabel(periodes, rangeStart, rangeEnd);
    const selectedPeriodes = periodes.slice(rangeStart, rangeEnd + 1);

    if (type === 'dpi') {
      const dpi = DPI.find(d => d.id === id);
      if (!dpi) return null;
      return {
        label: dpi.id,
        subtitle: 'Point de livraison',
        periodLabel: label,
        locationLines: [['Quartier', dpi.quartier], ['Ville', dpi.ville]],
        badges: [],
        natures: [dpi.nature], // icône (nature du DPI) en haut à droite — remplace le tag texte
        volumeLabel: 'Volume sur la période',
        volumeValue: `${volumeForRange(dpi, periodes, rangeStart, rangeEnd).toFixed(1)} m³`,
        history: selectedPeriodes.map(periode => ({ periode, volume: volumeForPeriode(dpi, periode) })),
      };
    }

    // 'quartier' ou 'ville'
    const groupDpi = filtered.filter(d => d[type] === id);
    const ville = type === 'quartier' && groupDpi[0] ? groupDpi[0].ville : null;
    const total = groupDpi.reduce((s, d) => s + volumeForRange(d, periodes, rangeStart, rangeEnd), 0);

    return {
      label: id,
      subtitle: type === 'quartier' ? 'Quartier' : 'Ville',
      periodLabel: label,
      // Un quartier rappelle sa ville ; une ville n'a rien au-dessus d'elle à rappeler.
      locationLines: type === 'quartier' ? [['Ville', ville]] : [],
      badges: [],
      // Sans filtre actif : les 3 icônes (l'agrégat mélange toutes les natures). Filtre actif :
      // seulement les icônes des natures effectivement incluses dans les chiffres affichés.
      natures: NATURE_LIST.filter(n => natures.has(n)),
      volumeLabel: 'Volume total sur la période',
      volumeValue: `${total.toFixed(1)} m³`,
      // Mis en valeur au même titre que le volume : combien de DPI composent cet agrégat.
      secondaryLabel: 'DPI dans la zone sélectionnée',
      secondaryValue: String(groupDpi.length),
      history: historyForGroup(groupDpi, selectedPeriodes),
    };
  }

  return { volumeForPeriode, volumeForRange, rangeLabel, filterByNature, aggregateByKey, historyForGroup, buildEntity };
})();
